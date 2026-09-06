"""Generate the transparent SwiftLoop company stamp PNG."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "brand/logo/swiftloop-company-stamp.png"
WORDMARK = ROOT / "brand/logo/swiftloop-wordmark-on-light.png"
RING = ROOT / "brand/logo/swiftloop-ring.png"
DOTO = ROOT / "fonts/newfonts/Doto/static/Doto-SemiBold.ttf"

FINAL_SIZE = 2000
SCALE = 2
SIZE = FINAL_SIZE * SCALE
INK = (20, 19, 26, 255)
ORANGE = (255, 77, 31, 255)


def scaled(value: float) -> int:
    return round(value * SCALE)


def add_arc_text(
    canvas: Image.Image,
    text: str,
    *,
    center: tuple[int, int],
    radius: int,
    font: ImageFont.FreeTypeFont,
    center_angle: float,
    tracking: int,
    direction: int,
    fill: tuple[int, int, int, int],
) -> None:
    """Draw tracked text around an arc, centred on center_angle degrees."""
    probe = ImageDraw.Draw(canvas)
    advances = [probe.textlength(character, font=font) + tracking for character in text]
    total_angle = sum(advances) / radius
    current = math.radians(center_angle) - direction * total_angle / 2

    for character, advance in zip(text, advances, strict=True):
        character_angle = current + direction * (advance / radius) / 2
        x = center[0] + radius * math.cos(character_angle)
        y = center[1] + radius * math.sin(character_angle)

        bbox = probe.textbbox((0, 0), character, font=font)
        glyph_width = max(1, round(bbox[2] - bbox[0]))
        glyph_height = max(1, round(bbox[3] - bbox[1]))
        pad = scaled(28)
        glyph = Image.new("RGBA", (glyph_width + 2 * pad, glyph_height + 2 * pad), (0, 0, 0, 0))
        glyph_draw = ImageDraw.Draw(glyph)
        glyph_draw.text((pad - bbox[0], pad - bbox[1]), character, font=font, fill=fill)

        angle_degrees = math.degrees(character_angle)
        rotation = -(angle_degrees + 90) if direction == 1 else -(angle_degrees - 90)
        glyph = glyph.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=True)
        canvas.alpha_composite(glyph, (round(x - glyph.width / 2), round(y - glyph.height / 2)))
        current += direction * (advance / radius)


def trimmed_rgba(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    alpha_box = image.getchannel("A").getbbox()
    if alpha_box is None:
        raise ValueError(f"Asset has no visible pixels: {path}")
    return image.crop(alpha_box)


def fit_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def main() -> None:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    center = (SIZE // 2, SIZE // 2)

    outer_radius = scaled(850)
    inner_radius = scaled(745)
    draw.ellipse(
        (center[0] - outer_radius, center[1] - outer_radius, center[0] + outer_radius, center[1] + outer_radius),
        outline=INK,
        width=scaled(24),
    )
    draw.ellipse(
        (center[0] - inner_radius, center[1] - inner_radius, center[0] + inner_radius, center[1] + inner_radius),
        outline=INK,
        width=scaled(5),
    )

    # Four precise Signal Orange registration marks interrupt the otherwise monochrome seal.
    for angle in (0, 90, 180, 270):
        radians = math.radians(angle)
        point_radius = scaled(798)
        x = center[0] + point_radius * math.cos(radians)
        y = center[1] + point_radius * math.sin(radians)
        dot_radius = scaled(12)
        draw.ellipse((x - dot_radius, y - dot_radius, x + dot_radius, y + dot_radius), fill=ORANGE)

    arc_font = ImageFont.truetype(str(DOTO), scaled(82))
    add_arc_text(
        canvas,
        "WEB  +  AI  STUDIO",
        center=center,
        radius=scaled(625),
        font=arc_font,
        center_angle=-90,
        tracking=scaled(8),
        direction=1,
        fill=INK,
    )
    add_arc_text(
        canvas,
        "DUBAI  /  UAE",
        center=center,
        radius=scaled(625),
        font=arc_font,
        center_angle=90,
        tracking=scaled(8),
        direction=-1,
        fill=INK,
    )

    wordmark = fit_width(trimmed_rgba(WORDMARK), scaled(970))
    canvas.alpha_composite(
        wordmark,
        (center[0] - wordmark.width // 2, center[1] - wordmark.height // 2 - scaled(45)),
    )

    ring = fit_width(trimmed_rgba(RING), scaled(118))
    ring_y = center[1] + scaled(205)
    line_y = ring_y + ring.height // 2
    line_gap = scaled(92)
    draw.line((center[0] - scaled(350), line_y, center[0] - line_gap, line_y), fill=INK, width=scaled(4))
    draw.line((center[0] + line_gap, line_y, center[0] + scaled(350), line_y), fill=INK, width=scaled(4))
    canvas.alpha_composite(ring, (center[0] - ring.width // 2, ring_y))

    footer_font = ImageFont.truetype(str(DOTO), scaled(48))
    footer = "EST. 2021"
    footer_box = draw.textbbox((0, 0), footer, font=footer_font)
    footer_width = footer_box[2] - footer_box[0]
    draw.text(
        (center[0] - footer_width / 2, center[1] + scaled(385)),
        footer,
        font=footer_font,
        fill=INK,
    )

    output = canvas.resize((FINAL_SIZE, FINAL_SIZE), Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    output.save(OUTPUT, "PNG", optimize=True)

    alpha = output.getchannel("A")
    if alpha.getextrema()[0] != 0:
        raise RuntimeError("Output background is not transparent")
    print(f"Created {OUTPUT}")
    print(f"Size: {output.width}x{output.height}; mode: {output.mode}; alpha: {alpha.getextrema()}")


if __name__ == "__main__":
    main()
