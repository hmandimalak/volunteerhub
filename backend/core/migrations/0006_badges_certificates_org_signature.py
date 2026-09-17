import uuid

from django.db import migrations, models
import django.db.models.deletion


def populate_certificate_verification_ids(apps, schema_editor):
    Certificate = apps.get_model("core", "Certificate")
    for certificate in Certificate.objects.filter(verification_id__isnull=True):
        certificate.verification_id = uuid.uuid4()
        certificate.save(update_fields=["verification_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_attendance_qr_code"),
    ]

    operations = [
        migrations.AddField(
            model_name="organisation",
            name="signature",
            field=models.ImageField(blank=True, upload_to="organisations/signatures/"),
        ),
        migrations.AddField(
            model_name="badge",
            name="organisation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="badges",
                to="core.organisation",
            ),
        ),
        migrations.AddField(
            model_name="badge",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="certificate",
            name="hours",
            field=models.DecimalField(decimal_places=1, default=0, max_digits=6),
        ),
        migrations.AddField(
            model_name="certificate",
            name="verification_id",
            field=models.UUIDField(default=None, editable=False, null=True),
        ),
        migrations.RunPython(populate_certificate_verification_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="certificate",
            name="verification_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
