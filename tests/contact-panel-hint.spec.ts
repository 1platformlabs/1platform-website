import { expect, test } from '@playwright/test';

// #188: Astro drops the whitespace between adjacent `{…}` expressions, so the
// hint rendered «Sign in at<a>app.1platform.pro</a>and use…».
for (const [path, before, after] of [
  ['/contact/', 'Sign in at', 'and use the in-app chat'],
  ['/es/contacto/', 'Inicia sesión en', 'y usa el chat'],
] as const) {
  test(`the panel hint keeps a space on each side of the link (${path})`, async ({ page, request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(new RegExp(`${before} <a href="[^"]+"[^>]*>[^<]+</a> ${after}`));
    await page.goto(path);
    const hint = page.locator('.panel__hint');
    await expect(hint).toContainText(new RegExp(`${before} \\S+ ${after}`));
    await expect(hint).not.toContainText(/\s{2}/);
  });
}
