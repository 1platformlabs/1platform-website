#!/usr/bin/env bash
#
# check-tells.sh — guards the design system against sliding back into the
# "AI landing template" patterns this site was rebuilt to remove.
#
# This repo has no pull-request CI (prod.yml runs on push to main only, and its
# Lighthouse step is informative), so this script is the durable net. Run it
# locally before opening a PR:
#
#     ./scripts/check-tells.sh
#
# Exits non-zero if any category has findings. Every rule below traces to a real
# tell that existed in this codebase.

set -uo pipefail
cd "$(dirname "$0")/.."

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; DIM=$'\033[2m'; RESET=$'\033[0m'
FAILED=0
# Every rule scans this surface, so it has to name every place authored copy and
# markup can live. The i18n epic moved ~1,050 strings into src/i18n and all page
# markup into src/page-content; leaving those out would have kept the script
# green while it watched two directories that no longer held the content it
# exists to police.
SRC="src/pages src/components src/layouts src/i18n src/page-content"

# Documentation comments legitimately name the patterns they removed, so a
# JSDoc/line/HTML comment is not a finding. Everything else is.
strip_comments() {
  grep -vE ':[0-9]+: *(\*|//|<!--|/\*)' || true
}

# report <name> <why> <matches>
#
# Matches are passed as an ARGUMENT, never piped: a `... | report` pipeline runs
# the function in a subshell, where FAILED=1 is lost and the script exits 0
# while printing FAIL. That bug shipped once; it must not come back.
report() {
  local name="$1" why="$2" matches="$3"
  if [ -n "$matches" ]; then
    printf '%sFAIL%s  %s\n' "$RED" "$RESET" "$name"
    printf '%s      %s%s\n' "$DIM" "$why" "$RESET"
    printf '%s\n' "$matches" | sed 's/^/        /'
    FAILED=1
  else
    printf '%sok%s    %s\n' "$GREEN" "$RESET" "$name"
  fi
}

# A check that cannot run must fail loudly, never pass quietly.
# (BSD grep has no -P, which is why the emoji scan uses perl.)
command -v perl >/dev/null 2>&1 || {
  printf '%sFAIL%s  preflight: perl is required for the emoji scan\n' "$RED" "$RESET"
  exit 1
}

# A scan directory that no longer exists must stop the script, not print a
# `find: no such file` line above a green "ok". Renaming a source directory is
# exactly how a rule quietly stops seeing the code it guards.
for dir in $SRC; do
  [ -d "$dir" ] || {
    printf '%sFAIL%s  preflight: scan directory %s does not exist\n' "$RED" "$RESET" "$dir"
    printf '%s      every directory in SRC must exist, or rules silently scan less%s\n' \
      "$DIM" "$RESET"
    exit 1
  }
done

FILES=$(find $SRC -type f \( -name '*.astro' -o -name '*.ts' -o -name '*.css' \))

# 1. Emoji and HTML entity glyphs standing in for icons.
# `-CSD` is load-bearing, not decoration. Without it perl reads bytes, so a
# 4-byte emoji arrives as four separate latin-1 characters and the \x{1F000}
# range never matches: the scan reported "clean" against files full of emoji.
# The entity bounds were short for the same reason — the pasted form of an
# emoji is six decimal digits (&#128640;) or five hex (&#x1F680;), both of
# which fell outside {4,5} and {4}. Widening them is what makes the rule cover
# the case its own comment describes.
m=$(perl -CSD -ne '
  print "$ARGV:$.:$_" if !/&#x27;/
    && /[\x{1F000}-\x{1FAFF}]|[\x{2190}-\x{27BF}]|&#[0-9]{4,6};|&#x[0-9A-Fa-f]{4,6};/;
  close ARGV if eof;
' $FILES | strip_comments)
report "no emoji or entity glyphs as icons" \
       "icons come from Icon.astro, tick marks from Check.astro" "$m"

# 2. Components retired by the redesign must not come back.
m=$(grep -rnE '(from ["'"'"']@components/(PillarSection|FeatureCard|UseCaseCard|SolutionCard|MetricCounter|LogoCarousel|PipelineAnimation)|<(PillarSection|FeatureCard|UseCaseCard|SolutionCard|MetricCounter|LogoCarousel|PipelineAnimation)[ />])' $SRC | strip_comments)
report "no retired card/kit components" \
       "one Card primitive with variants replaced the four near-identical cards" "$m"

# 3. Fabricated pricing and vanity metrics.
m=$(grep -rnE '\$[0-9]+ ?\+?/ ?mo|around \$[0-9]|[0-9],?[0-9]*\+ (Stores|Invoices|Articles)|Platform in Numbers|data-count-to' $SRC | strip_comments)
report "no fabricated prices or vanity metrics" \
       "competitor prices and hand-maintained traction numbers had no source" "$m"

# 4. The "replaces N tools" claim must carry no unverifiable number.
#    The noun list and the optional qualifier both matter: the first version of
#    this rule missed "four vendors", "four accounts" and "five separate
#    providers" because it only knew five nouns and allowed only "different"
#    between the number and the noun. Count words are spelled out as well as
#    numeric. "one X" is the unified claim, not a fragmented count, so it is
#    excluded rather than matched.
#    The Spanish half is not optional: half the site's copy is Spanish now, and
#    the English noun list cannot see "seis servicios distintos". Spanish puts
#    the qualifier after the noun, so the shape is mirrored, not copied. As in
#    English, "un/una X" is the unified claim and is excluded rather than
#    matched — only real counts start at two/dos.
m=$(grep -rniE '\b(two|three|four|five|six|seven|eight|nine|ten|[0-9]+) +(different +|separate +|distinct +)?(vendors?|accounts?|services?|tools?|subscriptions?|providers?|platforms?|apis?|dashboards?|logins?|bills?|integrations?)\b|\b(19|13)\+' $SRC \
  | strip_comments)
m2=$(grep -rniE '\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|[0-9]+) +(herramientas?|servicios?|proveedores?|cuentas?|suscripciones?|plataformas?|paneles?|panel|integraciones?|facturas?|apis?|accesos?|programas?|aplicaciones?)( +(distintas?|distintos?|separadas?|separados?|diferentes?|sueltas?|sueltos?))?\b' $SRC \
  | strip_comments)
m=$(printf '%s\n%s' "$m" "$m2" | grep -v '^$' || true)
report "no numbered replace-count claim" \
       "the site contradicted itself (4 / 5 / 6 / 19+ / 13+); the agreed phrasing carries no number" "$m"

# 5. Brand colour as a hex literal instead of a token. Neutral #fff/#000
#    shorthand inside authored SVG is tolerated; brand colours are not.
# (src/layouts stays out: BaseLayout legitimately carries the theme-color meta.)
m=$(grep -rnE '#[0-9a-fA-F]{6}' src/pages src/components src/page-content src/i18n \
  | grep -viE '#(ffffff|000000)\b' | strip_comments)
report "no hardcoded brand colours" \
       "colour decisions live in the token layer (global.css), not in pages" "$m"

# 6. Token fallbacks silently bypass the system.
m=$(grep -rnE 'var\(--[a-z-]+, *#' $SRC | strip_comments)
report "no var(--token, #fallback) colour fallbacks" \
       "a fallback hex means the page renders off-system when a token is renamed" "$m"

# 7. The retired template kit.
m=$(grep -rnE 'gradient-text|dot-grid|hero__blob|hero__aurora|marquee|transition: *all' $SRC | strip_comments)
report "no retired template kit" \
       "gradient text, dot grids, aurora blobs, marquees and transition:all" "$m"

# 8. Gradients as brand decoration. Functional masks are allowed.
m=$(grep -rnE 'linear-gradient' $SRC | grep -viE 'mask-image' | strip_comments)
report "no decorative gradients" \
       "one flat accent; 135deg icon tiles and gradient washes are the template look" "$m"

# 9. Typography must actually be embedded, not merely declared.
m=$({
  face_count=$(grep -c '@font-face' src/styles/global.css || true)
  woff_count=$(ls public/fonts/*.woff2 2>/dev/null | wc -l | tr -d ' ')
  [ "${face_count:-0}" -ge 3 ] || echo "only ${face_count:-0} @font-face rules in global.css"
  [ "${woff_count:-0}" -ge 3 ] || echo "only ${woff_count:-0} .woff2 files in public/fonts/"
  tr -d '\n' < src/layouts/BaseLayout.astro \
    | grep -qE 'rel="preload"[^>]*fonts/[^>]*as="font"' \
    || echo "no font preload in BaseLayout.astro"
})
report "fonts are self-hosted and preloaded" \
       "the faces were declared but never embedded, so everything rendered in system-ui" "$m"

# 10. Provider names are client-facing only in the privacy policy.
# The exclusion follows the privacy policy's CONTENT, not one path. Under the
# shell pattern src/pages/privacy.astro is four lines; the prose that names
# processors lives in the per-locale partials, plus a frame component, a message
# module and a Spanish shell. Pinning the old path would have exempted a file
# with nothing in it while policing the five that actually carry the text.
#
# The `.en`/`.es` branch is not optional and is the reason this list is written
# out: an earlier version of this rule matched only `privacy.astro|privacy.ts`,
# which silently excluded nothing that mattered and turned the legally-required
# processor disclosure into a permanent red.
m=$(grep -rniE 'openai|anthropic|\bmigo\b|tributax|pixabay|pexels|valueserp|publisuites|nicho\.ai|\bstripe\b|\bresend\b' $SRC \
  | grep -viE '(^|/)privacy(\.(en|es))?\.(astro|ts):' | strip_comments)
report "no external provider names outside the privacy policy" \
       "capabilities are presented as native product features" "$m"

# 11. Presentational components stay zero-JS.
m=$(grep -rnE 'client:(load|idle|visible|media|only)' $SRC | strip_comments)
report "no client:* directives" \
       "the site ships static HTML; islands would blow the JS budget" "$m"

# 12. A pinned locale tag renders one language's dates in both trees. The tags
#     live in the i18n module, keyed by locale; nothing else may name one.
m=$(grep -rnE "['\"](en-US|es-ES|en-GB|es-MX)['\"]" $SRC \
  | grep -v 'src/i18n/ui.ts' | strip_comments)
report "no hardcoded locale tags" \
       "dates and numbers format from the page's locale, not a literal" "$m"

# 13. Copy belongs in a message module, so a literal in the markup is a string
#     that exists in one language only. Catches the common slip of translating a
#     page but leaving one heading or aria-label behind.
m=$(grep -rnE '(aria-label|title|alt|placeholder)="[A-Za-z][A-Za-z ,.!?'"'"'-]{7,}"' \
  src/page-content src/components src/layouts 2>/dev/null \
  | grep -viE 'aria-label=\{|title=\{|\{t\(|Astro\.props' | strip_comments)
report "no untranslated literal attributes" \
       "visible and accessible text comes from t(), not from a literal" "$m"

echo
if [ "$FAILED" -ne 0 ]; then
  printf '%sDesign-system check failed.%s See the findings above.\n' "$RED" "$RESET"
  exit 1
fi
printf '%sAll design-system checks passed.%s\n' "$GREEN" "$RESET"
