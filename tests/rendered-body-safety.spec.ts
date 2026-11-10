/**
 * The two barriers a Core post body crosses before reaching a reader
 * (blog-sitio-de-marca-generado): `bodyHasRawHtml` on the source text and
 * `renderedBodyIsSafe` on what the renderer emits. Measured against the REAL
 * renderer, never a stand-in.
 *
 * Red team, deploy-prod 2026-11-10: an escaped backtick (`` \` ``) fooled the
 * source check (it took it for a code delimiter) and a `>` inside a quoted
 * attribute fooled the rendered check (it ended the tag there), so
 * `<a href="/x>" onclick="…">` reached the page through both.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { bodyHasRawHtml, stripCodeSpans } from '../src/lib/body-safety'
import { renderBody, renderedBodyIsSafe } from '../src/lib/editorial-render'

const ROOT = process.cwd()
const platform = JSON.parse(readFileSync(join(ROOT, 'src/data/blog-fixture.json'), 'utf8')) as {
  posts: { slug: string; body: string }[]
}
const editorial = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/editorial-tenants.json'), 'utf8')) as {
  tenants: { posts: { slug: string; body: string }[] }[]
}
const REAL = [...platform.posts, ...editorial.tenants.flatMap((t) => t.posts)]

const HOSTILE = [
  'Texto \\` <a href="/x>" onclick="alert(1)">clic</a> \\`',
  'Texto \\` <span style="position:fixed;inset:0;z-index:9;background:#fff">falso</span> \\`',
  '[x\n](javascript:alert(1))',
  '<script>alert(1)</script>',
  'a <img src=x onerror=alert(1)> b',
  '<a href="https://ok.example" onmouseover="alert(1)">x</a>',
  '<svg/onload=alert(1)>',
  '<!-- x --><b>y</b>',
]

/** Live markup, not text the renderer already escaped (`&lt;svg…` is harmless). */
const LIVE = /<(?:script|img|svg|iframe|object|embed)\b|\son[a-z]+\s*=|href\s*=\s*["']?\s*javascript:|position\s*:\s*fixed/i

test.describe('the barriers of a Core post body', () => {
  test('every real body (platform + editorial fixtures) is accepted by both', async () => {
    expect(REAL.length).toBeGreaterThan(20)
    for (const post of REAL) {
      expect(bodyHasRawHtml(post.body), `${post.slug}: source`).toBe(false)
      expect(renderedBodyIsSafe((await renderBody(post.body)).html), `${post.slug}: rendered`).toBe(true)
    }
  })

  test('no hostile body reaches the page as live markup; the escaped-backtick ones are refused by both checks', async () => {
    for (const body of HOSTILE) {
      const html = (await renderBody(body)).html
      const live = LIVE.test(html)
      expect(!bodyHasRawHtml(body) && renderedBodyIsSafe(html) && live, `${JSON.stringify(body)} → ${html}`).toBe(false)
      expect(renderedBodyIsSafe(html) && live, `rendered check alone: ${html}`).toBe(false)
    }
    for (const body of HOSTILE.slice(0, 2)) {
      expect(bodyHasRawHtml(body)).toBe(true)
      expect(renderedBodyIsSafe((await renderBody(body)).html)).toBe(false)
    }
  })

  test('code spans: an escaped backtick is text, a real span is blanked', () => {
    expect(stripCodeSpans('a `<b>` c')).not.toContain('<b>')
    expect(stripCodeSpans('a \\`<b>\\` c')).toContain('<b>')
    expect(stripCodeSpans('a ``x`<b>`` c')).not.toContain('<b>')
    expect(stripCodeSpans('unclosed `<b> here')).toContain('<b>')
  })

  test('style only carries alignment and the highlighter colours and scroll', () => {
    expect(
      renderedBodyIsSafe(
        '<pre class="astro-code" style="background-color:#24292e;color:#e1e4e8; overflow-x: auto;" tabindex="0" data-language="bash"></pre>',
      ),
    ).toBe(true)
    expect(renderedBodyIsSafe('<td style="text-align:center">x</td>')).toBe(true)
    expect(renderedBodyIsSafe('<span style="color:#ff0000;--shiki-dark:#222">x</span>')).toBe(true)
    expect(renderedBodyIsSafe('<span style="position:fixed">x</span>')).toBe(false)
    expect(renderedBodyIsSafe('<span style="background:url(https://e.example/x)">x</span>')).toBe(false)
  })
})
