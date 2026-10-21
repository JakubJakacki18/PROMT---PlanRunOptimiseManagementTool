from django.db import models


class Organization(models.Model):
    """
    Represents a customer organization (tenant) that owns projects, fundings, tasks and users.
    """

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=80, unique=True)
    tax_id = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "promt_organization"
        ordering = ["name"]

    def __str__(self):
        return self.name
