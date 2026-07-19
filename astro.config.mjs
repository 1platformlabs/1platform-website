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
  redirects: {
    '/why-1platform/': '/for-developers/',
  },
});
