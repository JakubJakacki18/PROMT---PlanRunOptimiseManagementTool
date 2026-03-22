"""Unit tests for ProjectFunding signals."""

from datetime import date, timedelta

from django.test import TestCase

from api.models import (
    Funding,
    FundingTask,
    Project,
    ProjectFunding,
    Task,
    TaskScope,
)


class CreateTasksOnProjectFundingTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(
            name="Signal Proj",
            start_date=date(2026, 3, 1),
            end_date=date(2026, 12, 31),
        )
        self.funding = Funding.objects.create(name="Signal Fund", type="grant")

    def test_single_template_creates_task(self):
        FundingTask.objects.create(
            funding=self.funding,
            title="Raport końcowy",
            default_status="todo",
            default_priority=2,
        )
        pf = ProjectFunding.objects.create(
            project=self.project, funding=self.funding
        )
        tasks = Task.objects.filter(scope__project_funding=pf)
        self.assertEqual(tasks.count(), 1)
        self.assertEqual(tasks.first().title, "Raport końcowy")

    def test_due_date_calculated_from_allocation_start(self):
        FundingTask.objects.create(
            funding=self.funding,
            title="Due calc",
            default_due_days=30,
        )
        pf = ProjectFunding.objects.create(
            project=self.project,
            funding=self.funding,
            allocation_start=date(2026, 4, 1),
        )
        task = Task.objects.get(scope__project_funding=pf)
        self.assertEqual(task.due_date, date(2026, 4, 1) + timedelta(days=30))


class DeleteTasksOnProjectFundingDeleteTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="Del Proj")
        self.funding = Funding.objects.create(name="Del Fund", type="grant")
        FundingTask.objects.create(
            funding=self.funding, title="Auto Task"
        )

    def test_delete_pf_removes_funding_scoped_tasks(self):
        pf = ProjectFunding.objects.create(
            project=self.project, funding=self.funding
        )
        task_ids = list(
            Task.objects.filter(
                scope__project_funding=pf, scope__funding_scoped=True
            ).values_list("id", flat=True)
        )
        self.assertTrue(len(task_ids) > 0)

        Task.objects.filter(id__in=task_ids).delete()
        pf.delete()

        self.assertFalse(Task.objects.filter(id__in=task_ids).exists())
