import { expect, test } from '@playwright/test'

// The photographic commerce landing with Delivery, the online-store and email
// cards, the named advertising channel, the sales route and the visitor-rate
// calculator — every optional block `tests/fixtures/vendefacil-site.json` turns on.
const screens = [
  { name: 'commerce-home-1440', width: 1440, height: 900 },
  { name: 'commerce-home-390', width: 390, height: 844 },
  { name: 'commerce-home-844', width: 844, height: 390 },
] as const

for (const screen of screens) {
  test(screen.name, async ({ page }) => {
    await page.setViewportSize({ width: screen.width, height: screen.height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const response = await page.goto('/', { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    await expect(page.locator('body')).toHaveAttribute('data-enhanced', 'true')
    await page.evaluate(() => document.fonts.ready)
    // Delivery, store, email and advertising (the store and email cards arrived
    // with the uniform-services fixture, 1platform-website#142).
    await expect(page.locator('.business-card')).toHaveCount(4)
    // The lazy photograph must be decoded before a full-page capture.
    await page.locator('.onboarding-photo').scrollIntoViewIfNeeded()
    await expect
      .poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)))
      .toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })
}
