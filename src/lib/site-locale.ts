/**
 * Which language a request is in, given the TENANT that answers for it.
 *
 * WHY THIS REPLACES `localeFromPath` FOR ANYTHING TENANT-AWARE
 * ------------------------------------------------------------
 * `localeFromPath` (in `src/i18n/ui.ts`) hard-codes one topology: English at
 * the root, Spanish under `/es/`. That is 1Platform's topology, and until this
 * epic it was the only one. It is wrong for every other tenant, and the way it
 * is wrong is silent — measured before this module existed:
 *
 *   the clinics tenant declares `locales: ['es']` and `default_locale: 'es'`
 *   its home served the ENGLISH tree, announced hreflang en + es,
 *   emitted x-default pointing at English, and drew the EN language switcher
 *
 * Nothing failed. `tenant.locales` had exactly one reader in the whole tree
 * (the sitemap) and `tenant.default_locale` had none at all, so declaring a
 * language in the manifest changed nothing about what was served.
 *
 * THE RULE
 * --------
 * A tenant's DEFAULT locale is served at the root, with no prefix. Every OTHER
 * locale it declares is served under `/<locale>/`. So:
 *
 *   1platform.pro   locales en,es  default en   →  `/pricing/`, `/es/precios/`
 *   the clinic      locales es     default es   →  `/servicios/`, and no /es/
 *
 * For tenant #1 that is byte-for-byte the behaviour `localeFromPath` already
 * had, which is what keeps the no-regression checkable.
 *
 * A LOCALE THE SITE CANNOT RENDER IS A NAMED FAILURE, NOT A FALLBACK
 * -------------------------------------------------------------------
 * This build knows how to render `en` and `es`: it has a route map, date
 * formats, `og:locale` values and endonyms for those two and for nothing else.
 * A manifest declaring `pt` is a manifest this build cannot serve. Saying so —
 * and letting the caller answer 503 — is the honest outcome. Quietly falling
 * back to English would publish the wrong language under a customer's domain
 * and report success, which is the exact class of failure this epic exists to
 * stop shipping.
 */

import {
  LOCALES,
  alternatesForPath,
  localizePath,
  stripLocale,
  type Locale,
} from '@i18n/ui'
import { translateFromEs } from '@i18n/routes'
import type { SiteTenant } from './site-api'

export class UnsupportedTenantLocale extends Error {
  constructor(readonly slug: string, readonly locale: string) {
    super(
      `site ${slug} declares locale "${locale}", which this build cannot render ` +
        `(it knows ${[...LOCALES].join(', ')})`,
    )
    this.name = 'UnsupportedTenantLocale'
  }
}

export function isSupportedLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/**
 * The tenant's default locale, checked.
 *
 * Throws rather than returning a fallback — see the module docstring. The
 * caller (the middleware) turns this into a 503 with the reason logged, so an
 * operator sees "this manifest is unserveable" instead of a site quietly in the
 * wrong language.
 */
export function defaultLocaleOf(tenant: SiteTenant): Locale {
  if (!isSupportedLocale(tenant.default_locale)) {
    throw new UnsupportedTenantLocale(tenant.slug, tenant.default_locale)
  }
  return tenant.default_locale
}

/**
 * Every locale this tenant publishes, in manifest order, defaults first.
 *
 * The default is moved to the front rather than sorted, because callers that
 * render a language switcher or an hreflang block want a stable order and the
 * default is the one that owns the root.
 */
export function localesOf(tenant: SiteTenant): Locale[] {
  const fallbackFirst = defaultLocaleOf(tenant)
  const rest: Locale[] = []
  for (const locale of tenant.locales) {
    if (!isSupportedLocale(locale)) throw new UnsupportedTenantLocale(tenant.slug, locale)
    if (locale !== fallbackFirst) rest.push(locale)
  }
  return [fallbackFirst, ...rest]
}

/**
 * The locale of a request, from its path and the tenant answering it.
 *
 * The prefix test is exact-then-boundary, the same care `localeFromPath` takes
 * with `/establish/`: `/es` and `/es/...` are Spanish, `/established/` is not.
 * Getting that wrong does not fail loudly — it serves a page in the wrong
 * language at an address that looks right.
 */
export function localeForRequest(pathname: string, tenant: SiteTenant): Locale {
  const declared = localesOf(tenant)
  const fallback = declared[0]
  for (const locale of declared) {
    if (locale === fallback) continue
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) return locale
  }
  return fallback
}

/**
 * Whether this tenant publishes more than one language.
 *
 * The single question behind three behaviours — hreflang pairs, the language
 * switcher, and `x-default` — so it is asked once and named, rather than
 * spelled `tenant.locales.length > 1` in three places that can drift.
 */
export function isMultilingual(tenant: SiteTenant): boolean {
  return localesOf(tenant).length > 1
}

/**
 * The locale-independent route identity for one tenant URL.
 *
 * `stripLocale` deliberately understands only 1Platform's public topology
 * (English at the root, Spanish below `/es/`). A tenant whose default is
 * Spanish reverses that topology: `/contacto/` is its Spanish root URL and
 * `/en/contact/` is the English twin. Treating the former as an English
 * canonical route silently drops both alternates because the manifest stores
 * `/contact/`.
 */
export function canonicalPathForTenant(pathname: string, tenant: SiteTenant): string {
  const fallback = defaultLocaleOf(tenant)
  if (fallback === 'en') return stripLocale(pathname)

  if (pathname === '/en' || pathname === '/en/') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice('/en'.length)

  // `translateFromEs` expects the established `/es/…` topology. Add that
  // prefix only for the lookup, then keep the canonical route it returns.
  const spanish = pathname === '/' ? '/es/' : `/es${pathname}`
  return translateFromEs(spanish)
}

function withoutLocalePrefix(pathname: string, locale: Locale): string {
  const prefix = `/${locale}`
  if (pathname === prefix || pathname === `${prefix}/`) return '/'
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname
}

/** Canonical identity of a locale-labelled candidate, independent of topology. */
function canonicalCandidate(locale: Locale, pathname: string): string {
  if (locale === 'es') {
    const spanish =
      pathname === '/es' || pathname.startsWith('/es/')
        ? pathname
        : pathname === '/'
          ? '/es/'
          : `/es${pathname}`
    return translateFromEs(spanish)
  }

  return withoutLocalePrefix(pathname, 'en')
}

/** Move a locale-labelled candidate under this tenant's prefix convention. */
function candidateForTenant(
  pathname: string,
  locale: Locale,
  fallback: Locale,
): string {
  const unprefixed = withoutLocalePrefix(pathname, locale)
  if (locale === fallback) return unprefixed
  return unprefixed === '/' ? `/${locale}/` : `/${locale}${unprefixed}`
}

/**
 * Language destinations this tenant can truthfully advertise for one page.
 *
 * `alternatesForPath` remains the source of the established 1Platform pairing
 * (including translated slugs and insertion order). This boundary narrows that
 * candidate map by the tenant's declared locales and published canonical page
 * set. A monolingual tenant therefore returns an empty object: no alternate,
 * no `x-default`, no language selector and no detector destination can point
 * at a tree it does not publish.
 *
 * Content pages may pass a narrower candidate map (for example, a blog post
 * whose translation does not exist). The same filtering is applied, so an
 * explicit map cannot bypass the tenant manifest.
 */
export function alternatesForTenantPath(
  tenant: SiteTenant,
  pathname: string,
  candidates?: Partial<Record<Locale, string>>,
): Partial<Record<Locale, string>> {
  const locales = localesOf(tenant)
  if (locales.length < 2) return {}

  const fallback = locales[0]
  const supplied = candidates !== undefined
  const candidateMap = supplied
    ? candidates
    : fallback === 'en'
      // Keep the established map — including property order — byte-for-byte
      // for tenant #1. The other branch needs the tenant's reversed topology.
      ? alternatesForPath(pathname)
      : Object.fromEntries(
          locales.map((locale) => [
            locale,
            makeLocalizePath(tenant)(canonicalPathForTenant(pathname, tenant), locale),
          ]),
        )

  const published = new Set(tenant.pages)
  const result: Partial<Record<Locale, string>> = {}
  for (const locale of locales) {
    const path = candidateMap[locale]
    if (!path?.startsWith('/')) continue
    if (!published.has(canonicalCandidate(locale, path))) continue
    // Explicit content alternates are built by the established i18n helpers,
    // so adapt their prefix while preserving their locale-specific slug. This
    // matters for translated blog slugs, which cannot be regenerated from the
    // current URL alone.
    result[locale] = supplied ? candidateForTenant(path, locale, fallback) : path
  }
  return result
}

/**
 * The path localiser for one tenant.
 *
 * `localizePath` in `src/i18n/ui.ts` bakes in 1Platform's topology: the DEFAULT
 * locale is `en` and it lives at the root. For a tenant whose default is `es`
 * that function prefixes and translates every internal link — so a Spanish
 * clinic's own navigation would point at `/es/servicios/`, a tree it does not
 * publish, and every link on the site would 404.
 *
 * This wraps it with the tenant's own default. The rule is the same one
 * `localeForRequest` reads: the default locale owns the root, every other
 * declared locale gets a prefix.
 */
export function makeLocalizePath(
  tenant: SiteTenant,
): (href: string, locale: Locale) => string {
  const fallback = defaultLocaleOf(tenant)
  return (href: string, locale: Locale) => {
    if (!href.startsWith('/')) return href
    const canonical = stripLocale(href)

    if (locale !== fallback) {
      if (fallback === 'es' && locale === 'en') {
        return canonical === '/' ? '/en/' : `/en${canonical}`
      }
      return localizePath(canonical, locale)
    }

    // The default locale owns the root — but "the root" is not the same as "the
    // English slug". A route is stored canonically (`/contact/`) because that is
    // its IDENTITY across languages; the address a visitor sees is a separate
    // question. For a tenant whose default is Spanish, returning the canonical
    // unchanged would publish `/contact/` on a Spanish-only site: an English
    // word in the one place a searcher reads before clicking.
    //
    // So the translation is applied and only the PREFIX is dropped, because the
    // prefix is what marks a non-default language and this locale is the
    // default.
    //
    // ⚠️ Limitation, stated rather than hidden: `translateToEs` is the only
    // route map this build has, so this branch is correct for `es` and would
    // need a map of its own for a third language. `localesOf` already refuses
    // any locale outside `LOCALES`, so that case cannot arrive silently.
    if (fallback === 'es') return localizePath(canonical, 'es').replace(/^\/es(?=\/|$)/, '') || '/'

    return canonical
  }
}
