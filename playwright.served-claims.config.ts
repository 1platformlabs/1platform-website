import { defineConfig } from '@playwright/test';

/**
 * The scheduled production scan of rules 3 and 4 (issue #101).
 *
 * No `webServer`: the subject is what production serves, not this checkout's
 * build. Run ONLY by `.github/workflows/served-claims.yml` (daily and after
 * each production deploy) — never as a PR check, because it measures live
 * data a PR does not change: a price a tenant publishes must not turn an
 * unrelated PR red.
 *
 *   SERVED_CLAIMS_TARGET=prod npx playwright test -c playwright.served-claims.config.ts
 */
export default defineConfig({
  testDir: './tests',
  testMatch: 'no-fabricated-claims-served.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: process.env.CI ? 'github' : 'list',
});
