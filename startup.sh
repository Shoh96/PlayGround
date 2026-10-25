#!/usr/bin/env bash
set -euo pipefail
# Once-per-worker prerequisites for the PlayGround preview and capture.

runtime="$HOME/.local/share/omgithub-playwright"

# Ensure Playwright's pinned Chromium is installed for this workspace.
# The @playwright/cli launcher bundles its own playwright (1.63 alpha,
# expecting chromium-1243) while the workspace `playwright` package is
# 1.64.1 (chromium-1248), so install both idempotently.
if [[ -x "$runtime/node_modules/.bin/playwright" ]]; then
  /usr/bin/time -p "$runtime/node_modules/.bin/playwright" install --with-deps chromium
else
  /usr/bin/time -p bash /home/runner/work/_temp/omgithub-runtime/scripts/setup-linux-playwright.sh
fi
cli_playwright="$runtime/node_modules/@playwright/cli/node_modules/playwright/cli.js"
if [[ -f "$cli_playwright" ]]; then
  /usr/bin/time -p node "$cli_playwright" install chromium
fi

# Keep one Xvfb display alive for headed Chromium.
if [[ -s "$runtime/display" ]] && kill -0 "$(cat "$runtime/xvfb.pid" 2>/dev/null)" 2>/dev/null; then
  echo 'Xvfb display already running'
else
  : > "$runtime/display"
  bash -c 'nohup Xvfb -displayfd 3 -screen 0 1440x900x24 -nolisten tcp 3>"$1/display" >"$1/xvfb.log" 2>&1 </dev/null & echo $! >"$1/xvfb.pid"' _ "$runtime"
  timeout 15 bash -c 'until test -s "$1/display"; do sleep 0.1; done' _ "$runtime"
  /usr/bin/time -p cat "$runtime/display"
fi

