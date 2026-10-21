from django.db import models

from api.models.status import default_milestone_status


class Milestone(models.Model):
    """
    Represents a stage of a project that groups tasks and has its own deadline.
    """

    project = models.ForeignKey(
        "api.Project",
        on_delete=models.CASCADE,
        related_name="milestones",
    )

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.ForeignKey(
        "api.Status",
        on_delete=models.PROTECT,
        blank=True,
        related_name="milestones",
        limit_choices_to={"applies_to": "milestone"},
    )
    due_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "promt_milestone"
        ordering = ["due_date", "id"]
        indexes = [
            models.Index(fields=["project", "due_date"]),
        ]

    def clean(self):
        super().clean()
        self._fill_default_status()

    def save(self, *args, **kwargs):
        self._fill_default_status()
        super().save(*args, **kwargs)

    def _fill_default_status(self):
        if self.status_id is None:
            self.status_id = default_milestone_status()

    def __str__(self):
        return f"[{self.project.name}] {self.name}"
