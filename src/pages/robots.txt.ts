import type { APIRoute } from 'astro'

/**
 * `robots.txt`, rendered per request because it is per TENANT.
 *
 * WHY IT STOPPED BEING A FILE, MEASURED
 * -------------------------------------
 * It was `public/robots.txt`, which the Node adapter serves from `dist/client/`
 * BEFORE the application runs — so no middleware could gate it. Probed against
 * the real server build, one file, three hosts:
 *
 *   Host: 1platform.pro           GET /robots.txt -> 200, 1156 bytes
 *   Host: clinicas.1platform.dev  GET /robots.txt -> 200, 1156 bytes
 *   Host: inventado.example       GET /robots.txt -> 200, 1156 bytes   ← resolves to NO tenant
 *
 * Byte-identical every time, ending in `Sitemap: https://1platform.pro/sitemap-index.xml`.
 * So a client's domain published the platform's sitemap as its own, and a host
 * that the site itself answers 404 for on every page still got a crawl policy.
 * For a tenant with `indexable: false` it was worse than useless: `Allow: /`,
 * pointing at a sitemap that is not theirs, while their own sitemap 404s.
 *
 * WHAT IS TENANT DATA AND WHAT IS POLICY
 * --------------------------------------
 * The AI-crawler block list is POLICY — a decision of this product about how
 * its sites are crawled, the same for every tenant, so it stays here in code.
 * The `Sitemap:` line and whether indexing is allowed at all are DATA, and come
 * from the manifest.
 *
 * ⚠️ `Content-Signal:` is deliberately absent, and this is not an oversight.
 * It is a non-standard directive that Lighthouse reports as invalid, and it was
 * measured to be the ONLY cause of the site's SEO score ceiling of 92
 * (Lighthouse 12, against the live site, 2026-09-01). The `Disallow:` rules
 * below are standard syntax and cost nothing.
 *
 * ⚠️ Cloudflare PREPENDS its own "Cloudflare Managed content" block to this
 * body rather than replacing it, so in the served file its rules come first and
 * these last. That is why nothing here depends on being the first line.
 */
export const prerender = false

/** Crawlers that collect content to train on. Product policy, not tenant data. */
const AI_CRAWLERS = [
  'Amazonbot',
  'Applebot-Extended',
  'Bytespider',
  'CCBot',
  'ClaudeBot',
  'Google-Extended',
  'GPTBot',
  'meta-externalagent',
]

export const GET: APIRoute = ({ locals }) => {
  const tenant = locals.tenant
  const origin = `https://${tenant.domain}`

  const lines: string[] = []

  if (!tenant.indexable) {
    // A provisional domain asks not to be crawled at all, and says so in the
    // one file a crawler reads first. It also publishes no `Sitemap:` line:
    // handing over a list of URLs while asking politely that they not be
    // indexed is a contradiction crawlers resolve in their own favour.
    lines.push(
      '# This site is not published yet.',
      '',
      'User-agent: *',
      'Disallow: /',
      '',
    )
  } else {
    lines.push('User-agent: *', 'Allow: /', 'Disallow: /api/', '')
  }

  lines.push('# AI crawlers: no permission to collect content from this site.')
  for (const agent of AI_CRAWLERS) {
    lines.push('', `User-agent: ${agent}`, 'Disallow: /')
  }

  if (tenant.indexable) {
    lines.push('', `Sitemap: ${origin}/sitemap-index.xml`)
  }

  return new Response(lines.join('\n') + '\n', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // Same policy the container's nginx applies to `.txt`: a deploy that
      // changes crawl policy must not wait out an edge cache.
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-content-type-options': 'nosniff',
    },
  })
}
