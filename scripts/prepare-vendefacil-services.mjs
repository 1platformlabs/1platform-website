#!/usr/bin/env node
/** Offline only: prepare one SitePages PUT and its exact reverse; never sends it. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = new URL('../docs/content-patches/vendefacil-servicios-uniformes/', import.meta.url);
export const patch = JSON.parse(readFileSync(new URL('patch-root.es.json', folder), 'utf8'));
const previous = JSON.parse(readFileSync(new URL('../tests/fixtures/vendefacil-before-services.json', import.meta.url), 'utf8'));
const originalBlocks = previous.pagesResponse.data.pages.find(page => page.route === '/').blocks;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
export const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const bodyOf = page => ({ blocks: page.blocks, published: page.published });
const rootOf = snapshot => {
  assert(snapshot.manifest?.slug === 'vendefacil', 'Wrong tenant');
  assert(snapshot.manifest.domain === 'vendefacil.1platform.pro', 'Wrong tenant domain');
  assert(snapshot.manifest.destinations?.support === 'https://wa.me/50236532841', 'Commercial destination changed: review it before preparing');
  assert(snapshot.manifest.locales?.length === 1 && snapshot.manifest.locales[0] === 'es', 'Locale configuration changed');
  assert(Array.isArray(snapshot.documents), 'A complete staff snapshot is required');
  const identities = snapshot.documents.map(page => `${page.locale}:${page.route}`);
  assert(new Set(identities).size === identities.length, 'Duplicate page identity');
  const roots = snapshot.documents.filter(page => page.route === '/' && page.locale === 'es');
  assert(roots.length === 1, 'Expected exactly one root in es');
  const root = roots[0];
  assert(root.published === true && typeof root.blocks === 'object', 'The existing root must be published');
  return root;
};

export function prepare(snapshot) {
  const root = rootOf(snapshot);
  assert(root.blocks['photographic.verticals.ads.mode'] === 'meta', 'Existing advertising channel must be preserved');
  assert(root.blocks['photographic.calculator.mode'] === 'manual', 'Expected the activated commercial landing');
  const changes = [];
  for (const [key, after] of Object.entries(patch)) {
    const before = root.blocks[key];
    assert(before === originalBlocks[key], `Precondition changed: ${key}`);
    assert(!snapshot.documents.some(page => page !== root && Object.hasOwn(page.blocks, key)), `Key belongs to another page: ${key}`);
    if (before !== after) changes.push({ key, before: before ?? null, after });
  }
  const apply = { blocks: { ...root.blocks, ...patch }, published: root.published };
  assert(Object.keys(apply.blocks).length <= 600, 'SitePage key limit exceeded');
  assert(Object.values(apply.blocks).every(value => typeof value === 'string' && value.trim() && [...value].length <= 8000), 'Invalid content values');
  const rollback = structuredClone(bodyOf(root));
  return {
    target: { slug: 'vendefacil', route: '/', locale: 'es', method: 'PUT', path: '/api/v1/platform/sites/vendefacil/pages?route=/&locale=es' },
    rendererMarker: 'name="photographic-capabilities" content="uniform-services-v1"',
    snapshotHash: digest(snapshot), patchHash: digest(patch),
    rootUpdatedAt: root.updated_at ?? null,
    keysBefore: Object.keys(root.blocks).length, keysAfter: Object.keys(apply.blocks).length,
    added: changes.filter(change => change.before === null).length,
    changed: changes.filter(change => change.before !== null).length, removed: 0,
    manifestHash: digest(snapshot.manifest),
    otherDocuments: snapshot.documents.filter(page => page !== root).map(page => ({ route: page.route, locale: page.locale, hash: digest(page) })),
    changes, apply, rollback,
  };
}

/** Call with a freshly exported snapshot immediately before any authorized PUT. */
export function assertCurrent(plan, current, direction = 'apply') {
  assert(['apply', 'rollback'].includes(direction), 'Unknown operation');
  assert(plan.patchHash === digest(patch), 'Patch changed after review');
  if (direction === 'apply') {
    assert(digest(current) === plan.snapshotHash, 'Site changed after planning; export and review again');
    assert(digest(prepare(current)) === digest(plan), 'Plan changed after review; regenerate it');
  } else {
    const root = rootOf(current);
    // Re-applying the patch masks changes to the rollback values it overwrites.
    // These preimages were required at planning time and must still be intact.
    for (const key of Object.keys(patch)) {
      assert(plan.rollback.blocks[key] === originalBlocks[key], `Rollback preimage changed: ${key}`);
    }
    assert(digest(plan.apply) === digest({ blocks: { ...plan.rollback.blocks, ...patch }, published: plan.rollback.published }), 'Plan payload changed');
    assert(digest(bodyOf(root)) === digest(plan.apply), 'Root was edited after activation; do not overwrite it');
    assert(digest(current.manifest) === plan.manifestHash, 'Manifest changed after activation');
    assert(current.documents.length === plan.otherDocuments.length + 1, 'Pages changed after activation');
    for (const expected of plan.otherDocuments) {
      const page = current.documents.find(page => page.route === expected.route && page.locale === expected.locale);
      assert(page && digest(page) === expected.hash, 'Another page changed after activation');
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, input, output] = process.argv.slice(2);
  try {
    assert(['plan', 'check-apply', 'check-rollback'].includes(command) && input && output, 'Usage: plan <snapshot.json> <NEW-directory> | check-apply/check-rollback <plan.json> <fresh-snapshot.json>');
    const data = JSON.parse(readFileSync(input, 'utf8'));
    if (command === 'plan') {
      const plan = prepare(data);
      mkdirSync(output, { mode: 0o700 }); // Never replace an existing review or rollback point.
      for (const [file, value] of Object.entries({ 'plan.json': plan, 'apply.body.json': plan.apply, 'rollback.body.json': plan.rollback, 'before.json': data })) {
        writeFileSync(join(output, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      }
      console.log(JSON.stringify({ keysBefore: plan.keysBefore, keysAfter: plan.keysAfter, added: plan.added, changed: plan.changed, removed: 0, snapshotHash: plan.snapshotHash }));
    } else {
      assertCurrent(data, JSON.parse(readFileSync(output, 'utf8')), command === 'check-apply' ? 'apply' : 'rollback');
      console.log('Preconditions match. No request sent.');
    }
  } catch (error) { console.error(error instanceof SyntaxError ? 'Invalid JSON input; contents withheld' : error.message); process.exitCode = 1; }
}
