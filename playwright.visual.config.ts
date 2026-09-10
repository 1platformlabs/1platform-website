import { defineConfig, devices } from '@playwright/test';

const platformPort = Number(process.env.PLAYWRIGHT_PLATFORM_PORT ?? 4321);
const clinicPort = Number(process.env.PLAYWRIGHT_CLINIC_PORT ?? 4322);
const apiPort = Number(process.env.PLAYWRIGHT_STUB_API_PORT ?? 4397);
const readyPort = Number(process.env.PLAYWRIGHT_VISUAL_READY_PORT ?? 4398);
const platformBaseURL = `http://localhost:${platformPort}`;
const clinicHost = 'clinicas.1platform.dev';

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
  webServer: {
    // One build, then two copies of the actual Node adapter: the platform in
    // repo mode and the clinic in API mode against the contractual HTTP stub.
    // The helper exposes /ready only after both rendered roots answer, so a
    // green clinic screenshot cannot be a race against a server that never ran.
    command: `npm run build && node tests/visual/support/serve.mjs`,
    env: {
      PLAYWRIGHT_PLATFORM_PORT: String(platformPort),
      PLAYWRIGHT_CLINIC_PORT: String(clinicPort),
      PLAYWRIGHT_STUB_API_PORT: String(apiPort),
      PLAYWRIGHT_VISUAL_READY_PORT: String(readyPort),
    },
    url: `http://127.0.0.1:${readyPort}/ready`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [
    {
      // Keep the historical project name so the four real platform baselines
      // retain their filenames and are compared rather than regenerated.
      name: 'chromium',
      testMatch: 'home.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: platformBaseURL },
    },
    {
      name: 'clinic-chromium',
      testMatch: 'clinic.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Chromium supplies the real Host header. page.goto/fetch cannot fake
        // it reliably, and Host is the tenant-isolation boundary.
        baseURL: `http://${clinicHost}/`,
        launchOptions: {
          args: [
            `--host-resolver-rules=MAP ${clinicHost}:80 127.0.0.1:${clinicPort}`,
          ],
        },
      },
    },
  ],
});
