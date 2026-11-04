import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { repoTenantForHost } from '../src/data/site-tenants';
import { exportRepoContent, startFakeSiteStack, type FakeSiteStack, type PagesDocument } from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';

/**
 * PNF-07 rollout order (epic vertical-placas-nfc, plan §18): the code ships
 * BEFORE any tenant's copy for the review plates exists. In production the
 * dictionary is only what the tenant published and `t()` throws on a missing
 * key, so every page that names the new solution must ask the tenant first.
 *
 * Measured on 2026-11-03 against production (read only): `oneplatform`
 * publishes `/solutions/`, not `/solutions/review-plates/`, and its merged copy
 * has none of the `reviewPlates` keys. Before this guard the solutions hub
 * rendered its review-plates card unconditionally, so merging the website
 * would have taken `/solutions/` down in both languages until staff loaded
 * the copy — the runbook order (documents, then the route) could not help.
 */

const ROUTES = [
  ['en', '/solutions/'],
  ['es', '/es/soluciones/'],
] as const;

/** Copy as it exists today in production: nothing this epic introduced. */
const withoutReviewPlates = (documents: PagesDocument[]): PagesDocument[] =>
  documents
    .filter((d) => d.route !== '/solutions/review-plates/')
    .map((d) => ({
      ...d,
      blocks: Object.fromEntries(
        Object.entries(d.blocks).filter(([key]) => !key.includes('reviewPlates') && !key.startsWith('solutions-review-plates.')),
      ),
    }));

test.describe('review plates before the tenant publishes them', () => {
  test.describe.configure({ mode: 'serial' });
  let stack: FakeSiteStack;
  const platform = repoTenantForHost('1platform.pro')!;

  test.beforeAll(async () => {
    const content = withoutReviewPlates(exportRepoContent(join(process.cwd(), 'test-results/review-plates-rollout-content.json')));
    expect(content.some((d) => Object.keys(d.blocks).some((k) => k.includes('reviewPlates')))).toBe(false);
    const pages = new Map(platform.locales.map((locale) => [locale, content.filter((d) => d.locale === locale)]));
    stack = await startFakeSiteStack(
      [
        {
          tenant: { ...platform, slug: 'pre-placas', domain: 'pre-placas.example', pages: platform.pages.filter((p) => p !== '/solutions/review-plates/') },
          pages,
        },
      ],
      { host: 'pre-placas.example', path: '/' },
    );
  });

  test.afterAll(async () => {
    await stack?.stop();
  });

  for (const [locale, path] of ROUTES) {
    test(`the ${locale} solutions hub still renders and does not link the unpublished page`, async () => {
      const res = await getWithHost(`${stack.baseUrl}${path}`, 'pre-placas.example');
      expect(res.status, stack.log()).toBe(200);
      // A probe that fetched the wrong page would pass the negative below.
      expect(res.body).toMatch(/<main[\s\S]*<h1/);
      expect(res.body).toContain(locale === 'en' ? '/solutions/deliveries/' : '/es/soluciones/envios/');
      expect(res.body).not.toContain(locale === 'en' ? '/solutions/review-plates/' : '/es/soluciones/placas/');
    });
  }

  test('the landing itself is not served while the tenant does not publish it', async () => {
    const res = await getWithHost(`${stack.baseUrl}/solutions/review-plates/`, 'pre-placas.example');
    expect(res.status, stack.log()).toBe(404);
  });
});
