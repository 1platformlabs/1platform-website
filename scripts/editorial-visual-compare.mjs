#!/usr/bin/env node
/**
 * Side-by-side capture of the editorial PRODUCT against the approved PROTOTYPE
 * at 390, 768 and 1440 px (blog-sitio-de-marca-generado §23, BSM-07).
 *
 * Prepared for `/verify-epic-e2e`, which runs it against the isolated bench (real
 * API, real Mongo, seeded `peptidos`). It does not judge: it writes the pairs,
 * plus a JSON with horizontal overflow and the computed body/reading font sizes
 * per screen, so a person compares with evidence instead of memory.
 *
 * Usage:
 *   node scripts/editorial-visual-compare.mjs \
 *     --site http://127.0.0.1:<port> --host peptidos.localhost \
 *     --prototype http://127.0.0.1:4467 --out <dir>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const site = arg('site');
const host = arg('host', 'peptidos.localhost');
const prototype = arg('prototype', 'http://127.0.0.1:4467');
const out = arg('out', 'test-results/editorial-visual');
if (!site) {
  console.error('usage: --site <url> [--host h] [--prototype url] [--out dir]');
  process.exit(2);
}

const SCREENS = [
  { name: 'portada', product: '/', proto: '/index.html' },
  { name: 'biblioteca', product: '/blog/', proto: '/categoria.html' },
  { name: 'categoria-vacia', product: '/blog/?category=preguntas&q=zzzz', proto: '/categoria.html?tema=calidad&estado=vacio' },
  { name: 'articulo', product: '/blog/numero-lote/', proto: '/articulo-numero-lote.html' },
];
const WIDTHS = [390, 768, 1440];

const productOrigin = (() => {
  const u = new URL(site);
  u.hostname = host;
  return u.origin;
})();
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const width of WIDTHS) {
  for (const screen of SCREENS) {
    for (const side of ['product', 'proto']) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      // The site resolves the tenant from Host. Chromium does not let a script
      // override Host (route.continue drops it) and the site does not trust a
      // client-sent x-forwarded-host, so both left every product capture on the
      // 404 page. Navigate to the tenant host itself: `*.localhost` resolves to
      // loopback in Chromium without touching /etc/hosts.
      const url = side === 'product' ? `${productOrigin}${screen.product}` : `${prototype}${screen.proto}`;
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // Cards load their art lazily: a full-page capture without scrolling shows
      // blank boxes that look like a defect. Walk the page so they load.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.waitForLoadState('networkidle');
      const metrics = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        body: getComputedStyle(document.body).fontSize,
        prose: (() => {
          const p = document.querySelector('.prose p');
          return p ? getComputedStyle(p).fontSize : null;
        })(),
      }));
      const file = join(out, `${screen.name}-${width}-${side}.png`);
      await page.screenshot({ path: file, fullPage: true });
      report.push({ screen: screen.name, width, side, status: response?.status() ?? null, ...metrics, file });
      await context.close();
    }
  }
}
await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
const overflow = report.filter((r) => r.overflowX > 0);
console.log(`${report.length} captures in ${out}; ${overflow.length} with horizontal overflow`);
// A capture of an error page measures nothing: an overflow of 0 on a 404 is a
// false green. Every product screen must have rendered (HTTP 200).
const notRendered = report.filter((r) => r.side === 'product' && r.status !== 200);
for (const r of notRendered) console.error(`NOT RENDERED ${r.screen}@${r.width}: HTTP ${r.status}`);
process.exit(notRendered.length || overflow.some((r) => r.side === 'product') ? 1 : 0);
