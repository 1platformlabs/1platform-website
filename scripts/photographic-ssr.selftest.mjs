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
for (const [path, title] of [['/', 'Sell online.'], ['/es/', 'Venda en línea.']]) {
  test(`1Platform ${path}: real SSR composition, tenant pricing, metadata and published links`, async () => {
    const { status, html } = await render('1platform.pro', path);
    assert.equal(status, 200);
    assert.match(html, /data-home-template="photographic-service"/);
    assert.ok(html.includes(title));
    assert.match(html, /pricing-card/);
    assert.match(html, /USD/);
    assert.doesNotMatch(html, /Medipago|4\.9%|id="price-calculator"|hero-motion-toggle|Para médicos especialistas/);
    assert.match(html, /href="https:\/\/app\.1platform\.pro\/app\/"/);
    assert.match(html, /hreflang="x-default" href="https:\/\/1platform\.pro\/"/);
    assert.match(html, /property="og:locale:alternate"/);
    assert.match(html, /rel="sitemap" href="\/sitemap-index.xml"/);
    assert.match(html, /type="application\/rss\+xml"/);
    const footer = html.match(/<footer[\s>][\s\S]*?<\/footer>/)?.[0] ?? '';
    const links = [...footer.matchAll(/href="([^"#]*)"/g)].map((match) => match[1]);
    assert.ok(links.length >= 16);
    for (const link of stableLinks) assert.ok(links.includes(path === '/' ? link : translateToEs(link)), `Footer lost ${link}`);
    const credit = html.match(/data-panel-money="credit">([^<]+)/)?.[1];
    const withdrawal = html.match(/data-panel-money="withdraw">([^<]+)/)?.[1];
    assert.equal(credit?.replaceAll('\u00a0', ' '), path === '/' ? '$480.00' : '480,00 $');
    assert.equal(withdrawal?.replaceAll('\u00a0', ' '), path === '/' ? '$0.00' : '0,00 $');
  });
}

test('Medipago retains its SSR calculation, configured support and single-language surface', async () => {
  const { status, html } = await render('medipago.gt');
  assert.equal(status, 200);
  assert.match(html, /Cobre con tarjeta\./);
  assert.match(html, /id="calc-net">Q\s*95\.10/);
  assert.match(html, /id="calc-fee">Q\s*4\.90/);
  assert.match(html, /id="price-calculator"/);
  assert.match(html, /href="https:\/\/wa\.me\/50244866448\?text=/);
  assert.doesNotMatch(html, /pricing-card|hreflang="en"|application\/rss\+xml|hero-motion-toggle|Para médicos especialistas/);
});

test('secondary pages retain standard chrome and unavailable tenants fail closed', async () => {
  const { status, html } = await render('1platform.pro', '/about/');
  assert.equal(status, 200);
  assert.match(html, /site-header__rail/);
  assert.doesNotMatch(html, /data-home-template="photographic-service"/);
  assert.equal((await render('unknown.example')).status, 404);
});
