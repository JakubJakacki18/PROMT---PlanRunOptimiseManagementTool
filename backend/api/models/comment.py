class Comment(GenericRelationMixin):
    __tablename__ = 'comments'

    id = models.AutoField(primary_key=True)
    author = models.ForeignKey(
        "api.User",
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