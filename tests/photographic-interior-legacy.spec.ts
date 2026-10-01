import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { repoTenantForHost } from '../src/data/site-tenants';
import { getWithHost } from './helpers/http-host';

const host = 'legacy-interiors.example';
const platform = repoTenantForHost('1platform.pro')!;
const tenant = {
  ...platform, slug: 'legacy-interiors', domain: host,
  // Its pre-profile catalogue uses the account CTA; it has no service-lead
  // support copy and must not inherit the new platform WhatsApp destination.
  destinations: { ...platform.destinations, support: null },
};
let api: Server;
let adapter: ChildProcessWithoutNullStreams;
let baseUrl = '';
let log = '';

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('No listening port'));
      resolve(address.port);
    });
  });
}

test.beforeAll(async () => {
  const out = join(process.cwd(), 'test-results/interior-legacy-content.json');
  mkdirSync(join(process.cwd(), 'test-results'), { recursive: true });
  const exported = spawnSync(process.execPath, ['scripts/export-site-content.mjs', '--out', out], { encoding: 'utf8' });
  expect(exported.status, exported.stderr).toBe(0);
  const { documents } = JSON.parse(readFileSync(out, 'utf8')) as {
    documents: { route: string; locale: string; published: boolean; blocks: Record<string, string> }[];
  };
  const pages = documents.filter((document) => document.locale === 'en' && document.published).map((document) => ({
    ...document,
    // This is the contract before the new profile: none of its messages exist.
    blocks: Object.fromEntries(Object.entries(document.blocks).filter(([key]) => !key.startsWith('interiors.') && !key.startsWith('site.'))),
  }));
  const messages = Object.assign({}, ...pages.map((page) => page.blocks));
  api = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://contract');
    response.setHeader('content-type', 'application/json');
    if (url.pathname.endsWith('/sites/by-host') && url.searchParams.get('host') === host) {
      response.end(JSON.stringify({ success: true, data: tenant, msg: 'ok' }));
    } else if (url.pathname.endsWith(`/sites/${tenant.slug}/pages`)) {
      response.end(JSON.stringify({ success: true, data: { slug: tenant.slug, locale: 'en', pages, messages }, msg: 'ok' }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ success: false, data: null, msg: 'not found' }));
    }
  });
  const apiPort = await listen(api);
  const reservation = createServer();
  const port = await listen(reservation);
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  baseUrl = `http://127.0.0.1:${port}`;
  adapter = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), SITE_MANIFEST_SOURCE: 'api', SITE_API_BASE_URL: `http://127.0.0.1:${apiPort}` },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  adapter.stdout.on('data', (chunk) => { log += String(chunk); });
  adapter.stderr.on('data', (chunk) => { log += String(chunk); });
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (adapter.exitCode !== null) throw new Error(`Adapter exited: ${log}`);
    try {
      const response = await getWithHost(`${baseUrl}/blog/`, host);
      if (response.status === 200) return;
    } catch { /* Wait for the private adapter's socket. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Legacy tenant did not become ready: ${log.slice(-4000)}`);
});

test.afterAll(async () => {
  if (adapter && adapter.exitCode === null) {
    await new Promise<void>((resolve) => {
      const deadline = setTimeout(() => { adapter.kill('SIGKILL'); resolve(); }, 3000);
      adapter.once('exit', () => { clearTimeout(deadline); resolve(); });
      adapter.kill('SIGTERM');
    });
  }
  if (api) await new Promise<void>((resolve) => api.close(() => resolve()));
});

test('tenants without the profile render their existing interiors without new messages', async () => {
  for (const [route, marker] of [
    ['/blog/', 'masthead'],
    ['/blog/electronic-invoicing-online-business/', 'blog-post__header'],
    ['/solutions/online-store/', 'statement__lead'],
  ]) {
    const response = await getWithHost(`${baseUrl}${route}`, host);
    expect(response.status, `${route}: ${log}`).toBe(200);
    expect(response.body).toContain(marker);
    expect(response.body).not.toContain('class="photographic-interior"');
    expect(response.body).not.toContain('Missing translation');
  }
});
