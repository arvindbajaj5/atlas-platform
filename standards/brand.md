brand.md
ATLAS Brand Standards
Version: 1.0 | Last Updated: 2026-05-13
---
Identity
Platform Name: ATLAS (AI Transaction and Lifecycle Architecture Suite)
OEM Name: [OEM_NAME] (placeholder — replace before external use)
Tagline: (TBD)
---
Colour Palette
Primary
Name	Hex	RGB	Usage
Orange	#FF5539	255, 85, 57	Primary CTA, accents, highlights, alerts
Navy	#002870	0, 40, 112	Headers, backgrounds, primary text anchors
Secondary
Name	Hex	RGB	Usage
Blue	#1C38F5	28, 56, 245	Links, stage indicators, active states
Teal	#00B290	0, 178, 144	Success, positive deltas, confirmations
Amber	#FFB600	255, 182, 0	Warnings, sizing indicators, caution
Extended (UI Only)
Name	Hex	RGB	Usage
Indigo	#3C00B4	60, 0, 180	Sovereign/strategic context, sub-brands
White	#FFFFFF	255, 255, 255	Backgrounds, card surfaces
Light	#F5F5F7	245, 245, 247	Page backgrounds, input fills
Mid	#B4B4BE	180, 180, 190	Placeholder text, secondary labels
Dark	#282832	40, 40, 50	Body text, primary content
CSS Variables (use in all tools)
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
Typography
Primary Font: Roboto (Google Fonts)
Mono Font: Roboto Mono (for numeric inputs, code, financial figures)
Usage
Context	Weight	Size
Platform wordmark	900	16px
Page / section title	700	18–24px
Card title	700	14px
Body / labels	400	12–13px
Captions / meta	400	10–11px
Numeric inputs	400	12px (Roboto Mono)
---
Logo
Logo is uploaded by Business Head via Settings in the ATLAS portal
Stored as base64 in localStorage; renders in the portal masthead alongside the ATLAS wordmark
Fallback: ATLAS wordmark text only if no logo is set
Recommended format: PNG or SVG, max 100KB
No specific placement or exclusion zone rules defined at this time
---
ATLAS Wordmark
Rendered as: ATL`A`S — where the letter `A` is always in `--orange` (#FF5539), the rest in `--white` (#FFFFFF) on navy backgrounds or `--navy` (#002870) on light backgrounds.
```html
<!-- Standard header rendering -->
<div class="hdr-brand">ATL<span style="color:var(--orange)">A</span>S</div>
```
---
Tool Badge Convention
Each tool displays a version badge in the header:
Background: `rgba(255, 85, 57, 0.2)`
Text: `--orange`
Format: `v[X.Y]` e.g. `v2.1`
---
Background & Surface Rules
Page background: `--light` (#F5F5F7)
Card / panel surfaces: `--white` (#FFFFFF)
Header / nav: `--navy` (#002870)
No gradients on functional UI elements
Border colour: `#E0E0E8` for cards and dividers
Border radius: `--r: 8px` standard, `--r-sm: 6px` inputs/buttons, `--r-lg: 12px` cards
---
Tone & Voice
Professional, direct, no marketing fluff
Metric-first: lead with numbers, scores, and outcomes
Audience: sales, presales, business heads — not engineers
Internal documents: factual, structured
Customer-facing: confident, outcome-focused
---
Sub-Brand: Sovereign AI Platform
Accent colour: Indigo `#3C00B4` (used for COMPASS, sovereign/defence contexts)
All other brand rules apply unchanged
