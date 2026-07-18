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
# Exits non-zero on the first category with findings. Every rule below traces to
# a real tell that existed in this codebase.

set -uo pipefail
cd "$(dirname "$0")/.."

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; DIM=$'\033[2m'; RESET=$'\033[0m'
FAILED=0
SRC="src/pages src/components src/layouts"

# report <name> <explanation> ; reads matches on stdin
report() {
  local name="$1" why="$2" matches
  matches="$(cat)"
  if [ -n "$matches" ]; then
    printf '%sFAIL%s  %s\n' "$RED" "$RESET" "$name"
    printf '%s      %s%s\n' "$DIM" "$why" "$RESET"
    printf '%s\n' "$matches" | sed 's/^/        /'
    FAILED=1
  else
    printf '%sok%s    %s\n' "$GREEN" "$RESET" "$name"
  fi
}

# Preflight: a check that cannot run must fail loudly, never pass quietly.
# (BSD grep has no -P, which is why the emoji scan below uses perl.)
command -v perl >/dev/null 2>&1 || {
  printf '%sFAIL%s  preflight: perl is required for the emoji scan\n' "$RED" "$RESET"
  exit 1
}

# 1. Emoji and HTML entity glyphs standing in for icons.
perl -ne '
  print "$ARGV:$.:$_" if !/&#x27;/
    && /[\x{1F000}-\x{1FAFF}]|[\x{2190}-\x{27BF}]|&#[0-9]{4,5};|&#x[0-9A-Fa-f]{4};/;
  close ARGV if eof;   # reset $. so line numbers are per-file
' $(find $SRC -type f \( -name '*.astro' -o -name '*.ts' -o -name '*.css' \)) \
  | report "no emoji or entity glyphs as icons" \
           "icons come from Icon.astro, tick marks from Check.astro"

# 2. Components retired by the redesign must not come back.
grep -rnE '(from ["'"'"']@components/(PillarSection|FeatureCard|UseCaseCard|SolutionCard|MetricCounter|LogoCarousel|PipelineAnimation)|<(PillarSection|FeatureCard|UseCaseCard|SolutionCard|MetricCounter|LogoCarousel|PipelineAnimation)[ />])' $SRC \
  | report "no retired card/kit components" \
           "one Card primitive with variants replaced the four near-identical cards"

# 3. Fabricated pricing and vanity metrics.
grep -rnE '\$[0-9]+ ?\+?/ ?mo|around \$[0-9]|[0-9],?[0-9]*\+ (Stores|Invoices|Articles)|Platform in Numbers|data-count-to' $SRC \
  | report "no fabricated prices or vanity metrics" \
           "competitor prices and hand-maintained traction numbers had no source"

# 4. The "replaces N tools" claim must carry no unverifiable number.
grep -rniE '(six|five|four|seven|[0-9]+) (different )?(services|tools|subscriptions|providers|platforms)\b|\b(19|13)\+' $SRC \
  | grep -viE 'separate (tools|services)' \
  | report "no numbered replace-count claim" \
           "the site contradicted itself (4 / 5 / 6 / 19+ / 13+); the agreed phrasing carries no number"

# 5. Brand colour as a hex literal instead of a token.
#    Neutral #fff/#000 shorthand inside SVG markup is tolerated; six-digit
#    brand colours are not.
grep -rnE '#[0-9a-fA-F]{6}' src/pages src/components \
  | grep -viE '#(ffffff|000000)\b' \
  | report "no hardcoded brand colours" \
           "colour decisions live in the token layer (global.css), not in pages"

# 6. Token fallbacks silently bypass the system.
grep -rnE 'var\(--[a-z-]+, *#' $SRC \
  | report "no var(--token, #fallback) colour fallbacks" \
           "a fallback hex means the page renders off-system when a token is renamed"

# 7. The retired template kit.
grep -rnE 'gradient-text|dot-grid|hero__blob|hero__aurora|marquee|transition: *all' $SRC \
  | report "no retired template kit" \
           "gradient text, dot grids, aurora blobs, marquees and transition:all"

# 8. Gradients as brand decoration. Masks are allowed (functional fades).
grep -rnE 'linear-gradient' $SRC \
  | grep -viE 'mask-image' \
  | report "no decorative gradients" \
           "one flat accent; 135deg icon tiles and gradient washes are the template look"

# 9. Typography must actually be embedded, not merely declared.
{
  face_count=$(grep -c '@font-face' src/styles/global.css || true)
  woff_count=$(ls public/fonts/*.woff2 2>/dev/null | wc -l | tr -d ' ')
  [ "${face_count:-0}" -ge 3 ] || echo "only ${face_count:-0} @font-face rules in global.css"
  [ "${woff_count:-0}" -ge 3 ] || echo "only ${woff_count:-0} .woff2 files in public/fonts/"
  # The preload links are formatted across several lines, so flatten first.
  tr -d '\n' < src/layouts/BaseLayout.astro \
    | grep -qE 'rel="preload"[^>]*fonts/[^>]*as="font"' \
    || echo "no font preload in BaseLayout.astro"
} | report "fonts are self-hosted and preloaded" \
           "the faces were declared but never embedded, so everything rendered in system-ui"

# 10. Provider names are client-facing only in the privacy policy.
grep -rniE 'openai|anthropic|\bmigo\b|tributax|pixabay|pexels|valueserp|publisuites|nicho\.ai|\bstripe\b|\bresend\b' $SRC \
  | grep -v 'src/pages/privacy.astro' \
  | report "no external provider names outside the privacy policy" \
           "capabilities are presented as native product features"

# 11. Presentational components stay zero-JS.
grep -rnE 'client:(load|idle|visible|media|only)' $SRC \
  | report "no client:* directives" \
           "the site ships static HTML; islands would blow the JS budget"

echo
if [ "$FAILED" -ne 0 ]; then
  printf '%sDesign-system check failed.%s See the findings above.\n' "$RED" "$RESET"
  exit 1
fi
printf '%sAll design-system checks passed.%s\n' "$GREEN" "$RESET"
