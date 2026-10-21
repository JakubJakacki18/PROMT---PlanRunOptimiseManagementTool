from django.db import models
from django.db.models import Q


class Status(models.Model):
    """
    Represents a workflow status of a task or a milestone.

    Built-in statuses have no organization and are shared by everyone;
    an organization can add its own. Application logic relies only on
    ``category``, so statuses can be renamed or added without code changes.
    """

    class AppliesTo(models.TextChoices):
        TASK = "task", "Task"
        MILESTONE = "milestone", "Milestone"

    class Category(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In progress"
        DONE = "done", "Done"

    organization = models.ForeignKey(
        "api.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="statuses",
    )

    applies_to = models.CharField(max_length=10, choices=AppliesTo.choices)
    code = models.SlugField(max_length=40)
    name = models.CharField(max_length=60)
    category = models.CharField(max_length=12, choices=Category.choices)
    position = models.PositiveSmallIntegerField(default=0)
    color = models.CharField(max_length=7, blank=True, help_text="Hex color, e.g. #1c6aa8")
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "promt_status"
        ordering = ["applies_to", "position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "applies_to", "code"],
                name="status_code_unique_in_org",
            ),
            models.UniqueConstraint(
                fields=["applies_to", "code"],
                condition=Q(organization__isnull=True),
                name="status_code_unique_builtin",
            ),
            models.UniqueConstraint(
                fields=["organization", "applies_to"],
                condition=Q(is_default=True),
                name="status_one_default_in_org",
            ),
            models.UniqueConstraint(
                fields=["applies_to"],
                condition=Q(is_default=True, organization__isnull=True),
                name="status_one_default_builtin",
            ),
        ]

    def __str__(self):
        return self.name


def default_task_status():
    """Primary key of the built-in default task status (used as a model default)."""
    return (
        Status.objects.filter(
            organization__isnull=True,
            applies_to=Status.AppliesTo.TASK,
            is_default=True,
        )
        .values_list("pk", flat=True)
        .first()
    )


def default_milestone_status():
    """Primary key of the built-in default milestone status (used as a model default)."""
    return (
        Status.objects.filter(
            organization__isnull=True,
            applies_to=Status.AppliesTo.MILESTONE,
            is_default=True,
        )
        .values_list("pk", flat=True)
        .first()
    )
