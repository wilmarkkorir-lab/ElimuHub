# ElimuHub — Learning Management System

*Elimu* means "education" in Swahili. ElimuHub lets instructors build courses and lets students learn, take quizzes, submit assignments and see their progress.

**Stack:** Django + Django REST Framework + SQLite (JWT auth) · React + Vite + Tailwind CSS

## Features
- **Roles:** student, instructor, admin (JWT login with username or email, token refresh)
- **Course management:** categories, courses, modules, lessons (text and video), draft/publish
- **Student dashboard:** enrolled courses with progress, upcoming assignments, recent quiz results
- **Quizzes:** multiple choice, pass mark, optional timer (auto-submits), instant review. Correct answers are never sent to students before they submit.
- **Assignments:** text and file submissions, due dates, instructor grading with feedback
- **Progress tracking:** (lessons completed + quizzes passed + assignments submitted) / everything in the course
- **Instructor tools:** course editor, quiz builder, grading queue, per-student progress table

## Run locally

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations accounts courses assessments
python manage.py migrate
python manage.py seed_demo          # optional demo data
python manage.py runserver          # http://localhost:8000
```
Demo logins (password `Elimu12345!`): `admin`, `amina` (instructor), `brian` (student).
Django admin: http://localhost:8000/admin/

### Frontend
```bash
cd frontend
npm install
cp .env.example .env     # set VITE_API_URL if the backend isn't on localhost:8000
npm run dev              # http://localhost:5173
```

### Tests
```bash
cd backend && python manage.py test
```

## API overview
| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register/`, `/login/`, `/refresh/`; `GET/PATCH /api/auth/me/` | Authentication |
| `/api/courses/` (+ `enroll/`, `unenroll/`, `progress/`, `students/`) | Courses |
| `/api/modules/`, `/api/lessons/` (+ `complete/`, `uncomplete/`) | Course content |
| `/api/quizzes/` (+ `submit/`, `attempts/`) | Quizzes |
| `/api/assignments/` (+ `submit/`, `submissions/`), `POST /api/submissions/{id}/grade/` | Assignments |
| `GET /api/dashboard/` | Role-aware dashboard data |

## Deploy and optimise
1. Set env vars (see `backend/.env.example`): a long random `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, your domain in `DJANGO_ALLOWED_HOSTS` and your frontend URL in `CORS_ALLOWED_ORIGINS`.
2. Backend: `python manage.py collectstatic --noinput && python manage.py migrate`, then `gunicorn config.wsgi` (a `Procfile` is included). Static files are served by WhiteNoise.
3. Frontend: set `VITE_API_URL=https://your-api/api`, run `npm run build`, and host `frontend/dist` on any static host (Netlify, Vercel, Nginx). Add a rewrite of all paths to `index.html` for client-side routing.
4. Serve uploaded files (`backend/media`) from persistent storage or S3 in production, and consider PostgreSQL once you have many concurrent users (SQLite is fine for small deployments).
5. Already included: query annotations to avoid N+1 counts on course lists, `select_related`/`prefetch_related`, JWT refresh, login rate limiting, HTTPS-only cookies when `DEBUG=False`, and the Vite production build with code minification.

## Project layout
```
backend/   config/ accounts/ courses/ assessments/
frontend/  src/{pages,components,api.js,AuthContext.jsx}
```
