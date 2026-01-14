# LinkVault

LinkVault is a full-stack bookmark manager that lets users save links with tags and notes, as well as filtering bookmarks by tags.

## Get Started (Run locally)

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js & npm

### Backend
Install Python dependencies and run backend server

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver
```

Backend will be available at
- http://127.0.0.1:8000
- Example API: http://127.0.0.1:8000/api/bookmarks/

### Frontend
Run the frontend server separately

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at
- http://localhost:5173

## Why this project
LinkVault expands upon browser bookmarks with the following features:
- user-defined, color-coded tags
- notes/comments for context
- fast filtering by multiple tags

---

## Features
### Bookmarks
- Create bookmarks with URL, title, notes, and selected tags
- Edit bookmark features
- Delete bookmarks

### Tags
- Create tags with custom colors
- Assign multiple tags to each bookmark
- Filter bookmarks by selecting multiple tags
- Delete tags (removes the tag from all bookmarks)

---

## Tech Stack
- **Backend:** Django + SQLite
- **Frontend:** React (Vite) + CSS
- **API:** JSON endpoints under `/api`
