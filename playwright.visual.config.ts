import { defineConfig, devices } from '@playwright/test';

/**
 * The visual gate's own config: same server, same browser, but WITHOUT the
 * default config's `testIgnore` on tests/visual (that ignore is what keeps
 * the platform-dependent comparison out of `npm test`; this file is how the
 * container runs it).
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'npm run build && npx astro preview --port 4321 --host',
    url: 'http://localhost:4321/',
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
