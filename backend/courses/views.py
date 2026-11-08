from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.permissions import IsInstructor

from .models import Category, Course, Enrollment, Lesson, LessonProgress, Module
from .serializers import (
    CategorySerializer, CourseDetailSerializer, CourseSerializer, LessonSerializer, ModuleSerializer,
)
from .services import course_progress, is_enrolled, owns_course


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [IsInstructor()]


class CourseViewSet(viewsets.ModelViewSet):
    filterset_fields = ["category", "level"]

    def get_queryset(self):
        user = self.request.user
        qs = Course.objects.select_related("category", "instructor").annotate(
            lesson_count=Count("modules__lessons", distinct=True),
            student_count=Count("enrollments", distinct=True),
        )
        if not user.is_superuser:
            if user.is_instructor:
                qs = qs.filter(Q(is_published=True) | Q(instructor=user))
            else:
                qs = qs.filter(is_published=True)
        params = self.request.query_params
        if params.get("mine"):
            qs = qs.filter(instructor=user)
        if params.get("enrolled"):
            qs = qs.filter(enrollments__student=user)
        if params.get("q"):
            qs = qs.filter(Q(title__icontains=params["q"]) | Q(description__icontains=params["q"]))
        return qs

    def get_serializer_class(self):
        return CourseDetailSerializer if self.action == "retrieve" else CourseSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "students"):
            return [IsInstructor()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    def _check_owner(self, course):
        if not owns_course(self.request.user, course):
            raise PermissionDenied("You can only modify your own courses.")

    def perform_update(self, serializer):
        self._check_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_owner(instance)
        instance.delete()

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        course = self.get_object()
        if request.user.is_instructor and owns_course(request.user, course):
            raise ValidationError("You teach this course.")
        Enrollment.objects.get_or_create(student=request.user, course=course)
        return Response({"enrolled": True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def unenroll(self, request, pk=None):
        course = self.get_object()
        Enrollment.objects.filter(student=request.user, course=course).delete()
        return Response({"enrolled": False})

    @action(detail=True, methods=["get"])
    def progress(self, request, pk=None):
        course = self.get_object()
        return Response(course_progress(request.user, course))

    @action(detail=True, methods=["get"])
    def students(self, request, pk=None):
        course = self.get_object()
        self._check_owner(course)
        from assessments.models import QuizAttempt

        rows = []
        for e in course.enrollments.select_related("student"):
            avg = QuizAttempt.objects.filter(student=e.student, quiz__course=course).aggregate(a=Avg("percentage"))["a"]
            rows.append({
                "id": e.student.id,
                "name": e.student.display_name,
                "email": e.student.email,
                "enrolled_at": e.enrolled_at,
                "progress": course_progress(e.student, course)["percent"],
                "quiz_average": round(avg) if avg is not None else None,
            })
        return Response(rows)


class ModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleSerializer
    permission_classes = [IsInstructor]
    filterset_fields = ["course"]
    pagination_class = None

    def get_queryset(self):
        qs = Module.objects.prefetch_related("lessons")
        u = self.request.user
        return qs if u.is_superuser else qs.filter(course__instructor=u)

    def perform_create(self, serializer):
        if not owns_course(self.request.user, serializer.validated_data["course"]):
            raise PermissionDenied("Not your course.")
        serializer.save()


class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    filterset_fields = ["module"]
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve", "complete", "uncomplete"):
            return [permissions.IsAuthenticated()]
        return [IsInstructor()]

    def get_queryset(self):
        u = self.request.user
        qs = Lesson.objects.select_related("module")
        if u.is_superuser:
            return qs
        if u.is_instructor:
            return qs.filter(Q(module__course__instructor=u) | Q(module__course__enrollments__student=u)).distinct()
        return qs.filter(module__course__enrollments__student=u, module__course__is_published=True).distinct()

    def perform_create(self, serializer):
        if not owns_course(self.request.user, serializer.validated_data["module"].course):
            raise PermissionDenied("Not your course.")
        serializer.save()

    def perform_update(self, serializer):
        if not owns_course(self.request.user, serializer.instance.module.course):
            raise PermissionDenied("Not your course.")
        serializer.save()

    def perform_destroy(self, instance):
        if not owns_course(self.request.user, instance.module.course):
            raise PermissionDenied("Not your course.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        lesson = self.get_object()
        course = lesson.module.course
        if not is_enrolled(request.user, course):
            raise PermissionDenied("Enroll in this course first.")
        LessonProgress.objects.get_or_create(student=request.user, lesson=lesson)
        return Response(course_progress(request.user, course))

    @action(detail=True, methods=["post"])
    def uncomplete(self, request, pk=None):
        lesson = self.get_object()
        LessonProgress.objects.filter(student=request.user, lesson=lesson).delete()
        return Response(course_progress(request.user, lesson.module.course))


@api_view(["GET"])
def dashboard(request):
    from assessments.models import Assignment, QuizAttempt, Submission

    user = request.user

    if user.is_instructor:
        courses = Course.objects.all() if user.is_superuser else Course.objects.filter(instructor=user)
        pending = Submission.objects.filter(assignment__course__in=courses, score__isnull=True)
        rows = []
        for c in courses.annotate(students=Count("enrollments", distinct=True)):
            rows.append({"id": c.id, "title": c.title, "is_published": c.is_published, "students": c.students})
        return Response({
            "role": "instructor",
            "stats": {
                "courses": courses.count(),
                "students": Enrollment.objects.filter(course__in=courses).values("student").distinct().count(),
                "pending_grading": pending.count(),
            },
            "courses": rows,
            "pending_submissions": [
                {"id": s.id, "assignment_id": s.assignment_id, "assignment": s.assignment.title, "course_id": s.assignment.course_id,
                 "student": s.student.display_name, "submitted_at": s.submitted_at}
                for s in pending.select_related("assignment", "student")[:8]
            ],
        })

    enrollments = Enrollment.objects.filter(student=user).select_related("course", "course__instructor")
    items = []
    for e in enrollments:
        items.append({
            "id": e.course.id, "title": e.course.title, "instructor": e.course.instructor.display_name,
            "progress": course_progress(user, e.course),
        })
    enrolled_ids = [e.course_id for e in enrollments]
    submitted = Submission.objects.filter(student=user).values_list("assignment_id", flat=True)
    upcoming = (Assignment.objects.filter(course_id__in=enrolled_ids, due_date__gte=timezone.now())
                .exclude(id__in=submitted).order_by("due_date")[:6])
    attempts = QuizAttempt.objects.filter(student=user).select_related("quiz").order_by("-submitted_at")[:5]
    avg = QuizAttempt.objects.filter(student=user).aggregate(a=Avg("percentage"))["a"]
    return Response({
        "role": "student",
        "stats": {
            "enrolled": len(items),
            "completed": sum(1 for i in items if i["progress"]["completed"]),
            "quiz_average": round(avg) if avg is not None else None,
        },
        "courses": items,
        "upcoming_assignments": [
            {"id": a.id, "title": a.title, "course_id": a.course_id, "due_date": a.due_date} for a in upcoming
        ],
        "recent_quizzes": [
            {"id": a.id, "quiz": a.quiz.title, "course_id": a.quiz.course_id, "percentage": a.percentage,
             "passed": a.passed, "submitted_at": a.submitted_at} for a in attempts
        ],
    })
