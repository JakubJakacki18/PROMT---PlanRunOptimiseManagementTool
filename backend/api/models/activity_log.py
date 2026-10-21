from django.db import models
from django.db.models import Q
from django.conf import settings

from api.models.mixins.generic_relation_mixin import GenericRelationMixin


class ActivityLog(GenericRelationMixin):
    """
    Represents a single entry in the audit log: who did what to which object and when.

    The entry belongs to a project, to an organization (events outside any
    project, e.g. a role change) or to neither (platform events such as a
    login); never to both, because a project already implies its organization.
    """

    class Action(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        DELETED = "deleted", "Deleted"
        STATUS_CHANGED = "status_changed", "Status changed"
        ASSIGNED = "assigned", "Assigned"
        COMMENTED = "commented", "Commented"
        MEMBER_ADDED = "member_added", "Member added"
        MEMBER_REMOVED = "member_removed", "Member removed"
        ROLE_GRANTED = "role_granted", "Role granted"
        ROLE_REVOKED = "role_revoked", "Role revoked"
        DEADLINE_SOON = "deadline_soon", "Deadline soon"
        LOGIN = "login", "Logged in"
        LOGIN_FAILED = "login_failed", "Login failed"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="activity_logs",
    )
    organization = models.ForeignKey(
        "api.Organization",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="activity_logs",
    )
    project = models.ForeignKey(
        "api.Project",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="activity_logs",
    )

    action = models.CharField(max_length=20, choices=Action.choices)
    changes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Changed fields as {field: [old, new]}",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta(GenericRelationMixin.Meta):
        db_table = "promt_activity_log"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                name="activity_log_at_most_one_scope",
                condition=~Q(organization__isnull=False, project__isnull=False),
            ),
        ]
        indexes = GenericRelationMixin.Meta.indexes + [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["project", "created_at"]),
            models.Index(fields=["actor", "created_at"]),
        ]

    def __str__(self):
        return f"{self.actor} {self.action} {self.content_type} #{self.object_id}"
