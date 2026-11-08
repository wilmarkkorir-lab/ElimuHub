from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, CourseViewSet, LessonViewSet, ModuleViewSet, dashboard

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("courses", CourseViewSet, basename="course")
router.register("modules", ModuleViewSet, basename="module")
router.register("lessons", LessonViewSet, basename="lesson")

urlpatterns = [path("dashboard/", dashboard)] + router.urls
