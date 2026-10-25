#!/usr/bin/env bash
# Build the static site and serve it in the foreground on PORT (default 3000).
set -euo pipefail
cd "$(dirname "$0")"
PROJECT_DIR="$PWD"
WEB_SRC="$PROJECT_DIR/web-src"
DIST_DIR="$PROJECT_DIR/dist"
export PORT="${PORT:-3000}"
META_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"

# No external dependencies to install; the static pipeline is build-only.
/usr/bin/time -p test -f "$WEB_SRC/index.html"
/usr/bin/time -p mkdir -p "$DIST_DIR"
/usr/bin/time -p cp -R "$WEB_SRC/." "$DIST_DIR/"
/usr/bin/time -p test -f "$DIST_DIR/index.html"

mkdir -p "$META_DIR"
/usr/bin/time -p printf '{"project":"%s","directory":"%s"}\n' "$PROJECT_DIR" "$DIST_DIR" \
  > "$META_DIR/deployment-output.json"
/usr/bin/time -p cat "$META_DIR/deployment-output.json"

# Serve the built static directory in the foreground.
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DIST_DIR"
