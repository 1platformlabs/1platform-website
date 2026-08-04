#!/usr/bin/env bash
#
# activate.sh — cPanel cron activator for the static landing channel.
#
# ⚠️ ESTE SCRIPT TIENE UN GEMELO. La copia de este archivo en el otro repo del
# Core —`1platform-dashboard/deploy/cpanel/activate.sh`— es, a propósito, IDÉNTICA en
# lógica ejecutable: mismo lock, mismo manifest, mismo swap atómico, mismo
# criterio de health. Sólo divergen los comentarios que hablan del artefacto.
#
# Un arreglo en uno que no se porte al otro deja el defecto LATENTE en el que
# no se tocó, y se manifiesta cuando ese canal estrena un docroot. Pasó el
# 2026-07-28: el move-aside del primer arranque existía sólo en la copia del
# dashboard, la landing lo necesitó al publicar en una cuenta cPanel nueva y
# entró en un bucle de fallos de cinco minutos. Verificar antes de mergear:
#
#   diff <(grep -vE '^\s*#|^\s*$' deploy/cpanel/activate.sh) \
#        <(grep -vE '^\s*#|^\s*$' ../1platform-dashboard/deploy/cpanel/activate.sh)
##
# The PROD workflow pushes app.zip + app.zip.sha256 + latest.json over FTPS into
# .deploy/incoming/. This script, run by cron, is the ONLY thing that mutates
# what is served: it detects a new version, verifies the zip checksum, extracts
# it to a fresh release, verifies the extracted tree against the bundle
# manifest, atomically re-points the docroot symlink, optionally health-checks,
# and prunes old releases (keeping one previous for rollback).
#
# It pulls NOTHING from GitHub and needs no token on the host. Robust on a bare
# cPanel: no jq, POSIX-ish tooling, sha256sum|shasum fallback.
#
# WHY A SYMLINK. The shared host was measured before this script was written
# (PCM-07): a document root that IS a symlink is served, and re-pointing it with
# `ln -sfn` + `mv -Tf` changes what is served on the very next request. So the
# swap is atomic and there is no window in which a visitor can get index.html
# from one release and assets from another.
#
# WHY THE HEALTH CHECK CAN BE SKIPPED. Several docroots share this one cPanel
# account. A health URL guessed from a default would let one environment's cron
# read another environment's signal and roll back a perfectly good release on
# it. So the URL is read from a per-docroot file and, when absent, the check is
# SKIPPED — an unverifiable release is kept, never rolled back on someone
# else's signal.
#
# Layout (all under $ROOT, default = the .deploy dir that contains bin/):
#   incoming/            app.zip, app.zip.sha256, latest.json   (FTPS drop)
#   releases/<V>/public  the served tree
#   releases/<V>/MANIFEST.sha256
#   bin/activate.sh      this script
#   logs/activate.log    cron redirect target
#   .health_url          one line: the URL to check for THIS docroot
#   .health_marker       one line: a string that MUST appear in that URL's body
#   .deployed_version  .failed_version  .lock
#
# The docroot symlink itself lives one level up: <parent of $ROOT>/public
#
set -euo pipefail

ROOT="${CPANEL_DEPLOY_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

INCOMING="$ROOT/incoming"
RELEASES="$ROOT/releases"
DOCROOT_LINK="$(dirname "$ROOT")/public"
LOCK="$ROOT/.lock"
DEPLOYED_FILE="$ROOT/.deployed_version"
FAILED_FILE="$ROOT/.failed_version"
HEALTH_FILE="$ROOT/.health_url"
MARKER_FILE="$ROOT/.health_marker"

KEEP="${CPANEL_KEEP_RELEASES:-2}"
# Subtrees whose filenames are content hashes, and are therefore safe to carry
# forward across a release. See graft_previous_assets.
GRAFT_DIRS="${CPANEL_GRAFT_DIRS:-assets _astro}"
HEALTH_RETRIES="${CPANEL_HEALTH_RETRIES:-6}"
HEALTH_SLEEP="${CPANEL_HEALTH_SLEEP:-5}"

HEALTH_URL="${CPANEL_HEALTH_URL:-$( [ -f "$HEALTH_FILE" ] && head -n1 "$HEALTH_FILE" | tr -d '[:space:]' || true )}"
HEALTH_MARKER="${CPANEL_HEALTH_MARKER:-$( [ -f "$MARKER_FILE" ] && head -n1 "$MARKER_FILE" || true )}"

log() { printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

json_get() {
  # $1 = key, $2 = file. Enough for the flat manifest we write ourselves.
  grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$2" 2>/dev/null \
    | head -n1 | sed -E "s/.*:[[:space:]]*\"([^\"]*)\"/\1/"
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# Keep the $KEEP most recent releases. Never runs on the rollback path, so the
# release we just rolled back TO always survives.
prune() {
  # shellcheck disable=SC2012  # release dir names are version strings, safe for ls
  ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
    log "pruning old release: $old"
    rm -rf "$old"
  done
}

# Carry the PREVIOUS release's fingerprinted assets into this one.
#
# THE PROBLEM. Every asset under /assets/ is content-hashed, cached `immutable`,
# and — deliberately — answered with a real 404 when missing rather than the app
# shell. The docroot swap below is atomic, which means a browser tab that loaded
# the previous release's entry chunk goes from "all its chunks exist" to "none of
# them do" between one request and the next. Every route that tab had not visited
# yet dies with `Failed to fetch dynamically imported module`. Measured in prod on
# 2026-08-04: a tab six minutes old, on the login route, showed React Router's raw
# error screen. Nobody's session should end because we shipped.
#
# THE FIX. Hardlink forward the assets the previous release declared, for names
# this release does not already have. Hardlinks, not copies: same inode, so the
# grace window costs no extra bytes and no extra inode against the account's
# shared quota. Pruning the old release later drops its directory entry but not
# the data, because this release still points at it.
#
# WHY THE PREVIOUS MANIFEST AND NOT `find`. MANIFEST.sha256 is written by CI, from
# CI's own dist/, BEFORE any grafting — so it lists exactly one build's files.
# Reading it is what bounds the window: release N carries its own assets plus one
# generation, never a chain that grows by one release forever. `find` over the
# previous public/ would re-carry whatever IT was given and compound each time.
#
# WHERE IT SITS. After verify_manifest (which must judge the tree CI produced, not
# one we added to) and before the swap (so the docroot never points at a tree
# mid-graft). Both are load-bearing; moving this call breaks one of them.
#
# WHICH SUBTREES. Only content-hashed ones: carrying a name that a build can
# REUSE with different bytes would serve the old file forever. Vite writes
# assets/, Astro writes _astro/ — naming both is what lets this function stay
# byte-identical to its twin in 1platform-website (see the header) while each
# host only ever has one of the two on disk.
graft_previous_assets() {
  local prev_public="$1" dest_public="$2"
  local prev_manifest grafted=0 path dir keep
  prev_manifest="$(dirname "$prev_public")/MANIFEST.sha256"

  if [ ! -f "$prev_manifest" ]; then
    # Pre-dates this mechanism, or was hand-placed. Skipping is the safe answer:
    # without the manifest there is no bound, and an unbounded graft is worse
    # than a missing grace window.
    log "graft: no MANIFEST.sha256 for the previous release — skipping (unbounded graft refused)"
    return 0
  fi

  while IFS= read -r line; do
    [ -n "$line" ] || continue
    path="${line#*  }"
    keep=0
    for dir in $GRAFT_DIRS; do
      case "$path" in "$dir"/*) keep=1; break ;; esac
    done
    [ "$keep" = "1" ] || continue
    # Already in this build (same hash = same bytes), or already grafted.
    [ -e "$dest_public/$path" ] && continue
    [ -f "$prev_public/$path" ] || continue
    mkdir -p "$(dirname "$dest_public/$path")"
    if ln "$prev_public/$path" "$dest_public/$path" 2>/dev/null \
      || cp -p "$prev_public/$path" "$dest_public/$path" 2>/dev/null; then
      grafted=$((grafted + 1))
    fi
  done < "$prev_manifest"

  log "graft: carried $grafted asset(s) from $(basename "$(dirname "$prev_public")") into this release"
  return 0
}

# Verify every file in the extracted tree against the manifest the build wrote.
# A zip checksum only proves the archive arrived intact; this proves the tree on
# disk is the tree CI produced — it catches a partial extraction, a disk-full
# truncation, and anything that wrote into the release afterwards.
verify_manifest() {
  local manifest="$1/MANIFEST.sha256" tree="$1/public"
  local want got path bad=0 count=0
  [ -f "$manifest" ] || { log "no MANIFEST.sha256 in release — corrupt bundle"; return 1; }
  [ -d "$tree" ]     || { log "no public/ in release — corrupt bundle"; return 1; }
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    want="${line%% *}"
    path="${line#*  }"
    count=$((count + 1))
    if [ ! -f "$tree/$path" ]; then
      log "manifest: MISSING $path"; bad=$((bad + 1)); continue
    fi
    got="$(sha256_of "$tree/$path")"
    if [ "$got" != "$want" ]; then
      log "manifest: CHECKSUM MISMATCH $path"; bad=$((bad + 1))
    fi
  done < "$manifest"
  local actual
  actual="$(find "$tree" -type f | wc -l | tr -d ' ')"
  if [ "$actual" != "$count" ]; then
    log "manifest: file count mismatch (tree has $actual, manifest declares $count)"
    return 1
  fi
  if [ "$bad" != "0" ]; then
    log "manifest: $bad file(s) failed verification"
    return 1
  fi
  log "manifest: $count files verified"
  return 0
}

# --- lock (mkdir is atomic); the lock records the holder PID so a lock leaked by
#     a SIGKILLed run (CloudLinux LVE) is reclaimed by LIVENESS, not a wall clock.
if [ -d "$LOCK" ]; then
  HOLDER="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$HOLDER" ] && kill -0 "$HOLDER" 2>/dev/null; then
    log "another activate run (pid $HOLDER) holds the lock — exiting"
    exit 0
  fi
  log "reclaiming stale lock (holder pid ${HOLDER:-unknown} not alive)"
  rm -rf "$LOCK"
fi
if ! mkdir "$LOCK" 2>/dev/null; then
  log "another activate run won the lock race — exiting"
  exit 0
fi
echo "$$" > "$LOCK/pid"
trap 'rm -rf "$LOCK" 2>/dev/null || true' EXIT

command -v unzip >/dev/null 2>&1 || { log "unzip not available on this host — cannot activate"; exit 1; }

MANIFEST="$INCOMING/latest.json"
ZIP="$INCOMING/app.zip"

if [ ! -f "$MANIFEST" ] || [ ! -f "$ZIP" ]; then
  log "no incoming artifact yet — nothing to do"
  exit 0
fi

V="$(json_get version "$MANIFEST")"
WANT_SHA="$(json_get sha256 "$MANIFEST")"
if [ -z "$V" ] || [ -z "$WANT_SHA" ]; then
  log "manifest incomplete (version='$V' sha256='$WANT_SHA') — skip, retry next cycle"
  exit 0
fi

DEPLOYED="$( [ -f "$DEPLOYED_FILE" ] && cat "$DEPLOYED_FILE" || true )"
FAILED="$(   [ -f "$FAILED_FILE"   ] && cat "$FAILED_FILE"   || true )"

if [ "$V" = "$DEPLOYED" ]; then
  log "up to date (version $V) — no action"
  exit 0
fi
if [ "$V" = "$FAILED" ]; then
  log "version $V is quarantined (previously failed health) — waiting for a newer version"
  exit 0
fi

# --- verify checksum (guards against a half-uploaded zip) ----------------------
GOT_SHA="$(sha256_of "$ZIP")"
if [ "$GOT_SHA" != "$WANT_SHA" ]; then
  log "checksum mismatch for version $V — upload in progress? skip, retry next cycle"
  exit 0
fi

# --- resolve the currently-served release BEFORE mutating anything -------------
PREV=""
if [ -L "$DOCROOT_LINK" ]; then
  PREV="$(readlink -f "$DOCROOT_LINK" 2>/dev/null || true)"
fi

DEST="$RELEASES/$V"

# Crash recovery (CloudLinux LVE can SIGKILL a run): a prior run may have swapped
# the docroot to this release but died before writing .deployed_version.
# Re-extracting would `rm -rf` the LIVE tree, and PREV would resolve to DEST — a
# self-rollback. If this version is already live and valid, only reconcile.
DEST_REAL="$( [ -d "$DEST/public" ] && readlink -f "$DEST/public" 2>/dev/null || true )"
if [ -n "$DEST_REAL" ] && [ "$PREV" = "$DEST_REAL" ] && [ -f "$DEST/public/index.html" ]; then
  log "version $V already live (interrupted prior run) — reconciling .deployed_version, no re-extract"
  echo "$V" > "$DEPLOYED_FILE"
  prune
  exit 0
fi

# --- extract to a fresh release ------------------------------------------------
log "activating version $V → $DEST"
rm -rf "$DEST"
mkdir -p "$DEST"
if ! unzip -q -o "$ZIP" -d "$DEST"; then
  log "unzip failed for version $V — skip, retry next cycle"
  rm -rf "$DEST"
  exit 0
fi

if [ ! -f "$DEST/public/index.html" ]; then
  log "extracted bundle has no public/index.html — corrupt artifact, skip"
  rm -rf "$DEST"
  exit 0
fi
if [ ! -f "$DEST/public/.htaccess" ]; then
  # Without it the landing loses DirectorySlash (every /pricing 404s instead of
  # redirecting) and gains a directory listing. Serving that is worse than not
  # deploying.
  log "extracted bundle has no public/.htaccess — serving contract missing, skip"
  rm -rf "$DEST"
  exit 0
fi
if ! verify_manifest "$DEST"; then
  log "manifest verification failed for version $V — skip, retry next cycle"
  rm -rf "$DEST"
  exit 0
fi
# Asset grace window for tabs still running the previous release. Runs AFTER the
# manifest check so that check keeps judging CI's tree, and BEFORE the swap so
# the docroot never publishes a half-grafted release.
if [ -n "$PREV" ] && [ -d "$PREV" ]; then
  graft_previous_assets "$PREV" "$DEST/public"
fi


# --- first run only: the document root starts life as a REAL directory ---------
# cPanel creates it that way when the domain is added, and `mv -T` refuses to
# replace a directory with a symlink — so without this the very first activation
# fails and every later one is skipped as "up to date" would never be reached.
# Move it aside instead of deleting it: whatever cPanel or a human left there
# stays recoverable, and the operation is reversible with a single mv.
#
# This block lived only in the dashboard's copy of this script until 2026-07-28,
# when publishing the landing to a second cPanel account hit exactly the failure
# it describes: `mv: cannot overwrite directory '.../public' with non-directory`,
# on a docroot cPanel had just created. The landing never met it before because
# its first docroot was already a symlink by the time this channel ran.
if [ -e "$DOCROOT_LINK" ] && [ ! -L "$DOCROOT_LINK" ]; then
  ASIDE="$DOCROOT_LINK.pre-cpanel-channel.$(date -u +%Y%m%d%H%M%S)"
  if ! mv "$DOCROOT_LINK" "$ASIDE"; then
    log "could not move the existing document root aside — refusing to touch it, skip"
    rm -rf "$DEST"
    exit 1
  fi
  log "document root was a real directory — moved aside to $ASIDE"
fi

# --- atomic swap of the docroot symlink ----------------------------------------
ln -sfn "$DEST/public" "$DOCROOT_LINK.tmp"
mv -Tf "$DOCROOT_LINK.tmp" "$DOCROOT_LINK"
log "docroot → $DEST/public (prev=${PREV:-none})"

# --- first activation: no previous release to roll back to ---------------------
if [ -z "$PREV" ]; then
  log "first activation (no previous release) — health check advisory only, version $V live"
  echo "$V" > "$DEPLOYED_FILE"
  prune
  exit 0
fi

# --- no health URL or no marker configured → keep the release, never roll back -
# A bare 200 is not evidence: this shared origin answers 200 (163 bytes) to ANY
# unknown Host, so "it returned 200" cannot distinguish our site from the
# account's default vhost. Without a marker to match, checking is theatre — and
# rolling back on theatre is worse than not checking.
if [ -z "$HEALTH_URL" ] || [ -z "$HEALTH_MARKER" ]; then
  log "WARNING: health URL and/or marker not configured ($HEALTH_FILE, $MARKER_FILE) — keeping version $V unverified, no rollback"
  echo "$V" > "$DEPLOYED_FILE"
  prune
  exit 0
fi

# --- health check with retries -------------------------------------------------
sleep "$HEALTH_SLEEP"

healthy=0
last_code="000"
i=0
while [ "$i" -lt "$HEALTH_RETRIES" ]; do
  i=$((i + 1))
  BODY_FILE="$(mktemp)"
  CODE="$(curl -s -o "$BODY_FILE" -w '%{http_code}' --max-time 15 "$HEALTH_URL" 2>/dev/null || true)"
  CODE="${CODE:-000}"
  last_code="$CODE"
  if [ "$CODE" = "200" ] && grep -qF "$HEALTH_MARKER" "$BODY_FILE"; then
    healthy=1
    rm -f "$BODY_FILE"
    break
  fi
  if [ "$CODE" = "200" ]; then
    log "health attempt $i/$HEALTH_RETRIES → 200 but marker '$HEALTH_MARKER' absent ($(wc -c < "$BODY_FILE") bytes)"
  else
    log "health attempt $i/$HEALTH_RETRIES → $CODE"
  fi
  rm -f "$BODY_FILE"
  [ "$i" -lt "$HEALTH_RETRIES" ] && sleep "$HEALTH_SLEEP"
done

if [ "$healthy" = "1" ]; then
  log "health OK (200 + marker) — version $V confirmed live"
  echo "$V" > "$DEPLOYED_FILE"
  prune
  exit 0
fi

# Window ended on 000: the box cannot reach the health URL at all (blocked
# hairpin is normal on shared cPanel). Do NOT roll back a possibly-healthy
# release on an unverifiable signal.
if [ "$last_code" = "000" ]; then
  log "WARNING: health unverifiable (curl 000 throughout, likely blocked hairpin) — keeping version $V, no rollback"
  echo "$V" > "$DEPLOYED_FILE"
  prune
  exit 0
fi

# Reachable and still wrong after the full warmup window → the release is bad.
log "health FAILED (final status $last_code, marker not matched) — rolling back to $PREV"
ln -sfn "$PREV" "$DOCROOT_LINK.tmp"
mv -Tf "$DOCROOT_LINK.tmp" "$DOCROOT_LINK"
echo "$V" > "$FAILED_FILE"   # quarantine: do not retry this version
log "rolled back to $PREV; version $V quarantined in .failed_version"
exit 1
