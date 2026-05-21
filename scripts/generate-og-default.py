#!/usr/bin/env python3
"""
Generate the brand-default Open Graph image at 1200x630 for 1platform.pro.

Output: public/og/default.png

Brand tokens (mirrored from src/styles/global.css):
  - bg:          #fafafa
  - text:        #0a0a0a
  - text-secondary: #52525b
  - accent (1):  #2563eb
  - purple:      #7c3aed  (used in the aurora blob — cosmos-inspired)
  - cyan:        #06b6d4

Re-run after brand changes: `python3 scripts/generate-og-default.py`.
This file ships the *script*; the output PNG is the actual deliverable
and is committed under public/og/default.png.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Canvas
W, H = 1200, 630

# Brand tokens
BG = (250, 250, 250)
TEXT = (10, 10, 10)
TEXT_SECONDARY = (82, 82, 91)
ACCENT = (37, 99, 235)
PURPLE = (124, 58, 237)
CYAN = (6, 182, 212)
DOT = (0, 0, 0, 14)  # 14/255 ≈ 5% alpha — matches global dot-grid

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT = REPO_ROOT / "public" / "og" / "default.png"

# macOS system Helvetica.ttc — face 0 = regular, face 2 = bold
HELVETICA = "/System/Library/Fonts/Helvetica.ttc"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    # Helvetica.ttc face map on macOS:
    #   0=Regular, 1=Bold, 2=Oblique, 3=Bold Oblique, 4=Light, 5=Light Oblique
    return ImageFont.truetype(HELVETICA, size=size, index=1 if bold else 0)


def dot_grid(img: Image.Image, spacing: int = 28, radius: int = 1) -> None:
    """Subtle dot grid — matches the site's .dot-grid hero background."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for y in range(spacing, H - spacing + 1, spacing):
        for x in range(spacing, W - spacing + 1, spacing):
            d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=DOT)
    img.alpha_composite(overlay)


def aurora_blob(img: Image.Image, cx: int, cy: int, r: int, color: tuple[int, int, int], alpha: int) -> None:
    """Soft radial blob — cosmos-inspired aurora, blurred for the glow."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=r // 2))
    img.alpha_composite(layer)


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    l, _, r, _ = draw.textbbox((0, 0), text, font=font)
    return r - l


def main() -> None:
    img = Image.new("RGBA", (W, H), BG + (255,))

    aurora_blob(img, cx=W - 180, cy=170, r=260, color=ACCENT, alpha=60)
    aurora_blob(img, cx=W - 80,  cy=H - 80, r=300, color=PURPLE, alpha=42)
    aurora_blob(img, cx=W // 2,  cy=H + 80, r=320, color=CYAN, alpha=28)

    dot_grid(img)

    d = ImageDraw.Draw(img)

    badge_text = "1Platform Labs"
    badge_font = load_font(20, bold=False)
    badge_w = text_width(d, badge_text, badge_font)
    badge_padding_x = 16
    badge_padding_y = 8
    badge_h = 36
    badge_x, badge_y = 80, 90
    d.rounded_rectangle(
        (badge_x, badge_y, badge_x + badge_w + 2 * badge_padding_x, badge_y + badge_h),
        radius=18,
        fill=(255, 255, 255, 220),
        outline=(0, 0, 0, 28),
        width=1,
    )
    d.text(
        (badge_x + badge_padding_x, badge_y + badge_padding_y - 2),
        badge_text,
        font=badge_font,
        fill=TEXT_SECONDARY,
    )

    # Wordmark: "1Platform" — blue "1" + black "Platform"
    one_font = load_font(220, bold=True)
    rest_font = load_font(180, bold=True)

    wm_x = 80
    wm_y = 200
    d.text((wm_x, wm_y), "1", font=one_font, fill=ACCENT)
    one_w = text_width(d, "1", one_font)
    d.text((wm_x + one_w - 8, wm_y + 12), "Platform", font=rest_font, fill=TEXT)

    # Tagline
    tagline_font = load_font(40, bold=False)
    tagline = "One platform. Every solution."
    d.text((wm_x + 6, wm_y + 220), tagline, font=tagline_font, fill=TEXT_SECONDARY)

    # Bottom URL bar
    url_font = load_font(26, bold=True)
    url_text = "1platform.pro"
    d.text((wm_x + 6, H - 70), url_text, font=url_font, fill=ACCENT)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT.relative_to(REPO_ROOT)} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
