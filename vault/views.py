import json
from django.http import JsonResponse, HttpResponseNotAllowed, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import Bookmark, Tag

def tag_to_dict(t: Tag):
    return {"id": t.id, "name": t.name, "color": t.color}

def bookmark_to_dict(b: Bookmark):
    return {
        "id": b.id,
        "url": b.url,
        "title": b.title,
        "notes": b.notes,
        "tags": [tag_to_dict(t) for t in b.tags.all().order_by("name")],
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
        qs = Bookmark.objects.all().prefetch_related("tags").order_by("-created_at")

        # Multi-tag filter: ?tag_ids=1,2,3  (AND semantics)
        tag_ids_raw = request.GET.get("tag_ids", "").strip()
        if tag_ids_raw:
            try:
                tag_ids = [int(x) for x in tag_ids_raw.split(",") if x.strip()]
            except ValueError:
                return JsonResponse({"error": "tag_ids must be comma-separated integers"}, status=400)

            if tag_ids:
                qs = (
                    qs.filter(tags__id__in=tag_ids)
                    .annotate(
                        match_count=Count(
                            "tags",
                            filter=Q(tags__id__in=tag_ids),
                            distinct=True,
                        )
                    )
                    .filter(match_count=len(tag_ids))
                    .distinct()
                )

        return JsonResponse([bookmark_to_dict(b) for b in qs], safe=False)

    if request.method == "POST":
        data = parse_json(request)
        if data is None:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        url = (data.get("url") or "").strip()
        title = (data.get("title") or "").strip()
        notes = (data.get("notes") or "").strip()
        tag_ids = data.get("tag_ids") or []

        if not url or not title:
            return JsonResponse({"error": "url and title are required"}, status=400)
        if not isinstance(tag_ids, list):
            return JsonResponse({"error": "tag_ids must be a list"}, status=400)

        b = Bookmark.objects.create(url=url, title=title, notes=notes)

        if tag_ids:
            tags = list(Tag.objects.filter(id__in=tag_ids))
            if len(tags) != len(set(tag_ids)):
                return JsonResponse({"error": "One or more tag_ids not found"}, status=400)
            b.tags.set(tags)

        b.save()
        return JsonResponse(bookmark_to_dict(b), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def bookmark_detail(request, bookmark_id: int):
    try:
        b = Bookmark.objects.prefetch_related("tags").get(id=bookmark_id)
    except Bookmark.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(bookmark_to_dict(b))

    if request.method == "PATCH":
        data = parse_json(request)
        if data is None:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        if "url" in data:
            b.url = (data.get("url") or "").strip()
        if "title" in data:
            b.title = (data.get("title") or "").strip()
        if "notes" in data:
            b.notes = (data.get("notes") or "").strip()

        if "tag_ids" in data:
            tag_ids = data.get("tag_ids") or []
            if not isinstance(tag_ids, list):
                return JsonResponse({"error": "tag_ids must be a list"}, status=400)
            tags = list(Tag.objects.filter(id__in=tag_ids))
            if len(tags) != len(set(tag_ids)):
                return JsonResponse({"error": "One or more tag_ids not found"}, status=400)
            b.tags.set(tags)

        b.save()
        return JsonResponse(bookmark_to_dict(b))

    if request.method == "DELETE":
        b.delete()
        return JsonResponse({"ok": True})

    return HttpResponseNotAllowed(["GET", "PATCH", "DELETE"])

@csrf_exempt
def tag_list_create(request):
    if request.method == "GET":
        tags = Tag.objects.all().order_by("name")
        return JsonResponse([tag_to_dict(t) for t in tags], safe=False)

    if request.method == "POST":
        data = parse_json(request)
        if data is None:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        name = (data.get("name") or "").strip()
        color = (data.get("color") or "#94a3b8").strip()

        if not name:
            return JsonResponse({"error": "Tag name required"}, status=400)
        if len(name) > 32:
            return JsonResponse({"error": "Tag name too long (max 32)"}, status=400)
        if not (len(color) == 7 and color.startswith("#")):
            return JsonResponse({"error": "Color must look like #RRGGBB"}, status=400)

        tag, created = Tag.objects.get_or_create(name=name, defaults={"color": color})
        if not created and tag.color != color:
            tag.color = color
            tag.save()

        return JsonResponse(tag_to_dict(tag), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def tag_detail(request, tag_id: int):
    try:
        t = Tag.objects.get(id=tag_id)
    except Tag.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "DELETE":
        t.delete()
        return JsonResponse({"ok": True})

    return HttpResponseNotAllowed(["DELETE"])

def parse_json(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return None
