#!/usr/bin/env bash
# Pomocniczy skrypt do uruchamiania translatora ćwiczeń

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Szukaj python w .venv
if [ -f "${ROOT_DIR}/.venv/bin/python3" ]; then
    PYTHON_EXEC="${ROOT_DIR}/.venv/bin/python3"
elif [ -f "${SCRIPT_DIR}/../.venv/bin/python3" ]; then
    PYTHON_EXEC="${SCRIPT_DIR}/../.venv/bin/python3"
else
    PYTHON_EXEC="python3"
fi

exec "${PYTHON_EXEC}" "${SCRIPT_DIR}/translate_exercises.py" "$@"
