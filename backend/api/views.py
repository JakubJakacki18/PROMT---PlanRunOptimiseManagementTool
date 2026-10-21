from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.db.models import Q, Count, Prefetch
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import viewsets, permissions, status as http_status
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.permissions import IsAuthenticated
from . import access
from .models import (
    Funding,
    FundingTask,
    Project,
    ProjectFunding,
    Task,
    TaskAssignment,
    UserProfile,
)
from .serializers import (
    FundingSerializer,
    FundingTaskSerializer,
    ProjectSerializer,
    ProjectFundingSerializer,
    TaskSerializer,
    TaskAssignmentSerializer,
    UserSerializer,
    UserDetailSerializer,
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
)
from django_filters.rest_framework import DjangoFilterBackend

from django.contrib.auth import get_user_model

User = get_user_model()

# ─────────────────────────────
# Health + Me
# ─────────────────────────────


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    user = request.user
    organization = access.primary_organization(user)
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_staff": user.is_staff,
            "role": access.legacy_role(user),
            "organization": organization.pk if organization else None,
            "permissions": sorted(
                access.permissions_for(user, organization=organization)
            ) if organization else [],
        }
    )


# ─────────────────────────────
# Auth (sesje + CSRF)
# ─────────────────────────────


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def auth_csrf(request):
    return Response({"detail": "CSRF cookie set"})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@csrf_protect
def auth_login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"detail": "Username and password required"}, status=400)

    user = authenticate(request, username=username, password=password)
    if not user:
        return Response({"detail": "Invalid credentials"}, status=400)

    login(request, user)
    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
        },
        status=200,
    )


auth_login.throttle_classes = [ScopedRateThrottle]
auth_login.throttle_scope = "auth_login"


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@csrf_protect
def auth_logout(request):
    logout(request)
    return Response(status=204)


# ─────────────────────────────
# Skrótowa perm-class
# ─────────────────────────────
class IsAuthenticated(permissions.IsAuthenticated):
    pass


class CanManageMembers(permissions.BasePermission):
    """
    Zarządzanie użytkownikami: uprawnienie org.members.manage w organizacji użytkownika.
    Co dokładnie wolno zmienić (np. bez eskalacji ról), pilnuje api.access.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        organization = access.primary_organization(user)
        return organization is not None and access.can(
            user, "org.members.manage", organization
        )


# ─────────────────────────────
# ViewSety
# ─────────────────────────────


class FundingViewSet(viewsets.ModelViewSet):
    queryset = Funding.objects.all().order_by("-created_at")
    serializer_class = FundingSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "funder", "program", "agreement_number", "description"]
    ordering_fields = ["created_at", "start_date", "end_date", "amount_total", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()

        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(funding_projects__project_id=project_id).distinct()

        return qs

    def perform_create(self, serializer):
        serializer.save(organization=access.primary_organization(self.request.user))


class FundingTaskViewSet(viewsets.ModelViewSet):
    queryset = FundingTask.objects.select_related("funding", "default_status").all().order_by("id")
    serializer_class = FundingTaskSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "description", "funding__name"]
    ordering_fields = ["id", "default_priority", "default_status", "default_due_days"]
    ordering = ["id"]

    def get_queryset(self):
        qs = super().get_queryset()
        funding_id = self.request.query_params.get("funding")
        if funding_id:
            qs = qs.filter(funding_id=funding_id)
        return qs


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by("-created_at")
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "description", "owner__username"]
    ordering_fields = ["created_at", "start_date", "end_date", "name", "status"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        user = self.request.user
        provided_owner = serializer.validated_data.get("owner")

        if provided_owner is not None:
            owner = provided_owner
        else:
            owner = user if getattr(user, "is_authenticated", False) else None

        project = serializer.save(
            owner=owner, organization=access.primary_organization(user)
        )
        if getattr(user, "is_authenticated", False):
            access.grant_project_creator(project, user)


class ProjectFundingViewSet(viewsets.ModelViewSet):
    queryset = (
        ProjectFunding.objects.select_related("project", "funding")
        .all()
        .order_by("-created_at")
    )
    serializer_class = ProjectFundingSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["project__name", "funding__name", "note"]
    ordering_fields = ["created_at", "allocation_start", "allocation_end", "is_primary"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get("project")
        funding_id = self.request.query_params.get("funding")
        if project_id:
            qs = qs.filter(project_id=project_id)
        if funding_id:
            qs = qs.filter(funding_id=funding_id)
        return qs


class TaskViewSet(viewsets.ModelViewSet):
    queryset = (
        Task.objects.all()
        .order_by("-created_at")
        .select_related("template", "status")
        .prefetch_related(
            Prefetch(
                "assignees",
                queryset=User.objects.annotate(org_role=access.legacy_role_annotation()),
            ),
            "scope__project",
            "scope__funding",
            "scope__project_funding",
        )
    )
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["title", "description"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "due_date",
        "priority",
        "status",
        "title",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get("project")
        funding_id = self.request.query_params.get("funding")
        project_funding_id = self.request.query_params.get("project_funding")
        unassigned = self.request.query_params.get("unassigned")
        funding_scoped = self.request.query_params.get("funding_scoped")
        status_ = self.request.query_params.get("status")

        if project_id:
            qs = qs.filter(
                Q(scope__project_id=project_id)
                | Q(scope__project_funding__project_id=project_id)
            )
        if funding_id:
            qs = qs.filter(
                Q(scope__funding_id=funding_id)
                | Q(scope__project_funding__funding_id=funding_id)
            )
        if project_funding_id:
            qs = qs.filter(scope__project_funding_id=project_funding_id)
        if unassigned in ("1", "true", "True"):
            qs = qs.filter(scope__isnull=True)
        if funding_scoped in ("1", "true", "True"):
            qs = qs.filter(scope__funding_scoped=True)
        if funding_scoped in ("0", "false", "False"):
            qs = qs.filter(scope__funding_scoped=False)
        if status_:
            qs = qs.filter(status__code=status_)
        return qs


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.select_related(
        "task",
        "user",
        "assigned_by",
    )
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["task", "user"]


class UserViewSet(viewsets.ModelViewSet):
    """
    Pełny CRUD użytkowników.
    LIST / RETRIEVE — każdy zalogowany.
    CREATE / UPDATE / DELETE — tylko admin lub PM.
    """

    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [CanManageMembers()]

    def get_queryset(self):
        qs = (
            User.objects.all()
            .select_related("profile")
            .annotate(
                org_role=access.legacy_role_annotation(),
                tasks_count=Count("tasks", distinct=True),
                done_tasks_count=Count(
                    "tasks",
                    filter=Q(tasks__status__category="done"),
                    distinct=True,
                ),
            )
            .order_by("id")
        )
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return AdminUserCreateSerializer
        if self.action in ("update", "partial_update"):
            return AdminUserUpdateSerializer
        if self.action == "retrieve":
            return UserDetailSerializer
        return UserSerializer

    def perform_destroy(self, instance):
        if instance == self.request.user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Nie możesz usunąć samego siebie.")
        instance.delete()
