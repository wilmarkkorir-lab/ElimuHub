from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from assessments.models import Choice, Question, Quiz
from courses.models import Course, Lesson, Module

User = get_user_model()


class LmsFlowTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user("t", "t@x.com", "Passw0rd!x", role="instructor")
        self.student = User.objects.create_user("s", "s@x.com", "Passw0rd!x", role="student")
        self.course = Course.objects.create(title="C", description="d", instructor=self.teacher, is_published=True)
        module = Module.objects.create(course=self.course, title="M")
        self.lesson = Lesson.objects.create(module=module, title="L", content="hi")
        self.quiz = Quiz.objects.create(course=self.course, title="Q", pass_mark=50)
        q = Question.objects.create(quiz=self.quiz, text="1+1?")
        self.right = Choice.objects.create(question=q, text="2", is_correct=True)
        Choice.objects.create(question=q, text="3", is_correct=False)
        self.q = q

    def login(self, user):
        self.client.force_authenticate(user)

    def test_student_cannot_create_course(self):
        self.login(self.student)
        r = self.client.post("/api/courses/", {"title": "x", "description": "y"})
        self.assertEqual(r.status_code, 403)

    def test_enroll_progress_and_quiz(self):
        self.login(self.student)
        self.assertEqual(self.client.get(f"/api/lessons/{self.lesson.id}/").status_code, 404)  # not enrolled
        self.assertEqual(self.client.post(f"/api/courses/{self.course.id}/enroll/").status_code, 201)
        r = self.client.post(f"/api/lessons/{self.lesson.id}/complete/")
        self.assertEqual(r.json()["lessons"]["done"], 1)
        r = self.client.post(f"/api/quizzes/{self.quiz.id}/submit/", {"answers": {str(self.q.id): self.right.id}}, format="json")
        self.assertEqual(r.json()["percentage"], 100)
        self.assertTrue(r.json()["passed"])
        self.assertEqual(self.client.get(f"/api/courses/{self.course.id}/progress/").json()["percent"], 100)

    def test_answers_hidden_from_students(self):
        self.login(self.student)
        self.client.post(f"/api/courses/{self.course.id}/enroll/")
        data = self.client.get(f"/api/quizzes/{self.quiz.id}/").json()
        self.assertNotIn("is_correct", data["questions"][0]["choices"][0])

    def test_other_instructor_cannot_edit(self):
        other = User.objects.create_user("o", "o@x.com", "Passw0rd!x", role="instructor")
        self.login(other)
        r = self.client.patch(f"/api/courses/{self.course.id}/", {"title": "hack"})
        self.assertIn(r.status_code, (403, 404))
