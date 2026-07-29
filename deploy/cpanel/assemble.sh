#!/usr/bin/env bash
#
# assemble.sh — build the cPanel bundle for the 1Platform landing.
#
# Unlike the Next.js channels elsewhere in the ecosystem, this artefact is 100%
# static: there is no server.js, no Passenger, no Node App. "Assembling" means
# taking `dist/`, grafting the .htaccess that carries the serving contract, and
# emitting a manifest the host can verify the extracted tree against.
#
# Bundle layout (this is also the release layout on the host):
#
#   <bundle>/public/           the served tree — dist/ + .htaccess
#   <bundle>/MANIFEST.sha256   sha256 of every file under public/, sorted
#   <bundle>/BUNDLE_INFO       version / commit / built_at, one key per line
#
# `public/` is nested one level down on purpose: the docroot symlink points AT
# public/, so MANIFEST.sha256 and BUNDLE_INFO stay outside anything HTTP can
# reach.
#
# Usage: assemble.sh [SRC] [OUT] [HTACCESS]
#   SRC       Astro build output                   (default: dist)
#   OUT       clean output dir = the zip root      (default: cpanel-dist)
#   HTACCESS  serving contract to graft in         (default: deploy/cpanel/htaccess/landing.htaccess)
#
set -euo pipefail

SRC="${1:-dist}"
OUT="${2:-cpanel-dist}"
HTACCESS="${3:-deploy/cpanel/htaccess/landing.htaccess}"

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

die() { echo "::error::assemble: $*" >&2; exit 1; }

[[ -d "$SRC" ]] || die "${SRC} not found — run 'npm run build' first"
[[ -n "$(ls -A "$SRC" 2>/dev/null)" ]] || die "${SRC} is empty"
[[ -f "$HTACCESS" ]] || die "${HTACCESS} not found — the serving contract is not optional"

# These three files ARE the landing's contract, not incidental output:
#   index.html          the home
#   404.html            what makes /no-existe a real 404 instead of a soft 200
#   sitemap-index.xml   the only artefact that proves 71 pages were emitted
# A build that silently drops any of them still produces a plausible-looking
# dist/, which is exactly the failure a size check does not catch.
for required in index.html 404.html sitemap-index.xml; do
  [[ -f "${SRC}/${required}" ]] || die "${SRC}/${required} missing — refusing to publish an incomplete site"
done

# Start from a clean tree so a re-run never mixes stale files into the bundle.
rm -rf "$OUT"
mkdir -p "$OUT/public"

cp -R "${SRC}/." "${OUT}/public/"
cp "$HTACCESS" "${OUT}/public/.htaccess"

# ── The https-loop guard ─────────────────────────────────────────────────────
#
# WHY it exists: the Cloudflare zone for 1platform.pro is in `flexible` mode, so
# the edge speaks plain HTTP to this origin and this origin can never observe a
# client that "already has HTTPS". A redirect to https:// on the SAME host
# therefore never terminates — the browser returns to the edge over HTTPS, the
# edge speaks HTTP to us again, the request is indistinguishable from the first,
# and the same rule fires. Catch that in CI, not as a production redirect loop.
#
# WHY the check is shaped the way it is: the first version of this guard grepped
# for `https://` anywhere in a RewriteRule or Redirect. That is blind — it cannot
# tell a SCHEME force (a loop) from a HOST canonicalisation (not a loop), and it
# fired on the contract's own www → apex 301. A host-changing redirect cannot
# loop: the second request arrives with a different Host, so it no longer
# satisfies `RewriteCond %{HTTP_HOST} ^www\.` and is served. That is measured,
# not reasoned — the identical rule is live on this same hosting (bowerfans.com
# PROD and both QA docroots), where www answers 301 and the apex it points at
# still answers 200.
#
# So the guard now enforces the invariant the prose always meant. Three parts,
# each failing CLOSED — anything not provably host-changing is rejected:
#
#   (A) An https:// redirect target may take its host ONLY from a backreference
#       (%1..%9). That is the one construct that provably yields a host
#       different from the one the request carried. Rejected:
#         https://%{HTTP_HOST}…    echoes the request host          → loop
#         https://%{SERVER_NAME}…  same                             → loop
#         Redirect 301 / https://1platform.pro/   same host, and `Redirect`
#           cannot transform a host at all, so every `Redirect … https://`
#           is a same-host redirect by construction                 → loop
#
#   (B) If such a backreference target exists, the file must also match on
#       %{HTTP_HOST} somewhere. That is what makes "%1 is a hostname" true
#       instead of a fragment captured from some unrelated variable.
#
#   (C) No RewriteCond may branch on the client's scheme (%{HTTPS},
#       %{SERVER_PORT}, X-Forwarded-Proto). At this origin that premise is
#       always false, so such a rule is wrong here whatever it does next. This
#       closes the one hole (A) leaves: a same-host scheme force whose target
#       happens to capture the whole host into %1.
#
# What the guard does NOT claim: that the redirects are correct, or that they
# point anywhere useful. Only that none of them can loop against this origin.
HT="${OUT}/public/.htaccess"

# Apache treats a line as a comment only when its first non-blank character is
# `#`. Dropping exactly those lines is what lets the contract explain a
# forbidden pattern, in prose, without tripping the guard that forbids it.
htaccess_directives="$(grep -vE '^[[:space:]]*#' "$HT" || true)"

# (A) an https:// target whose host is not a %1..%9 backreference
if printf '%s\n' "$htaccess_directives" | grep -qiE \
  '^[[:space:]]*(RewriteRule|Redirect|RedirectMatch|RedirectPermanent|RedirectTemp)[[:space:]].*https://([^%]|%\{|%[^1-9])'; then
  die ".htaccess redirects to https:// without changing the host — infinite loop under Cloudflare 'flexible'. Only a host-changing redirect is allowed, and its target host must come from a %1..%9 backreference."
fi

# (B) a %N host is only meaningful if %N was captured from the host
if printf '%s\n' "$htaccess_directives" | grep -qiE 'https://%[1-9]'; then
  printf '%s\n' "$htaccess_directives" | grep -qiE '^[[:space:]]*RewriteCond[[:space:]]+%\{HTTP_HOST\}' \
    || die ".htaccess redirects to https://%N but never matches on %{HTTP_HOST} — %N is not provably a hostname, so the redirect is not provably host-changing"
fi

# (C) nothing may branch on the client scheme; here it is always plain HTTP
if printf '%s\n' "$htaccess_directives" | grep -qiE \
  '^[[:space:]]*RewriteCond[[:space:]].*(%\{HTTPS\}|%\{SERVER_PORT\}|X-Forwarded-Proto)'; then
  die ".htaccess branches on the client scheme (HTTPS / SERVER_PORT / X-Forwarded-Proto) — behind Cloudflare 'flexible' this origin always sees plain HTTP, so that condition cannot be evaluated here"
fi

# Manifest over the served tree. Paths are relative to public/ and the list is
# sorted with LC_ALL=C so the same dist/ always produces the same manifest.
(
  cd "${OUT}/public"
  find . -type f | LC_ALL=C sort | while IFS= read -r f; do
    printf '%s  %s\n' "$(sha256_of "$f")" "${f#./}"
  done
) > "${OUT}/MANIFEST.sha256"

FILES="$(wc -l < "${OUT}/MANIFEST.sha256" | tr -d ' ')"

# The sha256 of the entry document is the fingerprint the publish job polls for.
# It is the only honest way to tell whether the cron has ACTIVATED this release:
# the workflow's own conclusion says nothing, because activation happens later.
INDEX_SHA="$(sha256_of "${OUT}/public/index.html")"

cat > "${OUT}/BUNDLE_INFO" <<EOF
version=${BUNDLE_VERSION:-dev}
commit=${BUNDLE_COMMIT:-unknown}
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
files=${FILES}
index_sha=${INDEX_SHA}
EOF

# The destination is a shared cPanel account with a hard 300k inode quota shared
# with every other site on it. Disk size is not the binding constraint — file
# COUNT is, and hitting the cap surfaces as odd write failures, not a clear
# message. Print it every build so the number stays visible in the job log.
echo "assemble: bundle ready at ${OUT} ($(du -sh "$OUT" | cut -f1), ${FILES} files)"
echo "assemble: inode budget → ${FILES} files x 2 retained releases ≈ $((FILES * 2)) inodes"
echo "assemble: fingerprint (sha256 de index.html) → ${INDEX_SHA}"
