import { expect, test } from '@playwright/test'

const screens = [
  { name: 'clinic-home-1440', path: '/', width: 1440, height: 900, status: 200 },
  { name: 'clinic-home-390', path: '/', width: 390, height: 844, status: 200 },
  { name: 'clinic-404-1440', path: '/pricing/', width: 1440, height: 900, status: 404 },
  { name: 'clinic-404-390', path: '/pricing/', width: 390, height: 844, status: 404 },
] as const

for (const screen of screens) {
  test(screen.name, async ({ page }) => {
    await page.setViewportSize({ width: screen.width, height: screen.height })
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const response = await page.goto(screen.path, { waitUntil: 'networkidle' })
    expect(response?.status(), `${screen.path} must exercise its real HTTP status`).toBe(
      screen.status,
    )
    await page.evaluate(() => document.fonts.ready)

    if (screen.status === 200) {
      await expect(page.locator('[data-home-template="service-lead"]')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Agendar una demostración' }).first()).toBeVisible()
      await expect(page.locator('body')).not.toContainText('One platform. Every solution.')
      await expect(page).toHaveURL('http://clinicas.1platform.dev/')
    } else {
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Esta página no existe')
      await expect(page.locator('main')).not.toContainText('Probá por acá')
    }

    await expect(page).toHaveScreenshot(`${screen.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })
}
