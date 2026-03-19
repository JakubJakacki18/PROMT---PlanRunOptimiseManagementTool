import random
from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from faker import Faker

from api.models import (
    UserProfile,
    Funding,
    FundingTask,
    Project,
    ProjectFunding,
    Task,
    TaskScope,
    TaskAssignment,
)

User = get_user_model()
fake = Faker("pl_PL")


class Command(BaseCommand):
    help = "Seed database with rich demo data for testing"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true")
        parser.add_argument("--users", type=int, default=15)
        parser.add_argument("--projects", type=int, default=10)
        parser.add_argument("--fundings", type=int, default=10)
        parser.add_argument("--tasks-per-project-min", type=int, default=30)
        parser.add_argument("--tasks-per-project-max", type=int, default=40)
        parser.add_argument("--funding-templates-per-funding", type=int, default=8)
        parser.add_argument("--unbound-tasks", type=int, default=40)
        parser.add_argument("--max-assignments-per-task", type=int, default=3)

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self.reset_demo_data()

        users = self.seed_users(options["users"])
        fundings = self.seed_fundings(options["fundings"])
        self.seed_funding_templates(
            fundings,
            options["funding_templates_per_funding"],
        )

        projects = self.seed_projects(users, options["projects"])
        project_fundings = self.seed_project_fundings(projects, fundings)

        self.seed_project_tasks(
            projects,
            options["tasks_per_project_min"],
            options["tasks_per_project_max"],
        )
        self.seed_direct_funding_tasks(fundings)
        self.seed_unbound_tasks(options["unbound_tasks"])
        self.seed_assignments(users, options["max_assignments_per_task"])

        self.stdout.write(self.style.SUCCESS("Seed completed successfully."))
        self.print_summary(project_fundings)

    def reset_demo_data(self):
        """
        Czyści dane demo tworzone przez ten seed.
        Nie usuwa wszystkich userów w systemie, tylko tych z prefiksem demo_.
        """
        TaskAssignment.objects.all().delete()
        TaskScope.objects.all().delete()
        Task.objects.all().delete()
        ProjectFunding.objects.all().delete()
        FundingTask.objects.all().delete()
        Project.objects.all().delete()
        Funding.objects.all().delete()

        demo_users = User.objects.filter(username__startswith="demo_")
        UserProfile.objects.filter(user__in=demo_users).delete()
        demo_users.delete()

        self.stdout.write(self.style.WARNING("Demo data reset done."))

    def seed_users(self, count):
        roles = ["admin", "pm", "member", "viewer"]
        users = []

        for i in range(count):
            username = f"demo_{i+1}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@example.com",
                    "first_name": fake.first_name(),
                    "last_name": fake.last_name(),
                    "is_staff": i < 2,
                },
            )

            if created or not user.check_password("demo1234"):
                user.set_password("demo1234")
                user.save()

            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "role": roles[i] if i < len(roles) else random.choice(roles[1:]),
                    "phone": fake.phone_number()[:20],
                    "avatar_url": "",
                },
            )

            users.append(user)

        return users

    def seed_fundings(self, count):
        fundings = []
        today = timezone.now().date()

        funding_categories = [
            ("grant", "Grant UE"),
            ("internal", "Budżet wewnętrzny"),
            ("sponsorship", "Sponsor branżowy"),
            ("donation", "Darowizna fundacyjna"),
        ]

        for i in range(count):
            funding_type, funding_label = random.choice(funding_categories)

            start_date = today - timedelta(days=random.randint(0, 180))
            end_date = start_date + timedelta(days=random.randint(60, 365))

            funding, _ = Funding.objects.get_or_create(
                name=f"{funding_label} {i+1} - {fake.company()}",
                defaults={
                    "type": funding_type,
                    "funder": fake.company(),
                    "program": fake.catch_phrase(),
                    "agreement_number": f"AGR/{today.year}/{i+1:03d}",
                    "amount_total": Decimal(str(random.randint(15000, 500000))),
                    "currency": "PLN",
                    "start_date": start_date,
                    "end_date": end_date,
                    "reporting_deadline": end_date - timedelta(days=random.randint(5, 30)),
                    "description": fake.text(max_nb_chars=220),
                },
            )
            fundings.append(funding)

        return fundings

    def seed_funding_templates(self, fundings, templates_per_funding):
        template_titles = [
            "Analiza wymagań formalnych",
            "Przygotowanie dokumentacji",
            "Raport okresowy",
            "Raport końcowy",
            "Spotkanie z interesariuszami",
            "Kontrola budżetu",
            "Przegląd ryzyk",
            "Odbiór etapu",
            "Rozliczenie kosztów",
            "Aktualizacja harmonogramu",
            "Przygotowanie prezentacji",
            "Weryfikacja postępu",
        ]

        for funding in fundings:
            for i in range(templates_per_funding):
                title = f"{random.choice(template_titles)} [{i+1}]"

                FundingTask.objects.get_or_create(
                    funding=funding,
                    title=title,
                    defaults={
                        "description": fake.text(max_nb_chars=180),
                        "default_status": random.choice(["todo", "doing", "done"]),
                        "default_priority": random.choice([1, 2, 3]),
                        "default_est_hours": Decimal(str(random.choice([2, 4, 6, 8, 12, 16, 24]))),
                        "default_due_days": random.randint(3, 60),
                        "mandatory": random.choice([True, False, True]),
                    },
                )

    def seed_projects(self, users, count):
        projects = []
        today = timezone.now().date()

        project_types = [
            "Platforma e-commerce",
            "Kampania marketingowa",
            "Rebranding firmy",
            "Organizacja konferencji",
            "Wdrożenie CRM",
            "Aplikacja mobilna",
            "Portal edukacyjny",
            "Modernizacja strony www",
            "Program lojalnościowy",
            "Cykl webinarów",
            "Produkcja materiałów video",
            "Automatyzacja procesów",
            "Badanie rynku",
            "Projekt społeczny",
            "Wdrożenie helpdesku",
        ]

        statuses = ["new", "active", "closed"]

        for i in range(count):
            start_date = today - timedelta(days=random.randint(0, 120))
            end_date = start_date + timedelta(days=random.randint(45, 300))

            project, _ = Project.objects.get_or_create(
                name=f"Projekt {i+1} - {random.choice(project_types)}",
                defaults={
                    "description": fake.text(max_nb_chars=260),
                    "status": random.choices(statuses, weights=[2, 6, 2], k=1)[0],
                    "owner": random.choice(users),
                    "start_date": start_date,
                    "end_date": end_date,
                },
            )
            projects.append(project)

        return projects

    def seed_project_fundings(self, projects, fundings):
        """
        Łączy projekty z finansowaniami.
        Po utworzeniu ProjectFunding uruchomi się sygnał i doda taski template'owe.
        """
        created_links = []

        for project in projects:
            link_count = random.randint(1, min(3, len(fundings)))
            selected_fundings = random.sample(fundings, k=link_count)

            for idx, funding in enumerate(selected_fundings):
                allocation_start = project.start_date or funding.start_date
                allocation_end_candidates = [
                    d for d in [project.end_date, funding.end_date] if d is not None
                ]
                allocation_end = min(allocation_end_candidates) if allocation_end_candidates else None

                pf, _ = ProjectFunding.objects.get_or_create(
                    project=project,
                    funding=funding,
                    defaults={
                        "allocation_start": allocation_start,
                        "allocation_end": allocation_end,
                        "is_primary": idx == 0,
                        "note": fake.sentence(nb_words=8),
                    },
                )
                created_links.append(pf)

        return created_links

    def seed_project_tasks(self, projects, tasks_per_project_min, tasks_per_project_max):
        task_titles = [
            "Przygotowanie backlogu",
            "Spotkanie kickoff",
            "Analiza wymagań",
            "Makiety i koncepcja",
            "Przygotowanie strategii",
            "Tworzenie harmonogramu",
            "Implementacja modułu",
            "Przygotowanie kampanii",
            "Weryfikacja budżetu",
            "Testy akceptacyjne",
            "Aktualizacja raportu",
            "Analiza ryzyk",
            "Przegląd jakości",
            "Odbiór etapu",
            "Przygotowanie demo",
            "Retrospektywa",
            "Publikacja materiałów",
            "Koordynacja zespołu",
            "Wdrożenie poprawki",
            "Przygotowanie prezentacji",
        ]

        today = timezone.now().date()

        for project in projects:
            total = random.randint(tasks_per_project_min, tasks_per_project_max)

            for i in range(total):
                task_kind = random.choices(
                    ["project", "project", "project", "unbound"],
                    weights=[5, 5, 5, 2],
                    k=1,
                )[0]

                status = random.choices(
                    ["todo", "doing", "done"],
                    weights=[4, 3, 3],
                    k=1,
                )[0]

                priority = random.choices([1, 2, 3], weights=[3, 5, 2], k=1)[0]
                est_hours = Decimal(str(random.choice([1, 2, 4, 6, 8, 12, 16, 24, 40, 80])))

                # różne osadzenie w czasie:
                # część zadań historyczna, część bieżąca, część przyszła
                start_offset = random.randint(-90, 120)
                start_date = today + timedelta(days=start_offset)

                # część zadań krótkich, część długich
                duration_days = random.choice([1, 2, 3, 5, 7, 14, 21, 30, 45, 60, 90])
                due_date = start_date + timedelta(days=duration_days)

                # część zadań ma być przeterminowana
                if status in ["todo", "doing"] and random.random() < 0.25:
                    due_date = today - timedelta(days=random.randint(1, 20))
                    start_date = due_date - timedelta(days=random.randint(2, 30))

                # done częściej w przeszłości
                if status == "done":
                    due_date = today - timedelta(days=random.randint(1, 60))
                    start_date = due_date - timedelta(days=random.randint(1, 40))

                task = Task.objects.create(
                    title=f"{random.choice(task_titles)} #{i+1} / {project.name}",
                    description=fake.text(max_nb_chars=240),
                    status=status,
                    priority=priority,
                    start_date=start_date,
                    due_date=due_date,
                    cost_amount=Decimal(str(random.choice([0, 50, 100, 250, 500, 1000, 2000, 5000]))),
                    cost_currency="PLN",
                    receipt_url="",
                    receipt_note=fake.sentence(nb_words=8) if random.choice([True, False]) else "",
                    est_hours=est_hours,
                )

                if task_kind == "project":
                    TaskScope.objects.create(
                        task=task,
                        project=project,
                        funding_scoped=False,
                    )
                # jeśli "unbound" -> zostawiamy task bez TaskScope

    def seed_direct_funding_tasks(self, fundings):
        """
        Ręczne taski przypięte bezpośrednio do Funding.
        To nie są taski z automatycznego sygnału ProjectFunding.
        """
        today = timezone.now().date()

        funding_task_titles = [
            "Przegląd zgodności formalnej",
            "Sprawdzenie kwalifikowalności kosztów",
            "Aktualizacja dokumentacji grantowej",
            "Kontakt z instytucją finansującą",
            "Przygotowanie załączników",
            "Rozliczenie transzy",
            "Raport wydatków",
            "Analiza harmonogramu finansowania",
        ]

        for funding in fundings:
            how_many = random.randint(8, 18)

            for i in range(how_many):
                status = random.choice(["todo", "doing", "done"])
                start_offset = random.randint(-60, 60)
                start_date = today + timedelta(days=start_offset)
                duration_days = random.choice([2, 5, 7, 10, 14, 21, 30])
                due_date = start_date + timedelta(days=duration_days)

                if status in ["todo", "doing"] and random.random() < 0.20:
                    due_date = today - timedelta(days=random.randint(1, 15))
                    start_date = due_date - timedelta(days=random.randint(2, 20))

                if status == "done":
                    due_date = today - timedelta(days=random.randint(1, 45))
                    start_date = due_date - timedelta(days=random.randint(1, 30))

                task = Task.objects.create(
                    title=f"{random.choice(funding_task_titles)} #{i+1} / {funding.name}",
                    description=fake.text(max_nb_chars=200),
                    status=status,
                    priority=random.choice([1, 2, 3]),
                    start_date=start_date,
                    due_date=due_date,
                    cost_amount=Decimal(str(random.choice([0, 100, 300, 700, 1200]))),
                    cost_currency="PLN",
                    receipt_url="",
                    receipt_note="",
                    est_hours=Decimal(str(random.choice([2, 4, 6, 8, 12, 16]))),
                )

                TaskScope.objects.create(
                    task=task,
                    funding=funding,
                    funding_scoped=False,
                )

    def seed_unbound_tasks(self, count):
        """
        Taski bez żadnego scope.
        To ważne, bo w Twoim modelu brak TaskScope jest legalny i oznacza task nieprzypisany.
        """
        today = timezone.now().date()
        titles = [
            "Ogólna analiza",
            "Luźne zadanie operacyjne",
            "Zadanie do doprecyzowania",
            "Pomysł do rozpisania",
            "Wstępny research",
            "Niezależny follow-up",
            "Notatka robocza do rozwinięcia",
            "Task do późniejszego przypisania",
        ]

        for i in range(count):
            status = random.choice(["todo", "doing", "done"])
            start_offset = random.randint(-45, 90)
            start_date = today + timedelta(days=start_offset)
            due_date = start_date + timedelta(days=random.choice([1, 3, 7, 14, 21, 30]))

            if status in ["todo", "doing"] and random.random() < 0.30:
                due_date = today - timedelta(days=random.randint(1, 12))
                start_date = due_date - timedelta(days=random.randint(1, 14))

            if status == "done":
                due_date = today - timedelta(days=random.randint(1, 30))
                start_date = due_date - timedelta(days=random.randint(1, 20))

            Task.objects.create(
                title=f"{random.choice(titles)} #{i+1}",
                description=fake.text(max_nb_chars=180),
                status=status,
                priority=random.choice([1, 2, 3]),
                start_date=start_date,
                due_date=due_date,
                cost_amount=Decimal(str(random.choice([0, 0, 50, 100, 200]))),
                cost_currency="PLN",
                receipt_url="",
                receipt_note="",
                est_hours=Decimal(str(random.choice([1, 2, 4, 8, 16]))),
            )

    def seed_assignments(self, users, max_assignments_per_task):
        tasks = list(Task.objects.all().order_by("id"))
        if not tasks or not users:
            return

        assigners = users[: max(1, min(3, len(users)))]
        workers = users

        for task in tasks:
            assignment_count = random.randint(0, min(max_assignments_per_task, len(workers)))
            if assignment_count == 0:
                continue

            selected_users = random.sample(workers, k=assignment_count)

            for user in selected_users:
                started_at = None
                finished_at = None

                if task.status in ["doing", "done"]:
                    started_at = timezone.now() - timedelta(days=random.randint(1, 30))

                if task.status == "done":
                    finished_at = started_at + timedelta(days=random.randint(1, 10))

                TaskAssignment.objects.get_or_create(
                    task=task,
                    user=user,
                    defaults={
                        "assigned_by": random.choice(assigners),
                        "started_at": started_at,
                        "finished_at": finished_at,
                        "worked_hours": Decimal(str(random.choice([0.5, 1, 2, 3.5, 5, 8, 13, 21]))),
                    },
                )

    def print_summary(self, project_fundings):
        self.stdout.write("")
        self.stdout.write("=== SUMMARY ===")
        self.stdout.write(f"Users: {User.objects.count()}")
        self.stdout.write(f"Profiles: {UserProfile.objects.count()}")
        self.stdout.write(f"Projects: {Project.objects.count()}")
        self.stdout.write(f"Fundings: {Funding.objects.count()}")
        self.stdout.write(f"Funding templates: {FundingTask.objects.count()}")
        self.stdout.write(f"ProjectFunding links: {len(project_fundings)}")
        self.stdout.write(f"Tasks: {Task.objects.count()}")
        self.stdout.write(f"Scopes: {TaskScope.objects.count()}")
        self.stdout.write(f"Assignments: {TaskAssignment.objects.count()}")
        self.stdout.write("")
        self.stdout.write("Demo login: test_1 / test1234")