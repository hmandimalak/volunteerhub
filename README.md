# VolunteerHub

VolunteerHub est une plateforme web de gestion des benevoles pour associations, ONG, refuges, organisations caritatives et organisateurs d'evenements.

Le projet contient un backend Django REST Framework et un frontend Next.js. L'application mobile est volontairement exclue du perimetre.

## Perimetre MVP

- Authentification JWT.
- Roles `admin`, `organisation` et `benevole`.
- Profils organisations et benevoles.
- Evenements, missions, competences et candidatures.
- Acceptation/refus des candidatures.
- Presence manuelle ou QR Code cote API.
- Notifications, messages, annonces et signalements.
- Badges, certificats et statistiques de base.
- Landing page, catalogue d'evenements et dashboards web de demonstration.

## Structure

```text
backend/
  core/              Domaine VolunteerHub et API REST
  volunteerhub/      Configuration Django
  requirements.txt
frontend/
  app/               Pages Next.js App Router
  lib/               Donnees mock et futurs clients API
  package.json
```

## Installation backend locale

Prerequis :

- Python 3.11+
- PostgreSQL local
- Un utilisateur/base PostgreSQL pour `volunteerhub`

Commandes PowerShell :

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo
python manage.py createsuperuser
python manage.py runserver
```

L'API sera disponible sur `http://127.0.0.1:8000/api/`.

## Installation frontend locale

Prerequis :

- Node.js 20+
- npm

Commandes PowerShell :

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

L'interface web sera disponible sur `http://localhost:3000`.

## Roles et inscription

L'application utilise un seul ecran de connexion (`/login`) mais des acces differents selon le role.

- `Administrateur` : compte cree depuis Django Admin ou par un administrateur existant. Il peut acceder aux pages admin, gerer les utilisateurs et valider les organisations.
- `Organisation` : inscription via `/register`, avec nom, description, type, telephone, adresse, site web et un ou plusieurs documents officiels obligatoires. Le compte est cree en statut `en_attente`.
- `Benevole` : inscription via `/register`, avec nom, date de naissance, telephone, localisation, competences, centres d'interet, disponibilites et photo optionnelle.

Apres connexion :

- Un benevole est redirige vers `/events` et peut acceder a `/volunteer` et `/volunteer/applications`.
- Une organisation est redirigee vers `/organisation` et peut acceder aux pages de creation d'evenements, de missions et de gestion des candidatures.
- Un administrateur est redirige vers `/admin` et peut acceder a toutes les pages d'administration.

## Verification des organisations

Les organisations ne sont pas activees immediatement apres inscription.

1. L'organisation s'inscrit sur `/register` et doit fournir un ou plusieurs documents officiels.
2. Son compte utilisateur passe en statut `en_attente`.
3. Son profil organisation passe en statut `en_attente`.
4. Une notification est creee pour les administrateurs.
5. L'organisation peut se connecter pour voir son statut, mais ne peut pas creer d'evenements, missions ou gerer les candidatures tant qu'elle n'est pas approuvee.
6. L'admin verifie la demande sur `/admin/organisations`.

Actions admin disponibles :

- Approuver : passe l'organisation en `validee`, active le compte et notifie l'organisation.
- Refuser : passe l'organisation en `refusee`, stocke un motif et notifie l'organisation.
- Demander documents : passe l'organisation en `documents_requis`, stocke un motif et notifie l'organisation.

L'organisation peut envoyer des documents complementaires depuis `/organisation`. Sa demande repasse alors en verification.

Endpoints principaux :

- `GET /api/organisations/pending/`
- `GET /api/organisations/me/`
- `PATCH /api/organisations/{id}/approve/`
- `PATCH /api/organisations/{id}/reject/`
- `PATCH /api/organisations/{id}/request-documents/`
- `POST /api/organisations/{id}/documents/`

## Test du flux dynamique

1. Lancez le backend sur `http://127.0.0.1:8000`.
2. Lancez le frontend sur `http://localhost:3000`.
3. Connectez-vous sur `http://localhost:3000/login` avec un utilisateur Django.
4. Ouvrez `http://localhost:3000/events` pour charger les evenements depuis l'API.
5. Ouvrez `http://localhost:3000/admin`, `http://localhost:3000/organisation` ou `http://localhost:3000/volunteer` pour charger les statistiques protegees par JWT.

Pour voir rapidement des donnees dans le catalogue, lancez :

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py seed_demo
```

La commande cree deux comptes de test :

- `organisation@volunteerhub.test` / `password123`
- `benevole@volunteerhub.test` / `password123`

## Ecrans web connectes

### Benevole

- `/events` : liste les evenements depuis l'API et permet de candidater aux missions.
- `/volunteer` : affiche les statistiques personnelles du benevole connecte.
- `/volunteer/applications` : affiche l'historique des candidatures.

### Organisation

- `/organisation` : affiche les statistiques d'organisation.
- `/organisation/events` : liste les evenements de l'organisation et affiche les participants acceptes par evenement.
- `/organisation/events/new` : cree un evenement et une premiere mission.
- `/organisation/missions/new` : ajoute une mission a un evenement existant.
- `/organisation/volunteers` : gere les candidatures benevoles en attente, avec acceptation, refus et consultation du profil benevole.

### Admin

- `/admin` : affiche les statistiques globales.
- `/admin/organisations` : gere les organisations en attente, approuvees et rejetees.
- `/admin/events` : liste globale des evenements.
- `/admin/reports` : statistiques et rapports plateforme.

La navigation administrateur contient uniquement :

- Dashboard Overview
- Organizations Management
- Events Management
- Reports & Analytics

Dans `/admin/organisations`, l'administrateur peut :

- Consulter les organisations en attente, approuvees et rejetees.
- Voir nom, type, email, telephone, adresse, statut et date d'inscription.
- Approuver, refuser, suspendre ou supprimer une organisation.
- Ouvrir les details d'une organisation avec documents, statistiques, nombre d'evenements et nombre de benevoles.
- Cliquer sur `View Events` pour afficher les evenements de cette organisation.
- Cliquer sur `View Volunteers` sur un evenement pour afficher les benevoles inscrits a cet evenement.

### Isolation des benevoles par organisation

- L'admin voit tous les benevoles de la plateforme.
- Dans l'interface admin, les benevoles sont consultes depuis la fiche de leur organisation.
- Une organisation voit uniquement les benevoles qui ont candidate a ses propres missions.
- Une organisation gere les candidatures en attente depuis `/organisation/volunteers`.
- Une organisation peut accepter ou refuser les candidatures de ses propres missions ; le benevole est notifie automatiquement.
- Une organisation suit les participants acceptes depuis `/organisation/events` via `View Participants`.
- Depuis la liste des participants, l'organisation peut confirmer la participation, marquer un benevole present, terminer sa participation ou le marquer absent. Le benevole est notifie automatiquement.
- Une organisation ne peut pas consulter ni gerer les benevoles lies aux missions d'une autre organisation.

## Endpoints principaux

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `GET /api/users/me/`
- `GET /api/organisations/`
- `PATCH /api/organisations/{id}/validate/`
- `GET /api/evenements/`
- `GET /api/evenements/near/`
- `GET /api/evenements/{id}/missions/`
- `POST /api/evenements/{id}/missions/`
- `GET /api/missions/`
- `POST /api/missions/{id}/candidater/`
- `PATCH /api/candidatures/{id}/accepter/`
- `PATCH /api/candidatures/{id}/refuser/`
- `POST /api/candidatures/{id}/presence/`
- `GET /api/stats/admin/overview/`
- `GET /api/stats/organisation/{id}/overview/`
- `GET /api/stats/benevole/me/`

## Hors perimetre

- Application mobile React Native.
- Notifications push natives.
- Mode hors-ligne mobile.
- Synchronisation mobile.
- Packaging Docker ou Docker Compose.

Ces elements pourront etre ajoutes plus tard, mais ne font pas partie de cette base.
