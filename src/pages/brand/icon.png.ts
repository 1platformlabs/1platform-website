import type { APIRoute } from 'astro'

import { logoIconPng, monogramIconPng, uploadedLogo } from '@lib/tenant-brand-assets'

/**
 * The PNG favicon, made from the tenant's uploaded logo (api#519). A tenant
 * without one keeps `/brand/icon.svg` and gets a 404 here, never a platform icon.
 */
export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  const png = await logoIconPng(locals.tenant)
  if (!png && uploadedLogo(locals.tenant)) {
    // The logo's bytes are unavailable right now (API degraded, or this page
    // still carries an older hash). The monogram beats an empty tab — but it
    // must not be cached at a URL that names the LOGO's version.
    const fallback = await monogramIconPng(locals.tenant)
    const body = new Uint8Array(fallback.byteLength)
    body.set(fallback)
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'image/png', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
    })
  }
  if (!png) {
    return new Response('Not Found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' },
    })
  }

  const bytes = new Uint8Array(png.byteLength)
  bytes.set(png)
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      'x-content-type-options': 'nosniff',
    },
  })
}
