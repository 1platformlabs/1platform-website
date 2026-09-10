import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Catalogue parity — the guarantee that used to be a production throw.
 *
 * `assertParity()` was called as a top-level statement in `src/i18n/index.ts`,
 * and its own docstring claimed it "runs on every build, for everyone". F3
 * removed the call and left the measurement in place of it, because both halves
 * of that sentence were false:
 *
 * · It did not run at build. With `output: 'server'` and no prerendered route,
 *   `astro build` executes no page module at all, so the catalogue chunk is
 *   never loaded by the build.
 * · Where it DID run was production, at module scope, inside the long-lived
 *   Node process that answers for every tenant. An imbalance was not a red
 *   build; it was a throw on the first request that pulled the chunk in, for
 *   every host at once — including tenants whose own copy was perfectly fine.
 *
 * The tenant's copy is now policed by the API's write path. The REPO
 * catalogues, which are still the source under `SITE_MANIFEST_SOURCE=repo`, are
 * policed here: in CI, where a failure costs a red test instead of an outage.
 *
 * ── Why this spec loads the module through Vite ────────────────────────────
 *
 * `src/i18n/index.ts` cannot be imported by a Playwright worker. Its catalogue
 * is assembled with `import.meta.glob`, which is a Vite compile-time construct;
 * Playwright transpiles with Babel, so the call survives into the output and
 * throws `(intermediate value).glob is not a function` on the first line that
 * matters. Measured, not assumed — a plain `import('../src/i18n/index')` fails
 * before a single assertion runs.
 *
 * So the module is loaded by a real Vite SSR server (`ssrLoadModule`), which is
 * the same mechanism Astro itself uses. What runs here is the shipped function
 * over the shipped catalogue, not a reimplementation of either. A test that
 * re-derived the parity rule in its own code would agree with itself while both
 * copies drifted from `src/`.
 *
 * ── Why the negative controls hijack a module instead of editing one ───────
 *
 * `assertParity()` takes no arguments: it closes over the module-level
 * dictionaries, so a broken catalogue cannot be handed to it. The controls are
 * therefore applied where the catalogue is BUILT — a `pre` Vite plugin whose
 * `load` hook replaces the source of exactly one message module, in memory. The
 * real glob still runs, the real `buildDictionary` still runs, the real
 * `assertParity` still runs; only one file's bytes differ, and nothing is ever
 * written to disk (so no mutation can survive the run and travel into a commit).
 *
 * Every control asserts that the substitution actually happened. A hijack that
 * silently matched nothing would leave the catalogue healthy and turn each of
 * these tests into an assertion about the untouched tree — green, and measuring
 * the opposite of what it claims.
 */

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'src/i18n/index.ts';

/**
 * The module whose source the negative controls replace.
 *
 * A small leaf with no other readers, deliberately: swapping it out removes
 * `card.metaLabel.default` and `card.learnMore` from the catalogue, and since
 * both halves lose them together, parity is undisturbed by the swap itself.
 * That is what the balanced-mutation control below proves.
 */
const HIJACKED = 'src/i18n/messages/components/card.ts';

type Catalogue = { en: Record<string, string>; es: Record<string, string> };

type I18nModule = {
  assertParity: () => void;
  dictionaryFor: (locale: 'en' | 'es') => Record<string, string>;
};

type Load = {
  /** `null` when the catalogue refused to build — see `error`. */
  module: I18nModule | null;
  /** What the module threw AT IMPORT, if anything. */
  error: Error | null;
  /** How many times the hijack fired. Zero with a mutation asked for is a bug in the test. */
  applied: number;
};

/**
 * Load the real `src/i18n/index.ts`, optionally replacing one message module.
 *
 * The Vite server is created per call and closed again: each load gets its own
 * module graph, so a mutation cannot leak into the next test through a cache.
 */
async function loadI18n(replacement?: Catalogue): Promise<Load> {
  const { createServer } = await import('vite');
  let applied = 0;

  const server = await createServer({
    root: ROOT,
    // The Astro config is not loaded: it pulls in the adapter, the redirect
    // table and every integration, none of which the catalogue needs. The two
    // aliases below are the only thing `src/i18n` asks of the resolver.
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
    // `ssrLoadModule` is the only thing this file ever calls, so the `client`
    // environment Vite provisions by default has nothing to bundle for. Left on
    // the default `cacheDir` (`<root>/node_modules/.vite`), it still runs a
    // background dependency-optimizer commit on `onCrawlEnd` that renames into
    // that SAME, process-external directory — `noDiscovery: true` was tried
    // first and does NOT stop this: the commit step still runs (and still
    // renames into the shared dir) even when the crawl finds nothing to add.
    // Under Playwright's `fullyParallel`, several of this file's tests run in
    // DIFFERENT WORKER PROCESSES at once, each creating its own
    // `createServer()` against the same `root` — so their commits race on the
    // same `deps_temp_xxxx -> deps` rename. Measured, not assumed: `CI=1 npx
    // playwright test --workers=5` in a loop repeatedly hit `[vite] (client)
    // error while updating dependencies: Error: ENOTEMPTY: directory not
    // empty, rename '.../deps_temp_xxxx' -> '.../deps'` — a real cross-worker
    // race on filesystem state, not the in-process `CACHE` this file used to
    // suspect (each `createServer()` call already gets its own module graph;
    // nothing here shares memory across a process boundary).
    //
    // The fix scopes the cache directory to the WORKER, not to this call:
    // `TEST_WORKER_INDEX` is the id Playwright assigns each worker PROCESS for
    // its whole lifetime, so two calls in the SAME worker (sequential, never
    // concurrent — a worker runs one test at a time) still share and warm one
    // cache, while two calls in DIFFERENT workers never touch the same
    // directory and cannot race. A per-CALL cache dir was tried first and also
    // removes the race, but pays a full cold optimizer start on every one of
    // this file's ~14 `loadI18n()` invocations — measured 9 passed (43.7s) vs
    // 9 passed (11.7s) with the default shared dir. Falls back to `main` so a
    // direct `node --test`-style invocation outside Playwright still works.
    cacheDir: resolvePath(ROOT, `node_modules/.vite-i18n-parity-w${process.env.TEST_WORKER_INDEX ?? 'main'}`),
    resolve: {
      alias: [
        { find: /^@i18n$/, replacement: resolvePath(ROOT, 'src/i18n/index.ts') },
        { find: /^@i18n\//, replacement: `${resolvePath(ROOT, 'src/i18n')}/` },
      ],
    },
    plugins: replacement
      ? [
          {
            name: 'i18n-parity-negative-control',
            // `pre` so the substitution happens before Vite's own TypeScript
            // transform, and before the glob's members are read from disk.
            enforce: 'pre' as const,
            load(id: string) {
              const path = id.split('?')[0].replace(/\\/g, '/');
              if (!path.endsWith(HIJACKED)) return null;
              applied += 1;
              // `defineMessages` is an identity function at runtime, so the
              // replacement does not need it — and skipping it keeps the
              // control honest about what it is testing. The compile-time type
              // that makes a missing Spanish key an error is exactly the guard
              // this suite exists to back up: if it were the only thing
              // stopping these mutations, they could not be written at all.
              return `export default ${JSON.stringify(replacement)};`;
            },
          },
        ]
      : [],
  });

  let module: I18nModule | null = null;
  let error: Error | null = null;
  try {
    module = (await server.ssrLoadModule(`/${ENTRY}`)) as unknown as I18nModule;
  } catch (thrown) {
    error = thrown as Error;
  } finally {
    await server.close();
    // The cache dir is per-worker, not per-call (see above), so it stays for
    // the next test in this same worker and is left for `node_modules` cleanup
    // to handle like the rest of Vite's own cache.
  }

  return { module, error, applied };
}

/** Run `assertParity()` and hand back what it threw, or `''` if it did not. */
function parityFailure(module: I18nModule | null): string {
  expect(module, 'the catalogue did not load at all').not.toBeNull();
  try {
    (module as I18nModule).assertParity();
    return '';
  } catch (thrown) {
    return (thrown as Error).message;
  }
}

test('the repo catalogues are in parity, and the comparison is not empty', async () => {
  const { module, error, applied } = await loadI18n();
  expect(error, `the catalogue failed to load: ${error?.message}`).toBeNull();
  expect(applied, 'no mutation was requested, so nothing may have been hijacked').toBe(0);

  // The shipped function over the shipped catalogue. This is the control
  // POSITIVE: on a healthy tree it must stay silent.
  expect(() => (module as I18nModule).assertParity()).not.toThrow();

  // And the property spelled out independently of it, because `assertParity()`
  // returning `void` on a catalogue of nothing looks exactly like success. The
  // floor is what makes that indistinguishable case impossible: today the tree
  // carries 937 keys per language, and a probe that compared a handful — or
  // zero, if the glob stopped matching — goes red here rather than passing over
  // an empty set.
  const en = Object.keys((module as I18nModule).dictionaryFor('en')).sort();
  const es = Object.keys((module as I18nModule).dictionaryFor('es')).sort();

  expect(
    en.length,
    `only ${en.length} English keys were loaded (expected ~937) — a catalogue that ` +
      'compares nothing passes every parity check ever written',
  ).toBeGreaterThan(800);

  expect(
    es,
    `compared ${en.length} English keys against ${es.length} Spanish keys`,
  ).toEqual(en);

  const blank = (['en', 'es'] as const).flatMap((locale) =>
    Object.entries((module as I18nModule).dictionaryFor(locale))
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => `${locale}: ${key}`),
  );
  expect(blank, `blank values (they type-check, satisfy parity and render as nothing):\n${blank.join('\n')}`).toEqual([]);
});

test('a balanced hijack is inert — the controls below are red for the right reason', async () => {
  // The control on the controls. Every negative control here works by replacing
  // one module's source, so before believing any of them, the replacement
  // itself has to be shown NOT to be what turns the catalogue red.
  const { module, error, applied } = await loadI18n({
    en: { 'zz.parity.balanced': 'balanced' },
    es: { 'zz.parity.balanced': 'equilibrado' },
  });

  expect(applied, `the hijack of ${HIJACKED} never fired — the path is stale`).toBeGreaterThan(0);
  expect(error, `a balanced replacement must still load: ${error?.message}`).toBeNull();
  expect(parityFailure(module), 'a balanced replacement must not break parity').toBe('');

  // And it really did replace the module: the keys the real file owns are gone,
  // and the key the replacement invented is present. Without this, a `load`
  // hook that fired but returned the original bytes would look identical.
  const en = (module as I18nModule).dictionaryFor('en');
  expect(Object.hasOwn(en, 'zz.parity.balanced'), 'the replacement contributed no key').toBe(true);
  expect(Object.hasOwn(en, 'card.learnMore'), 'the real module was not replaced').toBe(false);
});

test('assertParity() catches a key that exists only in English', async () => {
  // NEGATIVE CONTROL, verified: the mutation is `card.ts` reduced to a single
  // English key with no Spanish twin. Remove the `missing` computation from
  // `assertParity()` (or its `missing.length` term from the `if`) and this goes
  // green while the site ships an untranslated string.
  const { module, error, applied } = await loadI18n({ en: { 'zz.only.en': 'orphan' }, es: {} });

  expect(applied, `the hijack of ${HIJACKED} never fired`).toBeGreaterThan(0);
  expect(error, 'an unbalanced catalogue must still IMPORT — see the blast-radius test').toBeNull();

  const failure = parityFailure(module);
  expect(failure, 'assertParity() accepted a key with no Spanish translation').not.toBe('');
  expect(failure).toContain('missing from Spanish: zz.only.en');
});

test('assertParity() catches a key that exists only in Spanish', async () => {
  // NEGATIVE CONTROL, verified: this is the direction the type system does NOT
  // cover. `defineMessages` types Spanish against English, so a missing key is
  // a compile error — but an EXTRA Spanish key satisfies `Record<keyof T,
  // string>` at every call site that reads it, and `astro check` says nothing.
  // Drop the `extra` term from the `if` in `assertParity()` and this goes green.
  const { module, error, applied } = await loadI18n({ en: {}, es: { 'zz.only.es': 'huérfana' } });

  expect(applied, `the hijack of ${HIJACKED} never fired`).toBeGreaterThan(0);
  expect(error).toBeNull();

  const failure = parityFailure(module);
  expect(failure, 'assertParity() accepted a Spanish key with no English counterpart').not.toBe('');
  expect(failure).toContain('only in Spanish: zz.only.es');
});

test('assertParity() catches a value that is empty or only whitespace', async () => {
  // NEGATIVE CONTROL, verified in both directions: an empty value type-checks,
  // satisfies the key-set comparison, and `t()` returns it happily. It renders
  // as a blank heading — worse than a missing key, because nothing goes red and
  // the page merely looks unfinished. Delete the `blank` computation (or its
  // `blank.length` term) and both halves of this test go green.
  //
  // The Spanish value is whitespace rather than `''` on purpose: `.trim()` is
  // the load-bearing character of that check, and `value === ''` would pass a
  // string of three spaces.
  const es = await loadI18n({ en: { 'zz.blank': 'present' }, es: { 'zz.blank': '   ' } });
  expect(es.applied, `the hijack of ${HIJACKED} never fired`).toBeGreaterThan(0);
  expect(parityFailure(es.module)).toContain('empty es value: zz.blank');

  const en = await loadI18n({ en: { 'zz.blank': '' }, es: { 'zz.blank': 'presente' } });
  expect(en.applied, `the hijack of ${HIJACKED} never fired`).toBeGreaterThan(0);
  expect(parityFailure(en.module)).toContain('empty en value: zz.blank');
});

test('the catalogue refuses a duplicate key defined on the SPANISH half alone', async () => {
  // This is the half of the catalogue that nothing else reads.
  // `tests/i18n-catalogue.spec.ts` slices each module from `en: {` to `es: {`
  // and scans only what is in between, on the stated grounds that "parity is
  // asserted at build time" — a premise F3 retired. So a key defined twice on
  // the Spanish side, in two different modules, is invisible to every other
  // check in this suite: the second definition silently overwrites the first
  // and one page starts wearing another page's copy.
  //
  // `buildDictionary` catches it, per locale. This test is what proves that
  // claim rather than assuming it.
  //
  // ⚠️ IT IS REFUSED AT FIRST USE, NOT AT IMPORT — and that distinction is the
  // finding this test drove. An earlier version of this spec asserted the
  // IMPORT threw, and it did: `DICTIONARIES` was built at module scope, so a
  // duplicate key (and a module missing a locale half) was an exception in the
  // long-lived process that serves EVERY tenant, on the first request that
  // loaded the chunk. That is precisely the blast radius F3 moved
  // `assertParity()` out of module scope to avoid, still reachable by two other
  // routes.
  //
  // So the catalogues became lazy. In production the default source is the API
  // and nothing here is ever consulted, which means these two throws cannot
  // fire at all; in `repo` mode they fire on first use, loudly, where a
  // developer sees them. The GUARANTEE is unchanged — a duplicate is still
  // refused, with both filenames named — only the moment moved.
  //
  // NEGATIVE CONTROL, verified: `nav.pricing` is owned by
  // `src/i18n/messages/common.ts`. Redefining it on the Spanish half of the
  // hijacked module makes the build throw. Remove the `Object.hasOwn(dictionary,
  // key)` guard in `buildDictionary` and this goes green with two modules
  // fighting over one key.
  const { module, error, applied } = await loadI18n({ en: {}, es: { 'nav.pricing': 'duplicada' } });

  expect(applied, `the hijack of ${HIJACKED} never fired`).toBeGreaterThan(0);

  // The import itself now succeeds — that is the point of the change.
  expect(module, 'importing the catalogue should no longer be able to throw').not.toBeNull();
  expect(error ?? null, 'and it should not have thrown on the way in').toBeNull();

  // The refusal happens when the Spanish catalogue is actually built.
  let thrown: Error | undefined;
  try {
    module!.dictionaryFor('es');
  } catch (err) {
    thrown = err as Error;
  }
  expect(thrown, 'the catalogue built happily with a duplicated Spanish key').toBeDefined();
  expect(thrown?.message ?? '').toContain('Duplicate key "nav.pricing"');
  // Named so the failure points at the two files that disagree, not just at the key.
  expect(thrown?.message ?? '').toContain('./messages/common.ts');

  // And the ENGLISH half, which has no duplicate, still builds — proof the
  // refusal is scoped to the locale that is broken rather than poisoning both.
  expect(() => module!.dictionaryFor('en')).not.toThrow();
});

test('the Spanish half of every message module is read, key for key', async () => {
  // The other half of the same hole. `tests/i18n-catalogue.spec.ts` never
  // parses `es: { … }` at all, so nothing outside this file has ever compared
  // what the Spanish source SAYS with what the loaded catalogue CONTAINS.
  //
  // Text on disk against evaluated module — two independent readings of the
  // same fact. They agree today at 937 apiece.
  //
  // NEGATIVE CONTROL, verified: narrow `walk()` to
  // `join(SRC, 'i18n', 'messages', 'components')` and the scanned set collapses
  // to 34 keys against 937 loaded and the floor below goes red (measured). The Vite
  // hijack used above cannot serve as the control here — it changes the loaded
  // catalogue without touching disk, so it would also make the two sides
  // disagree, but for a reason that is a lie about the source.
  const { module, error } = await loadI18n();
  expect(error).toBeNull();

  const SRC = resolvePath(ROOT, 'src');
  const scanned = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.ts')) {
        const body = readFileSync(full, 'utf8');
        const start = body.indexOf('es: {');
        if (start < 0) continue;
        for (const [, key] of body.slice(start).matchAll(/^\s*'([\w.-]+)':/gm)) {
          scanned.set(key, relative(SRC, full));
        }
      }
    }
  };
  walk(join(SRC, 'i18n', 'messages'));

  const loaded = Object.keys((module as I18nModule).dictionaryFor('es')).sort();
  const fromSource = [...scanned.keys()].sort();

  expect(
    fromSource.length,
    `the Spanish scanner found ${fromSource.length} keys (expected ~937) — a scanner ` +
      'that matches nothing agrees with an empty catalogue',
  ).toBeGreaterThan(800);

  expect(
    fromSource,
    `${fromSource.length} keys scanned from the Spanish source vs ${loaded.length} loaded`,
  ).toEqual(loaded);
});

test('an unbalanced catalogue does not throw at IMPORT — the blast radius is one red test', async () => {
  // The reason F3 moved this check out of module scope, asserted rather than
  // narrated. A top-level `assertParity()` turned a catalogue typo into a throw
  // while the chunk was being loaded, inside the process that answers for every
  // host — so one page's missing translation took down tenants whose copy was
  // fine.
  //
  // NEGATIVE CONTROL, verified: this is the exact catalogue that makes
  // `assertParity()` throw two tests above. If the call were restored to module
  // scope, the import below would throw instead of returning, `error` would be
  // non-null and this goes red.
  const { module, error, applied } = await loadI18n({ en: { 'zz.only.en': 'orphan' }, es: {} });

  expect(applied, `the hijack of ${HIJACKED} never fired`).toBeGreaterThan(0);
  expect(
    error,
    `importing the catalogue threw on an imbalance: ${error?.message}\n` +
      'That is a production outage for every tenant, not a failed test.',
  ).toBeNull();
  expect(module, 'the module did not load').not.toBeNull();

  // And the failure is still detectable — the import being quiet must not mean
  // the imbalance went unnoticed, only that noticing it is now somebody's call.
  expect(parityFailure(module)).toContain('missing from Spanish');
});

test('assertParity() is exported and never called at module scope', async () => {
  const source = readFileSync(join(ROOT, ENTRY), 'utf8');

  // Comments come out first, and the file makes that mandatory rather than
  // tidy: `src/i18n/index.ts` carries a long comment block whose whole subject
  // is `assertParity()` not being called any more. A grep for the identifier
  // reads that prose as code — the same trap `tests/i18n-catalogue.spec.ts`
  // documents when it strips comments before hunting `t()` calls.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // The stripper must be shown to have done something, in both directions:
  // if it ate the file, everything below passes vacuously; if it ate nothing,
  // the comment mention is still in play.
  expect(code, 'comment stripping removed the code as well').toContain('export function dictionaryFor');
  expect(
    (source.match(/assertParity/g) ?? []).length,
    'the file no longer mentions assertParity in prose — the stripper is now untested here',
  ).toBeGreaterThan(1);

  // Exported, because two callers must share one implementation.
  expect(code, 'assertParity() is no longer exported').toMatch(/export function assertParity\s*\(/);

  // And named exactly once in the code: the declaration. Any second occurrence
  // is a call site, and the only place a call site can be in this file is
  // module scope.
  const mentions = code.match(/assertParity/g) ?? [];
  expect(
    mentions.length,
    `assertParity is named ${mentions.length} times in the executable source; the ` +
      'declaration is the only permitted occurrence — a second one is a module-scope ' +
      'call, and its blast radius is every tenant at once',
  ).toBe(1);
});
