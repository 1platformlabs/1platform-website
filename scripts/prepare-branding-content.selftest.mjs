import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, readFileSync, writeFileSync, rmSync, statSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadOverlay, prepareBrandingContent, validateSnapshot} from './prepare-branding-content.mjs';

const platformOverlay = loadOverlay('oneplatform');
const medipagoOverlay = loadOverlay('medipago');
function snapshot(tenant = 'oneplatform') {
  const locales = tenant === 'oneplatform' ? ['en', 'es'] : ['es'];
  const routes = ['/', '/editorial-existing/'];
  return {
    tenant_slug: tenant, locales, default_locale: locales[0], published_routes: routes,
    snapshot_note: 'Synthetic complete administrative snapshot for a private test only',
    manifest: {
      slug: tenant, locales: [...locales], default_locale: locales[0], pages: [...routes], status: 'draft',
      home_template: 'photographic-service', brand_name: tenant === 'oneplatform' ? '1Platform' : 'Medipago',
      theme: {accent: tenant === 'oneplatform' ? '#1748a7' : '#0f766e', accent_contrast: '#ffffff', display_font: 'manrope'},
      destinations: {docs: 'https://developer.example/', app: 'https://app.example/', support: tenant === 'oneplatform' ? null : 'https://wa.me/50244866448', status: 'https://status.example/'},
    },
    documents: locales.flatMap(locale => [
      {route: '@existing', locale, published: true, updated_at: '2026-09-30T00:00:00Z', blocks: {'editorial.custom': 'Keep this authored copy', ...(tenant === 'oneplatform' ? {'site.theme.profile': 'classic', 'infrastructure.hero.line1': 'Previous approved heading'} : {'photographic.ui.panel_disabled': 'Previous request label'})}},
      {route: '/editorial-draft/', locale, published: false, blocks: {'draft.title': 'Keep this draft'}, operator_note: 'Keep metadata'},
    ]),
  };
}

test('uses only the three source catalogues and derives the real approved palette', () => {
  assert.deepEqual([...new Set(platformOverlay.documents.map(d => d.route))].sort(), ['@components/site-chrome', '@infrastructure-home', '@photographic-interiors']);
  assert.equal(platformOverlay.documents.length, 6);
  assert.equal(platformOverlay.documents.find(d => d.route === '@components/site-chrome' && d.locale === 'es').blocks['site.theme.navy'], '#0d1c3a');
});

test('preserves every unrelated document, route, locale, publication state and metadata', () => {
  const current = snapshot(); const before = structuredClone(current);
  const {fixture, manifestPatch, report} = prepareBrandingContent(current, 'oneplatform', platformOverlay);
  assert.deepEqual(current, before);
  assert.deepEqual(fixture.published_routes, before.published_routes);
  assert.deepEqual(fixture.locales, before.locales);
  assert.deepEqual(fixture.manifest, before.manifest);
  for (const original of before.documents) {
    const actual = fixture.documents.find(d => d.route === original.route && d.locale === original.locale);
    assert.equal(actual.published, original.published);
    assert.equal(actual.updated_at, original.updated_at);
    assert.equal(actual.operator_note, original.operator_note);
    for (const [key, value] of Object.entries(original.blocks)) if (key.startsWith('editorial.') || key.startsWith('draft.')) assert.equal(actual.blocks[key], value);
  }
  assert.deepEqual(manifestPatch, {home_template: 'photographic-service', theme: {...before.manifest.theme, accent: '#2854a7', display_font: 'manrope'}, destinations: {...before.manifest.destinations, support: 'https://wa.me/50253946564'}});
  assert.equal(report.published_routes_unchanged, true);
  assert.equal(report.input_sha256.length, 64);
});

test('updates the existing owner instead of introducing a duplicate key or moving content', () => {
  const current = snapshot();
  const {fixture} = prepareBrandingContent(current, 'oneplatform', platformOverlay);
  for (const locale of current.locales) {
    assert.equal(fixture.documents.find(d => d.route === '@existing' && d.locale === locale).blocks['site.theme.profile'], 'infrastructure');
    assert.equal(fixture.documents.filter(d => d.locale === locale && Object.hasOwn(d.blocks, 'site.theme.profile')).length, 1);
  }
  validateSnapshot(fixture, 'oneplatform');
});

test('is idempotent, including a repeated Medipago activation and retained draft ownership', () => {
  for (const tenant of ['oneplatform', 'medipago']) {
    const current = snapshot(tenant); current.documents[0].published = false;
    const overlay = tenant === 'oneplatform' ? platformOverlay : medipagoOverlay;
    const first = prepareBrandingContent(current, tenant, overlay);
    const second = prepareBrandingContent(first.fixture, tenant, overlay);
    assert.deepEqual(first.fixture, second.fixture);
    assert.deepEqual(first.manifestPatch, second.manifestPatch);
    assert.equal(second.report.changes.length, 0);
    assert(first.report.retained_unpublished_overlay_documents.includes(`${current.locales[0]}:@existing`));
    assert.equal(first.fixture.documents[0].published, false);
  }
});

test('Medipago receives only photographic keys and preserves its complete manifest and contact', () => {
  const current = snapshot('medipago');
  const {fixture, manifestPatch} = prepareBrandingContent(current, 'medipago', medipagoOverlay);
  assert.deepEqual(manifestPatch, {});
  assert.deepEqual(fixture.manifest, current.manifest);
  const blocks = Object.assign({}, ...fixture.documents.map(d => d.blocks));
  assert.equal(blocks['photographic.panel.mode'], 'collections');
  assert.equal(blocks['photographic.panel.sample.collectedCents'], '48000');
  assert.equal(blocks['photographic.panel.sample.withdrawGTQ'], '0');
  assert.equal(blocks['photographic.ui.panel_disabled'], 'Solicitar retiro');
  assert(!Object.keys(blocks).some(key => key.startsWith('site.') || key.startsWith('infrastructure.')));
  assert.equal(fixture.manifest.destinations.support, 'https://wa.me/50244866448');
});

test('retires only the two exact reviewed coverage FAQ keys with before/after hashes', () => {
  const current = snapshot('medipago');
  Object.assign(current.documents[0].blocks, {
    'photographic.faq.items.3.question': '¿En qué departamentos está disponible?',
    'photographic.faq.items.3.answer': 'En toda Guatemala, en todos sus departamentos. Contáctenos para coordinar el alta de su consultorio.',
  });
  const {fixture, report} = prepareBrandingContent(current, 'medipago', medipagoOverlay);
  const retired = report.changes.filter(change => change.kind === 'retired-approved-faq');
  assert.equal(retired.length, 2);
  for (const entry of retired) {
    assert.equal(entry.before, current.documents[0].blocks[entry.key]);
    assert.equal(entry.after, null);
    assert.match(entry.before_sha256, /^[a-f0-9]{64}$/);
    assert.match(entry.after_sha256, /^[a-f0-9]{64}$/);
    assert(!Object.hasOwn(fixture.documents[0].blocks, entry.key));
  }
  assert.equal(prepareBrandingContent(fixture, 'medipago', medipagoOverlay).report.changes.length, 0);
});

test('refuses unreviewed, partial or additional Medipago FAQs without altering input', () => {
  for (const extra of [
    {'photographic.faq.items.3.question': 'Custom question', 'photographic.faq.items.3.answer': 'Custom answer'},
    {'photographic.faq.items.3.question': '¿En qué departamentos está disponible?'},
    {'photographic.faq.items.4.question': 'Custom question', 'photographic.faq.items.4.answer': 'Custom answer'},
  ]) {
    const current = snapshot('medipago'); Object.assign(current.documents[0].blocks, extra);
    const before = structuredClone(current);
    assert.throws(() => prepareBrandingContent(current, 'medipago', medipagoOverlay), /FAQ/);
    assert.deepEqual(current, before);
  }
});

test('rejects cross-tenant snapshots, documents, manifest or overlay', () => {
  assert.throws(() => prepareBrandingContent(snapshot(), 'medipago', medipagoOverlay), /tenant mismatch/);
  const document = snapshot(); document.documents[0].tenant_slug = 'medipago';
  assert.throws(() => prepareBrandingContent(document, 'oneplatform', platformOverlay), /tenant mismatch/);
  const manifest = snapshot(); manifest.manifest.slug = 'medipago';
  assert.throws(() => prepareBrandingContent(manifest, 'oneplatform', platformOverlay), /tenant mismatch/);
  assert.throws(() => prepareBrandingContent(snapshot(), 'oneplatform', medipagoOverlay), /tenant mismatch/);
});

test('rejects duplicate locale, document identity, per-locale ownership and route', () => {
  for (const mutate of [
    current => current.locales.push('en'),
    current => current.documents.push(structuredClone(current.documents[0])),
    current => current.documents[1].blocks['editorial.custom'] = 'Duplicate owner',
    current => current.published_routes.push('/'),
  ]) { const current = snapshot(); mutate(current); assert.throws(() => prepareBrandingContent(current, 'oneplatform', platformOverlay), /Duplicate|unique strings/); }
});

test('rejects missing parity, undeclared locales, omitted publication and manifest drift', () => {
  for (const mutate of [
    current => delete current.documents[0].blocks['editorial.custom'],
    current => current.documents[0].locale = 'fr',
    current => delete current.documents[0].published,
    current => current.manifest.pages.push('/not-in-snapshot/'),
    current => delete current.manifest,
  ]) { const current = snapshot(); mutate(current); assert.throws(() => prepareBrandingContent(current, 'oneplatform', platformOverlay)); }
});

test('refuses unsafe routes, blank copy and credential-shaped values without echoing them', () => {
  for (const route of ['//other.example/', '/\\other.example/', '/has whitespace/', '/<script>/']) {
    const current = snapshot(); current.documents[0].route = route;
    assert.throws(() => prepareBrandingContent(current, 'oneplatform', platformOverlay), /Invalid document route/);
  }
  const empty = snapshot(); empty.documents[0].blocks['editorial.custom'] = ' ';
  assert.throws(() => prepareBrandingContent(empty, 'oneplatform', platformOverlay), /contents withheld/);
  const current = snapshot(); const secret = 'ak-' + 'synthetic'.repeat(5); current.documents[0].blocks['editorial.custom'] = secret;
  assert.throws(() => prepareBrandingContent(current, 'oneplatform', platformOverlay), error => !error.message.includes(secret) && error.message.includes('withheld'));
});

test('CLI writes a seed-compatible fixture and separate owner-readable patch/report without changing input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'branding-preparation-test-'));
  try {
    const input = join(dir, 'current.json'); const output = join(dir, 'prepared.json');
    const text = JSON.stringify(snapshot()); writeFileSync(input, text);
    const run = (...args) => spawnSync(process.execPath, [resolve('scripts/prepare-branding-content.mjs'), ...args], {encoding: 'utf8'});
    const result = run('--current', input, '--out', output, '--tenant', 'oneplatform');
    assert.equal(result.status, 0, result.stderr);
    const fixture = JSON.parse(readFileSync(output, 'utf8')); validateSnapshot(fixture, 'oneplatform');
    const patch = JSON.parse(readFileSync(`${output}.manifest-patch.json`, 'utf8'));
    assert.equal(patch.destinations.app, 'https://app.example/');
    assert.equal(statSync(output).mode & 0o777, 0o600);
    assert.equal(readFileSync(input, 'utf8'), text);
    assert.equal(readdirSync(dir).length, 4);
    assert.notEqual(run('--current', input, '--out', input, '--tenant', 'oneplatform').status, 0);
    assert.notEqual(run('--current', input, '--out', output, '--tenant', 'another').status, 0);
    assert.notEqual(run('--current', input, '--out', output, '--tenant', 'oneplatform', '--apply', 'true').status, 0);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
