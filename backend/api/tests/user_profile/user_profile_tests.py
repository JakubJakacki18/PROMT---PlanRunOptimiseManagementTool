import pytest
from django.core.exceptions import ValidationError

from api.models.user_profile import UserProfile


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
def test_user_profile_user_when_profile_is_created_stores_passed_user_reference(user):
    profile = UserProfile.objects.create(user=user)

    assert profile.user == user


@pytest.mark.django_db
def test_user_profile_str_returns_username(user):
    assert str(user.profile) == user.username
