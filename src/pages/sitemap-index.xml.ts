import type { APIRoute } from 'astro'

/**
 * The index the `<link rel="sitemap">` in the head points at.
 *
 * Kept as its own route with the same name the integration used, because that
 * name is already in `robots.txt`, in the head of every page, and in whatever
 * Search Console has learned. Renaming it would be a migration nobody asked for.
 */
export const prerender = false

export const GET: APIRoute = ({ locals }) => {
  const tenant = locals.tenant
  if (!tenant.indexable) {
    return new Response('', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `<sitemap><loc>https://${tenant.domain}/sitemap-0.xml</loc></sitemap>`,
    '</sitemapindex>',
  ].join('\n')
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
