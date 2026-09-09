#!/usr/bin/env bash
#
# check-no-regression.sh — the byte-for-byte gate, wired so nobody has to
# remember scripts/compare-served.mjs's arguments. (issue #99)
#
# WHY THIS EXISTS
# ----------------
# `compare-served.mjs` is the instrument that holds the SERVER's output against
# the frozen baseline (F0); this is what invokes it correctly, every time,
# without a human — or a workflow file — having to reconstruct its arguments.
#
# Two traps were measured before this script existed:
#   - It has nothing to compare against without a running server AND a static
#     build of the exact commit tests/baseline/baseline.json was frozen from.
#   - Calling it bare (no `--bodies`) used to fall back to a raw-hash-only
#     comparison that cannot tell a legitimate normalisation (JSON-LD
#     whitespace, scoped-style reordering — see compare-served.mjs's own
#     NORMALISERS) from a real regression: 1 identical / 52 differing on a
#     clean tree. `compare-served.mjs` now REFUSES to run without `--bodies`
#     (exit 2), so this script is the only correct way to invoke it — it is
#     structurally impossible to reach that false catastrophe through here.
#
# WHAT IT DOES
#   1. Builds the CURRENT tree (`npm run build`).
#   2. Finds the commit tests/baseline/baseline.json was last frozen from — its
#      own last-touching commit's PARENT — and builds THAT tree's dist/ in a
#      disposable git worktree, so a future re-freeze keeps this script correct
#      without anyone having to edit it.
#   3. Serves the CURRENT build (`node dist/server/entry.mjs`,
#      `SITE_MANIFEST_SOURCE=repo` — the only mode this can serve without a
#      live API, same choice playwright.config.ts makes for CI) and waits for
#      it to answer.
#   4. Runs the comparator with `--bodies` pointed at step 2's dist/.
#   5. Tears down the server and the worktree, and exits with the
#      comparator's own exit code (0 identical, 1 real differences/failures,
#      2 the instrument itself could not run).
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

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; DIM=$'\033[2m'; RESET=$'\033[0m'

WORKTREE=""
SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" >/dev/null 2>&1
  [ -n "$SERVER_PID" ] && wait "$SERVER_PID" 2>/dev/null
  if [ -n "$WORKTREE" ] && [ -d "$WORKTREE" ]; then
    git -C "$REPO" worktree remove "$WORKTREE" --force >/dev/null 2>&1
  fi
  git -C "$REPO" worktree prune >/dev/null 2>&1
}
trap cleanup EXIT INT TERM

echo "1/4 building the current tree"
npm run build

echo "2/4 finding and building the baseline commit's tree"
BASELINE_FILE="tests/baseline/baseline.json"
if [ ! -f "$BASELINE_FILE" ]; then
  printf '%sFAIL%s  %s does not exist — run scripts/freeze-baseline.mjs first\n' "$RED" "$RESET" "$BASELINE_FILE"
  exit 2
fi

# A shallow checkout (the CI default) cannot reach a commit outside its
# fetched depth. Unshallowing here — once, best-effort — is what lets this
# work in a normal `actions/checkout@v5` PR job without asking the workflow to
# know about this script's needs.
if [ "$(git -C "$REPO" rev-parse --is-shallow-repository 2>/dev/null)" = "true" ]; then
  git -C "$REPO" fetch --unshallow --quiet origin 2>/dev/null || git -C "$REPO" fetch --deepen=1000 --quiet origin 2>/dev/null || true
fi

TOUCH_SHA="$(git -C "$REPO" log --format=%H -1 -- "$BASELINE_FILE" 2>/dev/null)"
if [ -z "$TOUCH_SHA" ]; then
  printf '%sFAIL%s  could not find a commit that touched %s\n' "$RED" "$RESET" "$BASELINE_FILE"
  exit 2
fi
BASELINE_SHA="$(git -C "$REPO" rev-parse "${TOUCH_SHA}^" 2>/dev/null)"
if [ -z "$BASELINE_SHA" ]; then
  printf '%sFAIL%s  commit %s (which froze the baseline) has no reachable parent — is the ' "$RED" "$RESET" "$TOUCH_SHA"
  printf 'checkout deep enough?%s\n' "$RESET"
  exit 2
fi
printf '%s      baseline commit: %s (parent of %s, which froze %s)%s\n' "$DIM" "$BASELINE_SHA" "$TOUCH_SHA" "$BASELINE_FILE" "$RESET"

WORKTREE="$(mktemp -d)/baseline"
git -C "$REPO" worktree add --detach --quiet "$WORKTREE" "$BASELINE_SHA"
( cd "$WORKTREE" && npm ci --no-audit --no-fund --silent && npm run build --silent )

echo "3/4 serving the current build in repo mode"
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

echo "4/4 comparing against the baseline"
node scripts/compare-served.mjs --base "$BASE" --bodies "$WORKTREE/dist" $EXPLAIN_FLAG
RC=$?

if [ "$RC" -eq 0 ]; then
  printf '%scheck-no-regression: OK — 1platform.pro is unchanged.%s\n' "$GREEN" "$RESET"
else
  printf '%scheck-no-regression: FAIL — re-run with --explain for the first divergence of each route.%s\n' "$RED" "$RESET"
fi
exit "$RC"
