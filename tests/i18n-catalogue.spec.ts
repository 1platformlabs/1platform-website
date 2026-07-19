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

/** Every key defined across the message modules, with the file that owns it. */
function catalogueKeys(): Map<string, string> {
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
  }

  return { literal, prefixes };
}

test('every key a t() call asks for exists in the catalogue', () => {
  const defined = catalogueKeys();
  const { literal } = referencedKeys();

  const unknown = [...literal].filter((key) => !defined.has(key));
  expect(unknown, `t() calls referencing keys that do not exist:\n${unknown.join('\n')}`).toEqual([]);

  // The check has to know it looked at something: a broken extractor that found
  // no calls would satisfy the assertion above trivially.
  expect(literal.size).toBeGreaterThan(400);
});

test('every key the catalogue defines is referenced by something', () => {
  const defined = catalogueKeys();
  const { literal, prefixes } = referencedKeys();

  const orphans = [...defined.entries()]
    .filter(([key]) => !literal.has(key))
    .filter(([key]) => !prefixes.some((prefix) => key.startsWith(prefix)))
    .map(([key, owner]) => `${owner}: ${key}`);

  expect(orphans, `catalogue keys nothing reads:\n${orphans.join('\n')}`).toEqual([]);
  expect(defined.size).toBeGreaterThan(900);
});
