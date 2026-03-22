"""Unit tests for Project-related models."""

from datetime import date

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase

from api.models import Funding, Project, ProjectFunding, TaskScope, Task

User = get_user_model()


class ProjectModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass1234")

    def test_create_project_minimal(self):
        p = Project.objects.create(name="Projekt A")
        self.assertEqual(p.name, "Projekt A")
        self.assertEqual(p.status, Project.Status.NEW)
        self.assertIsNone(p.owner)
        self.assertIsNone(p.start_date)
        self.assertIsNone(p.end_date)

    def test_create_project_all_fields(self):
        p = Project.objects.create(
            name="Projekt B",
            description="Opis projektu",
            status=Project.Status.ACTIVE,
            owner=self.user,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        self.assertEqual(p.description, "Opis projektu")
        self.assertEqual(p.status, "active")
        self.assertEqual(p.owner, self.user)
        self.assertEqual(p.start_date, date(2026, 1, 1))
        self.assertEqual(p.end_date, date(2026, 12, 31))

    def test_start_date_before_end_date_ok(self):
        p = Project.objects.create(
            name="OK dates",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 6, 1),
        )
        self.assertIsNotNone(p.pk)

    def test_start_date_after_end_date_raises(self):
        with self.assertRaises(IntegrityError):
            Project.objects.create(
                name="Bad dates",
                start_date=date(2026, 12, 1),
                end_date=date(2026, 1, 1),
            )

    def test_owner_set_null_on_delete(self):
        p = Project.objects.create(name="Owned", owner=self.user)
        self.user.delete()
        p.refresh_from_db()
        self.assertIsNone(p.owner)


class ProjectFundingModelTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(
            name="Proj PF",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        self.funding = Funding.objects.create(name="Grant PF", type="grant")

    def test_unique_together(self):
        ProjectFunding.objects.create(project=self.project, funding=self.funding)
        with self.assertRaises(IntegrityError):
            ProjectFunding.objects.create(project=self.project, funding=self.funding)

    def test_allocation_dates_constraint(self):
        with self.assertRaises(IntegrityError):
            ProjectFunding.objects.create(
                project=self.project,
                funding=self.funding,
                allocation_start=date(2026, 12, 1),
                allocation_end=date(2026, 1, 1),
            )

    def test_cascade_delete_project(self):
        ProjectFunding.objects.create(project=self.project, funding=self.funding)
        self.project.delete()
        self.assertEqual(ProjectFunding.objects.count(), 0)


class TaskScopeModelTests(TestCase):
    def setUp(self):
        self.task = Task.objects.create(title="Scope Task")

    def test_scope_no_field_raises(self):
        with self.assertRaises(IntegrityError):
            TaskScope.objects.create(task=self.task)
