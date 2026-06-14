# brand.md
# ATLAS Brand Standards
# Version: 2.0 | Last Updated: 2026-06-14

---

## Identity

**Platform Name:** ATLAS (AI Transaction and Lifecycle Architecture Suite)
**Note:** ATLAS is the internal platform name only. It never appears in customer-facing documents.

**Brand name:** Set in Settings → Company Identity → Brand name
**Brand name short:** Set in Settings → Company Identity → Short name
**OEM logo:** Uploaded via Settings → Company Identity → Logo (Drive file ID)

**Tagline:** *From Requirements to Revenue*

---

## Colour Palette

### Primary (use first — prefer on all slides and documents)
| Name   | Hex     | RGB           | Usage |
|--------|---------|---------------|-------|
| Orange | #FF5539 | 255, 85, 57   | Primary CTA, accents, cover page accent, orange rule line |
| Navy   | #002870 | 0, 40, 112    | Headers, backgrounds, H1 headings, slide header bar |

### Secondary (use for distinction — not decoration)
| Name   | Hex     | RGB           | Usage |
|--------|---------|---------------|-------|
| Blue   | #1C38F5 | 28, 56, 245   | H2 headings, links, active states, civilian/GeoAI context |
| Teal   | #00B290 | 0, 178, 144   | H3 headings, success states, positive indicators |
| Amber  | #FFB600 | 255, 182, 0   | Warnings, caution, pending states |

### Extended (UI / portal only — not for printed documents)
| Name   | Hex     | RGB           | Usage |
|--------|---------|---------------|-------|
| Indigo | #3C00B4 | 60, 0, 180    | Defence/sovereign sub-brand |
| White  | #FFFFFF | 255, 255, 255 | All slide and document backgrounds |
| Light  | #F5F5F7 | 245, 245, 247 | Portal backgrounds, alternating table rows |
| Mid    | #B4B4BE | 180, 180, 190 | Placeholder text, secondary labels (UI only) |
| Dark   | #282832 | 40, 40, 50    | Body text, primary content |

### Domain variant palettes
| Domain | Primary | Accent | Use |
|--------|---------|--------|-----|
| TSAP / Sovereign AI | Navy #002870 | Blue #1C38F5 | National AI, territory programmes |
| Civilian / GeoAI | Blue #1C38F5 | Teal #00B290 | Government civilian, DONER, smart cities |
| Defence / Military | Indigo #3C00B4 | Orange #FF5539 | Defence, military, restricted |
| Enterprise / Commercial | Navy #002870 | Amber #FFB600 | Private sector, commercial HPC |
| CSP / Inferencing | Navy #002870 | Teal #00B290 | Cloud, inferencing providers |

### CSS Variables (all tools)
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
  --border: #E0E0E8;
}
```

---

## Typography

**Primary font:** Roboto (Google Fonts)
**Mono font:** Roboto Mono (numeric inputs, code, financial figures)

### Type scale
| Level | Weight | Size (doc) | Size (UI) | Usage |
|-------|--------|------------|-----------|-------|
| Display | 900 | — | 48px | Portal hero, cover page title |
| H1 | 700 | 18pt | 32px | Major section titles — colour: Navy #002870 |
| H2 | 700 | 14pt | 24px | Sub-sections — colour: Blue #1C38F5 |
| H3 | 600 | 12pt | 18px | Sub-sub-sections — colour: Teal #00B290 |
| Body | 400 | 11pt | 14px | Main paragraph text — colour: Dark #282832 |
| Caption | 400 | 9pt | 12px | Figure/table captions, footnotes |
| Mono | 400 | 11pt | 13px | Code, IDs, financial figures |

---

## Document Structure — Mandatory Page Sequence

Every formal document (DOCX and PPT) follows this sequence without exception:

```
Page 1:  Cover page
Page 2:  Intentionally blank
Page 3+: Table of contents (starts on odd page)
Page 5+: Body content (always starts on odd page number)
         Section breaks between major sections
```

**Cover page must contain:**
- Brand logo (top or centred)
- Document title (large, bold, Navy)
- Engagement name
- Customer name
- Orange horizontal rule separating title from meta block
- Meta block: Document number | Date | Version | Author | Classification
- Local entity name and address (bottom of cover)
- Parent company name and website (smallest, bottom)

**Page 2 — always blank.** No exceptions. No "this page intentionally left blank" text.

**Table of contents** — auto-generated from H1/H2 headings. Right-aligned page numbers with dot leader. Starts on odd page.

**Body** — always starts on odd page (page 5 or later depending on TOC length).

---

## Document Header and Footer (all body pages)

### Running header
```
Left:   [Customer name] — [Document name]
Right:  [Brand logo or brand name short]
Separator: 0.5pt line below header, colour: #E0E0E8
```

### Running footer
```
Left:   [Date generated — DD Mon YYYY]
Centre: CONFIDENTIAL (or applicable classification)
Right:  Page [N] of [Total]
Separator: 0.5pt line above footer, colour: #E0E0E8
```

Cover page and blank page (page 2) have **no header or footer**.

---

## DOCX — Document Body Styles

### Page setup
- Paper: A4
- Margins: Top 25mm, Bottom 20mm, Left 25mm, Right 20mm
- Inner margin consideration: 30mm left for double-sided printing
- Body text: **justified**, Roboto 11pt
- Line spacing: 1.15 (276 twips), 6pt space after paragraph

### Heading styles
| Style | Font size | Weight | Colour | Space before | Space after |
|-------|-----------|--------|--------|-------------|------------|
| H1 | 18pt | Bold | Navy #002870 | 18pt | 8pt |
| H2 | 14pt | Bold | Blue #1C38F5 | 14pt | 6pt |
| H3 | 12pt | Bold | Teal #00B290 | 10pt | 4pt |
| Body text | 11pt | Regular | Dark #282832 | 6pt | 6pt |
| Caption | 9pt | Regular | Mid #B4B4BE | 4pt | 4pt |

### Tables
- Header row: Navy #002870 background, White text, Bold 11pt
- Alternating rows: White / Light #F5F5F7
- Borders: 0.5pt, colour #E0E0E8
- Cell padding: 3mm all sides
- Header row repeats at page breaks

### Bullet lists
- Level 1: Bullet character, 0.75cm indent, 0.4pt line spacing before each bullet
- Level 2: En dash, 1.5cm indent
- Maximum 2 levels of bullet depth in body text

### Figures and tables
- Always captioned: "Figure N: [Description]" or "Table N: [Description]"
- Caption style: 9pt, Roboto, Mid #B4B4BE, centred below
- Figures centred on page with 12pt space above and below

---

## PPT — Slide Standards

### Slide layout
- Size: Widescreen 16:9 (33.87cm × 19.05cm / 13.33in × 7.5in)
- Background: White on all content slides
- Exception: Cover slide — Navy background (#002870)

### Slide zones (mandatory)
```
┌─────────────────────────────────────────────────────┐
│  HEADER BAR  (0–0.65in)  Navy bg, white text        │
│  Left: Customer | Doc name    Right: Brand name      │
├─────────────────────────────────────────────────────┤
│                                                     │
│   CONTENT ZONE  (0.85–7.2in)                       │
│   Title at top (Navy, bold, 20pt)                   │
│   Orange rule line below title (0.03in height)      │
│   Content below rule                                │
│                                                     │
├─────────────────────────────────────────────────────┤
│  FOOTER BAR  (7.2–7.5in)  Light grey bg            │
│  Left: Date    Centre: CONFIDENTIAL    Right: Page  │
└─────────────────────────────────────────────────────┘
```

### Colour usage on slides
- Maximum 3 colours per slide
- Prefer Navy + one accent (Orange or Teal)
- Never use more than 2 accent colours simultaneously
- Reduce colour count — 2 colours is better than 5

### Object rules
- No text box inside a shape — use table cells or shapes with direct text
- Use tables for structured/grid layouts
- Icons: flat, single-colour, no gradients, no drop shadows
- No decorative shapes

### Text on slides
- Slide title: Roboto Bold 20pt, Navy
- Body bullets: Roboto Regular 14pt, Dark #282832
- Maximum 2 levels of bullet depth
- Left-aligned body text only — no centred body text blocks
- Minimum body text size: 11pt (never smaller for readability)

### Cover slide (PPT)
- Navy background (#002870) full bleed
- Optional cover graphic: top 55% of slide (domain-appropriate, brand palette)
- Orange accent bar: 0.08in wide, left edge, full height of lower section
- Document title: Roboto Bold 32pt, White
- Engagement name: Roboto Regular 18pt, Light Grey
- Customer name: Roboto Regular 14pt, Teal/Accent colour
- Meta row (bottom): date | version | classification — Roboto 10pt, Mid Grey
- Company brand name (bottom right): Roboto Bold 10pt, White

---

## Cover Image (Engagement Visual Identity)

Each engagement has **one** cover image, generated once and reused across all documents. This gives the engagement a consistent visual identity.

### Generation rules
- Tool: Gemini 2.0 Flash (image generation) via ATLAS Docket → Overview tab
- Preview + feedback loop before finalising (draft → feedback → regenerate → approve)
- Once approved, reused on every PPT and DOCX for that engagement

### Brand requirements for cover images (hardcoded in generation prompt)
- **Colour palette:** Deep Navy #002870 dominant, Electric Blue #1C38F5 accents, Teal #00B290 secondary, Orange #FF5539 sparingly
- **Style:** Abstract geometric, architectural, or data visualisation — never stock photography
- **Strictly prohibited:** People, faces, body parts, text, labels, logos, watermarks, copyrighted symbols, flags, recognisable brand marks
- **Tone:** Clean, authoritative, formal — suitable for sovereign AI proposals to government ministries
- **Orientation:** Landscape, high contrast, visually striking

### Cover image optional
- Checkbox at document generation time: "Include cover graphic" (default ON)
- In early stages or for quick internal documents, uncheck — a navy colour block is used instead
- Once unchecked, subsequent regeneration uses the same setting unless changed

### Storage
- Saved to Drive: `Documents/[Customer]/[Engagement]/cover_image_v[N].png`
- Pointer stored in `engagements.cover_image_drive_id`
- Status tracked in `engagements.cover_image_status`: none | draft | approved

---

## Company Identity in Documents

Four distinct identity elements — never confused:

| Element | What it is | Where used |
|---------|-----------|------------|
| Brand name | Customer-facing commercial name | Document body text throughout — "Brand proposes...", "Brand's AI platform..." |
| Brand name short | Abbreviated version | Headers, footers, running text |
| Brand logo | Visual mark | Cover page, slide header, email signatures |
| Parent company name | HQ legal entity | Cover page (small), formal sign-off, back page |
| Local entity name | India legal entity | Cover page (small), local contracts, formal proposals |

**ATLAS never appears in any customer document.** ATLAS is the internal platform name only.

### Where each appears
```
Document body text:   Brand name ("Acme AI recommends...")
Slide header:         Brand name short ("Acme")
Slide footer:         Brand name short
Cover page (large):   Brand name
Cover page (small):   Local entity + address
Cover page (tiny):    Parent company + website
Formal sign-off:      Local entity (full legal name + address)
Back page:            Both entities in full
```

---

## Document Tone and Voice

### All documents
- Professional, direct — no marketing fluff
- Metric-first: lead with numbers and outcomes
- Precise — use exact numbers, model names, version numbers
- No jargon for jargon's sake — technical terms only where they add precision

### Internal documents (docket summaries, action registers, BOM)
- Factual, structured, no narrative
- Tables and bullet points preferred over prose
- Abbreviations acceptable — reader is the team

### External documents (proposals, vision documents, FM summaries)
- Confident, outcome-focused
- Every section answers: "What does this mean for the customer?"
- Avoid passive voice
- Numbers in Indian conventions for INR (Cr, Lakh); USD/EUR in millions (M)
- Spell out acronyms on first use, abbreviate thereafter

### Classification default: Confidential
All generated documents are **Confidential** by default unless explicitly changed.
Remove classification marking only when explicitly authorised for public release.

---

## Document Generation — Format Rules

### Internal documents → PPT only
- Docket summaries, action registers, internal briefings
- No DOCX required

### External documents → PPT + DOCX (both required)
- PPT: explains and presents the thinking, used in meetings
- DOCX: read for completeness, language, coherency — the formal artefact
- Both generated from same structured content — one AI call feeds both
- Both carry same cover page design (PPT cover slide = DOCX cover page)

### Data outputs → Excel only
- BOM, ROM tables, financial models, action registers as data
- No narrative, no cover page
- OEM brand colour on header row only

---

## File Naming Convention

```
[DocType]_[CustomerShort]_[EngShort]_v[N]_[YYYY-MM-DD].[ext]

Examples:
  TSAP_Vision_GoHP_HAICE_v1_2026-06-14.pptx
  TSAP_Vision_GoHP_HAICE_v1_2026-06-14.docx
  BOM_GoHP_HAICE_2026-06-14.xlsx
  PEI_GoHP_HAICE_v1_2026-06-14.pptx
  ROM_Letter_GoHP_HAICE_2026-06-14.docx
```

**Version numbering:** v1, v2 etc. Previous versions kept — never overwrite.

**Drive folder structure:**
```
ATLAS Root/
  Documents/
    [Customer Name]/
      [Engagement Name]/
        PEI/
        Docket/
        SASC/
        FM/
        Proposal/
        BOM/
```

---

## ATLAS Wordmark (internal / portal use only)

**ATL`A`S** — the letter `A` in Orange #FF5539; rest in White on navy or Navy on light.

```html
<div class="atlas-brand">ATL<span style="color:var(--orange)">A</span>S</div>
```

---

## Portal / Tool Surface Rules

- Page background: `--light` (#F5F5F7)
- Card surfaces: `--white`
- Header/nav: `--navy`
- No gradients on functional elements
- Border: #E0E0E8 · Radius: 8px standard, 6px inputs, 12px cards
- Shadow: `0 2px 8px rgba(0,0,0,0.08)` on cards

---

## Sub-Brand: Sovereign / Defence Context

- Primary colour shifts to Indigo #3C00B4 (replaces Navy)
- Orange accent unchanged
- All other brand rules apply unchanged
- Used for: COMPASS, defence AI, military GeoAI, classified contexts

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-01 | Initial brand standards |
| 1.1 | 2026-05-20 | Extended palette, slide rules, portal conventions |
| 2.0 | 2026-06-14 | Full document generation standards added: cover page sequence, headers/footers, DOCX body styles, PPT slide zones, cover image spec, company identity model (brand/parent/local), file naming, Drive structure, tone and voice |
