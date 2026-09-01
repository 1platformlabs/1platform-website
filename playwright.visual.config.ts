import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const baseURL = `http://localhost:${port}`;

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
    baseURL,
  },
  webServer: {
    command: `npm run build && npx vite preview --host 0.0.0.0 --port ${port}`,
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
