from django.contrib import admin
from .models import (
    Project,
    Funding,
    FundingTask,
    ProjectFunding,
    Task,
    TaskScope,
    TaskAssignment,
    UserProfile,
    Organization,
    Status,
    OrganizationMember,
    Permission,
    Role,
    RolePermission,
    Team,
    TeamMember,
    RoleAssignment,
    Milestone,
    Checklist,
    ChecklistItem,
    Notification,
    ActivityLog,
)


class TaskScopeInline(admin.StackedInline):

    model = TaskScope
    fk_name = "task"
    extra = 0
    can_delete = True
    autocomplete_fields = ["project", "funding", "project_funding"]


class FundingTaskInline(admin.TabularInline):

    model = FundingTask
    extra = 0
    autocomplete_fields = ["funding"]


class ProjectFundingInline(admin.TabularInline):

    model = ProjectFunding
    extra = 0
    autocomplete_fields = ["funding"]


class ProjectTaskScopeInline(admin.TabularInline):

    model = TaskScope
    fk_name = "project"
    extra = 1
    verbose_name = "Project task"
    verbose_name_plural = "Project tasks"

    fields = ("task", "funding_scoped")
    autocomplete_fields = ["task"]

    exclude = ("funding", "project_funding")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("task").filter(project__isnull=False)

    def get_formset(self, request, obj=None, **kwargs):
        FormSet = super().get_formset(request, obj, **kwargs)
        base_fields = FormSet.form.base_fields
        if "funding_scoped" in base_fields:
            base_fields["funding_scoped"].initial = False
            base_fields["funding_scoped"].disabled = True
        return FormSet


# ---------- Adminy głównych modeli ----------


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "status",
        "priority",
        "project",
        "funding",
        "project_funding",
        "funding_scoped",
        "due_date",
        "created_at",
    )
    search_fields = (
        "title",
        "description",
        "scope__project__name",
        "scope__funding__name",
        "scope__project_funding__project__name",
        "scope__project_funding__funding__name",
    )
    list_select_related = (
        "scope",
        "scope__project",
        "scope__funding",
        "scope__project_funding",
        "template",
    )
    list_filter = (
        "status",
        "priority",
        ("scope__project", admin.RelatedOnlyFieldListFilter),
        ("scope__funding", admin.RelatedOnlyFieldListFilter),
        ("scope__project_funding", admin.RelatedOnlyFieldListFilter),
        "scope__funding_scoped",
    )
    ordering = ("-created_at",)
    inlines = [TaskScopeInline]

    def project(self, obj):
        return getattr(getattr(obj, "scope", None), "project", None)

    project.short_description = "Project"
    project.admin_order_field = "scope__project"

    def funding(self, obj):
        return getattr(getattr(obj, "scope", None), "funding", None)

    funding.short_description = "Funding"
    funding.admin_order_field = "scope__funding"

    def project_funding(self, obj):
        return getattr(getattr(obj, "scope", None), "project_funding", None)

    project_funding.short_description = "ProjectFunding"
    project_funding.admin_order_field = "scope__project_funding"

    def funding_scoped(self, obj):
        scope = getattr(obj, "scope", None)
        return getattr(scope, "funding_scoped", False) if scope else False

    funding_scoped.boolean = True
    funding_scoped.short_description = "Grant copy?"
    funding_scoped.admin_order_field = "scope__funding_scoped"


@admin.register(TaskScope)
class TaskScopeAdmin(admin.ModelAdmin):
    list_display = (
        "task",
        "project",
        "funding",
        "project_funding",
        "funding_scoped",
        "created_at",
    )
    search_fields = (
        "task__title",
        "project__name",
        "funding__name",
        "project_funding__project__name",
        "project_funding__funding__name",
    )
    autocomplete_fields = ["task", "project", "funding", "project_funding"]
    list_filter = (
        ("project", admin.RelatedOnlyFieldListFilter),
        ("funding", admin.RelatedOnlyFieldListFilter),
        ("project_funding", admin.RelatedOnlyFieldListFilter),
        "funding_scoped",
    )
    ordering = ("-created_at",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "status",
        "owner",
        "start_date",
        "end_date",
        "created_at",
    )
    search_fields = ("name", "description", "owner__username")
    list_filter = ("status", ("owner", admin.RelatedOnlyFieldListFilter))
    ordering = ("-created_at",)
    inlines = [ProjectFundingInline]
    autocomplete_fields = ["owner"]


@admin.register(Funding)
class FundingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "program",
        "funder",
        "amount_total",
        "start_date",
        "end_date",
        "created_at",
    )
    search_fields = ("name", "program", "funder", "agreement_number", "description")
    list_filter = ("start_date", "end_date")
    ordering = ("-created_at",)
    inlines = [FundingTaskInline]


@admin.register(FundingTask)
class FundingTaskAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "funding",
        "title",
        "default_status",
        "default_priority",
        "default_due_days",
    )
    search_fields = ("title", "funding__name")
    list_filter = (
        ("funding", admin.RelatedOnlyFieldListFilter),
        "default_status",
        "default_priority",
    )
    autocomplete_fields = ["funding"]
    ordering = ("funding", "id")


@admin.register(ProjectFunding)
class ProjectFundingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "project",
        "funding",
        "is_primary",
        "allocation_start",
        "allocation_end",
        "created_at",
    )
    search_fields = ("project__name", "funding__name", "note")
    list_filter = (
        ("project", admin.RelatedOnlyFieldListFilter),
        ("funding", admin.RelatedOnlyFieldListFilter),
        "is_primary",
        "allocation_start",
        "allocation_end",
    )
    autocomplete_fields = ["project", "funding"]
    ordering = ("-created_at",)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone")
    search_fields = ("user__username",)


@admin.register(TaskAssignment)
class TaskAssignmentAdmin(admin.ModelAdmin):
    list_display = ("task", "user", "assigned_by", "assigned_at", "worked_hours")
    list_filter = ("assigned_by", "user")
    search_fields = (
        "task__title",
        "user__username",
        "user__first_name",
        "user__last_name",
    )


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "tax_id", "is_active", "created_at")
    search_fields = ("name", "slug", "tax_id")
    list_filter = ("is_active",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ("organization", "user", "is_active", "invited_by", "joined_at")
    list_filter = ("is_active", ("organization", admin.RelatedOnlyFieldListFilter))
    search_fields = ("organization__name", "user__username")


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("code", "scope", "description")
    list_filter = ("scope",)
    search_fields = ("code", "description")


class RolePermissionInline(admin.TabularInline):

    model = RolePermission
    extra = 0


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "scope", "organization")
    list_filter = ("scope", ("organization", admin.RelatedOnlyFieldListFilter))
    search_fields = ("code", "name")
    inlines = [RolePermissionInline]


class TeamMemberInline(admin.TabularInline):

    model = TeamMember
    fk_name = "team"
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "organization", "project", "parent", "created_at")
    search_fields = ("name",)
    inlines = [TeamMemberInline]


@admin.register(RoleAssignment)
class RoleAssignmentAdmin(admin.ModelAdmin):
    list_display = ("role", "user", "team", "organization", "project", "granted_by", "created_at")
    list_filter = ("role",)
    search_fields = ("user__username", "team__name")


@admin.register(Status)
class StatusAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "applies_to", "category", "position", "organization", "is_default")
    list_filter = ("applies_to", "category")
    ordering = ("applies_to", "position")


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "project", "status", "due_date")
    list_filter = ("status", ("project", admin.RelatedOnlyFieldListFilter))
    search_fields = ("name", "project__name")
    autocomplete_fields = ["project"]


class ChecklistItemInline(admin.TabularInline):

    model = ChecklistItem
    extra = 0


@admin.register(Checklist)
class ChecklistAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "task", "position", "created_at")
    search_fields = ("title", "task__title")
    autocomplete_fields = ["task"]
    inlines = [ChecklistItemInline]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "activity", "read_at")
    search_fields = ("recipient__username",)


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "content_type", "object_id", "organization", "project")
    list_filter = ("action", ("project", admin.RelatedOnlyFieldListFilter))
    search_fields = ("actor__username",)
