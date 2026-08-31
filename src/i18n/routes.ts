/**
 * Translated Spanish URLs — the single source of truth for the difference
 * between the two trees.
 *
 * Until now both carried the same slug: `/solutions/deliveries/` and
 * `/es/solutions/deliveries/`. That is convenient to build and bad to read.
 * The slug is the one part of a page a searcher sees *before* clicking and the
 * one part that survives in the result, the share and the address bar, so a
 * Spanish tree spelling `deliveries` was publishing English there for free.
 *
 * Keys are the canonical (English-rooted) path; values are the FULL Spanish
 * path, prefix included. Every URL the site emits — the `l()` helper in each
 * link, the hreflang block, the language switcher, the auto-detect script, the
 * sitemap's alternates and the redirect stubs — resolves through this map, so
 * a route is translated once and the rest follows.
 *
 * ── This module imports NOTHING, deliberately ──────────────────────────────
 * `astro.config.mjs` imports it to derive both the redirect table and the
 * sitemap's language pairing. The config is loaded before path aliases exist,
 * so a single `@i18n/…` import here would break the build with an error that
 * names the config rather than this file.
 *
 * ── Three rules the map obeys, and the reasons ─────────────────────────────
 *
 * 1. **An absent path keeps its slug.** `/blog/` and `/cookies/` are not here
 *    on purpose: both are the words a Spanish speaker actually searches, and
 *    `/blog/` is one of the most linked addresses on the site. Translating a
 *    word nobody translates spends signal and buys nothing.
 *
 * 2. **Matching is exact first, then longest directory prefix.** That carries
 *    `/changelog/feed.xml` to `/es/novedades/feed.xml` without a second entry,
 *    and lands a future `/solutions/<new>/` under `/es/soluciones/` instead of
 *    silently re-publishing an English segment. The prefix only matches on a
 *    `/` boundary, so `/solutions-hub/` can never be rewritten by
 *    `/solutions/`.
 *
 * 3. **Blog posts ARE listed, even though their slug already comes from the
 *    Spanish filename.** `entryAlternates` pairs the two languages by
 *    `translationKey` and hands each entry its own slug, so the page's own
 *    hreflang would work with this map empty — but `@astrojs/sitemap` cannot
 *    see any of that. It pairs languages by literal string equality of the
 *    path with the locale prefix removed (`parse-i18n-url.js`), so the moment
 *    the slugs differ it emits NO `<xhtml:link rel="alternate">` for either
 *    side. Listing the pairs here is what lets the config rebuild them.
 *    `tests/i18n-routes.spec.ts` asserts these entries agree with the
 *    `translationKey` pairing, so the second copy cannot drift from the first.
 */
export const ES_PATHS: Readonly<Record<string, string>> = {
  // — Pages ————————————————————————————————————————————————————————————
  '/about/': '/es/nosotros/',
  '/contact/': '/es/contacto/',
  '/pricing/': '/es/precios/',
  '/privacy/': '/es/privacidad/',
  '/terms/': '/es/terminos/',
  '/changelog/': '/es/novedades/',
  '/for-agencies/': '/es/para-agencias/',
  '/for-developers/': '/es/para-desarrolladores/',
  '/payments-invoicing/': '/es/pagos-y-facturacion/',
  '/solutions/': '/es/soluciones/',
  '/solutions/online-store/': '/es/soluciones/tienda-online/',
  '/solutions/deliveries/': '/es/soluciones/envios/',
  '/solutions/ads/': '/es/soluciones/publicidad/',
  '/solutions/whitelabel/': '/es/soluciones/marca-blanca/',
  '/solutions/content/': '/es/soluciones/sitio-web-y-contenido/',

  // — Blog posts, paired by `translationKey` in the collection ——————————
  '/blog/1platform-vs-custom-toolchain/': '/es/blog/1platform-vs-herramientas-seo-propias/',
  '/blog/ai-content-best-practices/': '/es/blog/contenido-con-ia-buenas-practicas-seo/',
  '/blog/automate-seo-pipeline/': '/es/blog/automatizar-el-pipeline-de-seo/',
  '/blog/electronic-invoicing-online-business/':
    '/es/blog/facturacion-electronica-para-negocios-online/',
  '/blog/getting-started-5-minutes/': '/es/blog/primeros-pasos-en-5-minutos/',
  '/blog/integrating-payments-into-your-saas/': '/es/blog/integrar-pagos-en-tu-saas/',
  '/blog/launch-online-store-30-minutes/': '/es/blog/lanzar-una-tienda-online-en-30-minutos/',
  '/blog/programmatic-link-building/': '/es/blog/link-building-programatico/',
};

/**
 * The same map read backwards.
 *
 * Built at module load, and it throws on a collision rather than letting the
 * last writer win: two canonical paths translated to one Spanish address would
 * make the reverse lookup answer differently depending on key order, and the
 * symptom would be an hreflang pointing at the wrong English page — silent,
 * and wrong in the one direction nobody checks.
 */
const CANONICAL_BY_ES: Record<string, string> = {};
for (const [canonical, translated] of Object.entries(ES_PATHS)) {
  if (Object.hasOwn(CANONICAL_BY_ES, translated)) {
    throw new Error(
      `[i18n] two canonical paths translate to "${translated}": ` +
        `${CANONICAL_BY_ES[translated]} and ${canonical}. Each Spanish path belongs to one.`,
    );
  }
  CANONICAL_BY_ES[translated] = canonical;
}

/** Longest key of `table` that `path` sits under, on a `/` boundary. */
function longestPrefix(table: Record<string, string>, path: string): string | null {
  let best: string | null = null;
  for (const key of Object.keys(table)) {
    if (!key.endsWith('/') || !path.startsWith(key)) continue;
    if (best === null || key.length > best.length) best = key;
  }
  return best;
}

/** Canonical path → the Spanish address it is published at. */
export function translateToEs(canonical: string): string {
  const exact = ES_PATHS[canonical];
  if (exact) return exact;

  const prefix = longestPrefix(ES_PATHS, canonical);
  if (prefix) return ES_PATHS[prefix] + canonical.slice(prefix.length);

  return canonical === '/' ? '/es/' : `/es${canonical}`;
}

/** Spanish address → the canonical path it translates. */
export function translateFromEs(spanish: string): string {
  const exact = CANONICAL_BY_ES[spanish];
  if (exact) return exact;

  const prefix = longestPrefix(CANONICAL_BY_ES, spanish);
  if (prefix) return CANONICAL_BY_ES[prefix] + spanish.slice(prefix.length);

  if (spanish === '/es' || spanish === '/es/') return '/';
  return spanish.startsWith('/es/') ? spanish.slice(3) : spanish;
}

/**
 * Every Spanish URL that moved, as `old address → new address`.
 *
 * Derived rather than written out a second time: a hand-kept list is how one
 * of twenty-three moves quietly starts answering 404. `astro.config.mjs` turns
 * this into a redirect stub at each old address, and the `.htaccess` guard
 * test checks the serving contract carries a real 301 for every one of them.
 */
export function movedEsPaths(): Record<string, string> {
  const moved: Record<string, string> = {};
  for (const [canonical, translated] of Object.entries(ES_PATHS)) {
    moved[`/es${canonical}`] = translated;
  }
  return moved;
}
