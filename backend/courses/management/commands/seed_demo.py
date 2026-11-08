from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from assessments.models import Assignment, Choice, Question, Quiz
from courses.models import Category, Course, Lesson, Module

User = get_user_model()


class Command(BaseCommand):
    help = "Create demo users and a sample course"

    def handle(self, *args, **opts):
        def user(username, role, first, last, **extra):
            u, created = User.objects.get_or_create(
                username=username, defaults={"email": f"{username}@elimuhub.test", "role": role,
                                             "first_name": first, "last_name": last, **extra})
            if created:
                u.set_password("Elimu12345!")
                u.save()
            return u

        admin = user("admin", "admin", "Site", "Admin", is_staff=True, is_superuser=True)
        teacher = user("amina", "instructor", "Amina", "Wanjiru")
        user("brian", "student", "Brian", "Otieno")

        cat, _ = Category.objects.get_or_create(name="Programming")
        if Course.objects.filter(title="Python for Beginners").exists():
            self.stdout.write("Demo data already present.")
            return

        course = Course.objects.create(
            title="Python for Beginners", instructor=teacher, category=cat, is_published=True,
            description="Learn Python from zero: variables, control flow, functions and data structures.")
        m1 = Module.objects.create(course=course, title="Getting started", order=1)
        m2 = Module.objects.create(course=course, title="Control flow", order=2)
        Lesson.objects.create(module=m1, order=1, title="What is Python?", duration_minutes=8,
                              content="Python is a readable, general purpose language used for web, data and automation.")
        Lesson.objects.create(module=m1, order=2, title="Variables and types", duration_minutes=12,
                              content="Variables store values. Python has int, float, str, bool, list, dict and more.")
        Lesson.objects.create(module=m2, order=1, title="Conditionals", duration_minutes=10,
                              content="Use if / elif / else to branch your program.")
        Lesson.objects.create(module=m2, order=2, title="Loops", duration_minutes=15,
                              content="Use for loops to iterate and while loops to repeat until a condition changes.")

        quiz = Quiz.objects.create(course=course, title="Python basics check", pass_mark=60, time_limit_minutes=10)
        data = [
            ("Which keyword defines a function?", ["def", "func", "function", "lambda"], 0),
            ("What is the type of 3.14?", ["int", "float", "str", "decimal"], 1),
            ("Which loop repeats while a condition is true?", ["for", "while", "repeat", "loop"], 1),
        ]
        for i, (text, choices, correct) in enumerate(data):
            q = Question.objects.create(quiz=quiz, text=text, order=i)
            for j, c in enumerate(choices):
                Choice.objects.create(question=q, text=c, is_correct=(j == correct))

        Assignment.objects.create(
            course=course, title="Build a number guessing game", max_score=100,
            due_date=timezone.now() + timedelta(days=7),
            instructions="Write a program that picks a random number from 1 to 100 and lets the user guess until correct.")
        self.stdout.write(self.style.SUCCESS(
            "Demo ready. Logins (password Elimu12345!): admin, amina (instructor), brian (student)"))
