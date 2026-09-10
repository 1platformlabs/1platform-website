import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

import {
  DEFAULT_MISS_BUDGET_PER_MINUTE,
  configuredMissBudget,
} from '../src/lib/resolve-tenant';

/**
 * The outage this file exists to prevent — 1platform.pro, 2026-09-10.
 *
 * `SITE_MISS_BUDGET_PER_MINUTE` reached the process as an EMPTY STRING, not as
 * an absent variable, because two mitigations that were each individually right
 * disagreed with each other:
 *
 *   - the deploy writes a line into `.env.prod` only when the value is set, so
 *     a production that wants the compiled defaults gets an EMPTY file;
 *   - `docker-compose.prod.yml` sets the variable anyway, from
 *     `${SITE_MISS_BUDGET_PER_MINUTE:-}` — because without that block the
 *     container gets no configuration channel at all.
 *
 * The reader was `Number(process.env?.X ?? 120)`. `??` does not fire for `''`,
 * and `Number('')` is 0, so the budget was ZERO. The first miss on a cold cache
 * was refused, and a refused miss never reaches the API, so the cache it would
 * have filled stayed empty and every later request missed too. The site
 * answered 503 to everything — including its own healthcheck — from the second
 * the container started, with the deploy reporting success.
 *
 * `''` is the case that mattered; the rest are here because a reader that has
 * to be told `''` is not a number should be told about `'abc'` and `'0'` too.
 */

const VAR = 'SITE_MISS_BUDGET_PER_MINUTE';

function withEnv<T>(value: string | undefined, body: () => T): T {
  const before = process.env[VAR];
  if (value === undefined) delete process.env[VAR];
  else process.env[VAR] = value;
  try {
    return body();
  } finally {
    if (before === undefined) delete process.env[VAR];
    else process.env[VAR] = before;
  }
}

test('an EMPTY STRING is absent, not zero — the regression itself', () => {
  // Reading this as a number is what took the site down: `Number('')` is 0.
  expect(Number('')).toBe(0);
  expect(withEnv('', configuredMissBudget)).toBe(DEFAULT_MISS_BUDGET_PER_MINUTE);
});

test('whitespace is absent too — a stray space in a .env line is not a budget', () => {
  expect(withEnv('   ', configuredMissBudget)).toBe(DEFAULT_MISS_BUDGET_PER_MINUTE);
});

test('an unset variable takes the default', () => {
  expect(withEnv(undefined, configuredMissBudget)).toBe(DEFAULT_MISS_BUDGET_PER_MINUTE);
});

test('a real number is honoured — the default must not swallow configuration', () => {
  expect(withEnv('50', configuredMissBudget)).toBe(50);
});

test('zero and negatives are refused: a budget of zero is an outage with a value in it', () => {
  expect(withEnv('0', configuredMissBudget)).toBe(DEFAULT_MISS_BUDGET_PER_MINUTE);
  expect(withEnv('-5', configuredMissBudget)).toBe(DEFAULT_MISS_BUDGET_PER_MINUTE);
});

test('a non-number is refused rather than becoming NaN', () => {
  expect(withEnv('abc', configuredMissBudget)).toBe(DEFAULT_MISS_BUDGET_PER_MINUTE);
});

/**
 * And the other half of the pair: the compose file really does set the variable
 * unconditionally, so the empty string above is the value production ships,
 * not a hypothetical. Read as text — same convention as
 * `deploy-fetch-refspec.spec.ts`, for the same reason.
 */
test('docker-compose.prod.yml sets the variable even when nothing configures it', () => {
  const compose = readFileSync('docker-compose.prod.yml', 'utf8');
  expect(compose).toContain('SITE_MISS_BUDGET_PER_MINUTE: "${SITE_MISS_BUDGET_PER_MINUTE:-}"');
});
