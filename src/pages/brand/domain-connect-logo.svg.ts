import type { APIRoute } from 'astro'

import logo from '../../assets/brand/domain-connect-logo.svg?raw'

/**
 * The logo the Domain Connect template points at (`logoUrl`), at an address
 * that never changes: `https://1platform.pro/brand/domain-connect-logo.svg`.
 * A DNS provider shows it on its consent screen, so it cannot carry a content
 * hash the way `/brand/logo/<hash>.png` does.
 *
 * It is the platform's own lockup — the Domain Connect service provider is
 * 1Platform, not a tenant of this site. That is why it is a route and not a
 * `public/` file: a static file bypasses the middleware and would be served
 * under every client's domain. Here, an unknown host is already a 404 in the
 * middleware, and any tenant other than the provider gets the same 404.
 */
export const prerender = false

/** The tenant that publishes the Domain Connect templates (providerId `1platform.pro`). */
const DOMAIN_CONNECT_PROVIDER_SLUG = 'oneplatform'

export const GET: APIRoute = ({ locals }) => {
  if (locals.tenant.slug !== DOMAIN_CONNECT_PROVIDER_SLUG) {
    return new Response('Not Found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff' },
    })
  }

  return new Response(logo, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      'x-content-type-options': 'nosniff',
    },
  })
}
