#!/usr/bin/env bash
#
# publish-activator.sh — keep the host's copy of activate.sh in sync with the repo.
#
# ⚠️ ESTE SCRIPT TIENE UN GEMELO, igual que activate.sh: la copia en
# `1platform-dashboard/deploy/cpanel/publish-activator.sh` es, a propósito, IDÉNTICA
# en lógica ejecutable. Verificar antes de mergear:
#
#   diff <(grep -vE '^\s*#|^\s*$' deploy/cpanel/publish-activator.sh) \
#        <(grep -vE '^\s*#|^\s*$' ../1platform-dashboard/deploy/cpanel/publish-activator.sh)
#
# WHY THIS EXISTS. The publish job uploads app.zip, its checksum and latest.json —
# and nothing else. `activate.sh`, the script that decides what a browser is
# actually served, lived only on the host, installed by hand. So a fix to it could
# merge, pass every check, and never run: measured on 2026-08-04, the asset grace
# window shipped in dashboard#126 was inert on all three docroots the moment it
# merged. CI verifies the repo; it did not verify the host.
#
# THE HAZARD THIS IS BUILT AROUND. FTP `put` does not carry the executable bit.
# If the host's cron invokes the activator directly rather than through `bash`,
# replacing it with a mode-644 file stops deploys on that docroot — silently, and
# on every host at once. So this NEVER writes over the live script until it has
# proven, against the server's own listing and a byte-for-byte read-back, that the
# replacement is executable and intact. Every failure path leaves the running
# activator exactly where it was.
#
# Ordering: this runs BEFORE the bundle upload. A failure here therefore means
# nothing was deployed at all, which is an unambiguous state to debug — and the
# release that needs the new activator is activated by it, not by the old one.
#
# Env: CPANEL_FTP_HOST, CPANEL_FTP_USER, CPANEL_FTP_PASS
# Usage: publish-activator.sh [SRC]        (default: deploy/cpanel/activate.sh)
#        publish-activator.sh --self-test  (no network; proves the guard discriminates)
set -euo pipefail

REMOTE_DIR=".deploy/bin"
REMOTE_NAME="activate.sh"
PART="${REMOTE_NAME}.part"

log() { printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  else shasum -a 256 "$1" | awk '{print $1}'; fi
}

# The one decision that can be silently wrong, so it is a named function with a
# self-test: does the server's own listing say this file is owner-executable?
# Anything that is not a regular file with `x` in the owner triad is a NO —
# including an empty string, which is what a failed listing produces and which a
# naive `grep x` would happily accept.
mode_is_executable() {
  local line="${1:-}"
  [ -n "$line" ] || return 1
  case "$line" in
    -[rwx-][rwx-]x*) return 0 ;;
    *) return 1 ;;
  esac
}

if [ "${1:-}" = "--self-test" ]; then
  pass=0; fail=0
  t() { # t <expect 0|1> <line> <label>
    if mode_is_executable "$2"; then got=0; else got=1; fi
    if [ "$got" = "$1" ]; then pass=$((pass+1)); printf '  ok   %s\n' "$3"
    else fail=$((fail+1)); printf '  FAIL %s (expected %s, got %s)\n' "$3" "$1" "$got"; fi
  }
  echo "publish-activator · mode guard"
  t 0 "-rwxr-xr-x 1 u g 4096 Aug  4 02:00 activate.sh.part" "accepts 755"
  t 0 "-rwx------ 1 u g 4096 Aug  4 02:00 activate.sh.part" "accepts 700"
  t 1 "-rw-r--r-- 1 u g 4096 Aug  4 02:00 activate.sh.part" "REJECTS 644 — the mode a bare put leaves"
  t 1 "-rw-rwxr-x 1 u g 4096 Aug  4 02:00 activate.sh.part" "REJECTS group/other x without owner x"
  t 1 "drwxr-xr-x 2 u g 4096 Aug  4 02:00 bin"              "REJECTS a directory"
  t 1 ""                                                     "REJECTS an empty listing (a failed ls is not a pass)"
  t 1 "550 Failed to open file."                             "REJECTS a server error line"
  echo
  [ "$fail" -eq 0 ] || { echo "mode guard: $pass passed, $fail FAILED"; exit 1; }
  echo "mode guard: $pass passed"
  exit 0
fi

SRC="${1:-deploy/cpanel/activate.sh}"
[ -f "$SRC" ] || { echo "::error::${SRC} not found"; exit 1; }
: "${CPANEL_FTP_HOST:?CPANEL_FTP_HOST is required}"
: "${CPANEL_FTP_USER:?CPANEL_FTP_USER is required}"
: "${CPANEL_FTP_PASS:?CPANEL_FTP_PASS is required}"

WANT_SHA="$(sha256_of "$SRC")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Same transport settings as the bundle upload, kept identical on purpose: one
# hosting quirk should not have two different answers in the same job.
#
# PUBLISH_ACTIVATOR_LFTP_SETTINGS exists so `publish-activator.test.sh` can drive
# this against a throwaway FTP container and prove the SEQUENCE — stage, chmod,
# read back, rename, confirm — rather than only unit-testing the mode parser. It
# is unset everywhere else, so production always gets the hardened block below.
# It is not a privilege boundary: anyone who can set it can already edit the
# workflow that calls this.
DEFAULT_LFTP_SETTINGS='set cmd:fail-exit yes
set xfer:clobber on
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate yes
set net:max-retries 3
set net:timeout 20'

lftp_run() {
  lftp -u "$CPANEL_FTP_USER","$CPANEL_FTP_PASS" "$CPANEL_FTP_HOST" <<FTPEOF
${PUBLISH_ACTIVATOR_LFTP_SETTINGS:-$DEFAULT_LFTP_SETTINGS}
cd ${REMOTE_DIR}
${1}
bye
FTPEOF
}

# Best-effort, and deliberately not fatal: a leftover .part is inert (nothing
# executes it) and failing the cleanup would mask the real error above it.
discard_part() { lftp_run "rm -f ${PART}" >/dev/null 2>&1 || true; }

publish_once() {
  # 1 · stage beside the live script, never over it
  lftp_run "put \"${SRC}\" -o ${PART}
chmod 755 ${PART}" >/dev/null || { log "upload/chmod failed"; return 1; }

  # 2 · the server's own listing is the authority on the mode, not our intent
  local listing
  listing="$(lftp_run "ls ${PART}" 2>/dev/null | tr -d '\r' | grep -F "${PART}" | tail -n1 || true)"
  if ! mode_is_executable "$listing"; then
    log "staged copy is not executable — listing: ${listing:-<empty>}"
    log "refusing to replace the live activator (a mode-644 activator can stop this docroot's deploys)"
    discard_part
    return 1
  fi

  # 3 · read it back before it goes live: a truncated transfer must never become
  #     the script the host runs
  lftp_run "get ${PART} -o ${TMP}/roundtrip.sh" >/dev/null || { log "read-back failed"; discard_part; return 1; }
  local got_sha; got_sha="$(sha256_of "${TMP}/roundtrip.sh")"
  if [ "$got_sha" != "$WANT_SHA" ]; then
    log "read-back sha mismatch (want ${WANT_SHA:0:12}…, got ${got_sha:0:12}…)"
    discard_part
    return 1
  fi

  # 4 · atomic rename. A cron run in flight keeps its descriptor to the old
  #     inode, so replacing the directory entry cannot corrupt a live execution.
  lftp_run "mv ${PART} ${REMOTE_NAME}" >/dev/null || { log "rename failed"; discard_part; return 1; }

  # 5 · confirm what is actually there now, rather than trusting step 4's exit code
  lftp_run "get ${REMOTE_NAME} -o ${TMP}/live.sh" >/dev/null || { log "post-rename read-back failed"; return 1; }
  got_sha="$(sha256_of "${TMP}/live.sh")"
  if [ "$got_sha" != "$WANT_SHA" ]; then
    log "the live activator does not match the repo after rename (got ${got_sha:0:12}…)"
    return 1
  fi
  return 0
}

# A freshly created FTP account can answer the first connection with a transient
# 530, which lftp does not retry because it is an auth failure. Same reason and
# same shape as the bundle upload's retry.
for attempt in 1 2 3; do
  if publish_once; then
    log "activator in sync on the host (sha ${WANT_SHA:0:12}…, mode 755)"
    exit 0
  fi
  echo "::warning::activator publish attempt ${attempt}/3 failed"
  [ "$attempt" -lt 3 ] && sleep 15
done

echo "::error::could not publish activate.sh to ${REMOTE_DIR}/. The live activator was NOT modified — this docroot keeps running its previous copy, so deploys still work but any fix to activate.sh is not live on it."
exit 1
