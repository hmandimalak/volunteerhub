from django.http import FileResponse, HttpResponse
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    Announcement,
    Application,
    Attendance,
    Availability,
    Badge,
    Certificate,
    Event,
    EventCategory,
    Evaluation,
    Message,
    Mission,
    MissionSkill,
    Notification,
    Organisation,
    OrganisationDocument,
    Report,
    Skill,
    User,
    Volunteer,
    VolunteerSkill,
)
from .permissions import (
    IsAdmin,
    IsOrganisation,
    IsVerifiedOrganisation,
    OrganisationOwnerOrAdmin,
    ReadOnlyOrAuthenticated,
)
from .serializers import (
    AnnouncementSerializer,
    ApplicationSerializer,
    AttendanceSerializer,
    AvailabilitySerializer,
    BadgeSerializer,
    CertificateSerializer,
    EventCategorySerializer,
    EventSerializer,
    EvaluationSerializer,
    MessageSerializer,
    MissionSerializer,
    MissionSkillSerializer,
    NotificationSerializer,
    OrganisationSerializer,
    RegisterSerializer,
    ReportSerializer,
    SkillSerializer,
    UserSerializer,
    VolunteerSerializer,
    VolunteerSkillSerializer,
)
from .services import (
    build_excel_workbook,
    build_organisation_report_pdf,
    ensure_attendance_qr,
    generate_qr_png,
    save_certificate,
    send_attendance_qr_email,
)


class RegisterViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-created_at")
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    @action(detail=False, methods=["get", "patch"], permission_classes=[IsAuthenticated])
    def me(self, request):
        if request.method == "PATCH":
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(self.get_serializer(request.user).data)

    @action(detail=True, methods=["patch"])
    def suspend(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.SUSPENDED
        user.save(update_fields=["status"])
        return Response(self.get_serializer(user).data)


class OrganisationViewSet(viewsets.ModelViewSet):
    queryset = Organisation.objects.select_related("user").all()
    serializer_class = OrganisationSerializer
    permission_classes = [ReadOnlyOrAuthenticated]

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [OrganisationOwnerOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "pending":
            return queryset.filter(
                validation_status__in=[
                    Organisation.ValidationStatus.PENDING,
                    Organisation.ValidationStatus.NEEDS_MORE_DOCUMENTS,
                ]
            )
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.ORGANISATION:
            raise PermissionDenied("Seuls les comptes organisation peuvent creer un profil organisation.")
        if hasattr(self.request.user, "organisation"):
            raise PermissionDenied("Cet utilisateur possede deja un profil organisation.")
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        organisation = getattr(request.user, "organisation", None)
        if not organisation:
            return Response({"detail": "Aucune organisation liee a cet utilisateur."}, status=404)
        return Response(self.get_serializer(organisation).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAdmin])
    def pending(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def _notify_organisation(self, organisation, notification_type, content):
        Notification.objects.create(
            user=organisation.user,
            type=notification_type,
            content=content,
        )

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="approve")
    def approve(self, request, pk=None):
        organisation = self.get_object()
        organisation.validation_status = Organisation.ValidationStatus.APPROVED
        organisation.reviewed_at = timezone.now()
        organisation.review_reason = request.data.get("reason", "")
        organisation.user.status = User.Status.ACTIVE
        organisation.user.save(update_fields=["status"])
        organisation.save(update_fields=["validation_status", "reviewed_at", "review_reason"])
        self._notify_organisation(
            organisation,
            "organisation_approved",
            "Votre organisation a ete approuvee. Vous pouvez maintenant gerer vos evenements et missions.",
        )
        return Response(self.get_serializer(organisation).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin])
    def validate(self, request, pk=None):
        return self.approve(request, pk)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        organisation = self.get_object()
        organisation.validation_status = Organisation.ValidationStatus.REJECTED
        organisation.reviewed_at = timezone.now()
        organisation.review_reason = request.data.get("reason", "Votre demande de verification a ete refusee.")
        organisation.user.status = User.Status.SUSPENDED
        organisation.user.save(update_fields=["status"])
        organisation.save(update_fields=["validation_status", "reviewed_at", "review_reason"])
        self._notify_organisation(
            organisation,
            "organisation_rejected",
            f"Votre organisation a ete refusee. Motif : {organisation.review_reason}",
        )
        return Response(self.get_serializer(organisation).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="request-documents")
    def request_documents(self, request, pk=None):
        organisation = self.get_object()
        organisation.validation_status = Organisation.ValidationStatus.NEEDS_MORE_DOCUMENTS
        organisation.reviewed_at = timezone.now()
        organisation.review_reason = request.data.get("reason", "Merci d'ajouter des documents officiels complementaires.")
        organisation.user.status = User.Status.PENDING
        organisation.user.save(update_fields=["status"])
        organisation.save(update_fields=["validation_status", "reviewed_at", "review_reason"])
        self._notify_organisation(
            organisation,
            "organisation_documents_requested",
            f"Documents complementaires demandes : {organisation.review_reason}",
        )
        return Response(self.get_serializer(organisation).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="documents")
    def upload_documents(self, request, pk=None):
        organisation = self.get_object()
        if request.user.role != User.Role.ADMIN and organisation.user_id != request.user.id:
            return Response({"detail": "Vous ne pouvez modifier que vos propres documents."}, status=403)
        files = request.FILES.getlist("documents")
        if not files:
            return Response({"detail": "Aucun document fourni."}, status=400)
        for index, document in enumerate(files, start=1):
            OrganisationDocument.objects.create(
                organisation=organisation,
                file=document,
                label=request.data.get("label", f"Document complementaire {index}"),
            )
        organisation.validation_status = Organisation.ValidationStatus.PENDING
        organisation.review_reason = ""
        organisation.save(update_fields=["validation_status", "review_reason"])
        for admin in (User.objects.filter(role=User.Role.ADMIN) | User.objects.filter(is_staff=True)).distinct():
            Notification.objects.create(
                user=admin,
                type="organisation_documents_uploaded",
                content=f"Documents complementaires recus pour : {organisation.name}",
            )
        return Response(self.get_serializer(organisation).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="suspend")
    def suspend(self, request, pk=None):
        organisation = self.get_object()
        organisation.user.status = User.Status.SUSPENDED
        organisation.user.save(update_fields=["status"])
        self._notify_organisation(
            organisation,
            "organisation_suspended",
            request.data.get("reason", "Votre organisation a ete suspendue par l'administrateur."),
        )
        return Response(self.get_serializer(organisation).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="reactivate")
    def reactivate(self, request, pk=None):
        organisation = self.get_object()
        if organisation.validation_status != Organisation.ValidationStatus.APPROVED:
            return Response({"detail": "Seules les organisations approuvees peuvent etre reactivees."}, status=400)
        organisation.user.status = User.Status.ACTIVE
        organisation.user.save(update_fields=["status"])
        self._notify_organisation(
            organisation,
            "organisation_reactivated",
            "Votre organisation a ete reactivee par l'administrateur.",
        )
        return Response(self.get_serializer(organisation).data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="volunteers")
    def volunteers(self, request, pk=None):
        organisation = self.get_object()
        if request.user.role == User.Role.ORGANISATION and organisation.user_id != request.user.id:
            return Response({"detail": "Vous ne pouvez consulter que vos propres benevoles."}, status=403)
        if request.user.role not in [User.Role.ADMIN, User.Role.ORGANISATION] and not request.user.is_staff:
            return Response({"detail": "Action reservee aux administrateurs et organisations."}, status=403)
        volunteers = Volunteer.objects.filter(
            applications__mission__event__organisation=organisation
        ).select_related("user", "level").prefetch_related("skills__skill").distinct()
        return Response(VolunteerSerializer(volunteers, many=True).data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="applications")
    def applications(self, request, pk=None):
        organisation = self.get_object()
        if request.user.role == User.Role.ORGANISATION and organisation.user_id != request.user.id:
            return Response({"detail": "Vous ne pouvez consulter que vos propres candidatures."}, status=403)
        if request.user.role not in [User.Role.ADMIN, User.Role.ORGANISATION] and not request.user.is_staff:
            return Response({"detail": "Action reservee aux administrateurs et organisations."}, status=403)
        applications = Application.objects.filter(
            mission__event__organisation=organisation
        ).select_related("volunteer", "mission").order_by("-applied_at")
        return Response(ApplicationSerializer(applications, many=True).data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="events")
    def events(self, request, pk=None):
        organisation = self.get_object()
        if request.user.role == User.Role.ORGANISATION and organisation.user_id != request.user.id:
            return Response({"detail": "Vous ne pouvez consulter que vos propres evenements."}, status=403)
        if request.user.role not in [User.Role.ADMIN, User.Role.ORGANISATION] and not request.user.is_staff:
            return Response({"detail": "Action reservee aux administrateurs et organisations."}, status=403)
        events = Event.objects.filter(organisation=organisation).select_related("organisation", "category").prefetch_related("missions")
        return Response(EventSerializer(events.order_by("-starts_at"), many=True).data)

    def _can_access_exports(self, request, organisation):
        return (
            request.user.role == User.Role.ADMIN
            or request.user.is_staff
            or request.user.is_superuser
            or (request.user.role == User.Role.ORGANISATION and organisation.user_id == request.user.id)
        )

    def _organisation_report_stats(self, organisation):
        events = Event.objects.filter(organisation=organisation)
        applications = Application.objects.filter(mission__event__organisation=organisation)
        attendances = Attendance.objects.filter(application__mission__event__organisation=organisation)
        accepted = applications.filter(status=Application.Status.ACCEPTED).count()
        attended = attendances.filter(status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED]).count()
        completed_hours = sum(
            max((item.application.mission.ends_at - item.application.mission.starts_at).total_seconds() / 3600, 0)
            for item in attendances.filter(status=Attendance.Status.COMPLETED).select_related("application__mission")
        )
        return {
            "Evenements": events.count(),
            "Benevoles uniques": Volunteer.objects.filter(applications__mission__event__organisation=organisation).distinct().count(),
            "Candidatures": applications.count(),
            "Candidatures acceptees": accepted,
            "Presences validees": attended,
            "Taux de presence": f"{round((attended / accepted) * 100, 1) if accepted else 0}%",
            "Heures de benevolat": round(completed_hours, 1),
        }

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="report-pdf")
    def report_pdf(self, request, pk=None):
        organisation = self.get_object()
        if not self._can_access_exports(request, organisation):
            return Response({"detail": "Vous ne pouvez exporter que vos propres donnees."}, status=403)
        pdf = build_organisation_report_pdf(organisation, self._organisation_report_stats(organisation))
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="rapport-{organisation.id}.pdf"'
        return response

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="export-excel")
    def export_excel(self, request, pk=None):
        organisation = self.get_object()
        if not self._can_access_exports(request, organisation):
            return Response({"detail": "Vous ne pouvez exporter que vos propres donnees."}, status=403)

        export_type = request.query_params.get("type", "volunteers")
        if export_type == "applications":
            rows = [["Benevole", "Email", "Mission", "Evenement", "Statut", "Date candidature"]]
            queryset = Application.objects.filter(mission__event__organisation=organisation).select_related("volunteer", "volunteer__user", "mission", "mission__event")
            rows += [[str(item.volunteer), item.volunteer.user.email, item.mission.name, item.mission.event.title, item.status, item.applied_at] for item in queryset]
        elif export_type == "attendance":
            rows = [["Benevole", "Email", "Mission", "Evenement", "Statut presence", "Arrivee", "Depart", "Validation"]]
            queryset = Attendance.objects.filter(application__mission__event__organisation=organisation).select_related("application__volunteer__user", "application__mission__event")
            rows += [[str(item.application.volunteer), item.application.volunteer.user.email, item.application.mission.name, item.application.mission.event.title, item.status, item.arrived_at, item.departed_at, item.validation_method] for item in queryset]
        elif export_type == "events":
            rows = [["Evenement", "Ville", "Debut", "Fin", "Statut", "Candidatures", "Presences"]]
            queryset = Event.objects.filter(organisation=organisation).annotate(applications_count=Count("missions__applications"), attendances_count=Count("missions__applications__attendance", filter=Q(missions__applications__attendance__status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED])))
            rows += [[item.title, item.city, item.starts_at, item.ends_at, item.status, item.applications_count, item.attendances_count] for item in queryset]
        else:
            rows = [["Benevole", "Email", "Telephone", "Ville", "Competences"]]
            queryset = Volunteer.objects.filter(applications__mission__event__organisation=organisation).select_related("user").prefetch_related("skills__skill").distinct()
            rows += [[str(item), item.user.email, item.user.phone_number, item.city, ", ".join(skill.skill.name for skill in item.skills.all())] for item in queryset]

        content = build_excel_workbook(export_type, rows)
        response = HttpResponse(content, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Content-Disposition"] = f'attachment; filename="{export_type}-{organisation.id}.xlsx"'
        return response

    @action(detail=True, methods=["get"], permission_classes=[IsAdmin], url_path="summary")
    def summary(self, request, pk=None):
        organisation = self.get_object()
        events = Event.objects.filter(organisation=organisation)
        volunteers = Volunteer.objects.filter(
            applications__mission__event__organisation=organisation
        ).distinct()
        applications = Application.objects.filter(mission__event__organisation=organisation)
        return Response(
            {
                "events": events.count(),
                "volunteers": volunteers.count(),
                "applications": applications.count(),
                "accepted_applications": applications.filter(status=Application.Status.ACCEPTED).count(),
            }
        )


class VolunteerViewSet(viewsets.ModelViewSet):
    queryset = Volunteer.objects.select_related("user", "level").all()
    serializer_class = VolunteerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.Role.ADMIN or self.request.user.is_staff or self.request.user.is_superuser:
            return self.queryset
        if self.request.user.role == User.Role.VOLUNTEER:
            return self.queryset.filter(user=self.request.user)
        if self.request.user.role == User.Role.ORGANISATION:
            organisation = getattr(self.request.user, "organisation", None)
            if not organisation or not organisation.is_verified:
                return self.queryset.none()
            return self.queryset.filter(
                applications__mission__event__organisation=organisation
            ).distinct()
        return self.queryset.none()

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.VOLUNTEER:
            raise PermissionDenied("Seuls les benevoles peuvent creer un profil benevole.")
        if hasattr(self.request.user, "volunteer"):
            raise PermissionDenied("Cet utilisateur possede deja un profil benevole.")
        serializer.save(user=self.request.user)


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all().order_by("name")
    serializer_class = SkillSerializer
    permission_classes = [ReadOnlyOrAuthenticated]


class VolunteerSkillViewSet(viewsets.ModelViewSet):
    serializer_class = VolunteerSkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return VolunteerSkill.objects.filter(volunteer__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(volunteer=self.request.user.volunteer)


class AvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = AvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Availability.objects.filter(volunteer__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(volunteer=self.request.user.volunteer)


class EventCategoryViewSet(viewsets.ModelViewSet):
    queryset = EventCategory.objects.all().order_by("name")
    serializer_class = EventCategorySerializer
    permission_classes = [ReadOnlyOrAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        return super().get_permissions()


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related("organisation", "category").prefetch_related("missions").all()
    serializer_class = EventSerializer
    permission_classes = [ReadOnlyOrAuthenticated, OrganisationOwnerOrAdmin]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsVerifiedOrganisation(), OrganisationOwnerOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get("category")
        city = self.request.query_params.get("city")
        status_filter = self.request.query_params.get("status")
        if category:
            queryset = queryset.filter(category_id=category)
        if city:
            queryset = queryset.filter(city__icontains=city)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by("starts_at")

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.ORGANISATION or not self.request.user.organisation.is_verified:
            raise PermissionDenied("Votre organisation doit etre approuvee avant de creer des evenements.")
        serializer.save(organisation=self.request.user.organisation)

    @action(detail=False, methods=["get"])
    def near(self, request):
        # MVP approximation: precise radius search can move to PostGIS when geospatial indexes are added.
        return self.list(request)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="volunteers")
    def volunteers(self, request, pk=None):
        event = self.get_object()
        if request.user.role == User.Role.ORGANISATION:
            if event.organisation.user_id != request.user.id:
                return Response({"detail": "Vous ne pouvez consulter que les participants de vos evenements."}, status=403)
            if not request.user.organisation.is_verified:
                return Response({"detail": "Votre organisation doit etre approuvee."}, status=403)
        elif request.user.role != User.Role.ADMIN and not request.user.is_staff:
            return Response({"detail": "Action reservee aux administrateurs et organisations."}, status=403)
        applications = (
            Application.objects.filter(mission__event=event, status=Application.Status.ACCEPTED)
            .select_related("volunteer", "volunteer__user", "mission", "attendance")
            .prefetch_related("volunteer__skills__skill")
            .order_by("-applied_at")
        )
        participants = []
        for application in applications:
            attendance, _ = Attendance.objects.get_or_create(
                application=application,
                defaults={"status": Attendance.Status.CONFIRMED},
            )
            participants.append(
                {
                    "application_id": application.id,
                    "volunteer": VolunteerSerializer(application.volunteer).data,
                    "mission_name": application.mission.name,
                    "participation_status": attendance.status,
                    "qr_token": str(attendance.qr_token),
                    "arrived_at": attendance.arrived_at,
                    "departed_at": attendance.departed_at,
                    "registered_at": application.applied_at,
                }
            )
        return Response(participants)

    @action(detail=True, methods=["get", "post"], permission_classes=[ReadOnlyOrAuthenticated])
    def missions(self, request, pk=None):
        event = self.get_object()
        if request.method == "POST":
            if request.user.role == User.Role.ORGANISATION:
                if event.organisation.user_id != request.user.id:
                    return Response({"detail": "Vous ne pouvez ajouter des missions qu'a vos propres evenements."}, status=403)
                if not request.user.organisation.is_verified:
                    return Response({"detail": "Votre organisation doit etre approuvee avant de creer des missions."}, status=403)
            elif request.user.role != User.Role.ADMIN and not request.user.is_staff:
                return Response({"detail": "Action reservee aux organisations approuvees."}, status=403)
            payload = request.data.copy()
            payload["event"] = event.id
            serializer = MissionSerializer(data=payload)
            serializer.is_valid(raise_exception=True)
            serializer.save(event=event)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(MissionSerializer(event.missions.all(), many=True).data)


class MissionViewSet(viewsets.ModelViewSet):
    queryset = Mission.objects.select_related("event", "event__organisation").all()
    serializer_class = MissionSerializer
    permission_classes = [ReadOnlyOrAuthenticated, OrganisationOwnerOrAdmin]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsVerifiedOrganisation(), OrganisationOwnerOrAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        event_id = self.request.query_params.get("event")
        queryset = super().get_queryset()
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        return queryset.order_by("starts_at")

    def perform_create(self, serializer):
        event = serializer.validated_data["event"]
        if self.request.user.role == User.Role.ORGANISATION:
            if event.organisation.user_id != self.request.user.id:
                raise PermissionDenied("Vous ne pouvez creer des missions que pour vos propres evenements.")
            if not self.request.user.organisation.is_verified:
                raise PermissionDenied("Votre organisation doit etre approuvee avant de creer des missions.")
        serializer.save()

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="candidater")
    def apply(self, request, pk=None):
        mission = self.get_object()
        if request.user.role != User.Role.VOLUNTEER:
            return Response({"detail": "Seuls les benevoles peuvent candidater."}, status=403)
        application, created = Application.objects.get_or_create(
            volunteer=request.user.volunteer,
            mission=mission,
            defaults={"status": Application.Status.PENDING},
        )
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(ApplicationSerializer(application).data, status=response_status)

    @action(detail=True, methods=["get"], permission_classes=[IsOrganisation], url_path="candidatures")
    def applications(self, request, pk=None):
        mission = self.get_object()
        if mission.event.organisation.user_id != request.user.id:
            return Response({"detail": "Vous ne pouvez consulter que vos propres candidatures."}, status=403)
        if not request.user.organisation.is_verified:
            return Response({"detail": "Votre organisation doit etre approuvee."}, status=403)
        applications = mission.applications.select_related("volunteer", "mission")
        return Response(ApplicationSerializer(applications, many=True).data)

    @action(detail=True, methods=["get"], permission_classes=[IsOrganisation], url_path="recommandations")
    def recommendations(self, request, pk=None):
        mission = self.get_object()
        if mission.event.organisation.user_id != request.user.id:
            return Response({"detail": "Vous ne pouvez gerer que vos propres missions."}, status=403)
        if not request.user.organisation.is_verified:
            return Response({"detail": "Votre organisation doit etre approuvee."}, status=403)
        required_skill_ids = mission.required_skills.values_list("skill_id", flat=True)
        volunteers = Volunteer.objects.filter(skills__skill_id__in=required_skill_ids).distinct()[:20]
        return Response(VolunteerSerializer(volunteers, many=True).data)


class MissionSkillViewSet(viewsets.ModelViewSet):
    queryset = MissionSkill.objects.select_related("mission", "skill").all()
    serializer_class = MissionSkillSerializer
    permission_classes = [IsAuthenticated, OrganisationOwnerOrAdmin]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsVerifiedOrganisation(), OrganisationOwnerOrAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        mission = serializer.validated_data["mission"]
        if self.request.user.role == User.Role.ORGANISATION:
            if mission.event.organisation.user_id != self.request.user.id:
                raise PermissionDenied("Vous ne pouvez modifier que vos propres missions.")
            if not self.request.user.organisation.is_verified:
                raise PermissionDenied("Votre organisation doit etre approuvee.")
        serializer.save()


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.Role.VOLUNTEER:
            queryset = Application.objects.filter(volunteer__user=self.request.user)
        if self.request.user.role == User.Role.ORGANISATION:
            queryset = Application.objects.filter(mission__event__organisation__user=self.request.user)
        if self.request.user.role == User.Role.ADMIN or self.request.user.is_staff or self.request.user.is_superuser:
            queryset = Application.objects.all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.select_related("volunteer", "volunteer__user", "mission", "mission__event").prefetch_related("volunteer__skills__skill")

    def _can_manage_application(self, request, application):
        if request.user.role == User.Role.ADMIN or request.user.is_staff or request.user.is_superuser:
            return True
        organisation = getattr(request.user, "organisation", None)
        return bool(
            organisation
            and organisation.is_verified
            and application.mission.event.organisation.user_id == request.user.id
        )

    @action(detail=True, methods=["patch"], permission_classes=[IsVerifiedOrganisation], url_path="accepter")
    def accept(self, request, pk=None):
        application = self.get_object()
        if not self._can_manage_application(request, application):
            return Response({"detail": "Vous ne pouvez gerer que vos propres candidatures."}, status=403)
        application.status = Application.Status.ACCEPTED
        application.answered_at = timezone.now()
        application.save(update_fields=["status", "answered_at"])
        attendance, _ = Attendance.objects.get_or_create(
            application=application,
            defaults={
                "status": Attendance.Status.CONFIRMED,
                "validated_by": request.user,
            },
        )
        ensure_attendance_qr(attendance)
        send_attendance_qr_email(application)
        Notification.objects.create(
            user=application.volunteer.user,
            type="application_accepted",
            content=f"Votre candidature pour la mission {application.mission.name} a ete acceptee.",
        )
        return Response(self.get_serializer(application).data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="qr-code")
    def qr_code(self, request, pk=None):
        application = self.get_object()
        can_view = (
            request.user.role == User.Role.ADMIN
            or request.user.is_staff
            or application.volunteer.user_id == request.user.id
            or application.mission.event.organisation.user_id == request.user.id
        )
        if not can_view:
            return Response({"detail": "Vous ne pouvez consulter que vos propres QR Codes."}, status=403)
        if application.status != Application.Status.ACCEPTED:
            return Response({"detail": "La candidature doit etre acceptee avant de generer un QR Code."}, status=400)
        attendance, _ = Attendance.objects.get_or_create(
            application=application,
            defaults={"status": Attendance.Status.CONFIRMED},
        )
        ensure_attendance_qr(attendance)
        response = HttpResponse(generate_qr_png(attendance), content_type="image/png")
        response["Content-Disposition"] = f'attachment; filename="qr-attendance-{application.id}.png"'
        return response

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="certificate")
    def certificate(self, request, pk=None):
        application = self.get_object()
        can_generate = (
            request.user.role == User.Role.ADMIN
            or request.user.is_staff
            or application.volunteer.user_id == request.user.id
            or application.mission.event.organisation.user_id == request.user.id
        )
        if not can_generate:
            return Response({"detail": "Vous ne pouvez generer que vos propres certificats."}, status=403)
        try:
            attendance = application.attendance
        except Attendance.DoesNotExist:
            attendance = None
        if not attendance or attendance.status != Attendance.Status.COMPLETED:
            return Response({"detail": "Le certificat est disponible apres une participation marquee comme terminee."}, status=400)
        certificate = save_certificate(application)
        return FileResponse(certificate.pdf.open("rb"), as_attachment=True, filename=f"certificat-{application.id}.pdf")

    def _set_attendance_status(self, request, application, attendance_status, notification_type, content, timestamps=None):
        if not self._can_manage_application(request, application):
            return Response({"detail": "Vous ne pouvez gerer que vos propres participants."}, status=403)
        if application.status != Application.Status.ACCEPTED:
            return Response({"detail": "La candidature doit etre acceptee avant de gerer la participation."}, status=400)
        attendance, _ = Attendance.objects.get_or_create(
            application=application,
            defaults={"validated_by": request.user},
        )
        attendance.status = attendance_status
        attendance.validated_by = request.user
        if timestamps:
            for field, value in timestamps.items():
                setattr(attendance, field, value)
        attendance.save()
        Notification.objects.create(
            user=application.volunteer.user,
            type=notification_type,
            content=content,
        )
        if attendance_status == Attendance.Status.COMPLETED:
            save_certificate(application)
        return Response(AttendanceSerializer(attendance).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsVerifiedOrganisation], url_path="confirm-participation")
    def confirm_participation(self, request, pk=None):
        application = self.get_object()
        return self._set_attendance_status(
            request,
            application,
            Attendance.Status.CONFIRMED,
            "participation_confirmed",
            f"Votre participation a la mission {application.mission.name} est confirmee.",
        )

    @action(detail=True, methods=["patch"], permission_classes=[IsVerifiedOrganisation], url_path="mark-attended")
    def mark_attended(self, request, pk=None):
        application = self.get_object()
        return self._set_attendance_status(
            request,
            application,
            Attendance.Status.ATTENDED,
            "participation_attended",
            f"Votre presence a la mission {application.mission.name} a ete enregistree.",
            timestamps={"arrived_at": timezone.now()},
        )

    @action(detail=True, methods=["patch"], permission_classes=[IsVerifiedOrganisation], url_path="mark-completed")
    def mark_completed(self, request, pk=None):
        application = self.get_object()
        return self._set_attendance_status(
            request,
            application,
            Attendance.Status.COMPLETED,
            "participation_completed",
            f"Votre mission {application.mission.name} a ete marquee comme terminee.",
            timestamps={"departed_at": timezone.now()},
        )

    @action(detail=True, methods=["patch"], permission_classes=[IsVerifiedOrganisation], url_path="mark-absent")
    def mark_absent(self, request, pk=None):
        application = self.get_object()
        return self._set_attendance_status(
            request,
            application,
            Attendance.Status.ABSENT,
            "participation_absent",
            f"Votre absence a la mission {application.mission.name} a ete enregistree.",
        )

    @action(detail=True, methods=["patch"], permission_classes=[IsVerifiedOrganisation], url_path="refuser")
    def reject(self, request, pk=None):
        application = self.get_object()
        if not self._can_manage_application(request, application):
            return Response({"detail": "Vous ne pouvez gerer que vos propres candidatures."}, status=403)
        application.status = Application.Status.REJECTED
        application.answered_at = timezone.now()
        application.save(update_fields=["status", "answered_at"])
        Notification.objects.create(
            user=application.volunteer.user,
            type="application_rejected",
            content=f"Votre candidature pour la mission {application.mission.name} a ete refusee.",
        )
        return Response(self.get_serializer(application).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="presence")
    def attendance(self, request, pk=None):
        attendance, _ = Attendance.objects.update_or_create(
            application=self.get_object(),
            defaults={**request.data, "validated_by": request.user},
        )
        return Response(AttendanceSerializer(attendance).data)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")

    @action(detail=True, methods=["patch"], url_path="lue")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save(update_fields=["read"])
        return Response(self.get_serializer(notification).data)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(sender=self.request.user) | Message.objects.filter(recipient=self.request.user)

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.select_related("author").all().order_by("-published_at")
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by("-created_at")
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["list", "resolve"]:
            return [IsAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="traiter")
    def resolve(self, request, pk=None):
        report = self.get_object()
        report.status = Report.Status.RESOLVED
        report.save(update_fields=["status"])
        return Response(self.get_serializer(report).data)


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    permission_classes = [ReadOnlyOrAuthenticated]


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certificate.objects.filter(volunteer__user=self.request.user)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        certificate = self.get_object()
        return FileResponse(certificate.pdf.open("rb"), as_attachment=True, filename=f"certificat-{certificate.id}.pdf")


class EvaluationViewSet(viewsets.ModelViewSet):
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Evaluation.objects.filter(volunteer__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(volunteer=self.request.user.volunteer)


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_stats(request):
    return Response(
        {
            "users": User.objects.count(),
            "organisations": Organisation.objects.count(),
            "volunteers": Volunteer.objects.count(),
            "events": Event.objects.count(),
            "applications": Application.objects.count(),
            "accepted_applications": Application.objects.filter(status=Application.Status.ACCEPTED).count(),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def organisation_stats(request, pk):
    if request.user.role == User.Role.ORGANISATION and request.user.organisation.id != pk:
        return Response({"detail": "Vous ne pouvez consulter que les statistiques de votre organisation."}, status=403)
    events = Event.objects.filter(organisation_id=pk)
    missions = Mission.objects.filter(event__organisation_id=pk)
    return Response(
        {
            "events": events.count(),
            "active_events": events.filter(status=Event.Status.PUBLISHED).count(),
            "missions": missions.count(),
            "applications": Application.objects.filter(mission__in=missions).count(),
            "attendances": Attendance.objects.filter(application__mission__in=missions).count(),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def volunteer_stats(request):
    volunteer = request.user.volunteer
    return Response(
        {
            "points": volunteer.total_points,
            "applications": volunteer.applications.count(),
            "accepted_applications": volunteer.applications.filter(status=Application.Status.ACCEPTED).count(),
            "certificates": volunteer.certificates.count(),
            "badges": volunteer.badges.count(),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def scan_attendance_qr(request):
    if request.user.role == User.Role.ORGANISATION:
        organisation = getattr(request.user, "organisation", None)
        if not organisation or not organisation.is_verified:
            return Response({"detail": "Votre organisation doit etre approuvee pour scanner les presences."}, status=403)
    elif request.user.role != User.Role.ADMIN and not request.user.is_staff and not request.user.is_superuser:
        return Response({"detail": "Action reservee aux organisations et administrateurs."}, status=403)

    token = str(request.data.get("token", "")).strip()
    if "token=" in token:
        token = token.split("token=", 1)[1].split("&", 1)[0]
    if not token:
        return Response({"detail": "Token QR manquant."}, status=400)

    try:
        attendance = Attendance.objects.select_related(
            "application__volunteer__user",
            "application__mission__event__organisation",
        ).get(qr_token=token)
    except Attendance.DoesNotExist:
        return Response({"detail": "QR Code invalide."}, status=404)

    application = attendance.application
    if request.user.role == User.Role.ORGANISATION and application.mission.event.organisation.user_id != request.user.id:
        return Response({"detail": "Ce QR Code appartient a un autre evenement."}, status=403)
    if application.status != Application.Status.ACCEPTED:
        return Response({"detail": "La candidature liee a ce QR Code n'est pas acceptee."}, status=400)
    if attendance.status in [Attendance.Status.ATTENDED, Attendance.Status.COMPLETED] and attendance.arrived_at:
        return Response(
            {
                "detail": "Presence deja validee pour ce QR Code.",
                "attendance": AttendanceSerializer(attendance).data,
            },
            status=409,
        )

    attendance.status = Attendance.Status.ATTENDED
    attendance.arrived_at = timezone.now()
    attendance.validation_method = Attendance.Method.QR_CODE
    attendance.validated_by = request.user
    attendance.save(update_fields=["status", "arrived_at", "validation_method", "validated_by"])
    Notification.objects.create(
        user=application.volunteer.user,
        type="attendance_qr_scanned",
        content=f"Votre presence a la mission {application.mission.name} a ete validee par QR Code.",
    )
    return Response(AttendanceSerializer(attendance).data)


def _mission_recommendation_score(volunteer, mission, previous_category_ids):
    reasons = []
    score = 0
    volunteer_skills = {item.skill.name.lower() for item in volunteer.skills.select_related("skill")}
    required_skills = {item.skill.name.lower() for item in mission.required_skills.select_related("skill")}
    if required_skills:
        skill_ratio = len(volunteer_skills & required_skills) / len(required_skills)
        skill_score = round(skill_ratio * 35)
        if skill_score:
            reasons.append("Competences compatibles")
        score += skill_score

    interest_text = (volunteer.interests or "").lower()
    mission_text = " ".join(
        [
            mission.name,
            mission.description,
            mission.event.title,
            mission.event.description,
            mission.event.category.name if mission.event.category else "",
        ]
    ).lower()
    interest_matches = [word for word in interest_text.replace(",", " ").split() if len(word) > 3 and word in mission_text]
    if interest_matches:
        score += min(20, len(set(interest_matches)) * 5)
        reasons.append("Interets alignes")

    availabilities = volunteer.availabilities.all()
    mission_date = mission.starts_at.date()
    mission_weekday = mission.starts_at.weekday()
    if any(item.specific_date == mission_date or item.weekday == mission_weekday for item in availabilities):
        score += 15
        reasons.append("Disponibilite compatible")
    elif volunteer.availability_notes:
        score += 5

    if volunteer.city and mission.event.city:
        if volunteer.city.lower() == mission.event.city.lower():
            score += 15
            reasons.append("Meme ville")
        elif volunteer.city.lower() in mission.event.city.lower() or mission.event.city.lower() in volunteer.city.lower():
            score += 8
            reasons.append("Localisation proche")

    if mission.event.category_id and mission.event.category_id in previous_category_ids:
        score += 10
        reasons.append("Categorie deja appreciee")

    if Application.objects.filter(
        volunteer=volunteer,
        mission__event__organisation=mission.event.organisation,
        status=Application.Status.ACCEPTED,
    ).exists():
        score += 5
        reasons.append("Organisation connue")

    return min(score, 100), reasons or ["Nouvelle opportunite pertinente"]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mission_recommendations(request):
    if request.user.role != User.Role.VOLUNTEER:
        return Response({"detail": "Les recommandations sont reservees aux benevoles."}, status=403)

    volunteer = request.user.volunteer
    existing_application_ids = volunteer.applications.values_list("mission_id", flat=True)
    previous_category_ids = set(
        volunteer.applications.filter(
            attendance__status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED],
            mission__event__category__isnull=False,
        ).values_list("mission__event__category_id", flat=True)
    )
    missions = (
        Mission.objects.filter(status=Mission.Status.OPEN, event__status__in=[Event.Status.PUBLISHED, Event.Status.ACTIVE])
        .exclude(id__in=existing_application_ids)
        .select_related("event", "event__category", "event__organisation")
        .prefetch_related("required_skills__skill")
        .order_by("starts_at")
    )

    recommendations = []
    for mission in missions:
        score, reasons = _mission_recommendation_score(volunteer, mission, previous_category_ids)
        if score >= 15:
            recommendations.append(
                {
                    "mission": MissionSerializer(mission).data,
                    "event": EventSerializer(mission.event).data,
                    "score": score,
                    "reasons": reasons,
                }
            )

    recommendations.sort(key=lambda item: item["score"], reverse=True)
    recommendations = recommendations[: int(request.query_params.get("limit", 6))]

    if recommendations and not Notification.objects.filter(
        user=request.user,
        type="mission_recommendations",
        created_at__date=timezone.localdate(),
    ).exists():
        Notification.objects.create(
            user=request.user,
            type="mission_recommendations",
            content=f"{len(recommendations[:3])} missions correspondent a votre profil cette semaine.",
        )

    return Response(recommendations)
