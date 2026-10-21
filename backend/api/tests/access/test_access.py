import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError

from api import access
from api.models import (
    Organization,
    OrganizationMember,
    Project,
    Role,
    RoleAssignment,
    Team,
    TeamMember,
)

User = get_user_model()


def role(code):
    return Role.objects.get(organization__isnull=True, code=code)


def member(org, username, org_role=None):
    user = User.objects.create_user(username=username, password="x" * 12)
    OrganizationMember.objects.create(organization=org, user=user)
    if org_role:
        RoleAssignment.objects.create(role=role(org_role), user=user, organization=org)
    return user


@pytest.fixture
def org(db):
    return Organization.objects.create(name="Fundacja X", slug="fundacja-x")


@pytest.fixture
def project(org):
    return Project.objects.create(name="Rekrutacja 2026", organization=org)


@pytest.fixture
def other_project(org):
    return Project.objects.create(name="Biuro WAW", organization=org)


def test_org_admin_has_every_permission_in_every_project(org, project):
    admin = member(org, "admin", access.ORG_ROLE_ADMIN)

    assert access.can(admin, "task.edit_any", project)
    assert access.can(admin, "org.members.manage", org)


def test_project_role_works_only_in_its_project(org, project, other_project):
    ania = member(org, "ania", access.ORG_ROLE_MEMBER)
    RoleAssignment.objects.create(role=role("project_member"), user=ania, project=project)

    assert access.can(ania, "task.create", project)
    assert not access.can(ania, "task.edit_any", project)
    assert not access.can(ania, "project.view", other_project)


def test_subteam_member_inherits_roles_of_all_parent_teams(org, project, other_project):
    kadry = Team.objects.create(name="Kadry", organization=org)
    kadry_waw = Team.objects.create(name="Kadry Warszawa", parent=kadry)
    rekrutacja = Team.objects.create(name="Rekrutacja WAW", parent=kadry_waw)
    RoleAssignment.objects.create(role=role(access.ORG_ROLE_VIEWER), team=kadry, organization=org)
    RoleAssignment.objects.create(role=role("project_member"), team=kadry_waw, project=other_project)
    RoleAssignment.objects.create(role=role(access.PROJECT_ROLE_ADMIN), team=rekrutacja, project=project)
    ania = member(org, "ania")
    bartek = member(org, "bartek")
    TeamMember.objects.create(team=rekrutacja, user=ania)
    TeamMember.objects.create(team=kadry, user=bartek)

    assert access.can(ania, "task.edit_any", project)
    assert access.can(ania, "task.create", other_project)
    assert access.can(bartek, "project.view", project)
    assert not access.can(bartek, "task.create", other_project)


def test_team_cannot_be_nested_deeper_than_three_levels(org):
    level1 = Team.objects.create(name="1", organization=org)
    level2 = Team.objects.create(name="2", parent=level1)
    level3 = Team.objects.create(name="3", parent=level2)

    with pytest.raises(ValidationError):
        Team(name="4", parent=level3).full_clean()


def test_team_must_have_exactly_one_scope(org, project):
    with pytest.raises(IntegrityError):
        Team.objects.create(name="X", organization=org, project=project)


def test_inactive_membership_removes_all_access(org, project):
    admin = member(org, "admin", access.ORG_ROLE_ADMIN)
    OrganizationMember.objects.filter(user=admin).update(is_active=False)

    assert not access.can(admin, "project.view", project)


def test_visible_projects_lists_only_granted_projects(org, project, other_project):
    ania = member(org, "ania", access.ORG_ROLE_MEMBER)
    viewer = member(org, "viewer", access.ORG_ROLE_VIEWER)
    RoleAssignment.objects.create(role=role("project_member"), user=ania, project=project)

    assert list(access.visible_projects(ania)) == [project]
    assert set(access.visible_projects(viewer)) == {project, other_project}


def test_pm_can_set_member_role(org):
    pm = member(org, "pm", access.ORG_ROLE_PM)
    viewer = member(org, "viewer", access.ORG_ROLE_MEMBER)

    access.set_organization_role(pm, org, viewer, access.ORG_ROLE_MEMBER)

    assert access.legacy_role(viewer) == "member"


def test_pm_cannot_grant_admin_role(org):
    pm = member(org, "pm", access.ORG_ROLE_PM)
    worker = member(org, "worker", access.ORG_ROLE_MEMBER)

    with pytest.raises(PermissionDenied):
        access.set_organization_role(pm, org, worker, access.ORG_ROLE_ADMIN)


def test_pm_cannot_demote_admin(org):
    member(org, "admin1", access.ORG_ROLE_ADMIN)
    admin2 = member(org, "admin2", access.ORG_ROLE_ADMIN)
    pm = member(org, "pm", access.ORG_ROLE_PM)

    with pytest.raises(PermissionDenied):
        access.set_organization_role(pm, org, admin2, access.ORG_ROLE_MEMBER)


def test_nobody_changes_own_role(org):
    admin = member(org, "admin", access.ORG_ROLE_ADMIN)

    with pytest.raises(PermissionDenied):
        access.set_organization_role(admin, org, admin, access.ORG_ROLE_MEMBER)


def test_last_admin_cannot_be_removed(org):
    admin = member(org, "admin", access.ORG_ROLE_ADMIN)
    root = User.objects.create_superuser(username="root", password="x" * 12)

    with pytest.raises(ValidationError):
        access.set_organization_role(root, org, admin, access.ORG_ROLE_MEMBER)


def test_role_assignment_needs_exactly_one_principal(org):
    with pytest.raises(IntegrityError):
        RoleAssignment.objects.create(role=role(access.ORG_ROLE_MEMBER), organization=org)
