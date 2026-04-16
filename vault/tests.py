from django.test import TestCase


class BookmarkUrlTests(TestCase):
    def test_create_bookmark_prepends_https_when_missing_scheme(self):
        response = self.client.post(
            "/api/bookmarks/",
            data={
                "url": "example.com/path",
                "title": "Example",
                "notes": "",
                "tag_ids": [],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["url"], "https://example.com/path")

    def test_patch_bookmark_rejects_invalid_url(self):
        create_response = self.client.post(
            "/api/bookmarks/",
            data={
                "url": "https://example.com",
                "title": "Example",
                "notes": "",
                "tag_ids": [],
            },
            content_type="application/json",
        )
        bookmark_id = create_response.json()["id"]

        patch_response = self.client.patch(
            f"/api/bookmarks/{bookmark_id}/",
            data={"url": "not a valid url"},
            content_type="application/json",
        )

        self.assertEqual(patch_response.status_code, 400)
        self.assertEqual(patch_response.json()["error"], "Invalid URL")
