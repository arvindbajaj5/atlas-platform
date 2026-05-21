# brand.md
# ATLAS Brand Standards
# Version: 1.1 | Last Updated: 2026-05-20

---

## Identity

**Platform Name:** ATLAS (AI Transaction and Lifecycle Architecture Suite)
**OEM Name:** [OEM_NAME] *(placeholder — replace before external use)*
**Tagline:** *(TBD)*

---

## Colour Palette

### Primary (use these first — prefer on all slides and documents)
| Name   | Hex     | RGB             | Usage                                          |
|--------|---------|-----------------|------------------------------------------------|
| Orange | #FF5539 | 255, 85, 57     | Primary CTA, accents, highlights, key callouts |
| Navy   | #002870 | 0, 40, 112      | Headers, backgrounds, primary text anchors     |

### Secondary (use sparingly — only when distinction is necessary)
| Name   | Hex     | RGB             | Usage                                          |
|--------|---------|-----------------|------------------------------------------------|
| Blue   | #1C38F5 | 28, 56, 245     | Links, active states, secondary highlights     |
| Teal   | #00B290 | 0, 178, 144     | Success, positive indicators, confirmations    |
| Amber  | #FFB600 | 255, 182, 0     | Warnings, caution, secondary callouts          |

### Extended (UI / Portal Only — not for slides or documents)
| Name   | Hex     | RGB             | Usage                                          |
|--------|---------|-----------------|------------------------------------------------|
| Indigo | #3C00B4 | 60, 0, 180      | Sovereign/strategic sub-brand context          |
| White  | #FFFFFF | 255, 255, 255   | All slide and document backgrounds             |
| Light  | #F5F5F7 | 245, 245, 247   | Portal page backgrounds, input fills           |
| Mid    | #B4B4BE | 180, 180, 190   | Placeholder text, secondary labels (UI only)   |
| Dark   | #282832 | 40, 40, 50      | Body text, primary content                     |

### CSS Variables (use in all tools)
```css
:root {
  --orange: #FF5539;
  --navy:   #002870;
  --blue:   #1C38F5;
  --teal:   #00B290;
  --amber:  #FFB600;
  --indigo: #3C00B4;
  --white:  #FFFFFF;
  --light:  #F5F5F7;
  --mid:    #B4B4BE;
  --dark:   #282832;
}
```

---

## Typography

**Primary Font:** Roboto (Google Fonts)
**Mono Font:** Roboto Mono (numeric inputs, code, financial figures in tools)

### Usage Scale
| Context                     | Weight | Size               |
|-----------------------------|--------|--------------------|
| Platform wordmark           | 900    | 16px               |
| Slide title / H1            | 700    | 28–36pt            |
| Section heading / H2        | 700    | 18–24pt            |
| Sub-heading / H3            | 600    | 14–16pt            |
| Body text                   | 400    | 11–12pt            |
| Captions / footnotes        | 400    | 9–10pt             |
| Numeric inputs / code       | 400    | 12px (Roboto Mono) |

---

## Slide Standards

### Background
- **White background only** on all slides
- Exception: Title/cover slide may use navy background with white text

### Colour usage
- **Prefer primary colours** (Orange, Navy) — use same/similar colour across slides
- Use secondary colours only when clear distinction is required (e.g. second data series)
- **Reduce total colour count** — 2 colours per slide is better than 5
- Never use more than 3 colours on a single slide

### Layout & spacing
- **Header gap** — minimum 1.5cm from top edge for title zone; no content in this zone
- **Footer gap** — minimum 1cm from bottom edge for logo/page number zone
- All content sits within the safe zone between header and footer gaps

### Object construction rules
- **No text box inside a shape** — use a table cell or a single shape with text directly
- **Use tables** for structured data or grid layouts — do not simulate tables with individual shapes
- **Reduce object count** — fewer, cleaner objects; no decorative shapes
- Icons: flat, single-colour, no gradients or drop shadows

### Text
- Roboto throughout; body text minimum 11pt
- Left-aligned or justified body text — no centred body text blocks
- Maximum 2 levels of bullet depth

---

## Word Document Standards

### Page setup
- White background, A4 paper
- Margins: 2.5cm top/bottom, 2.5cm left/right
- Justified body text

### Styles — always use built-in Word styles
| Style       | Usage                          |
|-------------|--------------------------------|
| Heading 1   | Major section titles           |
| Heading 2   | Sub-sections                   |
| Heading 3   | Sub-sub-sections               |
| Heading 4   | Lower-level groupings          |
| Body Text   | Main paragraph text            |
| List Bullet | Bulleted lists                 |
| List Number | Numbered lists                 |
| Caption     | Figure and table captions      |

*Modify styles once after downloading to apply OEM fonts/colours globally across the document.*

### Header (all pages except cover)
- **Left:** Document title
- **Right:** Logo placeholder `[OEM LOGO]`
- Separator line below header

### Footer (all pages except cover)
- **Left:** Version number (e.g. `v1.0`)
- **Centre:** Date (e.g. `May 2026`)
- **Right:** Page number (e.g. `Page 3 of 12`)

### Document page order — mandatory sequence
1. **Cover page** — Logo placeholder (top right), Document title, Date, Version, Author, Classification
2. **Page 2** — Intentionally blank
3. **Table of Contents** — starts on an odd page (page 3 or later)
4. **Main content** — always starts on an odd page number
5. Section breaks between major sections

### Generated document watermark
- All Claude-generated documents carry: **DRAFT — Internal Use Only**
- Remove manually before external distribution

---

## ATLAS Wordmark

**ATL`A`S** — the letter `A` always in `--orange` (#FF5539); rest in `--white` on navy or `--navy` on light.

```html
<div class="hdr-brand">ATL<span style="color:var(--orange)">A</span>S</div>
```

---

## Logo

- Uploaded by Business Head via Settings in the ATLAS portal
- Stored as base64 in localStorage; renders in portal masthead
- Fallback: ATLAS wordmark text only
- Format: PNG or SVG with transparent background, max 100KB
- Use white/transparent background logo — displays on navy header

---

## Tool Badge Convention
- Background: `rgba(255, 85, 57, 0.2)` · Text: `--orange`
- Format: `v[X.Y]` — e.g. `v2.1`

---

## Portal / Tool Surface Rules
- Page background: `--light` (#F5F5F7)
- Card surfaces: `--white`
- Header/nav: `--navy`
- No gradients on functional elements
- Border: `#E0E0E8` · Radius: 8px standard, 6px inputs, 12px cards

---

## Tone & Voice
- Professional, direct, no marketing fluff
- Metric-first — lead with numbers and outcomes
- Internal: factual, structured · Customer-facing: confident, outcome-focused

---

## Sub-Brand: Sovereign AI Platform
- Accent: Indigo `#3C00B4` (COMPASS, sovereign/defence contexts)
- All other brand rules unchanged
- 
