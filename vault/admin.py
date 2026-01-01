from django.contrib import admin
from .models import Bookmark, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    search_fields = ("name",)


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ("title", "url", "updated_at")
    search_fields = ("title", "url", "notes")
    list_filter = ("tags",)
