/**
 * One post of the platform template (BlogLayout / LegacyBlogLayout), read from
 * the Core and rendered through the same Markdown processor Astro used for the
 * collection (D-8, option b — `scripts/render-parity-f0.mjs` holds the bytes).
 *
 * The middleware has already decided whether this address exists (D-7); this is
 * the page's own answer, which agrees with it and stays honest when the cache
 * moved in between: the site's 404 when the Core no longer has the post, a 503
 * when it cannot be read or rendered safely. Never another site's post.
 */
import { renderBody, renderedBodyIsSafe, type RenderedBody } from './editorial-render'
import { resolvePost, type BlogPost } from './site-blog'

export type PlatformPost =
  | { ok: true; post: BlogPost; rendered: RenderedBody }
  | { ok: false; status: 404 | 503 }

export async function loadPlatformPost(tenantSlug: string, locale: string, slug: string | undefined): Promise<PlatformPost> {
  if (!slug) return { ok: false, status: 404 }
  const resolved = await resolvePost(tenantSlug, locale, slug)
  if (resolved.outcome === 'absent') return { ok: false, status: 404 }
  if (resolved.outcome === 'unavailable') return { ok: false, status: 503 }
  const rendered = await renderBody(resolved.value.body)
  // A body whose HTML is not safe is refused like raw HTML: recoverable, never a page.
  if (!renderedBodyIsSafe(rendered.html)) return { ok: false, status: 503 }
  return { ok: true, post: resolved.value, rendered }
}

export function refusal(status: 404 | 503): Response {
  return new Response(status === 404 ? 'Not Found\n' : 'Service Unavailable\n', {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      ...(status === 503 ? { 'retry-after': '30' } : {}),
    },
  })
}
