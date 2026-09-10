import type { APIRoute } from 'astro'

import { iconSvg } from '@lib/tenant-brand-assets'

/** A per-tenant SVG, not a `public/` file that would bypass middleware. */
export const prerender = false

export const GET: APIRoute = ({ locals }) => new Response(iconSvg(locals.tenant), {
  status: 200,
  headers: {
    'content-type': 'image/svg+xml; charset=utf-8',
    'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
    'x-content-type-options': 'nosniff',
  },
})
