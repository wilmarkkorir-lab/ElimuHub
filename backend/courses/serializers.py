from rest_framework import serializers

from .models import Category, Course, Enrollment, Lesson, LessonProgress, Module
from .services import course_progress, is_enrolled


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class LessonBriefSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ("id", "title", "duration_minutes", "order", "completed")

    def get_completed(self, obj):
        done = self.context.get("completed_ids")
        return obj.id in done if done is not None else False


class LessonSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()
    course = serializers.IntegerField(source="module.course_id", read_only=True)

    class Meta:
        model = Lesson
        fields = ("id", "module", "course", "title", "content", "video_url", "duration_minutes", "order", "completed")

    def get_completed(self, obj):
        user = self.context["request"].user
        return LessonProgress.objects.filter(student=user, lesson=obj).exists()


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonBriefSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ("id", "course", "title", "order", "lessons")


class CourseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    instructor_name = serializers.CharField(source="instructor.display_name", read_only=True)
    lesson_count = serializers.IntegerField(read_only=True)
    student_count = serializers.IntegerField(read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id", "title", "slug", "description", "category", "category_name", "level",
            "instructor", "instructor_name", "is_published", "created_at",
            "lesson_count", "student_count", "is_enrolled", "is_owner", "progress",
        )
        read_only_fields = ("slug", "instructor", "created_at")

    def get_is_enrolled(self, obj):
        return is_enrolled(self.context["request"].user, obj)

    def get_is_owner(self, obj):
        u = self.context["request"].user
        return u.is_superuser or obj.instructor_id == u.id

    def get_progress(self, obj):
        user = self.context["request"].user
        if is_enrolled(user, obj):
            return course_progress(user, obj)
        return None


class CourseDetailSerializer(CourseSerializer):
    modules = serializers.SerializerMethodField()

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ("modules",)

    def get_modules(self, obj):
        user = self.context["request"].user
        completed = set(LessonProgress.objects.filter(student=user, lesson__module__course=obj)
                        .values_list("lesson_id", flat=True))
        ctx = {**self.context, "completed_ids": completed}
        return ModuleSerializer(obj.modules.prefetch_related("lessons"), many=True, context=ctx).data


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ("id", "course", "enrolled_at")
