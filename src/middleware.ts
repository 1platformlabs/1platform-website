import type { MiddlewareHandler } from 'astro'

/**
 * Request-scoped middleware.
 *
 * This file exists because the site became a server. In F1 it carries exactly
 * one guard — the image endpoint below. From F4 it is also where the tenant
 * resolved from `Host` will live (`context.locals`), which is the only place it
 * may live: a module-level variable would let two concurrent requests for two
 * different hosts overwrite each other, and the damage would not be a wrong
 * render but a cache write under the wrong key.
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

  return next()
}
