import { DISPLAY_FONTS, type DisplayFont, type SiteTenant } from './site-api'

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
 * `display_font` is a closed catalogue, never interpolated free text. Tenant #1
 * now declares the font the stylesheet actually compiles (`space-grotesk`), so
 * the same silence rule applies to typography without repainting the baseline.
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
  accent_contrast: '#ffffff',
  display_font: 'space-grotesk',
} as const satisfies SiteTenant['theme']

/** Safe CSS stacks for every value accepted by the public API. */
export const DISPLAY_FONT_STACKS = {
  'space-grotesk': "'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif",
  'instrument-serif': "'Instrument Serif', Georgia, 'Times New Roman', serif",
  'system-serif': "ui-serif, Georgia, 'Times New Roman', serif",
  'system-sans': "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'system-mono': "ui-monospace, 'SF Mono', Consolas, 'Liberation Mono', monospace",
} satisfies Record<DisplayFont, string>

export interface AccentRamp {
  accent: string
  hover: string
  soft: string
  bright: string
  glow: string
  ring: string
}

function isDisplayFont(value: unknown): value is DisplayFont {
  return (DISPLAY_FONTS as readonly unknown[]).includes(value)
}

/** Mix one `#rrggbb` colour toward black or white in sRGB channel space. */
function mixHex(hex: string, target: 0 | 255, sourcePercent: number): string {
  const source = Number.parseInt(hex.slice(1), 16)
  const channels = [(source >> 16) & 255, (source >> 8) & 255, source & 255]
  const mixed = channels.map((channel) =>
    Math.floor((channel * sourcePercent + target * (100 - sourcePercent)) / 100 + 0.5),
  )
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

/** `#rrggbb` -> `r, g, b`, for the translucent accent derivatives. */
function channels(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/**
 * The deterministic v1 ramp, shared as golden vectors with the API.
 *
 * Rounding is nearest integer with an exact .5 rounded upward. Spell it out
 * instead of using `Math.round` implicitly so the Python implementation can
 * match channel for channel (`floor(value + 0.5)`, not bankers' rounding).
 */
export function deriveAccentRamp(accent: string): AccentRamp | null {
  if (!HEX.test(accent)) return null
  const normalized = accent.toLowerCase()
  const rgb = channels(normalized)
  return {
    accent: normalized,
    hover: mixHex(normalized, 0, 84),
    soft: mixHex(normalized, 255, 10),
    bright: mixHex(normalized, 255, 44),
    glow: `rgba(${rgb}, 0.07)`,
    ring: `rgba(${rgb}, 0.28)`,
  }
}

/**
 * The compiled stylesheet still exposes the historical `--cobalt*` primitives,
 * and some painted nodes inherit ink from surface semantics. Rebinding those
 * request-locally keeps dark-on-bright footer roles separate from
 * ink-on-accent roles without changing tenant #1's shared asset bytes.
 */
const LEGACY_INK_BRIDGE =
  '.logo__mark,.spine__node,.motif__spine{--surface:var(--color-accent-ink)}' +
  '.skip-link{--color-text-inverse:var(--color-accent-ink)}' +
  '.site-footer .logo__mark{--surface:var(--ink)}'

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
  const accent = tenant.theme?.accent
  const accentContrast = tenant.theme?.accent_contrast
  const displayFont = tenant.theme?.display_font
  if (
    typeof accent !== 'string' ||
    typeof accentContrast !== 'string' ||
    !HEX.test(accent) ||
    !HEX.test(accentContrast) ||
    !isDisplayFont(displayFont)
  ) {
    return ''
  }

  const ramp = deriveAccentRamp(accent)
  if (!ramp) return ''
  const ink = accentContrast.toLowerCase()
  const accentDiffers = ramp.accent !== COMPILED_DEFAULTS.accent
  const inkDiffers = ink !== COMPILED_DEFAULTS.accent_contrast
  const fontDiffers = displayFont !== COMPILED_DEFAULTS.display_font

  if (!accentDiffers && !inkDiffers && !fontDiffers) return ''

  const out: string[] = []
  if (accentDiffers) {
    out.push(`--color-accent:${ramp.accent}`)
    out.push(`--color-accent-hover:${ramp.hover}`)
    out.push(`--color-accent-soft:${ramp.soft}`)
    out.push(`--color-accent-bright:${ramp.bright}`)
    out.push(`--color-accent-glow:${ramp.glow}`)
    out.push(`--color-accent-ring:${ramp.ring}`)
    // Keep the primitive aliases coherent without changing the shared
    // stylesheet and therefore without changing tenant #1's asset bytes.
    out.push(`--cobalt:${ramp.accent}`)
    out.push(`--cobalt-deep:${ramp.hover}`)
    out.push(`--cobalt-bright:${ramp.bright}`)
    out.push(`--cobalt-wash:${ramp.soft}`)

    // `.btn:focus-visible` replaces the global outline with the accent ring.
    // At 28% opacity that ring is intentionally subtle decoration, but it is
    // not a 3:1 focus indicator on either the clinic's light grounds or its
    // dark footer. Two opaque adjacent rings make the cue independent of the
    // surface: white is visible on a dark ground and the text ink is visible
    // on a light one. This override is request-scoped, so tenant #1 keeps its
    // frozen stylesheet and HTML bytes.
    out.push('--shadow-glow-ring:0 0 0 2px var(--surface),0 0 0 5px var(--color-text)')
  }
  if (accentDiffers || inkDiffers) out.push(`--color-accent-ink:${ink}`)
  if (fontDiffers) out.push(`--font-display:${DISPLAY_FONT_STACKS[displayFont]}`)

  // Astro hoists the compiled stylesheet links after this dynamic style in the
  // served head. `html:root` therefore needs one extra type selector so the
  // request-scoped values win regardless of source order. Tenant #1 never
  // emits this block, so its historical HTML remains untouched.
  const root = `html:root{${out.join(';')}}`
  return accentDiffers || inkDiffers ? root + LEGACY_INK_BRIDGE : root
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
  // This is an abbreviation inside an invoice illustration, not the logo
  // lockup. Derive it from the complete semantic name so changing the explicit
  // logo mark from the legacy `1Platform` to `1` does not change tenant #1's
  // historical `1P` chip.
  const source = tenant.brand_name.trim()
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2)
  return (words[0][0] ?? '') + (words[1][0] ?? '')
}
