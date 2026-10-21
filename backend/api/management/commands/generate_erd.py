"""Generate an entity-relationship diagram of the database schema.

The diagram is built from the Django model registry (no database connection
needed) and emitted as a Mermaid ``erDiagram``, which renders natively on
GitHub, in VS Code and at https://mermaid.live.

Usage:
    python manage.py generate_erd                      # print to stdout
    python manage.py generate_erd -o ../docs/erd.md    # write Markdown file
    python manage.py generate_erd --all                # include Django's own tables
"""

from pathlib import Path

from django.apps import apps
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate a Mermaid ER diagram of the database schema."
    # Only the model registry is read, so URL/view checks are irrelevant here.
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument(
            "apps",
            nargs="*",
            default=["api"],
            help="App labels to include (default: api).",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Include every installed app (auth, admin, sessions, ...).",
        )
        parser.add_argument(
            "-o",
            "--output",
            help="Output file. '.md' wraps the diagram in a Markdown code block; "
            "any other extension gets raw Mermaid.",
        )

    def handle(self, *args, **opts):
        if opts["all"]:
            models = list(apps.get_models(include_auto_created=True))
        else:
            models = [
                m
                for label in opts["apps"]
                for m in apps.get_app_config(label).get_models(
                    include_auto_created=True
                )
            ]

        # Tables referenced by a FK but outside the selected apps (e.g. auth_user)
        # are still drawn, so that no relation points into the void.
        selected = set(models)
        for model in list(models):
            for field in model._meta.local_fields:
                target = field.related_model
                if target and target not in selected:
                    selected.add(target)
                    models.append(target)

        entities, relations = [], []
        for model in models:
            entities.append(self._entity(model))
            relations.extend(self._relations(model))

        diagram = "\n".join(["erDiagram", *entities, "", *relations]) + "\n"

        if not opts["output"]:
            self.stdout.write(diagram)
            return

        path = Path(opts["output"])
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.suffix == ".md":
            diagram = (
                "# Database ER diagram\n\n"
                "Generated with `python manage.py generate_erd` - do not edit by hand.\n\n"
                f"```mermaid\n{diagram}```\n"
            )
        path.write_text(diagram, encoding="utf-8")
        self.stdout.write(
            self.style.SUCCESS(f"ER diagram ({len(models)} tables) -> {path}")
        )

    def _entity(self, model):
        meta = model._meta
        unique_together = {
            name for group in meta.unique_together if len(group) == 1 for name in group
        }
        lines = [f"    {meta.db_table} {{"]
        for field in meta.local_fields:
            keys = []
            if field.primary_key:
                keys.append("PK")
            if field.related_model:
                keys.append("FK")
            if not field.primary_key and (field.unique or field.name in unique_together):
                keys.append("UK")
            parts = [field.get_internal_type(), field.column]
            if keys:
                parts.append(", ".join(keys))
            if field.null:
                parts.append('"nullable"')
            lines.append("        " + " ".join(parts))
        lines.append("    }")
        return "\n".join(lines)

    def _relations(self, model):
        meta = model._meta
        for field in meta.local_fields:
            target = field.related_model
            if not target:
                continue
            # parent side: exactly one, or zero-or-one when the FK is nullable
            parent = "|o" if field.null else "||"
            # child side: at most one for one-to-one / unique FK, otherwise many
            child = "o|" if field.unique else "o{"
            yield (
                f"    {target._meta.db_table} {parent}--{child} "
                f'{meta.db_table} : "{field.name}"'
            )
