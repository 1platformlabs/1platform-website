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
 * ── `display_font` reaches the document too ─────────────────────────────────
 * `theme.display_font` used to be carried by the manifest and never rendered.
 * Tenant #1 declared `instrument-serif` while `global.css` set `--font-display`
 * to Space Grotesk — they had never agreed, which was the manifest being wrong
 * about tenant #1's own typography, the same class of bug the accent had. It
 * is corrected the same way the accent's mismeasured glow was: by reading what
 * the site actually draws (`space-grotesk`) and fixing the DATA, not by
 * inventing a mapping that would have repainted 1platform.pro under cover of a
 * bug fix. See `FONT_STACKS` for the closed set of families this build can
 * safely put inside a `<style>` element.
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
  display_font: 'space-grotesk',
} as const

/** `#rrggbb` -> `r, g, b`, for the translucent accent derivatives. */
function channels(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/**
 * The closed set of display-font families this build can put inside a
 * `<style>` element, keyed by the manifest's `display_font` value.
 *
 * Closed rather than free text for the same reason the accent is a `#rrggbb`
 * pattern and not any string: this is interpolated into a document, so an
 * unrecognised value is refused (see `themeDeclarations`) rather than reaching
 * the page — a wrong-but-safe font beats a stylesheet a manifest can write.
 *
 * `space-grotesk` is `COMPILED_DEFAULTS.display_font`'s stack, restated here
 * (not just skipped) so a tenant that names it explicitly still resolves to a
 * real value if this map is ever consulted outside the "differs" check.
 * `instrument-serif` reuses `global.css`'s own `--font-serif` stack — the face
 * is already self-hosted and `@font-face`d there — rather than repeating the
 * font list a second place it could drift from.
 */
const FONT_STACKS: Record<string, string> = {
  'space-grotesk': "'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif",
  'instrument-serif': 'var(--font-serif)',
  'system-serif': "Georgia, 'Times New Roman', serif",
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
      // The footer's dark chrome needs a lighter derivative than the plain
      // accent to read against it — see Footer.astro's .logo__mark and
      // .btn--footer. Same `color-mix` construction as the others, so it stays
      // in the tenant's hue rather than becoming a second, disagreeing brand.
      out.push(`--color-accent-bright:color-mix(in srgb, ${accent} 60%, white)`)
    }
  }

  const font = tenant.theme?.display_font
  if (typeof font === 'string' && font !== COMPILED_DEFAULTS.display_font && FONT_STACKS[font]) {
    out.push(`--font-display:${FONT_STACKS[font]}`)
  }

  // `:root:root`, not `:root` — see BaseLayout.astro's comment at the call
  // site for why source order cannot be trusted to make this block win.
  return out.length ? `:root:root{${out.join(';')}}` : ''
}

/**
 * The tenant's mark as a short chip — two characters at most.
 *
 * Used where a drawing needs a stand-in for a logo (the invoice mockup in the
 * hero scene, which had `1P` written into it as a literal). That literal was
 * the platform's mark rendered on a client's landing page: `aria-hidden`, so
 * no screen reader announced it, but plainly visible, and invisible to the
 * brand sweep too — "1P" is far too short to put in a blocklist without
 * matching half the dictionary.
 *
 * The rule is chosen so tenant #1 is unchanged, which is what keeps the
 * byte-for-byte baseline: one word gives its first two characters
 * (`1Platform` -> `1P`), several give the initial of the first two
 * (`Clínica Delta` -> `CD`).
 */
export function brandChip(tenant: SiteTenant): string {
  const source = (tenant.brand_mark ?? tenant.brand_name).trim()
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2)
  return (words[0][0] ?? '') + (words[1][0] ?? '')
}
