"""Drop the old text columns now that their data lives in Status and RoleAssignment."""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models



class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_access_and_status_data"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(model_name="task", name="status"),
        migrations.RenameField(model_name="task", old_name="status_ref", new_name="status"),
        migrations.AlterField(
            model_name="task",
            name="status",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"applies_to": "task"},
                on_delete=django.db.models.deletion.PROTECT,
                related_name="tasks",
                to="api.status",
            ),
        ),
        migrations.RemoveField(model_name="fundingtask", name="default_status"),
        migrations.RenameField(
            model_name="fundingtask", old_name="default_status_ref", new_name="default_status"
        ),
        migrations.AlterField(
            model_name="fundingtask",
            name="default_status",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"applies_to": "task"},
                on_delete=django.db.models.deletion.PROTECT,
                related_name="funding_task_templates",
                to="api.status",
            ),
        ),
        migrations.AlterField(
            model_name="milestone",
            name="status",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"applies_to": "milestone"},
                on_delete=django.db.models.deletion.PROTECT,
                related_name="milestones",
                to="api.status",
            ),
        ),
        migrations.RemoveField(model_name="userprofile", name="role"),
        migrations.AlterField(
            model_name="notification",
            name="recipient",
            field=models.ForeignKey(
                db_index=False,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="notifications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
