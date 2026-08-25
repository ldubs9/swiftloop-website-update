#!/usr/bin/env python3
# ============================================================
# SwiftLoop — build the self-hosted web fonts
#
#   python3 scripts/build-fonts.py
#
# Subsets each source face in fonts/newfonts/ down to the latin
# range the site actually uses and writes a woff2 into fonts/.
# Variable axes are preserved, so Doto keeps ROND/wght and
# Oxanium keeps wght 200-800.
#
# It also carries per-font GLYPH CORRECTIONS. Mirava is a free
# "personal use" cut and its question mark is drawn 151 units
# below the baseline (every other glyph sits at 0, and ! sits at
# -15), which makes every FAQ heading look like the ? fell off
# the line. The fix belongs here rather than as a hand-edit to a
# binary nobody can diff.
#
# Requires: fonttools[woff]  (pip install "fonttools[woff]" brotli)
# ============================================================

import subprocess
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.misc.transform import Transform

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "fonts" / "newfonts"
OUT = ROOT / "fonts"

# latin + the punctuation, arrows and symbols the markup actually contains
UNICODES = ",".join([
    "U+0000-00FF", "U+0131", "U+0152-0153", "U+02BB-02BC", "U+02C6", "U+02DA",
    "U+02DC", "U+0304", "U+0308", "U+0329", "U+2000-206F", "U+2074", "U+20AC",
    "U+2122", "U+2190-2199", "U+21D2", "U+2212", "U+2215", "U+2219", "U+25CF",
    "U+25E6", "U+2600-26FF", "U+2713", "U+2716", "U+2764", "U+FEFF", "U+FFFD",
])

FACES = [
    {
        "src": SRC / "mirava" / "Mirava Personal Use Only.ttf",
        "out": OUT / "mirava-regular.woff2",
        # (glyph name, x shift, y shift) in font units
        # ? is drawn at y0=-151; ! sits at -15, so lift it 136 to match.
        "shift": [("question", 0, 136)],
    },
    {
        "src": SRC / "Oxanium" / "Oxanium-VariableFont_wght.ttf",
        "out": OUT / "oxanium-variable.woff2",
        "shift": [],
    },
    {
        "src": SRC / "Doto" / "Doto-VariableFont_ROND,wght.ttf",
        "out": OUT / "doto-variable.woff2",
        "shift": [],
    },
]


def shift_glyph(font, name, dx, dy):
    """Translate one glyph's outline, leaving its advance width alone."""
    glyf = font["glyf"]
    if name not in glyf.keys():
        raise SystemExit(f"  !! glyph {name!r} not in font")

    glyph_set = font.getGlyphSet()
    before = BoundsPen(glyph_set)
    glyph_set[name].draw(before)

    rec = RecordingPen()
    glyph_set[name].draw(rec)
    out = RecordingPen()
    rec.replay(TransformPen(out, Transform().translate(dx, dy)))

    from fontTools.pens.ttGlyphPen import TTGlyphPen
    pen = TTGlyphPen(glyph_set)
    out.replay(pen)
    glyf[name] = pen.glyph()
    glyf[name].recalcBounds(glyf)

    after = BoundsPen(font.getGlyphSet())
    font.getGlyphSet()[name].draw(after)
    print(f"  shifted {name}: y0 {before.bounds[1]:.0f} -> {after.bounds[1]:.0f}")


def main():
    for face in FACES:
        src, out = face["src"], face["out"]
        if not src.exists():
            raise SystemExit(f"missing source: {src}")
        print(f"{src.name} -> {out.name}")

        staged = src
        if face["shift"]:
            font = TTFont(src)
            for name, dx, dy in face["shift"]:
                shift_glyph(font, name, dx, dy)
            staged = OUT / f".{out.stem}.patched.ttf"
            font.save(staged)

        subprocess.run([
            sys.executable, "-m", "fontTools.subset", str(staged),
            f"--unicodes={UNICODES}",
            "--layout-features=*",
            "--flavor=woff2",
            f"--output-file={out}",
        ], check=True)

        if staged is not src:
            staged.unlink()

        built = TTFont(out)
        axes = [a.axisTag for a in built["fvar"].axes] if "fvar" in built else []
        print(f"  {built['maxp'].numGlyphs} glyphs, {out.stat().st_size} bytes"
              + (f", axes {axes}" if axes else ""))


if __name__ == "__main__":
    main()
