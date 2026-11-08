from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import IsInstructor
from courses.services import is_enrolled, owns_course

from .models import Assignment, Choice, Question, Quiz, QuizAttempt, Submission
from .serializers import AssignmentSerializer, QuizAttemptSerializer, QuizSerializer, SubmissionSerializer

WRITE_ACTIONS = ("create", "update", "partial_update", "destroy")


class CourseScopedMixin:
    """Instructors see their own courses' items; students see items of courses they're enrolled in."""
    model = None
    filterset_fields = ["course"]
    pagination_class = None

    def scoped(self, qs):
        u = self.request.user
        if u.is_superuser:
            return qs
        if u.is_instructor:
            return qs.filter(course__instructor=u)
        return qs.filter(course__enrollments__student=u, course__is_published=True)

    def get_permissions(self):
        if self.action in WRITE_ACTIONS:
            return [IsInstructor()]
        return [permissions.IsAuthenticated()]

    def _check_course(self, course):
        if not owns_course(self.request.user, course):
            raise PermissionDenied("Not your course.")

    def perform_create(self, serializer):
        self._check_course(serializer.validated_data["course"])
        serializer.save()

    def perform_update(self, serializer):
        self._check_course(serializer.instance.course)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_course(instance.course)
        instance.delete()


class QuizViewSet(CourseScopedMixin, viewsets.ModelViewSet):
    serializer_class = QuizSerializer

    def get_queryset(self):
        qs = self.scoped(Quiz.objects.prefetch_related("questions__choices")).distinct()
        if not self.request.user.is_instructor:
            qs = qs.filter(is_published=True)
        return qs

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        if not is_enrolled(request.user, quiz.course):
            raise PermissionDenied("Enroll in this course first.")
        answers = request.data.get("answers") or {}
        if not isinstance(answers, dict):
            raise ValidationError("answers must be an object of {questionId: choiceId}.")

        score = total = 0
        review = []
        for q in quiz.questions.prefetch_related("choices"):
            total += q.points
            correct_ids = {c.id for c in q.choices.all() if c.is_correct}
            try:
                chosen = int(answers.get(str(q.id)))
            except (TypeError, ValueError):
                chosen = None
            ok = chosen in correct_ids
            if ok:
                score += q.points
            review.append({"question": q.id, "chosen": chosen, "correct_choices": sorted(correct_ids), "is_correct": ok})

        pct = round(100 * score / total) if total else 0
        attempt = QuizAttempt.objects.create(
            quiz=quiz, student=request.user, score=score, total=total, percentage=pct,
            passed=pct >= quiz.pass_mark, answers={str(k): v for k, v in answers.items()},
        )
        data = QuizAttemptSerializer(attempt).data
        data["review"] = review
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def attempts(self, request, pk=None):
        quiz = self.get_object()
        qs = quiz.attempts.select_related("student", "quiz")
        if not (request.user.is_instructor and owns_course(request.user, quiz.course)):
            qs = qs.filter(student=request.user)
        data = QuizAttemptSerializer(qs, many=True).data
        for row, obj in zip(data, qs):
            row["student_name"] = obj.student.display_name
        return Response(data)


class AssignmentViewSet(CourseScopedMixin, viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return self.scoped(Assignment.objects.all()).distinct()

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        assignment = self.get_object()
        if not is_enrolled(request.user, assignment.course):
            raise PermissionDenied("Enroll in this course first.")
        text = request.data.get("text_answer", "")
        upload = request.FILES.get("file")
        if not text.strip() and not upload:
            raise ValidationError("Write an answer or attach a file.")
        existing = Submission.objects.filter(assignment=assignment, student=request.user).first()
        if existing and existing.graded_at:
            raise ValidationError("This submission has already been graded and can't be changed.")
        sub = existing or Submission(assignment=assignment, student=request.user)
        sub.text_answer = text
        if upload:
            if upload.size > 10 * 1024 * 1024:
                raise ValidationError("File is larger than 10 MB.")
            sub.file = upload
        sub.save()
        return Response(SubmissionSerializer(sub, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def submissions(self, request, pk=None):
        assignment = self.get_object()
        if not (request.user.is_instructor and owns_course(request.user, assignment.course)):
            raise PermissionDenied("Instructor access required.")
        qs = assignment.submissions.select_related("student")
        return Response(SubmissionSerializer(qs, many=True, context={"request": request}).data)


class SubmissionViewSet(viewsets.GenericViewSet):
    queryset = Submission.objects.select_related("assignment__course", "student")
    serializer_class = SubmissionSerializer

    @action(detail=True, methods=["post"], permission_classes=[IsInstructor])
    def grade(self, request, pk=None):
        sub = self.get_object()
        if not owns_course(request.user, sub.assignment.course):
            raise PermissionDenied("Not your course.")
        try:
            score = int(request.data.get("score"))
        except (TypeError, ValueError):
            raise ValidationError("score must be a whole number.")
        if not 0 <= score <= sub.assignment.max_score:
            raise ValidationError(f"Score must be between 0 and {sub.assignment.max_score}.")
        sub.score = score
        sub.feedback = request.data.get("feedback", "")
        sub.graded_at = timezone.now()
        sub.save()
        return Response(SubmissionSerializer(sub, context={"request": request}).data)
