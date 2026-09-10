import {
  DEFAULT_LOCALE,
  LOCALES,
  createTranslator,
  localeFromPath,
  localizePath,
  type Locale,
  type Translator,
} from '@i18n/ui';

export * from '@i18n/ui';

/**
 * The per-request state this module reads, structurally.
 *
 * Typed here rather than imported from `App.Locals` so this module keeps
 * compiling in a unit test that has no Astro request — and so the dependency
 * runs the right way round: the i18n layer states what it needs, the middleware
 * satisfies it.
 */
export type I18nLocals = {
  locale: Locale;
  messages: Record<string, string>;
  localizePath: (href: string, locale: Locale) => string;
};

type MessageModule = { en: Record<string, string>; es: Record<string, string> };

/**
 * Message modules register themselves by existing.
 *
 * The alternative — one big `en.ts` plus one big `es.ts` — makes every page's
 * copy a shared file, which means two people (or two agents) translating two
 * unrelated pages collide on every edit. Globbing keeps each page's copy in its
 * own module and removes the shared file entirely.
 *
 * The trade-off is that the key union is no longer statically known, so `t()`
 * is not autocompleted. `defineMessages` still makes a missing Spanish key a
 * compile error in the module where it belongs, and `t()` throws rather than
 * falling back to English.
 *
 * That throw is NOT a complete net, and it is worth being precise about why:
 * "the build renders every page, so every t() call runs" sounds right and is
 * false. A `t()` on a branch that never renders — `blog.updated`, behind an
 * `updatedDate` no entry sets — can name a key that does not exist and pass the
 * build, the typecheck and the browser suite. `tests/i18n-catalogue.spec.ts`
 * closes that statically, in both directions.
 */
const modules = import.meta.glob<{ default: MessageModule }>('./messages/**/*.ts', {
  eager: true,
});

function buildDictionary(locale: Locale): Record<string, string> {
  const dictionary: Record<string, string> = {};
  const origin: Record<string, string> = {};

  for (const [path, module] of Object.entries(modules)) {
    const messages = module.default?.[locale];
    if (!messages) {
      throw new Error(`[i18n] Message module ${path} has no default export for locale "${locale}".`);
    }
    for (const [key, value] of Object.entries(messages)) {
      // Two modules owning the same key is how one page silently rewrites
      // another page's copy. Cheap to detect here, invisible otherwise.
      if (Object.hasOwn(dictionary, key)) {
        throw new Error(
          `[i18n] Duplicate key "${key}" defined in both ${origin[key]} and ${path}. ` +
            'Each key belongs to exactly one message module.',
        );
      }
      dictionary[key] = value;
      origin[key] = path;
    }
  }

  return dictionary;
}

/**
 * The repo catalogues, built ON FIRST USE and not at import.
 *
 * ⚠️ THIS LAZINESS IS THE OTHER HALF OF D-11, and it was found by measuring
 * rather than by reasoning. Moving `assertParity()` out of module scope removed
 * ONE of the three throws that could fire while this module loads; the other
 * two live in `buildDictionary` itself, and both were still reachable:
 *
 *   a key defined by two modules       -> throws at IMPORT
 *   a module missing one locale half   -> throws at IMPORT
 *
 * Built eagerly, either of those is an exception in the long-lived process that
 * serves EVERY tenant — including the ones whose own copy is fine — on the first
 * request that loads this chunk. Exactly the blast radius D-11 was moved to
 * avoid.
 *
 * Built lazily, they cannot happen in production at all: with
 * `SITE_MANIFEST_SOURCE` at its default (`api`) the tenant's copy comes from the
 * API and NOTHING here is ever consulted, so the catalogues are never built. In
 * `repo` mode — a laptop, the browser suite — they are built on first use and
 * the two throws still fire, loudly, where a developer sees them.
 *
 * The type stays `Record<Locale, …>` through the accessor, so no caller changes.
 */
const CACHE: Partial<Record<Locale, Record<string, string>>> = {};

function dictionary(locale: Locale): Record<string, string> {
  const built = CACHE[locale] ?? buildDictionary(locale);
  CACHE[locale] = built;
  return built;
}

const DICTIONARIES: Record<Locale, Record<string, string>> = {
  get en() {
    return dictionary('en');
  },
  get es() {
    return dictionary('es');
  },
};

/**
 * Parity, enforced at build rather than only in the type system.
 *
 * `defineMessages` already types Spanish against English, so a gap is a
 * compile error — but `astro build` does not typecheck, so on its own that
 * guarantee only holds for whoever remembers to run `npm run typecheck`. A
 * guarantee that depends on remembering is not one. This runs on every build,
 * for everyone, and costs a set comparison.
 */
export function assertParity(): void {
  const en = Object.keys(DICTIONARIES.en);
  const es = Object.keys(DICTIONARIES.es);

  const missing = en.filter((key) => !Object.hasOwn(DICTIONARIES.es, key));
  const extra = es.filter((key) => !Object.hasOwn(DICTIONARIES.en, key));

  // An empty value is a gap that comparing key sets cannot see: it type-checks,
  // it satisfies parity, and `t()` returns it happily. It renders as a blank
  // heading — which is worse than a missing key, because nothing anywhere goes
  // red and the page merely looks unfinished.
  const blank = [...LOCALES].flatMap((locale) =>
    Object.entries(DICTIONARIES[locale])
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => `  empty ${locale} value: ${key}`),
  );

  if (missing.length || extra.length || blank.length) {
    const lines = [
      '[i18n] The catalogues are out of sync.',
      ...missing.map((k) => `  missing from Spanish: ${k}`),
      ...extra.map((k) => `  only in Spanish: ${k}`),
      ...blank,
    ];
    throw new Error(lines.join('\n'));
  }
}

/**
 * ⚠️ `assertParity()` IS NO LONGER CALLED AT MODULE SCOPE, and that is the point.
 *
 * Its docstring above says it "runs on every build, for everyone". Both halves
 * of that stopped being true, and the measurement is worth writing down because
 * the comment survived the change that falsified it:
 *
 * · It does not run at build. With `output: 'server'` and no prerendered route,
 *   Astro skips page generation entirely (`generatePages` returns early when
 *   there is nothing to generate), so no page module is ever executed by
 *   `astro build`. Verified on this tree: the built `dist/server/entry.mjs`
 *   does not import the catalogue chunk at all — the route chunks do.
 * · So where it DID run was production, at module scope, inside the long-lived
 *   Node process that serves every tenant. A catalogue imbalance was not a red
 *   build. It was a throw on the first request that loaded the chunk, for every
 *   host at once, including tenants whose own copy was fine.
 *
 * D-11 therefore moves the guarantee rather than the code. Parity of the
 * TENANT'S copy is enforced where it can still be REFUSED — the API's write
 * path (`SitePageService.assert_content_parity`, and the seed's own check
 * before it writes a byte). Parity of the repo catalogues, which are still the
 * source in `SITE_MANIFEST_SOURCE=repo`, is asserted by
 * `tests/i18n-parity.spec.ts`, in CI, where a failure is a red test instead of
 * an outage.
 *
 * The function stays exported and unchanged. Its ONE caller is
 * `tests/i18n-parity.spec.ts` — said plainly, because an earlier draft of this
 * comment claimed there were two and a reader would have gone looking for a
 * second one that does not exist.
 */

/** Every key defined across all modules, for the parity test. */
export function dictionaryFor(locale: Locale): Record<string, string> {
  return DICTIONARIES[locale];
}

export type PageI18n = {
  /** The page's locale. */
  locale: Locale;
  /** Translate a key. Throws on an unknown key rather than falling back. */
  t: Translator;
  /** Localise an internal path to this page's locale. */
  l: (href: string) => string;
};

/**
 * The accessor every page and component uses.
 *
 * ⚠️ PASS `Astro.locals` AS THE SECOND ARGUMENT. It is what makes the copy
 * belong to the tenant being served, and it is threaded EXPLICITLY through
 * every call site rather than read from a module-level "current request".
 *
 * That explicitness is the decision, not an accident of refactoring. This is a
 * long-lived process serving concurrent requests for different hosts, and D-27
 * is unambiguous about where per-request state may live: `context.locals`, and
 * nowhere else. `AsyncLocalStorage` would have avoided touching 44 call sites
 * and would have been safe, but it hides the dependency exactly where a reader
 * needs to see it — the question "whose words are these?" should be answerable
 * from the line that renders them.
 *
 * With no `locals` the repo catalogues answer, which is what a unit test and
 * `SITE_MANIFEST_SOURCE=repo` want. That is not a production fallback: the
 * middleware always populates `locals`, and a request that could not get its
 * tenant's copy is answered with a 503 before any component runs — never with
 * the platform's own words under somebody else's domain.
 *
 * @param localeOrPath a `Locale` when the caller already knows it (page-content
 *                     components take it as a prop), or `Astro.url.pathname`
 * @param locals       `Astro.locals` — the tenant's resolved locale, dictionary
 *                     and path localiser
 */
export function useI18n(localeOrPath: Locale | string, locals?: I18nLocals): PageI18n {
  const explicit: Locale | null = (LOCALES as readonly string[]).includes(localeOrPath)
    ? (localeOrPath as Locale)
    : null;

  // The tenant's own locale wins over deriving one from the path: the path
  // rule is a property of the TOPOLOGY (English at the root, Spanish under
  // /es/), and a monolingual Spanish tenant has neither prefix nor English.
  const locale: Locale = explicit ?? locals?.locale ?? localeFromPath(localeOrPath);

  const dictionary = locals?.messages ?? DICTIONARIES[locale];
  const localise = locals?.localizePath ?? localizePath;

  return {
    locale,
    t: createTranslator(locale, dictionary),
    l: (href: string) => localise(href, locale),
  };
}

export { DEFAULT_LOCALE, LOCALES, localeFromPath, localizePath };
export type { Locale, Translator };
