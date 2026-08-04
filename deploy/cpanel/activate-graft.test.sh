#!/usr/bin/env bash
#
# activate-graft.test.sh — end-to-end test for the asset grace window in activate.sh.
#
# TWIN. activate.sh is, by the contract stated in its own header, identical in
# executable logic to 1platform-dashboard/deploy/cpanel/activate.sh. This file is
# that repo's test, adjusted for what assemble.sh requires here (404.html,
# sitemap-index.xml, landing.htaccess) and for the _astro/ layout Astro emits.
# It exists so the shared logic is guarded on BOTH sides: a fix that lands in one
# twin and rots in the other is exactly the failure that header warns about.
#
# Runs the REAL activate.sh against real bundles produced by the REAL assemble.sh,
# in a throwaway tree. Nothing is stubbed, because the properties under test are
# about ordering and file identity, and a stub of either would be free to agree
# with whatever the test expects.
#
# What it pins down:
#
#   1. a tab on release N-1 can still fetch its chunks after release N activates;
#   2. the window is bounded to ONE generation — release N does not carry N-2,
#      so the tree cannot grow by a release forever;
#   3. carried assets are hardlinks, so the window costs no extra bytes/inodes;
#   4. NEGATIVE CONTROL: the graft runs after manifest verification, never before.
#      A release whose extracted tree is missing a file its own manifest declares
#      must be rejected even when the previous release happens to have a file of
#      that exact name — i.e. the graft must not be able to launder a corrupt
#      bundle into a passing one;
#   5. NEGATIVE CONTROL: with no previous MANIFEST.sha256 there is no bound, and
#      an unbounded graft is refused rather than guessed at.
#
# Usage: bash deploy/cpanel/activate-graft.test.sh
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ASSEMBLE="$REPO_ROOT/deploy/cpanel/assemble.sh"
ACTIVATE="$REPO_ROOT/deploy/cpanel/activate.sh"
HTACCESS="$REPO_ROOT/deploy/cpanel/htaccess/landing.htaccess"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0
ok()   { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }
check() { if [ "$1" = "$2" ]; then ok "$3"; else bad "$3 (got '$1', want '$2')"; fi; }

sha_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  else shasum -a 256 "$1" | awk '{print $1}'; fi
}

DEPLOY_PARENT="$TMP/site"
ROOT="$DEPLOY_PARENT/.deploy"
mkdir -p "$ROOT/incoming" "$ROOT/releases"

# Builds a dist/ that looks like a Vite build: a hashed entry chunk, a hashed
# page chunk, and index.html referencing the entry. `shared-KEEP.js` carries the
# same bytes (hence the same name) across releases, which is what makes test 4 a
# real control rather than a coincidence.
make_dist() {
  local dir="$1" tag="$2"
  rm -rf "$dir"; mkdir -p "$dir/assets"
  printf 'console.log("entry %s");\n' "$tag" > "$dir/assets/index-$tag.js"
  printf 'console.log("login %s");\n' "$tag" > "$dir/assets/LoginPage-$tag.js"
  printf 'console.log("shared");\n'          > "$dir/assets/shared-KEEP.js"
  mkdir -p "$dir/_astro"
  printf 'console.log("astro %s");\n' "$tag" > "$dir/_astro/page.$tag.js"
  printf '<!doctype html><script type="module" src="/_astro/page.%s.js"></script>\n' "$tag" \
    > "$dir/index.html"
  # assemble.sh here refuses a tree without these two.
  printf '<!doctype html><title>404</title>\n'    > "$dir/404.html"
  printf '<?xml version="1.0"?><sitemapindex/>\n' > "$dir/sitemap-index.xml"
}

# Aborts the whole run if assemble.sh fails. Without this the bundle is simply
# absent, activate.sh logs "no incoming artifact yet", and assertions phrased as
# "this must NOT be there" pass for the worst possible reason.
publish() {
  local tag="$1" version="$2"
  make_dist "$TMP/dist" "$tag"
  if ! ( cd "$REPO_ROOT" && BUNDLE_VERSION="$version" BUNDLE_COMMIT=test \
      bash "$ASSEMBLE" "$TMP/dist" "$TMP/bundle" "$HTACCESS" > "$TMP/assemble.log" 2>&1 ); then
    echo "FATAL: assemble.sh failed for $version — the test cannot report on anything" >&2
    cat "$TMP/assemble.log" >&2
    exit 1
  fi
  [ -f "$TMP/bundle/MANIFEST.sha256" ] || { echo "FATAL: assemble produced no bundle" >&2; exit 1; }
}

drop_from_bundle() { rm -f "$TMP/bundle/public/$1"; }

activate() {
  local version="$1"
  rm -f "$ROOT/incoming/app.zip"
  ( cd "$TMP/bundle" && zip -qr "$ROOT/incoming/app.zip" . )
  printf '{"version":"%s","sha256":"%s"}\n' \
    "$version" "$(sha_of "$ROOT/incoming/app.zip")" > "$ROOT/incoming/latest.json"
  CPANEL_DEPLOY_ROOT="$ROOT" bash "$ACTIVATE" >> "$TMP/activate.log" 2>&1
  echo $?
}

# Reports `<no-symlink>` rather than an empty string when the docroot was never
# swapped. The first draft of this file compared `basename $(dirname "")` and got
# `.` on both sides, so four assertions passed on a run where activate.sh had
# aborted and nothing was ever published. A test that cannot tell "published X"
# from "published nothing" is worse than no test.
served() {
  local link="$DEPLOY_PARENT/public"
  [ -L "$link" ] || { echo "<no-symlink>"; return; }
  readlink "$link"
}
live_version() {
  local target; target="$(served)"
  [ "$target" = "<no-symlink>" ] && { echo "<none>"; return; }
  basename "$(dirname "$target")"
}

# activate.sh targets a Linux cPanel host and uses `mv -Tf` for the atomic swap,
# which BSD/macOS mv does not have. Refuse to run rather than report on a swap
# that never happened.
if ! mv --help 2>&1 | grep -q -- '-T'; then
  echo "SKIP-FAIL: this test needs GNU mv (-T). Run it on Linux, or:" >&2
  echo "  docker run --rm -v \"\$PWD\":/w -w /w debian:stable-slim \\" >&2
  echo "    sh -c 'apt-get update -qq && apt-get install -y -qq zip unzip >/dev/null && bash deploy/cpanel/activate-graft.test.sh'" >&2
  exit 1
fi

echo "activate.sh · asset grace window"

# ── release 1 ────────────────────────────────────────────────────────────────
publish aaa 1.0.0
activate 1.0.0 >/dev/null
check "$(live_version)" "1.0.0" "release 1.0.0 is live"

# ── release 2: the previous release's chunks must survive the swap ───────────
publish bbb 2.0.0
activate 2.0.0 >/dev/null
LIVE="$(served)"
check "$(live_version)" "2.0.0" "release 2.0.0 is live"
[ -f "$LIVE/assets/index-bbb.js" ]     && ok "2.0.0 serves its own entry chunk"        || bad "2.0.0 serves its own entry chunk"
[ -f "$LIVE/assets/LoginPage-aaa.js" ] && ok "a tab on 1.0.0 can still fetch its chunk" || bad "a tab on 1.0.0 can still fetch its chunk"
# The twin in 1platform-website serves an Astro build, whose hashed files live
# under _astro/. Same executable logic, so the same test has to cover it.
[ -f "$LIVE/_astro/page.aaa.js" ] && ok "_astro/ is carried too (the twin's layout)" || bad "_astro/ is carried too (the twin's layout)"

# Hardlink, not copy: same inode as the file still sitting in release 1.
INO_NEW="$(ls -i "$LIVE/assets/LoginPage-aaa.js" | awk '{print $1}')"
INO_OLD="$(ls -i "$ROOT/releases/1.0.0/public/assets/LoginPage-aaa.js" | awk '{print $1}')"
check "$INO_NEW" "$INO_OLD" "carried assets are hardlinks (no duplicated bytes)"

# ── release 3: the window is ONE generation, not a growing chain ─────────────
publish ccc 3.0.0
activate 3.0.0 >/dev/null
LIVE="$(served)"
check "$(live_version)" "3.0.0" "release 3.0.0 is live"
[ -f "$LIVE/assets/LoginPage-bbb.js" ] && ok "3.0.0 carries 2.0.0 (one generation back)" || bad "3.0.0 carries 2.0.0 (one generation back)"
[ ! -f "$LIVE/assets/LoginPage-aaa.js" ] && ok "3.0.0 does NOT carry 1.0.0 — window is bounded" || bad "3.0.0 does NOT carry 1.0.0 — window is bounded"

# ── NEGATIVE CONTROL: verification judges CI's tree, before any graft ────────
# 4.0.0's manifest declares assets/shared-KEEP.js but the extracted tree lacks
# it — and 3.0.0 has a file of exactly that name. If grafting ran first it would
# supply the file and verification would pass, publishing a corrupt bundle.
BEFORE="$(served)"
publish ddd 4.0.0
drop_from_bundle assets/shared-KEEP.js
activate 4.0.0 >/dev/null
check "$(served)" "$BEFORE" "a bundle missing a manifested file is REJECTED, not laundered by the graft"
[ ! -d "$ROOT/releases/4.0.0" ] && ok "the rejected release leaves nothing behind" || bad "the rejected release leaves nothing behind"

# ── NEGATIVE CONTROL: no previous manifest ⇒ refuse rather than graft blind ──
rm -f "$ROOT/releases/3.0.0/MANIFEST.sha256"
publish eee 5.0.0
activate 5.0.0 >/dev/null
LIVE="$(served)"
check "$(live_version)" "5.0.0" "release 5.0.0 is live"
[ ! -f "$LIVE/assets/LoginPage-ccc.js" ] && ok "unbounded graft refused when the previous manifest is gone" || bad "unbounded graft refused when the previous manifest is gone"
grep -q "unbounded graft refused" "$TMP/activate.log" && ok "and it says so in the log" || bad "and it says so in the log"

echo
if [ "$FAIL" -ne 0 ]; then
  echo "activate.sh graft: $PASS passed, $FAIL FAILED"
  echo "--- activate.log ---"; cat "$TMP/activate.log"
  exit 1
fi
echo "activate.sh graft: $PASS passed"
