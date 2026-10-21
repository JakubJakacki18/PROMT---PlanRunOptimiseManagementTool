"""Seed built-in permissions, roles and statuses, and move existing data onto them.

The catalog below is frozen on purpose: a migration must keep doing the same
thing even when the application's catalog changes later.
"""

from django.db import migrations

ORG, PROJECT = "organization", "project"

PERMISSIONS = [
    ("org.manage", "Edit organization settings", ORG),
    ("org.members.manage", "Add, block and change roles of organization members", ORG),
    ("org.teams.manage", "Create and edit organization teams", ORG),
    ("org.roles.manage", "Create and edit custom roles", ORG),
    ("org.audit.view", "View the organization audit log", ORG),
    ("project.create", "Create projects", ORG),
    ("funding.view", "View fundings", ORG),
    ("funding.manage", "Create and edit fundings and task templates", ORG),
    ("project.view", "View a project and its tasks", PROJECT),
    ("project.edit", "Edit project details", PROJECT),
    ("project.delete", "Delete or archive a project", PROJECT),
    ("project.members.manage", "Manage project members and project teams", PROJECT),
    ("project.audit.view", "View the project audit log", PROJECT),
    ("milestone.manage", "Create and edit milestones", PROJECT),
    ("task.create", "Create tasks", PROJECT),
    ("task.edit_own", "Edit tasks one created or is assigned to", PROJECT),
    ("task.edit_any", "Edit any task", PROJECT),
    ("task.assign", "Assign people to tasks", PROJECT),
    ("task.review", "Accept or reject reviewed tasks", PROJECT),
    ("task.delete", "Delete tasks", PROJECT),
    ("checklist.manage", "Create and edit checklists", PROJECT),
    ("checklist.check_own", "Tick off checklist items assigned to oneself", PROJECT),
    ("comment.create", "Write comments", PROJECT),
    ("comment.moderate", "Edit or delete other people's comments", PROJECT),
]

PROJECT_ALL = [code for code, _, scope in PERMISSIONS if scope == PROJECT]

ROLES = [
    ("org_admin", "Administrator organizacji", ORG, [code for code, _, _ in PERMISSIONS]),
    ("org_pm", "Project Manager", ORG, [
        "org.members.manage", "org.teams.manage", "project.create",
        "funding.view", "funding.manage",
    ]),
    ("org_member", "Pracownik", ORG, ["funding.view"]),
    ("org_viewer", "Obserwator", ORG, ["funding.view", "project.view"]),
    ("project_admin", "Administrator projektu", PROJECT, PROJECT_ALL),
    ("project_member", "Członek projektu", PROJECT, [
        "project.view", "task.create", "task.edit_own",
        "checklist.check_own", "comment.create",
    ]),
    ("project_viewer", "Obserwator projektu", PROJECT, ["project.view"]),
]

STATUSES = [
    # applies_to, code, name, category, color, is_default
    ("task", "todo", "Do zrobienia", "todo", "#8a97a6", True),
    ("task", "doing", "W trakcie", "in_progress", "#1c6aa8", False),
    ("task", "to_review", "Do sprawdzenia", "in_progress", "#b7791f", False),
    ("task", "in_review", "W sprawdzaniu", "in_progress", "#7b5ea7", False),
    ("task", "done", "Zakończone", "done", "#1f8a68", False),
    ("milestone", "planned", "Planowany", "todo", "#8a97a6", True),
    ("milestone", "active", "Aktywny", "in_progress", "#1c6aa8", False),
    ("milestone", "done", "Zakończony", "done", "#1f8a68", False),
    ("milestone", "cancelled", "Anulowany", "done", "#9b3d3d", False),
]

PROFILE_ROLE_TO_ORG_ROLE = {
    "admin": "org_admin",
    "pm": "org_pm",
    "member": "org_member",
    "viewer": "org_viewer",
}


def seed_catalog(apps):
    Permission = apps.get_model("api", "Permission")
    Role = apps.get_model("api", "Role")
    RolePermission = apps.get_model("api", "RolePermission")
    Status = apps.get_model("api", "Status")

    perms = {}
    for code, description, scope in PERMISSIONS:
        perms[code], _ = Permission.objects.get_or_create(
            code=code, defaults={"description": description, "scope": scope}
        )

    roles = {}
    for code, name, scope, codes in ROLES:
        role, _ = Role.objects.get_or_create(
            organization=None, code=code, defaults={"name": name, "scope": scope}
        )
        roles[code] = role
        RolePermission.objects.bulk_create(
            [RolePermission(role=role, permission=perms[c]) for c in codes],
            ignore_conflicts=True,
        )

    statuses = {}
    for position, (applies_to, code, name, category, color, is_default) in enumerate(STATUSES):
        statuses[(applies_to, code)], _ = Status.objects.get_or_create(
            organization=None,
            applies_to=applies_to,
            code=code,
            defaults={
                "name": name,
                "category": category,
                "color": color,
                "position": position,
                "is_default": is_default,
            },
        )
    return roles, statuses


def migrate_statuses(apps, statuses):
    Task = apps.get_model("api", "Task")
    FundingTask = apps.get_model("api", "FundingTask")
    for code in ("todo", "doing", "done"):
        status = statuses[("task", code)]
        Task.objects.filter(status=code).update(status_ref=status)
        FundingTask.objects.filter(default_status=code).update(default_status_ref=status)
    default = statuses[("task", "todo")]
    Task.objects.filter(status_ref__isnull=True).update(status_ref=default)
    FundingTask.objects.filter(default_status_ref__isnull=True).update(default_status_ref=default)


def migrate_access(apps, roles):
    """Put existing users and projects into one default organization with equivalent roles."""
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("api", "Organization")
    OrganizationMember = apps.get_model("api", "OrganizationMember")
    RoleAssignment = apps.get_model("api", "RoleAssignment")
    UserProfile = apps.get_model("api", "UserProfile")
    Project = apps.get_model("api", "Project")
    Funding = apps.get_model("api", "Funding")
    TaskAssignment = apps.get_model("api", "TaskAssignment")

    if not (User.objects.exists() or Project.objects.exists() or Funding.objects.exists()):
        return

    org, _ = Organization.objects.get_or_create(
        slug="default", defaults={"name": "Default organization"}
    )
    Project.objects.filter(organization__isnull=True).update(organization=org)
    Funding.objects.filter(organization__isnull=True).update(organization=org)

    profile_roles = dict(UserProfile.objects.values_list("user_id", "role"))
    for user in User.objects.all():
        OrganizationMember.objects.get_or_create(organization=org, user=user)
        role_code = PROFILE_ROLE_TO_ORG_ROLE.get(profile_roles.get(user.pk), "org_member")
        RoleAssignment.objects.get_or_create(
            role=roles[role_code], user=user, organization=org
        )

    project_admin, project_member = roles["project_admin"], roles["project_member"]
    for project in Project.objects.filter(owner__isnull=False):
        RoleAssignment.objects.get_or_create(
            role=project_admin, user_id=project.owner_id, project=project
        )

    has_project_role = set(
        RoleAssignment.objects.filter(user__isnull=False, project__isnull=False)
        .values_list("user_id", "project_id")
    )
    pairs = set()
    for user_id, direct, via_funding in TaskAssignment.objects.values_list(
        "user_id", "task__scope__project_id", "task__scope__project_funding__project_id"
    ):
        project_id = direct or via_funding
        if project_id and (user_id, project_id) not in has_project_role:
            pairs.add((user_id, project_id))
    RoleAssignment.objects.bulk_create(
        [RoleAssignment(role=project_member, user_id=u, project_id=p) for u, p in pairs]
    )


def forwards(apps, schema_editor):
    roles, statuses = seed_catalog(apps)
    migrate_statuses(apps, statuses)
    migrate_access(apps, roles)


def backwards(apps, schema_editor):
    """Restore the old text columns from the new tables before they are dropped."""
    Task = apps.get_model("api", "Task")
    FundingTask = apps.get_model("api", "FundingTask")
    UserProfile = apps.get_model("api", "UserProfile")
    RoleAssignment = apps.get_model("api", "RoleAssignment")

    old_codes = {"todo": "todo", "doing": "doing", "to_review": "doing", "in_review": "doing", "done": "done"}
    for task in Task.objects.select_related("status_ref"):
        task.status = old_codes.get(getattr(task.status_ref, "code", "todo"), "todo")
        task.save(update_fields=["status"])
    for template in FundingTask.objects.select_related("default_status_ref"):
        template.default_status = old_codes.get(getattr(template.default_status_ref, "code", "todo"), "todo")
        template.save(update_fields=["default_status"])

    to_profile = {v: k for k, v in PROFILE_ROLE_TO_ORG_ROLE.items()}
    for user_id, role_code in RoleAssignment.objects.filter(
        user__isnull=False, organization__isnull=False
    ).values_list("user_id", "role__code"):
        if role_code in to_profile:
            UserProfile.objects.filter(user_id=user_id).update(role=to_profile[role_code])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_access_statuses_and_extensions"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
