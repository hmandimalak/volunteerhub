from io import BytesIO
import uuid

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.utils import timezone
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from .models import (
    Application,
    Attendance,
    Badge,
    Certificate,
    Event,
    Notification,
    Volunteer,
    VolunteerBadge,
)


def generate_qr_png(attendance: Attendance) -> bytes:
    scan_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/organisation/attendance/scan?token={attendance.qr_token}"
    image = qrcode.make(scan_url)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def ensure_attendance_qr(attendance: Attendance) -> Attendance:
    if not attendance.qr_code:
        attendance.qr_code.save(
            f"attendance-{attendance.id}-{attendance.qr_token}.png",
            ContentFile(generate_qr_png(attendance)),
            save=True,
        )
    return attendance


def send_attendance_qr_email(application: Application) -> None:
    attendance, _ = Attendance.objects.get_or_create(
        application=application,
        defaults={"status": Attendance.Status.CONFIRMED},
    )
    ensure_attendance_qr(attendance)
    email = EmailMessage(
        subject="Votre QR Code de presence VolunteerHub",
        body=(
            f"Bonjour {application.volunteer.first_name},\n\n"
            f"Votre candidature pour la mission '{application.mission.name}' a ete acceptee.\n"
            "Presentez le QR Code joint le jour de l'evenement pour valider votre presence.\n"
            "Vous pouvez aussi retrouver votre QR Code dans votre tableau de bord benevole.\n\n"
            f"Code de verification: {attendance.qr_token}\n"
        ),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@volunteerhub.local"),
        to=[application.volunteer.user.email],
    )
    email.attach("volunteerhub-attendance-qr.png", generate_qr_png(attendance), "image/png")
    email.send(fail_silently=True)


def archive_expired_events() -> int:
    now = timezone.now()
    updated = Event.objects.filter(
        ends_at__lt=now,
        status__in=[Event.Status.PUBLISHED, Event.Status.ACTIVE, Event.Status.FULL],
    ).update(status=Event.Status.FINISHED)
    return updated


def calculate_platform_volunteer_hours() -> float:
    total = 0.0
    attendances = Attendance.objects.filter(
        application__status=Application.Status.ACCEPTED,
        status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED],
    ).select_related("application__mission")
    for attendance in attendances:
        total += _mission_hours(attendance.application)
    return round(total, 1)


def get_platform_stats() -> dict:
    archive_expired_events()
    now = timezone.now()
    from .models import Organisation

    return {
        "volunteers": Volunteer.objects.count(),
        "verified_organisations": Organisation.objects.filter(
            validation_status=Organisation.ValidationStatus.APPROVED
        ).count(),
        "active_events": Event.objects.filter(
            ends_at__gte=now,
            status__in=[Event.Status.PUBLISHED, Event.Status.ACTIVE, Event.Status.FULL],
        ).count(),
        "volunteer_hours": calculate_platform_volunteer_hours(),
        "completed_events": Event.objects.filter(status=Event.Status.FINISHED).count(),
    }


def build_organisation_report_pdf(organisation, stats: dict) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 2 * cm

    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(2 * cm, y, f"Rapport d'impact - {organisation.name}")
    y -= 1.2 * cm

    pdf.setFont("Helvetica", 11)
    pdf.drawString(2 * cm, y, f"Genere le {timezone.now().strftime('%d/%m/%Y %H:%M')}")
    y -= 1.2 * cm

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(2 * cm, y, "Statistiques")
    y -= 0.8 * cm

    pdf.setFont("Helvetica", 11)
    for label, value in stats.items():
        pdf.drawString(2.4 * cm, y, f"{label}: {value}")
        y -= 0.65 * cm

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def _mission_hours(application: Application) -> float:
    try:
        hours = application.attendance.confirmed_hours
        if hours is not None:
            return float(hours)
    except Attendance.DoesNotExist:
        pass
    return max((application.mission.ends_at - application.mission.starts_at).total_seconds() / 3600, 0)


def _can_issue_certificate(application: Application) -> bool:
    if application.status != Application.Status.ACCEPTED:
        return False
    try:
        attendance = application.attendance
    except Attendance.DoesNotExist:
        return False
    return attendance.status in [Attendance.Status.ATTENDED, Attendance.Status.COMPLETED]


def build_certificate_pdf(application: Application, verification_id: uuid.UUID) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    organisation = application.mission.event.organisation
    hours = _mission_hours(application)

    pdf.setFont("Helvetica-Bold", 26)
    pdf.drawCentredString(width / 2, height - 3.5 * cm, "Certificat de benevolat")

    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 5.5 * cm, "Ce certificat atteste que")
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(width / 2, height - 6.8 * cm, str(application.volunteer))

    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 8.3 * cm, "a participe a")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(width / 2, height - 9.5 * cm, application.mission.event.title)

    pdf.setFont("Helvetica", 12)
    pdf.drawCentredString(width / 2, height - 10.9 * cm, f"Mission: {application.mission.name}")
    pdf.drawCentredString(width / 2, height - 11.7 * cm, f"Date: {application.mission.starts_at.strftime('%d/%m/%Y')}")
    pdf.drawCentredString(width / 2, height - 12.5 * cm, f"Heures realisees: {hours:.1f} h")
    pdf.drawCentredString(width / 2, height - 13.5 * cm, f"Organisation: {organisation.name}")

    if organisation.logo:
        try:
            pdf.drawImage(organisation.logo.path, 2 * cm, height - 3 * cm, width=3 * cm, height=2 * cm, preserveAspectRatio=True, mask="auto")
        except Exception:
            pass

    if organisation.signature:
        try:
            pdf.drawImage(organisation.signature.path, width - 5 * cm, 4 * cm, width=3 * cm, height=1.5 * cm, preserveAspectRatio=True, mask="auto")
            pdf.setFont("Helvetica", 9)
            pdf.drawString(width - 5 * cm, 3.2 * cm, "Signature autorisee")
        except Exception:
            pass

    verify_qr = qrcode.make(str(verification_id))
    qr_buffer = BytesIO()
    verify_qr.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    pdf.drawInlineImage(qr_buffer, width - 4.5 * cm, 6 * cm, width=2.5 * cm, height=2.5 * cm)

    pdf.setFont("Helvetica-Oblique", 9)
    pdf.drawCentredString(width / 2, 2.5 * cm, f"ID de verification: {verification_id}")
    pdf.drawCentredString(width / 2, 2 * cm, "Document genere automatiquement par VolunteerHub")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def save_certificate(application: Application) -> Certificate | None:
    if not _can_issue_certificate(application):
        return None
    hours = _mission_hours(application)
    certificate, created = Certificate.objects.get_or_create(
        volunteer=application.volunteer,
        event=application.mission.event,
        defaults={"pdf": "", "hours": hours},
    )
    should_notify = created or not certificate.pdf
    if created or not certificate.pdf:
        certificate.hours = hours
        certificate.pdf.save(
            f"certificate-{application.volunteer_id}-{application.mission.event_id}.pdf",
            ContentFile(build_certificate_pdf(application, certificate.verification_id)),
            save=True,
        )
    elif certificate.hours != hours:
        certificate.hours = hours
        certificate.save(update_fields=["hours"])
    if should_notify:
        Notification.objects.create(
            user=application.volunteer.user,
            type="certificate_awarded",
            content="Un certificat vous a été attribué !",
        )
    return certificate


def calculate_volunteer_hours(volunteer: Volunteer) -> float:
    total = 0.0
    attendances = Attendance.objects.filter(
        application__volunteer=volunteer,
        application__status=Application.Status.ACCEPTED,
        status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED],
    ).select_related("application__mission")
    for attendance in attendances:
        total += _mission_hours(attendance.application)
    return total


def count_completed_events(volunteer: Volunteer) -> int:
    return (
        Attendance.objects.filter(
            application__volunteer=volunteer,
            application__status=Application.Status.ACCEPTED,
            status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED],
        )
        .values("application__mission__event_id")
        .distinct()
        .count()
    )


def max_loyalty_count(volunteer: Volunteer) -> int:
    from django.db.models import Count

    row = (
        Attendance.objects.filter(
            application__volunteer=volunteer,
            application__status=Application.Status.ACCEPTED,
            status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED],
        )
        .values("application__mission__event__organisation_id")
        .annotate(n=Count("application__mission__event_id", distinct=True))
        .order_by("-n")
        .first()
    )
    return int(row["n"]) if row else 0


def evaluate_badge_condition(volunteer: Volunteer, badge: Badge) -> bool:
    condition = badge.condition or {}
    condition_type = condition.get("type", "")

    if condition_type == "first_mission":
        return count_completed_events(volunteer) >= 1
    if condition_type == "volunteer_hours":
        return calculate_volunteer_hours(volunteer) >= float(condition.get("min_hours", 0))
    if condition_type == "loyalty":
        return max_loyalty_count(volunteer) >= int(condition.get("min_count", 3))
    if condition_type == "completed_events":
        return count_completed_events(volunteer) >= int(condition.get("min_count", 1))
    if condition_type == "category_events":
        category_name = condition.get("category", "").lower()
        min_count = int(condition.get("min_count", 1))
        count = (
            Attendance.objects.filter(
                application__volunteer=volunteer,
                application__status=Application.Status.ACCEPTED,
                status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED],
                application__mission__event__category__name__iexact=category_name,
            )
            .values("application__mission__event_id")
            .distinct()
            .count()
        )
        return count >= min_count
    if condition_type == "attendance_rate":
        accepted = Application.objects.filter(volunteer=volunteer, status=Application.Status.ACCEPTED).count()
        if accepted == 0:
            return False
        attended = Attendance.objects.filter(
            application__volunteer=volunteer,
            application__status=Application.Status.ACCEPTED,
            status__in=[Attendance.Status.ATTENDED, Attendance.Status.COMPLETED],
        ).count()
        return (attended / accepted) * 100 >= float(condition.get("min_rate", 80))
    if condition_type == "manual":
        return False
    return False


def award_badge(volunteer: Volunteer, badge: Badge) -> VolunteerBadge | None:
    volunteer_badge, created = VolunteerBadge.objects.get_or_create(volunteer=volunteer, badge=badge)
    if created:
        Notification.objects.create(
            user=volunteer.user,
            type="badge_awarded",
            content=f"Vous avez débloqué le badge {badge.name} !",
        )
    return volunteer_badge if created else None


def award_badges_for_volunteer(volunteer: Volunteer, organisation=None) -> list:
    from django.db.models import Q

    awarded = []
    badges = Badge.objects.filter(is_active=True)
    if organisation:
        badges = badges.filter(Q(organisation__isnull=True) | Q(organisation=organisation))
    else:
        badges = badges.filter(organisation__isnull=True)

    existing_badge_ids = set(volunteer.badges.values_list("badge_id", flat=True))
    for badge in badges:
        if badge.id in existing_badge_ids:
            continue
        if evaluate_badge_condition(volunteer, badge):
            result = award_badge(volunteer, badge)
            if result:
                awarded.append(result)
    return awarded


def sync_mission_dates_for_event(event: Event) -> None:
    event.missions.update(starts_at=event.starts_at, ends_at=event.ends_at)


def build_excel_workbook(title: str, rows: list[list]) -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = title[:31]
    for row in rows:
        worksheet.append([value.strftime("%Y-%m-%d %H:%M") if hasattr(value, "strftime") else value for value in row])
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


DEFAULT_BADGES = [
    {"name": "Premier pas", "description": "Terminez votre première mission.", "condition": {"type": "first_mission"}},
    {"name": "Bénévole Or", "description": "Cumulez 50 heures de bénévolat.", "condition": {"type": "volunteer_hours", "min_hours": 50}},
    {"name": "Fidélité", "description": "Participez à 3 missions avec la même organisation.", "condition": {"type": "loyalty", "min_count": 3}},
    {"name": "10 heures de bénévolat", "description": "Cumulez 10 heures de bénévolat.", "condition": {"type": "volunteer_hours", "min_hours": 10}},
    {"name": "100 heures de bénévolat", "description": "Cumulez 100 heures de bénévolat.", "condition": {"type": "volunteer_hours", "min_hours": 100}},
    {"name": "Héros de l'environnement", "description": "Participez à 3 événements environnementaux.", "condition": {"type": "category_events", "category": "Environnement", "min_count": 3}},
    {"name": "Soutien à l'éducation", "description": "Participez à 3 événements éducatifs.", "condition": {"type": "category_events", "category": "Education", "min_count": 3}},
    {"name": "Champion communautaire", "description": "Terminez 5 événements de bénévolat.", "condition": {"type": "completed_events", "min_count": 5}},
]

BADGE_RENAMES = {
    "First Volunteer Mission": "Premier pas",
    "50 Volunteer Hours": "Bénévole Or",
    "10 Volunteer Hours": "10 heures de bénévolat",
    "100 Volunteer Hours": "100 heures de bénévolat",
    "Environmental Hero": "Héros de l'environnement",
    "Education Supporter": "Soutien à l'éducation",
    "Community Champion": "Champion communautaire",
    "Top Volunteer": "Bénévole exemplaire",
}


def ensure_default_badges() -> None:
    for old_name, new_name in BADGE_RENAMES.items():
        Badge.objects.filter(name=old_name, organisation__isnull=True).update(name=new_name)
    for badge_data in DEFAULT_BADGES:
        Badge.objects.get_or_create(
            name=badge_data["name"],
            organisation=None,
            defaults={"description": badge_data["description"], "condition": badge_data["condition"]},
        )


def build_badge_progress(volunteer: Volunteer) -> list[dict]:
    ensure_default_badges()
    earned = {
        entry.badge_id: entry
        for entry in VolunteerBadge.objects.filter(volunteer=volunteer).select_related("badge", "badge__organisation")
    }
    hours = calculate_volunteer_hours(volunteer)
    completed = count_completed_events(volunteer)
    loyalty = max_loyalty_count(volunteer)
    badges = list(Badge.objects.filter(is_active=True, organisation__isnull=True))
    earned_org_badges = [entry.badge for entry in earned.values() if entry.badge.organisation_id]
    seen = {badge.id for badge in badges}
    for badge in earned_org_badges:
        if badge.id not in seen:
            badges.append(badge)
            seen.add(badge.id)

    items = []
    for badge in badges:
        volunteer_badge = earned.get(badge.id)
        condition = badge.condition or {}
        condition_type = condition.get("type", "")
        current = 0.0
        target = 1.0
        if condition_type == "first_mission":
            current, target = float(min(completed, 1)), 1.0
        elif condition_type == "volunteer_hours":
            current, target = float(hours), float(condition.get("min_hours", 50))
        elif condition_type == "loyalty":
            current, target = float(loyalty), float(condition.get("min_count", 3))
        elif condition_type == "completed_events":
            current, target = float(completed), float(condition.get("min_count", 1))
        elif condition_type == "category_events":
            current, target = 0.0, float(condition.get("min_count", 1))
            if evaluate_badge_condition(volunteer, badge):
                current = target
        elif condition_type == "attendance_rate":
            current, target = 0.0, float(condition.get("min_rate", 80))
            if evaluate_badge_condition(volunteer, badge):
                current = target
        elif condition_type == "manual":
            current, target = (1.0 if volunteer_badge else 0.0), 1.0
        remaining = max(target - current, 0)
        if volunteer_badge:
            label = "Badge débloqué"
        elif condition_type == "first_mission":
            label = "Terminez votre première mission pour débloquer"
        elif condition_type == "volunteer_hours":
            label = f"Reste {int(remaining)} h pour débloquer"
        elif condition_type in {"loyalty", "completed_events", "category_events"}:
            missions_left = int(remaining)
            label = f"Reste {missions_left} mission{'s' if missions_left != 1 else ''} pour débloquer"
        elif condition_type == "manual":
            label = "Décerné manuellement par une organisation"
        else:
            label = "En cours"
        items.append(
            {
                "badge": badge,
                "earned": bool(volunteer_badge),
                "awarded_at": volunteer_badge.awarded_at if volunteer_badge else None,
                "current": round(current, 1),
                "target": round(target, 1),
                "progress_label": label,
            }
        )
    items.sort(key=lambda item: (not item["earned"], item["badge"].name))
    return items
