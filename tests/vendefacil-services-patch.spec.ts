import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { prepare, assertCurrent, patch } from '../scripts/prepare-vendefacil-services.mjs';
import before from './fixtures/vendefacil-before-services.json' with { type: 'json' };
import after from './fixtures/vendefacil-site.json' with { type: 'json' };

const snapshot = () => ({ manifest: structuredClone(before.tenant), documents: structuredClone(before.pagesResponse.data.pages).map(page => ({ ...page, published: true })) });

test('the activation payload derives from the existing root, preserves all other data and agrees with the rendering fixture', () => {
  const input = snapshot();
  const frozen = JSON.stringify(input);
  const plan = prepare(input);
  expect(plan).toMatchObject({ keysBefore: 413, keysAfter: 456, added: 43, changed: 2, removed: 0 });
  expect(plan.apply.blocks).toEqual(after.pagesResponse.data.pages.find(page => page.route === '/')!.blocks);
  expect(plan.rollback).toEqual({ blocks: input.documents[0].blocks, published: input.documents[0].published });
  expect(JSON.stringify(input)).toBe(frozen);
  expect(() => assertCurrent(plan, input)).not.toThrow();
  const activated = structuredClone(input);
  Object.assign(activated.documents[0], structuredClone(plan.apply));
  expect(() => assertCurrent(plan, activated, 'rollback')).not.toThrow();
  for (const [key, value] of Object.entries(input.documents[0].blocks)) {
    if (!Object.hasOwn(patch, key)) expect(plan.apply.blocks[key]).toBe(value);
  }
  expect(plan.apply.blocks['photographic.verticals.ads.mode']).toBe('meta');
  expect(JSON.stringify(patch)).not.toMatch(/Meta Ads|Facebook|Instagram|localStorage/);
  // A renderer capability mark is available BEFORE activation, with the old content.
  expect(readFileSync('src/page-content/PhotographicServiceHome.astro', 'utf8')).toContain(plan.rendererMarker);
});

test('a stale snapshot, a changed commercial destination, a reused activation or foreign-owned keys stop planning', () => {
  for (const mutate of [
    (s: ReturnType<typeof snapshot>) => { s.manifest.slug = 'medipago'; },
    (s: ReturnType<typeof snapshot>) => { s.manifest.destinations.support = 'https://wa.me/999'; },
    (s: ReturnType<typeof snapshot>) => { s.documents[0].blocks['photographic.solutions.links.4.href'] = '#otro'; },
    (s: ReturnType<typeof snapshot>) => { Object.assign(s.documents[0].blocks, patch); },
    (s: ReturnType<typeof snapshot>) => { Object.assign(s.documents[3].blocks, { 'photographic.verticals.store.title': 'Another page owns this' }); },
  ]) {
    const input = snapshot(); mutate(input);
    expect(() => prepare(input)).toThrow();
  }
});

test('pre-write and rollback checks reject concurrent edits and modified plans without force overrides', () => {
  const input = snapshot();
  const plan = prepare(input);
  const edited = structuredClone(input);
  edited.documents[0].blocks['photographic.hero.description'] = 'A newer owner edit';
  expect(() => assertCurrent(plan, edited)).toThrow('Site changed');
  const changedPlan = structuredClone(plan);
  changedPlan.apply.blocks['photographic.hero.description'] = 'Tampered payload';
  expect(() => assertCurrent(changedPlan, input)).toThrow('Plan changed');
  const activated = structuredClone(input);
  Object.assign(activated.documents[0], structuredClone(plan.apply));
  activated.documents[0].blocks['photographic.hero.description'] = 'An edit after activation';
  expect(() => assertCurrent(plan, activated, 'rollback')).toThrow('Root was edited');
});

test('rollback refuses tampered preimages even when applying the patch would mask them', () => {
  const input = snapshot();
  const plan = prepare(input);
  const activated = structuredClone(input);
  Object.assign(activated.documents[0], structuredClone(plan.apply));
  for (const key of Object.keys(patch)) {
    const changed = structuredClone(plan);
    changed.rollback.blocks[key] = 'Changed after review';
    expect(() => assertCurrent(changed, activated, 'rollback'), key).toThrow('Rollback preimage changed');
  }
  expect(() => assertCurrent(plan, activated, 'rollback')).not.toThrow();
});
