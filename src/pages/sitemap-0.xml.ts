import type { APIRoute } from 'astro'

import { publishedUrls } from '@lib/site-routes'

/**
 * The sitemap, rendered per request because it is per TENANT.
 *
 * It replaces `@astrojs/sitemap`, which could not survive this epic for two
 * independent reasons:
 *
 *   · it runs at BUILD time, and under one build serving N brands the page set
 *     is a property of who is asking, not of the build;
 *   · it enumerates the route table, so the moment the blog routes became
 *     dynamic it dropped all sixteen of them — measured, 52 `<loc>` to 36, with
 *     the build printing success and exiting 0.
 *
 * A tenant whose domain is provisional publishes NO sitemap at all. Handing a
 * crawler a list of URLs and asking it politely not to index them, via a
 * `noindex` on each page, is a contradiction the crawler resolves in its own
 * favour often enough to matter.
 */
export const prerender = false

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const GET: APIRoute = async ({ locals }) => {
  const tenant = locals.tenant
  const origin = `https://${tenant.domain}`

  if (!tenant.indexable) {
    return new Response('', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const urls = await publishedUrls(tenant)
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls.map((u) =>
      [
        '<url>',
        `<loc>${xmlEscape(origin + u.path)}</loc>`,
        ...u.alternates.map(
          (a) =>
            `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${xmlEscape(origin + a.path)}"/>`,
        ),
        '</url>',
      ].join(''),
    ),
    '</urlset>',
  ].join('\n')

  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
