from rest_framework.permissions import BasePermission


class IsInstructor(BasePermission):
    message = "Instructor access required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_instructor)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or u.role == "admin"))
