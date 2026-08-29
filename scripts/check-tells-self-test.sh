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
# into one another. Rule 14 measures the BUILD, so the sandbox fabricates a
# minimal dist/ — tiny and honest: the rule's own floor check would reject an
# empty one.
fresh_tree() {
  local dir="$SANDBOX/case"
  rm -rf "$dir"
  mkdir -p "$dir/public" "$dir/dist/_astro"
  cp -R "$REPO/src" "$dir/src"
  cp -R "$REPO/scripts" "$dir/scripts"
  cp -R "$REPO/public/fonts" "$dir/public/fonts"
  printf '%s' '<html></html>' > "$dir/dist/index.html"
  head -c 4000 /dev/urandom | base64 > "$dir/dist/_astro/app.js"
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
# The home's dot texture is exempt BY NAME ONLY (rule 7, D-7). A dot grid under
# any other name is still the retired kit; the exempt name itself must stay
# quiet or the home's own class would turn the guard red.
assert_red "dot grid under another name" "retired template kit"        "$PAGE" \
  '<div class="hero dot-grid">x</div>'
assert_green "the home dot grid class is exempt" "$PAGE" \
  '<section class="ref-dot-grid">x</section>'
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

# The advertising family this epic brings to the site. The narrow spelling has
# to be proved in BOTH directions or it is worth nothing: red on the brand as
# copy would actually write it, and green on the two things that made the bare
# word unusable -- the `<meta>` element and the ordinary Spanish noun.
assert_red "ad network in an ordinary page" "external provider names" "$PAGE" \
  '<p>Publicamos tus campanas en Meta Ads.</p>'
assert_red "ad network, hyphenated"         "external provider names" "$PAGE" \
  '<p>Conecta tu cuenta de Meta-Business.</p>'
assert_red "ad network, second brand"       "external provider names" "$CATALOG" \
  "  'x.seeded': 'Publica en Facebook e Instagram.',"
assert_green "meta element is not a brand" "$PAGE" \
  '<meta name="seeded" content="x" />'
assert_green "Spanish noun meta is not a brand" "$CATALOG" \
  "  'x.seeded': 'Alcanza tu meta de ventas del trimestre.',"

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

printf '\n%sRules of the home epic (14 · 15)%s\n' "$DIM" "$RESET"
# 14 — a build that outgrows the budget goes red; a missing build never passes
# quietly. The payload is random (incompressible), so 250 KB stays ~250 KB
# after gzip and clears the 210 KB line.
dir="$(fresh_tree)"
head -c 250000 /dev/urandom > "$dir/dist/_astro/three-fake.js"
# Capture first, match second (see the preflight note): under pipefail the
# guard's own exit 1 would poison the condition even when grep matches.
out="$("$dir/scripts/check-tells.sh" 2>&1)"
if printf '%s' "$out" | grep -q 'FAIL.*JS inside'; then
  printf '%sok%s    a build over the JS budget goes red\n' "$GREEN" "$RESET"; PASSED=$((PASSED + 1))
else
  printf '%sFAIL%s  a build over the JS budget goes red\n' "$RED" "$RESET"; FAILED=$((FAILED + 1))
fi

dir="$(fresh_tree)"
rm -rf "$dir/dist"
out="$("$dir/scripts/check-tells.sh" 2>&1)"
if printf '%s' "$out" | grep -q 'FAIL.*JS inside'; then
  printf '%sok%s    a missing build fails the budget loudly\n' "$GREEN" "$RESET"; PASSED=$((PASSED + 1))
else
  printf '%sFAIL%s  a missing build fails the budget loudly\n' "$RED" "$RESET"; FAILED=$((FAILED + 1))
fi

# 15 — the banned-name scan travels as sha256 digests, so this file cannot
# prove the REAL name (it must not contain it; the control run in the epic's
# PROGRESO did that). What it proves is the MECHANISM, with a synthetic term
# injected by digest, in the shapes that have bitten before: bare word,
# kebab-case, CamelCase prefix, glued into a longer identifier.
SYNTH_SHA=$(printf 'zzsyntheticbrand' | shasum -a 256 | cut -d' ' -f1)
for shape in 'zzsyntheticbrand' 'uikit-zzsyntheticbrand-theme' 'ZzSyntheticBrandProvider' 'tryzzsyntheticbrand'; do
  dir="$(fresh_tree)"
  printf "const probe = '%s';\n" "$shape" >> "$dir/src/components/home/media.ts"
  out="$(CHECK_TELLS_EXTRA_NAME_SHA256="$SYNTH_SHA" "$dir/scripts/check-tells.sh" 2>&1)"
  if printf '%s' "$out" | grep -q 'FAIL.*never named'; then
    printf '%sok%s    banned name caught as "%s"\n' "$GREEN" "$RESET" "$shape"; PASSED=$((PASSED + 1))
  else
    printf '%sFAIL%s  banned name caught as "%s"\n' "$RED" "$RESET" "$shape"; FAILED=$((FAILED + 1))
  fi
done

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
