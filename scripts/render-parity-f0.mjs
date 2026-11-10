#!/usr/bin/env node
/**
 * F0 of blog-sitio-de-marca-generado (D-8): which render pipeline may the blog
 * use once its posts come from the Core instead of `src/content/blog`?
 *
 * Option (b) of D-8 is measured here directly: the SAME processor Astro uses
 * today (`@astrojs/markdown-satteri`, created with Astro's defaults) renders
 * every Markdown body, and the `<article class="article-copy">` of the frozen
 * baseline HTML is compared with it after whitespace normalisation. The run also
 * answers the extension questions (blockquote, table, heading anchors) and the
 * safety one (raw HTML must not reach the page as markup).
 *
 * Reads the bodies from `src/data/blog-fixture.json` (D-10: `src/content/blog` is gone).
 *
 * Usage: node scripts/render-parity-f0.mjs [--json]
 * Exit 0 only when all 16 posts match and every safety probe holds.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';

const ROOT = new URL('..', import.meta.url).pathname;
const FIXTURE = join(ROOT, 'src/data/blog-fixture.json');
const BASE = join(ROOT, 'tests/baseline/html');

const norm = (html) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

function articleOf(html) {
  const start = html.indexOf('<article class="article-copy"');
  if (start < 0) return null;
  const open = html.indexOf('>', start) + 1;
  const end = html.indexOf('<div class="article-end"', open);
  return html.slice(open, end);
}

const renderer = await createSatteriMarkdownProcessor({});
const results = [];

// The bodies the site renders now: the repo-mode fixture, shaped like the Core's
// answer (`scripts/export-blog-posts.mjs`). The baseline stays the frozen HTML
// of the sixteen articles as they were served from `src/content/blog`.
const { posts } = JSON.parse(readFileSync(FIXTURE, 'utf8'));
for (const locale of ['en', 'es']) {
  for (const { slug, body } of posts.filter((p) => p.locale === locale)) {
    const rendered = await renderer.render(body, { frontmatter: {} });
    const prefix = locale === 'en' ? '' : `${locale}/`;
    const baseline = readFileSync(join(BASE, `${prefix}blog/${slug}/index.html`), 'utf8');
    const expected = articleOf(baseline);
    const same = expected !== null && norm(expected) === norm(rendered.code);
    const headings = rendered.metadata?.headings ?? [];
    const idsInBaseline = [...(expected ?? '').matchAll(/<h[23] id="([^"]+)"/g)].map((m) => m[1]);
    results.push({
      locale,
      slug,
      same,
      headings: headings.length,
      headingIdsMatch: JSON.stringify(headings.filter((h) => h.depth <= 3).map((h) => h.slug)) === JSON.stringify(idsInBaseline),
    });
  }
}

const probe = async (md) => (await renderer.render(md, { frontmatter: {} })).code;
const safety = {
  blockquote: /<blockquote>/.test(await probe('> Una nota editorial.')),
  table: /<table>[\s\S]*<th>/.test(await probe('| A | B |\n| - | - |\n| 1 | 2 |')),
  headingId: /<h2 id="lote-y-fecha">/.test(await probe('## Lote y fecha')),
  // Raw HTML: the processor PASSES IT THROUGH. This is why the Core's grammar
  // (D-3) refuses HTML at write time instead of trusting the renderer.
  rawHtmlPassesThrough: /<script\b/i.test(await probe('<script>alert(1)</script>')),
};

if (results.length !== 16) {
  console.error(`expected the 16 platform articles, rendered ${results.length}`);
  process.exit(1);
}
const failed = results.filter((r) => !r.same || !r.headingIdsMatch);
const summary = { posts: results.length, identical: results.length - failed.length, failed, safety };
console.log(JSON.stringify(process.argv.includes('--json') ? { results, ...summary } : summary, null, 2));
process.exit(failed.length === 0 && safety.blockquote && safety.table && safety.headingId ? 0 : 1);
