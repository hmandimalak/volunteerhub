from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0006_badges_certificates_org_signature"),
    ]

    operations = [
        migrations.AddField(
            model_name="volunteer",
            name="emergency_contact_name",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="volunteer",
            name="emergency_contact_phone",
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
