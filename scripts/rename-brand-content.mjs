#!/usr/bin/env node
/**
 * Offline brand rename of the `oneplatform` SitePages (website-rebranding-one-platform D-1/D-2).
 *
 * Input: a COMPLETE administrative snapshot of the tenant (every document,
 * published or not), the same shape `prepare-branding-content.mjs` reads.
 * Output: the full fixture with every value that names the old brand rewritten,
 * plus a report listing each changed key (before and after), the keys that were
 * already renamed, and how many values still carry the old brand ("remaining",
 * which must be 0). No network, no credentials, no API or DB client: the seed
 * (`seed_site_pages.py --verify` with explicit --uri/--db) applies the fixture.
 *
 * Rules:
 *  - `1Platform(?! Labs)` becomes `One Platform` ("1Platform API" → "One Platform API",
 *    "1Platform's" → "One Platform's").
 *  - "1Platform Labs" — the legal entity — stays literal.
 *  - Lower-case `1platform` (domains, slugs, mail) is a different token and is not touched.
 *  - Text inside a URL is never rewritten.
 *  - Routes, documents, locales, metadata and `published` are kept as they are.
 *
 * It is a separate script and not a mode of the preparer on purpose: the
 * preparer's parser takes exactly three options and its overlay refuses routes
 * outside the three approved catalogues, while this rename touches every route.
 */
import {createHash} from 'node:crypto';
import {readFileSync, existsSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PreparationError, validateSnapshot, writePrivateJson} from './prepare-branding-content.mjs';

export const TENANT = 'oneplatform';
export const OLD_BRAND = /1Platform(?! Labs)/g;
export const NEW_BRAND = 'One Platform';
const URL_PATTERN = /https?:\/\/[^\s"'<>)]+/g;

const fail = (message) => { throw new PreparationError(message); };
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Apply `fn` to the parts of `value` that are not inside a URL. */
function outsideUrls(value, fn) {
  let out = '';
  let last = 0;
  for (const match of value.matchAll(URL_PATTERN)) {
    out += fn(value.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return out + fn(value.slice(last));
}

export function renameValue(value) {
  return outsideUrls(value, (part) => part.replace(OLD_BRAND, NEW_BRAND));
}

/** Count of old-brand mentions outside URLs; `remaining` in the report. */
export function oldBrandCount(value) {
  let count = 0;
  outsideUrls(value, (part) => { count += (part.match(OLD_BRAND) ?? []).length; return part; });
  return count;
}

export function renameBrandContent(current) {
  validateSnapshot(current, TENANT);
  const fixture = structuredClone(current);
  const changes = [];
  const alreadyRenamed = [];
  let remaining = 0;
  for (const document of fixture.documents) {
    for (const [key, before] of Object.entries(document.blocks)) {
      const after = renameValue(before);
      if (after !== before) {
        document.blocks[key] = after;
        changes.push({route: document.route, locale: document.locale, key, before, after});
      } else if (before.includes(NEW_BRAND)) {
        alreadyRenamed.push({route: document.route, locale: document.locale, key});
      }
      remaining += oldBrandCount(document.blocks[key]);
    }
  }
  validateSnapshot(fixture, TENANT);
  if (remaining !== 0) fail(`Old brand still present after the rename: ${remaining}`);
  const sameShape = current.documents.every((original, index) => {
    const actual = fixture.documents[index];
    return actual.route === original.route && actual.locale === original.locale && actual.published === original.published
      && JSON.stringify(Object.keys(actual.blocks)) === JSON.stringify(Object.keys(original.blocks));
  });
  if (!sameShape || fixture.documents.length !== current.documents.length
    || JSON.stringify(fixture.published_routes) !== JSON.stringify(current.published_routes)) fail('Rename changed the shape of the snapshot');
  return {fixture, report: {
    tenant_slug: TENANT, mode: 'offline-brand-rename-only', pattern: OLD_BRAND.source, replacement: NEW_BRAND,
    input_sha256: hash(current), output_sha256: hash(fixture),
    documents_before: current.documents.length, documents_after: fixture.documents.length,
    published_routes_unchanged: true, existing_publication_states_unchanged: true,
    changed: changes.length, already_renamed: alreadyRenamed.length, remaining,
    prerequisite: 'Administrative snapshot of ALL SitePages, including unpublished; completeness cannot be inferred offline',
    changes, already_renamed_keys: alreadyRenamed,
  }};
}

function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--current', '--out'].includes(key) || Object.hasOwn(options, key) || !args[i + 1] || args[i + 1].startsWith('--')) fail('Usage: rename-brand-content.mjs --current snapshot.json --out renamed.json');
    options[key] = args[i + 1];
  }
  if (Object.keys(options).length !== 2) fail('Required: --current, --out');
  const input = resolve(options['--current']);
  const output = resolve(options['--out']);
  const paths = [output, `${output}.report.json`];
  if (paths.some(path => path === input || (existsSync(path) && realpathSync(path) === realpathSync(input)))) fail('Output must not replace the input snapshot');
  let snapshot;
  try { snapshot = JSON.parse(readFileSync(input, 'utf8')); } catch { fail('Cannot read a valid JSON input; contents withheld'); }
  const {fixture, report} = renameBrandContent(snapshot);
  writePrivateJson(paths, [fixture, report]);
  console.log(`Renamed ${report.changed} values; already renamed ${report.already_renamed}; remaining: ${report.remaining}; no API/DB writes`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof PreparationError ? error.message : 'Rename failed; input contents withheld'); process.exitCode = 1; }
}
