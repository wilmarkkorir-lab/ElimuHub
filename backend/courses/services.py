"""Progress calculations shared by serializers and views."""
from .models import Lesson, LessonProgress


def course_progress(user, course):
    """Progress = lessons completed + quizzes passed + assignments submitted, over everything available."""
    from assessments.models import Assignment, QuizAttempt, Quiz, Submission

    total_lessons = Lesson.objects.filter(module__course=course).count()
    done_lessons = LessonProgress.objects.filter(student=user, lesson__module__course=course).count()

    total_quizzes = Quiz.objects.filter(course=course, is_published=True).count()
    passed_quizzes = (
        QuizAttempt.objects.filter(student=user, quiz__course=course, quiz__is_published=True, passed=True)
        .values("quiz").distinct().count()
    )

    total_assignments = Assignment.objects.filter(course=course).count()
    done_assignments = Submission.objects.filter(student=user, assignment__course=course).count()

    total = total_lessons + total_quizzes + total_assignments
    done = done_lessons + passed_quizzes + done_assignments
    return {
        "percent": round(100 * done / total) if total else 0,
        "lessons": {"done": done_lessons, "total": total_lessons},
        "quizzes": {"done": passed_quizzes, "total": total_quizzes},
        "assignments": {"done": done_assignments, "total": total_assignments},
        "completed": bool(total) and done >= total,
    }


def owns_course(user, course):
    return user.is_superuser or course.instructor_id == user.id


def is_enrolled(user, course):
    return course.enrollments.filter(student=user).exists()
