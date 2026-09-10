import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * The catalogue and the code that reads it must agree, in both directions.
 *
 * This exists because the obvious claim — "a static build renders every page,
 * so every `t()` call runs, so an unknown key fails the build" — is false. A
 * build resolved 1046 of 1050 keys: `t('blog.updated')` sits behind
 * `updatedDate &&`, no entry sets that field, and the branch never renders.
 * Swapping it for a key that does not exist passed the build, the typecheck,
 * the design-system guard and the whole browser suite.
 *
 * So the guarantee is made true statically instead: every key a `t()` call can
 * ask for must exist, and every key the catalogue defines must be asked for by
 * something. The second half also keeps dead copy from accumulating, which
 * matters more than it sounds — an unused key still has to be translated,
 * reviewed and kept in parity forever.
 */

const SRC = 'src';
const CONTRACTUAL_CATALOGUES = ['tests/fixtures/service-lead-site.json'] as const;

// These messages belong exclusively to the runtime service-lead composition.
// Every other literal call is shared chrome or a platform page and therefore
// must remain present in the static catalogue even when an API fixture happens
// to override it. Without this boundary, deleting `breadcrumb.home` from both
// static languages stayed green because the clinic fixture masked the loss.
const CONTRACTUAL_ONLY_KEYS = new Set([
  'cta.scheduleDemo',
  'cta.scheduleDemoAria',
]);
const CONTRACTUAL_ONLY_PREFIXES = ['serviceLead.'] as const;

type ContractualCatalogueFixture = {
  pagesResponse?: {
    data?: {
      messages?: Record<string, unknown>;
    };
  };
};

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(astro|ts)$/.test(name) && !full.includes(`${join('i18n', 'messages')}`)) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

/** Every key defined across the static message modules, with its owner. */
function staticCatalogueKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.ts')) {
        const body = readFileSync(full, 'utf8');
        // Only the English half: parity is asserted at build time, so the two
        // halves are known to carry the same keys by the time this runs.
        const en = body.slice(body.indexOf('en: {'), body.indexOf('es: {'));
        for (const [, key] of en.matchAll(/^\s*'([\w.-]+)':/gm)) {
          keys.set(key, relative(SRC, full));
        }
      }
    }
  };
  walk(join(SRC, 'i18n', 'messages'));
  return keys;
}

/**
 * Keys supplied only by a tenant's API response.
 *
 * They deliberately do not live in `src/i18n/messages`: putting Clínica
 * Delta's copy in the platform catalogue would make tenant data production
 * source. The fixture is the contract exercised by the API-mode composition
 * suite, so it is the second legitimate catalogue the static guard must read.
 */
function contractualCatalogueKeys(): Map<string, string> {
  const keys = new Map<string, string>();

  for (const fixturePath of CONTRACTUAL_CATALOGUES) {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as ContractualCatalogueFixture;
    const messages = fixture.pagesResponse?.data?.messages;
    if (!messages || typeof messages !== 'object' || Array.isArray(messages)) {
      throw new Error(`${fixturePath} must expose pagesResponse.data.messages`);
    }

    for (const [key, value] of Object.entries(messages)) {
      if (typeof value !== 'string') {
        throw new Error(`${fixturePath}: message ${key} must be a string`);
      }
      keys.set(key, fixturePath);
    }
  }

  return keys;
}

/** Static platform copy plus runtime tenant copy, without duplicating values. */
function catalogueKeys(): Map<string, string> {
  const keys = staticCatalogueKeys();
  for (const [key, owner] of contractualCatalogueKeys()) {
    // When a tenant overrides shared chrome copy, retain the static owner for
    // diagnostics. Only API-only keys need the fixture as their owner.
    if (!keys.has(key)) keys.set(key, owner);
  }
  return keys;
}

/** Keys referenced literally, plus prefixes referenced through a template. */
function referencedKeys(): { literal: Set<string>; prefixes: string[] } {
  const literal = new Set<string>();
  const prefixes: string[] = [];

  for (const file of sourceFiles(SRC)) {
    // Comments are stripped first. Without this the extractor read the sentence
    // in ui.ts explaining why `t('constructor')` used to resolve, and reported
    // it as a real call — a scanner that cannot tell code from prose about code
    // is the same trap the design-system guard documents.
    const body = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const [, key] of body.matchAll(/\bt\(\s*'([\w.-]+)'/g)) literal.add(key);
    for (const m of body.matchAll(/\bplural\([^,]+,\s*'([\w.-]+)',\s*'([\w.-]+)'/g)) {
      literal.add(m[1]);
      literal.add(m[2]);
    }
    // `t(`blog.category.${slug}`)` — the prefix is known, the suffix is not,
    // so every key under that prefix counts as reachable.
    for (const [, prefix] of body.matchAll(/\bt\(\s*`([\w.-]+)\$\{/g)) prefixes.push(prefix);
    // Keys that travel through content tables are declared with `i18nKey('…')`
    // (src/i18n/key.ts) — counted as prefixes, since a table entry may be the
    // key itself or the stem of `.question`/`.answer`-style children.
    for (const [, prefix] of body.matchAll(/\bi18nKey\(\s*'([\w.-]+)'/g)) prefixes.push(prefix);
  }

  return { literal, prefixes };
}

function unknownLiteralKeys(defined: Map<string, string>, literal: Set<string>): string[] {
  return [...literal].filter((key) => !defined.has(key));
}

function sharedLiteralKeys(literal: Set<string>): Set<string> {
  return new Set(
    [...literal].filter(
      (key) =>
        !CONTRACTUAL_ONLY_KEYS.has(key) &&
        !CONTRACTUAL_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix)),
    ),
  );
}

function orphanedCatalogueKeys(
  defined: Map<string, string>,
  literal: Set<string>,
  prefixes: string[],
): string[] {
  return [...defined.entries()]
    .filter(([key]) => !literal.has(key))
    .filter(([key]) => !prefixes.some((prefix) => key.startsWith(prefix)))
    .map(([key, owner]) => `${owner}: ${key}`);
}

test('every key a t() call asks for exists in the catalogue', () => {
  const defined = catalogueKeys();
  const { literal } = referencedKeys();

  const unknown = unknownLiteralKeys(defined, literal);
  expect(unknown, `t() calls referencing keys that do not exist:\n${unknown.join('\n')}`).toEqual([]);

  // The check has to know it looked at something: a broken extractor that found
  // no calls would satisfy the assertion above trivially.
  expect(literal.size).toBeGreaterThan(400);
});

test('runtime tenant overrides cannot mask a missing shared static key', () => {
  const staticDefined = staticCatalogueKeys();
  const shared = sharedLiteralKeys(referencedKeys().literal);
  const missing = unknownLiteralKeys(staticDefined, shared);

  expect(
    missing,
    `shared t() calls missing from the static platform catalogue:\n${missing.join('\n')}`,
  ).toEqual([]);

  // CONTROL: the clinic fixture also defines this shared key. Removing it from
  // the static map must still turn the guard red instead of being masked by
  // the merged catalogue used by the broader contract check above.
  expect(contractualCatalogueKeys().has('breadcrumb.home')).toBe(true);
  staticDefined.delete('breadcrumb.home');
  expect(unknownLiteralKeys(staticDefined, shared)).toContain('breadcrumb.home');
});

test('every static or API-mode key is referenced by something', () => {
  const defined = catalogueKeys();
  const { literal, prefixes } = referencedKeys();

  const orphans = orphanedCatalogueKeys(defined, literal, prefixes);

  expect(orphans, `catalogue keys nothing reads:\n${orphans.join('\n')}`).toEqual([]);
  expect(defined.size).toBeGreaterThan(700);
});

test('control: deleting a required API-mode key is detected', () => {
  const required = 'serviceLead.hero.title';
  const staticDefined = staticCatalogueKeys();
  const contractualDefined = contractualCatalogueKeys();

  // Keep tenant copy out of the production platform catalogue, while proving
  // it is a required part of the runtime contract rather than a test waiver.
  expect(staticDefined.has(required)).toBe(false);
  expect(contractualDefined.has(required)).toBe(true);

  contractualDefined.delete(required);
  const incomplete = new Map([...staticDefined, ...contractualDefined]);
  expect(unknownLiteralKeys(incomplete, referencedKeys().literal)).toContain(required);
});
