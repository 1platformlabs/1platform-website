#!/usr/bin/env python3
"""
Generate per-page Open Graph images for 1platform.pro Tier 1 surfaces.

Output: public/og/{solution-*,blog-*}.png — 1200×630 PNGs, ≤200 KB each.

Tier 1 surfaces (from issue #32):
  - 5 solution sub-pages
  - 3 new refocus blog posts

Reuses the brand tokens + aurora background from generate-og-default.py so
the per-page cards feel like the same family as the default fallback.

Re-run after copy changes: `python3 scripts/generate-og-images.py`.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Canvas
W, H = 1200, 630

# Brand tokens (mirror src/styles/global.css)
BG = (250, 250, 250)
TEXT = (10, 10, 10)
TEXT_SECONDARY = (82, 82, 91)
TEXT_TERTIARY = (140, 140, 150)
ACCENT = (37, 99, 235)
PURPLE = (124, 58, 237)
CYAN = (6, 182, 212)
DOT = (0, 0, 0, 14)
# PIL ignores alpha on draw.rounded_rectangle when the target is RGBA;
# use a solid tinted bg instead. accent-soft = #eff6ff (mirrors global.css).
PILL_BG = (239, 246, 255, 255)
PILL_TEXT = (37, 99, 235)

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "public" / "og"
HELVETICA = "/System/Library/Fonts/Helvetica.ttc"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    # Helvetica.ttc face map on macOS: 0=Regular, 1=Bold, 2=Oblique, 3=Bold Oblique.
    return ImageFont.truetype(HELVETICA, size=size, index=1 if bold else 0)


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    l, t, r, b = draw.textbbox((0, 0), text, font=font)
    return r - l, b - t


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    return text_size(draw, text, font)[0]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        candidate = (cur + " " + word).strip()
        if text_width(draw, candidate, font) <= max_width:
            cur = candidate
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def dot_grid(img: Image.Image, spacing: int = 28, radius: int = 1) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for y in range(spacing, H - spacing + 1, spacing):
        for x in range(spacing, W - spacing + 1, spacing):
            d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=DOT)
    img.alpha_composite(overlay)


def aurora(img: Image.Image, cx: int, cy: int, r: int, color: tuple[int, int, int], alpha: int) -> None:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=r // 2))
    img.alpha_composite(layer)


def draw_pill(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    *,
    fill: tuple[int, int, int, int] = PILL_BG,
    text_color: tuple[int, int, int] = PILL_TEXT,
    pad_x: int = 14,
    pad_y: int = 7,
) -> tuple[int, int]:
    """Draws a rounded pill. Returns (width, height) of the pill."""
    tw, th = text_size(draw, text, font)
    pill_w = tw + 2 * pad_x
    pill_h = th + 2 * pad_y + 4
    draw.rounded_rectangle(
        (x, y, x + pill_w, y + pill_h),
        radius=pill_h // 2,
        fill=fill,
    )
    draw.text((x + pad_x, y + pad_y - 1), text, font=font, fill=text_color)
    return pill_w, pill_h


def make_background() -> Image.Image:
    img = Image.new("RGBA", (W, H), BG + (255,))
    aurora(img, cx=W - 180, cy=170, r=260, color=ACCENT, alpha=60)
    aurora(img, cx=W - 80,  cy=H - 80, r=300, color=PURPLE, alpha=42)
    aurora(img, cx=W // 2,  cy=H + 80, r=320, color=CYAN, alpha=28)
    dot_grid(img)
    return img


@dataclass
class Card:
    out_name: str
    kind: str        # "Solution" / "Blog"
    title: str
    subline: str | None = None


def generate(card: Card) -> Path:
    img = make_background()
    d = ImageDraw.Draw(img)

    # Top-left: "1Platform Labs" badge
    badge_font = load_font(20, bold=False)
    draw_pill(
        d, x=80, y=90,
        text="1Platform Labs", font=badge_font,
        fill=(255, 255, 255, 220), text_color=TEXT_SECONDARY,
    )

    # Just below: kind pill (Solution / Blog)
    kind_font = load_font(18, bold=True)
    draw_pill(d, x=80, y=148, text=card.kind.upper(), font=kind_font)

    # Title — wrapped, bold black, left-aligned.
    # 5 lines max in design (one really long line drops the font down a notch).
    max_w = W - 160  # 80 px gutter each side
    title_size = 80
    while title_size >= 48:
        title_font = load_font(title_size, bold=True)
        lines = wrap_text(d, card.title, title_font, max_w)
        if len(lines) <= 3:
            break
        title_size -= 8
    line_height = int(title_size * 1.12)

    title_y = 220
    for i, line in enumerate(lines):
        d.text((80, title_y + i * line_height), line, font=title_font, fill=TEXT)

    # Subline — secondary text, smaller.
    if card.subline:
        sub_font = load_font(32, bold=False)
        sub_lines = wrap_text(d, card.subline, sub_font, max_w)
        sub_y = title_y + len(lines) * line_height + 24
        for i, line in enumerate(sub_lines[:2]):  # cap at 2 lines
            d.text((80, sub_y + i * 42), line, font=sub_font, fill=TEXT_SECONDARY)

    # Bottom-left: 1Platform mini-wordmark + URL
    url_font = load_font(26, bold=True)
    d.text((80, H - 70), "1platform.pro", font=url_font, fill=ACCENT)

    # Bottom-right: "1Platform" miniature wordmark
    mini_one_font = load_font(34, bold=True)
    mini_rest_font = load_font(28, bold=True)
    one_w = text_width(d, "1", mini_one_font)
    rest_w = text_width(d, "Platform", mini_rest_font)
    total = one_w + rest_w + 2
    mini_x = W - 80 - total
    mini_y = H - 76
    d.text((mini_x, mini_y - 2), "1", font=mini_one_font, fill=ACCENT)
    d.text((mini_x + one_w, mini_y + 2), "Platform", font=mini_rest_font, fill=TEXT)

    out = OUT_DIR / card.out_name
    out.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


CARDS = [
    # 5 solution sub-pages
    Card(
        out_name="solution-online-store.png",
        kind="Solution",
        title="Online Store Platform",
        subline="Launch a full store with checkout, payments, electronic invoicing, and your own domain — from one platform.",
    ),
    Card(
        out_name="solution-website.png",
        kind="Solution",
        title="Website Builder with AI Content",
        subline="Build a complete site with AI-generated content, a custom domain, and integrated CMS publishing.",
    ),
    Card(
        out_name="solution-content.png",
        kind="Solution",
        title="AI Content Generation API",
        subline="Articles, images, comments, and landing pages with AI. Extract keywords, publish, and submit for indexing.",
    ),
    Card(
        out_name="solution-whitelabel.png",
        kind="Solution",
        title="Whitelabel Dashboard",
        subline="Bootstrap a fully branded dashboard from one API call — theme, layout, i18n, and home KPIs.",
    ),
    Card(
        out_name="solution-payments-invoicing.png",
        kind="Solution",
        title="Payments & Electronic Invoicing",
        subline="Accept online card payments and issue compliant electronic invoices automatically. Webhook-driven, audit-ready.",
    ),
    # 3 new refocus blog posts
    Card(
        out_name="blog-launch-online-store-30-minutes.png",
        kind="Blog",
        title="How to Launch an Online Store in 30 Minutes",
        subline="Checkout, payments, invoicing, and your own domain — a practical guide from the 1Platform Team.",
    ),
    Card(
        out_name="blog-electronic-invoicing-online-business.png",
        kind="Blog",
        title="Electronic Invoicing for Online Businesses",
        subline="Regulatory rules, the workflow, and the integration model — accept payments and issue compliant invoices.",
    ),
    Card(
        out_name="blog-integrating-payments-into-your-saas.png",
        kind="Blog",
        title="Integrating Payments Into Your SaaS API",
        subline="Checkout URLs, webhooks, balances, refunds — and the architectural decisions that actually matter.",
    ),
]


def main() -> None:
    rel = lambda p: p.relative_to(REPO_ROOT)
    for card in CARDS:
        out = generate(card)
        size_kb = out.stat().st_size // 1024
        marker = "✅" if out.stat().st_size <= 200 * 1024 else "❌ OVER 200KB"
        print(f"{marker}  {rel(out)}  {size_kb} KB")


if __name__ == "__main__":
    main()
