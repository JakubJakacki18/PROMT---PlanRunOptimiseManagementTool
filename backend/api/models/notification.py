from django.conf import settings
from django.db import models
from django.db.models import Q


class Notification(models.Model):
    """
    Represents one recipient's copy of an activity log entry.

    What happened, to which object and when is stored once in ActivityLog;
    one event fans out to many notifications.
    """

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=False,
    )
    activity = models.ForeignKey(
        "api.ActivityLog",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "promt_notification"
        ordering = ["-activity_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "activity"], name="notification_unique"
            ),
        ]
        indexes = [
            models.Index(
                fields=["recipient", "activity"],
                condition=Q(read_at__isnull=True),
                name="notification_unread_idx",
            ),
        ]

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f"{self.recipient}: {self.activity}"
