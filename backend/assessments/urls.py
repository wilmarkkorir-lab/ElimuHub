from rest_framework.routers import DefaultRouter

from .views import AssignmentViewSet, QuizViewSet, SubmissionViewSet

router = DefaultRouter()
router.register("quizzes", QuizViewSet, basename="quiz")
router.register("assignments", AssignmentViewSet, basename="assignment")
router.register("submissions", SubmissionViewSet, basename="submission")

urlpatterns = router.urls
