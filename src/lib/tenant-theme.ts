import type { SiteTenant } from './site-api'

/**
 * The tenant's theme, as CSS custom properties for ONE request.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 * WMT-05 says a tenant's theme is a package of tokens. The API half of that
 * story shipped: `SiteTenant.theme` is modelled, its accent is format-checked
 * against an injection-safe hex pattern, and its ink is contrast-checked
 * against that accent before a write is accepted.
 *
 * The rendering half did not. `--color-accent` was `var(--cobalt)` in
 * `global.css` — a build-time constant — and NOTHING in the tree read
 * `theme.accent`. Measured on the served HTML of both tenants: zero
 * occurrences of either declared accent. So every tenant rendered in
 * 1Platform's cobalt while its manifest said otherwise, and the clinic's own
 * logo mark was drawn in the platform's blue.
 *
 * ── ⚠️ ONLY WHAT DIFFERS IS EMITTED, and that is the epic's own criterion ──
 * The central acceptance criterion is that `1platform.pro` does not regress,
 * BYTE for byte, against the frozen F0 baseline. Tenant #1's accent IS the
 * compiled default, so emitting it would add bytes to every one of its pages
 * to declare the colour it already had. Measured, with an unconditional block:
 * the comparator went from 51 identical / 2 differing to 1 / 52.
 *
 * So a token is emitted only when it actually differs from what the build
 * compiled. A tenant whose theme is the default gets no block at all, and the
 * baseline holds.
 *
 * ── What is deliberately NOT here: `display_font` ───────────────────────────
 * `theme.display_font` is carried by the manifest and is NOT rendered, on
 * purpose. Tenant #1 declares `instrument-serif` while `global.css` sets
 * `--font-display` to Space Grotesk — they have never agreed — so there is no
 * established mapping from that field to a token, and inventing one would
 * change 1Platform's typography under cover of a bug fix. It needs a decision,
 * not a guess.
 */

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * What `src/styles/global.css` compiles in. A token equal to its default is
 * not emitted, so this list is what keeps tenant #1 byte-identical.
 *
 * ⚠️ These are DUPLICATED values, and duplication is the risk: change the
 * stylesheet and this goes stale, silently, by emitting a redundant block.
 * `tests/tenant-theme.spec.ts` reads the real value out of `global.css` and
 * fails if the two drift, so the duplication cannot rot unnoticed.
 */
export const COMPILED_DEFAULTS = {
  accent: '#1748a7',
} as const

/** `#rrggbb` -> `r, g, b`, for the translucent accent derivatives. */
function channels(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/**
 * The declarations for this tenant, or an empty string when its theme is the
 * compiled one (or is not something this build can safely honour).
 *
 * ⚠️ The values are re-validated HERE even though the API validates on write.
 * This string is interpolated into a `<style>` element, so it is an injection
 * sink, and this site does not own that API — a value can also arrive from the
 * repo manifest or a stale cache. `#` plus six hex digits is the whole grammar
 * the accent may have; anything else falls back to the built-in token rather
 * than reaching the document. A wrong-but-safe colour beats a stylesheet a
 * manifest can write.
 */
export function themeDeclarations(tenant: SiteTenant): string {
  const out: string[] = []

  const accent = tenant.theme?.accent
  if (typeof accent === 'string' && HEX.test(accent)) {
    if (accent.toLowerCase() !== COMPILED_DEFAULTS.accent) {
      const rgb = channels(accent)
      out.push(`--color-accent:${accent}`)
      // The hover/soft/glow/ring derivatives are DERIVED rather than declared:
      // asking an operator for five colours to get one brand is how a palette
      // drifts out of tune. `color-mix` keeps them in the same hue by
      // construction; the two translucent ones stay rgba so a browser without
      // `color-mix` still gets the tenant's colour rather than the platform's.
      out.push(`--color-accent-hover:color-mix(in srgb, ${accent} 84%, black)`)
      out.push(`--color-accent-soft:color-mix(in srgb, ${accent} 10%, white)`)
      out.push(`--color-accent-glow:rgba(${rgb}, 0.07)`)
      out.push(`--color-accent-ring:rgba(${rgb}, 0.28)`)
    }
  }

  return out.length ? `:root{${out.join(';')}}` : ''
}
