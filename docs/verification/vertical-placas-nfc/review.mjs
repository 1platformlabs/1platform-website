import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const phase = process.argv[2] ?? 'after';
const port = Number(process.env.PLATES_WEBSITE_PORT ?? 4421);
const api = process.env.PLATES_API_BASE ?? 'http://127.0.0.1:8110';
assert.equal(new URL(api).hostname, '127.0.0.1');
const manifest = await fetch(`${api}/api/v1/sites/by-host?host=1platform.pro`);
assert.equal(manifest.status, 200, 'the real local API must resolve the tenant');
const manifestBody = await manifest.json();
assert.equal(manifestBody.data.slug, 'oneplatform');
const out = new URL(`./${phase}/`, import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP 1platform.pro 127.0.0.1'] });
const rows = [];
try {
  for (const [locale, path, headline, cta, anchor] of [
    ['en', '/solutions/review-plates/', 'One plate on the counter', 'Order my plates', 'See how it works'],
    ['es', '/es/soluciones/placas/', 'Una placa en el mostrador', 'Pedir mis placas', 'Ver cómo funciona'],
  ]) {
    for (const width of [390, 768, 1440]) {
      for (const colorScheme of ['light', 'dark']) {
        const height = width === 390 ? 844 : 900;
        const context = await browser.newContext({ viewport: { width, height }, locale: locale === 'es' ? 'es-GT' : 'en-US', colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const response = await page.goto(`http://1platform.pro:${port}${path}`, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        await page.evaluate(() => document.fonts.ready);
        assert.match(await page.locator('h1').innerText(), new RegExp(headline));
        const order = page.getByRole('link', { name: cta, exact: true });
        assert.equal(await order.count(), 2);
        for (const link of await order.all()) assert.equal(await link.getAttribute('href'), 'https://app.1platform.pro/app/auth/login?next=%2Fmain%2Fplates%2Forders%3Fnew%3D1');
        const metrics = await page.evaluate(() => {
          const spine = document.querySelector('#how-it-works .spine');
          const last = spine.lastElementChild.getBoundingClientRect();
          const bounds = spine.getBoundingClientRect();
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, colorScheme: getComputedStyle(document.documentElement).colorScheme, columns: getComputedStyle(spine).gridTemplateColumns, unusedRight: Math.round(bounds.right - last.right), steps: spine.children.length };
        });
        assert.equal(metrics.scrollWidth, width, 'horizontal overflow');
        const id = `${locale}-${width}-${colorScheme}`;
        await page.screenshot({ path: new URL(`${id}-hero.png`, out).pathname });
        await page.screenshot({ path: new URL(`${id}-full.png`, out).pathname, fullPage: true });
        await page.locator('#how-it-works').screenshot({ path: new URL(`${id}-steps.png`, out).pathname });
        await page.keyboard.press('Tab');
        await page.getByRole('link', { name: anchor, exact: true }).focus();
        const focus = await page.evaluate(() => ({ visible: document.activeElement.matches(':focus-visible'), outline: getComputedStyle(document.activeElement).outlineStyle, width: getComputedStyle(document.activeElement).outlineWidth, shadow: getComputedStyle(document.activeElement).boxShadow }));
        assert.equal(focus.visible, true);
        assert.ok((focus.outline !== 'none' && focus.width !== '0px') || focus.shadow !== 'none');
        await page.keyboard.press('Enter');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const anchorReached = new URL(page.url()).hash === '#how-it-works';
        if (phase === 'after') assert.equal(anchorReached, true);
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        assert.deepEqual(errors, []);
        rows.push({ id, url: page.url(), viewport: { width, height }, preferredColorScheme: colorScheme, metrics, keyboard: { focus, anchor: anchorReached }, violations: accessibility.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.flatMap(node => node.target) })) });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await writeFile(new URL('review.json', out), JSON.stringify(rows, null, 2) + '\n');
}
console.log(JSON.stringify({ phase, surfaces: rows.length, violations: rows.reduce((sum, row) => sum + row.violations.length, 0) }));
