/**
 * i18n core — locales, path localisation and the translation accessor.
 *
 * The site is static and bilingual: English lives at the root (the ~26 URLs
 * that are already indexed keep their paths) and Spanish lives under `/es/`.
 * Nothing here reaches the browser: every string is resolved at build time.
 *
 * The one rule worth stating up front is that a missing Spanish key must break
 * the build rather than fall back to English. A silent fallback produces
 * half-translated pages that nobody notices, which is the failure mode this
 * whole module exists to prevent. Parity is enforced twice: by the type of
 * `defineMessages` at compile time, and by a throw in `t()` for the case where
 * a cast smuggled a gap past the compiler.
 */

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** BCP-47 tags used for `Intl`, `og:locale` and the sitemap. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
};

/** `og:locale` wants underscores, not hyphens. */
export const OG_LOCALES: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
};

/** Endonyms — each language names itself in itself, in both trees. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Derive the locale from a pathname.
 *
 * This is the single place that knows the URL shape. `/es` and `/es/...` are
 * Spanish; everything else is English. Note the exact-match on `/es`: a path
 * like `/establish/` must not be read as Spanish.
 */
export function localeFromPath(pathname: string): Locale {
  return pathname === '/es' || pathname.startsWith('/es/') ? 'es' : 'en';
}

/**
 * Remove the locale prefix, yielding the canonical (English-rooted) path.
 * `/es/pricing/` and `/pricing/` both return `/pricing/`.
 */
export function stripLocale(pathname: string): string {
  if (pathname === '/es' || pathname === '/es/') return '/';
  if (pathname.startsWith('/es/')) return pathname.slice(3);
  return pathname;
}

/**
 * Prefix an internal path for the target locale.
 *
 * Anything that is not a site-root path is returned untouched: absolute URLs
 * (the header's Docs link and the app CTA both point off-site), `mailto:`,
 * `tel:` and bare fragments. Prefixing those would break them, and this helper
 * is called from every link in the shell, so it has to be safe on all of them.
 */
export function localizePath(href: string, locale: Locale): string {
  if (!href.startsWith('/')) return href;
  const canonical = stripLocale(href);
  if (locale === DEFAULT_LOCALE) return canonical;
  return canonical === '/' ? '/es/' : `/es${canonical}`;
}

/**
 * The default translation map for a page: both languages, same slug.
 *
 * Pages whose twin may be absent — a blog post with no Spanish version — build
 * their own map instead and simply omit the locale that does not exist. That
 * omission is the whole mechanism: no entry means no hreflang, which means the
 * crawler is promised nothing, the switcher offers nothing, and the auto-detect
 * script has nowhere to send anyone. One absence, three correct behaviours.
 */
export function alternatesForPath(pathname: string): Record<Locale, string> {
  const canonical = stripLocale(pathname);
  return {
    en: localizePath(canonical, 'en'),
    es: localizePath(canonical, 'es'),
  };
}

/**
 * Declare a message module.
 *
 * Typing Spanish as `Record<keyof T, string>` is what makes a missing or
 * misspelled key a compile error at the point it belongs, rather than a runtime
 * surprise on one page. Keys live beside their translations so a page's copy is
 * one file, which is also what lets separate pages be worked on independently.
 */
export function defineMessages<const T extends Record<string, string>>(messages: {
  en: T;
  es: Record<keyof T, string>;
}): { en: T; es: Record<keyof T, string> } {
  return messages;
}

/** Replace `{name}` placeholders. Values are stringified as-is. */
function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match,
  );
}

/** Format a date in the page's locale. */
export function formatDate(
  date: Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  // The dates come from frontmatter as bare `YYYY-MM-DD`, which `z.coerce.date`
  // parses as UTC midnight. Formatting those in the build machine's zone would
  // render the previous day anywhere west of Greenwich, so the zone is pinned.
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { timeZone: 'UTC', ...options }).format(date);
}

export type Translator = {
  <K extends string>(key: K, vars?: Record<string, string | number>): string;
  /** Pick between two keys by count, passing `{n}` through automatically. */
  plural(n: number, one: string, other: string): string;
};

/**
 * Build the translation accessor for a locale.
 *
 * `dictionaries` is injected rather than imported so this module stays free of
 * the catalogue graph — that keeps `localizePath` and friends importable from
 * unit tests without pulling in every page's copy.
 */
export function createTranslator(
  locale: Locale,
  dictionary: Record<string, string>,
): Translator {
  const t = ((key: string, vars?: Record<string, string | number>): string => {
    // `Object.hasOwn`, not `dictionary[key] !== undefined`: a plain object
    // inherits from Object.prototype, so `t('constructor')` resolved to the
    // Object constructor and rendered "function Object() { [native code] }"
    // into an aria-label instead of throwing. About a dozen names escaped the
    // "no fallback by design" guarantee that way.
    const value = Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
    if (value === undefined) {
      throw new Error(
        `[i18n] Missing translation for key "${key}" in locale "${locale}". ` +
          'Keys must exist in both languages; there is no fallback by design.',
      );
    }
    return vars ? interpolate(value, vars) : value;
  }) as Translator;

  t.plural = (n, one, other) => t(n === 1 ? one : other, { n });

  return t;
}
