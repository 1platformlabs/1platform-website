/**
 * The tenant's social profiles (WRS-04, WRS-05) — data, rule, glyphs, labels.
 *
 * THE ONLY FILE IN THIS REPOSITORY ALLOWED TO NAME TWO OF THE NETWORKS (D-4).
 * The ecosystem bans two of these brands on client-facing surfaces because of
 * the advertising vertical, where they ARE providers. A link to the tenant's
 * own profile is not a capability presented as a provider's, and the request
 * names them, so `scripts/check-tells.sh` rule 10 exempts this one path for
 * those two words only. Everything that has to say a network's name — keys,
 * hosts, glyphs, labels — therefore lives here; the component that draws the
 * icons (`SocialLinks.astro`) and the manifest type (`site-api.ts`) name none.
 *
 * The rule is a copy of `social_link_problem` in 1platform-api
 * (`app/models/site_social_links.py`); the repositories share no code. It is
 * tested against the vectors the API dumps by running its real function
 * (`tests/fixtures/social_link_vectors.json`, `tests/social-links-rule.spec.ts`),
 * so the two cannot drift without a red test. It is total: it never throws, so
 * a rotten value switches off one icon and never the site (D-6).
 */

/** Render order (the request's) and the closed list of keys. */
export const SOCIAL_NETWORKS = ['facebook', 'tiktok', 'instagram', 'linkedin', 'x'] as const

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]

/** What `GET /sites/by-host` publishes: all five, each a URL or `null`. */
export type SiteSocialLinks = Record<SocialNetwork, string | null>

export interface SocialLink {
  network: SocialNetwork
  /** Position in `SOCIAL_NETWORKS`: a neutral code for markup and tests. */
  code: number
  href: string
  name: string
  path: string
}

/**
 * Registrable domains per network, space-separated and split at load. Written
 * as strings, not arrays of strings, on purpose: the console's catalogue
 * scanner reads `['…', …` as requested i18n keys, and the three clients keep
 * this table in the same shape.
 */
const HOSTS: Record<SocialNetwork, readonly string[]> = {
  facebook: 'facebook.com fb.com'.split(' '),
  tiktok: 'tiktok.com'.split(' '),
  instagram: 'instagram.com instagr.am'.split(' '),
  linkedin: 'linkedin.com'.split(' '),
  x: 'x.com twitter.com'.split(' '),
}

/** The only subdomains accepted in front of those domains ('' = bare). */
const SUBDOMAINS = ['', 'www', 'm'] as const

const REDIRECT_PATH_PREFIXES = ['/l.php', '/redir/'] as const

export const SOCIAL_LINK_MAX_CHARS = 500

const HOSTNAME_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/
const FORBIDDEN = new Set(['\\', '[', ']', '"', "'", '<', '>'])
const SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*$/
const UNRESERVED = /^[A-Za-z0-9._~-]$/

/** Proper names: they are not translated, so they are not catalogue keys. */
const NAMES: Record<SocialNetwork, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
}

/** Stroke glyphs on a 24 box, drawn with `currentColor` (copied from Bower). */
const PATHS: Record<SocialNetwork, string> = {
  facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
  tiktok: 'M9 12a4 4 0 104 4V4c.6 2.7 2.6 4.7 5 5',
  instagram:
    'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z M12 16a4 4 0 100-8 4 4 0 000 8z M17.5 6.5h.01',
  linkedin:
    'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z M6 9H2v12h4z M4 6a2 2 0 100-4 2 2 0 000 4z',
  x: 'M4 4l16 16M20 4L4 20',
}

/**
 * Labels in a LOCAL map, never through `t()` (D-14): in production the page
 * dictionary is only the tenant's published content, and `t()` throws on a key
 * that content lacks — a `social.*` key would take every tenant site down.
 */
const LINK_LABEL = { es: '{brand} en {network}', en: '{brand} on {network}' } as const
const GROUP_LABEL = { es: 'Redes sociales', en: 'Social media' } as const

type LabelLocale = keyof typeof LINK_LABEL

function labelLocale(locale: unknown): LabelLocale {
  return locale === 'es' ? 'es' : 'en'
}

/** `aria-label` of the `<nav>` that groups the icons. */
export function socialGroupLabel(locale: unknown): string {
  return GROUP_LABEL[labelLocale(locale)]
}

/**
 * `aria-label` of one link. Both markers are replaced in ONE pass by a function:
 * a string replacement interprets `$&`/`$'` inside the brand, and a chained one
 * would inject the network into a brand that contains `{network}`.
 */
export function socialLinkLabel(brand: string, network: SocialNetwork, locale: unknown): string {
  return LINK_LABEL[labelLocale(locale)].replace(/\{(brand|network)\}/g, (_m, key: string) =>
    key === 'brand' ? brand : NAMES[network],
  )
}

interface SplitUrl {
  scheme: string
  netloc: string
  path: string
}

/** `urllib.parse.urlsplit`, for the parts the rule reads. */
function splitUrl(href: string): SplitUrl {
  let rest = href
  let scheme = ''
  const colon = href.indexOf(':')
  if (colon > 0 && SCHEME_RE.test(href.slice(0, colon))) {
    scheme = href.slice(0, colon).toLowerCase()
    rest = href.slice(colon + 1)
  }
  let netloc = ''
  if (rest.startsWith('//')) {
    const after = rest.slice(2)
    let cut = after.length
    for (const sep of ['/', '?', '#']) {
      const idx = after.indexOf(sep)
      if (idx !== -1) cut = Math.min(cut, idx)
    }
    netloc = after.slice(0, cut)
    rest = after.slice(cut)
  }
  let pathEnd = rest.length
  for (const sep of ['?', '#']) {
    const idx = rest.indexOf(sep)
    if (idx !== -1) pathEnd = Math.min(pathEnd, idx)
  }
  return { scheme, netloc, path: rest.slice(0, pathEnd) }
}

function charsetOk(href: string): boolean {
  for (const ch of href) {
    const code = ch.codePointAt(0) ?? 0
    if (code < 0x21 || code > 0x7e || FORBIDDEN.has(ch)) return false
  }
  return true
}

function hostMatches(network: SocialNetwork, hostname: string): boolean {
  return HOSTS[network].some((domain) =>
    SUBDOMAINS.some((sub) => hostname === (sub ? `${sub}.${domain}` : domain)),
  )
}

function decodeUnreserved(path: string): string {
  return path.replace(/%([0-9A-Fa-f]{2})/g, (match, hex: string) => {
    const char = String.fromCharCode(parseInt(hex, 16))
    return UNRESERVED.test(char) ? char : match
  })
}

function pathProblem(path: string): string | null {
  const decoded = decodeUnreserved(path)
  if (decoded.includes('//')) return 'path'
  if (decoded.split('/').some((segment) => segment === '.' || segment === '..')) return 'path'
  const lowered = decoded.toLowerCase()
  if (REDIRECT_PATH_PREFIXES.some((prefix) => lowered.startsWith(prefix))) return 'redirect'
  return null
}

function isNetwork(value: unknown): value is SocialNetwork {
  return typeof value === 'string' && (SOCIAL_NETWORKS as readonly string[]).includes(value)
}

/** `null` when `href` is a direct profile of `network`; otherwise the reason. */
export function socialLinkProblem(network: unknown, href: unknown): string | null {
  try {
    if (!isNetwork(network)) return 'network'
    if (typeof href !== 'string') return 'type'
    if (!charsetOk(href)) return 'charset'
    if (href.length > SOCIAL_LINK_MAX_CHARS) return 'length'
    const parts = splitUrl(href)
    if (parts.scheme !== 'https') return 'scheme'
    if (parts.netloc.includes('@')) return 'credentials'
    const hostinfo = parts.netloc
    const colon = hostinfo.indexOf(':')
    const host = colon === -1 ? hostinfo : hostinfo.slice(0, colon)
    const port = colon === -1 ? '' : hostinfo.slice(colon + 1)
    if (port !== '') {
      if (!/^[0-9]+$/.test(port)) return 'port'
      const value = Number.parseInt(port, 10)
      if (value > 65535) return 'port'
      if (value !== 443) return 'port'
    }
    const hostname = host.toLowerCase()
    if (!HOSTNAME_RE.test(hostname) || !hostMatches(network, hostname)) return 'host'
    return pathProblem(parts.path)
  } catch {
    return 'type'
  }
}

/** `https://` + host in lower case + the rest untouched; byte-equal to the API's. */
export function normalizeSocialLink(href: string): string {
  const at = href.indexOf('://')
  if (at === -1) return href
  const rest = href.slice(at + 3)
  let cut = rest.length
  for (const sep of ['/', '?', '#']) {
    const idx = rest.indexOf(sep)
    if (idx !== -1) cut = Math.min(cut, idx)
  }
  return `https://${rest.slice(0, cut).toLowerCase()}${rest.slice(cut)}`
}

/**
 * The tenant's valid links, in render order. Total: a missing field (an API
 * from before it existed), a non-object, an unknown network or a URL that does
 * not pass the rule simply yields fewer links (D-6). The same list feeds the
 * footers and `sameAs` (D-7), so the two cannot disagree.
 */
export function socialLinksOf(tenant: { social_links?: unknown } | null | undefined): SocialLink[] {
  try {
    const raw = tenant?.social_links
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
    const stored = raw as Record<string, unknown>
    const links: SocialLink[] = []
    SOCIAL_NETWORKS.forEach((network, code) => {
      const value = stored[network]
      if (typeof value !== 'string' || socialLinkProblem(network, value) !== null) return
      links.push({ network, code, href: normalizeSocialLink(value), name: NAMES[network], path: PATHS[network] })
    })
    return links
  } catch {
    return []
  }
}
