import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const baseURL = `http://localhost:${port}`;

/**
 * The visual gate's own config: same server, same browser, but WITHOUT the
 * default config's `testIgnore` on tests/visual (that ignore is what keeps
 * the platform-dependent comparison out of `npm test`; this file is how the
 * container runs it).
 *
 * The webServer used to be `vite preview` over a static `dist/`. That stopped
 * being a subject at all when the site gained a Node adapter (`output:
 * 'server'`): the build no longer prerenders any route, so `dist/` holds
 * `dist/server/entry.mjs` and `dist/client/` assets, not page HTML — `vite
 * preview` had nothing to serve. `playwright.config.ts` hit the same problem
 * for the browser suite and was rewritten to drive the adapter directly; this
 * file follows it, for the same reason: the subject the comparison needs to
 * exist has to be running.
 *
 * `SITE_MANIFEST_SOURCE: 'repo'` matters here for the identical reason it
 * matters in `playwright.config.ts`: a browser test drives `Host: localhost`,
 * which resolves to the platform's own tenant (`ONEPLATFORM`,
 * `src/data/site-tenants.ts`) only when the manifest comes from the repo. With
 * the default (`api`) and no API reachable in the container, every page would
 * 503 before a single screenshot could be taken.
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL,
  },
  webServer: {
    command: `npm run build && node dist/server/entry.mjs`,
    env: {
      HOST: '127.0.0.1',
      PORT: String(port),
      SITE_MANIFEST_SOURCE: 'repo',
    },
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
