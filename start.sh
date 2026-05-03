#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Trap to kill both child processes on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- Backend ---
echo "[backend] Activating venv and starting uvicorn..."
(
  cd "$BACKEND_DIR"
  # shellcheck disable=SC1091
  source venv/bin/activate
  exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# --- Frontend ---
echo "[frontend] Starting Vite dev server..."
(
  cd "$FRONTEND_DIR"
  exec npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

wait "$BACKEND_PID" "$FRONTEND_PID"
