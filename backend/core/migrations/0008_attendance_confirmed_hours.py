from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_volunteer_emergency_contact"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendance",
            name="confirmed_hours",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=6, null=True),
        ),
    ]
