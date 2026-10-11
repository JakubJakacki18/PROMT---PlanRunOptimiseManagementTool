import pytest
from django.core.exceptions import ValidationError

from api.models.user_profile import UserProfile, UserRole


@pytest.mark.django_db
def test_user_profile_role_when_not_provided_sets_default_member(user):
    profile = UserProfile.objects.create(user=user)

    assert profile.role == UserRole.MEMBER


@pytest.mark.django_db
def test_user_profile_role_when_admin_provided_saves_admin_value(user):
    profile = UserProfile.objects.create(user=user, role=UserRole.ADMIN)

    assert profile.role == UserRole.ADMIN


@pytest.mark.django_db
def test_user_profile_role_when_pm_provided_saves_pm_value(user):
    profile = UserProfile.objects.create(user=user, role=UserRole.PM)

    assert profile.role == UserRole.PM


@pytest.mark.django_db
def test_user_profile_role_when_viewer_provided_saves_viewer_value(user):
    profile = UserProfile.objects.create(user=user, role=UserRole.VIEWER)

    assert profile.role == UserRole.VIEWER


@pytest.mark.django_db
def test_user_profile_phone_when_not_provided_allows_empty_value(user):
    profile = UserProfile.objects.create(user=user)

    assert profile.phone == ""


@pytest.mark.django_db
def test_user_profile_phone_when_empty_string_provided_keeps_value(user):
    profile = UserProfile(user=user, phone="")

    profile.full_clean()

    assert profile.phone == ""


@pytest.mark.django_db
def test_user_profile_phone_when_minimum_valid_length_provided_keeps_value(user):
    profile = UserProfile(user=user, phone="1234567")

    profile.full_clean()

    assert profile.phone == "1234567"


@pytest.mark.django_db
def test_user_profile_phone_when_valid_local_number_provided_keeps_value(user):
    profile = UserProfile(user=user, phone="123456789")

    profile.full_clean()

    assert profile.phone == "123456789"


@pytest.mark.django_db
def test_user_profile_phone_when_valid_international_number_provided_keeps_value(user):
    profile = UserProfile(user=user, phone="+48123456789")

    profile.full_clean()

    assert profile.phone == "+48123456789"


@pytest.mark.django_db
def test_user_profile_phone_when_valid_us_number_provided_keeps_value(user):
    profile = UserProfile(user=user, phone="+14155552671")

    profile.full_clean()

    assert profile.phone == "+14155552671"


@pytest.mark.django_db
def test_user_profile_phone_when_maximum_valid_length_provided_keeps_value(user):
    profile = UserProfile(user=user, phone="1" * 15)

    profile.full_clean()

    assert profile.phone == "1" * 15


@pytest.mark.django_db
def test_user_profile_phone_when_too_short_value_provided_raises_validation_error(user):
    profile = UserProfile(user=user, phone="888")

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_user_profile_phone_when_value_above_maximum_length_provided_raises_validation_error(user):
    profile = UserProfile(user=user, phone="1" * 16)

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_user_profile_phone_when_value_contains_letters_raises_validation_error(user):
    profile = UserProfile(user=user, phone="abc123456")

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_user_profile_phone_when_value_contains_spaces_raises_validation_error(user):
    profile = UserProfile(user=user, phone="123 456 789")

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_user_profile_phone_when_value_contains_dashes_raises_validation_error(user):
    profile = UserProfile(user=user, phone="123-456-789")

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_user_profile_avatar_url_when_not_provided_allows_empty_value(user):
    profile = UserProfile.objects.create(user=user)

    assert profile.avatar_url == ""


@pytest.mark.django_db
def test_user_profile_avatar_url_when_empty_string_provided_keeps_value(user):
    profile = UserProfile(user=user, avatar_url="")

    profile.full_clean()

    assert profile.avatar_url == ""


@pytest.mark.django_db
def test_user_profile_avatar_url_when_valid_https_url_provided_keeps_value(user):
    profile = UserProfile(
        user=user,
        avatar_url="https://example.com/avatar.png",
    )

    profile.full_clean()

    assert profile.avatar_url == "https://example.com/avatar.png"


@pytest.mark.django_db
def test_user_profile_avatar_url_when_valid_http_url_provided_keeps_value(user):
    profile = UserProfile(
        user=user,
        avatar_url="http://example.com/avatar.png",
    )

    profile.full_clean()

    assert profile.avatar_url == "http://example.com/avatar.png"


@pytest.mark.django_db
def test_user_profile_avatar_url_when_invalid_url_provided_raises_validation_error(user):
    profile = UserProfile(user=user, avatar_url="not-a-valid-url")

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_user_profile_role_when_invalid_choice_provided_raises_validation_error(user):
    profile = UserProfile(user=user, role="invalid-role")

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_user_profile_user_when_profile_is_created_stores_passed_user_reference(user):
    profile = UserProfile.objects.create(user=user)

    assert profile.user == user


@pytest.mark.django_db
def test_user_profile_str_when_role_is_member_returns_username_with_member_label(user):
    profile = UserProfile.objects.create(user=user, role=UserRole.MEMBER)

    assert str(profile) == f"{user.username} (Członek zespołu)"


@pytest.mark.django_db
def test_user_profile_str_when_role_is_admin_returns_username_with_admin_label(user):
    profile = UserProfile.objects.create(user=user, role=UserRole.ADMIN)

    assert str(profile) == f"{user.username} (Administrator)"


@pytest.mark.django_db
def test_user_profile_str_when_role_is_pm_returns_username_with_pm_label(user):
    profile = UserProfile.objects.create(user=user, role=UserRole.PM)

    assert str(profile) == f"{user.username} (Project Manager)"


@pytest.mark.django_db
def test_user_profile_str_when_role_is_viewer_returns_username_with_viewer_label(user):
    profile = UserProfile.objects.create(user=user, role=UserRole.VIEWER)

    assert str(profile) == f"{user.username} (Viewer)"