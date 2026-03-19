// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://1platform.pro',
  trailingSlash: 'always',
  integrations: [sitemap()],

});
