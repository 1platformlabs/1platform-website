import type { APIRoute } from 'astro'

import { logoBytes, uploadedLogo } from '@lib/tenant-brand-assets'

/**
 * The tenant's uploaded logo, re-served from the tenant's OWN origin (api#519).
 *
 * The hash in the path must be the CURRENT logo of the tenant this host
 * resolved to; anything else — another tenant's hash, an old one, garbage — is
 * the same 404, decided here before the API is asked. So a host can never be
 * used to read another tenant's logo, and invented hashes cost the API nothing.
 *
 * The bytes come from the API (a base URL of this server's configuration,
 * never of the manifest); the storage behind it never appears in this page.
 */
export const prerender = false

const NOT_FOUND = () =>
  new Response('Not Found\n', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' },
  })

export const GET: APIRoute = async ({ params, locals }) => {
  const logo = uploadedLogo(locals.tenant)
  if (!logo || params.hash !== logo.sha256) return NOT_FOUND()

  const png = await logoBytes(locals.tenant)
  if (!png) {
    console.warn('[brand-assets] uploaded logo unavailable tenant=%s', locals.tenant.slug)
    return NOT_FOUND()
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
