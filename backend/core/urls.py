from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnnouncementViewSet,
    ApplicationViewSet,
    AvailabilityViewSet,
    BadgeViewSet,
    CertificateViewSet,
    EventCategoryViewSet,
    EventViewSet,
    EvaluationViewSet,
    MessageViewSet,
    MissionSkillViewSet,
    MissionViewSet,
    NotificationViewSet,
    OrganisationViewSet,
    RegisterViewSet,
    ReportViewSet,
    SkillViewSet,
    UserViewSet,
    VolunteerSkillViewSet,
    VolunteerViewSet,
    admin_stats,
    organisation_stats,
    volunteer_stats,
    mission_recommendations,
    scan_attendance_qr,
)

router = DefaultRouter()
router.register("auth/register", RegisterViewSet, basename="register")
router.register("users", UserViewSet, basename="users")
router.register("organisations", OrganisationViewSet, basename="organisations")
router.register("benevoles", VolunteerViewSet, basename="benevoles")
router.register("competences", SkillViewSet, basename="competences")
router.register("users/me/competences", VolunteerSkillViewSet, basename="my-competences")
router.register("users/me/disponibilites", AvailabilityViewSet, basename="my-disponibilites")
router.register("categories-evenements", EventCategoryViewSet, basename="categories-evenements")
router.register("evenements", EventViewSet, basename="evenements")
router.register("missions", MissionViewSet, basename="missions")
router.register("mission-competences", MissionSkillViewSet, basename="mission-competences")
router.register("candidatures", ApplicationViewSet, basename="candidatures")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("messages", MessageViewSet, basename="messages")
router.register("annonces", AnnouncementViewSet, basename="annonces")
router.register("signalements", ReportViewSet, basename="signalements")
router.register("badges", BadgeViewSet, basename="badges")
router.register("users/me/certificats", CertificateViewSet, basename="my-certificats")
router.register("evaluations", EvaluationViewSet, basename="evaluations")

urlpatterns = [
    path("", include(router.urls)),
    path("stats/admin/overview/", admin_stats, name="admin-stats"),
    path("stats/organisation/<int:pk>/overview/", organisation_stats, name="organisation-stats"),
    path("stats/benevole/me/", volunteer_stats, name="volunteer-stats"),
    path("attendance/scan/", scan_attendance_qr, name="attendance-scan"),
    path("recommendations/missions/", mission_recommendations, name="mission-recommendations"),
]
