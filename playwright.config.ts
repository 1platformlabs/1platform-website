import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const baseURL = `http://localhost:${port}`;

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
    // Astro 7's preview command can hand the server to a detached process and
    // exit, which Playwright correctly treats as an early webServer failure.
    // Vite serves the same static dist/ bytes and remains the owned child.
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${port}`,
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 180_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
