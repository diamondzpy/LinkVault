# vault/models.py
from django.db import models

class Tag(models.Model):
    name = models.CharField(max_length=32, unique=True)
    color = models.CharField(max_length=7, default="#94a3b8")  # hex like #RRGGBB

    def __str__(self) -> str:
        return self.name

class Bookmark(models.Model):
    url = models.URLField()
    title = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    tags = models.ManyToManyField(Tag, related_name="bookmarks", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title
