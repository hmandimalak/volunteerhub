from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

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
    Level,
    Message,
    Mission,
    MissionSkill,
    Notification,
    Organisation,
    OrganisationDocument,
    Report,
    Skill,
    Volunteer,
    VolunteerBadge,
    VolunteerSkill,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "phone_number", "role", "status", "created_at", "last_login_at"]
        read_only_fields = ["id", "created_at", "last_login_at"]


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    organisation_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organisation_description = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organisation_category_type = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organisation_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organisation_city = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organisation_country = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organisation_website = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organisation_document = serializers.FileField(write_only=True, required=False)
    organisation_documents = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    birth_date = serializers.DateField(write_only=True, required=False, allow_null=True)
    volunteer_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    volunteer_city = serializers.CharField(write_only=True, required=False, allow_blank=True)
    volunteer_interests = serializers.CharField(write_only=True, required=False, allow_blank=True)
    volunteer_availability = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile_picture = serializers.ImageField(write_only=True, required=False)
    skills = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "phone_number",
            "role",
            "organisation_name",
            "organisation_description",
            "organisation_category_type",
            "organisation_address",
            "organisation_city",
            "organisation_country",
            "organisation_website",
            "organisation_document",
            "organisation_documents",
            "first_name",
            "last_name",
            "birth_date",
            "volunteer_address",
            "volunteer_city",
            "volunteer_interests",
            "volunteer_availability",
            "profile_picture",
            "skills",
        ]

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet e-mail.")
        return email

    def to_internal_value(self, data):
        if hasattr(data, "copy"):
            data = data.copy()
            for key in list(data.keys()):
                values = data.getlist(key) if hasattr(data, "getlist") else [data.get(key)]
                if values == [""] or values == [None]:
                    data.pop(key)
        return super().to_internal_value(data)

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("Les comptes administrateur doivent etre crees par un administrateur existant.")
        return value

    def validate(self, attrs):
        role = attrs.get("role")
        if role == User.Role.ORGANISATION and not attrs.get("organisation_name"):
            raise serializers.ValidationError({"organisation_name": "Le nom de l'organisation est obligatoire."})
        if role == User.Role.ORGANISATION:
            request = self.context.get("request")
            uploaded_documents = []
            if request:
                uploaded_documents = request.FILES.getlist("organisation_documents")
                if request.FILES.get("organisation_document"):
                    uploaded_documents.append(request.FILES["organisation_document"])
            if not uploaded_documents and not attrs.get("organisation_document"):
                raise serializers.ValidationError(
                    {"organisation_documents": "Au moins un document officiel est obligatoire pour verifier l'organisation."}
                )
        if role == User.Role.VOLUNTEER and (not attrs.get("first_name") or not attrs.get("last_name")):
            raise serializers.ValidationError({"first_name": "Le prenom et le nom sont obligatoires pour un benevole."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        organisation_data = {
            "name": validated_data.pop("organisation_name", ""),
            "description": validated_data.pop("organisation_description", ""),
            "category_type": validated_data.pop("organisation_category_type", ""),
            "address": validated_data.pop("organisation_address", ""),
            "city": validated_data.pop("organisation_city", ""),
            "country": validated_data.pop("organisation_country", ""),
            "website": validated_data.pop("organisation_website", ""),
            "supporting_document": validated_data.pop("organisation_document", None),
        }
        organisation_documents = validated_data.pop("organisation_documents", [])
        volunteer_data = {
            "first_name": validated_data.pop("first_name", ""),
            "last_name": validated_data.pop("last_name", ""),
            "birth_date": validated_data.pop("birth_date", None),
            "address": validated_data.pop("volunteer_address", ""),
            "city": validated_data.pop("volunteer_city", ""),
            "interests": validated_data.pop("volunteer_interests", ""),
            "availability_notes": validated_data.pop("volunteer_availability", ""),
            "photo": validated_data.pop("profile_picture", None),
        }
        skills = validated_data.pop("skills", [])

        with transaction.atomic():
            email = validated_data["email"].strip().lower()
            validated_data["email"] = email
            if not validated_data.get("username"):
                base = email.split("@")[0][:30] or "utilisateur"
                username = base
                suffix = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base}{suffix}"
                    suffix += 1
                validated_data["username"] = username
            user = User(**validated_data)
            user.set_password(password)
            if user.role == User.Role.ORGANISATION:
                user.status = User.Status.PENDING
            user.save()
            if user.role == User.Role.ORGANISATION:
                organisation = Organisation.objects.create(
                    user=user,
                    phone_number=user.phone_number,
                    **{key: value for key, value in organisation_data.items() if value is not None},
                )
                request = self.context.get("request")
                request_documents = request.FILES.getlist("organisation_documents") if request else []
                all_documents = request_documents or organisation_documents
                if organisation.supporting_document:
                    all_documents.append(organisation.supporting_document)
                for index, document in enumerate(all_documents, start=1):
                    OrganisationDocument.objects.create(
                        organisation=organisation,
                        file=document,
                        label=f"Document officiel {index}",
                    )
                admins = User.objects.filter(role=User.Role.ADMIN) | User.objects.filter(is_staff=True)
                for admin in admins.distinct():
                    Notification.objects.create(
                        user=admin,
                        type="organisation_verification_submitted",
                        content=f"Nouvelle demande de verification : {organisation.name}",
                    )
            if user.role == User.Role.VOLUNTEER:
                volunteer = Volunteer.objects.create(
                    user=user,
                    **{key: value for key, value in volunteer_data.items() if value is not None},
                )
                for skill_name in skills:
                    skill, _ = Skill.objects.get_or_create(name=skill_name.strip())
                    if skill.name:
                        VolunteerSkill.objects.get_or_create(
                            volunteer=volunteer,
                            skill=skill,
                            defaults={"level": VolunteerSkill.SkillLevel.BEGINNER},
                        )
        return user


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = "__all__"


class OrganisationDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = OrganisationDocument
        fields = ["id", "file", "file_url", "label", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return ""
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class OrganisationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    documents = OrganisationDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Organisation
        fields = "__all__"
        read_only_fields = [
            "validation_status",
            "verification_requested_at",
            "reviewed_at",
            "review_reason",
        ]


class VolunteerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    skills_summary = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", required=False, allow_blank=True)
    skill_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)

    class Meta:
        model = Volunteer
        fields = [
            "id",
            "user",
            "first_name",
            "last_name",
            "birth_date",
            "bio",
            "photo",
            "photo_url",
            "address",
            "city",
            "interests",
            "availability_notes",
            "latitude",
            "longitude",
            "level",
            "total_points",
            "show_in_leaderboard",
            "emergency_contact_name",
            "emergency_contact_phone",
            "skills_summary",
            "phone_number",
            "skill_names",
        ]
        read_only_fields = ["id", "user", "level", "total_points"]

    def get_skills_summary(self, obj):
        return [
            {
                "name": volunteer_skill.skill.name,
                "level": volunteer_skill.level,
            }
            for volunteer_skill in obj.skills.select_related("skill").all()
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        url = obj.photo.url
        return request.build_absolute_uri(url) if request else url

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        skill_names = validated_data.pop("skill_names", None)
        volunteer = super().update(instance, validated_data)
        if "phone_number" in user_data:
            volunteer.user.phone_number = user_data.get("phone_number") or ""
            volunteer.user.save(update_fields=["phone_number"])
        if skill_names is not None:
            normalized = [name.strip() for name in skill_names if name.strip()]
            current = {item.skill.name: item for item in volunteer.skills.select_related("skill").all()}
            for name in normalized:
                if name in current:
                    continue
                skill, _created = Skill.objects.get_or_create(name=name)
                VolunteerSkill.objects.get_or_create(
                    volunteer=volunteer,
                    skill=skill,
                    defaults={"level": VolunteerSkill.SkillLevel.BEGINNER},
                )
            volunteer.skills.exclude(skill__name__in=normalized).delete()
        return volunteer


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = "__all__"


class VolunteerSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = VolunteerSkill
        fields = ["id", "volunteer", "skill", "skill_name", "level"]
        read_only_fields = ["volunteer"]


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = "__all__"
        read_only_fields = ["volunteer"]


class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = "__all__"


class MissionSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = MissionSkill
        fields = ["id", "mission", "skill", "skill_name", "required_level", "mandatory"]


class MissionSerializer(serializers.ModelSerializer):
    remaining_places = serializers.IntegerField(read_only=True)
    registered_volunteers_count = serializers.SerializerMethodField()
    required_skills = MissionSkillSerializer(many=True, read_only=True)

    class Meta:
        model = Mission
        fields = "__all__"

    def get_registered_volunteers_count(self, obj):
        return obj.applications.filter(status=Application.Status.ACCEPTED).count()

    def validate(self, attrs):
        event = attrs.get("event") or (self.instance.event if self.instance else None)
        if not event:
            return attrs
        starts_at = attrs.get("starts_at") or (self.instance.starts_at if self.instance else event.starts_at)
        ends_at = attrs.get("ends_at") or (self.instance.ends_at if self.instance else event.ends_at)
        if starts_at < event.starts_at or ends_at > event.ends_at:
            raise serializers.ValidationError("Les horaires de la mission doivent rester dans la période de l'événement.")
        if ends_at <= starts_at:
            raise serializers.ValidationError("L'heure de fin doit être postérieure à l'heure de début.")
        attrs["starts_at"] = starts_at
        attrs["ends_at"] = ends_at
        return attrs


class EventSerializer(serializers.ModelSerializer):
    organisation_name = serializers.CharField(source="organisation.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    missions = MissionSerializer(many=True, read_only=True)
    registered_volunteers_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = "__all__"
        read_only_fields = ["organisation"]

    def get_registered_volunteers_count(self, obj):
        return (
            Application.objects.filter(mission__event=obj)
            .values("volunteer_id")
            .distinct()
            .count()
        )


class ApplicationSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.SerializerMethodField()
    volunteer_email = serializers.CharField(source="volunteer.user.email", read_only=True)
    volunteer_phone_number = serializers.CharField(source="volunteer.user.phone_number", read_only=True)
    volunteer_skills = serializers.SerializerMethodField()
    volunteer_availability = serializers.CharField(source="volunteer.availability_notes", read_only=True)
    volunteer_profile = serializers.SerializerMethodField()
    mission_name = serializers.CharField(source="mission.name", read_only=True)
    event_title = serializers.CharField(source="mission.event.title", read_only=True)
    attendance_status = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = "__all__"
        read_only_fields = ["volunteer", "applied_at", "answered_at"]

    def get_volunteer_name(self, obj):
        return str(obj.volunteer)

    def get_volunteer_skills(self, obj):
        return [
            {
                "name": volunteer_skill.skill.name,
                "level": volunteer_skill.level,
            }
            for volunteer_skill in obj.volunteer.skills.select_related("skill").all()
        ]

    def get_volunteer_profile(self, obj):
        return VolunteerSerializer(obj.volunteer).data

    def get_attendance_status(self, obj):
        try:
            return obj.attendance.status
        except Attendance.DoesNotExist:
            return ""


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = "__all__"
        read_only_fields = ["validated_by"]


class EvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = "__all__"
        read_only_fields = ["volunteer"]


class BadgeSerializer(serializers.ModelSerializer):
    organisation_name = serializers.CharField(source="organisation.name", read_only=True)

    class Meta:
        model = Badge
        fields = "__all__"
        read_only_fields = ["organisation"]


class VolunteerBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = VolunteerBadge
        fields = "__all__"


class CertificateSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="event.title", read_only=True)
    event_date = serializers.DateTimeField(source="event.starts_at", read_only=True)
    volunteer_name = serializers.SerializerMethodField()
    organisation_name = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = "__all__"
        read_only_fields = ["volunteer", "generated_at", "verification_id"]

    def get_organisation_name(self, obj):
        if obj.event and obj.event.organisation:
            return obj.event.organisation.name
        return ""

    def get_volunteer_name(self, obj):
        return str(obj.volunteer)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["user", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = ["sender", "sent_at"]


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = "__all__"
        read_only_fields = ["author", "published_at"]


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = "__all__"
        read_only_fields = ["reporter", "created_at"]
