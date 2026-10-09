import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';

import { getWithHost } from './http-host';

/**
 * The built Node adapter in front of a FAKE site API, with manifests injected
 * per host (`SITE_MANIFEST_SOURCE=api`).
 *
 * Extracted from the three specs that each carry an inline copy of this shape
 * (`photographic-landing`, `photographic-interior-legacy`, …); only the
 * social-links spec uses it for now, so those three are left as they are. It
 * runs the production dictionary path — the page dictionary is ONLY the
 * tenant's published content — which is exactly where a missing key throws.
 */

export type PagesDocument = { route: string; locale: string; published?: boolean; blocks: Record<string, string> };

export interface FakeSite {
  tenant: Record<string, unknown> & { slug: string; domain: string };
  /** Published pages per locale. */
  pages: Map<string, PagesDocument[]>;
  /**
   * landing-reviews-tenant: what `GET /sites/{slug}/reviews` answers, asked on
   * EVERY request so a spec can change it between two reads. Absent ⇒ 404, the
   * answer of an API that does not serve the route.
   */
  reviews?: () => { status: number; body?: unknown };
}

export interface FakeSiteStack {
  baseUrl: string;
  port: number;
  log: () => string;
  stop: () => Promise<void>;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('No TCP address'));
      resolve(address.port);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

/**
 * The repository's own content, exported once to a file of THIS caller's
 * choosing. Specs run in parallel; sharing an output path is a race.
 */
export function exportRepoContent(out: string): PagesDocument[] {
  const root = process.cwd();
  mkdirSync(join(root, 'test-results'), { recursive: true });
  const exported = spawnSync(process.execPath, ['scripts/export-site-content.mjs', '--out', out], { cwd: root, encoding: 'utf8' });
  if (exported.status !== 0) throw new Error(`export-site-content failed: ${exported.stderr}`);
  const { documents } = JSON.parse(readFileSync(out, 'utf8')) as { documents: PagesDocument[] };
  return documents.filter((document) => document.published !== false);
}

export async function startFakeSiteStack(sites: FakeSite[], readyProbe: { host: string; path: string }): Promise<FakeSiteStack> {
  const root = process.cwd();
  if (!existsSync(join(root, 'dist/server/entry.mjs'))) throw new Error('Build the real Node adapter first (npm run build)');

  const byHost = new Map(sites.map((site) => [site.tenant.domain, site]));
  const bySlug = new Map(sites.map((site) => [site.tenant.slug, site]));

  const api = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://contract');
    response.setHeader('content-type', 'application/json; charset=utf-8');
    if (url.pathname.endsWith('/sites/by-host')) {
      const site = byHost.get(url.searchParams.get('host') ?? '');
      if (site) return response.end(JSON.stringify({ success: true, data: site.tenant, msg: 'Site resolved' }));
    } else if (/\/sites\/[^/]+\/reviews$/.test(url.pathname)) {
      const slug = /\/sites\/([^/]+)\/reviews$/.exec(url.pathname)?.[1] ?? '';
      const answer = bySlug.get(slug)?.reviews?.();
      if (answer) {
        response.statusCode = answer.status;
        return response.end(JSON.stringify(answer.body ?? { success: false, data: null, msg: 'error' }));
      }
    } else {
      const match = /\/sites\/([^/]+)\/pages$/.exec(url.pathname);
      const site = match ? bySlug.get(match[1]) : undefined;
      const locale = url.searchParams.get('locale') ?? '';
      const pages = site?.pages.get(locale);
      if (site && pages) {
        const messages = Object.assign({}, ...pages.map((page) => page.blocks));
        return response.end(JSON.stringify({ success: true, data: { slug: site.tenant.slug, locale, pages, messages }, msg: 'ok' }));
      }
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ success: false, data: null, msg: 'Site not found' }));
  });
  const apiPort = await listen(api);
  const reservation = createServer();
  const port = await listen(reservation);
  await close(reservation);
  const baseUrl = `http://127.0.0.1:${port}`;

  let output = '';
  const app: ChildProcessWithoutNullStreams = spawn(process.execPath, ['dist/server/entry.mjs'], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), SITE_MANIFEST_SOURCE: 'api', SITE_API_BASE_URL: `http://127.0.0.1:${apiPort}` },
    stdio: 'pipe',
  });
  app.stdout.on('data', (chunk) => { output += String(chunk); });
  app.stderr.on('data', (chunk) => { output += String(chunk); });

  const stop = async () => {
    if (app.exitCode === null) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => { app.kill('SIGKILL'); resolve(); }, 3_000);
        app.once('exit', () => { clearTimeout(timer); resolve(); });
        app.kill('SIGTERM');
      });
    }
    await close(api);
  };

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (app.exitCode !== null) {
      await close(api);
      throw new Error(`Node adapter exited: ${output.slice(-4000)}`);
    }
    try {
      const response = await getWithHost(`${baseUrl}${readyProbe.path}`, readyProbe.host);
      if (response.status === 200) return { baseUrl, port, log: () => output, stop };
    } catch { /* wait for the adapter's socket */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await stop();
  throw new Error(`The built site did not become ready: ${output.slice(-4000)}`);
}
