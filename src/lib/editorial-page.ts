/**
 * Server helpers shared by the three editorial pages (§23 E-1, E-5, E-8).
 *
 * The tenant comes from `Astro.locals.tenant` — resolved by the middleware from
 * the request HOST through the Core — never from anything the browser sends.
 */
import type { AstroGlobal } from 'astro'
import { apiBaseUrl, API_TIMEOUT_MS } from './site-api'
import { resolveArchive, resolveEditorial, type BlogCard, type Editorial } from './site-blog'

export const FLASH_COOKIE = 'ed_newsletter'

export type EditorialData =
  | { ok: true; editorial: Editorial; archive: BlogCard[] }
  | { ok: false; status: 404 | 503 }

/** Editorial block + archive for this request's site and locale. */
export async function loadEditorial(astro: AstroGlobal): Promise<EditorialData> {
  const { tenant, locale } = astro.locals
  const [editorial, archive] = await Promise.all([resolveEditorial(tenant.slug, locale), resolveArchive(tenant.slug, locale)])
  if (editorial.outcome === 'unavailable' || archive.outcome === 'unavailable') {
    console.warn('[editorial] unavailable slug=%s locale=%s', tenant.slug, locale)
    return { ok: false, status: 503 }
  }
  if (editorial.outcome === 'absent' || archive.outcome === 'absent') return { ok: false, status: 404 }
  return { ok: true, editorial: editorial.value, archive: archive.value }
}

export function categoryNamer(editorial: Editorial): (id: string) => string {
  const names = new Map(editorial.categories.map((c) => [c.id, c.name]))
  return (id: string) => names.get(id) ?? id
}

/** One-shot outcome of a no-JS newsletter submission, then cleared. */
export function takeFlash(astro: AstroGlobal): 'ok' | 'error' | null {
  const value = astro.cookies.get(FLASH_COOKIE)?.value
  if (value) astro.cookies.delete(FLASH_COOKIE, { path: '/' })
  return value === 'ok' || value === 'error' ? value : null
}

function sameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site')
  if (site) return site === 'same-origin'
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

/**
 * POST handler of the newsletter form, served by `/blog/` itself so it lives
 * inside a route the site publishes. Forwards to the Core with the slug of the
 * site the middleware resolved, and says "ok" only after a 202.
 */
export async function handleNewsletterPost(astro: AstroGlobal): Promise<Response> {
  const { request } = astro
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json')
  let status = 400
  if (sameOrigin(request)) {
    const form = await request.formData().catch(() => null)
    const email = String(form?.get('email') ?? '').slice(0, 254)
    const consent = form?.get('consent') === 'true'
    try {
      const response = await fetch(
        `${apiBaseUrl()}/api/v1/sites/${encodeURIComponent(astro.locals.tenant.slug)}/blog/newsletter`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ email, locale: astro.locals.locale, consent }),
        },
      )
      // A Core rate limit (429) is «try again later», not «your data is invalid»:
      // reporting it as 422 hid the ceiling in logs (/verify-epic-e2e 2026-11-09).
      status =
        response.status === 202 ? 202
        : response.status === 404 ? 404
        : response.status === 429 || response.status >= 500 ? 503
        : 422
    } catch {
      status = 503
    }
  }
  if (wantsJson) {
    return new Response(JSON.stringify({ ok: status === 202 }), {
      status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  }
  astro.cookies.set(FLASH_COOKIE, status === 202 ? 'ok' : 'error', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 })
  // Back to the page that posted, but only when it is THIS site's page: the
  // referer is a browser header, and a foreign one must not turn this into an
  // open redirect. The fallback is the public library URL — never the physical
  // render route the middleware rewrote to.
  const fallback = astro.locals.localizePath('/blog/', astro.locals.locale)
  let target = fallback
  try {
    const back = new URL(request.headers.get('referer') ?? '')
    const host = (request.headers.get('host') ?? '').split(':')[0]
    if (back.hostname === host && back.pathname.startsWith('/') && !back.pathname.startsWith('/render/')) {
      target = `${back.pathname}${back.search}`
    }
  } catch {
    /* no or malformed referer: the fallback stands */
  }
  return new Response(null, { status: 303, headers: { location: `${target}#boletin`, 'cache-control': 'no-store' } })
}
