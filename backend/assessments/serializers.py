from django.db.models import Max
from rest_framework import serializers

from .models import Assignment, Choice, Question, Quiz, QuizAttempt, Submission


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ("id", "text", "is_correct")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context["request"].user.is_instructor:
            data.pop("is_correct", None)  # never leak answers to students
        return data


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ("id", "text", "points", "order", "choices")

    def validate_choices(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("Each question needs at least two choices.")
        if not any(c.get("is_correct") for c in value):
            raise serializers.ValidationError("Mark at least one choice as correct.")
        return value


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    question_count = serializers.SerializerMethodField()
    best_percentage = serializers.SerializerMethodField()
    attempts_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ("id", "course", "title", "description", "pass_mark", "time_limit_minutes", "is_published",
                  "questions", "question_count", "best_percentage", "attempts_count")

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_best_percentage(self, obj):
        u = self.context["request"].user
        return obj.attempts.filter(student=u).aggregate(m=Max("percentage"))["m"]

    def get_attempts_count(self, obj):
        return obj.attempts.filter(student=self.context["request"].user).count()

    def validate_pass_mark(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Pass mark must be between 0 and 100.")
        return value

    @staticmethod
    def _save_questions(quiz, questions):
        quiz.questions.all().delete()
        for i, q in enumerate(questions):
            choices = q.pop("choices")
            q.pop("order", None)
            question = Question.objects.create(quiz=quiz, order=i, **q)
            Choice.objects.bulk_create([Choice(question=question, **c) for c in choices])

    def create(self, validated_data):
        questions = validated_data.pop("questions", [])
        quiz = Quiz.objects.create(**validated_data)
        self._save_questions(quiz, questions)
        return quiz

    def update(self, instance, validated_data):
        questions = validated_data.pop("questions", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if questions is not None:
            self._save_questions(instance, questions)
        return instance


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ("id", "quiz", "quiz_title", "score", "total", "percentage", "passed", "submitted_at")


class SubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.display_name", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = ("id", "assignment", "student", "student_name", "text_answer", "file_url",
                  "submitted_at", "score", "feedback", "graded_at")

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class AssignmentSerializer(serializers.ModelSerializer):
    my_submission = serializers.SerializerMethodField()
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ("id", "course", "title", "instructions", "due_date", "max_score", "my_submission", "submission_count")

    def get_my_submission(self, obj):
        sub = obj.submissions.filter(student=self.context["request"].user).first()
        return SubmissionSerializer(sub, context=self.context).data if sub else None

    def get_submission_count(self, obj):
        return obj.submissions.count()
