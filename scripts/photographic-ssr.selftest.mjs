// Adapter render with in-memory HTTP doubles: no socket, browser or real API/DB.
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { after, test } from 'node:test';
import { translateToEs } from '../src/i18n/routes.ts';
import { loadPreviewSites, previewResponse } from './preview-landings.mjs';
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
process.env.SITE_MANIFEST_SOURCE = 'api';
process.env.SITE_API_BASE_URL = 'https://contract.invalid';
const sites = loadPreviewSites();
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? input.toString());
  assert.equal(url.origin, 'https://contract.invalid', 'Unexpected external request');
  const result = previewResponse(url, sites);
  return Response.json(result.body, { status: result.status });
};
const { handler } = await import('../dist/server/entry.mjs');
async function render(host, path = '/') {
  const req = Readable.from([]);
  Object.assign(req, { url: path, method: 'GET', headers: { host }, socket: Object.assign(new EventEmitter(), { encrypted: false, remoteAddress: '127.0.0.1' }) });
  const chunks = [];
  const headers = new Map();
  const res = new Writable({ write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
  Object.assign(res, {
    req, statusCode: 200,
    setHeader(key, value) { headers.set(key.toLowerCase(), value); return this; },
    getHeader(key) { return headers.get(key.toLowerCase()); },
    removeHeader(key) { headers.delete(key.toLowerCase()); },
    getHeaders() { return Object.fromEntries(headers); },
    writeHead(status, values) {
      this.statusCode = status;
      for (const [key, value] of Object.entries(values ?? {})) { this.setHeader(key, value); }
      this.headersSent = true;
      return this;
    },
  });
  const done = new Promise((resolve, reject) => { res.on('finish', resolve); res.on('error', reject); });
  handler(req, res);
  await done;
  return { status: res.statusCode, html: Buffer.concat(chunks).toString(), headers };
}

const stableLinks = [
  '/solutions/online-store/', '/solutions/content/', '/solutions/deliveries/',
  '/solutions/ads/', '/solutions/whitelabel/', '/payments-invoicing/', '/for-agencies/',
  '/for-developers/', '/solutions/', '/blog/', '/changelog/', '/about/', '/pricing/',
  '/terms/', '/privacy/', '/cookies/',
];
for (const [path, title] of [['/', 'Infrastructure for'], ['/es/', 'Infraestructura para']]) {
  test(`1Platform ${path}: real infrastructure SSR, metadata, navigation and preserved routes`, async () => {
    const { status, html } = await render('1platform.pro', path);
    assert.equal(status, 200);
    assert.match(html, /data-infrastructure-home/);
    assert.ok(html.includes(title));
    assert.doesNotMatch(html, /Medipago|4\.9%|id="price-calculator"|data-panel-money|hero-motion-toggle|Para médicos especialistas/);
    assert.match(html, /href="https:\/\/wa\.me\/50253946564"/);
    assert.match(html, /href="https:\/\/developer\.1platform\.pro\/docs\/saas\/1platform-api\/getting-started\/?"/);
    assert.match(html, /hreflang="x-default" href="https:\/\/1platform\.pro\/"/);
    assert.match(html, /property="og:locale:alternate"/);
    assert.match(html, /rel="sitemap" href="\/sitemap-index.xml"/);
    assert.match(html, /type="application\/rss\+xml"/);
    assert.match(html, /--site-navy:#0d1c3a/);
    const footer = html.match(/<footer[\s>][\s\S]*?<\/footer>/)?.[0] ?? '';
    const links = [...footer.matchAll(/href="([^"#]*)"/g)].map((match) => match[1]);
    for (const link of ['/blog/', '/terms/', '/privacy/', '/cookies/']) {
      assert.ok(links.includes(path === '/' ? link : translateToEs(link)), `Footer lost ${link}`);
    }
    assert.ok(links.includes('https://developer.1platform.pro/api-reference/1platform-api'));
    // The former extensive footer is replaced by the approved navigation; its
    // published destinations stay available and developer aliases redirect.
    for (const link of stableLinks) {
      const result = await render('1platform.pro', path === '/' ? link : translateToEs(link));
      assert.equal(result.status, link === '/for-developers/' ? 301 : 200, `Published route lost ${link}`);
    }
  });
}

test('Medipago retains its SSR calculation, configured support and single-language surface', async () => {
  const { status, html } = await render('medipago.gt');
  assert.equal(status, 200);
  assert.match(html, /Cobre con tarjeta/);
  assert.match(html, /id="calc-net">Q\s*95\.10/);
  assert.match(html, /id="calc-fee">Q\s*4\.90/);
  assert.match(html, /id="price-calculator"/);
  assert.match(html, /data-panel-mode="collections"/);
  assert.match(html, /data-panel-money="collected">Q\s*480\.00/);
  assert.match(html, /data-panel-money="withdraw">Q\s*0\.00/);
  assert.match(html, /antes de comisiones/);
  assert.match(html, /ficticios/);
  assert.match(html, /href="https:\/\/wa\.me\/50244866448\?text=/);
  assert.doesNotMatch(html, /pricing-card|hreflang="en"|application\/rss\+xml|hero-motion-toggle|Para médicos especialistas/);
});

test('secondary pages retain the shared infrastructure chrome and unavailable tenants fail closed', async () => {
  const { status, html } = await render('1platform.pro', '/about/');
  assert.equal(status, 200);
  assert.match(html, /class="brand-header"/);
  assert.doesNotMatch(html, /data-infrastructure-home/);
  assert.equal((await render('unknown.example')).status, 404);
});
