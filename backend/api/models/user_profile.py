from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

phone_validator = RegexValidator(
    regex=r"^\+?\d{7,15}$",
    message="Phone number must contain 7 to 15 digits and may start with '+'.",
)


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
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

    class Meta:
        db_table = "promt_user_profile"

    def clean_fields(self, exclude=None):
        if self.phone:
            self.phone = self.phone.strip()
            for ch in [" ", "-", "(", ")"]:
                self.phone = self.phone.replace(ch, "")
        super().clean_fields(exclude=exclude)

    def clean(self):
        super().clean()
        if self.avatar_url:
            self.avatar_url = self.avatar_url.strip()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.user.username
