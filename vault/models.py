from django.db import models

class Tag(models.Model):
    name = models.CharField(max_length=20, unique=True)

    def __str__(self) -> str:
        return self.name


class Bookmark(models.Model):
    url = models.URLField(unique=True)
    title = models.CharField(max_length=120)
    notes = models.TextField(blank=True)

    tags = models.ManyToManyField(Tag, blank=True, related_name="bookmarks")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.title
