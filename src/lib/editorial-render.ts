/**
 * The body renderer of Core posts (blog-sitio-de-marca-generado D-8, F0).
 *
 * F0 measured it: `createSatteriMarkdownProcessor` with Astro's defaults renders
 * the 16 platform posts byte-identical (after whitespace) to the frozen
 * baseline, and its `headings` carry the same `id`s the HTML has — so the index
 * links to the anchors that exist by construction. One processor per process.
 */
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri'

export interface RenderedBody {
  html: string
  headings: { depth: number; slug: string; text: string }[]
}

let renderer: Promise<Awaited<ReturnType<typeof createSatteriMarkdownProcessor>>> | null = null

/**
 * Second, independent barrier on the RENDERED html (/verify-epic-e2e 2026-11-09).
 *
 * The Core's grammar is a set of line regexes; an unbalanced backtick
 * (`` `x`` ``) or a link split across two lines got `<img onerror>` and
 * `href="javascript:"` through it, and this renderer passes raw HTML on. So the
 * page does not trust the source text: it checks what the browser will receive.
 * Allow-list measured on the 29 real bodies (platform + editorial fixtures) plus
 * what GFM can emit (line breaks, rules, strikethrough, task lists, alignment).
 */
const SAFE_TAGS = new Set([
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h2', 'h3', 'hr', 'input', 'li', 'ol', 'p', 'pre', 'span',
  'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
])
const SAFE_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href']),
  h2: new Set(['id']),
  h3: new Set(['id']),
  pre: new Set(['class', 'data-language', 'style', 'tabindex']),
  span: new Set(['class', 'style']),
  code: new Set(['class']),
  td: new Set(['align', 'style']),
  th: new Set(['align', 'style']),
  ol: new Set(['start']),
  ul: new Set(['class']),
  li: new Set(['class']),
  input: new Set(['type', 'disabled', 'checked']),
}
const SAFE_HREF = /^(https:\/\/[^/\s]|\/(?!\/)|#)/

export function renderedBodyIsSafe(html: string): boolean {
  for (const tag of html.matchAll(/<\s*([a-zA-Z][\w:-]*)([^>]*)>/g)) {
    const name = tag[1].toLowerCase()
    if (!SAFE_TAGS.has(name)) return false
    const allowed = SAFE_ATTRS[name] ?? new Set<string>()
    for (const attr of tag[2].matchAll(/([^\s=/"']+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g)) {
      const key = attr[1].toLowerCase()
      if (!allowed.has(key)) return false
      if (key === 'href' && !SAFE_HREF.test((attr[2] ?? '').replace(/^["']|["']$/g, '').trim())) return false
      if (name === 'input' && key === 'type' && !/^["']?checkbox["']?$/i.test(attr[2] ?? '')) return false
    }
  }
  return !/<!--|<!\[CDATA\[|<\?/.test(html)
}

export async function renderBody(markdown: string): Promise<RenderedBody> {
  renderer ??= createSatteriMarkdownProcessor({})
  const out = await (await renderer).render(markdown, { frontmatter: {} })
  const headings = (out.metadata?.headings ?? []) as RenderedBody['headings']
  return { html: out.code, headings: headings.filter((h) => h.depth === 2 || h.depth === 3) }
}
