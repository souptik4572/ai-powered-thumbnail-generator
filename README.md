# Hookframe — AI-Powered YouTube Thumbnail Generator

Upload a headshot, describe the vibe, and get professional YouTube thumbnails in seconds. Hookframe uses OpenAI's image generation API to create styled thumbnails personalised to your face.

## Features

- **AI thumbnail generation** — GPT-4o + gpt-image-2 produces three distinct styles per job
- **Three visual styles** — Bold Dramatic, Clean Minimal, Vibrant Energetic
- **Real-time progress** — Server-Sent Events stream each thumbnail as it completes
- **Credits system** — each new account starts with 3 credits; 1 credit is consumed per job
- **Thumbnail history** — browse every image you've generated, with download support
- **Dark / light theme** — persisted per user
- **JWT authentication** — register or login, token stored locally

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Zustand |
| Backend | FastAPI, SQLModel, Alembic, Uvicorn |
| Database | SQLite (file-based, zero config) |
| AI | OpenAI Responses API (gpt-4o + gpt-image-2) |
| Image hosting | ImageKit |
| Auth | JWT (PyJWT) + bcrypt |

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- An **OpenAI API key** with access to the Responses API
- An **ImageKit** account (free tier works)

---

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd ai-powered-thumbnail-generator
```

### 2. Configure environment variables

Create `backend/.env`:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# ImageKit  (find these in your ImageKit dashboard)
IMAGEKIT_PRIVATE_KEY=private_...
IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your-id>

# Auth
ACCESS_SECRET_TOKEN=some-long-random-secret
JWT_ALGORITHM=HS256
BCRYPT_SALT=12

# Database (default: SQLite file in backend/)
DATABASE_URL=sqlite:///./thumbnailbuilder.db
```

### 3. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Set up the frontend

```bash
cd frontend
npm install
```

### 5. Start both servers

From the project root:

```bash
./start.sh
```

This activates the venv, starts the FastAPI backend on **http://localhost:8000**, and starts the Vite dev server on **http://localhost:5173**.

> Database migrations run automatically on backend startup via Alembic.

Open **http://localhost:5173** in your browser, register an account, and start generating.

---

## Project Structure

```
.
├── start.sh                  # One-command startup script
├── backend/
│   ├── main.py               # FastAPI app + lifespan (runs migrations)
│   ├── config.py             # Env var loading
│   ├── database.py           # Engine, session, Alembic runner
│   ├── models/
│   │   ├── user.py           # User table
│   │   ├── job.py            # Job table
│   │   ├── thumbnail.py      # Thumbnail table
│   │   ├── credits_bucket.py # CreditsBucket table
│   │   └── enums.py          # Status, UserRole enums
│   ├── routes/
│   │   ├── user_route.py     # Auth + credits endpoints
│   │   ├── job_route.py      # Job creation + polling
│   │   └── thumbnail_route.py# Thumbnail history
│   ├── services/
│   │   ├── generator.py      # Job orchestration, credit deduction
│   │   ├── openai_service.py # OpenAI Responses API call
│   │   └── imagekit_service.py# Upload + variant URLs
│   ├── migrations/           # Alembic versions
│   ├── scripts/
│   │   └── backfill_credits.py  # One-off: give credits to existing users
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api.ts            # All fetch calls to the backend
    │   ├── store/
    │   │   └── useAppStore.ts# Zustand store (auth, screen, credits)
    │   └── components/
    │       ├── AuthScreen.tsx # Login / register
    │       ├── Generator.tsx  # Main generation form
    │       ├── Loading.tsx    # SSE progress screen
    │       ├── Results.tsx    # Completed thumbnails
    │       ├── History.tsx    # Past thumbnails
    │       └── TopNav.tsx     # Nav + credits display
    └── vite.config.ts        # Proxies /api → localhost:8000
```

---

## API Reference

All endpoints are prefixed with `/api`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/users/register` | — | Create account, returns JWT |
| `POST` | `/users/login` | — | Login, returns JWT |
| `GET` | `/users/credits` | Bearer | Current credit balance |
| `POST` | `/upload-headshot` | — | Upload image, returns ImageKit URL |
| `POST` | `/jobs` | Bearer | Create a new generation job |
| `GET` | `/jobs/{job_id}` | — | Poll job + thumbnail status |
| `GET` | `/jobs/{job_id}/stream` | — | SSE stream of thumbnail events |
| `GET` | `/thumbnails` | Bearer | Uploaded thumbnails for the user |

### Job lifecycle

```
PENDING → PROCESSING → (per thumbnail) GENERATING → UPLOADED
                                                   ↘ FAILED
```

One credit is deducted from the user's balance when the job finishes with at least one successful thumbnail.

---

## Credits System

- Every new account is provisioned with **3 credits** automatically on registration.
- Submitting a job requires `credits ≥ num_thumbnails`.
- On successful job completion, **1 credit** is deducted.
- The current balance is shown in the top nav and the generation form.

### Backfilling credits for existing users

If you have users created before the credits system was added, run:

```bash
cd backend
source venv/bin/activate
python scripts/backfill_credits.py
```

This creates a 3-credit bucket for any user that doesn't already have one and skips those that do.

---

## Manual Backend Start (without start.sh)

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Manual Frontend Start (without start.sh)

```bash
cd frontend
npm run dev
```

---

## Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `IMAGEKIT_PRIVATE_KEY` | Yes | ImageKit private key |
| `IMAGEKIT_PUBLIC_KEY` | Yes | ImageKit public key |
| `IMAGEKIT_URL_ENDPOINT` | Yes | ImageKit base URL |
| `ACCESS_SECRET_TOKEN` | Yes | Secret used to sign JWTs |
| `JWT_ALGORITHM` | Yes | JWT algorithm, e.g. `HS256` |
| `BCRYPT_SALT` | No | bcrypt rounds (default: `5`) |
| `DATABASE_URL` | No | SQLAlchemy URL (default: `sqlite:///./thumbnailbuilder.db`) |
