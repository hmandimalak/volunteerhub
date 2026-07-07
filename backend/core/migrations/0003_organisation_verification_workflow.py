# Generated manually for organization verification workflow.

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_organisation_category_type_organisation_phone_number_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="organisation",
            name="validation_status",
            field=models.CharField(
                choices=[
                    ("en_attente", "En attente"),
                    ("validee", "Validee"),
                    ("refusee", "Refusee"),
                    ("documents_requis", "Documents requis"),
                ],
                default="en_attente",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="organisation",
            name="verification_requested_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name="organisation",
            name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="organisation",
            name="review_reason",
            field=models.TextField(blank=True),
        ),
        migrations.CreateModel(
            name="OrganisationDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file", models.FileField(upload_to="organisations/verification_documents/")),
                ("label", models.CharField(blank=True, max_length=120)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "organisation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to="core.organisation",
                    ),
                ),
            ],
        ),
    ]
