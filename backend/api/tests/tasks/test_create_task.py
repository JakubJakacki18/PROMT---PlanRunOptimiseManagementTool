from datetime import date

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from api.models import Task


@pytest.mark.parametrize(
    "title",
    [
        "Tb1",
        "a" * 200,
    ],
)
@pytest.mark.django_db
def test_create_task_when_title_is_given_then_is_created(title):
    Task.objects.create(title=title)
    assert Task.objects.count() is 1


@pytest.mark.parametrize(
    "title",
    [
        "",
        "ab",
        "a" * 201,
    ],
)
@pytest.mark.django_db
def test_create_task_when_invalid_title_is_given_then_exception_is_raised(title):
    task = Task(title=title)
    with pytest.raises(ValidationError):
        task.full_clean()
        task.save()


@pytest.mark.parametrize(
    "start_date,end_date",
    [
        (None, None),
        (date(2025, 1, 1), None),
        (None, date(2025, 1, 10)),
        (date(2025, 1, 1), date(2025, 1, 10)),
        (date(2025, 1, 1), date(2025, 1, 1)),
    ],
)
@pytest.mark.django_db
def test_create_task_when_valid_dates_are_given_then_is_created(start_date, end_date):
    Task.objects.create(
        title="Test",
        start_date=start_date,
        due_date=end_date,
    )
    assert Task.objects.count() == 1


@pytest.mark.parametrize(
    "start_date,end_date",
    [
        (date(2025, 1, 2), date(2025, 1, 1)),
    ],
)
@pytest.mark.django_db
def test_create_task_when_invalid_dates_are_given_then_exception_is_raised(
    start_date, end_date
):
    with pytest.raises(IntegrityError):
        Task.objects.create(
            title="Test",
            start_date=start_date,
            due_date=end_date,
        )


@pytest.mark.parametrize("priority", [0, 4, None])
@pytest.mark.django_db
def test_create_task_when_invalid_priority_is_given_then_exception_is_raised(priority):
    task = Task(title="Test", priority=priority)
    with pytest.raises(ValidationError):
        task.full_clean()
        task.save()


@pytest.mark.parametrize("status", ["", "test", None])
@pytest.mark.django_db
def test_create_task_when_invalid_status_is_given_then_exception_is_raised(status):
    task = Task(title="Test", status=status)
    with pytest.raises(ValidationError):
        task.full_clean()
        task.save()


@pytest.mark.parametrize(
    "cost_amount,cost_currency",
    [(12, "USD"), (12.23, "GBP"), (0, "PLN"), (9999999999.99, "GBP")],
)
@pytest.mark.django_db
def test_create_task_when_valid_costs_variables_are_given_then_is_created(
    cost_amount, cost_currency
):
    Task.objects.create(
        title="Test", cost_amount=cost_amount, cost_currency=cost_currency
    )
    assert Task.objects.count() == 1


@pytest.mark.parametrize(
    "cost_amount,cost_currency",
    [
        (-1, "USD"),
        (1223543454.35, None),
        (12.235, "PLN"),
        (233230, "PL"),
        (10000000000, "PLN"),
    ],
)
@pytest.mark.django_db
def test_create_task_when_invalid_costs_variables_are_given_then_exception_is_raised(
    cost_amount, cost_currency
):
    task = Task(title="Test", cost_amount=cost_amount, cost_currency=cost_currency)
    with pytest.raises(ValidationError):
        task.full_clean()
        task.save()


@pytest.mark.parametrize("est_hours", [-1, 1.222, 10000])
@pytest.mark.django_db
def test_create_task_when_invalid_est_hours_is_given_then_exception_is_raised(
    est_hours,
):
    task = Task(title="Test", est_hours=est_hours)
    with pytest.raises(ValidationError):
        task.full_clean()
        task.save()


@pytest.mark.parametrize(
    "url",
    [
        "not-a-url",
        "www.example.com",
        "ftp://example.com",
        "http//missing-colon.pl",
        "https:/one-slash.com",
        "example.com",
    ],
)
@pytest.mark.django_db
def test_create_task_when_invalid_url_is_given_then_exception_is_raised(url):
    task = Task(title="Test", receipt_url=url)
    with pytest.raises(ValidationError):
        task.full_clean()
        task.save()
