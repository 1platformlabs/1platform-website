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
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en-US', es: 'es-ES' },
      },
    }),
  ],

  redirects: {
    '/why-1platform/': '/for-developers/',
    '/es/why-1platform/': '/es/for-developers/',
  },
});
