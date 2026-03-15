import os
import django
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

class Command(BaseCommand):
    help = "Create a superuser"

    def add_arguments(self, parser):
        parser.add_argument('--mode', type=str, help="Mode")

    def handle(self, *args, **options):
        run(self)


def run(self):
    """
    Create a superuser if not exists.

    Environment variables in use:
        DJANGO_SUPERUSER_USERNAME: superuser username (default: admin)
        DJANGO_SUPERUSER_EMAIL: superuser email (default: admin@example.com)
        DJANGO_SUPERUSER_PASSWORD: superuser password (default: admin)

    Prints:
        "✅ Superuser created! Username: <username>" if created
        "⚠️ Superuser already exists. Skipping..." if already exists
    """
    user = get_user_model()
    username = os.getenv("DJANGO_SUPERUSER_USERNAME", "admin")

    counter_all_logs = 2
    counter_logs = 1

    print(f"[superuser creation {counter_logs}/{counter_all_logs}]creating superuser if he does not exists already...")
    counter_logs += 1

    if not user.objects.filter(username=username).exists():
        user.objects.create_superuser(
            username,
            os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@example.com"),
            os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin")
        )
        print(f"[superuser creation {counter_logs}/{counter_all_logs}]✅ Superuser created! Username: ",username)
    else:
        print(f"[superuser creation {counter_logs}/{counter_all_logs}]⚠️ Superuser already exists. Skipping...")