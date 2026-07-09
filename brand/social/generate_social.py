#!/usr/bin/env python3
"""Generate SwiftLoop social profile assets (banners + avatars) as PNGs.

Same pipeline as brand/logo/generate_logos.py: compose HTML on the ink
canvas using the outlined wordmark/ring SVGs (no font dependency for the
logo), screenshot with headless Chrome at 2x.

Assets:
  whatsapp-business-cover   1211 x  681  (2422 x 1362 px)
  linkedin-company-banner   1128 x  191  (2256 x  382 px)
  linkedin-personal-banner  1584 x  396  (3168 x  792 px)
  x-twitter-banner          1500 x  500  (3000 x 1000 px)
  profile-picture-square    1024 x 1024
  profile-picture-round     1024 x 1024  (transparent corners)
"""
import os, re, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, "..", "logo")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

INK = "#0a0a0c"
INK2 = "#101014"
BONE = "#ece8df"
BONE_DIM = "#97948b"
ACCENT = "#ff4d1f"
LINE = "rgba(236,232,223,0.12)"

MONO = '"JetBrains Mono","SFMono-Regular",Menlo,monospace'


def load_svg(name, width_px):
    """Inline an outlined logo SVG at a fixed CSS width (height auto)."""
    with open(os.path.join(LOGO, name)) as f:
        svg = f.read()
    m = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg)
    w, h = float(m.group(1)), float(m.group(2))
    height_px = width_px * h / w
    svg = re.sub(r'width="\d+" height="\d+"',
                 f'width="{width_px}" height="{height_px:.1f}"', svg, count=1)
    return svg


def ring(size_px, stroke=ACCENT, opacity=1):
    return (f'<svg width="{size_px}" height="{size_px}" viewBox="0 0 100 100" '
            f'xmlns="http://www.w3.org/2000/svg" style="display:block;opacity:{opacity}">'
            f'<circle cx="50" cy="50" r="38" fill="none" stroke="{stroke}" stroke-width="14"/></svg>')


GRAIN = ('<div style="position:absolute;inset:0;z-index:9;pointer-events:none;opacity:0.05;'
         'background-image:url(&quot;data:image/svg+xml;utf8,'
         '<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27260%27 height=%27260%27>'
         '<filter id=%27n%27><feTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 '
         'numOctaves=%272%27/></filter>'
         '<rect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/></svg>&quot;);"></div>')

BASE_CSS = """
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: transparent; }
  .canvas { position: relative; overflow: hidden; background: __INK__; }
  .mono { font-family: __MONO__; font-weight: 500; text-transform: uppercase;
          letter-spacing: 0.14em; color: __DIM__; }
  .accent { color: __ACCENT__; }
""".replace("__INK__", INK).replace("__MONO__", MONO).replace("__DIM__", BONE_DIM).replace("__ACCENT__", ACCENT)


def page(w, h, body, transparent=False):
    bg = "background:transparent;" if transparent else ""
    return (f'<!DOCTYPE html><html><head><meta charset="utf-8"><style>{BASE_CSS}</style></head>'
            f'<body style="{bg}"><div class="canvas" style="width:{w}px;height:{h}px;{bg}">'
            f'{body}</div></body></html>')


def hairline(top=None, bottom=None):
    pos = f"top:{top}px;" if top is not None else f"bottom:{bottom}px;"
    return f'<div style="position:absolute;left:0;right:0;height:1px;background:{LINE};{pos}"></div>'


def telemetry_row(top, pad_l, left_txt, right_txt, size=11, pad_r=None):
    pad_r = pad_l if pad_r is None else pad_r
    return (f'<div class="mono" style="position:absolute;top:{top}px;left:{pad_l}px;right:{pad_r}px;'
            f'display:flex;justify-content:space-between;font-size:{size}px;">'
            f'<span>{left_txt}</span><span>{right_txt}</span></div>')


COORDS = '25.16&deg;N / 55.20&deg;E &mdash; DUBAI &mdash; GMT+4'
STATUS = 'STATUS <span class="accent">&#9679;</span> OPEN'
PHASES = ('<span class="accent">&#9702;</span> 01 MAP &nbsp;&mdash;&nbsp; 02 DESIGN '
          '&nbsp;&mdash;&nbsp; 03 AUTOMATE &nbsp;&mdash;&nbsp; 04 ITERATE')
KICKER = '<span class="accent">&#9702;</span>&nbsp; WEB DESIGN &mdash; AI AUTOMATION'
TAGLINE = 'DESIGNED BY HAND &mdash; RUN BY MACHINE'


def x_banner():
    w, h = 1500, 500
    wordmark = load_svg("swiftloop-wordmark-primary.svg", 560)
    body = (
        hairline(top=52) + hairline(bottom=52)
        + telemetry_row(22, 44, "SWIFTLOOP.TECH", COORDS + " &mdash; " + STATUS, pad_r=460)
        + f'<div style="position:absolute;right:-210px;top:50%;transform:translateY(-50%);">{ring(620)}</div>'
        + '<div style="position:absolute;inset:52px 0;display:flex;flex-direction:column;'
          'align-items:center;justify-content:center;gap:26px;">'
        + f'<div class="mono" style="font-size:12px;">{KICKER}</div>'
        + wordmark
        + f'<div class="mono" style="font-size:12px;">{TAGLINE}</div>'
        + '</div>'
        + f'<div class="mono" style="position:absolute;bottom:20px;left:0;right:0;'
          f'text-align:center;font-size:10px;">{PHASES}</div>'
        + GRAIN
    )
    return page(w, h, body), w, h, False


def linkedin_personal():
    # profile photo overlaps the bottom-left on desktop: keep content centre-right
    w, h = 1584, 396
    wordmark = load_svg("swiftloop-wordmark-primary.svg", 480)
    body = (
        hairline(top=46) + hairline(bottom=46)
        + telemetry_row(18, 44, "SWIFTLOOP.TECH", COORDS + " &mdash; " + STATUS, pad_r=390)
        + f'<div style="position:absolute;right:-190px;top:50%;transform:translateY(-50%);">{ring(520)}</div>'
        + '<div style="position:absolute;top:46px;bottom:46px;left:430px;right:250px;'
          'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;">'
        + f'<div class="mono" style="font-size:11px;">{KICKER}</div>'
        + wordmark
        + f'<div class="mono" style="font-size:11px;">{TAGLINE}</div>'
        + '</div>'
        + f'<div class="mono" style="position:absolute;bottom:17px;left:430px;right:250px;'
          f'text-align:center;font-size:9px;">{PHASES}</div>'
        + GRAIN
    )
    return page(w, h, body), w, h, False


def linkedin_company():
    # company logo overlaps the bottom-left: keep the left third quiet
    w, h = 1128, 191
    wordmark = load_svg("swiftloop-wordmark-primary.svg", 300)
    body = (
        hairline(top=0) + hairline(bottom=0)
        + f'<div style="position:absolute;right:-125px;top:50%;transform:translateY(-50%);">{ring(250)}</div>'
        + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;'
          'align-items:center;justify-content:center;gap:16px;">'
        + wordmark
        + f'<div class="mono" style="font-size:9px;">WEB DESIGN &mdash; AI AUTOMATION '
          f'&nbsp;<span class="accent">&#9702;</span>&nbsp; DUBAI / GMT+4</div>'
        + '</div>'
        + f'<div class="mono" style="position:absolute;top:16px;left:40px;font-size:9px;">{STATUS}</div>'
        + GRAIN
    )
    return page(w, h, body), w, h, False


def whatsapp_cover():
    # the round profile photo overlaps the centre-bottom of the cover
    # (roughly x 360-850, y 270-bottom) and mobile/desktop crop the top and
    # bottom edges slightly: keep content in the upper band + bottom corners
    w, h = 1211, 681
    wordmark = load_svg("swiftloop-wordmark-primary.svg", 380)
    body = (
        hairline(top=104) + hairline(bottom=104)
        + telemetry_row(122, 44, "SWIFTLOOP.TECH",
                        "25.16&deg;N / 55.20&deg;E &mdash; " + STATUS)
        + '<div style="position:absolute;top:150px;left:0;right:0;display:flex;'
          'flex-direction:column;align-items:center;gap:22px;">'
        + '<div style="display:flex;align-items:center;gap:26px;">'
        + f'<div style="transform:translateY(-10px);">{ring(54)}</div>'
        + wordmark
        + '</div>'
        + f'<div class="mono" style="font-size:11px;">{TAGLINE}</div>'
        + '</div>'
        + '<div class="mono" style="position:absolute;top:540px;left:44px;right:44px;'
          'display:flex;justify-content:space-between;font-size:11px;">'
        + f'<span><span class="accent">&#9702;</span>&nbsp; WEB DESIGN &mdash; AI AUTOMATION</span>'
        + '<span>DUBAI &mdash; GMT+4</span></div>'
        + GRAIN
    )
    return page(w, h, body), w, h, False


def avatar_square():
    # per guidelines: the loop ring is the avatar mark
    w = h = 512
    body = (f'<div style="position:absolute;inset:0;display:flex;align-items:center;'
            f'justify-content:center;">{ring(280)}</div>' + GRAIN)
    return page(w, h, body), w, h, False


def avatar_round():
    # ink disc + ring, transparent corners; grain clipped to the disc
    w = h = 512
    svg = (
        '<svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" '
        'style="display:block;">'
        '<defs><clipPath id="disc"><circle cx="50" cy="50" r="50"/></clipPath>'
        '<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/>'
        '</filter></defs>'
        f'<circle cx="50" cy="50" r="50" fill="{INK}"/>'
        f'<circle cx="50" cy="50" r="20.8" fill="none" stroke="{ACCENT}" stroke-width="7.65"/>'
        '<rect width="100" height="100" filter="url(#grain)" opacity="0.05" clip-path="url(#disc)"/>'
        '</svg>')
    body = f'<div style="position:absolute;inset:0;">{svg}</div>'
    return page(w, h, body, transparent=True), w, h, True


ASSETS = {
    "swiftloop-x-twitter-banner": x_banner,
    "swiftloop-linkedin-personal-banner": linkedin_personal,
    "swiftloop-linkedin-company-banner": linkedin_company,
    "swiftloop-whatsapp-business-cover": whatsapp_cover,
    "swiftloop-profile-picture-square": avatar_square,
    "swiftloop-profile-picture-round": avatar_round,
}

for name, fn in ASSETS.items():
    html, w, h, transparent = fn()
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as tf:
        tf.write(html)
        tmp = tf.name
    png = os.path.join(HERE, name + ".png")
    args = [CHROME, "--headless=new", "--disable-gpu",
            f"--screenshot={png}", f"--window-size={w},{h}",
            "--force-device-scale-factor=2", "--hide-scrollbars"]
    if transparent:
        args.append("--default-background-color=00000000")
    args.append("file://" + tmp)
    subprocess.run(args, check=True, capture_output=True)
    os.unlink(tmp)
    print(f"{name}.png  {w*2}x{h*2}")

print("done")
