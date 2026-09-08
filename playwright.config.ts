import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const baseURL = `http://localhost:${port}`;

/**
 * Tests run against the real server, the one that ships.
 *
 * That is the point rather than a convenience: the artefact under test is the
 * process production runs, so every assertion measures the thing that ships
 * instead of a simulation of it.
 *
 * This used to be `vite preview` over a static `dist/`, and the sentence above
 * used to say "byte-for-byte the one that gets rsynced". Both stopped being
 * true when the site gained a Node adapter: the build now emits `dist/client`
 * and `dist/server`, so `vite preview` would have served a directory that is no
 * longer the site. The suite was rewritten to drive the adapter rather than
 * relaxed — the subject moved, so the harness moved with it, and what it
 * measures is strictly MORE real than before, because redirects, 404s and the
 * image endpoint are now answered by the same code path production uses.
 *
 * `reuseExistingServer` is off in CI, which is the only place the answer has to
 * be trustworthy: a stale process left over from an earlier build is the classic
 * way a suite goes green against code that no longer exists. Locally it is on,
 * because a single spec file is often run on its own several times in a row and
 * rebuilding the whole site for each of them is a minute of nothing. The local
 * risk is real and the mitigation is boring: if you changed anything under
 * `src/`, kill the server before re-running.
 */
export default defineConfig({
  testDir: './tests',
  // The visual baseline compares Linux renders and runs through the
  // Playwright container (`npm run test:visual`) — a macOS render against it
  // fails on text shaping alone, so it is not part of the default run.
  testIgnore: 'tests/visual/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'retain-on-failure',
  },

  webServer: {
    // The adapter's standalone entry point, which is exactly what the container
    // runs behind nginx. It stays in the foreground as Playwright's owned child,
    // so there is no detached process to leak between runs.
    command: `npm run build && node dist/server/entry.mjs`,
    env: {
      HOST: '127.0.0.1',
      PORT: String(port),
      // The manifest comes from the repository here, EXPLICITLY. A browser test
      // drives `Host: localhost`, which is not a routable domain and resolves to
      // no tenant, and CI has no API to ask — so without this the readiness
      // probe gets a 404 and the whole suite waits out the timeout. Production
      // sets nothing and therefore reads the API.
      SITE_MANIFEST_SOURCE: 'repo',
    },
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
