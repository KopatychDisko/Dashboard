# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Telegram Bot Dashboard — a two-service monorepo (backend + frontend) for viewing Telegram bot analytics. See `METRICS_FUNCTIONS.md` for analytics function documentation.

### Required secrets (environment variables)

The backend requires a `.env` file at `backend/.env` with:
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_KEY` — Supabase API key
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `SECRET_KEY` — JWT signing secret

Without real Supabase credentials, the API starts but `/health` reports `unhealthy` (database unreachable). All other endpoints still load.

### Running services

**Backend** (Python 3.11, FastAPI):
```bash
cd backend && source .venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend** (Node 18, React + Vite):
```bash
source /home/ubuntu/.nvm/nvm.sh && nvm use 18
cd frontend && npm run dev
# Runs on http://127.0.0.1:8080
```

### Lint / Build / Test

- **Frontend lint**: `cd frontend && npx eslint . --ext .js,.jsx --report-unused-disable-directives --max-warnings 0` — note: 48 pre-existing lint errors in the codebase (unused vars, unescaped entities, etc.)
- **Frontend build**: `cd frontend && npm run build`
- **Backend**: No automated test suite or linter configured in the repo.

### Gotchas

- Python 3.11 is required (not the system 3.12). Install via `deadsnakes` PPA. The venv is at `backend/.venv`.
- Node 18 is required (Dockerfile uses `node:18-alpine`). Use nvm: `source /home/ubuntu/.nvm/nvm.sh && nvm use 18`.
- The frontend `.env` at `frontend/.env` sets `VITE_API_URL` and `VITE_TELEGRAM_BOT_USERNAME` for dev.
- `backend/.env` is gitignored — each environment must create its own.
- The Vite dev server binds to `127.0.0.1:8080` (configured in `vite.config.js`).
