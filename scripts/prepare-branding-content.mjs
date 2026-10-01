#!/usr/bin/env node
/** Offline, tenant-scoped preparation. No network, credentials, API or DB client. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, renameSync, existsSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CATALOGUES = new Set(['@infrastructure-home', '@photographic-interiors', '@components/site-chrome']);
const RETIRED_FAQ = {
  'photographic.faq.items.3.question': '¿En qué departamentos está disponible?',
  'photographic.faq.items.3.answer': 'En toda Guatemala, en todos sus departamentos. Contáctenos para coordinar el alta de su consultorio.',
};
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (message) => { throw new PreparationError(message); };
export class PreparationError extends Error {}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { fail('Cannot read a valid JSON input; contents withheld'); }
}
function uniqueStrings(value, label) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string') || new Set(value).size !== value.length) fail(`${label}: expected unique strings`);
}
function routeValid(route, shared = true) {
  if (typeof route !== 'string' || route.length > 2048) return false;
  if (shared && /^@[a-z0-9]([a-z0-9/_-]{0,60}[a-z0-9])?$/.test(route)) return true;
  if (!route.startsWith('/')) return false;
  const pieces = route.split('/');
  return (route.endsWith('/') ? pieces.slice(1, -1) : pieces.slice(1)).every(part => /^[A-Za-z0-9._~%!$&'()*+,;=@:-]+$/.test(part));
}
function noCredentials(value) {
  // Inputs contain public copy and administrative publication metadata, never auth material.
  const json = JSON.stringify(value);
  if (/\b(?:ak|sk)-[A-Za-z0-9_-]{16,}\b|\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/.test(json)) fail('Credential-shaped data detected; values withheld');
}

/** Matches the seed's full-document uniqueness/parity boundary, including drafts. */
export function validateSnapshot(snapshot, tenant) {
  if (!['oneplatform', 'medipago'].includes(tenant)) fail('Unsupported tenant');
  if (!object(snapshot) || snapshot.tenant_slug !== tenant) fail('Snapshot tenant mismatch');
  uniqueStrings(snapshot.locales, 'locales');
  if (!snapshot.locales.length || snapshot.locales.some(locale => !['en', 'es'].includes(locale))) fail('Unsupported or empty locales');
  if (snapshot.default_locale !== undefined && !snapshot.locales.includes(snapshot.default_locale)) fail('default_locale is not declared');
  uniqueStrings(snapshot.published_routes, 'published_routes');
  if (snapshot.published_routes.some(route => !routeValid(route, false))) fail('Invalid published route');
  if (!Array.isArray(snapshot.documents) || !snapshot.documents.length) fail('A complete snapshot must contain documents');
  const identities = new Set();
  const owners = new Map(snapshot.locales.map(locale => [locale, new Map()]));
  for (const document of snapshot.documents) {
    if (!object(document) || !routeValid(document.route) || !owners.has(document.locale)) fail('Invalid document route or locale');
    if (document.tenant_slug !== undefined && document.tenant_slug !== tenant) fail('Document tenant mismatch');
    if (typeof document.published !== 'boolean') fail('Every document must declare its publication state');
    const identity = `${document.locale}:${document.route}`;
    if (identities.has(identity)) fail('Duplicate document identity');
    identities.add(identity);
    if (!object(document.blocks) || Object.keys(document.blocks).length > 600) fail('Invalid blocks or more than 600 keys in one document');
    for (const [key, value] of Object.entries(document.blocks)) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(key) || typeof value !== 'string' || !value.trim() || [...value].length > 8000) fail('Invalid content key or value; contents withheld');
      if (owners.get(document.locale).has(key)) fail('Duplicate content key in a locale');
      owners.get(document.locale).set(key, document);
    }
  }
  const union = new Set([...owners.values()].flatMap(keys => [...keys.keys()]));
  if ([...owners.values()].some(keys => keys.size !== union.size)) fail('Content key parity differs across locales (drafts included)');
  if (snapshot.manifest !== undefined) validateManifest(snapshot, tenant);
  noCredentials(snapshot);
  return owners;
}
function validateManifest(snapshot, tenant) {
  const manifest = snapshot.manifest;
  if (!object(manifest) || manifest.slug !== tenant) fail('Manifest tenant mismatch');
  uniqueStrings(manifest.locales, 'manifest.locales');
  uniqueStrings(manifest.pages, 'manifest.pages');
  if (JSON.stringify([...manifest.locales].sort()) !== JSON.stringify([...snapshot.locales].sort())) fail('Manifest locales differ from snapshot');
  if (JSON.stringify([...manifest.pages].sort()) !== JSON.stringify([...snapshot.published_routes].sort())) fail('Manifest routes differ from snapshot');
  if (manifest.default_locale !== undefined && !manifest.locales.includes(manifest.default_locale)) fail('Manifest default locale is not declared');
  if (snapshot.default_locale !== undefined && snapshot.default_locale !== manifest.default_locale) fail('Manifest default locale differs from snapshot');
  if (!object(manifest.theme) || !object(manifest.destinations)) fail('Manifest theme and destinations are required');
}

/** Derive ONLY the epic-owned source documents. Never relabel 1Platform as Medipago. */
export function loadOverlay(tenant) {
  if (tenant === 'oneplatform') {
    const temp = mkdtempSync(join(tmpdir(), 'branding-export-'));
    try {
      const out = join(temp, 'catalogues.json');
      execFileSync(process.execPath, ['scripts/export-site-content.mjs', '--out', out, '--slug', tenant], {cwd: ROOT, stdio: 'pipe'});
      const exported = readJson(out);
      validateSnapshot(exported, tenant);
      const documents = exported.documents.filter(document => CATALOGUES.has(document.route));
      if (documents.length !== CATALOGUES.size * exported.locales.length) fail('Missing epic catalogue');
      return {tenant_slug: tenant, published_routes: [], locales: exported.locales, documents};
    } catch (error) {
      if (error instanceof PreparationError) throw error;
      fail('Catalogue export failed; run export-site-content.mjs --check separately');
    } finally { rmSync(temp, {recursive: true, force: true}); }
  }
  if (tenant !== 'medipago') fail('Unsupported tenant');
  const fixture = readJson(join(ROOT, 'tests/fixtures/photographic-site.json'));
  if (fixture.tenant?.slug !== tenant || fixture.pagesResponse?.data?.slug !== tenant) fail('Approved Medipago fixture tenant mismatch');
  const data = fixture.pagesResponse.data;
  const all = {tenant_slug: tenant, published_routes: fixture.tenant.pages, locales: fixture.tenant.locales, documents: data.pages};
  validateSnapshot(all, tenant);
  const messages = Object.assign({}, ...data.pages.map(page => page.blocks));
  const messageKeys = Object.keys(messages).sort();
  if (JSON.stringify(messageKeys) !== JSON.stringify(Object.keys(data.messages).sort()) || messageKeys.some(key => messages[key] !== data.messages[key])) fail('Approved Medipago fixture messages differ from its documents');
  const documents = data.pages.map(document => ({...document, blocks: Object.fromEntries(Object.entries(document.blocks).filter(([key]) => key.startsWith('photographic.')))})).filter(document => Object.keys(document.blocks).length);
  return {tenant_slug: tenant, published_routes: [], locales: all.locales, documents};
}

function manifestPatch(snapshot, tenant) {
  if (tenant === 'medipago') return {};
  if (!snapshot.manifest) fail('oneplatform requires its current administrative manifest in snapshot.manifest');
  const {theme, destinations} = snapshot.manifest;
  if (!/^#[0-9a-f]{6}$/i.test(theme.accent_contrast ?? '') || ['docs', 'app', 'support', 'status'].some(key => !own(destinations, key))) fail('Incomplete current manifest theme or destinations');
  return {
    home_template: 'photographic-service',
    theme: {...theme, accent: '#2854a7', display_font: 'manrope'},
    destinations: {...destinations, support: 'https://wa.me/50253946564'},
  };
}

/** Update in the existing key owner, keeping documents, metadata and publication flags. */
export function prepareBrandingContent(current, tenant, overlay = loadOverlay(tenant)) {
  validateSnapshot(current, tenant);
  validateSnapshot(overlay, tenant);
  if (current.locales.some(locale => !overlay.locales.includes(locale))) fail('No approved overlay for a declared locale');
  const patch = manifestPatch(current, tenant);
  const fixture = structuredClone(current);
  const owners = validateSnapshot(fixture, tenant);
  const changes = [];
  if (tenant === 'medipago') {
    for (const [locale, keys] of owners) {
      if ([...keys.keys()].some(key => /^photographic\.faq\.items\.(?:[4-9]|\d{2,})\./.test(key))) fail('Unreviewed extra Medipago FAQ; refusing to retire custom content');
      const retired = Object.keys(RETIRED_FAQ).filter(key => keys.has(key));
      if (retired.length && retired.length !== 2) fail('Incomplete legacy Medipago coverage FAQ');
      for (const key of retired) {
        const owner = keys.get(key);
        const before = owner.blocks[key];
        if (before !== RETIRED_FAQ[key]) fail('Legacy Medipago FAQ differs from the approved retirement; contents withheld');
        delete owner.blocks[key];
        keys.delete(key);
        changes.push({kind: 'retired-approved-faq', route: owner.route, locale, key, before, after: null, before_sha256: hash(before), after_sha256: hash(null)});
      }
    }
  }
  for (const source of overlay.documents) {
    if (!owners.has(source.locale)) continue;
    if (tenant === 'oneplatform' && !CATALOGUES.has(source.route)) fail('Overlay contains an unowned 1Platform catalogue');
    const keys = owners.get(source.locale);
    for (const [key, value] of Object.entries(source.blocks)) {
      if (tenant === 'medipago' && !key.startsWith('photographic.')) fail('Medipago overlay contains foreign branding keys');
      let owner = keys.get(key);
      if (!owner) {
        owner = fixture.documents.find(document => document.route === source.route && document.locale === source.locale);
        if (!owner) {
          owner = {route: source.route, locale: source.locale, published: source.published, blocks: {}};
          fixture.documents.push(owner);
        }
        keys.set(key, owner);
      }
      const before = own(owner.blocks, key) ? owner.blocks[key] : null;
      if (before !== value) {
        owner.blocks[key] = value;
        changes.push({kind: before === null ? 'added' : 'updated', route: owner.route, locale: owner.locale, key, before_sha256: hash(before), after_sha256: hash(value)});
      }
    }
  }
  validateSnapshot(fixture, tenant);
  const pendingPublication = [...new Set(overlay.documents.flatMap(source => Object.keys(source.blocks).flatMap(key => {
    const owner = owners.get(source.locale)?.get(key);
    return owner && !owner.published ? [`${owner.locale}:${owner.route}`] : [];
  })))];
  return {fixture, manifestPatch: patch, report: {
    tenant_slug: tenant, mode: 'offline-preparation-only', input_sha256: hash(current), output_sha256: hash(fixture), overlay_sha256: hash(overlay), manifest_patch_sha256: hash(patch),
    documents_before: current.documents.length, documents_after: fixture.documents.length,
    published_routes_unchanged: true, existing_publication_states_unchanged: true,
    manifest_before_sha256: current.manifest ? hash(current.manifest) : null,
    manifest_after_sha256: current.manifest ? hash({...current.manifest, ...patch}) : null,
    retained_unpublished_overlay_documents: pendingPublication,
    prerequisite: 'Administrative snapshot of ALL SitePages, including unpublished; completeness cannot be inferred offline', changes,
  }};
}

function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--current', '--out', '--tenant'].includes(key) || own(options, key) || !args[i + 1] || args[i + 1].startsWith('--')) fail('Usage: prepare-branding-content.mjs --current snapshot.json --out prepared.json --tenant oneplatform|medipago');
    options[key] = args[i + 1];
  }
  if (Object.keys(options).length !== 3) fail('Required: --current, --out, --tenant');
  const input = resolve(options['--current']);
  const output = resolve(options['--out']);
  const paths = [output, `${output}.manifest-patch.json`, `${output}.report.json`];
  if (paths.some(path => path === input || (existsSync(path) && realpathSync(path) === realpathSync(input)))) fail('Output must not replace the input snapshot');
  const prepared = prepareBrandingContent(readJson(input), options['--tenant']);
  mkdirSync(dirname(output), {recursive: true});
  const staging = mkdtempSync(join(dirname(output), '.branding-prepared-'));
  try {
    [prepared.fixture, prepared.manifestPatch, prepared.report].forEach((value, index) => writeFileSync(join(staging, String(index)), JSON.stringify(value, null, 2) + '\n', {mode: 0o600}));
    paths.forEach((path, index) => renameSync(join(staging, String(index)), path));
  } finally { rmSync(staging, {recursive: true, force: true}); }
  console.log(`Prepared ${prepared.report.documents_after} documents; ${prepared.report.changes.length} key changes; no API/DB writes`);
  if (prepared.report.retained_unpublished_overlay_documents.length) console.log('Publication review required: existing unpublished documents remain unpublished');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof PreparationError ? error.message : 'Preparation failed; input contents withheld'); process.exitCode = 1; }
}
