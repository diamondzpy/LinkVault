import { useEffect, useMemo, useState } from "react";
import "./App.css";

function TagChip({ tag, selected, onClick, onDelete }) {
  return (
    <div className="tagChipWrap">
      <button
        type="button"
        className={`tagChip ${selected ? "tagChipSelected" : ""}`}
        onClick={onClick}
        title={tag.name}
        style={{ borderColor: tag.color }}
      >
        <span className="tagDot" style={{ background: tag.color }} />
        {selected && <span className="tagCheck">✓</span>}
        {tag.name}
      </button>

      {onDelete && (
        <button
          type="button"
          className="tagDelete"
          title="Delete tag"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [bookmarks, setBookmarks] = useState([]);
  const [tags, setTags] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter: multi-tag selection
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [manageTags, setManageTags] = useState(false);

  // Create bookmark form
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [createTagIds, setCreateTagIds] = useState([]);

  // Create tag form
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#60a5fa");

  // Edit bookmark state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTagIds, setEditTagIds] = useState([]);

  const tagById = useMemo(() => {
    const m = new Map();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  function toggleId(setter, ids, id) {
    if (ids.includes(id)) setter(ids.filter((x) => x !== id));
    else setter([...ids, id]);
  }

  async function fetchTags() {
    const res = await fetch("/api/tags/");
    if (!res.ok) throw new Error(`GET /api/tags failed (${res.status})`);
    const data = await res.json();
    setTags(data);
  }

  async function fetchBookmarks(tagIds = []) {
    setLoading(true);
    setError("");
    try {
      const qs = tagIds.length ? `?tag_ids=${tagIds.join(",")}` : "";
      const res = await fetch(`/api/bookmarks/${qs}`);
      if (!res.ok) throw new Error(`GET /api/bookmarks failed (${res.status})`);
      const data = await res.json();
      setBookmarks(data);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await fetchTags();
        await fetchBookmarks([]);
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  useEffect(() => {
    fetchBookmarks(filterTagIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTagIds]);

  async function createTag(e) {
    e?.preventDefault();
    setError("");

    const payload = {
      name: newTagName.trim(),
      color: newTagColor,
    };

    if (!payload.name) {
      setError("Tag name is required.");
      return;
    }

    try {
      const res = await fetch("/api/tags/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Create tag failed (${res.status}): ${text}`);

      const created = JSON.parse(text);

      await fetchTags();

      // auto-select newly created tag on bookmark form
      setCreateTagIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));

      setNewTagName("");
      setShowNewTag(false);
    } catch (e2) {
      setError(String(e2.message || e2));
    }
  }

  async function deleteTag(id) {
    if (!confirm("Delete this tag? It will be removed from all bookmarks.")) return;
    setError("");

    try {
      const res = await fetch(`/api/tags/${id}/`, { method: "DELETE" });
      const text = await res.text();
      if (!res.ok) throw new Error(`Delete tag failed (${res.status}): ${text}`);

      // remove from any selected state so UI doesn’t keep “ghost selections”
      setCreateTagIds((prev) => prev.filter((x) => x !== id));
      setEditTagIds((prev) => prev.filter((x) => x !== id));

      setFilterTagIds((prev) => {
        const next = prev.filter((x) => x !== id);
        // immediately refresh list for the new filter
        fetchBookmarks(next);
        return next;
      });

      await fetchTags();
      await fetchBookmarks(filterTagIds.filter((x) => x !== id));
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function createBookmark(e) {
    e.preventDefault();
    setError("");

    const payload = {
      url: url.trim(),
      title: title.trim(),
      notes: notes.trim(),
      tag_ids: createTagIds,
    };

    if (!payload.url || !payload.title) {
      setError("URL and Title are required.");
      return;
    }

    try {
      const res = await fetch("/api/bookmarks/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Create bookmark failed (${res.status}): ${text}`);

      setUrl("");
      setTitle("");
      setNotes("");
      setCreateTagIds([]);
      await fetchBookmarks(filterTagIds);
    } catch (e2) {
      setError(String(e2.message || e2));
    }
  }

  function startEdit(b) {
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditNotes(b.notes || "");
    setEditTagIds((b.tags || []).map((t) => t.id));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditNotes("");
    setEditTagIds([]);
  }

  async function saveEdit(id) {
    setError("");

    const payload = {
      title: editTitle.trim(),
      notes: editNotes.trim(),
      tag_ids: editTagIds,
    };

    try {
      const res = await fetch(`/api/bookmarks/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`Update failed (${res.status}): ${text}`);

      cancelEdit();
      await fetchBookmarks(filterTagIds);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function deleteBookmark(id) {
    if (!confirm("Delete this bookmark?")) return;
    setError("");

    try {
      const res = await fetch(`/api/bookmarks/${id}/`, { method: "DELETE" });
      const text = await res.text();
      if (!res.ok) throw new Error(`Delete failed (${res.status}): ${text}`);

      await fetchBookmarks(filterTagIds);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>LinkVault</h1>
      </header>

      {error && (
        <div className="error" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      {/* Add bookmark */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Add a bookmark</h2>

        <form className="formGrid" onSubmit={createBookmark}>
          <input
            className="input"
            placeholder="URL (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            className="input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Notes on left column */}
          <textarea
            className="textarea"
            rows={7}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Tags on right column */}
          <div>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <div className="small">Select tags:</div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowNewTag((v) => !v)}
              >
                {showNewTag ? "Close" : "Add Tag"}
              </button>
            </div>

            <div className="tagGrid">
              {tags.map((t) => (
                <TagChip
                  key={t.id}
                  tag={t}
                  selected={createTagIds.includes(t.id)}
                  onClick={() => toggleId(setCreateTagIds, createTagIds, t.id)}
                />
              ))}
              {tags.length === 0 && <div className="small">No tags yet.</div>}
            </div>

            {showNewTag && (
              <div className="newTagRow">
                <input
                  className="input"
                  placeholder="New tag name (e.g. uw)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <input
                  className="colorInput"
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  title="Pick a tag color"
                />
                <button className="button" type="button" onClick={createTag}>
                  Create
                </button>
              </div>
            )}

          </div>

          <button className="button span2" type="submit">
            Save bookmark
          </button>
        </form>
      </div>

      {/* Filter (multi-select) + Manage tags */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Filter</h2>
          <div className="row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setManageTags((v) => !v)}
            >
              {manageTags ? "Done" : "Manage tags"}
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => setFilterTagIds([])}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="small" style={{ marginTop: 8 }}>
          Click tags to filter (multi-select). Bookmarks must contain <b>all</b> selected tags.
          {manageTags ? " (Manage mode: click × to delete tags)" : ""}
        </div>

        {/* Add tagGridScrollable class if you add the CSS for it */}
        <div className="tagGrid tagGridScrollable" style={{ marginTop: 10 }}>
          {tags.map((t) => (
            <TagChip
              key={t.id}
              tag={t}
              selected={filterTagIds.includes(t.id)}
              onClick={() => toggleId(setFilterTagIds, filterTagIds, t.id)}
              onDelete={manageTags ? () => deleteTag(t.id) : undefined}
            />
          ))}
          {tags.length === 0 && <div className="small">No tags yet.</div>}
        </div>
      </div>

      {/* Bookmarks list */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Bookmarks ({bookmarks.length})</h2>
          <div className="small">{loading ? "Loading…" : ""}</div>
        </div>

        <div className="grid" style={{ marginTop: 12 }}>
          {bookmarks.map((b) => (
            <div className="bookmark" key={b.id}>
              {editingId === b.id ? (
                <div className="grid">
                  <input
                    className="input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />

                  <textarea
                    className="textarea"
                    rows={4}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />

                  <div className="small">Edit tags:</div>
                  <div className="tagGrid">
                    {tags.map((t) => (
                      <TagChip
                        key={t.id}
                        tag={t}
                        selected={editTagIds.includes(t.id)}
                        onClick={() => toggleId(setEditTagIds, editTagIds, t.id)}
                      />
                    ))}
                  </div>

                  <div className="row">
                    <button className="button" type="button" onClick={() => saveEdit(b.id)}>
                      Save
                    </button>
                    <button className="button button-secondary" type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="row-between">
                    <div>
                      <h3>{b.title}</h3>
                      <a className="link" href={b.url} target="_blank" rel="noreferrer">
                        {b.url}
                      </a>
                    </div>

                    <div className="row">
                      <button className="button button-secondary" onClick={() => startEdit(b)}>
                        Edit
                      </button>
                      <button className="button button-danger" onClick={() => deleteBookmark(b.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {b.tags?.length > 0 && (
                    <div className="tags">
                      {b.tags.map((t) => (
                        <span key={t.id} className="tagPill">
                          <span className="tagDot" style={{ background: t.color }} />
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {b.notes && <div className="notes">{b.notes}</div>}
                </>
              )}
            </div>
          ))}

          {bookmarks.length === 0 && !loading && (
            <div className="small">No bookmarks match this filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
