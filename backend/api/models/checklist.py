from django.db import models
from django.conf import settings


class Checklist(models.Model):
    """
    Represents a named list of items to tick off inside a single task.
    """

    task = models.ForeignKey(
        "api.Task",
        on_delete=models.CASCADE,
        related_name="checklists",
        db_index=False,
    )

    title = models.CharField(max_length=200)
    position = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "promt_checklist"
        ordering = ["position", "id"]
        indexes = [
            models.Index(fields=["task", "position"]),
        ]

    def __str__(self):
        return f"[{self.task.title}] {self.title}"


class ChecklistItem(models.Model):
    """
    Represents a single checklist entry, including who is responsible for it and who ticked it off.

    An item is done when ``done_at`` is set; there is no separate flag.
    """

    checklist = models.ForeignKey(
        Checklist,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=False,
    )

    text = models.CharField(max_length=300)
    position = models.PositiveIntegerField(default=0)

    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="checklist_items",
    )
    done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="checklist_items_done",
    )
    done_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "promt_checklist_item"
        ordering = ["position", "id"]
        indexes = [
            models.Index(fields=["checklist", "position"]),
        ]

    def __str__(self):
        return f"{'[x]' if self.is_done else '[ ]'} {self.text}"

    @property
    def is_done(self):
        return self.done_at is not None
