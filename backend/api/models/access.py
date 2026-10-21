"""Access control models: organization membership, teams, roles and permissions.

Access is granted in exactly one place, ``RoleAssignment``: a principal
(a user or a team) gets a role in a scope (an organization or a project).
Code checks permission codes, never role names (see ``api.access``).
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

MAX_TEAM_DEPTH = 3


class Scope(models.TextChoices):
    ORGANIZATION = "organization", "Organization"
    PROJECT = "project", "Project"


class OrganizationMember(models.Model):
    """
    Represents a user's membership in an organization; required before any role can be granted there.
    """

    organization = models.ForeignKey(
        "api.Organization",
        on_delete=models.CASCADE,
        related_name="memberships",
        db_index=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    is_active = models.BooleanField(default=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organization_invitations",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "promt_organization_member"
        ordering = ["joined_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"], name="organization_member_unique"
            ),
        ]

    def __str__(self):
        return f"{self.user} @ {self.organization}"


class Permission(models.Model):
    """
    Represents a single permission code checked by the application, e.g. ``task.assign``.

    ``scope`` is the narrowest scope the permission makes sense in: project
    permissions may also be granted organization-wide, not the other way round.
    """

    code = models.CharField(max_length=60, unique=True)
    description = models.CharField(max_length=200)
    scope = models.CharField(max_length=12, choices=Scope.choices)

    class Meta:
        db_table = "promt_permission"
        ordering = ["code"]

    def __str__(self):
        return self.code


class Role(models.Model):
    """
    Represents a named set of permissions; built-in when ``organization`` is empty, custom otherwise.
    """

    organization = models.ForeignKey(
        "api.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="custom_roles",
    )
    code = models.SlugField(max_length=40)
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=200, blank=True)
    scope = models.CharField(max_length=12, choices=Scope.choices)
    permissions = models.ManyToManyField(
        Permission,
        through="api.RolePermission",
        related_name="roles",
        blank=True,
    )

    class Meta:
        db_table = "promt_role"
        ordering = ["scope", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"], name="role_code_unique_in_org"
            ),
            models.UniqueConstraint(
                fields=["code"],
                condition=Q(organization__isnull=True),
                name="role_code_unique_builtin",
            ),
        ]

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    """
    Represents one permission included in a role.
    """

    role = models.ForeignKey(Role, on_delete=models.CASCADE, db_index=False)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        db_table = "promt_role_permission"
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"], name="role_permission_unique"
            ),
        ]

    def clean(self):
        if (
            self.role.scope == Scope.PROJECT
            and self.permission.scope == Scope.ORGANIZATION
        ):
            raise ValidationError(
                "An organization-wide permission cannot be part of a project role."
            )

    def __str__(self):
        return f"{self.role.code}: {self.permission.code}"


class Team(models.Model):
    """
    Represents a group of people inside an organization or a single project.

    A root team belongs to exactly one organization or project; a subteam
    only points to its parent and inherits its scope. Members of a subteam
    are members of every team above it (at most three levels).
    """

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    organization = models.ForeignKey(
        "api.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="teams",
    )
    project = models.ForeignKey(
        "api.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="teams",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subteams",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="api.TeamMember",
        through_fields=("team", "user"),
        related_name="teams",
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teams_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "promt_team"
        ordering = ["name", "id"]
        constraints = [
            models.CheckConstraint(
                name="team_exactly_one_scope",
                condition=(
                    Q(organization__isnull=False, project__isnull=True, parent__isnull=True)
                    | Q(organization__isnull=True, project__isnull=False, parent__isnull=True)
                    | Q(organization__isnull=True, project__isnull=True, parent__isnull=False)
                ),
            ),
        ]

    def root(self):
        team = self
        while team.parent_id:
            team = team.parent
        return team

    def depth(self):
        depth, team = 1, self
        while team.parent_id:
            depth += 1
            team = team.parent
        return depth

    def clean(self):
        if self.parent_id and self.parent.depth() >= MAX_TEAM_DEPTH:
            raise ValidationError(f"Teams can be nested at most {MAX_TEAM_DEPTH} levels deep.")

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    """
    Represents a user's membership in a team.
    """

    team = models.ForeignKey(Team, on_delete=models.CASCADE, db_index=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="team_memberships_added",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "promt_team_member"
        constraints = [
            models.UniqueConstraint(fields=["team", "user"], name="team_member_unique"),
        ]

    def __str__(self):
        return f"{self.user} in {self.team}"


class RoleAssignment(models.Model):
    """
    Represents the single place where access is granted: a user or a team gets a role in an organization or a project.
    """

    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="assignments")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="role_assignments",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="role_assignments",
    )
    organization = models.ForeignKey(
        "api.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="role_assignments",
    )
    project = models.ForeignKey(
        "api.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="role_assignments",
    )
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="role_assignments_granted",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "promt_role_assignment"
        constraints = [
            models.CheckConstraint(
                name="role_assignment_one_principal",
                condition=(
                    Q(user__isnull=False, team__isnull=True)
                    | Q(user__isnull=True, team__isnull=False)
                ),
            ),
            models.CheckConstraint(
                name="role_assignment_one_scope",
                condition=(
                    Q(organization__isnull=False, project__isnull=True)
                    | Q(organization__isnull=True, project__isnull=False)
                ),
            ),
            models.UniqueConstraint(
                fields=["role", "user", "organization"],
                condition=Q(user__isnull=False, organization__isnull=False),
                name="role_assignment_unique_user_org",
            ),
            models.UniqueConstraint(
                fields=["role", "user", "project"],
                condition=Q(user__isnull=False, project__isnull=False),
                name="role_assignment_unique_user_project",
            ),
            models.UniqueConstraint(
                fields=["role", "team", "organization"],
                condition=Q(team__isnull=False, organization__isnull=False),
                name="role_assignment_unique_team_org",
            ),
            models.UniqueConstraint(
                fields=["role", "team", "project"],
                condition=Q(team__isnull=False, project__isnull=False),
                name="role_assignment_unique_team_project",
            ),
        ]

    def clean(self):
        expected = Scope.PROJECT if self.project_id else Scope.ORGANIZATION
        if self.role.scope != expected:
            raise ValidationError("Role scope does not match the assignment scope.")

    def __str__(self):
        who = self.user or self.team
        where = self.project or self.organization
        return f"{who}: {self.role.code} @ {where}"
