# SwiftLoop Brand Guidelines

**Version 2.0 — 4 September 2026**  
Canonical implementation: `css/style.css`  
Visual guide: `brand/guidelines.html`  
Machine-readable tokens: `brand/design-tokens.json`

## Brand in one line

SwiftLoop is a Dubai web design, development, and AI automation studio that builds **websites that win clients** and **AI that runs the rest**.

- **Brand idea:** Kinetic precision.
- **Signature:** Designed by hand. Run by machine.
- **Process:** Map → Design → Automate → Iterate.
- **Personality:** Precise, confident, technical, editorial, measured.
- **Default visual mode:** Warm cream canvas, dark ink typography, one Signal Orange accent.

## Core visual system

### Colour

| Role | Token | Value | Use |
|---|---|---:|---|
| Primary canvas | Cream | `#ECE8DF` | Default website and document surface |
| Raised light surface | Cream 2 | `#E4DFD3` | Panels, grouped controls |
| Light hover surface | Cream 3 | `#DBD5C6` | Active and hover states |
| Interface foreground | Ink | `#14131A` | Headlines and primary UI copy |
| Logo / dark canvas | Logo Ink | `#0A0A0C` | Supplied light-background logo and dark mode |
| Primary accent | Signal Orange | `#FF4D1F` | Fills, ring mark, rules, full stops |
| Website source orange text | Accent Ink source | `#C4380F` | Large or bold display text only; measured at 4.38:1 on Cream |
| Accessible orange text on cream | Accent Text AA | `#B6330E` | Normal-size orange labels and inline text; measured at 4.95:1 |
| Primary dark-mode type | Bone | `#ECE8DF` | Text on near-black surfaces |

**Rule:** Signal Orange is the only saturated brand colour. Use it sparingly—approximately 5% of a composition. The website's `#C4380F` source token measures about 4.38:1 on Cream and misses WCAG AA for normal text. Use `#B6330E` for normal-size orange text; reserve `#C4380F` and raw `#FF4D1F` for large/bold display or non-text accents.

The complete light and dark semantic token sets are in `design-tokens.json`.

### Typography

1. **Mirava / SwiftLoop Display** — display statements, large headings, names, and document titles.
   - Campaign display is uppercase.
   - Tracking: `-0.02em` to `-0.03em`.
   - Leading: `0.96` to `1.05`.
   - Outline type is reserved for the secondary beat of a two-part statement.
2. **Oxanium / SwiftLoop Body** — paragraphs, form controls, tables, descriptions, and UI.
   - Web base: `17px` with `1.6` leading.
   - Use Medium `500` for emphasis; do not fake emphasis with all caps.
3. **Doto / SwiftLoop Label** — navigation, phase numbers, coordinates, telemetry, metadata, labels, and buttons.
   - Default: `0.72rem`, weight `600`, tracking `0.12em`, uppercase.
   - Doto is a display-label face, not a code font and never a paragraph face.
4. **System monospace** — literal code and machine-readable strings only.

Self-host all three brand fonts from `fonts/`; do not add Google Fonts or Fontshare dependencies to SwiftLoop collateral.

### Logo

Use supplied vector assets. Never re-typeset the wordmark in live text.

- Light background: `brand/logo/swiftloop-wordmark-on-light.svg`
- Dark background: `brand/logo/swiftloop-wordmark-primary.svg`
- Ring: `brand/logo/swiftloop-ring.svg`
- Stacked marks: `brand/logo/swiftloop-stacked-on-light.svg` and `brand/logo/swiftloop-stacked-primary.svg`

Minimum sizes: wordmark `90px / 24mm`; ring `16px / 5mm`. Clear space is at least the cap-height of the “S” on all sides. Never remove the terminal orange period, stretch, rotate, recolour, shadow, or outline a supplied logo.

## Composition rules

- Give one large statement control of the composition.
- Use visible grid logic, one-pixel hairlines, and generous negative space.
- Prefer asymmetric editorial balance to centered template layouts.
- Pills belong to actions, segmented controls, and status chips—not every container.
- Flat surfaces and hairlines replace glassmorphism and soft card shadows.
- Use the ring as a precise symbol, cropped geometry, watermark, section bullet, or process loop—not as decoration without purpose.
- Use subtle grain (`3.5%` light / `5%` dark) to keep digital surfaces tactile.

## Motion

- Canonical ease: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Controls: about `250ms`; surface transitions: `350–450ms`; major reveals: `600–800ms`.
- Prefer masked text reveals, directional fills, and deliberate scale changes.
- Never use bounce, perpetual floating, or gratuitous parallax.
- Respect `prefers-reduced-motion`.

## Photography and imagery

Use editorial crops, moody architecture, crafted objects, real project work, and controlled grain or halftone. Keep colour grading inside the warm cream / near-black / orange world. Avoid generic office teams, stock robots, holographic AI clichés, rainbow gradients, and unrelated luxury imagery.

## Voice

Write like the design looks: direct, measured, and technically literate.

**Do**

- Lead with the outcome, then explain the mechanism.
- Use short declarative lines and real numbers where evidence exists.
- Use full stops and em dashes to create rhythm.
- Say: “Websites that win clients. AI that runs the rest.”
- Say: “Designed by hand. Run by machine.”

**Do not**

- Use exclamation marks or breathless sales language.
- Use “cheap”, “budget”, or “basic”.
- Stack generic AI terms such as “cutting-edge”, “revolutionary”, and “synergy”.
- Invent awards, results, conversion rates, client claims, or technical capabilities.

## Implementation starter

```css
@font-face {
  font-family: "SwiftLoop Display";
  src: url("/fonts/mirava-regular.woff2") format("woff2");
  font-weight: 400 700;
  font-display: swap;
}
@font-face {
  font-family: "SwiftLoop Body";
  src: url("/fonts/oxanium-variable.woff2") format("woff2");
  font-weight: 200 800;
  font-display: swap;
}
@font-face {
  font-family: "SwiftLoop Label";
  src: url("/fonts/doto-variable.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}

:root {
  --surface: #ece8df;
  --surface-2: #e4dfd3;
  --surface-3: #dbd5c6;
  --fg: #14131a;
  --fg-soft: #3c3931;
  --fg-dim: #5c574a;
  --label-dim: #262420;
  --line: rgba(20, 19, 26, 0.14);
  --line-soft: rgba(20, 19, 26, 0.07);
  --accent: #ff4d1f;
  --accent-ink-source: #c4380f;
  --accent-ink: #b6330e;
  --on-accent: #1a0d07;
  --font-display: "SwiftLoop Display", "Mirava", sans-serif;
  --font-body: "SwiftLoop Body", "Oxanium", sans-serif;
  --font-label: "SwiftLoop Label", "Doto", sans-serif;
  --gutter: clamp(1.25rem, 4vw, 4rem);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

## Brand details

- **Website:** [www.swiftloop.tech](https://www.swiftloop.tech)
- **Email:** info@swiftloop.tech
- **WhatsApp:** +971 50 972 5199
- **Location:** Dubai, United Arab Emirates
- **Timezone:** GMT+4

Do not place banking details, identity documents, credentials, client data, or other private operational information in general brand assets or LLM prompts.
