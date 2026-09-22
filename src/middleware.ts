import type { MiddlewareHandler } from 'astro'

import { manifestSource } from './data/site-tenants'
import { dictionaryFor } from './i18n'
import { resolveTenant } from './lib/resolve-tenant'
import { REDIRECT_MAX_AGE_SECONDS, decideRedirect } from './lib/site-redirect'
import { resolveContent } from './lib/site-content'
import { isPublishedRequest, physicalRouteOf } from './lib/site-routes'
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

/**
 * The edge's own answer, for the cases where no page can be produced.
 *
 * Plain text and BRAND-FREE, deliberately. The obvious improvement — a nice
 * error page — is the one thing that cannot be done here: rendering this
 * site's chrome needs the tenant's dictionary, which in every caller below is
 * exactly what is missing, and the only other chrome available is the
 * PLATFORM's. Serving 1Platform's logo, colours and words under a customer's
 * domain is the leak this whole epic exists to close, and an error page is not
 * an exception to it. Ten bytes that belong to nobody beat a beautiful page
 * that belongs to the wrong tenant.
 */
function edgeFailure(status: 500 | 503, message: string): Response {
  return new Response(`${message}\n`, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-content-type-options': 'nosniff',
      ...(status === 503 ? { 'retry-after': '30' } : {}),
      'cache-control': 'no-store',
    },
  })
}

/** Statuses that may not carry a body at all; `new Response(body, …)` throws on them. */
const BODYLESS = new Set([101, 103, 204, 205, 304])

/**
 * Hold the rendered response until it is COMPLETE, and say so if it never is.
 *
 * ⚠️ THIS IS WHY THE SITE STOPPED STREAMING, and the trade is deliberate
 * (issue #117).
 *
 * The Node adapter writes the status line and the headers BEFORE it reads the
 * first chunk of the body (`astro/dist/core/app/node.js`, `writeResponse`).
 * If the render then throws — and `t()` throws by design on a key the tenant's
 * copy does not carry — the adapter's only remaining move is to write the
 * literal string `Internal server error` into a response it has already
 * declared a 200 and destroy the socket. Measured: `HTTP 200`, 21 bytes, that
 * string. Every layer downstream reads that as a healthy page: the browser
 * renders nothing, a crawler indexes success, and no uptime check goes red.
 *
 * A stream cannot be un-sent, so the only way the status can tell the truth is
 * for it to be decided after the last byte exists. Buffering here costs this
 * site nothing real: every page is a few tens of KB rendered from an in-memory
 * dictionary the middleware already fetched, so there is no slow source for
 * streaming to hide — the whole document is produced in one synchronous burst
 * either way. What it buys is that a failed render is a 5xx instead of a lie.
 *
 * Returns `null` when the body died on the way out.
 */
async function settle(rendered: Response): Promise<Response | null> {
  if (!rendered.body || BODYLESS.has(rendered.status)) return rendered

  let body: ArrayBuffer
  try {
    body = await rendered.arrayBuffer()
  } catch {
    return null
  }

  return new Response(body, {
    status: rendered.status,
    statusText: rendered.statusText,
    headers: rendered.headers,
  })
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
    return edgeFailure(503, 'Service Unavailable')
  }

  const tenant = resolution.tenant

  // ── The site moved to its own domain ───────────────────────────────────
  //
  // Placed HERE, before the tenant is published to `locals` and before a line
  // of language or copy work: everything below this point is render cost for a
  // body this response will not have, and one of those steps can answer 503 on
  // its own — a site whose copy is briefly unfetchable should still redirect,
  // not report itself broken at an address it no longer serves.
  //
  // The destination is validated in `decideRedirect`, not here — see that
  // module for the rule and why it is a fixed point rather than a blocklist.
  const decision = decideRedirect(tenant.redirect_to, host)
  if (decision.outcome === 'redirect') {
    return new Response(null, {
      status: 301,
      headers: {
        location: `https://${decision.target}${url.pathname}${url.search}`,
        // Bounded on purpose. A 301 is cacheable indefinitely by default and
        // browsers take that literally, so an unbounded one would outlive the
        // decision that produced it: disconnecting the custom domain later
        // would leave visitors pinned to a host that no longer answers, with no
        // way left to reach them.
        'cache-control': `public, max-age=${REDIRECT_MAX_AGE_SECONDS}`,
      },
    })
  }
  if (decision.outcome === 'refused') {
    // A manifest asked for something this site will not do. Logged rather than
    // swallowed: the request is served normally either way, so without a line
    // here the only symptom of a broken destination is a redirect that silently
    // never happens.
    console.warn(
      '[tenant] ignored redirect_to host=%s why=%s value=%s',
      host,
      decision.why,
      tenant.redirect_to,
    )
  }

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
    return edgeFailure(503, 'Service Unavailable')
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
      return edgeFailure(503, 'Service Unavailable')
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
  const published = isPublishedRequest(url.pathname, tenant)

  let rendered: Response
  try {
    if (!published) {
      // The site's own 404 PAGE, not a bare body — rewritten rather than
      // hand-written. The first version of this returned plain text and it was
      // a real regression the browser suite caught: every address a tenant does
      // not publish, `/404.html` included, lost the rendered page with its
      // chrome and its language control.
      rendered = await next('/404')
    } else {
      const physicalPath = physicalRouteOf(url.pathname, tenant)
      rendered =
        physicalPath === url.pathname
          ? await next()
          : await next(`${physicalPath}${url.search}`)
    }
  } catch (err) {
    // A render that throws BEFORE the first byte. Astro turns this into its own
    // 500, which is already honest; catching it here only makes the body the
    // same brand-free one as every other edge failure, instead of whichever
    // string the framework happens to emit.
    console.error('[render] threw host=%s path=%s reason=%s', host, url.pathname, String(err))
    return edgeFailure(500, 'Internal Server Error')
  }

  // ⚠️ THE STATUS IS DECIDED AFTER THE LAST BYTE EXISTS — see `settle` (#117).
  const complete = await settle(rendered)
  if (complete === null) {
    // The render died with the response already half out. Before this, that was
    // answered as `200` with the adapter's `Internal server error` in the body.
    //
    // 503 rather than 500, and the choice is deliberate: from the edge there is
    // no way to tell a code defect from a site whose copy has not been written
    // yet, and the two want opposite answers. The cheap mistake is 503 — the
    // documented signal for "temporarily unavailable, come back", which costs a
    // crawler one revisit. The expensive one would be any 2xx, which is how a
    // site with no copy gets indexed as healthy.
    console.error(
      '[render] died mid-stream host=%s slug=%s path=%s — answering 503 instead of a truncated 200',
      host,
      tenant.slug,
      url.pathname,
    )
    return edgeFailure(503, 'Service Unavailable')
  }

  // The status has to be restored explicitly on the 404 rewrite: it renders the
  // target route, and that route answers 200 on its own. A soft 404 would be
  // worse than plain text — it poisons the index instead of merely looking bad.
  const response = published
    ? complete
    : new Response(complete.body, { status: 404, headers: complete.headers })

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
