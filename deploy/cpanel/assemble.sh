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

# The Cloudflare zone for 1platform.pro is in `flexible` mode, which means the
# edge speaks plain HTTP to this origin. An https redirect in .htaccess would
# therefore bounce every request forever. Catch it here, in CI, rather than
# discovering it as a production redirect loop.
if grep -qiE 'RewriteRule[^#]*https://|Redirect[[:space:]]+(301|permanent)[^#]*https://' "${OUT}/public/.htaccess"; then
  die ".htaccess appears to force HTTPS — that is an infinite loop under Cloudflare 'flexible'"
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
