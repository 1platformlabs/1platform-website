import type { APIRoute } from 'astro'

import { faviconBytes, uploadedFavicon } from '@lib/tenant-brand-assets'

/**
 * The tenant's uploaded favicon, re-served from the tenant's OWN origin.
 *
 * The hash in the path must be the CURRENT favicon of the tenant this host
 * resolved to; anything else — another tenant's hash, an old one, garbage — is
 * the same 404, decided here before the API is asked. So a host can never be
 * used to read another tenant's favicon, and invented hashes cost the API nothing.
 *
 * The bytes come from the API (a base URL of this server's configuration,
 * never of the manifest); the storage behind it never appears in this page.
 */
export const prerender = false

const NOT_FOUND = () =>
  new Response('Not Found\n', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    },
  })

export const GET: APIRoute = async ({ params, locals }) => {
  const favicon = uploadedFavicon(locals.tenant)
  if (!favicon || params.hash !== favicon.sha256) return NOT_FOUND()

  const png = await faviconBytes(locals.tenant)
  if (!png) {
    console.warn('[brand-assets] uploaded favicon unavailable tenant=%s', locals.tenant.slug)
    return new Response('Service Unavailable\n', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-content-type-options': 'nosniff',
        'cache-control': 'no-store',
        'retry-after': '30',
      },
    })
  }

  const bytes = new Uint8Array(png.byteLength)
  bytes.set(png)
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      // The hash is the version: these bytes never change at this URL.
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  })
}
