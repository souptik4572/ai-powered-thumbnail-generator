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
| Frontend | React 19.2.5, TypeScript 6, Vite 8, Zustand 5 |
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

## Frontend

### Versions

| Package | Version |
|---|---|
| React | **19.2.5** |
| TypeScript | ~6.0.2 |
| Vite | ^8.0.10 |
| Zustand | ^5.0.12 |

React 19 is used throughout. The project uses the **automatic JSX transform** (`react-jsx`) so there is no need to `import React` in component files. TypeScript is compiled to **ES2023** in bundler mode with strict unused-variable checks enabled.

---

### Screen Flow

The entire app is a single-page application. `App.tsx` renders one screen at a time based on the `screen` value in the Zustand store. `TopNav` is shown on every screen except `auth`.

```
┌──────────┐   register/login   ┌───────────┐   Generate   ┌─────────┐
│   auth   │ ─────────────────► │ generator │ ────────────► │ loading │
└──────────┘                    └───────────┘               └────┬────┘
                                      ▲                          │ all done
                                      │    New thumbnail         ▼
                                ┌─────┴──────┐            ┌─────────┐
                                │  history   │            │ results │
                                └────────────┘            └─────────┘
```

---

### State Management

Global state lives in a single Zustand store (`src/store/useAppStore.ts`) with the `persist` middleware. Only a subset of state is written to `localStorage`; the rest is session-only.

**Persisted across page reloads**

| Key | Type | Description |
|---|---|---|
| `user` | `{ name, email } \| null` | Logged-in user info |
| `token` | `string \| null` | JWT bearer token |
| `theme` | `'light' \| 'dark'` | UI theme |
| `accent` | `'violet' \| 'blue' \| 'pink' \| 'green' \| 'amber'` | Accent colour preset |
| `showBlobs` | `boolean` | Background blob decoration toggle |
| `history` | `HistoryEntry[]` | Last 50 jobs saved locally |

**Session-only (reset on reload)**

| Key | Type | Description |
|---|---|---|
| `screen` | `Screen` | Currently visible screen |
| `credits` | `number \| null` | Live credit balance (fetched from API) |
| `headshotPreview` | `string \| null` | Data URL of the selected image |
| `headshotUrl` | `string \| null` | ImageKit URL after upload |
| `prompt` | `string` | Generation prompt text |
| `styleSel` | `string` | Selected style ID |
| `count` | `number` | Number of thumbnails to generate (1–3) |
| `jobId` | `string \| null` | Active job ID |
| `liveThumbnails` | `LiveThumbnail[]` | Thumbnails received via SSE |

On rehydration, if a `token` is found the app navigates straight to `generator` instead of `auth`.

---

### Components

#### `AuthScreen.tsx`
Split two-column layout — brand panel on the left with an animated `FauxThumbnail` preview, login/register form on the right. Switches between Login and Sign Up via a tab toggle. Makes `POST /api/users/login` or `POST /api/users/register`, then calls `login()` in the store to set the token and navigate.

#### `Generator.tsx`
Four-step generation form:

1. **Headshot** — drag-and-drop or click-to-upload. File is held in a `useRef`; the actual ImageKit upload happens on Generate, not on file selection.
2. **Prompt** — free-text textarea (max 240 chars) with one-click example chips.
3. **Style** — pick one of three visual styles (Bold Dramatic, Clean Minimal, Vibrant Energetic).
4. **Variations** — choose 1, 2, or 3 thumbnails per job.

A live preview panel on the right renders a `FauxThumbnail` that updates in real-time as the user types. The Generate button is disabled until a headshot is present, the prompt is at least 5 characters, and `credits >= count`. The cost card beneath the button shows the credit cost and the remaining balance in real time — highlighted red when insufficient.

#### `Loading.tsx`
Displayed while the job is processing. Subscribes to `GET /api/jobs/{job_id}/stream` via the browser `EventSource` API. Shows:
- An animated breathing orb with a live percentage counter
- Orbiting sparkle shapes
- A rotating list of thumbnail tips (cycles every 3.5 s)
- A progress list that advances as thumbnails arrive

Each `thumbnail_ready` SSE event calls `addLiveThumbnail()` in the store. When `job_completed` fires the store entry is saved and the screen transitions to `results`. A 3-minute safety timeout closes the connection and advances to `results` regardless, preventing the user getting stuck.

#### `Results.tsx`
Shows the `liveThumbnails` array collected during the loading screen. Each thumbnail has a hover overlay with download buttons for three formats: YouTube (1280×720), Shorts (1080×1920), and Square (1080×1080). Downloads are served as binary blobs via `fetch` + `URL.createObjectURL` so the browser saves the file rather than opening it.

#### `History.tsx`
Fetches the full thumbnail history from `GET /api/thumbnails` (auth-gated, returns only the current user's uploads). Thumbnails are grouped by `job_id` client-side and rendered in a responsive bento grid:
- 1 thumbnail → full-width card
- 2 thumbnails → side-by-side
- 3 thumbnails → tall left + two stacked right

Includes a search bar (filters by prompt text) and style chip filters. Shows skeleton cards during loading and a friendly empty state for new users. Each card supports the same hover-download overlay as the Results screen.

#### `TopNav.tsx`
Persistent navigation bar. Fetches the credit balance from `GET /api/users/credits` on mount and whenever `screen` changes (ensuring the count is refreshed after a job completes). The credits pill turns red when the balance reaches 0. Includes theme toggle, user avatar (first letter of name), and logout button.

#### `BlobField.tsx`
Decorative animated background. Can be toggled off via `showBlobs` in the store.

#### `FauxThumbnail.tsx`
A purely visual mockup of a YouTube thumbnail used in the auth page and Generator preview. Accepts `headline`, `sub`, `accent`, and `bg` props and renders a styled card — not a real generated image.

#### `Icon.tsx`
Renders inline SVG icons by name. Used throughout instead of an icon library to keep the bundle small.

---

### API Communication

All API calls are centralised in `src/api.ts`. The Vite dev server proxies every request matching `/api/*` to `http://localhost:8000`, so the frontend never has to know the backend port.

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

Protected calls pass the JWT as a standard Bearer token:

```ts
headers: { Authorization: `Bearer ${token}` }
```

Real-time updates use the native browser `EventSource` API — no third-party library needed. The SSE connection is opened in `Loading.tsx`, stored in a `useRef`, and explicitly closed when the component unmounts or when the job completes.

---

### Design System

The UI uses a custom **clay morphism** design language built entirely with CSS custom properties — no external component library (no Tailwind, no MUI, no shadcn). Key conventions:

| CSS class | Purpose |
|---|---|
| `.clay-card` | White/dark card with soft shadow and rounded corners |
| `.clay-btn` / `.clay-btn-primary` | Pill-shaped buttons |
| `.clay-input` | Text inputs and textareas |
| `.clay-pill` | Small inline badge/chip |
| `.surface-1` / `.surface-2` / `.surface-3` | Layered surface depths |

Themes are applied by toggling `data-theme="dark"` on `<html>`. All colour tokens are CSS custom properties (`--clay-fg`, `--clay-muted`, `--clay-accent`, etc.) so both themes work with zero JavaScript.

Five accent presets are available — **violet** (default), **blue**, **pink**, **green**, **amber** — controlled via CSS custom properties set dynamically in `App.tsx`.

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
