#!/usr/bin/env node
/** Local review with HTTP fixtures, never the private-DB E2E bank. */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoTenantForHost } from '../src/data/site-tenants.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const APP_PORT = 4460;
const API_PORT = 4461;
const byText = (a, b) => a.localeCompare(b);

export function loadPreviewSites() {
  const exported = join(ROOT, 'dist/preview-oneplatform.json');
  const result = spawnSync(process.execPath, ['scripts/export-site-content.mjs', '--out', exported], {
    cwd: ROOT, encoding: 'utf8',
  });
  if (result.error || result.status !== 0) {
    throw new Error(`No se pudo exportar el contenido de 1Platform: ${result.error?.message ?? result.stderr}`);
  }
  const content = JSON.parse(readFileSync(exported, 'utf8'));
  const platform = structuredClone(repoTenantForHost('1platform.pro'));
  if (!platform || content.tenant_slug !== platform.slug) throw new Error('El contenido no pertenece a 1Platform');
  if (JSON.stringify([...content.published_routes].sort(byText)) !== JSON.stringify([...platform.pages].sort(byText))) {
    throw new Error('Las rutas del manifest y del contenido de 1Platform no coinciden');
  }
  const platformContent = new Map(platform.locales.map((locale) => {
    const pages = content.documents.filter((page) => page.locale === locale && page.published);
    const messages = Object.assign({}, ...pages.map((page) => page.blocks));
    if (!Object.keys(messages).length) throw new Error(`Falta contenido de 1Platform en ${locale}`);
    return [locale, { success: true, data: { slug: platform.slug, locale, pages, messages }, msg: 'ok' }];
  }));
  const medipago = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/photographic-site.json'), 'utf8'));
  return [
    {
      tenant: medipago.tenant,
      hosts: ['medipago.gt', 'www.medipago.gt', 'medipago.localhost', '127.0.0.1'],
      content: new Map([[medipago.pagesResponse.data.locale, medipago.pagesResponse]]),
    },
    {
      tenant: platform,
      hosts: ['1platform.pro', 'www.1platform.pro', '1platform.localhost'],
      content: platformContent,
    },
  ];
}

/** Unknown hosts, tenants and locales fail closed, including in this preview. */
export function previewResponse(url, sites) {
  if (url.pathname === '/api/v1/sites/by-host') {
    const selected = sites.find((site) => site.hosts.includes(url.searchParams.get('host')));
    if (selected) return { status: 200, body: { success: true, data: selected.tenant, msg: 'ok' } };
  }
  const match = /^\/api\/v1\/sites\/([^/]+)\/pages$/.exec(url.pathname);
  const selected = sites.find((site) => site.tenant.slug === match?.[1]);
  const content = selected?.content.get(url.searchParams.get('locale'));
  if (content) return { status: 200, body: content };
  return { status: 404, body: { success: false, data: null, msg: 'Not found' } };
}

export function startPreview() {
  const entry = join(ROOT, 'dist/server/entry.mjs');
  if (!existsSync(entry)) throw new Error('Falta el build. Ejecute npm run build antes del preview.');
  const sites = loadPreviewSites();
  let app;
  let stopping = false;
  const api = createServer((request, response) => {
    const result = request.method === 'GET'
      ? previewResponse(new URL(request.url ?? '/', 'http://127.0.0.1'), sites)
      : { status: 405, body: { success: false, data: null, msg: 'Method not allowed' } };
    response.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(result.body));
  });
  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    if (app && app.exitCode === null) app.kill('SIGTERM');
    api.close();
  }
  api.on('error', (error) => {
    console.error(`No se puede iniciar la API fixture en 127.0.0.1:${API_PORT}: ${error.code ?? error.message}`);
    stop(1);
  });
  api.listen(API_PORT, '127.0.0.1', () => {
    app = spawn(process.execPath, [entry], {
      cwd: ROOT,
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(APP_PORT), SITE_MANIFEST_SOURCE: 'api', SITE_API_BASE_URL: `http://127.0.0.1:${API_PORT}` },
      stdio: 'inherit',
    });
    app.on('error', (error) => { console.error(error.message); stop(1); });
    app.on('exit', (code) => stop(code ?? 1));
    console.log(`Preview con fixtures HTTP; no es el banco E2E. Espere la confirmación de Astro en :${APP_PORT}.`);
    console.log(`Medipago: http://medipago.localhost:${APP_PORT}/ (también http://127.0.0.1:${APP_PORT}/)`);
    console.log(`1Platform: http://1platform.localhost:${APP_PORT}/es/ · http://1platform.localhost:${APP_PORT}/`);
  });
  process.once('SIGINT', () => stop());
  process.once('SIGTERM', () => stop());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startPreview();
