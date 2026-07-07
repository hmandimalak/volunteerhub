import uuid

from django.db import migrations, models


def populate_qr_tokens(apps, schema_editor):
    Attendance = apps.get_model("core", "Attendance")
    for attendance in Attendance.objects.filter(qr_token__isnull=True):
        attendance.qr_token = uuid.uuid4()
        attendance.save(update_fields=["qr_token"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0004_attendance_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendance",
            name="qr_token",
            field=models.UUIDField(default=None, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="attendance",
            name="qr_code",
            field=models.ImageField(blank=True, upload_to="attendance/qr_codes/"),
        ),
        migrations.RunPython(populate_qr_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="attendance",
            name="qr_token",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
