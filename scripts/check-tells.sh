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
SRC="src/pages src/components src/layouts"

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

FILES=$(find $SRC -type f \( -name '*.astro' -o -name '*.ts' -o -name '*.css' \))

# 1. Emoji and HTML entity glyphs standing in for icons.
m=$(perl -ne '
  print "$ARGV:$.:$_" if !/&#x27;/
    && /[\x{1F000}-\x{1FAFF}]|[\x{2190}-\x{27BF}]|&#[0-9]{4,5};|&#x[0-9A-Fa-f]{4};/;
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
m=$(grep -rniE '\b(two|three|four|five|six|seven|eight|nine|ten|[0-9]+) +(different +|separate +|distinct +)?(vendors?|accounts?|services?|tools?|subscriptions?|providers?|platforms?|apis?|dashboards?|logins?|bills?|integrations?)\b|\b(19|13)\+' $SRC \
  | strip_comments)
report "no numbered replace-count claim" \
       "the site contradicted itself (4 / 5 / 6 / 19+ / 13+); the agreed phrasing carries no number" "$m"

# 5. Brand colour as a hex literal instead of a token. Neutral #fff/#000
#    shorthand inside authored SVG is tolerated; brand colours are not.
m=$(grep -rnE '#[0-9a-fA-F]{6}' src/pages src/components \
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
m=$(grep -rniE 'openai|anthropic|\bmigo\b|tributax|pixabay|pexels|valueserp|publisuites|nicho\.ai|\bstripe\b|\bresend\b' $SRC \
  | grep -v 'src/pages/privacy.astro' | strip_comments)
report "no external provider names outside the privacy policy" \
       "capabilities are presented as native product features" "$m"

# 11. Presentational components stay zero-JS.
m=$(grep -rnE 'client:(load|idle|visible|media|only)' $SRC | strip_comments)
report "no client:* directives" \
       "the site ships static HTML; islands would blow the JS budget" "$m"

echo
if [ "$FAILED" -ne 0 ]; then
  printf '%sDesign-system check failed.%s See the findings above.\n' "$RED" "$RESET"
  exit 1
fi
printf '%sAll design-system checks passed.%s\n' "$GREEN" "$RESET"
