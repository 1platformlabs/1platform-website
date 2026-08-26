import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * The list of banned provider names is written TWICE — once in
 * `scripts/check-tells.sh` (rule 10, which scans the source) and once in
 * `tests/i18n-build.spec.ts` (which scans the built Spanish HTML). The two
 * guards cover different surfaces and neither subsumes the other, so both
 * copies have to exist. What must not exist is drift between them: a name added
 * to one and forgotten in the other leaves a hole that reads as covered.
 *
 * The self-test cannot close this. Its `fresh_tree()` copies `src`, `scripts`
 * and `public/fonts` — not `tests/` — so it is structurally incapable of seeing
 * the second copy. Until this file existed, "the two lists are identical" was a
 * promise held up by the memory of whoever edited one of them.
 *
 * This reads the two patterns out of their files and compares them literally.
 */

const RULE_10 = /grep -rniE '([^']+)' \$SRC \$PROSE/;
const BANNED = /const banned\s*=\s*\n?\s*\/(.+?)\/i;/s;

function patternFrom(file: string, re: RegExp, what: string): string {
  const m = readFileSync(file, 'utf8').match(re);
  // A regex that stops matching its own file degrades into a test that
  // compares two empty strings and passes forever. Fail loudly instead.
  expect(m, `could not read the ${what} pattern out of ${file}`).not.toBeNull();
  return m![1];
}

test('the two provider blacklists are byte-identical', () => {
  const script = patternFrom('scripts/check-tells.sh', RULE_10, 'source-scan');
  const spec = patternFrom('tests/i18n-build.spec.ts', BANNED, 'HTML-scan');

  // Floor: whatever is extracted has to look like the list, not like whatever
  // else a loosened regex might have grabbed first.
  expect(script.split('|').length).toBeGreaterThan(10);
  expect(script).toContain('openai');

  expect(spec, 'the source guard and the HTML guard disagree').toBe(script);
});
