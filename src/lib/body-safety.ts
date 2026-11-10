/**
 * Pure checks on the SOURCE text of a Core post body (no I/O): the first of the two
 * barriers before a body reaches a reader. The second one, on the rendered HTML, is
 * `renderedBodyIsSafe` in `editorial-render.ts`.
 */

/** Raw HTML would pass through the renderer (F0). The Core refuses it at write
 * time; the site refuses to render it too. Code spans and fences are ignored. */
export function bodyHasRawHtml(body: string): boolean {
  let inFence = false
  for (const raw of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (/<\s*[/!?a-zA-Z]/.test(stripCodeSpans(raw))) return true
  }
  return false
}

/**
 * Inline code removed the way CommonMark reads it: a run of N backticks closes only at
 * the next run of exactly N, and a backtick escaped with `\` is literal text, never a
 * delimiter. Treating `` \` `` as a delimiter hid `<a onclick>` between two escaped
 * backticks while the renderer emitted the tag (red team, deploy-prod 2026-11-10).
 * Conservative on purpose: when in doubt the text stays visible to the check.
 */
export function stripCodeSpans(line: string): string {
  const masked = line.replace(/\\./g, (pair) => (pair === '\\`' ? '\\x' : pair))
  const runs = [...masked.matchAll(/`+/g)]
  let out = ''
  let pos = 0
  for (let i = 0; i < runs.length; i++) {
    const opener = runs[i]
    const j = runs.findIndex((r, k) => k > i && r[0].length === opener[0].length)
    if (j === -1) continue
    const closer = runs[j]
    const end = closer.index! + closer[0].length
    out += line.slice(pos, opener.index) + ' '.repeat(end - opener.index!)
    pos = end
    i = j
  }
  return out + line.slice(pos)
}
