"""Unit tests for Project-related serializers."""

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory

from api.models import (
    Funding,
    Project,
    ProjectFunding,
    Task,
    TaskScope,
)
from api.serializers import (
    ProjectSerializer,
    TaskSerializer,
)

User = get_user_model()


class ProjectSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ser_user", password="pass")
        self.project = Project.objects.create(
            name="Ser Proj",
            description="Opis",
            status="active",
            owner=self.user,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 6, 30),
        )

    def test_serialized_fields(self):
        data = ProjectSerializer(self.project).data
        expected_keys = {"id", "name", "description", "status", "owner",
                         "start_date", "end_date", "tasks"}
        self.assertEqual(set(data.keys()), expected_keys)


class TaskSerializerValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="task_user", password="pass")
        self.project = Project.objects.create(name="TV Proj")
        self.funding = Funding.objects.create(name="TV Fund", type="grant")
        self.pf = ProjectFunding.objects.create(
            project=self.project, funding=self.funding
        )
        self.factory = RequestFactory()

    def _ctx(self):
        request = self.factory.post("/api/tasks/")
        request.user = self.user
        return {"request": request}

    def test_valid_with_project_scope(self):
        data = {"title": "T1", "project": self.project.pk}
        ser = TaskSerializer(data=data, context=self._ctx())
        self.assertTrue(ser.is_valid(), ser.errors)

    def test_invalid_two_scopes(self):
        data = {
            "title": "T4",
            "project": self.project.pk,
            "funding": self.funding.pk,
        }
        ser = TaskSerializer(data=data, context=self._ctx())
        self.assertFalse(ser.is_valid())

    def test_create_task_with_assignees(self):
        data = {
            "title": "Assigned",
            "project": self.project.pk,
            "assignee_ids": [self.user.pk],
        }
        ser = TaskSerializer(data=data, context=self._ctx())
        ser.is_valid(raise_exception=True)
        task = ser.save()
        self.assertIn(self.user, task.assignees.all())
