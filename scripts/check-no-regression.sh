#!/usr/bin/env bash
#
# check-no-regression.sh — the byte-for-byte gate, wired so nobody has to
# remember scripts/compare-served.mjs's arguments. (issues #99, #112)
#
# WHY THIS EXISTS
# ----------------
# `compare-served.mjs` is the instrument that holds the SERVER's answers
# against the frozen baseline; this is what invokes it correctly, every time,
# without a human — or a workflow file — having to reconstruct its arguments.
#
# Three traps were measured before this script had its current shape:
#   - It has nothing to compare against without a running server.
#   - Calling the comparator bare (no bodies) used to fall back to a
#     raw-hash-only comparison that cannot tell a legitimate normalisation
#     (JSON-LD whitespace, scoped-style reordering — see compare-served.mjs's
#     own NORMALISERS) from a real regression: 1 identical / 52 differing on a
#     clean tree. The frozen bodies now live in `tests/baseline/html/` and are
#     committed, so both sides are always on hand.
#   - It used to get those bodies by checking out the commit the baseline was
#     frozen from and running `npm ci && npm run build` on it, here, on every
#     pull request. That stopped working the day that commit built a SERVER
#     (`dist/` has no `.html` at all any more) and it was a gate with an
#     unwritten expiry date besides: it needed a year-old lockfile to keep
#     installing. Both are gone — this script now builds ONCE.
#
# WHAT IT DOES
#   1. Builds the current tree (`npm run build`).
#   2. Serves it (`node dist/server/entry.mjs`, `SITE_MANIFEST_SOURCE=repo` —
#      the only mode this can serve without a live API, the same choice
#      playwright.config.ts makes for CI) and waits for it to answer.
#   3. Runs the comparator, which reads the frozen bodies and the `Host` to
#      measure from `tests/baseline/baseline.json`.
#   4. Tears the server down and exits with the comparator's own exit code
#      (0 identical, 1 real differences/failures, 2 the instrument could not
#      run).
#
# WHEN IT GOES RED ON PURPOSE
#   A change that legitimately alters what the site serves makes this red, and
#   that is the gate working: re-freezing is how someone DECLARES the new bytes
#   are the ones we want. Re-freeze with
#
#     npm run build
#     HOST=127.0.0.1 PORT=4331 SITE_MANIFEST_SOURCE=repo node dist/server/entry.mjs &
#     node scripts/freeze-baseline.mjs --base http://127.0.0.1:4331 --host 1platform.pro
#
#   and commit the diff under tests/baseline/ — which IS the review artefact:
#   the pull request shows, line by line, what the site started serving.
#
# USAGE
#   npm run check:baseline
#   ./scripts/check-no-regression.sh [--explain]

set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"
PORT="${PORT:-4331}"
BASE="http://127.0.0.1:${PORT}"
# A plain string, not an array: the macOS system bash (3.2) treats
# `"${arr[@]}"` on an EMPTY array as an unbound variable under `set -u`, which
# is exactly the shell this script has to run under locally.
EXPLAIN_FLAG=""
[ "${1:-}" = "--explain" ] && EXPLAIN_FLAG="--explain"

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; RESET=$'\033[0m'

SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  [ -n "$SERVER_PID" ] && wait "$SERVER_PID" 2>/dev/null
  return 0
}
trap cleanup EXIT INT TERM

BASELINE_FILE="tests/baseline/baseline.json"
BASELINE_BODIES="tests/baseline/html"
if [ ! -f "$BASELINE_FILE" ]; then
  printf '%sFAIL%s  %s does not exist — run scripts/freeze-baseline.mjs first\n' "$RED" "$RESET" "$BASELINE_FILE"
  exit 2
fi
if [ ! -d "$BASELINE_BODIES" ]; then
  printf '%sFAIL%s  %s does not exist — the frozen bodies are committed; re-freeze\n' "$RED" "$RESET" "$BASELINE_BODIES"
  exit 2
fi

echo "1/3 building the current tree"
npm run build || exit 2

echo "2/3 serving the build in repo mode"
HOST=127.0.0.1 PORT="$PORT" SITE_MANIFEST_SOURCE=repo node dist/server/entry.mjs &
SERVER_PID=$!

tries=60
until curl -fsS -o /dev/null "${BASE}/" 2>/dev/null; do
  tries=$((tries - 1))
  if [ "$tries" -le 0 ]; then
    printf '%sFAIL%s  server on %s never answered\n' "$RED" "$RESET" "$BASE"
    exit 2
  fi
  sleep 0.5
done

echo "3/3 comparing against the baseline"
node scripts/compare-served.mjs --base "$BASE" $EXPLAIN_FLAG
RC=$?

if [ "$RC" -eq 0 ]; then
  printf '%scheck-no-regression: OK — 1platform.pro is unchanged.%s\n' "$GREEN" "$RESET"
else
  printf '%scheck-no-regression: FAIL — re-run with --explain for the first divergence of each route.%s\n' "$RED" "$RESET"
fi
exit "$RC"
