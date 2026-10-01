/**
 * The tenant's outbound destinations, as data (D-7).
 *
 * WHY A HELPER AND NOT JUST `locals.tenant.destinations`
 * ------------------------------------------------------
 * Most call sites do not want the bare URL — they want the app with an intent
 * (`?intent=store`) or the docs with a sub-path (`api-docs`). Written by hand
 * that becomes `https://app.1platform.pro/app/?intent=store` in thirty-two
 * places, which is exactly what it WAS: measured across `src/page-content/`,
 * 32 literal destination URLs in 15 files, none of them reading the manifest.
 *
 * Two of those leaked to other tenants the day they were written, because the
 * pages carrying them are pages EVERY tenant renders: the commerce CTA on the
 * home, and the docs link on the 404 page. The other thirty sit on pages only
 * the platform publishes, so `SiteTenant.pages` hides them today — which makes
 * them latent rather than fixed, and the reason to convert them all rather than
 * only the two that showed up on a probe.
 *
 * ABSENCE IS AN ANSWER (D-7)
 * --------------------------
 * These return `null` for a tenant that has no such destination, and the caller
 * renders nothing. Not an empty href, not a disabled button, and above all not
 * the platform's own URL as a "sensible default" — a clinic linking to
 * `app.1platform.pro` is the leak this epic exists to close, wearing the
 * costume of a fallback.
 */

import type { SiteTenant } from './site-api'

type DestinationLocals = { tenant: SiteTenant }

/** Explicit origin-to-origin substitutions for an isolated preview/QA environment.
 * An absent mapping preserves the tenant's destination; it never invents one. */
export function environmentDestination(destination: string): string {
  const original = new URL(destination)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(original.hostname) || original.hostname.endsWith('.localhost')
  if ((original.protocol !== 'https:' && !(original.protocol === 'http:' && local)) || original.username || original.password) throw new Error('Invalid tenant destination')
  const raw = typeof process !== 'undefined' ? process.env?.SITE_DESTINATION_ORIGINS : undefined
  if (!raw) return destination
  const mappings: unknown = JSON.parse(raw)
  if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) throw new Error('Invalid destination origin map')
  const replacement = (mappings as Record<string, unknown>)[original.origin]
  if (replacement === undefined) return destination
  if (typeof replacement !== 'string') throw new Error('Invalid destination origin')
  const target = new URL(replacement)
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.hostname.endsWith('.localhost')
  if ((target.protocol !== 'https:' && !(target.protocol === 'http:' && loopback)) || target.username || target.password || target.pathname !== '/' || target.search || target.hash) throw new Error('Invalid destination origin')
  return `${target.origin}${original.pathname}${original.search}${original.hash}`
}

export function supportUrl(locals: DestinationLocals): string | null {
  const destination = locals.tenant.destinations.support
  return destination ? environmentDestination(destination) : null
}

/**
 * The tenant's product, optionally carrying an intent.
 *
 * The intent survives because it is a real product behaviour — the dashboard
 * reads `?intent=` to open on the right module — and dropping it in the name of
 * tidiness would silently change where a visitor lands.
 */
export function appUrl(locals: DestinationLocals, intent?: string): string | null {
  const base = locals.tenant.destinations.app
  if (!base) return null
  if (!intent) return environmentDestination(base)
  // `new URL` rather than concatenation: a tenant may store an app URL that
  // already carries a query string or lacks a trailing slash, and string
  // arithmetic on either produces a link that 404s at the other end.
  const url = new URL(base)
  url.searchParams.set('intent', intent)
  return environmentDestination(url.toString())
}

/** The tenant's developer documentation, optionally a sub-path of it. */
export function docsUrl(locals: DestinationLocals, path?: string): string | null {
  const base = locals.tenant.destinations.docs
  if (!base) return null
  return environmentDestination(path ? new URL(path, base).toString() : base)
}

/**
 * A call-to-action, or nothing at all.
 *
 * The chrome components take `primaryCta?: { label, href }` and already render
 * nothing when it is absent. This is the adapter between "the tenant has no
 * such destination" (`null`) and that shape (`undefined`), written once so the
 * fourteen call sites do not each invent a ternary — and so the D-7 rule reads
 * the same way everywhere: no destination, no element.
 */
export function ctaTo(
  label: string,
  href: string | null,
): { label: string; href: string } | undefined {
  return href ? { label, href } : undefined
}
