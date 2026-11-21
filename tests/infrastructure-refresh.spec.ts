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
      if (scenario === 'legacy') for (const key of Object.keys(blocks)) if (/^infrastructure\.(social|mcp|ecosystem)\./.test(key)) delete blocks[key];
      if (scenario === 'partial') {
        delete blocks['infrastructure.social.message7'];
        delete blocks['infrastructure.mcp.definition'];
        delete blocks['infrastructure.ecosystem.platformDetail'];
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
      // The ecosystem map replaces the architecture cards only with a complete release.
      expect(response.body.includes('id="ecosystem-title"')).toBe(complete);
      expect(response.body.includes('class="layer-grid"')).toBe(!complete);
      expect(response.body).toContain('id="arquitectura"');
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

for (const [path, width] of [['/es/', 1440], ['/', 1024], ['/es/', 390]] as const) {
  test(`ecosystem map shows the 17 capabilities around the tenant at ${width}px in ${path}`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await page.goto(path);
    const map = page.locator('#arquitectura');
    await expect(map.locator('.ecosystem-group')).toHaveCount(6);
    await expect(map.locator('.ecosystem-chips > li')).toHaveCount(17);
    await expect(map.locator('.ecosystem-hub strong')).toHaveText('One Platform');
    await expect(map.locator('.architecture-heading p')).toContainText('17');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    // Every group stays inside the section and clear of the hub.
    const hub = await map.locator('.ecosystem-hub').boundingBox();
    for (const box of await map.locator('.ecosystem-group').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()))) {
      const overlaps = box.left < hub!.x + hub!.width && box.right > hub!.x && box.top < hub!.y + hub!.height && box.bottom > hub!.y;
      expect(overlaps).toBe(false);
    }
  });
}

for (const width of [1440, 390]) {
  test(`consecutive home sections never share a background at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await page.goto('/es/');
    const colors = await page.locator('[data-infrastructure-home] > section').evaluateAll(nodes => nodes.map(node => {
      const paint = (el: Element) => { const style = getComputedStyle(el); return style.backgroundImage !== 'none' ? style.backgroundImage : style.backgroundColor; };
      const own = paint(node);
      if (own !== 'rgba(0, 0, 0, 0)') return {id: node.id, top: own, bottom: own};
      const children = [...node.children].filter(child => getComputedStyle(child).display !== 'none' && child.getBoundingClientRect().height > 0);
      const painted = children.map(paint).filter(color => color !== 'rgba(0, 0, 0, 0)');
      // A split section shows its first panel on top and its last at the bottom.
      const ordered = children.slice().sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map(paint).filter(color => color !== 'rgba(0, 0, 0, 0)');
      const fallback = getComputedStyle(node.parentElement!).backgroundColor;
      return {id: node.id, top: ordered[0] ?? painted[0] ?? fallback, bottom: ordered.at(-1) ?? painted.at(-1) ?? fallback};
    }));
    expect(colors.length).toBeGreaterThan(8);
    for (let index = 1; index < colors.length; index++) {
      expect(colors[index].top, `${colors[index - 1].id} → ${colors[index].id}`).not.toBe(colors[index - 1].bottom);
    }
  });
}
