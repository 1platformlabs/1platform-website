import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * The ecosystem's one critical rule: nothing under src/components/ may name an
 * external provider. The pattern is read out of the guard so the two can never drift
 * (tests/provider-lists-agree.spec.ts polices the other copy).
 */

const RULE_10 = /grep -rniE '([^']+)' \$SRC \$PROSE/;

function bannedPattern(): RegExp {
  const guard = readFileSync('scripts/check-tells.sh', 'utf8');
  const m = guard.match(RULE_10);
  expect(m, 'could not read rule 10 out of check-tells.sh').not.toBeNull();
  return new RegExp(m![1], 'i');
}

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out;
}

test('no provider name anywhere under src/components', () => {
  const banned = bannedPattern();
  const files = filesUnder('src/components');
  // Floor: an empty walk would pass while asserting nothing.
  expect(files.length).toBeGreaterThan(20);

  const offenders = files.filter((f) => banned.test(readFileSync(f, 'utf8')));
  expect(offenders, offenders.join('\n')).toEqual([]);

  // Control: the pattern must actually catch a seeded name — a regex that
  // rotted to matching nothing would leave this green forever.
  expect(banned.test('we bill through Str' + 'ipe')).toBe(true);
});
