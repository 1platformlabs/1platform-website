// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://1platform.pro',
  trailingSlash: 'always',

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

  integrations: [
    sitemap({
      // `locales` is a RECORD, not an array, and the schema is `.strict()`.
      // Pass an array — or one key too many — and @astrojs/sitemap catches its
      // own validation error, logs a warning, and emits nothing: the build goes
      // green with no sitemap at all. A test asserts the file exists for exactly
      // this reason.
      // Bare language tags, matching the <head> block exactly. Regional tags
      // would say two different things in two channels: `en-US` narrows the
      // root to American English while the head declares it x-default for all
      // English, and `es-ES` targets Spain — the one Spanish-speaking market
      // this product does not serve (payments and FEL invoicing are Guatemala).
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es' },
      },
    }),
  ],

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
    '/es/features/': '/es/solutions/',

    // A closed island: these three linked only to each other, and argued the
    // content-tooling positioning the site no longer holds.
    '/compare/1platform-vs-ai-writing-tools/': '/solutions/',
    '/compare/1platform-vs-custom-integration/': '/solutions/',
    '/compare/1platform-vs-wp-auto-pro/': '/solutions/',
    '/es/compare/1platform-vs-ai-writing-tools/': '/es/solutions/',
    '/es/compare/1platform-vs-custom-integration/': '/es/solutions/',
    '/es/compare/1platform-vs-wp-auto-pro/': '/es/solutions/',

    // Three of its four cards were `/solutions/content/` said again: AI
    // content, CMS publishing and "built for SEO" (keywords + indexing + link
    // building). The only claim it owned alone was the custom domain, and the
    // comparison row selling it was already on `/solutions/online-store/`,
    // identical on both sides. The domain moved to the target instead.
    '/solutions/website/': '/solutions/content/',
    '/es/solutions/website/': '/es/solutions/content/',

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
  },
});
