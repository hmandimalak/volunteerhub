from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Announcement,
    Application,
    Attendance,
    Availability,
    Badge,
    Certificate,
    Event,
    EventCategory,
    EventImage,
    Evaluation,
    Level,
    Message,
    Mission,
    MissionSkill,
    Notification,
    Organisation,
    OrganisationDocument,
    PointsHistory,
    Report,
    Skill,
    User,
    Volunteer,
    VolunteerBadge,
    VolunteerSkill,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "username", "role", "status", "is_staff")
    list_filter = ("role", "status", "is_staff")
    fieldsets = UserAdmin.fieldsets + (("VolunteerHub", {"fields": ("role", "status", "last_login_at")}),)


admin.site.register(Level)
admin.site.register(Organisation)
admin.site.register(OrganisationDocument)
admin.site.register(Volunteer)
admin.site.register(Skill)
admin.site.register(VolunteerSkill)
admin.site.register(Availability)
admin.site.register(EventCategory)
admin.site.register(Event)
admin.site.register(EventImage)
admin.site.register(Mission)
admin.site.register(MissionSkill)
admin.site.register(Application)
admin.site.register(Attendance)
admin.site.register(Evaluation)
admin.site.register(Badge)
admin.site.register(VolunteerBadge)
admin.site.register(Certificate)
admin.site.register(Notification)
admin.site.register(Message)
admin.site.register(Announcement)
admin.site.register(Report)
admin.site.register(PointsHistory)
