from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


phone_validator = RegexValidator(
    regex=r"^\+?\d{7,15}$",
    message="Phone number must contain 7 to 15 digits and may start with '+'.",
)


class UserRole(models.TextChoices):
    ADMIN = "admin", "Administrator"
    PM = "pm", "Project Manager"
    MEMBER = "member", "Członek zespołu"
    VIEWER = "viewer", "Viewer"


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.MEMBER,
    )

    phone = models.CharField(
        max_length=16,
        blank=True,
        validators=[phone_validator],
        help_text="Optional phone number in international format.",
    )

    avatar_url = models.URLField(
        blank=True,
        help_text="URL to the user's avatar image - optional",
    )

    def clean(self):
        super().clean()

        if self.phone:
            self.phone = self.phone.strip()

        if self.avatar_url:
            self.avatar_url = self.avatar_url.strip()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"