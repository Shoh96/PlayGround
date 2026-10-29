#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")" && pwd)}"
: "${CAPTURE_URL:?}" "${CAPTURE_DIR:?}" "${RUNTIME_DIR:?}"

project_path="$(realpath -m "$PROJECT_DIR")"
capture_path="$(realpath -m "$CAPTURE_DIR")"
case "$capture_path" in
  "$project_path"|"$project_path"/*)
    echo "CAPTURE_DIR must be outside the project source: $capture_path" >&2
    exit 1
    ;;
esac

export PROJECT_DIR CAPTURE_URL CAPTURE_DIR="$capture_path"
export CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-.home}"
export CAPTURE_AUTO_START="${CAPTURE_AUTO_START:-false}"

cd "$PROJECT_DIR"
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
/usr/bin/time -p test -s "$CAPTURE_DIR/final-desktop.png"
/usr/bin/time -p test -s "$CAPTURE_DIR/final-mobile.png"
