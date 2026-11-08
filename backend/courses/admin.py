from django.contrib import admin
from .models import Category, Course, Enrollment, Lesson, LessonProgress, Module


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "instructor", "level", "is_published", "created_at")
    list_filter = ("is_published", "level", "category")
    search_fields = ("title",)
    inlines = [ModuleInline]


admin.site.register([Category, Module, Lesson, Enrollment, LessonProgress])
