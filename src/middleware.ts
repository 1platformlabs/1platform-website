import type { MiddlewareHandler } from 'astro'

import { manifestSource } from './data/site-tenants'
import { dictionaryFor } from './i18n'
import { resolveTenant } from './lib/resolve-tenant'
import { resolveContent } from './lib/site-content'
import { isPublishedRequest } from './lib/site-routes'
import {
  UnsupportedTenantLocale,
  localeForRequest,
  makeLocalizePath,
} from './lib/site-locale'

/**
 * Request-scoped middleware.
 *
 * This file exists because the site became a server. It carries two things: the
 * image guard below, and the tenant resolved from `Host`.
 *
 * The tenant goes in `context.locals` and nowhere else. That is the only place
 * it may live: a module-level variable would let two concurrent requests for two
 * different hosts overwrite each other, and the damage would not be a wrong
 * render — which someone would notice — but a cache write under the wrong key,
 * which poisons later responses for a tenant nobody was looking at.
 *
 * ⚠️ What middleware CANNOT gate, measured on this build: anything the adapter
 * serves from `dist/client/` — every file in `public/`, and every route carrying
 * `export const prerender = true`. The static handler answers before the
 * application runs, so a 403 returned from here never reaches them. That is why
 * per-tenant files have to become ROUTES, and why `tests/prerender-is-declared.
 * spec.ts` makes every prerendered route a decision somebody signed.
 */

/**
 * The static build optimised images ahead of time and emitted plain files. A
 * server build cannot: it exposes `/_image` and resizes on demand, from
 * dimensions supplied in the query string. Astro's own endpoint blocks remote
 * sources (measured: a remote `href` answers 403) but does NOT bound the size.
 *
 * Measured on this site before this guard existed:
 *
 *   GET /_image/?href=…platform-modules.png&w=7000&h=7000&f=png
 *     -> 200, 3_045_496 bytes
 *
 * A ~100-byte request returning 3 MB is roughly 30_000x amplification, and the
 * cost is CPU on the single Node process that also renders every page for every
 * tenant. Each distinct `w` is also a distinct variant, so an attacker walking
 * `w` defeats any cache in front of it. That is the same shape as the
 * amplification D-24 closes for unknown hosts, arriving through a door the
 * conversion to a server opened.
 *
 * The bound is the source material, not a guess: every `_image` URL this site
 * emits asks for one of 480, 720, 960 or 1254 pixels, and 1254 is the intrinsic
 * width of the largest asset in the build. Upscaling past the original produces
 * no detail, so refusing it costs nothing real. MAX_DIMENSION sits above the
 * largest asset with room for a bigger one to be added without tripping it.
 */
const MAX_DIMENSION = 2000
const ALLOWED_FORMATS = new Set(['webp', 'avif', 'png', 'jpeg', 'jpg', 'gif', 'svg'])

/** Reads a positive integer, or null when the parameter is absent. NaN is not absent. */
function dimension(raw: string | null): number | null | undefined {
  if (raw === null) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

export function imageRequestIsAcceptable(url: URL): { ok: true } | { ok: false; why: string } {
  const w = dimension(url.searchParams.get('w'))
  const h = dimension(url.searchParams.get('h'))
  if (w === undefined) return { ok: false, why: 'w is not a positive integer' }
  if (h === undefined) return { ok: false, why: 'h is not a positive integer' }
  if (w !== null && w > MAX_DIMENSION) return { ok: false, why: `w=${w} exceeds ${MAX_DIMENSION}` }
  if (h !== null && h > MAX_DIMENSION) return { ok: false, why: `h=${h} exceeds ${MAX_DIMENSION}` }

  const f = url.searchParams.get('f')
  if (f !== null && !ALLOWED_FORMATS.has(f)) return { ok: false, why: `f=${f} is not an allowed format` }

  return { ok: true }
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url } = context

  if (url.pathname === '/_image' || url.pathname === '/_image/') {
    const verdict = imageRequestIsAcceptable(url)
    if (!verdict.ok) {
      // 400, not 404: the resource is fine, the requested transform is not, and
      // saying so plainly beats pretending the image does not exist.
      return new Response(`Unacceptable image transform: ${verdict.why}\n`, {
        status: 400,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' },
      })
    }
  }

  // The tenant for THIS request. `context.locals` is per request by
  // construction, which is the entire reason the answer is put there.
  const host = context.request.headers.get('host') ?? url.host
  const resolution = await resolveTenant(host)

  if (resolution.outcome === 'unknown-host') {
    // A real 404, and deliberately not another tenant's page. The front door
    // today answers 200 with an unrelated product's panel for an unrouted
    // domain; serving someone else's site here would be that same defect.
    return new Response('Not Found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' },
    })
  }

  if (resolution.outcome === 'unavailable') {
    // No copy and the API could not be asked. 503 is the honest answer: the
    // site exists, we cannot render it right now, come back. A 404 here would
    // tell crawlers the page is gone, and a half-rendered page would be worse
    // than either.
    console.warn('[tenant] unavailable host=%s reason=%s', host, resolution.reason)
    return new Response('Service Unavailable\n', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-content-type-options': 'nosniff',
        'retry-after': '30',
        'cache-control': 'no-store',
      },
    })
  }

  const tenant = resolution.tenant
  context.locals.tenant = tenant

  /** Age of the cached COPY, when it is being served stale. Reported separately
   *  from the manifest's age: the two are fetched independently and either can
   *  be stale on its own, so one header for both would hide which. */
  let contentAgeMs: number | null = null

  // ── The tenant's language, and then the tenant's words ─────────────────
  //
  // Both go in `locals` and nowhere else, for the reason D-27 gives about the
  // tenant itself: this process serves concurrent requests for different hosts,
  // and the damage from a module-level "current" value is not a wrong render —
  // it is a cache write under the wrong key, poisoning later responses for a
  // tenant nobody was looking at.
  let locale
  try {
    locale = localeForRequest(url.pathname, tenant)
    context.locals.localizePath = makeLocalizePath(tenant)
  } catch (err) {
    // A manifest this build cannot render. 503 and not a fallback to English:
    // serving the wrong language under a customer's domain, and reporting
    // success, is the failure this epic exists to stop shipping.
    const reason = err instanceof UnsupportedTenantLocale ? err.message : String(err)
    console.error('[tenant] unserveable manifest host=%s reason=%s', host, reason)
    return new Response('Service Unavailable\n', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-content-type-options': 'nosniff',
        'retry-after': '30',
        'cache-control': 'no-store',
      },
    })
  }
  context.locals.locale = locale

  if (manifestSource() === 'repo') {
    // The repo catalogues, for a laptop and the browser suite. Explicitly
    // chosen, never a fallback — see `src/data/site-tenants.ts`.
    context.locals.messages = dictionaryFor(locale)
  } else {
    const content = await resolveContent(tenant.slug, locale)
    if (content.outcome === 'unavailable') {
      // No copy and no way to fetch it. A page rendered without its dictionary
      // does not degrade gracefully — `t()` throws by design — so the choice is
      // between an honest 503 and a stack trace in a visitor's browser.
      console.warn(
        '[content] unavailable host=%s slug=%s locale=%s reason=%s',
        host,
        tenant.slug,
        locale,
        content.reason,
      )
      return new Response('Service Unavailable\n', {
        status: 503,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'x-content-type-options': 'nosniff',
          'retry-after': '30',
          'cache-control': 'no-store',
        },
      })
    }
    context.locals.messages = content.content.messages
    if (content.stale && content.ageMs !== null) {
      contentAgeMs = content.ageMs
    }
  }

  // ── The page set is a datum, and this is where it bites ────────────────
  //
  // `SiteTenant.pages` only ever reached the sitemap before this. So a tenant
  // that published six pages still SERVED all of 1Platform's — `/pricing/`
  // with the platform's prices, `/for-developers/`, the whole blog — to anyone
  // who asked for the URL. The sitemap omitting them changed nothing: a file
  // router does not consult a manifest.
  //
  // A route this tenant does not publish is a 404, and deliberately the SAME
  // 404 an unknown host gets: distinguishing "this page exists for somebody
  // else" from "this page does not exist" would tell a stranger which pages
  // other tenants have.
  //
  // ⚠️ ESTA COMPROBACIÓN VA DESPUÉS DEL DICCIONARIO, y el orden es el arreglo.
  // Cuando devolvía aquí mismo, `locals.messages` todavía no estaba puesto: el
  // render del /404 caía al `?? DICTIONARIES[locale]` de `useI18n` y contestaba
  // con las palabras del REPO —las de la plataforma— bajo el dominio del
  // inquilino. Medido: misma petición, mismo Host, `/` decía «© 2026 Clínica
  // Delta» y `/pricing/` decía «© 2026 1Platform Labs».
  //
  // No es un borde: un inquilino que publica una sola ruta sirve esta página en
  // TODAS las demás direcciones de su dominio.
  let response: Response
  if (!isPublishedRequest(url.pathname, tenant)) {
    // The site's own 404 PAGE, not a bare body — rewritten rather than
    // hand-written. The first version of this returned plain text and it was a
    // real regression the browser suite caught: every address a tenant does not
    // publish, `/404.html` included, lost the rendered page with its chrome and
    // its language control.
    //
    // The status has to be restored explicitly: a rewrite renders the target
    // route, and that route answers 200 on its own. A soft 404 would be worse
    // than the plain text — it poisons the index instead of merely looking bad.
    const rendered = await next('/404')
    response = new Response(rendered.body, {
      status: 404,
      headers: rendered.headers,
    })
  } else {
    response = await next()
  }

  // How old the manifest behind this page is. A header rather than a comment so
  // that "we are serving a stale copy" is observable from outside the process,
  // which is the only way anyone finds out the API has been down for an hour.
  if (resolution.stale && resolution.ageMs !== null) {
    response.headers.set('x-site-manifest-age', String(Math.round(resolution.ageMs / 1000)))
  }
  if (contentAgeMs !== null) {
    response.headers.set('x-site-content-age', String(Math.round(contentAgeMs / 1000)))
  }
  return response
}
