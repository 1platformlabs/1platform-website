import {expect, test} from '@playwright/test';
import {repoTenants} from '../src/data/site-tenants';
import {exportRepoContent, startFakeSiteStack} from './helpers/fake-site-api';
import {getWithHost} from './helpers/http-host';

test('social demo progresses through typing to an appointment, pauses and scrolls without writing data', async ({page}) => {
  await page.goto('/es/');
  const writes: string[] = [];
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
  const demo = page.locator('[data-social-demo]');
  await demo.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(demo).toHaveClass(/is-enhanced/);
  await expect(page.locator('[data-social-typing]')).toBeVisible();
  await expect(page.locator('[data-social-presence]')).toHaveText('escribiendo…');
  await demo.hover();
  await expect(demo).toHaveClass(/is-paused/);
  await expect(page.locator('[data-message-phase="0"]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-message-phase="0"]')).toHaveCSS('animation-name', 'none');
  const phase = await demo.getAttribute('data-phase');
  await page.waitForTimeout(1200);
  await expect(demo).toHaveAttribute('data-phase', phase!);
  await page.mouse.move(0, 0);
  await expect(demo).toHaveAttribute('data-phase', '7', {timeout: 20000});
  await expect(page.locator('.social-appointment')).toContainText('Demo confirmada');
  const chat = page.locator('.social-conversation');
  expect(await chat.evaluate(el => el.scrollTop > 0 && el.scrollHeight > el.clientHeight)).toBe(true);
  await chat.focus();
  await expect(demo).toHaveClass(/is-paused/);
  await chat.press('Home');
  await expect.poll(() => chat.evaluate(el => el.scrollTop)).toBe(0);
  expect(writes).toEqual([]);
});

for (const [path, title] of [['/es/', 'Demo confirmada'], ['/', 'Demo confirmed']]) {
  test(`reduced motion shows the complete conversation and brand in ${path}`, async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(path);
    await expect(page.locator('[data-message-phase]:visible')).toHaveCount(8);
    await expect(page.locator('[data-social-typing]')).toBeHidden();
    await expect(page.locator('[data-social-pause]')).toBeDisabled();
    await expect(page.locator('.social-appointment')).toContainText(title);
    await expect(page.locator('.brand-header .brand-name')).toHaveText('One Platform');
    await expect(page.locator('.mcp-copy .button')).toHaveAttribute('href', 'https://developer.1platform.pro/docs/saas/1platform-api/integrar-con-ia#mcp');
    const colors = await page.locator('#agente-redes, #propuesta, #mcp, #capacidades').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    for (let index = 1; index < colors.length; index++) expect(colors[index]).not.toBe(colors[index - 1]);
  });
}

test('capabilities expand, collapse and expose hidden deep links', async ({page}) => {
  await page.goto('/es/');
  await expect(page.locator('[data-capability]:visible')).toHaveCount(8);
  const control = page.locator('[data-capabilities-more]');
  await control.click();
  await expect(page.locator('[data-capability]:visible')).toHaveCount(17);
  await control.click();
  await expect(page.locator('[data-capability]:visible')).toHaveCount(8);
  await page.goto('/es/#nube');
  await expect(page.locator('#nube')).toBeVisible();
  await expect(control).toHaveAttribute('aria-expanded', 'true');
});

test('section links reserve the floating header height only once', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/es/#mcp');
  const gap = await page.evaluate(() => document.querySelector('#mcp')!.getBoundingClientRect().top - document.querySelector('.brand-header')!.getBoundingClientRect().bottom);
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThanOrEqual(40);
});

test('older or incomplete tenant content omits new sections without a cross-tenant fallback', async ({}, info) => {
  const documents = exportRepoContent(info.outputPath('catalogue.json'));
  const platform = repoTenants().find(tenant => tenant.slug === 'oneplatform')!;
  const sites = ['legacy', 'partial', 'complete'].map(scenario => ({
    tenant: {...platform, slug: `refresh-${scenario}`, brand_name: 'Example Studio', domain: `refresh-${scenario}.example`, aliases: []},
    pages: new Map(['es', 'en'].map(locale => [locale, documents.filter(doc => doc.locale === locale).map(doc => {
      const blocks = {...doc.blocks};
      if (scenario === 'legacy') for (const key of Object.keys(blocks)) if (/^infrastructure\.(social|mcp)\./.test(key)) delete blocks[key];
      if (scenario === 'partial') {
        delete blocks['infrastructure.social.message7'];
        delete blocks['infrastructure.mcp.definition'];
      }
      return {...doc, blocks};
    })])),
  }));
  const stack = await startFakeSiteStack(sites, {host: sites[0].tenant.domain, path: '/'});
  try {
    for (const site of sites) {
      const response = await getWithHost(`${stack.baseUrl}/es/`, site.tenant.domain);
      expect(response.status, stack.log()).toBe(200);
      const complete = site.tenant.slug.endsWith('complete');
      expect(response.body.includes('id="agente-redes"')).toBe(complete);
      expect(response.body.includes('id="mcp"')).toBe(complete);
      expect(response.body).toContain('class="brand-name">Example Studio');
      if (complete) expect(response.body).toContain('MCP de Example Studio');
    }
  } finally { await stack.stop(); }
});

test('the integration map draws the tenant symbol on its accent plate, never white on the light card', async ({page}) => {
  await page.goto('/');
  const logo = page.locator('.integration-core .integration-logo');
  await expect(logo.locator('img.integration-symbol-artwork')).toHaveCount(1);
  const [plate, card] = await Promise.all([
    logo.evaluate(el => getComputedStyle(el).backgroundColor),
    page.locator('.integration-core').evaluate(el => getComputedStyle(el).backgroundColor),
  ]);
  // The silhouette is white: its plate must be opaque and must not be the card colour.
  expect(plate).not.toBe('rgba(0, 0, 0, 0)');
  expect(plate).not.toBe(card);
  await expect(logo.locator('img')).toHaveCSS('filter', /invert/);
});
