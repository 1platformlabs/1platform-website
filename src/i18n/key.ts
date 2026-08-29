/**
 * Marks a string as an i18n key when it travels through a CONTENT TABLE
 * instead of a direct `t('…')` call.
 *
 * The catalogue test (`tests/i18n-catalogue.spec.ts`) can only follow literal
 * `t('…')` calls and template prefixes; a key stored in a table and passed
 * through a variable is invisible to it, and the home's content tables
 * (personas, modules, pricing, FAQ, showcase) do exactly that. Wrapping the
 * literal in this identity function is the explicit, greppable declaration
 * "something reads this key" — the extractor counts `i18nKey('x')` as a
 * reachable PREFIX, so `x` and `x.question`-style children are covered.
 *
 * It earns that trust the same way `t('…')` does: every table entry renders on
 * every build, so a key that stops existing still fails the build loudly.
 */
export function i18nKey<K extends string>(key: K): K {
  return key;
}
