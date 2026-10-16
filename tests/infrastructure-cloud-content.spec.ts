import { test, expect } from '@playwright/test';
import { repoTenants } from '../src/data/site-tenants';
import { exportRepoContent, startFakeSiteStack } from './helpers/fake-site-api';
import { getWithHost } from './helpers/http-host';

// Code and SitePages have independent releases. Exercise the real Node adapter
// with the existing HTTP contract double, including tenants without the new copy.
test('Cloud requires complete tenant copy in each locale, with no catalogue fallback', async ({}, testInfo) => {
  const documents = exportRepoContent(testInfo.outputPath('catalogue.json'));
  const platform = repoTenants().find((tenant) => tenant.slug === 'oneplatform')!;
  const fields = ['name', 'description', 'status'];
  const scenarios = ['legacy', ...fields, 'blank', 'complete'];
  const sites = scenarios.map((scenario) => ({
    tenant: { ...platform, slug: `cloud-${scenario}`, domain: `cloud-${scenario}.example`, aliases: [] },
    pages: new Map(['es', 'en'].map((locale) => [locale, documents.filter((document) => document.locale === locale).map((document) => {
      const blocks = { ...document.blocks };
      if (scenario !== 'complete') {
        for (const field of fields) {
          if (scenario === 'legacy' || scenario === field) delete blocks[`infrastructure.capabilities.cloud.${field}`];
        }
        if (scenario === 'blank' && document.route === '@infrastructure-home') blocks['infrastructure.capabilities.cloud.status'] = ' ';
      }
      return { ...document, blocks };
    })])),
  }));
  const stack = await startFakeSiteStack(sites, { host: sites[0].tenant.domain, path: '/' });
  try {
    for (const [index, site] of sites.entries()) {
      for (const [path, name, status] of [['/es/', 'Nube', 'EN PREPARACIÓN'], ['/', 'Cloud', 'IN DEVELOPMENT']]) {
        const response = await getWithHost(`${stack.baseUrl}${path}`, site.tenant.domain);
        expect(response.status, `${scenarios[index]} ${path}: ${stack.log()}`).toBe(200);
        const complete = scenarios[index] === 'complete';
        expect(response.body.match(/data-capability=/g)).toHaveLength(complete ? 11 : 10);
        if (complete) {
          expect(response.body).toContain(`data-capability="${name}"`);
          expect(response.body).toContain(`data-capability-status="${status}"`);
        } else {
          expect(response.body).not.toContain('data-capability-status=');
        }
      }
    }
  } finally { await stack.stop(); }
});
