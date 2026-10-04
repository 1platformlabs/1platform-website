/** Local HTTP fixtures for three configured identities; not a real API/DB bank. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadPreviewSites, previewResponse } from './preview-landings.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function previewPort(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`Invalid ${name}`);
  return value;
}
const appPort = previewPort('BRAND_PREVIEW_PORT', 4490);
const apiPort = previewPort('BRAND_PREVIEW_API_PORT', 4491);
if (appPort === apiPort) throw new Error('Brand preview needs separate app and API ports');
const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const sites = loadPreviewSites();
const vende = await readJson('../tests/fixtures/vendefacil-site.json');
sites.push({ tenant: vende.tenant, hosts: ['vendefacil.localhost'], content: new Map([['es', vende.pagesResponse]]) });
const kit = await readJson('../docs/brand-assets/tenants.json');
const bytes = new Map();
for (const entry of kit.tenants) {
  const site = sites.find(site => site.tenant.slug === entry.site_slug);
  if (!site) throw new Error(`Missing fixture: ${entry.site_slug}`);
  for (const role of ['logo', 'favicon']) {
    const original = await readFile(new URL(`../docs/brand-assets/${entry.assets[role].path}`, import.meta.url));
    if (createHash('sha256').update(original).digest('hex') !== entry.assets[role].sha256) throw new Error(`Asset checksum: ${entry.site_slug}/${role}`);
    const { data, info } = await sharp(original).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
    const sha256 = createHash('sha256').update(data).digest('hex');
    site.tenant[`brand_${role}`] = { sha256, width: info.width, height: info.height };
    bytes.set(`/api/v1/sites/${entry.site_slug}/${role}/${sha256}.png`, data);
  }
}
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const png = bytes.get(url.pathname);
  if (png) { res.writeHead(200, { 'content-type': 'image/png' }); res.end(png); return; }
  const result = previewResponse(url, sites);
  res.writeHead(result.status, { 'content-type': 'application/json' }); res.end(JSON.stringify(result.body));
});
let app;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  if (app && app.exitCode === null) app.kill('SIGTERM');
  api.close();
}
api.on('error', (error) => { console.error(error.message); stop(1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stop());
api.listen(apiPort, '127.0.0.1', () => {
  app = spawn(process.execPath, ['dist/server/entry.mjs'], { cwd: root, env: { ...process.env, HOST: '127.0.0.1', PORT: String(appPort), SITE_MANIFEST_SOURCE: 'api', SITE_API_BASE_URL: `http://127.0.0.1:${apiPort}` }, stdio: 'inherit' });
  app.once('error', (error) => { console.error(error.message); stop(1); });
  app.once('exit', (code) => stop(code ?? 1));
  console.log(`Brand fixtures: http://{1platform,medipago,vendefacil}.localhost:${appPort}/`);
});
