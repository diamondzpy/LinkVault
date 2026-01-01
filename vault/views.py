import json
from django.http import JsonResponse, HttpResponseNotAllowed, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404

from .models import Bookmark, Tag


def bookmark_to_dict(b: Bookmark) -> dict:
    return {
        "id": b.id,
        "url": b.url,
        "title": b.title,
        "notes": b.notes,
        "tags": [t.name for t in b.tags.all().order_by("name")],
        "created_at": b.created_at.isoformat(),
        "updated_at": b.updated_at.isoformat(),
    }


def normalize_tag(name: str) -> str:
    return " ".join(name.strip().lower().split())


def get_or_create_tags(tag_names):
    tags = []
    for raw in tag_names:
        n = normalize_tag(raw)
        if not n:
            continue
        if len(n) > 20:
            raise ValueError(f"tag too long: {n}")
        tag, _ = Tag.objects.get_or_create(name=n)
        tags.append(tag)
    # remove duplicates while keeping order
    seen = set()
    unique = []
    for t in tags:
        if t.name not in seen:
            seen.add(t.name)
            unique.append(t)
    return unique


@csrf_exempt
def bookmark_list_create(request):
    if request.method == "GET":
        # Optional filters: ?tag=sports or ?q=keyword
        tag = request.GET.get("tag")
        q = request.GET.get("q")

        qs = Bookmark.objects.all()

        if tag:
            qs = qs.filter(tags__name=normalize_tag(tag))

        if q:
            qs = qs.filter(title__icontains=q) | qs.filter(notes__icontains=q) | qs.filter(url__icontains=q)

        qs = qs.distinct().order_by("-updated_at")

        return JsonResponse([bookmark_to_dict(b) for b in qs], safe=False)

    if request.method == "POST":
        try:
            body = json.loads(request.body.decode("utf-8"))
        except Exception:
            return HttpResponseBadRequest("Invalid JSON")

        url = body.get("url", "").strip()
        title = body.get("title", "").strip()
        notes = body.get("notes", "").strip()
        tag_names = body.get("tags", [])

        if not url or not title:
            return HttpResponseBadRequest("url and title are required")

        try:
            b = Bookmark.objects.create(url=url, title=title, notes=notes)
            tags = get_or_create_tags(tag_names)
            b.tags.set(tags)
            b.save()
        except Exception as e:
            return HttpResponseBadRequest(str(e))

        return JsonResponse(bookmark_to_dict(b), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@csrf_exempt
def bookmark_detail(request, bookmark_id: int):
    b = get_object_or_404(Bookmark, id=bookmark_id)

    if request.method == "PATCH":
        try:
            body = json.loads(request.body.decode("utf-8"))
        except Exception:
            return HttpResponseBadRequest("Invalid JSON")

        if "title" in body:
            b.title = str(body["title"]).strip()
        if "notes" in body:
            b.notes = str(body["notes"]).strip()
        if "tags" in body:
            try:
                tags = get_or_create_tags(body["tags"])
            except Exception as e:
                return HttpResponseBadRequest(str(e))
            b.tags.set(tags)

        b.save()
        return JsonResponse(bookmark_to_dict(b))

    if request.method == "DELETE":
        b.delete()
        return JsonResponse({"deleted": True})

    return HttpResponseNotAllowed(["PATCH", "DELETE"])
