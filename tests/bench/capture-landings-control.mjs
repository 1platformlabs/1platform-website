/** Capture origin/main BEFORE activating this epic's content/theme overlay.
 * Real services only; no interception. See the monorepo /verify-epic-e2e.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const output = process.env.WEBSITE_E2E_EVIDENCE;
if (!output) throw new Error('Set WEBSITE_E2E_EVIDENCE to this private bank evidence directory');
const port = Number(process.env.WEBSITE_E2E_CONTROL_PORT || 4521);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP 1platform.pro 127.0.0.1, MAP medipago.gt 127.0.0.1'] });
const data = {};
try {
  for (const [host, path, id] of [
    ['1platform.pro', '/', 'main-oneplatform'],
    ['medipago.gt', '/', 'main-medipago'],
    ['1platform.pro', '/pricing/', 'pricing'],
    ['1platform.pro', '/es/soluciones/', 'solutions-es'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const response = await page.goto(`http://${host}:${port}${path}`);
    if (response?.status() !== 200) throw new Error(`${id}: control must render a real page`);
    await page.evaluate(() => document.fonts.ready);
    data[id] = { status: response.status(), title: await page.locator('h1').innerText(), text: await page.locator('main').innerText() };
    if (await page.locator('[data-infrastructure-home]').count()) throw new Error('Control already contains this epic’s infrastructure composition');
    await page.screenshot({ path: join(output, `control-${id}.png`), animations: 'disabled' });
    await page.close();
  }
  writeFileSync(join(output, 'control-render.json'), JSON.stringify(data, null, 2));
  console.log('Four origin/main render controls captured from its real API before activation');
} finally { await browser.close(); }
