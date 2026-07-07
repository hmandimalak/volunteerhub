from io import BytesIO

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.utils import timezone
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from .models import Application, Attendance, Certificate, Event, Volunteer


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
            "Presentez le QR Code joint le jour de l'evenement pour valider votre presence.\n\n"
            f"Code de verification: {attendance.qr_token}\n"
        ),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@volunteerhub.local"),
        to=[application.volunteer.user.email],
    )
    email.attach("volunteerhub-attendance-qr.png", generate_qr_png(attendance), "image/png")
    email.send(fail_silently=True)


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

    pdf.setFont("Helvetica-Bold", 14)
    y -= 0.4 * cm
    pdf.drawString(2 * cm, y, "Indicateurs d'impact")
    y -= 0.8 * cm
    pdf.setFont("Helvetica", 11)
    pdf.drawString(2.4 * cm, y, "Heures, presences et tendances sont calculees a partir des participations validees.")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def build_certificate_pdf(application: Application) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 26)
    pdf.drawCentredString(width / 2, height - 4 * cm, "Certificat de benevolat")

    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 6 * cm, "Ce certificat atteste que")
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(width / 2, height - 7.3 * cm, str(application.volunteer))

    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 8.8 * cm, "a participe a")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(width / 2, height - 10 * cm, application.mission.event.title)

    hours = max((application.mission.ends_at - application.mission.starts_at).total_seconds() / 3600, 0)
    pdf.setFont("Helvetica", 12)
    pdf.drawCentredString(width / 2, height - 11.4 * cm, f"Mission: {application.mission.name}")
    pdf.drawCentredString(width / 2, height - 12.2 * cm, f"Date: {application.mission.starts_at.strftime('%d/%m/%Y')}")
    pdf.drawCentredString(width / 2, height - 13 * cm, f"Heures realisees: {hours:.1f} h")
    pdf.drawCentredString(width / 2, height - 14.2 * cm, f"Organisation: {application.mission.event.organisation.name}")

    pdf.setFont("Helvetica-Oblique", 10)
    pdf.drawCentredString(width / 2, 3 * cm, "Document genere automatiquement par VolunteerHub")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def save_certificate(application: Application) -> Certificate:
    certificate, created = Certificate.objects.get_or_create(
        volunteer=application.volunteer,
        event=application.mission.event,
        defaults={"pdf": ""},
    )
    if created or not certificate.pdf:
        certificate.pdf.save(
            f"certificate-{application.volunteer_id}-{application.mission.event_id}.pdf",
            ContentFile(build_certificate_pdf(application)),
            save=True,
        )
    return certificate


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
