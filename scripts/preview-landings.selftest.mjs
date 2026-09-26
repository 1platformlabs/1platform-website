import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPreviewSites, previewResponse } from './preview-landings.mjs';

const sites = loadPreviewSites();
const get = (path) => previewResponse(new URL(path, 'http://127.0.0.1'), sites);

test('one build resolves the two hosts to their own composition and destinations', () => {
  const medipago = get('/api/v1/sites/by-host?host=medipago.localhost').body.data;
  const platform = get('/api/v1/sites/by-host?host=1platform.localhost').body.data;
  assert.equal(medipago.home_template, 'photographic-service');
  assert.equal(platform.home_template, 'photographic-service');
  assert.equal(medipago.domain, 'medipago.gt');
  assert.equal(platform.domain, '1platform.pro');
  assert.notEqual(medipago.destinations.support, platform.destinations.support);
  assert.equal(get('/api/v1/sites/by-host?host=127.0.0.1').body.data.slug, 'medipago');
});

test('1Platform has separate complete English and Spanish dictionaries', () => {
  const en = get('/api/v1/sites/oneplatform/pages?locale=en').body.data;
  const es = get('/api/v1/sites/oneplatform/pages?locale=es').body.data;
  assert.equal(en.locale, 'en');
  assert.equal(es.locale, 'es');
  assert.notEqual(en.messages['home.hero.headline'], es.messages['home.hero.headline']);
  const byText = (a, b) => a.localeCompare(b);
  assert.deepEqual(Object.keys(en.messages).sort(byText), Object.keys(es.messages).sort(byText));
  assert.equal(en.pages.some((page) => page.locale !== 'en'), false);
  assert.equal(es.pages.some((page) => page.locale !== 'es'), false);
  assert.equal(es.messages['photographic.hero.image'], 'commerce');
  assert.equal(es.messages['photographic.calculator.mode'], 'quote');
  assert.equal(es.messages['photographic.panel.currency'], 'USD');
  assert.equal(es.messages['photographic.calculator.commissionBasisPoints'], undefined);
});

test('Medipago retains the configured GTQ illustration without platform copy leaking in', () => {
  const medipago = get('/api/v1/sites/medipago/pages?locale=es').body.data;
  assert.equal(medipago.slug, 'medipago');
  assert.equal(medipago.messages['photographic.calculator.currency'], 'GTQ');
  assert.equal(medipago.messages['photographic.calculator.commissionBasisPoints'], '490');
  assert.equal(medipago.messages['photographic.hero.title1'], 'Cobre con tarjeta.');
});

test('unknown hosts, slugs and unsupported locales never fall back to another tenant', () => {
  for (const path of [
    '/api/v1/sites/by-host?host=unknown.localhost',
    '/api/v1/sites/unknown/pages?locale=es',
    '/api/v1/sites/medipago/pages?locale=en',
    '/api/v1/sites/oneplatform/pages?locale=fr',
    '/api/v1/sites/oneplatform/pages',
  ]) {
    assert.deepEqual(get(path), { status: 404, body: { success: false, data: null, msg: 'Not found' } });
  }
});
