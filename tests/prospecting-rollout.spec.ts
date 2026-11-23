import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { repoTenantForHost } from '../src/data/site-tenants';
import { exportRepoContent, startFakeSiteStack, type FakeSiteStack, type PagesDocument } from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';

/**
 * vertical-prospeccion PRS-13 rollout order: the landing ships BEFORE the
 * vertical is ON in PROD, and a tenant only serves it once it publishes the
 * route. Until then the solutions hub must still render without the card, and
 * the landing itself must be a 404 (unreachable and unadvertised).
 */
const ROUTES = [
  ['en', '/solutions/'],
  ['es', '/es/soluciones/'],
] as const;

/** Copy as it exists today in production: nothing this epic introduced. */
const withoutProspecting = (documents: PagesDocument[]): PagesDocument[] =>
  documents
    .filter((d) => d.route !== '/solutions/prospecting/')
    .map((d) => ({
      ...d,
      blocks: Object.fromEntries(
        Object.entries(d.blocks).filter(([key]) => !key.includes('prospecting') && !key.startsWith('solutions-prospecting.')),
      ),
    }));

test.describe('prospecting before the tenant publishes them', () => {
  test.describe.configure({ mode: 'serial' });
  let stack: FakeSiteStack;
  const platform = repoTenantForHost('1platform.pro')!;

  test.beforeAll(async () => {
    const content = withoutProspecting(exportRepoContent(join(process.cwd(), 'test-results/prospecting-rollout-content.json')));
    expect(content.some((d) => Object.keys(d.blocks).some((k) => k.includes('prospecting')))).toBe(false);
    const pages = new Map(platform.locales.map((locale) => [locale, content.filter((d) => d.locale === locale)]));
    stack = await startFakeSiteStack(
      [
        {
          tenant: { ...platform, slug: 'pre-prospeccion', domain: 'pre-prospeccion.example', pages: platform.pages.filter((p) => p !== '/solutions/prospecting/') },
          pages,
        },
      ],
      { host: 'pre-prospeccion.example', path: '/' },
    );
  });

  test.afterAll(async () => {
    await stack?.stop();
  });

  for (const [locale, path] of ROUTES) {
    test(`the ${locale} solutions hub still renders and does not link the unpublished page`, async () => {
      const res = await getWithHost(`${stack.baseUrl}${path}`, 'pre-prospeccion.example');
      expect(res.status, stack.log()).toBe(200);
      // A probe that fetched the wrong page would pass the negative below.
      expect(res.body).toMatch(/<main[\s\S]*<h1/);
      expect(res.body).toContain(locale === 'en' ? '/solutions/deliveries/' : '/es/soluciones/envios/');
      expect(res.body).not.toContain(locale === 'en' ? '/solutions/prospecting/' : '/es/soluciones/prospeccion/');
    });
  }

  test('the landing itself is not served while the tenant does not publish it', async () => {
    const res = await getWithHost(`${stack.baseUrl}/solutions/prospecting/`, 'pre-prospeccion.example');
    expect(res.status, stack.log()).toBe(404);
  });
});
