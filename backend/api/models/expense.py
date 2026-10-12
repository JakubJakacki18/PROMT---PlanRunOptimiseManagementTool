from django.core.validators import MinValueValidator
from django.db import models

from api.models.mixins.generic_relation_mixin import GenericRelationMixin


class Expense(GenericRelationMixin):
    class Type(models.TextChoices):
        TRAVEL = "travel", "Travel"
        COURSES = "courses", "Courses"
        EXTERNAL_SERVICES = "external_services", "External Services"
        EQUIPMENT = "equipment", "Equipment"
        OTHER = "other", "Other"

    id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=20, choices=Type.choices)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(max_length=3, default="PLN")
    description = models.TextField(blank=True)

    class Meta:
        db_table = "expenses"


