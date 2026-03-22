"""Unit tests for Project-related viewset logic (mocked, no HTTP)."""

from unittest.mock import MagicMock

from django.test import TestCase, RequestFactory
from rest_framework.request import Request

from api.views import ProjectViewSet, ProjectFundingViewSet


class ProjectViewSetPerformCreateTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.view = ProjectViewSet()

    def _make_request(self, user):
        request = self.factory.post("/fake/")
        request.user = user
        self.view.request = request
        self.view.format_kwarg = None
        return request

    def test_auto_assigns_authenticated_user_as_owner(self):
        user = MagicMock()
        user.is_authenticated = True
        self._make_request(user)

        serializer = MagicMock()
        serializer.validated_data = {}

        self.view.perform_create(serializer)

        serializer.save.assert_called_once_with(owner=user)


class ProjectFundingViewSetGetQuerysetTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.view = ProjectFundingViewSet()

    def _setup_view(self, query_params=None):
        django_request = self.factory.get("/fake/", data=query_params or {})
        django_request.user = MagicMock(is_authenticated=True)
        drf_request = Request(django_request)
        self.view.request = drf_request
        self.view.format_kwarg = None
        self.view.kwargs = {}
        return drf_request

    def test_filter_by_project_id(self):
        self._setup_view({"project": "5"})

        param = self.view.request.query_params.get("project")
        self.assertEqual(param, "5")
