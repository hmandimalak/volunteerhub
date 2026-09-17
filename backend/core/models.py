from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import uuid


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrateur"
        ORGANISATION = "organisation", "Organisation"
        VOLUNTEER = "benevole", "Benevole"

    class Status(models.TextChoices):
        ACTIVE = "actif", "Actif"
        SUSPENDED = "suspendu", "Suspendu"
        PENDING = "en_attente", "En attente"

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VOLUNTEER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]


class Level(models.Model):
    name = models.CharField(max_length=100)
    required_points = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return self.name


class Organisation(models.Model):
    class ValidationStatus(models.TextChoices):
        PENDING = "en_attente", "En attente"
        APPROVED = "validee", "Validee"
        REJECTED = "refusee", "Refusee"
        NEEDS_MORE_DOCUMENTS = "documents_requis", "Documents requis"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="organisation")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="organisations/logos/", blank=True)
    signature = models.ImageField(upload_to="organisations/signatures/", blank=True)
    sector = models.CharField(max_length=100, blank=True)
    category_type = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    phone_number = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    validation_status = models.CharField(
        max_length=20,
        choices=ValidationStatus.choices,
        default=ValidationStatus.PENDING,
    )
    supporting_document = models.FileField(upload_to="organisations/documents/", blank=True)
    verification_requested_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_reason = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.name

    @property
    def is_verified(self) -> bool:
        return self.validation_status == self.ValidationStatus.APPROVED


class OrganisationDocument(models.Model):
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name="documents")
    file = models.FileField(upload_to="organisations/verification_documents/")
    label = models.CharField(max_length=120, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.label or self.file.name


class Volunteer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="volunteer")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    birth_date = models.DateField(null=True, blank=True)
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to="volunteers/photos/", blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    interests = models.TextField(blank=True)
    availability_notes = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    level = models.ForeignKey(Level, on_delete=models.SET_NULL, null=True, blank=True)
    total_points = models.PositiveIntegerField(default=0)
    show_in_leaderboard = models.BooleanField(default=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=30, blank=True)

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=100, blank=True)

    def __str__(self) -> str:
        return self.name


class VolunteerSkill(models.Model):
    class SkillLevel(models.TextChoices):
        BEGINNER = "debutant", "Debutant"
        INTERMEDIATE = "intermediaire", "Intermediaire"
        EXPERT = "expert", "Expert"

    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name="skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level = models.CharField(max_length=20, choices=SkillLevel.choices)

    class Meta:
        unique_together = ("volunteer", "skill")


class Availability(models.Model):
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name="availabilities")
    weekday = models.PositiveSmallIntegerField(null=True, blank=True)
    specific_date = models.DateField(null=True, blank=True)
    start_time = models.TimeField()
    end_time = models.TimeField()


class EventCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=20, blank=True)
    active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class Event(models.Model):
    class Status(models.TextChoices):
        DRAFT = "brouillon", "Brouillon"
        PUBLISHED = "publie", "Publie"
        FULL = "complet", "Complet"
        ACTIVE = "en_cours", "En cours"
        FINISHED = "termine", "Termine"
        CANCELLED = "annule", "Annule"

    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name="events")
    category = models.ForeignKey(EventCategory, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    volunteers_needed = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.title


class EventImage(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="events/images/")
    order = models.PositiveIntegerField(default=0)


class Mission(models.Model):
    class Status(models.TextChoices):
        OPEN = "ouverte", "Ouverte"
        FULL = "complete", "Complete"
        CLOSED = "fermee", "Fermee"

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="missions")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    capacity = models.PositiveIntegerField(default=1)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    @property
    def remaining_places(self) -> int:
        accepted = self.applications.filter(status=Application.Status.ACCEPTED).count()
        return max(self.capacity - accepted, 0)

    def __str__(self) -> str:
        return self.name


class MissionSkill(models.Model):
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name="required_skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    required_level = models.CharField(max_length=20, choices=VolunteerSkill.SkillLevel.choices)
    mandatory = models.BooleanField(default=True)

    class Meta:
        unique_together = ("mission", "skill")


class Application(models.Model):
    class Status(models.TextChoices):
        PENDING = "en_attente", "En attente"
        ACCEPTED = "acceptee", "Acceptee"
        REJECTED = "refusee", "Refusee"
        CANCELLED = "annulee", "Annulee"
        WAITLISTED = "liste_attente", "Liste attente"

    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name="applications")
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name="applications")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    applied_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("volunteer", "mission")


class Attendance(models.Model):
    class Method(models.TextChoices):
        MANUAL = "manuel", "Manuel"
        QR_CODE = "qr_code", "QR Code"

    class Status(models.TextChoices):
        CONFIRMED = "confirmee", "Confirmee"
        ATTENDED = "presente", "Presente"
        ABSENT = "absente", "Absente"
        COMPLETED = "terminee", "Terminee"

    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name="attendance")
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    qr_code = models.ImageField(upload_to="attendance/qr_codes/", blank=True)
    arrived_at = models.DateTimeField(null=True, blank=True)
    departed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    validation_method = models.CharField(max_length=20, choices=Method.choices, default=Method.MANUAL)
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    confirmed_hours = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)


class Evaluation(models.Model):
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="evaluations")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Badge(models.Model):
    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, null=True, blank=True, related_name="badges"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.ImageField(upload_to="badges/icons/", blank=True)
    condition = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)


class VolunteerBadge(models.Model):
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name="badges")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("volunteer", "badge")


class Certificate(models.Model):
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name="certificates")
    event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True, blank=True)
    pdf = models.FileField(upload_to="certificates/")
    hours = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    verification_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    generated_at = models.DateTimeField(auto_now_add=True)


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=50)
    content = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    content = models.TextField()
    read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)


class Announcement(models.Model):
    class Target(models.TextChoices):
        ALL = "tous", "Tous"
        EVENT = "evenement_specifique", "Evenement specifique"
        ORGANISATION = "organisation", "Organisation"

    author = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    content = models.TextField()
    target = models.CharField(max_length=30, choices=Target.choices, default=Target.ALL)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, null=True, blank=True)
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, null=True, blank=True)
    published_at = models.DateTimeField(auto_now_add=True)


class Report(models.Model):
    class TargetType(models.TextChoices):
        PROFILE = "profil", "Profil"
        EVENT = "evenement", "Evenement"
        MESSAGE = "message", "Message"

    class Status(models.TextChoices):
        OPEN = "ouvert", "Ouvert"
        RESOLVED = "traite", "Traite"
        REJECTED = "rejete", "Rejete"

    reporter = models.ForeignKey(User, on_delete=models.CASCADE)
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.PositiveIntegerField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)


class PointsHistory(models.Model):
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE, related_name="points_history")
    points = models.IntegerField()
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
