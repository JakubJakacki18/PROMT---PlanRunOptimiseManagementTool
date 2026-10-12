class Attachment(GenericRelationMixin):
    __tablename__ = 'attachments'

    class Type(models.TextChoices):
        IMAGE = 'image', 'Image'
        AUDIO = 'audio', 'Audio'
        DOCUMENT = 'document', 'Document'
        URL = 'other', 'Other'

    id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.DOCUMENT)
    file = models.FileField(upload_to='attachments/')
    content = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Attachment {self.file.name} of type {self.type} on {self.content}"