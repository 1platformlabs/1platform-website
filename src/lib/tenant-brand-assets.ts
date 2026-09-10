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

function rasterKey(tenant: SiteTenant): string {
  return `${tenant.slug}\u0000${tenant.brand_name}\u0000${tenant.brand_mark ?? ''}\u0000${tenant.theme.accent}\u0000${tenant.theme.accent_contrast}`
}

type Rasterize = (svg: string) => Promise<Buffer>

interface SocialRasterEntry {
  fingerprint: string
  pending: Promise<Buffer | null>
}

/** Bounded, per-tenant cache that retries failures instead of poisoning a worker. */
export class SocialRasterCache {
  private readonly entries = new Map<string, SocialRasterEntry>()

  constructor(
    private readonly rasterize: Rasterize,
    private readonly capacity = 64,
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
      .then(() => this.rasterize(socialSvg(tenant)))
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

const socialRaster = new SocialRasterCache(
  (svg) => sharp(Buffer.from(svg)).png().toBuffer(),
)

/**
 * Rasterise once per in-process brand. A failure is intentionally represented
 * as `null`: callers can omit an SEO assertion rather than advertising a
 * platform fallback or turning a normal HTML request into a 500.
 */
export function socialPng(tenant: SiteTenant): Promise<Buffer | null> {
  return socialRaster.get(tenant)
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
