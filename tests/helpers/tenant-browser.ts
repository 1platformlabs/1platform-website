import { chromium, type Browser, type Page } from '@playwright/test'

/**
 * A real browser, resolving an arbitrary tenant host to this server.
 *
 * WHY NOT THE `page` FIXTURE
 * --------------------------
 * Playwright's own `page` fixture navigates against `baseURL`
 * (`http://localhost:<port>`), so every request carries `Host: localhost` —
 * which the repo manifest maps to tenant #1 only (`src/data/site-tenants.ts`).
 * There is no way to override that from inside a page: `Host` is a forbidden
 * header for both `fetch` and Playwright's `extraHTTPHeaders` — measured,
 * `extraHTTPHeaders: { Host: '...' }` throws `net::ERR_INVALID_ARGUMENT`
 * rather than silently doing nothing, but the effect for a caller who did not
 * expect that is the same: no way through.
 *
 * WHY THIS WORKS
 * --------------
 * `--host-resolver-rules` is a Chromium flag that rewrites DNS resolution
 * inside the browser process, before any header is built. Navigating to
 * `http://<tenant-domain>:<port>/` then sends the REAL domain as `Host` — this
 * is not a workaround that fakes the header, it is the same mechanism a
 * `/etc/hosts` entry uses, scoped to one browser instance so it never touches
 * the machine running the suite. Verified against this server: a page
 * navigated this way to `clinicas.1platform.dev` receives the clinic tenant's
 * HTML, not the platform's.
 *
 * A computed style can only be read from a live document — the served HTML is
 * text, and a custom property inside it (`var(--color-accent)`) has no
 * resolved value until a browser lays out the page. Text-level assertions
 * (`tests/helpers/served.ts`) cannot tell a renamed token from a changed one;
 * this is what can.
 */
export async function openTenantPage(
  host: string,
  path: string,
): Promise<{ browser: Browser; page: Page }> {
  const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321)
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${host} 127.0.0.1`],
  })
  const page = await browser.newPage()
  const res = await page.goto(`http://${host}:${port}${path}`, { waitUntil: 'load' })
  if (!res || res.status() !== 200) {
    await browser.close()
    throw new Error(`expected 200 for ${host}${path}, got ${res?.status() ?? 'no response'}`)
  }
  return { browser, page }
}

/** The resolved value of a CSS custom property, read where a browser actually applies it. */
export async function computedProperty(page: Page, selector: string, property: string): Promise<string | null> {
  return page.locator(selector).first().evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
    property,
  )
}
