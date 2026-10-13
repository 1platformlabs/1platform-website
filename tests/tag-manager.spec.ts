import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { repoTenantForHost } from '../src/data/site-tenants';
import { TAG_MANAGER_ID, tagManagerHeadScript, tagManagerIdOf, tagManagerNoscriptSrc } from '../src/lib/tag-manager';
import { exportRepoContent, startFakeSiteStack, type FakeSite, type FakeSiteStack, type PagesDocument } from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';

/**
 * The Tag Manager container is a property of ONE tenant.
 *
 * One process serves every tenant, so the defect this guards is not "the
 * snippet is missing" but "the snippet is somewhere it was not asked for": a
 * container in a layout measures — and fires the ad pixels of — every other
 * tenant's visitors. The manifest carries only the id, re-validated here,
 * and the snippet is built in code.
 */

const ROOT = process.cwd();
const GTM = 'GTM-M6FVQLML';
const LOADER = 'googletagmanager.com';

type Fixture = { tenant: FakeSite['tenant']; pagesResponse: { data: { pages: PagesDocument[] } } };
const photographicFixture = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/photographic-site.json'), 'utf8')) as Fixture;
const platform = repoTenantForHost('1platform.pro')!;

test.describe('the id rule', () => {
  test('a container id passes and anything else is dropped, not repaired', () => {
    expect(tagManagerIdOf({ tag_manager_id: GTM })).toBe(GTM);
    for (const junk of [undefined, null, '', 'gtm-m6fvqlml', 'GTM-ABC', ' GTM-M6FVQLML', `${GTM}');alert(1);//`, `<script>'${GTM}'</script>`, 12]) {
      expect(tagManagerIdOf({ tag_manager_id: junk as string | null }), String(junk)).toBeNull();
    }
  });

  test('the snippet builders refuse to interpolate anything but an id', () => {
    expect(tagManagerHeadScript(GTM)).toContain(`'dataLayer','${GTM}')`);
    expect(tagManagerNoscriptSrc(GTM)).toBe(`https://www.${LOADER}/ns.html?id=${GTM}`);
    expect(() => tagManagerHeadScript(`${GTM}');alert(1);//`)).toThrow();
    expect(() => tagManagerNoscriptSrc('x" onload="alert(1)')).toThrow();
    expect(TAG_MANAGER_ID.test(GTM)).toBe(true);
  });
});

/**
 * Every file that writes its own `<html>` document has to mount both halves.
 * The photographic home (medipago.gt) and the access page do not go through
 * `BaseLayout`; a fourth document added later would silently ship without the
 * container — or with only half of it — and nothing else would notice.
 */
test('every document-owning file mounts the container in <head> and right after <body>', () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.astro')) files.push(full);
    }
  };
  walk('src');
  const documents = files.filter((f) => /<html[\s>]/.test(readFileSync(f, 'utf8')));
  // Floor: BaseLayout, the photographic home and the access page today.
  expect(documents.length, documents.join('\n')).toBeGreaterThanOrEqual(3);

  for (const file of documents) {
    const source = readFileSync(file, 'utf8');
    const head = source.slice(source.indexOf('<head>'), source.indexOf('</head>'));
    const afterBody = source.slice(source.search(/<body[\s>]/)).split('\n').slice(0, 3).join('\n');
    expect(head, `${file}: no <TagManager part="head" /> inside <head>`).toContain('<TagManager part="head" />');
    expect(afterBody, `${file}: <TagManager part="body" /> must be the first thing after <body>`).toContain('<TagManager part="body" />');
  }
});

test.describe('served HTML', () => {
  test.describe.configure({ mode: 'serial' });

  let stack: FakeSiteStack;

  const photographic = (domain: string, slug: string, overrides: Record<string, unknown>): FakeSite => ({
    tenant: { ...photographicFixture.tenant, slug, domain, ...overrides },
    pages: new Map([['es', photographicFixture.pagesResponse.data.pages]]),
  });

  test.beforeAll(async () => {
    const content = exportRepoContent(join(ROOT, 'test-results/tag-manager-content.json'));
    const platformPages = new Map(platform.locales.map((locale) => [locale, content.filter((d) => d.locale === locale)]));
    stack = await startFakeSiteStack(
      [
        { tenant: { ...platform }, pages: platformPages },
        { tenant: { ...platform, slug: 'plataforma-gtm', domain: 'plataforma-gtm.example', tag_manager_id: GTM }, pages: platformPages },
        photographic('medipago.gt', 'medipago', { tag_manager_id: GTM }),
        photographic('sin-gtm.example', 'sin-gtm', {}),
        photographic('podrido.example', 'podrido', { tag_manager_id: `${GTM}');alert(1);//` }),
      ],
      { host: 'medipago.gt', path: '/' },
    );
  });

  test.afterAll(async () => {
    await stack?.stop();
  });

  const html = async (host: string, path = '/') => {
    const response = await getWithHost(`${stack.baseUrl}${path}`, host);
    expect(response.status, `${host}${path}\n${stack.log()}`).toBe(200);
    return response.body;
  };

  const expectContainer = (page: string, label: string) => {
    const head = page.slice(0, page.indexOf('</head>'));
    const body = page.slice(page.search(/<body[\s>]/));
    expect(head, `${label}: loader in <head>`).toContain(`'dataLayer','${GTM}')`);
    expect(head, `${label}: loader in <head>`).toContain(`https://www.${LOADER}/gtm.js?id=`);
    expect(body, `${label}: noscript after <body>`).toMatch(new RegExp(`^<body[^>]*>\\s*<noscript><iframe src="https://www\\.${LOADER}/ns\\.html\\?id=${GTM}"`));
    expect(page.split(GTM).length - 1, `${label}: exactly one loader and one fallback`).toBe(2);
  };

  test('the photographic home of the tenant that declared it carries the container', async () => {
    expectContainer(await html('medipago.gt'), 'medipago.gt');
  });

  test('the shared layout carries it too when its tenant declares one', async () => {
    expectContainer(await html('plataforma-gtm.example'), 'plataforma-gtm.example');
  });

  test('no other tenant gets it — no leak across tenants', async () => {
    // Read AFTER the tenants that declare it, so a module-level cache of the
    // last id would show up here.
    for (const host of ['1platform.pro', 'sin-gtm.example']) {
      const page = await html(host);
      expect(page, host).not.toContain(LOADER);
      expect(page, host).not.toContain(GTM);
    }
  });

  test('a malformed id switches the container off instead of reaching the markup', async () => {
    const page = await html('podrido.example');
    expect(page).not.toContain(LOADER);
    expect(page).not.toContain('alert(1)');
  });
});
