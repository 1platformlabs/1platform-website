import sharp from 'sharp'

import type { SiteTenant } from './site-api'

/** A manifest value that can safely be emitted as a same-origin URL. */
const PUBLISHED_PATH = /^\/(?!\/)[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/
const HEX = /^#[0-9a-fA-F]{6}$/
const SAFE_INK = 'black'
const SAFE_PAPER = 'white'

/**
 * The asset declarations are validated by the API when they are written. This
 * second, format-only check protects the renderer from an older cache or a
 * repository manifest: this site does not own the policy, but it must not turn
 * an invalid value into a URL in a public document.
 */
function publishedPath(value: string | null | undefined): string | null {
  if (!value || !PUBLISHED_PATH.test(value)) return null
  return value
}

function colour(value: string, fallback: string): string {
  return HEX.test(value) ? value : fallback
}

function xmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * A compact, readable mark for the two derived assets.
 *
 * `brand_mark` is the explicit 1–3 character symbol introduced by the UX/UI
 * addendum. The name fallback only covers stale manifests that predate it; it
 * is deliberately bounded so a malformed manifest cannot make a huge SVG.
 */
export function brandSymbol(tenant: SiteTenant): string {
  const explicit = tenant.brand_mark?.trim()
  if (explicit) return Array.from(explicit).slice(0, 3).join('')

  const words = tenant.brand_name.trim().split(/\s+/).filter(Boolean)
  const initials = words.length > 1
    ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`
    : (words[0] ?? '').slice(0, 2)
  return Array.from(initials || '?').slice(0, 3).join('')
}

/** Always returns a path: absence means a same-origin derived SVG. */
export function resolveIcon(tenant: SiteTenant): string {
  return publishedPath(tenant.brand_assets?.icon) ?? '/brand/icon.svg'
}

/** Always returns a path: absence means a same-origin derived PNG. */
export function resolveSocial(tenant: SiteTenant): string {
  return publishedPath(tenant.brand_assets?.social_image) ?? '/brand/social.png'
}

export function iconSvg(tenant: SiteTenant): string {
  const accent = colour(tenant.theme.accent, SAFE_INK)
  const ink = colour(tenant.theme.accent_contrast, SAFE_PAPER)
  const symbol = xmlText(brandSymbol(tenant))

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${xmlText(tenant.brand_name)}"><rect width="128" height="128" rx="28" fill="${accent}"/><text x="64" y="76" fill="${ink}" font-family="DejaVu Sans, sans-serif" font-size="52" font-weight="700" text-anchor="middle">${symbol}</text></svg>`
}

export interface SocialTitleLayout {
  lines: string[]
  fontSize: number
}

function graphemes(value: string): string[] {
  return Array.from(new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(value), ({ segment }) => segment)
}

/** Keep every valid brand name inside the 1056px-wide title box. */
export function socialTitleLayout(value: string): SocialTitleLayout {
  const normalized = value.trim().replace(/\s+/gu, ' ') || '?'
  const units = graphemes(normalized)
  const lineCount = units.length <= 24 ? 1 : units.length <= 64 ? 2 : 3
  const lines: string[] = []
  let remaining = units

  for (let slot = 0; slot < lineCount; slot += 1) {
    const slotsLeft = lineCount - slot
    if (slotsLeft === 1) {
      lines.push(remaining.join('').trim())
      break
    }

    const target = Math.ceil(remaining.length / slotsLeft)
    const candidates = remaining
      .map((unit, index) => (/\s/u.test(unit) ? index : -1))
      .filter((index) => index > 0 && index < remaining.length - 1)
    const nearest = candidates.length > 0
      ? candidates.reduce((best, index) => (
          Math.abs(index - target) < Math.abs(best - target) ? index : best
        ))
      : -1
    // A single long word must be split rather than making one enormous line
    // just because the next whitespace happens to be far away.
    const split = nearest > 0 && Math.abs(nearest - target) <= Math.max(4, Math.floor(target / 3))
      ? nearest
      : target

    lines.push(remaining.slice(0, split).join('').trim())
    remaining = remaining.slice(split + (/\s/u.test(remaining[split] ?? '') ? 1 : 0))
    while (/\s/u.test(remaining[0] ?? '')) remaining = remaining.slice(1)
  }

  const requestedSize = lineCount === 1 ? 74 : lineCount === 2 ? 54 : units.length > 96 ? 32 : 40
  const glyphUnits = (line: string) => graphemes(line).reduce((total, unit) => {
    if (/\s/u.test(unit)) return total + 0.35
    if (/^[WMmw@%#]$/u.test(unit)) return total + 1.05
    if (/^[ilI1.,'|!]$/u.test(unit)) return total + 0.35
    if (/^[A-Z]$/u.test(unit)) return total + 0.78
    if (/^[a-z0-9]$/u.test(unit)) return total + 0.62
    return total + 1.1
  }, 0)
  const longestUnits = Math.max(...lines.map(glyphUnits), 1)
  const fittedSize = Math.floor(1056 / (longestUnits * 1.08))
  const fontSize = Math.max(18, Math.min(requestedSize, fittedSize))
  return { lines, fontSize }
}

/** The source for the social card; rasterised only by the request route. */
export function socialSvg(tenant: SiteTenant): string {
  const accent = colour(tenant.theme.accent, SAFE_INK)
  const ink = colour(tenant.theme.accent_contrast, SAFE_PAPER)
  const symbol = xmlText(brandSymbol(tenant))
  const title = socialTitleLayout(tenant.brand_name)
  const lineGap = Math.round(title.fontSize * 1.22)
  const firstBaseline = 505 - Math.round(((title.lines.length - 1) * lineGap) / 2)
  const titleLines = title.lines.map((line, index) => (
    `<tspan x="72" y="${firstBaseline + index * lineGap}">${xmlText(line)}</tspan>`
  )).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${accent}"/><rect x="72" y="72" width="120" height="120" rx="28" fill="${ink}" fill-opacity="0.16"/><text x="132" y="151" fill="${ink}" font-family="DejaVu Sans, sans-serif" font-size="56" font-weight="700" text-anchor="middle">${symbol}</text><rect x="72" y="340" width="88" height="8" rx="4" fill="${ink}"/><text fill="${ink}" font-family="DejaVu Sans, sans-serif" font-size="${title.fontSize}" font-weight="700">${titleLines}</text></svg>`
}

/**
 * The touch icon: a full-bleed square, deliberately NOT `iconSvg` scaled up.
 *
 * Two differences from the favicon are load-bearing rather than cosmetic.
 * It has no rounded corners, because iOS applies its own mask and a rounded
 * rect underneath leaves the four corners transparent — which a device renders
 * as black against a dark home screen. And it is drawn at 180x180, the size
 * current iOS asks for, so the device never has to upscale a 128px drawing.
 *
 * The type ramp is keyed to the symbol's length so a three-character mark
 * cannot overflow the square the way a fixed size would.
 */
export function appleTouchIconSvg(tenant: SiteTenant): string {
  const accent = colour(tenant.theme.accent, SAFE_INK)
  const ink = colour(tenant.theme.accent_contrast, SAFE_PAPER)
  const symbol = brandSymbol(tenant)
  // Graphemes, not `.length`: an emoji mark is two UTF-16 units and would pick
  // the two-character size for a single visible glyph.
  const units = graphemes(symbol).length
  const fontSize = units <= 1 ? 104 : units === 2 ? 78 : 58
  const baseline = Math.round(90 + fontSize * 0.35)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" role="img" aria-label="${xmlText(tenant.brand_name)}"><rect width="180" height="180" fill="${accent}"/><text x="90" y="${baseline}" fill="${ink}" font-family="DejaVu Sans, sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle">${xmlText(symbol)}</text></svg>`
}

function rasterKey(tenant: SiteTenant): string {
  return `${tenant.slug}\u0000${tenant.brand_name}\u0000${tenant.brand_mark ?? ''}\u0000${tenant.theme.accent}\u0000${tenant.theme.accent_contrast}`
}

type Rasterize = (svg: string) => Promise<Buffer>
type RenderSvg = (tenant: SiteTenant) => string

interface BrandRasterEntry {
  fingerprint: string
  pending: Promise<Buffer | null>
}

/**
 * Bounded, per-tenant cache that retries failures instead of poisoning a worker.
 *
 * It takes the SVG renderer as a parameter because there is now more than one
 * derived raster (the social card and the touch icon, issue #107). A second
 * copy of this class per asset would have been two bounds to keep in step, two
 * eviction policies to get right and two places for the retry-after-failure
 * rule to rot — and `rasterKey` already fingerprints every brand field both
 * assets are drawn from, so one implementation covers both exactly.
 */
export class BrandRasterCache {
  private readonly entries = new Map<string, BrandRasterEntry>()

  constructor(
    private readonly rasterize: Rasterize,
    private readonly capacity = 64,
    private readonly render: RenderSvg = socialSvg,
  ) {}

  get entryCount(): number {
    return this.entries.size
  }

  get(tenant: SiteTenant): Promise<Buffer | null> {
    const fingerprint = rasterKey(tenant)
    const existing = this.entries.get(tenant.slug)
    if (existing?.fingerprint === fingerprint) {
      this.entries.delete(tenant.slug)
      this.entries.set(tenant.slug, existing)
      return existing.pending
    }

    let pending: Promise<Buffer | null>
    pending = Promise.resolve()
      .then(() => this.rasterize(this.render(tenant)))
      .catch(() => {
        if (this.entries.get(tenant.slug)?.pending === pending) {
          this.entries.delete(tenant.slug)
        }
        return null
      })

    this.entries.delete(tenant.slug)
    this.entries.set(tenant.slug, { fingerprint, pending })
    while (this.entries.size > Math.max(1, this.capacity)) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
    return pending
  }
}

const socialRaster = new BrandRasterCache(
  (svg) => sharp(Buffer.from(svg)).png().toBuffer(),
)

const appleTouchRaster = new BrandRasterCache(
  (svg) => sharp(Buffer.from(svg)).png().toBuffer(),
  64,
  appleTouchIconSvg,
)

/**
 * Rasterise once per in-process brand. A failure is intentionally represented
 * as `null`: callers can omit an SEO assertion rather than advertising a
 * platform fallback or turning a normal HTML request into a 500.
 */
export function socialPng(tenant: SiteTenant): Promise<Buffer | null> {
  return socialRaster.get(tenant)
}

/** The touch icon's raster, on the same terms as the social card's. */
export function appleTouchIconPng(tenant: SiteTenant): Promise<Buffer | null> {
  return appleTouchRaster.get(tenant)
}

/**
 * Always returns a path: absence of a declaration means a same-origin derived
 * PNG, never `/logo-oauth-120x120.png`.
 *
 * That literal was hard-coded into `BaseLayout` for every tenant (issue #107),
 * so a clinic's home screen icon was 1Platform's compiled drawing — the one
 * surface where the wrong brand is not merely served but SAVED to a device and
 * kept there after the tab is closed.
 */
export function resolveAppleTouchIcon(tenant: SiteTenant): string {
  return publishedPath(tenant.brand_assets?.apple_touch_icon) ?? '/brand/apple-touch-icon.png'
}

/**
 * A derived touch icon may be advertised only once its raster can be made.
 *
 * Omitting the element is the safe failure here, and specifically safer than it
 * would be for the other two assets: with no `apple-touch-icon` a device looks
 * for `/apple-touch-icon.png` at the origin root, which this server does not
 * publish, so the fallback path ends in nothing rather than in the platform's
 * drawing. Advertising a link that 404s would be strictly worse.
 */
export async function appleTouchIconIsAvailable(tenant: SiteTenant): Promise<boolean> {
  if (publishedPath(tenant.brand_assets?.apple_touch_icon)) return true
  return (await appleTouchIconPng(tenant)) !== null
}

/**
 * A declared icon preserves tenant #1's historical `/favicon.svg` byte-for-
 * byte. Without that declaration, JSON-LD follows the derived social card only
 * after it has rasterised; an absent field is more honest than a broken image.
 */
export async function resolveLogo(tenant: SiteTenant): Promise<string | null> {
  const declaredIcon = publishedPath(tenant.brand_assets?.icon)
  if (declaredIcon) return declaredIcon
  const declaredSocial = publishedPath(tenant.brand_assets?.social_image)
  if (declaredSocial) return declaredSocial
  return (await socialPng(tenant)) ? resolveSocial(tenant) : null
}

/**
 * A derived social card may be advertised only after its raster can be made.
 * Declared assets are published paths and do not invoke this local renderer.
 */
export async function socialImageIsAvailable(tenant: SiteTenant): Promise<boolean> {
  if (publishedPath(tenant.brand_assets?.social_image)) return true
  return (await socialPng(tenant)) !== null
}
