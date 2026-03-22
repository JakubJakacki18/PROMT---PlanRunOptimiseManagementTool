import pytest
from django.contrib.auth import get_user_model

from api.models import Task

User = get_user_model()

@pytest.mark.parametrize("count", [0, 1, 2])
@pytest.mark.django_db
def test_assign_users_to_task_then_count_matches(count):
    task = Task.objects.create(title="Test")
    users = [
        User.objects.create_user(username=f"user{i}", password="pass")
        for i in range(count)
    ]
    for u in users:
        task.assignees.add(u)
    assert task.assignees.count() == count
