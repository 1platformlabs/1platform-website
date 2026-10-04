import { createHash } from 'node:crypto'

import sharp from 'sharp'

import { centredMark, outlineText } from './brand-glyphs'
import { API_TIMEOUT_MS, apiBaseUrl, normalizeBrandLogo } from './site-api'
import type { SiteBrandLogo, SiteTenant } from './site-api'

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

/**
 * Always returns a path. Order: declared icon → the uploaded logo (as a PNG
 * favicon) → the derived monogram SVG.
 */
export function resolveIcon(tenant: SiteTenant): string {
  const declared = publishedPath(tenant.brand_assets?.icon)
  if (declared) return declared
  if (uploadedLogo(tenant)) return versioned('/brand/icon.png', tenant, 'icon')
  return versioned('/brand/icon.svg', tenant, 'icon')
}

/**
 * The `type` of a `<link rel="icon">` for a path, from its extension. The
 * favicon used to be SVG for every tenant; with an uploaded logo it is a PNG,
 * and advertising `image/svg+xml` for PNG bytes makes some browsers drop it.
 */
export function iconMimeType(href: string): string | undefined {
  const path = href.split(/[?#]/, 1)[0]?.toLowerCase() ?? ''
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.ico')) return 'image/x-icon'
  return undefined
}

/** Always returns a path: absence means a same-origin derived PNG. */
export function resolveSocial(tenant: SiteTenant): string {
  return publishedPath(tenant.brand_assets?.social_image) ?? versioned('/brand/social.png', tenant, 'social')
}

export function iconSvg(tenant: SiteTenant): string {
  const accent = colour(tenant.theme.accent, SAFE_INK)
  const ink = colour(tenant.theme.accent_contrast, SAFE_PAPER)
  const symbol = brandSymbol(tenant)
  const mark = centredMark(symbol, tenant.theme.display_font, 52, 64, 64, ink)
    ?? `<text x="64" y="76" fill="${ink}" font-family="DejaVu Sans, sans-serif" font-size="52" font-weight="700" text-anchor="middle">${xmlText(symbol)}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${xmlText(tenant.brand_name)}"><rect width="128" height="128" rx="28" fill="${accent}"/>${mark}</svg>`
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

/**
 * The brand name on the social card: outlined in the display face when it can
 * draw every character, otherwise the historical text run.
 *
 * `socialTitleLayout` sizes lines from ESTIMATED glyph widths; once the real
 * advances are known the size may only shrink, so a face wider than the
 * estimate still stays inside the 1056px box.
 */
function socialTitle(name: string, display: SiteTenant['theme']['display_font'], ink: string): string {
  const title = socialTitleLayout(name)
  const measured = title.lines.map((line) => outlineText(line, display, title.fontSize))
  const outlined = measured.every((outline): outline is NonNullable<typeof outline> => outline !== null)
  const widest = outlined ? Math.max(...measured.map((outline) => outline.width), 1) : 0
  const fontSize = outlined && widest > 1056
    ? Math.max(18, Math.floor((title.fontSize * 1056) / widest))
    : title.fontSize
  const lineGap = Math.round(fontSize * 1.22)
  const firstBaseline = 505 - Math.round(((title.lines.length - 1) * lineGap) / 2)

  if (outlined) {
    const lines = fontSize === title.fontSize
      ? measured
      : title.lines.map((line) => outlineText(line, display, fontSize))
    return lines.map((outline, index) => (
      outline ? `<path transform="translate(72 ${firstBaseline + index * lineGap})" fill="${ink}" d="${outline.d}"/>` : ''
    )).join('')
  }

  const titleLines = title.lines.map((line, index) => (
    `<tspan x="72" y="${firstBaseline + index * lineGap}">${xmlText(line)}</tspan>`
  )).join('')
  return `<text fill="${ink}" font-family="DejaVu Sans, sans-serif" font-size="${fontSize}" font-weight="700">${titleLines}</text>`
}

/** The source for the social card; rasterised only by the request route. */
export function socialSvg(tenant: SiteTenant): string {
  const accent = colour(tenant.theme.accent, SAFE_INK)
  const ink = colour(tenant.theme.accent_contrast, SAFE_PAPER)
  const display = tenant.theme.display_font
  if (uploadedLogo(tenant)) {
    // A white plate where the monogram sat; the logo is composited onto it by
    // the raster step (`SOCIAL_LOGO_BOX`). White, not the accent: a logo is
    // drawn for a light background far more often than for the brand colour.
    const plate = `<rect x="${SOCIAL_PLATE.x}" y="${SOCIAL_PLATE.y}" width="${SOCIAL_PLATE.width}" height="${SOCIAL_PLATE.height}" rx="28" fill="${SAFE_PAPER}"/>`
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${accent}"/>${plate}<rect x="72" y="340" width="88" height="8" rx="4" fill="${ink}"/>${socialTitle(tenant.brand_name, display, ink)}</svg>`
  }
  const symbol = brandSymbol(tenant)
  const mark = centredMark(symbol, display, 56, 132, 132, ink)
    ?? `<text x="132" y="151" fill="${ink}" font-family="DejaVu Sans, sans-serif" font-size="56" font-weight="700" text-anchor="middle">${xmlText(symbol)}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${accent}"/><rect x="72" y="72" width="120" height="120" rx="28" fill="${ink}" fill-opacity="0.16"/>${mark}<rect x="72" y="340" width="88" height="8" rx="4" fill="${ink}"/>${socialTitle(tenant.brand_name, display, ink)}</svg>`
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
  if (uploadedLogo(tenant)) {
    // Opaque white under the logo: iOS draws transparency as black.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" role="img" aria-label="${xmlText(tenant.brand_name)}"><rect width="180" height="180" fill="${SAFE_PAPER}"/></svg>`
  }
  const accent = colour(tenant.theme.accent, SAFE_INK)
  const ink = colour(tenant.theme.accent_contrast, SAFE_PAPER)
  const symbol = brandSymbol(tenant)
  // Graphemes, not `.length`: an emoji mark is two UTF-16 units and would pick
  // the two-character size for a single visible glyph.
  const units = graphemes(symbol).length
  const fontSize = units <= 1 ? 104 : units === 2 ? 78 : 58
  const baseline = Math.round(90 + fontSize * 0.35)
  const mark = centredMark(symbol, tenant.theme.display_font, fontSize, 90, 90, ink)
    ?? `<text x="90" y="${baseline}" fill="${ink}" font-family="DejaVu Sans, sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle">${xmlText(symbol)}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" role="img" aria-label="${xmlText(tenant.brand_name)}"><rect width="180" height="180" fill="${accent}"/>${mark}</svg>`
}

function rasterKey(tenant: SiteTenant): string {
  // The display face is part of the drawing now: without it here, a tenant
  // that changes typography keeps its old raster until the worker restarts.
  // The uploaded logo's hash too (api#519): without it, a new or removed logo
  // would keep the previous raster — the trap of website#129, one field later.
  return `${tenant.slug}\u0000${tenant.brand_name}\u0000${tenant.brand_mark ?? ''}\u0000${tenant.theme.accent}\u0000${tenant.theme.accent_contrast}\u0000${tenant.theme.display_font}\u0000${uploadedLogo(tenant)?.sha256 ?? ''}`
}

/** `null` means "cannot make it right now": the cache forgets it and retries. */
type Rasterize = (svg: string, tenant: SiteTenant) => Promise<Buffer | null>
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
      .then(async () => {
        const raster = await this.rasterize(this.render(tenant), tenant)
        if (raster === null) throw new Error('raster unavailable')
        return raster
      })
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
  (svg, tenant) => rasterWithLogo(svg, tenant, SOCIAL_LOGO_BOX),
)

const appleTouchRaster = new BrandRasterCache(
  (svg, tenant) => rasterWithLogo(svg, tenant, TOUCH_LOGO_BOX),
  64,
  appleTouchIconSvg,
)

/** The favicon PNG exists only for a tenant with an uploaded logo. */
function logoIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}"></svg>`
}

const logoIconRaster = new BrandRasterCache(
  (svg, tenant) => rasterWithLogo(svg, tenant, { left: 0, top: 0, width: ICON_SIZE, height: ICON_SIZE }),
  64,
  logoIconSvg,
)

/**
 * The monogram as a PNG, for the favicon URL of a tenant WITH a logo whose bytes
 * cannot be served right now: a tab keeps an icon instead of losing it.
 */
export function monogramIconPng(tenant: SiteTenant): Promise<Buffer> {
  return sharp(Buffer.from(iconSvg(tenant))).resize(ICON_SIZE, ICON_SIZE).png().toBuffer()
}

/** The favicon raster made from the uploaded logo, or null without one. */
export async function logoIconPng(tenant: SiteTenant): Promise<Buffer | null> {
  if (!uploadedLogo(tenant)) return null
  return logoIconRaster.get(tenant)
}

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
  return publishedPath(tenant.brand_assets?.apple_touch_icon) ?? versioned('/brand/apple-touch-icon.png', tenant, 'appleTouch')
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
  // The uploaded logo itself, re-served from this origin — advertised only
  // once its bytes can actually be served.
  const logo = uploadedLogo(tenant)
  if (logo) return (await logoBytes(tenant)) ? uploadedLogoPath(logo) : null
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

type DerivedAsset = 'icon' | 'social' | 'appleTouch'

const DERIVED_SOURCES: Record<DerivedAsset, RenderSvg> = {
  icon: iconSvg,
  social: socialSvg,
  appleTouch: appleTouchIconSvg,
}

const assetVersions = new Map<string, string>()
const ASSET_VERSION_CAPACITY = 256

/**
 * A short fingerprint of the drawing a derived asset is made from (issue #129).
 *
 * The derived routes are served `max-age=86400` from URLs that used to carry
 * no version, so a brand change (font, accent, mark) left the edge serving the
 * previous drawing for up to a day, and the only cure was a cache purge. The
 * URL now moves with the drawing instead.
 *
 * It hashes the rendered SVG, not the manifest fields: the fields alone would
 * miss a change to the PROGRAM that draws them (a new glyph table, a new
 * layout), and that change must reach a browser that already cached the old
 * bytes just as much as a new accent does. The PNGs are rasterised from exactly
 * this SVG, so its hash is also theirs. Memoised per brand fingerprint, so a
 * page view does not re-outline the brand name.
 */
export function brandAssetVersion(tenant: SiteTenant, asset: DerivedAsset): string {
  const key = `${asset}\u0000${rasterKey(tenant)}`
  const known = assetVersions.get(key)
  if (known !== undefined) return known

  // The logo's hash rides along: the SVG alone does not change when only the
  // composited logo does (two different logos draw the same white plate).
  // ONLY when there is a logo: without one the version must stay exactly
  // `sha256(svg)`, or every tenant's `?v=` would move the day this ships.
  const hash = createHash('sha256').update(DERIVED_SOURCES[asset](tenant))
  const logo = uploadedLogo(tenant)
  if (logo) hash.update('\u0000').update(logo.sha256)
  const version = hash.digest('hex').slice(0, 12)
  if (assetVersions.size >= ASSET_VERSION_CAPACITY) {
    const oldest = assetVersions.keys().next().value
    if (oldest !== undefined) assetVersions.delete(oldest)
  }
  assetVersions.set(key, version)
  return version
}

function versioned(path: string, tenant: SiteTenant, asset: DerivedAsset): string {
  return `${path}?v=${brandAssetVersion(tenant, asset)}`
}


// ── The uploaded logo (api#519) ─────────────────────────────────────────────

const ICON_SIZE = 192
/** The white plate on the social card and the box the logo fits inside it. */
const SOCIAL_PLATE = { x: 72, y: 72, width: 480, height: 180 } as const
const SOCIAL_LOGO_BOX = { left: 92, top: 92, width: 440, height: 140 } as const
/** The touch icon keeps a margin so a square mask never clips the logo. */
const TOUCH_LOGO_BOX = { left: 15, top: 15, width: 150, height: 150 } as const
/** A logo the API re-encoded is at most 1024 px; anything near this is not one. */
const MAX_LOGO_BYTES = 4 * 1024 * 1024
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** The tenant's uploaded logo, or null. Declared assets are checked by callers. */
export function uploadedLogo(tenant: SiteTenant): SiteBrandLogo | null {
  return normalizeBrandLogo(tenant.brand_logo)
}

/**
 * The uploaded logo's same-origin path when it is what this tenant's brand
 * resolves to — no declared asset outranks it — and its bytes can be served;
 * otherwise null. For heads that otherwise publish the social card as the
 * Organization logo and must keep doing so for every tenant without one.
 */
export async function resolveUploadedLogo(tenant: SiteTenant): Promise<string | null> {
  if (publishedPath(tenant.brand_assets?.icon) || publishedPath(tenant.brand_assets?.social_image)) return null
  const logo = uploadedLogo(tenant)
  if (!logo) return null
  return (await logoBytes(tenant)) ? uploadedLogoPath(logo) : null
}

/** Same-origin URL of the uploaded logo. The hash IS the version. */
export function uploadedLogoPath(logo: SiteBrandLogo): string {
  return `/brand/logo/${logo.sha256}.png`
}

type LogoFetcher = (slug: string, sha256: string) => Promise<Buffer | null>

/**
 * Ask the API for the bytes — the base URL is this server's configuration,
 * never anything the manifest says, so there is no address to inject. Only a
 * 200 that is really a PNG and is not absurdly large is accepted; every other
 * outcome is "not now" (null), never an exception into a page render.
 */
const fetchLogoFromApi: LogoFetcher = async (slug, sha256) => {
  const url = `${apiBaseUrl()}/api/v1/sites/${encodeURIComponent(slug)}/logo/${sha256}.png`
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS), headers: { accept: 'image/png' } })
    if (response.status !== 200) return null
    if (!(response.headers.get('content-type') ?? '').startsWith('image/png')) return null
    const declared = Number(response.headers.get('content-length') ?? '0')
    if (declared > MAX_LOGO_BYTES) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.byteLength > MAX_LOGO_BYTES || !bytes.subarray(0, 8).equals(PNG_MAGIC)) return null
    return bytes
  } catch {
    return null
  }
}

let logoFetcher: LogoFetcher = fetchLogoFromApi
let logoClock: () => number = () => Date.now()
const logoEntries = new Map<string, Promise<Buffer | null>>()
/** When each slug+hash last failed, for the short negative cache. */
const logoFailures = new Map<string, number>()
const LOGO_FAILURE_TTL_MS = 30_000
const LOGO_CAPACITY = 64

/**
 * The bytes of the tenant's CURRENT uploaded logo, cached per slug+hash.
 *
 * The hash is immutable, so a hit never goes stale. A failure is remembered
 * only briefly (`LOGO_FAILURE_TTL_MS`): long enough that a degraded API does
 * not make EVERY page render of the tenant wait out the timeout again, short
 * enough that recovery shows within the minute.
 */
export function logoBytes(tenant: SiteTenant): Promise<Buffer | null> {
  const logo = uploadedLogo(tenant)
  if (!logo) return Promise.resolve(null)
  const key = `${tenant.slug}\u0000${logo.sha256}`
  const failedAt = logoFailures.get(key)
  if (failedAt !== undefined) {
    if (logoClock() - failedAt < LOGO_FAILURE_TTL_MS) return Promise.resolve(null)
    logoFailures.delete(key)
  }
  const known = logoEntries.get(key)
  if (known !== undefined) return known
  const pending = logoFetcher(tenant.slug, logo.sha256).then((bytes) => {
    if (bytes === null) {
      logoEntries.delete(key)
      logoFailures.set(key, logoClock())
      while (logoFailures.size > LOGO_CAPACITY) {
        const oldest = logoFailures.keys().next().value
        if (oldest === undefined) break
        logoFailures.delete(oldest)
      }
    }
    return bytes
  })
  logoEntries.set(key, pending)
  while (logoEntries.size > LOGO_CAPACITY) {
    const oldest = logoEntries.keys().next().value
    if (oldest === undefined) break
    logoEntries.delete(oldest)
  }
  return pending
}

interface Box { left: number; top: number; width: number; height: number }

/**
 * Rasterise a drawing and, for a tenant with a logo, composite the logo into
 * `box` (contained, centred). Without the logo's bytes there is no honest
 * raster: null, and the caller omits the asset rather than draw a wrong one.
 */
async function rasterWithLogo(svg: string, tenant: SiteTenant, box: Box): Promise<Buffer | null> {
  const base = sharp(Buffer.from(svg))
  if (!uploadedLogo(tenant)) return base.png().toBuffer()
  const bytes = await logoBytes(tenant)
  if (!bytes) return null
  const fitted = await sharp(bytes)
    .resize({ width: box.width, height: box.height, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true })
  const left = box.left + Math.round((box.width - fitted.info.width) / 2)
  const top = box.top + Math.round((box.height - fitted.info.height) / 2)
  return base.composite([{ input: fitted.data, left, top }]).png().toBuffer()
}

/** Test seam: replace the API fetch and forget every cached logo. */
export const __logoTesting = {
  setFetcher(fetcher: LogoFetcher | null): void {
    logoFetcher = fetcher ?? fetchLogoFromApi
    logoEntries.clear()
    logoFailures.clear()
    logoClock = () => Date.now()
  },
  setClock(clock: () => number): void {
    logoClock = clock
  },
}
