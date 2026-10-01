import type { APIRoute } from 'astro'

import { logoIconPng } from '@lib/tenant-brand-assets'

/**
 * The PNG favicon, made from the tenant's uploaded logo (api#519). A tenant
 * without one keeps `/brand/icon.svg` and gets a 404 here, never a platform icon.
 */
export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  const png = await logoIconPng(locals.tenant)
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
