import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * The fidelity gate (LMW-12 CA-1, D-15): the geometry the redesign promised,
 * measured on every build against a versioned table — never against a
 * screenshot of the reference (different typefaces make pixel-diffing it
 * meaningless; geometry is what was measured, geometry is what is asserted).
 *
 * `assertAgainstTable` is exported through the control test below: a table
 * value that goes wrong MUST turn this spec red, and the spec proves that
 * about itself by mutating a copy of the table and expecting the failure.
 */

type ElementSpec = {
  sel: string;
  width?: number;
  height?: number;
  top?: number;
  pageY?: number;
  radius?: string;
  fontSize?: string;
  lineHeight?: string;
  letterSpacing?: string;
  fontWeight?: string;
};

type ViewportTable = {
  sections: Record<string, number>;
  elements?: ElementSpec[];
  notes?: Record<string, string>;
  /** Sections sized by their copy: the Spanish tree gets a wider tolerance
   *  on these (the table's notes carry the measured deltas). */
  contentDriven?: string[];
};

const TABLE = JSON.parse(readFileSync('tests/ref-fidelity.table.json', 'utf8')) as Record<
  string,
  ViewportTable | string
>;

const TOLERANCE = 8;

async function measure(page: Page, table: ViewportTable, spanish = false) {
  const failures: string[] = [];

  for (const [sel, expected] of Object.entries(table.sections)) {
    const box = await page.locator(sel).first().boundingBox();
    if (!box) {
      failures.push(`${sel}: not found`);
      continue;
    }
    const tolerance = spanish && table.contentDriven?.includes(sel) ? 64 : TOLERANCE;
    if (Math.abs(box.height - expected) > tolerance) {
      failures.push(`${sel}: height ${Math.round(box.height)} vs ${expected} (±${tolerance})`);
    }
  }

  for (const spec of table.elements ?? []) {
    const el = page.locator(spec.sel).first();
    const m = await el
      .evaluate((node) => {
        const r = node.getBoundingClientRect();
        const cs = getComputedStyle(node);
        return {
          width: r.width,
          height: r.height,
          top: r.top,
          pageY: r.top + (document.scrollingElement?.scrollTop ?? 0),
          radius: cs.borderRadius,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          fontWeight: cs.fontWeight,
        };
      })
      .catch(() => null);
    if (!m) {
      failures.push(`${spec.sel}: not found`);
      continue;
    }
    for (const key of ['width', 'height', 'top', 'pageY'] as const) {
      if (spec[key] !== undefined && Math.abs(m[key] - spec[key]!) > TOLERANCE) {
        failures.push(`${spec.sel}: ${key} ${Math.round(m[key])} vs ${spec[key]}`);
      }
    }
    for (const key of ['radius', 'fontSize', 'lineHeight', 'letterSpacing', 'fontWeight'] as const) {
      if (spec[key] !== undefined && m[key] !== spec[key]) {
        failures.push(`${spec.sel}: ${key} "${m[key]}" vs "${spec[key]}"`);
      }
    }
  }

  return failures;
}

for (const [viewport, size] of [
  ['1440', { width: 1440, height: 900 }],
  ['390', { width: 390, height: 844 }],
] as const) {
  for (const path of ['/', '/es/']) {
    test(`${path} at ${viewport}: every section and element measures as the table says`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);

      const table = TABLE[viewport] as ViewportTable;
      // Floor: assert the named surfaces rather than only their count. Removing
      // one row and duplicating another must never preserve a green gate.
      expect(Object.keys(table.sections).sort()).toEqual(
        [
          '.announcement',
          '#hero',
          '#canvas',
          '#personas',
          '#modules',
          '#pricing',
          '#faq',
          'footer.site-footer',
        ].sort(),
      );

      const failures = await measure(page, table, path.startsWith('/es'));
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
}

test('control: a wrong table value turns the measurement red', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const mutated = structuredClone(TABLE['1440']) as ViewportTable;
  mutated.sections['#hero'] = 800; // the real value is 860 — this MUST fail
  const failures = await measure(page, mutated);
  expect(failures.some((f) => f.startsWith('#hero'))).toBe(true);
});
