#!/usr/bin/env bash
# Triggered by Claude Code PostToolUse hook after Edit/Write.
# Reads the tool call JSON from stdin and auto-generates an Alembic revision
# when a backend/models/*.py file was the target of the edit.
set -euo pipefail

INPUT=$(cat 2>/dev/null || true)

# Extract file_path from the PostToolUse JSON payload
FILE_PATH=$(python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" <<< "$INPUT" 2>/dev/null || true)

# Only proceed when a models file was edited
if ! echo "$FILE_PATH" | grep -qE "backend/models/[^/]+\.py$"; then
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

if [ -f "venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source venv/bin/activate
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MSG="auto_${TIMESTAMP}"

echo "[auto_migrate] Models changed — generating revision: $MSG"
python -m alembic revision --autogenerate -m "$MSG"
echo "[auto_migrate] Done. Review the new file in migrations/versions/ before committing."
