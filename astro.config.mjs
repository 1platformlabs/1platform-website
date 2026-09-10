// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { movedEsPaths } from './src/i18n/routes.ts';

export default defineConfig({
  site: 'https://1platform.pro',
  trailingSlash: 'always',

  // A long-lived server, because a tenant is resolved per request and cannot be
  // known at build time. This is the ONE thing F1 changes: where the content
  // comes from does not move until F4. If the served HTML differs from the
  // frozen baseline, the conversion is the only thing that can have caused it —
  // which is what makes the no-regression of 1platform.pro attributable, and
  // therefore checkable at all.
  //
  // `standalone` gives us a Node process that listens on its own. nginx stays in
  // front of it and keeps the serving contract (see deploy/docker/nginx.conf);
  // the adapter is not asked to reimplement it.
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  // English stays at the root because its ~26 URLs are already indexed; Spanish
  // lives under /es/. Note that this block does NOT generate the Spanish tree —
  // it only supplies `Astro.currentLocale` and the `astro:i18n` helpers. Every
  // /es/ route exists because a file declares it.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  // `@astrojs/sitemap` is gone, and its replacement is `src/pages/sitemap-0.xml.ts`.
  //
  // It is a BUILD-time integration that enumerates the route table, and neither
  // half survives this epic: under one build serving N brands the page set is a
  // property of the tenant asking, and the moment the blog routes became
  // dynamic the integration dropped all sixteen of them — measured, 52 `<loc>`
  // to 36, with the build printing success and exiting 0.
  //
  // The `serialize()` hook that used to live here rebuilt the hreflang pairing
  // from the route map, because the integration pairs two URLs by string
  // equality of the path minus its locale prefix, so a TRANSLATED slug matched
  // nothing and it emitted no pair for EITHER side. That logic moved to
  // `src/lib/site-routes.ts`, where the same reasoning is written out again.
  integrations: [],

  // `/why-1platform/` is a legacy English URL that really was published. There
  // is no Spanish equivalent to retire, and adding one out of symmetry was a
  // mistake: Astro's redirect stub has no <html> element at all — so no `lang`
  // — and its visible fallback text is hardcoded English, which put English
  // chrome on a nominally Spanish URL for anyone with meta-refresh disabled or
  // a slow connection. Redirecting a URL that never existed bought nothing and
  // cost the only Spanish-caused accessibility defect in the build.
  /**
   * Retired URLs. Every one of these was indexable and is in the live sitemap,
   * so none of them may start answering 404 — Astro emits a stub per entry
   * (meta-refresh + `noindex` + a canonical at the target), which is also what
   * keeps `i18n-build.spec.ts` honest: it asserts the English tree never loses
   * a path, and asserts every English path has a Spanish twin. Both locales are
   * therefore listed for every retirement, deliberately.
   */
  redirects: {
    '/why-1platform/': '/for-developers/',

    // A smaller duplicate of /solutions/, linked from no page body.
    '/features/': '/solutions/',
    '/es/features/': '/es/soluciones/',

    // A closed island: these three linked only to each other, and argued the
    // content-tooling positioning the site no longer holds.
    '/compare/1platform-vs-ai-writing-tools/': '/solutions/',
    '/compare/1platform-vs-custom-integration/': '/solutions/',
    '/compare/1platform-vs-wp-auto-pro/': '/solutions/',
    '/es/compare/1platform-vs-ai-writing-tools/': '/es/soluciones/',
    '/es/compare/1platform-vs-custom-integration/': '/es/soluciones/',
    '/es/compare/1platform-vs-wp-auto-pro/': '/es/soluciones/',

    // Three of its four cards were `/solutions/content/` said again: AI
    // content, CMS publishing and "built for SEO" (keywords + indexing + link
    // building). The only claim it owned alone was the custom domain, and the
    // comparison row selling it was already on `/solutions/online-store/`,
    // identical on both sides. The domain moved to the target instead.
    '/solutions/website/': '/solutions/content/',
    '/es/solutions/website/': '/es/soluciones/sitio-web-y-contenido/',

    // Twelve pages holding one or two posts each and no prose of their own.
    '/blog/category/ai-content/': '/blog/',
    '/blog/category/api-tutorials/': '/blog/',
    '/blog/category/ecommerce/': '/blog/',
    '/blog/category/payments-invoicing/': '/blog/',
    '/blog/category/product-updates/': '/blog/',
    '/blog/category/seo-automation/': '/blog/',
    '/es/blog/category/ai-content/': '/es/blog/',
    '/es/blog/category/api-tutorials/': '/es/blog/',
    '/es/blog/category/ecommerce/': '/es/blog/',
    '/es/blog/category/payments-invoicing/': '/es/blog/',
    '/es/blog/category/product-updates/': '/es/blog/',
    '/es/blog/category/seo-automation/': '/es/blog/',

    /**
     * Every Spanish URL whose slug was translated, derived from the route map
     * rather than written out again — a hand-kept second list is how one of
     * twenty-three moves quietly starts answering 404.
     *
     * These are MOVES, not retirements: the address changed, the page did not.
     * `deploy/cpanel/htaccess/landing.htaccess` carries a real 301 for each,
     * which is the signal Google actually follows; the stub Astro emits here
     * is the belt to that pair of braces, so a rule that fails to match on the
     * host still lands the reader on the right page instead of a 404.
     */
    ...movedEsPaths(),
  },
});
