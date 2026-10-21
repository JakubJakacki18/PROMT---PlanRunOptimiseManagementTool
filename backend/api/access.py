"""Permission checks and role management.

Every access decision goes through this module. Code asks for a permission
code (``can(user, "task.assign", project)``), never for a role name, so roles
can change without touching the code.

A user has a permission in a project when any role assigned to them, or to a
team they belong to (including parent teams), contains it, and the role is
assigned either in that project or in the project's organization. Roles count
only in organizations where the user is an active member. Superusers can do
everything.
"""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Case, IntegerField, OuterRef, Q, Subquery, Value, When

from api.models import (
    Organization,
    OrganizationMember,
    Permission,
    Project,
    Role,
    RoleAssignment,
    TeamMember,
)

ORG_ROLE_ADMIN = "org_admin"
ORG_ROLE_PM = "org_pm"
ORG_ROLE_MEMBER = "org_member"
ORG_ROLE_VIEWER = "org_viewer"
PROJECT_ROLE_ADMIN = "project_admin"

# Legacy API value of ``profile.role`` <-> built-in organization role.
LEGACY_ROLE_TO_ORG_ROLE = {
    "admin": ORG_ROLE_ADMIN,
    "pm": ORG_ROLE_PM,
    "member": ORG_ROLE_MEMBER,
    "viewer": ORG_ROLE_VIEWER,
}
ORG_ROLE_TO_LEGACY_ROLE = {v: k for k, v in LEGACY_ROLE_TO_ORG_ROLE.items()}
ORG_ROLE_RANK = [ORG_ROLE_ADMIN, ORG_ROLE_PM, ORG_ROLE_MEMBER, ORG_ROLE_VIEWER]

_CACHE_ATTR = "_promt_permission_cache"


# ─────────────────────────────
# Reading permissions
# ─────────────────────────────


def team_ids(user):
    """Ids of the user's teams together with all their parent teams (max. 3 levels)."""
    rows = TeamMember.objects.filter(user=user).values_list(
        "team_id", "team__parent_id", "team__parent__parent_id"
    )
    return {team_id for row in rows for team_id in row if team_id}


def active_organization_ids(user):
    return set(
        OrganizationMember.objects.filter(user=user, is_active=True).values_list(
            "organization_id", flat=True
        )
    )


def _principal_q(user, teams):
    return Q(user=user) | Q(team_id__in=teams)


def permissions_for(user, *, organization=None, project=None):
    """Return the set of permission codes the user has in a project or an organization."""
    if not user or not user.is_authenticated:
        return frozenset()
    if user.is_superuser:
        return frozenset(Permission.objects.values_list("code", flat=True))

    if project is not None:
        organization_id = project.organization_id
        key = ("project", project.pk)
    else:
        organization_id = getattr(organization, "pk", organization)
        key = ("organization", organization_id)

    cache = getattr(user, _CACHE_ATTR, None)
    if cache is None:
        cache = {}
        setattr(user, _CACHE_ATTR, cache)
    if key in cache:
        return cache[key]

    codes = frozenset()
    if organization_id and organization_id in _active_orgs(user, cache):
        scope = Q(organization_id=organization_id)
        if project is not None:
            scope |= Q(project_id=project.pk)
        assignments = RoleAssignment.objects.filter(
            _principal_q(user, _teams(user, cache)), scope
        )
        codes = frozenset(
            Permission.objects.filter(roles__assignments__in=assignments)
            .values_list("code", flat=True)
            .distinct()
        )
    cache[key] = codes
    return codes


def _teams(user, cache):
    if "teams" not in cache:
        cache["teams"] = team_ids(user)
    return cache["teams"]


def _active_orgs(user, cache):
    if "orgs" not in cache:
        cache["orgs"] = active_organization_ids(user)
    return cache["orgs"]


def can(user, permission, obj=None):
    """True when the user has ``permission`` for ``obj`` (a project, an organization or None)."""
    if isinstance(obj, Project):
        return permission in permissions_for(user, project=obj)
    if isinstance(obj, Organization):
        return permission in permissions_for(user, organization=obj)
    if obj is None:
        return bool(user and user.is_authenticated and user.is_superuser)
    raise TypeError(f"Unsupported object for a permission check: {obj!r}")


def visible_projects(user):
    """Projects the user may view, as one query (organization-wide or per-project roles)."""
    if user.is_superuser:
        return Project.objects.all()
    orgs = active_organization_ids(user)
    grants = RoleAssignment.objects.filter(
        _principal_q(user, team_ids(user)), role__permissions__code="project.view"
    )
    return Project.objects.filter(organization_id__in=orgs).filter(
        Q(organization_id__in=grants.filter(organization__isnull=False).values("organization_id"))
        | Q(pk__in=grants.filter(project__isnull=False).values("project_id"))
    )


def primary_organization(user):
    """The user's first active organization; the current UI works with one organization."""
    membership = (
        OrganizationMember.objects.filter(user=user, is_active=True)
        .select_related("organization")
        .order_by("joined_at", "id")
        .first()
    )
    return membership.organization if membership else None


def legacy_role_annotation(user_ref="pk"):
    """Subquery with the user's highest built-in organization role as the old API value."""
    rank = Case(
        *[When(role__code=code, then=Value(i)) for i, code in enumerate(ORG_ROLE_RANK)],
        output_field=IntegerField(),
    )
    legacy = Case(
        *[When(role__code=code, then=Value(ORG_ROLE_TO_LEGACY_ROLE[code])) for code in ORG_ROLE_RANK],
    )
    return Subquery(
        RoleAssignment.objects.filter(
            user_id=OuterRef(user_ref),
            organization__isnull=False,
            role__organization__isnull=True,
            role__code__in=ORG_ROLE_RANK,
        )
        .annotate(rank=rank, legacy=legacy)
        .order_by("rank")
        .values("legacy")[:1]
    )


def legacy_role(user):
    """The old ``profile.role`` value: admin / pm / member / viewer."""
    if hasattr(user, "org_role"):
        return user.org_role or "member"
    codes = set(
        RoleAssignment.objects.filter(
            user=user, organization__isnull=False, role__organization__isnull=True
        ).values_list("role__code", flat=True)
    )
    for code in ORG_ROLE_RANK:
        if code in codes:
            return ORG_ROLE_TO_LEGACY_ROLE[code]
    return "member"


# ─────────────────────────────
# Changing access
# ─────────────────────────────


def _role_permission_codes(role):
    return set(role.permissions.values_list("code", flat=True))


@transaction.atomic
def add_organization_member(actor, organization, user):
    if not can(actor, "org.members.manage", organization):
        raise PermissionDenied("Brak uprawnień do zarządzania członkami organizacji.")
    membership, created = OrganizationMember.objects.get_or_create(
        organization=organization, user=user, defaults={"invited_by": actor}
    )
    if not created and not membership.is_active:
        membership.is_active = True
        membership.save(update_fields=["is_active"])
    return membership


@transaction.atomic
def set_organization_role(actor, organization, user, role_code):
    """Replace the user's built-in organization role, guarding against privilege escalation."""
    if not can(actor, "org.members.manage", organization):
        raise PermissionDenied("Brak uprawnień do zarządzania członkami organizacji.")
    if actor.pk == user.pk and not actor.is_superuser:
        raise PermissionDenied("Nie możesz zmienić własnej roli.")
    if not OrganizationMember.objects.filter(
        organization=organization, user=user, is_active=True
    ).exists():
        raise ValidationError("Rolę można nadać tylko aktywnemu członkowi organizacji.")

    new_role = Role.objects.get(organization__isnull=True, code=role_code)
    current = RoleAssignment.objects.filter(
        user=user,
        organization=organization,
        role__organization__isnull=True,
        role__code__in=ORG_ROLE_RANK,
    ).select_related("role")

    if not actor.is_superuser:
        actor_codes = permissions_for(actor, organization=organization)
        touched = [new_role] + [a.role for a in current]
        for role in touched:
            if not _role_permission_codes(role) <= actor_codes:
                raise PermissionDenied(
                    "Nie możesz nadawać ani odbierać roli z uprawnieniami, których sam nie masz."
                )

    losing_admin = any(a.role.code == ORG_ROLE_ADMIN for a in current) and role_code != ORG_ROLE_ADMIN
    if losing_admin:
        other_admins = (
            RoleAssignment.objects.filter(
                organization=organization,
                role__code=ORG_ROLE_ADMIN,
                role__organization__isnull=True,
                user__organization_memberships__organization=organization,
                user__organization_memberships__is_active=True,
            )
            .exclude(user=user)
            .exists()
        )
        if not other_admins:
            raise ValidationError("Organizacja musi mieć co najmniej jednego administratora.")

    current.exclude(role=new_role).delete()
    assignment, _ = RoleAssignment.objects.get_or_create(
        role=new_role, user=user, organization=organization, defaults={"granted_by": actor}
    )
    _forget_cache(user)
    return assignment


@transaction.atomic
def grant_project_creator(project, user):
    """The creator of a project becomes its administrator."""
    RoleAssignment.objects.get_or_create(
        role=Role.objects.get(organization__isnull=True, code=PROJECT_ROLE_ADMIN),
        user=user,
        project=project,
        defaults={"granted_by": user},
    )
    _forget_cache(user)


def _forget_cache(user):
    if hasattr(user, _CACHE_ATTR):
        delattr(user, _CACHE_ATTR)
