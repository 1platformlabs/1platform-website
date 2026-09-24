import { create, type Font, type Path } from 'fontkitten'

import { BRAND_FONT_BASE64 } from './brand-fonts.generated'
import type { DisplayFont } from './site-api'

/**
 * The tenant's display face, as vector OUTLINES, for the derived brand assets.
 *
 * ── Why outlines and not `<text font-family=…>` ────────────────────────────
 * The page draws the logo mark in the tenant's display face. The favicon, the
 * touch icon and the social card used to name `DejaVu Sans` instead — the only
 * face the runtime image installs — so the three places a brand travels OUTSIDE
 * the page (a browser tab, a home screen, a WhatsApp preview) showed a generic
 * system letter next to a page that showed the brand's own. Reported on
 * medipago.1platform.pro, whose main channel is exactly that preview.
 *
 * Naming the brand face in `font-family` would not fix it: an SVG favicon is
 * rendered as an isolated image with no access to the page's fonts, and
 * `sharp` only sees what fontconfig has installed. A path needs neither, so
 * the same drawing comes out of the browser and out of the rasteriser.
 *
 * ── Failure is the old drawing, never a broken one ─────────────────────────
 * `null` means "draw it as text, as before": a system stack has no file to
 * outline, and a character the latin subset does not carry (an emoji mark, a
 * CJK name) must not become a tofu box.
 */

export interface Outline {
  /** SVG path data with the baseline at y = 0 and the pen starting at x = 0. */
  d: string
  /** Sum of the advances, in user units. */
  width: number
  /** Ink extent in user units, y pointing DOWN (so `top` is negative). */
  left: number
  right: number
  top: number
  bottom: number
}

const fonts = new Map<DisplayFont, Font | null>()

function fontFor(display: DisplayFont): Font | null {
  if (fonts.has(display)) return fonts.get(display) ?? null
  const base64 = (BRAND_FONT_BASE64 as Partial<Record<DisplayFont, string>>)[display]
  let font: Font | null = null
  if (base64) {
    try {
      const parsed = create(Buffer.from(base64, 'base64'))
      // A collection has no single face to draw with.
      font = 'glyphForCodePoint' in parsed ? (parsed as Font) : null
    } catch {
      font = null
    }
  }
  fonts.set(display, font)
  return font
}

/** Two decimals is sub-pixel at every size these assets are drawn at. */
const num = (value: number) => {
  const rounded = Math.round(value * 100) / 100
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

function pathData(path: Path): string {
  const letters = {
    moveTo: 'M',
    lineTo: 'L',
    quadraticCurveTo: 'Q',
    bezierCurveTo: 'C',
    closePath: 'Z',
  } as const
  return path.commands
    .map(({ command, args }) => letters[command] + args.map(num).join(' '))
    .join('')
}

/**
 * `text` in the tenant's display face at `fontSize`, or `null` when the face
 * cannot draw every character of it.
 */
export function outlineText(text: string, display: DisplayFont, fontSize: number): Outline | null {
  const font = fontFor(display)
  if (!font || !text) return null

  const scale = fontSize / font.unitsPerEm
  const parts: string[] = []
  let pen = 0
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const character of text) {
    const glyph = font.glyphForCodePoint(character.codePointAt(0) ?? 0)
    if (!glyph || glyph.id === 0) return null

    if (!/\s/u.test(character)) {
      const box = glyph.path.bbox
      if (Number.isFinite(box.minX)) {
        left = Math.min(left, pen + box.minX * scale)
        right = Math.max(right, pen + box.maxX * scale)
        top = Math.min(top, -box.maxY * scale)
        bottom = Math.max(bottom, -box.minY * scale)
      }
      // Font units are y-up; SVG is y-down.
      parts.push(pathData(glyph.path.scale(scale, -scale).translate(pen, 0)))
    }
    pen += glyph.advanceWidth * scale
  }

  if (!Number.isFinite(left)) return null
  return { d: parts.join(''), width: pen, left, right, top, bottom }
}

/**
 * A mark centred on `(cx, cy)` by its INK, not by its advance box: a single
 * capital's side bearings are not symmetric, and the text fallback's
 * `text-anchor="middle"` visibly pushed an M off centre.
 */
export function centredMark(
  text: string,
  display: DisplayFont,
  fontSize: number,
  cx: number,
  cy: number,
  fill: string,
): string | null {
  const outline = outlineText(text, display, fontSize)
  if (!outline) return null
  const dx = cx - (outline.left + outline.right) / 2
  const dy = cy - (outline.top + outline.bottom) / 2
  return `<path transform="translate(${num(dx)} ${num(dy)})" fill="${fill}" d="${outline.d}"/>`
}
