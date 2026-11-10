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
/** `style` only carries what the renderer itself emits: table alignment and the code
 * highlighter's colours and scroll. No `position`, `url()`, `inset`, `z-index`… */
const SAFE_STYLE_DECL =
  /^\s*(?:text-align\s*:\s*(?:left|center|right)|(?:background-)?color\s*:\s*#[0-9a-fA-F]{3,8}|--shiki-[\w-]+\s*:\s*#[0-9a-fA-F]{3,8}|overflow-x\s*:\s*auto)\s*$/

function styleIsSafe(value: string): boolean {
  return value
    .split(';')
    .filter((decl) => decl.trim() !== '')
    .every((decl) => SAFE_STYLE_DECL.test(decl))
}

/**
 * One tag, anchored where a `<` was found. Attribute values must be QUOTED and carry
 * no `<` or `>`: the earlier pattern stopped at the first `>` — even inside a quoted
 * value — so `<a href="/x>" onclick="…">` read as `<a href="/x>` and passed
 * (red team, deploy-prod 2026-11-10).
 */
const TAG_AT = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))?)*)\s*(\/?)>/y
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"<>]*"|'[^'<>]*'))?/g

export function renderedBodyIsSafe(html: string): boolean {
  if (/<!--|<!\[CDATA\[|<\?|<!/i.test(html)) return false
  let at = html.indexOf('<')
  while (at !== -1) {
    TAG_AT.lastIndex = at
    const tag = TAG_AT.exec(html)
    // Every `<` must open or close a well-formed allowed tag; anything else is raw
    // HTML the renderer let through: refuse the page.
    if (!tag) return false
    const [whole, closing, rawName, attrs] = tag
    const name = rawName.toLowerCase()
    if (!SAFE_TAGS.has(name)) return false
    if (closing && attrs.trim() !== '') return false
    const allowed = SAFE_ATTRS[name] ?? new Set<string>()
    for (const attr of attrs.matchAll(ATTR)) {
      const key = attr[1].toLowerCase()
      const value = (attr[2] ?? '').slice(1, -1)
      if (!allowed.has(key)) return false
      if (key === 'href' && !SAFE_HREF.test(value.trim())) return false
      if (key === 'style' && !styleIsSafe(value)) return false
      if (name === 'input' && key === 'type' && value.toLowerCase() !== 'checkbox') return false
    }
    at = html.indexOf('<', at + whole.length)
  }
  return true
}

export async function renderBody(markdown: string): Promise<RenderedBody> {
  renderer ??= createSatteriMarkdownProcessor({})
  const out = await (await renderer).render(markdown, { frontmatter: {} })
  const headings = (out.metadata?.headings ?? []) as RenderedBody['headings']
  return { html: out.code, headings: headings.filter((h) => h.depth === 2 || h.depth === 3) }
}
