import type { APIRoute } from 'astro'

import { socialPng } from '@lib/tenant-brand-assets'

/** A cached per-tenant share card. It is never a fallback to platform media. */
export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  const png = await socialPng(locals.tenant)
  if (!png) {
    console.warn('[brand-assets] social raster unavailable tenant=%s', locals.tenant.slug)
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
