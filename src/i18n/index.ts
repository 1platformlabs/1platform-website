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

const DICTIONARIES: Record<Locale, Record<string, string>> = {
  en: buildDictionary('en'),
  es: buildDictionary('es'),
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
function assertParity(): void {
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

assertParity();

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
 * Pass a locale when the caller already knows it (page-content components take
 * it as a prop); pass `Astro.url.pathname` when it has to be derived.
 */
export function useI18n(localeOrPath: Locale | string): PageI18n {
  const locale: Locale = (LOCALES as readonly string[]).includes(localeOrPath)
    ? (localeOrPath as Locale)
    : localeFromPath(localeOrPath);

  return {
    locale,
    t: createTranslator(locale, DICTIONARIES[locale]),
    l: (href: string) => localizePath(href, locale),
  };
}

export { DEFAULT_LOCALE, LOCALES, localeFromPath, localizePath };
export type { Locale, Translator };
