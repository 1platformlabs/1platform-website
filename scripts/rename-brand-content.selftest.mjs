import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, readFileSync, writeFileSync, rmSync, statSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {renameBrandContent, renameValue} from './rename-brand-content.mjs';

const SCRIPT = resolve('scripts/rename-brand-content.mjs');

/** Three values with the brand, one with the legal entity, one with a URL, one already renamed. */
function snapshot() {
  const blocks = (locale) => locale === 'en'
    ? {
      'contact.title': 'Contact | 1Platform',
      'blog.feed.title': '1Platform Blog',
      'developers.intro': "Use the 1Platform API and 1Platform's SDKs.",
      'org.legalName': '1Platform Labs',
      'footer.link': 'Read more at https://1platform.pro/1Platform-guide',
      'layout.logoLabel': 'One Platform Home',
    }
    : {
      'contact.title': 'Contacto | 1Platform',
      'blog.feed.title': 'Blog de 1Platform',
      'developers.intro': 'Usa la API de 1Platform.',
      'org.legalName': '1Platform Labs',
      'footer.link': 'Más en https://1platform.pro/1Platform-guide',
      'layout.logoLabel': 'Inicio de One Platform',
    };
  return {
    tenant_slug: 'oneplatform', locales: ['en', 'es'], default_locale: 'en', published_routes: ['/', '/contact/'],
    documents: ['en', 'es'].flatMap((locale) => [
      {route: '/contact/', locale, published: true, updated_at: '2026-11-13T00:00:00Z', blocks: blocks(locale)},
      {route: '/draft/', locale, published: false, blocks: {'draft.title': 'Keep this draft'}, operator_note: 'keep'},
    ]),
  };
}

test('renames exactly the values with the brand and reports remaining 0', () => {
  const current = snapshot(); const before = structuredClone(current);
  const {fixture, report} = renameBrandContent(current);
  assert.deepEqual(current, before, 'the input is never mutated');
  assert.equal(report.changed, 6);
  assert.equal(report.remaining, 0);
  assert.equal(report.already_renamed, 2);
  const en = fixture.documents.find((d) => d.route === '/contact/' && d.locale === 'en').blocks;
  assert.equal(en['contact.title'], 'Contact | One Platform');
  assert.equal(en['blog.feed.title'], 'One Platform Blog');
  assert.equal(en['developers.intro'], "Use the One Platform API and One Platform's SDKs.");
  const es = fixture.documents.find((d) => d.route === '/contact/' && d.locale === 'es').blocks;
  assert.equal(es['blog.feed.title'], 'Blog de One Platform');
  for (const change of report.changes) assert.ok(change.before && change.after && change.before !== change.after);
});

test('keeps the legal entity, URLs, routes, documents, metadata and publication state', () => {
  const current = snapshot();
  const {fixture, report} = renameBrandContent(current);
  for (const locale of ['en', 'es']) {
    const blocks = fixture.documents.find((d) => d.route === '/contact/' && d.locale === locale).blocks;
    assert.equal(blocks['org.legalName'], '1Platform Labs');
    assert.match(blocks['footer.link'], /https:\/\/1platform\.pro\/1Platform-guide$/);
  }
  assert.deepEqual(fixture.published_routes, current.published_routes);
  assert.deepEqual(fixture.documents.map((d) => [d.route, d.locale, d.published, d.updated_at, d.operator_note]),
    current.documents.map((d) => [d.route, d.locale, d.published, d.updated_at, d.operator_note]));
  assert.equal(fixture.documents.find((d) => d.route === '/draft/' && d.locale === 'en').blocks['draft.title'], 'Keep this draft');
  assert.equal(report.documents_before, report.documents_after);
});

test('is idempotent: running on its own output changes nothing', () => {
  const {fixture} = renameBrandContent(snapshot());
  const second = renameBrandContent(fixture);
  assert.equal(second.report.changed, 0);
  assert.equal(second.report.remaining, 0);
  assert.deepEqual(second.fixture, fixture);
});

test('a lower-case domain is not the brand', () => {
  assert.equal(renameValue('Write to hola@1platform.pro'), 'Write to hola@1platform.pro');
  assert.equal(renameValue('1Platform Labs and 1Platform'), '1Platform Labs and One Platform');
});

test('refuses another tenant and an incomplete snapshot', () => {
  assert.throws(() => renameBrandContent({...snapshot(), tenant_slug: 'medipago'}));
  assert.throws(() => renameBrandContent({...snapshot(), documents: []}));
});

test('the CLI writes private files atomically and never replaces the input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rename-brand-'));
  try {
    const input = join(dir, 'snapshot.json');
    const output = join(dir, 'renamed.json');
    writeFileSync(input, JSON.stringify(snapshot()));
    const ok = spawnSync(process.execPath, [SCRIPT, '--current', input, '--out', output], {encoding: 'utf8'});
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /remaining: 0/);
    for (const path of [output, `${output}.report.json`]) assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(JSON.parse(readFileSync(`${output}.report.json`, 'utf8')).changed, 6);
    assert.deepEqual(readdirSync(dir).filter((name) => name.startsWith('.branding-prepared-')), []);
    const same = spawnSync(process.execPath, [SCRIPT, '--current', input, '--out', input], {encoding: 'utf8'});
    assert.equal(same.status, 1);
    const extra = spawnSync(process.execPath, [SCRIPT, '--current', input, '--out', output, '--tenant', 'medipago'], {encoding: 'utf8'});
    assert.equal(extra.status, 1);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
