#!/usr/bin/env bash
#
# publish-activator.test.sh — drives publish-activator.sh against a REAL FTP server.
#
# The mode parser has its own self-test (`publish-activator.sh --self-test`). This
# file tests the part that self-test cannot reach: the sequence of FTP commands,
# and whether the script really leaves the live activator alone when something
# goes wrong.
#
# Why bother, given every failure path is written to fail closed: the cost of
# being wrong is asymmetric. This step runs before the bundle upload on three
# production docroots, so a command the server does not support — SITE CHMOD being
# the obvious candidate — would not endanger the hosts, but it WOULD stop every
# deploy until a human noticed. Proving the sequence against a real FTP daemon is
# what turns that from a guess into a measurement.
#
# The server's files stay INSIDE the container and are inspected with `docker
# exec`. A bind mount would be easier to read, and would also make the negative
# control meaningless: Docker Desktop virtualises ownership and modes on macOS, so
# "make this directory unwritable" would not actually make it unwritable.
#
# What it pins down:
#   1. a clean publish leaves the host's activate.sh byte-identical to the repo's;
#   2. it is executable afterwards — the entire reason this is not a plain `put`;
#   3. re-running is idempotent;
#   4. NEGATIVE CONTROL: when the publish cannot complete, the LIVE activator is
#      untouched and still executable, and the script exits non-zero. This is the
#      one that matters — the difference between "deploys pause" and "deploys
#      break on every host at once";
#   5. NEGATIVE CONTROL: a missing .deploy/bin fails rather than inventing one.
#
# NOT A CI GATE, deliberately. `publish-activator.sh --self-test` is — it is
# deterministic and needs nothing installed, and it runs in the publish job before
# the mode guard is trusted to decide anything. This file needs Docker and lftp,
# and publishing two vsftpd containers with two passive port ranges proved flaky
# on Docker Desktop (measured: the same tree passed 14/14 and then failed twice in
# a row on the second container's readiness, with nothing changed). Wiring a flaky
# check into the job that ships production is worse than not wiring it: it would
# block deploys at random, and a gate people learn to re-run is a gate nobody
# believes. Run it by hand — `npm run test:deploy:activator` — when touching
# publish-activator.sh.
#
# Requires Docker + lftp. Usage: bash deploy/cpanel/publish-activator.test.sh
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/deploy/cpanel/publish-activator.sh"
ACTIVATOR="$REPO_ROOT/deploy/cpanel/activate.sh"

command -v docker >/dev/null 2>&1 || { echo "SKIP-FAIL: this test needs docker" >&2; exit 1; }
command -v lftp   >/dev/null 2>&1 || { echo "SKIP-FAIL: this test needs lftp" >&2; exit 1; }

PASS=0; FAIL=0
ok()  { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }
check() { if [ "$1" = "$2" ]; then ok "$3"; else bad "$3 (got '$1', want '$2')"; fi; }

sha_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  else shasum -a 256 "$1" | awk '{print $1}'; fi
}

NAME="publish-activator-test-$$"
PORT=2121
FTPUSER=tester
FTPPASS=testerpass
HOME_DIR="/home/$FTPUSER"
BIN_DIR="$HOME_DIR/.deploy/bin"
LIVE="$BIN_DIR/activate.sh"

NAME_NOCHMOD="$NAME-nochmod"
cleanup() { docker rm -f "$NAME" "$NAME_NOCHMOD" >/dev/null 2>&1 || true; }
trap cleanup EXIT

dex() { docker exec "$NAME" sh -c "$1" 2>/dev/null; }

echo "publish-activator · against a real FTP server"

# vsftpd on alpine, built at run time so the image is whatever architecture this
# machine actually is. `seccomp_sandbox=NO` and `allow_writeable_chroot=YES` are
# what a containerised vsftpd needs; neither is under test.
docker ps -aq --filter "name=publish-activator-test" | xargs -r docker rm -f >/dev/null 2>&1 || true

# Build once. An earlier draft ran `apk add vsftpd` inside each container, and the
# second server lost a race with its own readiness window — a flake that looked
# like "the server is broken" and was really "the package was still installing".
# The Dockerfile goes through a directory, not a pipe: `docker build` closes stdin
# once it has the context, which under `set -o pipefail` kills the writer with
# SIGPIPE and makes the pipeline report 141 on a build that actually succeeded.
IMG="publish-activator-test-ftpd"
CTX="$(mktemp -d)"
cat > "$CTX/Dockerfile" <<DOCKEREOF
FROM alpine:3.20
RUN apk add --no-cache vsftpd \
 && adduser -D ${FTPUSER} \
 && echo "${FTPUSER}:${FTPPASS}" | chpasswd
DOCKEREOF
docker build -q -t "$IMG" "$CTX" >/dev/null 2>&1 \
  || { echo "FATAL: could not build the FTP test image" >&2; rm -rf "$CTX"; exit 1; }
rm -rf "$CTX"

# $1 container name · $2 host port · $3 chmod_enable (YES|NO)
start_ftp() {
  local name="$1" port="$2" chmod_enable="$3" pasv_lo="$4" pasv_hi="$5" err
  err="$(mktemp)"
  docker run -d --name "$name" -p "$port:21" -p "$pasv_lo-$pasv_hi:$pasv_lo-$pasv_hi" "$IMG" sh -c "
  mkdir -p /etc/vsftpd
  cat > /etc/vsftpd/vsftpd.conf <<EOF
listen=YES
anonymous_enable=NO
local_enable=YES
write_enable=YES
chmod_enable=$chmod_enable
local_umask=022
chroot_local_user=YES
allow_writeable_chroot=YES
seccomp_sandbox=NO
pasv_enable=YES
pasv_min_port=$pasv_lo
pasv_max_port=$pasv_hi
pasv_address=127.0.0.1
EOF
  exec vsftpd /etc/vsftpd/vsftpd.conf
" >/dev/null 2>"$err" || { echo "FATAL: could not start $name" >&2; cat "$err" >&2; rm -f "$err"; exit 1; }
  rm -f "$err"

  local i
  for i in $(seq 1 60); do
    if lftp -u "$FTPUSER","$FTPPASS" "ftp://127.0.0.1:$port" \
         -e "set ftp:passive-mode true; set net:max-retries 1; set net:timeout 3; ls; bye" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "FATAL: $name never became reachable" >&2; docker logs "$name" 2>&1 | tail -20 >&2; exit 1
}

start_ftp "$NAME" "$PORT" YES 30000 30009
# A stand-in for whatever each host is running today. Every "the live activator
# was not touched" assertion compares against this exact content.
seed_old_activator() {
  dex "mkdir -p '$BIN_DIR' && printf '#!/usr/bin/env bash\necho OLD\n' > '$LIVE' && chmod 755 '$LIVE' && chown -R $FTPUSER '$HOME_DIR/.deploy'"
}
seed_old_activator
OLD_SHA="$(dex "sha256sum '$LIVE'" | awk '{print $1}')"
WANT_SHA="$(sha_of "$ACTIVATOR")"

export PUBLISH_ACTIVATOR_LFTP_SETTINGS='set cmd:fail-exit yes
set xfer:clobber on
set ftp:passive-mode true
set net:max-retries 2
set net:timeout 10'
export CPANEL_FTP_HOST="ftp://127.0.0.1:$PORT"
export CPANEL_FTP_USER="$FTPUSER"
export CPANEL_FTP_PASS="$FTPPASS"

run_publish() { ( cd "$REPO_ROOT" && bash "$SCRIPT" "$ACTIVATOR" ) > "$1" 2>&1; echo $?; }

L1="$(mktemp)"; L3="$(mktemp)"; L4="$(mktemp)"
trap 'cleanup; rm -f "$L1" "$L3" "$L4"' EXIT

# ── 1 · a clean publish ───────────────────────────────────────────────────────
check "$(run_publish "$L1")" "0" "a clean publish exits 0"
check "$(dex "sha256sum '$LIVE'" | awk '{print $1}')" "$WANT_SHA" "the host's activator now matches the repo byte for byte"
check "$(dex "test -x '$LIVE' && echo yes || echo no")" "yes" "and it is executable (a bare put would leave 644)"
check "$(dex "test -e '$LIVE.part' && echo yes || echo no")" "no" "no .part left behind"

# ── 2 · idempotent ────────────────────────────────────────────────────────────
check "$(run_publish "$L1")" "0" "re-running is idempotent"
check "$(dex "sha256sum '$LIVE'" | awk '{print $1}')" "$WANT_SHA" "and still matches"

# ── 3 · NEGATIVE CONTROL: the publish cannot complete ─────────────────────────
# The directory is made unwritable for the FTP user, so staging fails. Whatever
# breaks, the invariant is the same: the activator the host executes is still the
# old one, it is still runnable, and the script says so by exiting non-zero.
seed_old_activator
dex "chmod 555 '$BIN_DIR'"
RC="$(run_publish "$L3")"
dex "chmod 755 '$BIN_DIR'"
[ "$RC" != "0" ] && ok "a publish that cannot complete exits non-zero" || bad "a publish that cannot complete exits non-zero (got $RC)"
check "$(dex "sha256sum '$LIVE'" | awk '{print $1}')" "$OLD_SHA" "NEGATIVE CONTROL: the LIVE activator was not touched"
check "$(dex "test -x '$LIVE' && echo yes || echo no")" "yes" "and is still executable — this host's deploys keep working"

# ── 4 · NEGATIVE CONTROL: no .deploy/bin at all ───────────────────────────────
dex "rm -rf '$HOME_DIR/.deploy'"
RC="$(run_publish "$L4")"
[ "$RC" != "0" ] && ok "a missing .deploy/bin fails instead of inventing one" || bad "a missing .deploy/bin fails instead of inventing one (got $RC)"
check "$(dex "test -d '$BIN_DIR' && echo yes || echo no")" "no" "and nothing was created"

# ── 5 · NEGATIVE CONTROL: a server that refuses SITE CHMOD ───────────────────
# The hazard this whole design exists for. If the host's FTP daemon does not
# implement SITE CHMOD, a naive publisher would leave a mode-644 activator in
# place and — on a docroot whose cron invokes it directly — stop that host's
# deploys. The only acceptable outcome is: refuse, exit non-zero, change nothing.
# The first server has done its job; retire it and reuse its ports. Running two
# vsftpd containers with two published passive ranges side by side was flaky on
# Docker Desktop, and nothing in this scenario needs the earlier one alive.
docker rm -f "$NAME" >/dev/null 2>&1 || true
start_ftp "$NAME_NOCHMOD" "$PORT" NO 30000 30009
docker exec "$NAME_NOCHMOD" sh -c "mkdir -p '$BIN_DIR' && printf '#!/usr/bin/env bash\necho OLD\n' > '$LIVE' && chmod 755 '$LIVE' && chown -R $FTPUSER '$HOME_DIR/.deploy'" >/dev/null 2>&1
L5="$(mktemp)"
RC="$(run_publish "$L5")"
[ "$RC" != "0" ] && ok "a server without SITE CHMOD is refused, not worked around" || bad "a server without SITE CHMOD is refused, not worked around (got $RC)"
LIVE_SHA="$(docker exec "$NAME_NOCHMOD" sh -c "sha256sum '$LIVE'" 2>/dev/null | awk '{print $1}')"
check "$LIVE_SHA" "$OLD_SHA" "NEGATIVE CONTROL: it did NOT replace the live activator with a 644 copy"
check "$(docker exec "$NAME_NOCHMOD" sh -c "test -x '$LIVE' && echo yes || echo no" 2>/dev/null)" "yes" "and the host can still run it"
rm -f "$L5"

echo
if [ "$FAIL" -ne 0 ]; then
  echo "publish-activator: $PASS passed, $FAIL FAILED"
  for f in "$L1" "$L3" "$L4"; do echo "--- $f ---"; cat "$f" 2>/dev/null; done
  exit 1
fi
echo "publish-activator: $PASS passed"
