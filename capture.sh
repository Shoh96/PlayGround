#!/usr/bin/env bash
# Capture desktop and mobile screenshots of CAPTURE_URL into CAPTURE_DIR.
# Exits 0 on success, 75 for temporary navigation/browser infrastructure
# failures, 1 for script or rendering defects. Leaves the app running and
# closes only its own browser session.
set -u
cd "$(dirname "$0")"

SESSION="omgithub-capture"
DISPLAY_FILE="$HOME/.local/share/omgithub-playwright/display"
RENDER_TIMEOUT=60

exit_defect() { echo "capture: defect: $*" >&2; exit 1; }
exit_transient() { echo "capture: transient: $*" >&2; exit 75; }

close_quietly() {
  /usr/bin/time -p playwright-cli -s="$SESSION" close >/dev/null 2>&1 || true
}

# run <label> <cmd...> : execute a command with per-command timing
run() {
  local label="$1"
  shift
  echo "+ $label"
  /usr/bin/time -p "$@"
}

# --- script-level checks (exit 1 on defect) -------------------------------
[[ -n "${CAPTURE_URL:-}" ]] || exit_defect "CAPTURE_URL is not set"
[[ -n "${CAPTURE_DIR:-}" ]] || exit_defect "CAPTURE_DIR is not set"
command -v playwright-cli >/dev/null 2>&1 || exit_defect "playwright-cli not found in PATH"
command -v curl >/dev/null 2>&1 || exit_defect "curl not found in PATH"
command -v file >/dev/null 2>&1 || exit_defect "file not found in PATH"

if ! run "mkdir -p CAPTURE_DIR" mkdir -p "$CAPTURE_DIR"; then
  exit_defect "cannot create CAPTURE_DIR $CAPTURE_DIR"
fi

# --- temporary infrastructure checks (exit 75) ----------------------------
if ! run "ping preview URL" curl --silent --fail --max-time 10 "$CAPTURE_URL" >/dev/null 2>&1; then
  exit_transient "preview URL did not respond within 10s (temporary navigation failure)"
fi

if [[ -r "$DISPLAY_FILE" ]]; then
  DISPLAY=":$(cat "$DISPLAY_FILE")"
  export DISPLAY
fi
echo "capture: DISPLAY=${DISPLAY:-<unset>}"

close_quietly

# --- open the browser on the exact URL ------------------------------------
if ! run "open $CAPTURE_URL in browser" playwright-cli -s="$SESSION" open "$CAPTURE_URL"; then
  close_quietly
  echo "capture: open failed once; retrying"
  if ! run "retry open $CAPTURE_URL" playwright-cli -s="$SESSION" open "$CAPTURE_URL"; then
    close_quietly
    exit_transient "browser launch/navigation failed after retry (browser infrastructure failure)"
  fi
fi

# --- wait for rendered content --------------------------------------------
# cli_eval <js> : run an eval in the capture browser and print just the result value
cli_eval() {
  playwright-cli -s="$SESSION" eval "$1" 2>/dev/null \
    | awk '/^### Result$/{f=1; next} f {print; exit}'
}

wait_for_render() {
  local waited=0 state text
  while [[ $waited -lt $RENDER_TIMEOUT ]]; do
    state="$(cli_eval "() => document.readyState")"
    if [[ "${state//\"/}" == "complete" ]]; then
      text="$(cli_eval "() => document.body && document.body.innerText ? document.body.innerText.trim().length : 0")"
      text="${text//\"/}"
      if [[ "${text:-0}" -gt 0 ]] 2>/dev/null; then
        echo "capture: rendered content detected (innerText length $text)"
        return 0
      fi
      echo "capture: load complete but no rendered text yet; still waiting"
    fi
    sleep 2
    waited=$((waited + 2))
  done
  return 1
}

echo "+ wait up to ${RENDER_TIMEOUT}s for rendered content"
wait_for_render || {
  close_quietly
  exit_transient "page did not render within ${RENDER_TIMEOUT}s (temporary navigation failure)"
}

# Fail if the page heading is missing on a fully loaded document.
echo "+ verify rendered content"
present="$(cli_eval "() => !!document.querySelector('main h1')" || true)"
present="${present//\"/}"
if ! [[ "$present" == "true" ]]; then
  close_quietly
  exit_defect "rendered page has no 'main h1' content (rendering defect)"
fi

# --- desktop capture -------------------------------------------------------
DESKTOP_PNG="$CAPTURE_DIR/final-desktop.png"
if ! run "resize browser to desktop 1440x900" playwright-cli -s="$SESSION" resize 1440 900; then
  close_quietly
  exit_transient "desktop resize failed (browser infrastructure failure)"
fi

sleep 1
if ! run "screenshot desktop view" playwright-cli -s="$SESSION" screenshot --filename="$DESKTOP_PNG"; then
  close_quietly
  exit_transient "desktop screenshot failed (browser infrastructure failure)"
fi
if ! run "check desktop PNG file" test -s "$DESKTOP_PNG"; then
  close_quietly
  exit_defect "desktop screenshot file missing or empty"
fi
if ! run "check desktop PNG file type" test "$(file --brief --mime-type "$DESKTOP_PNG" 2>/dev/null)" = "image/png"; then
  close_quietly
  exit_defect "desktop screenshot is not a PNG image"
fi
echo "capture: desktop capture complete: $DESKTOP_PNG"

# --- mobile capture --------------------------------------------------------
if ! run "resize browser to mobile 390x844" playwright-cli -s="$SESSION" resize 390 844; then
  close_quietly
  exit_transient "mobile resize failed (browser infrastructure failure)"
fi

# Give responsive styles a beat after the viewport change.
sleep 1
MOBILE_PNG="$CAPTURE_DIR/final-mobile.png"
if ! run "screenshot mobile view" playwright-cli -s="$SESSION" screenshot --filename="$MOBILE_PNG"; then
  close_quietly
  exit_transient "mobile screenshot failed (browser infrastructure failure)"
fi
if ! run "check mobile PNG file" test -s "$MOBILE_PNG"; then
  close_quietly
  exit_defect "mobile screenshot file missing or empty"
fi
if ! run "check mobile PNG file type" test "$(file --brief --mime-type "$MOBILE_PNG" 2>/dev/null)" = "image/png"; then
  close_quietly
  exit_defect "mobile screenshot is not a PNG image"
fi
echo "capture: mobile capture complete: $MOBILE_PNG"

# --- close only this script's browser -------------------------------------
echo "+ close capture browser session"
close_quietly

echo "capture: success"
exit 0
