#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")" && pwd)}"
: "${OPENCODE_WEB_DIR:?}"
PORT="${PORT:-3000}"

export PROJECT_DIR OPENCODE_WEB_DIR PORT
cd "$PROJECT_DIR"

/usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"
/usr/bin/time -p test -f package.json -a -f package-lock.json

deps_hash="$(/usr/bin/time -p sha256sum package.json package-lock.json | sha256sum | cut -d' ' -f1)"
deps_stamp="$OPENCODE_WEB_DIR/start-dependencies"
if [[ ! -x node_modules/.bin/vite || ! -f "$deps_stamp" || "$(cat "$deps_stamp")" != "$deps_hash" ]]; then
  /usr/bin/time -p npm ci --no-audit --no-fund
  /usr/bin/time -p sh -c 'printf "%s\n" "$1" > "$2"' _ "$deps_hash" "$deps_stamp"
fi

/usr/bin/time -p npm run build
/usr/bin/time -p test -s dist/index.html

/usr/bin/time -p node -e "
const fs = require('node:fs');
const path = require('node:path');
const project = path.resolve(process.env.PROJECT_DIR);
const output = { project, directory: path.resolve(project, 'dist') };
fs.writeFileSync(path.join(process.env.OPENCODE_WEB_DIR, 'deployment-output.json'), JSON.stringify(output));
"

/usr/bin/time -p node "$PROJECT_DIR/node_modules/vite/bin/vite.js" preview --host 0.0.0.0 --port "$PORT" --strictPort
