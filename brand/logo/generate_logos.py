#!/usr/bin/env python3
"""Generate SwiftLoop logo assets: outlined SVGs (no font dependency) + transparent PNGs.

Wordmark: "SwiftLoop." in Clash Display Semibold, tracking -0.02em,
"Swift" in one colour, "Loop." in Signal Orange (or mono variants).
"""
import os, subprocess, tempfile

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "ClashDisplay-Semibold.ttf")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

BONE = "#ece8df"
INK = "#0a0a0c"
ACCENT = "#ff4d1f"

TEXT = "SwiftLoop."
SPLIT = 5            # chars 0-4 = "Swift", 5+ = "Loop."
TRACKING = -0.02     # em, applied between glyphs (CSS letter-spacing)

font = TTFont(FONT)
upm = font["head"].unitsPerEm
glyph_set = font.getGlyphSet()
glyph_order = font.getGlyphOrder()

blob = hb.Blob.from_file_path(FONT)
face = hb.Face(blob)
hbfont = hb.Font(face)
hbfont.scale = (upm, upm)

buf = hb.Buffer()
buf.add_str(TEXT)
buf.guess_segment_properties()
hb.shape(hbfont, buf, {"kern": True, "liga": True})

infos = buf.glyph_infos
positions = buf.glyph_positions
track = TRACKING * upm

# build per-glyph (path, cluster, x) at font units, y-up
placed = []
x = 0.0
for info, pos in zip(infos, positions):
    gname = glyph_order[info.codepoint]
    pen = SVGPathPen(glyph_set)
    tpen = TransformPen(pen, Transform().translate(x + pos.x_offset, pos.y_offset))
    glyph_set[gname].draw(tpen)
    placed.append((pen.getCommands(), info.cluster))
    x += pos.x_advance + track
total_width = x - track  # no tracking after last glyph

cap_height = font["OS/2"].sCapHeight or 700
asc, desc = font["hhea"].ascent, font["hhea"].descent  # desc negative

PAD = 0.5 * cap_height  # clear-space-friendly padding inside the file? No — keep tight.
PAD = 40                # small safety pad in font units


def wordmark_svg(c_swift, c_loop):
    """Tight-cropped wordmark SVG, y-flipped into SVG space."""
    top, bottom = cap_height + PAD, -250 - PAD  # descender of 'p' ~ -210
    h = top - bottom
    w = total_width + 2 * PAD
    g1 = [d for d, cl in placed if cl < SPLIT and d]
    g2 = [d for d, cl in placed if cl >= SPLIT and d]
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
        f'width="{w:.0f}" height="{h:.0f}" fill="none">',
        f'<g transform="translate({PAD} {top:.0f}) scale(1 -1)">',
        f'<path fill="{c_swift}" d="{" ".join(g1)}"/>',
        f'<path fill="{c_loop}" d="{" ".join(g2)}"/>',
        "</g></svg>",
    ]
    return "".join(parts), w, h


def ring_svg(color=ACCENT):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">'
            f'<circle cx="50" cy="50" r="38" stroke="{color}" stroke-width="14"/></svg>', 100, 100)


def stacked_svg(c_swift, c_loop):
    """Ring centred above the wordmark."""
    wm, w, h = wordmark_svg(c_swift, c_loop)
    inner = wm[wm.index(">") + 1 : -len("</svg>")]
    ring_d = 0.62 * h            # ring diameter relative to wordmark height
    gap = 0.45 * h
    W = w
    H = h + ring_d + gap
    rx = (W - ring_d) / 2
    return ("".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}" fill="none">',
        f'<circle cx="{rx + ring_d/2:.0f}" cy="{ring_d/2:.0f}" r="{ring_d/2*0.76:.0f}" stroke="{ACCENT}" stroke-width="{ring_d*0.14:.1f}"/>',
        f'<g transform="translate(0 {ring_d + gap:.0f})">{inner}</g>',
        "</svg>"]), W, H)


ASSETS = {
    "swiftloop-wordmark-primary":   wordmark_svg(BONE, ACCENT),   # for dark backgrounds
    "swiftloop-wordmark-on-light":  wordmark_svg(INK, ACCENT),    # for light backgrounds
    "swiftloop-wordmark-mono-bone": wordmark_svg(BONE, BONE),
    "swiftloop-wordmark-mono-ink":  wordmark_svg(INK, INK),
    "swiftloop-ring":               ring_svg(),
    "swiftloop-stacked-primary":    stacked_svg(BONE, ACCENT),
    "swiftloop-stacked-on-light":   stacked_svg(INK, ACCENT),
}

PNG_WIDTH = 2000  # px

for name, (svg, w, h) in ASSETS.items():
    svg_path = os.path.join(HERE, name + ".svg")
    with open(svg_path, "w") as f:
        f.write(svg)

    scale = PNG_WIDTH / w
    pw, ph = PNG_WIDTH, round(h * scale)
    html = (f'<!DOCTYPE html><html><head><style>html,body{{margin:0;background:transparent}}'
            f'svg{{display:block;width:{pw}px;height:{ph}px}}</style></head><body>{svg}</body></html>')
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as tf:
        tf.write(html)
        tmp = tf.name
    png_path = os.path.join(HERE, name + ".png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu",
                    f"--screenshot={png_path}", f"--window-size={pw},{ph}",
                    "--default-background-color=00000000", "--hide-scrollbars",
                    "file://" + tmp], check=True, capture_output=True)
    os.unlink(tmp)
    print(f"{name}: svg + png {pw}x{ph}")

print("done")
