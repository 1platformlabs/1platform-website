import { test, expect } from '@playwright/test';
import { repoTenants } from '../src/data/site-tenants';
import { exportRepoContent, startFakeSiteStack } from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';

// Contract coverage for independently published SitePages; the release bank also
// exercises persisted pages through the real Core API.
test('optional capabilities require tenant copy without fallback or obsolete statuses', async ({}, testInfo) => {
  const documents = exportRepoContent(testInfo.outputPath('catalogue.json'));
  const platform = repoTenants().find((tenant) => tenant.slug === 'oneplatform')!;
  const keys = ['cloud', 'plates', 'videos', 'sales', 'scheduling', 'social', 'content'];
  const scenarios = ['legacy', 'name', 'description', 'blank', 'complete'];
  const sites = scenarios.map((scenario) => ({
    tenant: { ...platform, slug: `cards-${scenario}`, domain: `cards-${scenario}.example`, aliases: [] },
    pages: new Map(['es', 'en'].map((locale) => [locale, documents.filter((document) => document.locale === locale).map((document) => {
      const blocks = { ...document.blocks };
      for (const key of keys) {
        for (const field of ['name', 'description']) {
          if (scenario === 'legacy' || scenario === field) delete blocks[`infrastructure.capabilities.${key}.${field}`];
        }
        if (scenario === 'blank' && document.route === '@infrastructure-home') blocks[`infrastructure.capabilities.${key}.name`] = ' ';
      }
      // Persisted, superseded statuses must not leak into cards or the map.
      if (document.route === '@infrastructure-home') {
        blocks['infrastructure.capabilities.cloud.status'] = 'AVAILABLE';
        blocks['infrastructure.capabilities.agents.status'] = 'WHATSAPP IN DEVELOPMENT';
      }
      return { ...document, blocks };
    })])),
  }));
  const stack = await startFakeSiteStack(sites, { host: sites[0].tenant.domain, path: '/' });
  try {
    for (const [index, site] of sites.entries()) {
      for (const path of ['/es/', '/']) {
        const response = await getWithHost(`${stack.baseUrl}${path}`, site.tenant.domain);
        expect(response.status, `${scenarios[index]} ${path}: ${stack.log()}`).toBe(200);
        expect(response.body.match(/data-capability=/g)).toHaveLength(scenarios[index] === 'complete' ? 17 : 10);
        expect(response.body).not.toContain('data-capability-status=');
        expect(response.body).not.toContain('WHATSAPP IN DEVELOPMENT');
        expect(response.body).not.toContain('capability-documentation');
      }
    }
  } finally { await stack.stop(); }
});
