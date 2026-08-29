import { expect, test } from '@playwright/test';

/**
 * The showcase's pill follows the scroll and drives it (LMW-05 CA-4): the
 * panel on screen selects its tab, a tab click travels to its panel, and the
 * arrows move the selection. Anchors underneath, so nothing needs JS to reach
 * a panel.
 */

test('scrolling to a panel activates its tab, its entry row and its background', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-content');
  await page.waitForTimeout(600);

  const tab = page.locator('[data-tab="content"]');
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-entry="content"]')).toBeVisible();
  await expect(page.locator('[data-bg="content"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-bg="store"]')).not.toHaveClass(/is-active/);
});

test('backgrounds are downloaded on demand and each solution resolves a distinct image', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('[data-bg] img')).toHaveCount(1);
  const initialBackgroundRequests = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => /showcase-(store|payments|content|deliveries|ads)-bg/.test(name)),
  );
  expect(new Set(initialBackgroundRequests).size).toBeLessThanOrEqual(1);

  const sources = new Set<string>();
  for (const slug of ['store', 'payments', 'content', 'deliveries', 'ads']) {
    await page.locator(`#canvas-showcase-${slug}`).scrollIntoViewIfNeeded();
    const background = page.locator(`[data-bg="${slug}"]`);
    await expect(background).toHaveClass(/is-active/);
    const image = background.locator('img');
    await expect(image).toHaveJSProperty('complete', true);
    const media = await image.evaluate((element) => {
      const backgroundImage = element as HTMLImageElement;
      return {
        currentSrc: backgroundImage.currentSrc,
        naturalWidth: backgroundImage.naturalWidth,
      };
    });
    expect(media.naturalWidth).toBeGreaterThan(0);
    sources.add(media.currentSrc);
  }

  expect(sources.size).toBe(5);
  await expect(page.locator('[data-bg] img')).toHaveCount(5);
});

test('a slow stale image cannot replace a newer background request', async ({ page }) => {
  await page.route(/showcase-payments-bg/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-store');

  await page.locator('[data-tab="payments"]').click();
  await page.locator('[data-tab="content"]').click();
  await expect(page.locator('[data-bg="content"]')).toHaveClass(/is-active/);
  await page.waitForTimeout(700);
  await expect(page.locator('[data-bg="content"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-bg="payments"]')).not.toHaveClass(/is-active/);
});

test('mobile keeps every editorial focal point inside the full-viewport crop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#canvas-showcase-store');
  await page.waitForTimeout(700);

  for (const [slug, focal] of Object.entries({
    store: '32% 50%',
    payments: '30% 50%',
    content: '32% 50%',
    deliveries: '30% 50%',
    ads: '36% 50%',
  })) {
    await page.locator(`[data-tab="${slug}"]`).click();
    const background = page.locator(`[data-bg="${slug}"]`);
    await expect(background).toHaveClass(/is-active/);
    await expect(page.locator(`[data-tab="${slug}"]`)).toHaveAttribute('aria-selected', 'true');
    const image = background.locator('img');
    await expect(image).toHaveJSProperty('complete', true);
    await expect(image).toHaveCSS('object-position', focal);
  }

  const background = page.locator('[data-bg="ads"]');
  const box = await background.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBe(390);
  expect(box!.height).toBe(844);
});

test('reduced motion jumps to a tab target without a smooth-scroll detour', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#canvas-showcase-store');
  await page.locator('[data-tab="ads"]').click();

  const box = await page.locator('#canvas-showcase-ads').boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box!.y + box!.height / 2 - 844 / 2)).toBeLessThanOrEqual(2);
  await expect(page.locator('[data-tab="ads"]')).toHaveAttribute('aria-selected', 'true');
});

test('a declared placeholder can become the active background', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-store');
  await page.locator('[data-bg="payments"] template').evaluate((template) => {
    const placeholder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    placeholder.setAttribute('data-placeholder', 'showcase-payments-bg');
    template.replaceWith(placeholder);
  });

  await page.locator('[data-tab="payments"]').click();
  await expect(page.locator('[data-bg="payments"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-bg="store"]')).not.toHaveClass(/is-active/);
});

test('Back restores the panel, background and URL without creating another history entry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-store');
  await page.locator('[data-tab="ads"]').click();
  await page.locator('[data-tab="payments"]').click();
  await page.goBack();

  await expect(page).toHaveURL(/#canvas-showcase-ads$/);
  await expect(page.locator('[data-tab="ads"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-bg="ads"]')).toHaveClass(/is-active/);
  await expect
    .poll(async () => {
      const box = await page.locator('#canvas-showcase-ads').boundingBox();
      return box ? Math.abs(box.y + box.height / 2 - 900 / 2) : Number.POSITIVE_INFINITY;
    })
    .toBeLessThanOrEqual(2);
});

test('reduced motion restores a no-hash history entry without smooth scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('[data-tab="ads"]').evaluate((tab: HTMLAnchorElement) => tab.click());
  await expect(page).toHaveURL(/#canvas-showcase-ads$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect
    .poll(() => page.evaluate(() => globalThis.scrollY), {
      timeout: 250,
      intervals: [16, 32, 64],
    })
    .toBeLessThanOrEqual(1);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => globalThis.scrollY)).toBeLessThanOrEqual(1);
});

test('a tab click travels to its panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-store');
  await page.waitForTimeout(400);

  await page.locator('[data-tab="ads"]').click();
  await expect(page.locator('[data-tab="ads"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#canvas-showcase-ads$/);
  await expect
    .poll(async () => {
      const box = await page.locator('#canvas-showcase-ads').boundingBox();
      return box ? Math.abs(box.y) < 450 : false;
    }, { timeout: 5000 })
    .toBe(true);
});

test('the arrows move the selection and focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#canvas-showcase-store');
  await page.waitForTimeout(400);

  await page.locator('[data-tab="store"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-tab="payments"]')).toBeFocused();
  await expect(page.locator('[data-tab="payments"]')).toHaveAttribute('aria-selected', 'true');

  await page.locator('[data-tab="store"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-tab="ads"]')).toBeFocused();
  await expect(page.locator('[data-tab="ads"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#canvas-showcase-ads$/);
});

test('without JavaScript the tabs are anchors and every panel is on the page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('[data-showcase-panel]')).toHaveCount(5);
  await expect(page.locator('[data-tab="deliveries"]')).toHaveAttribute(
    'href',
    '#canvas-showcase-deliveries',
  );
  // The first background is server-rendered active so the section is never black.
  await expect(page.locator('[data-bg="store"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-tab][tabindex="0"]')).toHaveCount(5);
  await context.close();
});
