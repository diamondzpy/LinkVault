from django.urls import path
from . import views

urlpatterns = [
    path("bookmarks/", views.bookmark_list_create),
    path("bookmarks/<int:bookmark_id>/", views.bookmark_detail),
]
