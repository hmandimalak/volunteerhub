from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Event, EventCategory, Mission, Organisation, Skill, User, Volunteer


class Command(BaseCommand):
    help = "Create demo data for local VolunteerHub testing."

    def handle(self, *args, **options):
        category, _ = EventCategory.objects.get_or_create(
            name="Social",
            defaults={"icon": "heart", "color": "#0f9668", "active": True},
        )
        Skill.objects.get_or_create(name="Logistique", defaults={"category": "Operation"})
        Skill.objects.get_or_create(name="Accueil", defaults={"category": "Relationnel"})

        org_user, created = User.objects.get_or_create(
            email="organisation@volunteerhub.test",
            defaults={
                "username": "organisation_demo",
                "role": User.Role.ORGANISATION,
                "status": User.Status.ACTIVE,
            },
        )
        if created:
            org_user.set_password("password123")
            org_user.save()

        organisation, _ = Organisation.objects.get_or_create(
            user=org_user,
            defaults={
                "name": "Association Demo Solidaire",
                "description": "Organisation de demonstration pour tester VolunteerHub.",
                "sector": "Social",
                "city": "Lyon",
                "country": "France",
                "validation_status": Organisation.ValidationStatus.APPROVED,
            },
        )

        volunteer_user, created = User.objects.get_or_create(
            email="benevole@volunteerhub.test",
            defaults={
                "username": "benevole_demo",
                "role": User.Role.VOLUNTEER,
                "status": User.Status.ACTIVE,
            },
        )
        if created:
            volunteer_user.set_password("password123")
            volunteer_user.save()

        Volunteer.objects.get_or_create(
            user=volunteer_user,
            defaults={
                "first_name": "Samira",
                "last_name": "Benevole",
                "city": "Lyon",
                "total_points": 120,
            },
        )

        starts_at = timezone.now() + timedelta(days=7)
        event, _ = Event.objects.get_or_create(
            organisation=organisation,
            title="Collecte alimentaire solidaire",
            defaults={
                "category": category,
                "description": "Tri, logistique et distribution pour une collecte locale.",
                "starts_at": starts_at,
                "ends_at": starts_at + timedelta(hours=6),
                "address": "10 rue de la Solidarite",
                "city": "Lyon",
                "country": "France",
                "volunteers_needed": 20,
                "status": Event.Status.PUBLISHED,
            },
        )

        Mission.objects.get_or_create(
            event=event,
            name="Tri des dons",
            defaults={
                "description": "Receptionner et trier les dons alimentaires.",
                "capacity": 10,
                "starts_at": starts_at,
                "ends_at": starts_at + timedelta(hours=3),
                "status": Mission.Status.OPEN,
            },
        )
        Mission.objects.get_or_create(
            event=event,
            name="Accueil des beneficiaires",
            defaults={
                "description": "Orienter les beneficiaires et repondre aux questions.",
                "capacity": 6,
                "starts_at": starts_at + timedelta(hours=3),
                "ends_at": starts_at + timedelta(hours=6),
                "status": Mission.Status.OPEN,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data created."))
        self.stdout.write("Organisation login: organisation@volunteerhub.test / password123")
        self.stdout.write("Volunteer login: benevole@volunteerhub.test / password123")
