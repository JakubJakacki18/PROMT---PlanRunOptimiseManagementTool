import pytest
from django.core.exceptions import ValidationError
from datetime import date

# Import modeli
from api.models.funding import Funding, ProjectFunding, FundingTask
from api.models.project import Project  

class MockProject:
    pass

class TestFundingModel:

    # 1. Test sprawdzający poprawność metody __str__ w modelu Funding
    @pytest.mark.django_db
    def test_funding_str_with_valid_data_returns_formatted_string(self):
        funding = Funding.objects.create(name="Grant UE", type=Funding.Type.GRANT)
        assert str(funding) == "Grant UE (Grant)"

    # 2. Test sprawdzający walidację ujemnej kwoty
    def test_funding_amount_with_negative_value_raises_validation_error(self):
        funding = Funding(name="Test", amount_total=-100)
        validator = funding._meta.get_field('amount_total').validators[0]
        with pytest.raises(ValidationError):
            validator(-100)

    # 3. Test sprawdzający inicjalizację dat
    def test_funding_dates_with_start_date_after_end_date_has_correct_attributes(self):
        start = date(2024, 1, 10)
        end = date(2024, 1, 1)
        funding = Funding(name="Złe daty", start_date=start, end_date=end)
        assert funding.start_date > funding.end_date

    # 4. Test sprawdzający domyślną walutę
    def test_funding_currency_no_input_returns_default_pln(self):
        funding = Funding(name="Test")
        assert funding.currency == "PLN"

    # 5. Test sprawdzający poprawne działanie TextChoices dla typu
    def test_funding_type_with_internal_type_returns_internal_label(self):
        funding = Funding(type=Funding.Type.INTERNAL)
        assert funding.get_type_display() == "Wewnętrzne"

class TestProjectFundingModel:

    # 6. Test sprawdzający przypisanie 
    def test_project_funding_assignment_sets_proper_references(self):
        f = Funding(name="Fund")
        pf = ProjectFunding(funding=f)
        assert pf.funding.name == "Fund"

    # 7. Test sprawdzający relację w __str__ ProjectFunding
    def test_project_funding_str_with_relation_returns_joined_names(self):
        p = Project(name="Projekt X")
        f = Funding(name="Fundacja")
        pf = ProjectFunding(project=p, funding=f)
        assert str(pf) == "Projekt X ↔ Fundacja"

class TestFundingTaskModel:

    # 8. Test sprawdzający domyślny status zadania
    def test_funding_task_status_no_input_returns_todo(self):
        task = FundingTask(title="Task 1")
        assert task.default_status == FundingTask.DefaultStatus.TODO

    # 9. Test sprawdzający domyślny priorytet jako Integer
    def test_funding_task_priority_no_input_returns_medium_value(self):
        task = FundingTask(title="Task")
        assert task.default_priority == FundingTask.DefaultPriority.MEDIUM

    # 10. Test sprawdzający czy zadanie jest domyślnie obowiązkowe
    def test_funding_task_mandatory_no_input_returns_true(self):
        task = FundingTask(title="Task")
        assert task.mandatory is True