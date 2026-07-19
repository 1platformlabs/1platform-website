import { defineConfig, devices } from '@playwright/test';

/**
 * Tests run against the real `dist/`, served statically.
 *
 * That is the point rather than a convenience: the artefact under test is
 * byte-for-byte the one that gets rsynced to production. There is no backend,
 * no network and nothing to mock, so every assertion here measures the thing
 * that ships instead of a simulation of it.
 *
 * `reuseExistingServer` is off even locally. A stale preview process left over
 * from an earlier build is the classic way a suite goes green against code that
 * no longer exists.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run build && npx astro preview --port 4321',
    url: 'http://localhost:4321/',
    reuseExistingServer: false,
    timeout: 180_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
