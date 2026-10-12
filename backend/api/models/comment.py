from django.db import models

from api.models.mixins.generic_relation_mixin import GenericRelationMixin
from django.conf import settings


class Comment(GenericRelationMixin):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    parent_comment = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)


    def __str__(self):
        return f"Comment by {self.author} on {self.content}"

    class Meta:
        db_table = "comments"