from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == "admin" or request.user.is_staff or request.user.is_superuser)
        )


class IsOrganisation(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == "organisation")


class IsVerifiedOrganisation(BasePermission):
    message = "Votre organisation doit etre approuvee avant d'acceder a cette fonctionnalite."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == "admin" or request.user.is_staff or request.user.is_superuser:
            return True
        if request.user.role != "organisation":
            return False
        organisation = getattr(request.user, "organisation", None)
        return bool(organisation and organisation.is_verified)


class IsVerifiedOrganisationOperator(BasePermission):
    message = "Action reservee a l'organisation proprietaire. L'administration est en lecture seule."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role != "organisation":
            return False
        organisation = getattr(request.user, "organisation", None)
        return bool(organisation and organisation.is_verified)


class IsVolunteer(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.role == "benevole")


class ReadOnlyOrAuthenticated(BasePermission):
    def has_permission(self, request, view) -> bool:
        return request.method in SAFE_METHODS or bool(request.user and request.user.is_authenticated)


class OrganisationOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == "admin" or request.user.is_staff or request.user.is_superuser:
            return True
        organisation = getattr(obj, "organisation", obj)
        if hasattr(obj, "event"):
            organisation = obj.event.organisation
        if hasattr(obj, "mission"):
            organisation = obj.mission.event.organisation
        return getattr(organisation, "user_id", None) == request.user.id
