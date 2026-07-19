#!/usr/bin/env bash
#
# check-tells-self-test.sh — proves check-tells.sh fails on what it claims to.
#
# A guard nobody has ever seen go red is an assumption, not a gate. This script
# seeds each tell into a disposable copy of the tree, runs the guard against it,
# and asserts the guard reports THAT CATEGORY as failed — not merely that it
# exited non-zero, because a mutation that trips a different rule proves nothing
# about the rule under test.
#
# It has already earned its place twice. Writing it found that the emoji scan
# read bytes instead of characters, so it never matched a real emoji; and that
# the provider-name exemption named a path that the epic had just split into
# per-locale partials, which would have turned a legally-required disclosure
# into a permanent red.
#
#     ./scripts/check-tells-self-test.sh

set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; DIM=$'\033[2m'; RESET=$'\033[0m'
PASSED=0; FAILED=0
SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

# A fresh copy of everything the guard reads, per case, so cases cannot leak
# into one another.
fresh_tree() {
  local dir="$SANDBOX/case"
  rm -rf "$dir"
  mkdir -p "$dir/public"
  cp -R "$REPO/src" "$dir/src"
  cp -R "$REPO/scripts" "$dir/scripts"
  cp -R "$REPO/public/fonts" "$dir/public/fonts"
  printf '%s' "$dir"
}

# assert_red <case name> <expected category> <target file> <payload>
assert_red() {
  local name="$1" category="$2" target="$3" payload="$4"
  local dir; dir="$(fresh_tree)"
  printf '%s\n' "$payload" >> "$dir/$target"

  local out; out="$("$dir/scripts/check-tells.sh" 2>&1)"
  if printf '%s' "$out" | grep -q "FAIL.*${category}"; then
    printf '%sok%s    %s\n' "$GREEN" "$RESET" "$name"
    PASSED=$((PASSED + 1))
  else
    printf '%sFAIL%s  %s\n' "$RED" "$RESET" "$name"
    printf '%s      expected category "%s" to go red; it did not%s\n' "$DIM" "$category" "$RESET"
    FAILED=$((FAILED + 1))
  fi
}

# assert_green <case name> <target file> <payload> — the payload must NOT trip
# anything. This is what keeps the guard usable: a rule that shouts about legal
# copy or its own documentation is a rule someone deletes.
assert_green() {
  local name="$1" target="$2" payload="$3"
  local dir; dir="$(fresh_tree)"
  [ -n "$payload" ] && printf '%s\n' "$payload" >> "$dir/$target"

  if "$dir/scripts/check-tells.sh" >/dev/null 2>&1; then
    printf '%sok%s    %s\n' "$GREEN" "$RESET" "$name"
    PASSED=$((PASSED + 1))
  else
    printf '%sFAIL%s  %s\n' "$RED" "$RESET" "$name"
    printf '%s      expected a clean run; the guard went red%s\n' "$DIM" "$RESET"
    "$dir/scripts/check-tells.sh" 2>&1 | grep -A3 FAIL | sed 's/^/        /'
    FAILED=$((FAILED + 1))
  fi
}

PAGE="src/page-content/Cookies.astro"
CATALOG="src/i18n/messages/pages/cookies.ts"

printf '\n%sControl — the tree as committed%s\n' "$DIM" "$RESET"
assert_green "clean tree passes" "" ""

printf '\n%sEmoji and entity glyphs%s\n' "$DIM" "$RESET"
# The literal emoji case is the one that was silently broken: without -CSD perl
# reads this as four latin-1 bytes and the \x{1F000} range never matches.
assert_red "literal 4-byte emoji"      "emoji or entity glyphs" "$PAGE" '<p>🚀 Launch</p>'
assert_red "six-digit decimal entity"  "emoji or entity glyphs" "$PAGE" '<p>&#128640; Launch</p>'
assert_red "five-hex entity"           "emoji or entity glyphs" "$PAGE" '<p>&#x1F680; Launch</p>'
assert_red "dingbat arrow"             "emoji or entity glyphs" "$PAGE" '<p>&#x2713; done</p>'

printf '\n%sRetired components and template kit%s\n' "$DIM" "$RESET"
assert_red "retired card component" "retired card/kit components" "$PAGE" \
  "<FeatureCard title='x' />"
assert_red "retired template kit"   "retired template kit"        "$PAGE" \
  '<div class="gradient-text">x</div>'
assert_red "decorative gradient"    "decorative gradients"        "$PAGE" \
  '<style>.x { background: linear-gradient(90deg, red, blue); }</style>'

printf '\n%sFabricated numbers%s\n' "$DIM" "$RESET"
assert_red "competitor price"          "fabricated prices"          "$PAGE" '<p>around $29/mo</p>'
assert_red "English count claim"       "numbered replace-count"     "$PAGE" '<p>Replaces six different tools</p>'
assert_red "English count, new noun"   "numbered replace-count"     "$PAGE" '<p>four separate vendors</p>'
# Spanish is half the site's copy now; the English noun list cannot see it.
assert_red "Spanish count claim"       "numbered replace-count"     "$CATALOG" \
  "  'x.seeded': 'seis servicios distintos',"
assert_red "Spanish count, noun first" "numbered replace-count"     "$CATALOG" \
  "  'x.seeded': 'cinco herramientas separadas',"

printf '\n%sColour and token discipline%s\n' "$DIM" "$RESET"
assert_red "hardcoded brand hex"  "hardcoded brand colours" "$PAGE" \
  '<style>.x { color: #2c5fd6; }</style>'
assert_red "token hex fallback"   "var(--token, #fallback)" "$PAGE" \
  '<style>.x { color: var(--color-accent, #2c5fd6); }</style>'

printf '\n%si18n rules added by this epic%s\n' "$DIM" "$RESET"
assert_red "pinned locale tag"        "hardcoded locale tags"  "$CATALOG" \
  "  const seeded = d.toLocaleDateString('en-US');"
assert_red "untranslated aria-label"  "untranslated literal"   "$PAGE" \
  '<nav aria-label="Browse by topic"></nav>'
assert_red "client directive"         "client:\\* directives"   "$PAGE" '<Thing client:load />'

printf '\n%sProvider names — the exemption must be exact%s\n' "$DIM" "$RESET"
assert_red "provider in ordinary page" "external provider names" "$PAGE" \
  '<p>We use Stripe for payments.</p>'
# The privacy policy is where naming processors is legally required. All three
# of its shapes must be exempt, including the per-locale prose partials.
assert_green "provider in privacy partial (es)" \
  "src/page-content/legal/privacy.es.astro" '<p>Usamos Stripe para los pagos.</p>'
assert_green "provider in privacy partial (en)" \
  "src/page-content/legal/privacy.en.astro" '<p>We use Stripe for payments.</p>'
assert_green "provider in privacy catalogue" \
  "src/i18n/messages/pages/privacy.ts" "  'x.seeded': 'Usamos Stripe para los pagos.',"

printf '\n%sThe content collections%s\n' "$DIM" "$RESET"
# ~17,500 words of client-facing prose that no rule looked at until now. A
# provider name in a blog post reached production with this script green.
assert_red "provider name in an English post" "external provider names" \
  "src/content/blog/en/automate-seo-pipeline.md" \
  "We generate every article with OpenAI and bill it through Stripe."
assert_red "provider name in a Spanish post"  "external provider names" \
  "src/content/blog/es/automate-seo-pipeline.md" \
  "Generamos cada artículo con OpenAI y lo cobramos con Stripe."
assert_red "provider name in the changelog"   "external provider names" \
  "src/content/changelog/en/2026-04-05-v1.2.0.md" \
  "- **Added** Pixabay image sourcing."
assert_red "fabricated price in a post"       "fabricated prices" \
  "src/content/blog/en/automate-seo-pipeline.md" "Most tools cost around \$40/mo."
# Design-system rules deliberately stop at markup: an arrow is punctuation in a
# sentence, and an article observing what the market does is not a product
# claim. Both of these exist in the real posts today and must stay quiet.
assert_green "arrow used as punctuation in prose" \
  "src/content/blog/en/automate-seo-pipeline.md" "The webhook fires → the UI updates."
assert_green "editorial observation about the market" \
  "src/content/blog/en/automate-seo-pipeline.md" "Most teams juggle 5-10 different tools."

printf '\n%sDocumentation must stay writable%s\n' "$DIM" "$RESET"
# Naming a retired pattern in a comment is how the reason it went away survives.
assert_green "comment naming a tell" "$PAGE" \
  '<!-- the old kit used linear-gradient and gradient-text here -->'

printf '\n%sPreflight%s\n' "$DIM" "$RESET"
dir="$(fresh_tree)"; rm -rf "$dir/src/page-content"
# Capture first, match second. Piping straight into `grep -q` looks equivalent
# but is not: grep exits at the first match, the guard is killed by SIGPIPE, and
# under `pipefail` that 141 becomes the pipeline's status — so the assertion
# fails while the thing it asserts is working. The guard warns about losing an
# exit code through a pipe; its own test managed to do it too.
preflight_out="$("$dir/scripts/check-tells.sh" 2>&1)"
if printf '%s' "$preflight_out" | grep -q 'scan directory'; then
  printf '%sok%s    missing scan directory fails loudly\n' "$GREEN" "$RESET"
  PASSED=$((PASSED + 1))
else
  printf '%sFAIL%s  missing scan directory fails loudly\n' "$RED" "$RESET"
  printf '%s      a vanished source directory must stop the run, not warn%s\n' "$DIM" "$RESET"
  FAILED=$((FAILED + 1))
fi

printf '\n'
if [ "$FAILED" -ne 0 ]; then
  printf '%s%d/%d self-tests failed — the guard does not catch what it claims.%s\n' \
    "$RED" "$FAILED" "$((PASSED + FAILED))" "$RESET"
  exit 1
fi
printf '%sAll %d self-tests passed.%s\n' "$GREEN" "$PASSED" "$RESET"
