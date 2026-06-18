# ATLAS Claude Session Activator
# Version: 4.0 | Last Updated: 2026-06-18

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.
**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Strategic Positioning

**ATLAS is a Strategy & Consulting Enablement Platform** — used with the customer in boardrooms and workshops, not just as a salesperson's backend.

**Customer-facing intent:** A Chief Secretary, Finance Secretary, or CM works through ATLAS with the presales team. The sign-off package is generated in the room.

**What stays in ATLAS:**
Intelligence → Analysis & Recommendation → Territory Profile → Programme Design → Financial Modelling → Sign-off Package

**What moves out (separate tools):**
- RAC Tool + Deal Analysis → Commercial/Deals tool (internal)
- HPC Monitoring → Ops tool
- COMPASS → Delivery tool

---

## Build Status — Honest Assessment

### BUILT AND WORKING ✅

| Component | Status | Notes |
|---|---|---|
| Second Brain | ✅ Live v2.3 | + Docket buttons on intel/UC items |
| PEI Tool | ✅ Live v0.4 | Load Saved JSON, + Docket |
| Engagement Docket | ✅ Live v2.2 | Sprint 1+2 complete |
| Recommendation Engine | ✅ Live | Auto-runs, scopes by archetype |
| Intelligence Scraper | ✅ Running daily | Functional but prompt needs semantic tree |
| Feed Library | ✅ Live | 15 active feeds, weekly discovery workflow |
| Portfolio Catalogue | ✅ Updated | L2-GIB added, L2-AIF renamed |
| TSAP FM Territory Profiler | ✅ Live | S1→S2→S3→2x2→S4 pipeline complete |
| atlasAI.js | ✅ Live | Shared AI module at atlas-platform/shared/ |

### IN PROGRESS / PARTIALLY BUILT ⚡

| Component | Status | Notes |
|---|---|---|
| TSAP Financial Model | ⚡ v2.x live | S1 wiki needs macro expansion; Settings tab to be demoted; export via atlasExport.js pending |
| Territory 2x2 Framework | ⚡ Live in FM | Standalone atlas-territory-2x2.html also exists as BD reference tool |
| S4 Vision Document | ⚡ Built in FM | Word export working (docx@8.5.0); atlasExport.js wiring pending |

### NOT YET BUILT 🔧 (in priority order)

| Component | Priority | Notes |
|---|---|---|
| S1 Wiki expansion | 🔴 Next | Full macro, opportunities, demographics, infrastructure sections |
| atlasExport.js | 🔴 Next | Shared Word + PPT module; replaces all per-tool export functions |
| Portal Settings page rebuild | 🔴 Next | Master config UI — all tools read from here; no per-tool settings |
| Docket → Profile → SASC flow coherence | 🔴 Next | Wire territory slug + session data across tools |
| Semantic Context Tree | 🔴 Next | Foundational — upgrades scraper + RE + PEI simultaneously |
| AI Centre Configurator | 🔴 Next | Full stack modelling → BOM + ROM |
| Mode 1 — Budget Envelope Model | 🔴 Next | Pre-UC parametric cost model |
| UC Definition + Reconciliation | 🔴 Next | UC vs budget fit |
| Mode 2 — Detailed Financial Model | 🔴 Next | 6 tabs, curves, scenarios |
| S5 Full Pitch Document | 🟡 Next | After S4 stable; uses FM numbers + S3 profile |
| Pitch Report generator | 🟡 Next | Boardroom document in the room |

---

## TSAP FM — Territory Profiler (S1→S4 Pipeline)

### Pipeline

```
S1: Territory Intel Search (Gemini search grounding → raw text → 10-section extraction)
    ↓  cached in territory_profiles (Supabase)
S2: Objectives Selection + AI Profile Generation
    ↓  no-respend: fingerprint check skips Gemini if same objectives
S3: Profile Display (working/attention/feasibility/radar/archetypes/2x2 positioning)
    ↓  auto-saved to session on every significant action
S4: Vision Document (Gemini generates 5 sections → editorial review → Word export)
    ↓  saved as session.s4; Word export via docx@8.5.0 (interim; atlasExport.js pending)
```

### Key architectural decisions

- **atlasAI.js** at `atlas-platform/shared/atlasAI.js` — zero hardcoding, all config from Supabase `app_config` (atlasai_* prefix). All tools load this module.
- **Session persistence** — full S2/S3/S4 state saved in `territory_profiles.session` (jsonb). Restores to S3 on reload including objectives, overrides, 2x2, S4 draft.
- **No-respend on S2** — `TP.s2._objectives_fingerprint` stores sorted objectives JSON. If unchanged on re-visit, goes straight to S3 with toast.
- **Grounding sources** — `atlasAI.js` captures `groundingChunks` from Gemini search. Displayed as collapsible source chips on S1 intel screen. Saved in session.
- **Confidence flags** — low-confidence S2 data points flagged ⚠ in S4 editorial. All sections must be ✓ confirmed before Word export unlocks.
- **2x2 positioning** — auto-computed from dim_scores. 15 pre-mapped states have curated USP/hook; all others auto-derived. Saved in `session.twoByTwo`.
- **MODEL.territory** — synced from `TP.territory` at S1 completion and session restore. Cost tab shows placeholder if blank.

### Supabase tables used

- `territory_profiles` — S1 intel cache + full session (raw_intel, profile, session jsonb)
- `territory_assessments` — legacy; partially used
- `profiler_archetypes` / `profiler_archetype_dims` — T1-T5 territory archetypes
- `app_config` — atlasai_* config keys for atlasAI.js

### Supabase migrations run

- `territory_profiler.sql` — base schema
- `territory_profiler_v2.sql` — raw_intel, raw_cached_at, sections, failed_sections columns
- `territory_profiler_session.sql` — session jsonb column
- atlasai_* rows inserted into app_config

### 2x2 Framework

Axes: **Role (Y)** Supplier vs Consumer × **Advantage (X)** Infrastructure/Cost vs Domain/Use Case

| | Infrastructure / Cost | Domain / Use Case |
|---|---|---|
| **Supplier** | Q1 Green AI Hub (teal) | Q2 Knowledge Exporter (amber) |
| **Consumer** | Q3 Governance Moderniser (blue) | Q4 Heritage/Sector Renaissance (orange) |

- Territory has **dominant quadrant** (typically 55-78%) + **supporting quadrant** (15-30%)
- 15 states pre-mapped in `TP2X2_SD`
- Auto-computed from dim_scores for all other territories

### S4 Vision Document structure

1. THE MOMENT — why AI, why now, why this territory
2. WHAT THIS TERRITORY OFFERS — dominant quadrant narrative + supporting angle
3. THE RECOMMENDATION — what to build, phased, plain language
4. WHAT IT DELIVERS — outcomes: jobs, revenue, services, GST (FM numbers if available)
5. THE ASK — one clear action

Word export: `docx@8.5.0` CDN, A4, brand palette, logo from Settings, grounding sources appendix.

### Pending FM items

- S4 → `atlasExport.js` wiring (replace current inline docx code)
- S5 Full Pitch Document
- FM Settings tab → demote to read-only status panel; no gear on TSAP FM
- S1 wiki expansion (see below)
- TSAP FM repricing (GPU SKU-level pricing, territory overrides, new investment actors)

---

## S1 Wiki — Pending Expansion

S1 currently renders: Energy, Water, Land, Workers, Digital, Geography, Policy, Programmes.

**Missing sections (extraction runs but not rendered):**
- **Macroeconomics** — currently a single card. Should be full section: GSDP multi-year trend, per capita vs national, fiscal deficit/surplus trend, sectoral composition (agri/industry/services %), major revenue sources
- **Opportunities** — extracted but NOT rendered. Most important section for sales
- **Demographics** — not extracted or rendered. Add: population, urbanisation %, working age %, dependency ratio
- **Infrastructure** — separate from Digital. Roads, rail, airports, ports, logistics index

**CTA text fix:** "Select up to 5 objectives" → "Select objectives — no limit"

---

## Settings Architecture (decided, not yet fully built)

**Principle: one global settings UI, all tools read from it. No per-tool settings tabs.**

**Portal Settings page** (master, to be rebuilt):
- Company & Brand (name, tagline, logo URL, primary/accent colours)
- API Keys (Gemini, Supabase URL + key)
- AI Model Preferences (primary text model, search model)
- Hardware SKUs (GPU platforms — click to set primary for FM calculations)
- Territory Config (power tariff override, civil cost index, manpower multiplier, GST rate)

**Tool behaviour:**
- Tools read from `atlasGetGlobal()` (localStorage `atlas_global_cfg`)
- If a required key is missing, tool shows a non-blocking banner with link to Portal Settings
- **No ⚙ Settings gear on TSAP FM or any other tool**
- **FM Settings tab** (currently built): demote to read-only status panel + "Configure in Portal Settings →" link

---

## Export Architecture (decided, not yet built)

**`atlasExport.js`** at `atlas-platform/shared/atlasExport.js`:
- `atlasExport.word(config)` — generates `.docx` using `docx@8.5.0`, brand from Settings
- `atlasExport.ppt(config)` — generates `.pptx` using `pptxgenjs`, brand from Settings
- Reads company name, logo, brand palette from `atlasGetGlobal()` automatically
- All per-tool export functions become thin wrappers or are deleted

**Current state:** S4 Word export is inline in FM (working). PPT export stubs exist. Both need migration to `atlasExport.js`.

---

## Docket → Profile → SASC Flow (decided, not yet wired)

```
Docket (engagement created, territory set)
    ↓
Territory Profile (S1 → S2 → S3 → 2x2 → S4 Vision Doc)
    ↓  dim_scores + archetype + objectives
SASC (Solution Architecture)
    ↓  sizing + BOM
FM (Financial Model)
    ↓
Deliverables (S4 Word, PPT, BOM)
```

**Current gaps:**
- Territory Profile doesn't flow dim_scores/archetype into SASC
- S4 not connected to docket (no docket_item created on S4 save)
- No single session ID tying the full engagement flow together

---

## atlasAI.js — Shared AI Module

**Location:** `arvindbajaj5.github.io/atlas-platform/shared/atlasAI.js`

**Public API:**
```javascript
atlasAI.init(sbUrl, sbKey)        // load config from Supabase app_config
atlasAI.call(prompt, opts)         // Gemini text call, model fallback, thinking-part skip
atlasAI.search(prompt, opts)       // Gemini + google_search grounding, returns sources[]
atlasAI.parseJSON(text)            // 4-strategy: direct → all_blocks(last-first) → fence → repair
atlasAI.repair(str)                // Indian numbers, unquoted enums, trailing commas, fences
atlasAI.callAndParse(prompt, opts)
atlasAI.searchAndParse(prompt, opts)
atlasAI.sectionMaxTokens(name)     // opportunities:4096, s2:8192, energy:3000, etc.
atlasAI.getGeminiKey()
atlasAI.config                     // live config snapshot (read-only)
atlasAI.ready
```

**Supabase app_config keys (atlasai_* prefix):**
```
atlasai_primary_model        gemini-2.5-flash
atlasai_fallback_models      ["gemini-2.0-flash-lite","gemini-1.5-flash"]
atlasai_search_models        ["gemini-2.0-flash","gemini-1.5-flash-latest"]
atlasai_default_max_tokens   2000
atlasai_s2_max_tokens        8192
atlasai_temperature          0.1
atlasai_retry_on_400         true
atlasai_timeout_ms           30000
```

---

## CRITICAL — Technical Rules

### thinkingConfig
NEVER add `thinkingConfig:{thinkingBudget:0}` to Gemini calls.

### Key Resolution Pattern
```javascript
// atlasAI.js tools (TSAP FM and all new tools):
var key = atlasAI.getGeminiKey()

// Legacy tools (Second Brain, PEI, Scraper):
var g = atlasGetGlobal()
var model = atlasGetTaskModel('task_id') || 'gemini-2.0-flash'
var key = atlasGetKeyForModel(model) || g.key_gemini || ''
```

### sbInsert — always use upsert header
```javascript
headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
```

### S2 no-respend pattern
```javascript
TP.s2._objectives_fingerprint = JSON.stringify(TP.objectives.slice().sort())
var currentFP = JSON.stringify(TP.objectives.slice().sort())
if (TP.s2 && TP.s2._objectives_fingerprint === currentFP) {
  TP.stage = 's3'; switchTab('profile')
  showToast('↩ Using saved profile — objectives unchanged')
  return
}
```

---

## ATLAS Core Architecture

```
INTELLIGENCE LAYER ✅
  Second Brain + PEI + Scraper (semantic tree pending)
        ↓
ANALYSIS & RECOMMENDATION ✅
  Recommendation Engine (context tree will improve it)
        ↓
TERRITORY INTELLIGENCE ⚡ (S1-S4 built, S5 pending)
  Territory Profile → 2x2 Positioning → Vision Document
        ↓
DESIGN & CONFIGURATION 🔧
  AI Centre Builder Steps 1-7 (not built)
  AI Centre Configurator (not built)
        ↓
FINANCIAL MODELLING ⚡
  TSAP FM live (repricing pending)
        ↓
SIGN-OFF PACKAGE ⚡
  S4 Vision Doc → S5 Full Pitch → Board Deck
```

---

## Semantic Context Tree — Next Priority for Intelligence Layer

### Architecture
```
Supabase: semantic_contexts table
  → tier (direct_opportunity | technology_signal | market_signal | exclude)
  → context_string
  → portfolio_codes
  → active

intelligence_items: add matched_context, matched_tier columns
```

### Supabase SQL needed
```sql
ALTER TABLE intelligence_items
  ADD COLUMN IF NOT EXISTS matched_context text,
  ADD COLUMN IF NOT EXISTS matched_tier text;

CREATE TABLE IF NOT EXISTS semantic_contexts (
  id             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tier           text NOT NULL CHECK (tier IN ('direct_opportunity','technology_signal','market_signal','exclude')),
  name           text NOT NULL,
  context_string text NOT NULL,
  portfolio_codes text[] DEFAULT '{}',
  active         boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);
```

---

## Financial Model — Two Modes

**Mode 1** — Parametric budget envelope pre-UC (±35%)
**Mode 2** — Detailed TSAP FM (live, repricing pending)

**FM repricing — pending (after Settings rebuild):**
- GPU SKU-level pricing: GB200 NVL72, VR NVL72, VR NVL4, MI325X
- Management infra as % of compute (not per-MW)
- Territory-level overrides: power tariff, civil cost index, manpower multiplier
- New investment actors: Territory Govt, Govt Rep, OEM, AI Model Co, AI Operator
- Investment scenarios: State / Operator / Hybrid / Viability Gap

---

## Intelligence Scraper

**Status:** Running daily, functional but low yield
**Do NOT enable daily schedule** — wait for semantic tree
**Search model:** gemini-2.0-flash (do not change)

---

## Portfolio Catalogue

```
L1     L1-TSAP    Territory Sovereign AI Programme
L1.1-L1.5         Programme components (partner-led)
L2     L2-GIB     GenAI-in-a-Box ✅
L2     L2-AIF     Multi-Purpose AI Factory ✅
L2     L2-INF     AI Centre (rename → L2-AIC pending)
L2.1   L2.1-INF   GeoAI Centre
L2.2   L2.2-INF   Defence AI Centre (air-gapped, MIL-SPEC)
L2.3   L2.3-INF   Health AI Centre
L2.4   L2.4-INF   FinAI Centre
L2     L2-TRC     GPU Training Cluster
L2     L2-HPC     HPC Cluster
L2     L2-EDG     Edge AI Node
L2     L2-MDC     Modular Datacenter
L3     L3-*       23 Lifecycle Services
```

---

## MDC T-Shirt Sizing

| Size | Capacity | GPUs | Tokens/day | Use |
|---|---|---|---|---|
| XS | ≤2 MW | 64–128 | 500M–1B | District node, pilot |
| S | 5 MW | 256–512 | 2–5B | City-level |
| M | 10 MW | 512–1,024 | 5–10B | Territory hub |
| L | 15 MW | 1,024–1,536 | 10–15B | Large territory flagship |
| XL | 20 MW | 1,536–2,048+ | 15–25B | National/multi-territory |

---

## Supabase

**RLS disabled on ALL tables.**
**Engagements archetype:** `territory_coe` | `govt_sectorial` | `enterprise` | `defence`

---

## ATLAS GitHub

**Repo:** `arvindbajaj5/atlas-platform`
**Live URL:** `arvindbajaj5.github.io/atlas-platform`
**Shared modules:** `atlas-platform/shared/` (atlasAI.js live; atlasExport.js pending)
**TSAP FM:** `atlas-platform/tools/tsap-financial-model/index.html`
**Drive root:** `1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd`

---

## Pending Items (Priority Order)

| # | Item | Priority |
|---|---|---|
| 1 | S1 wiki expansion — full macro, opportunities, demographics, infrastructure | 🔴 Next |
| 2 | atlasExport.js — shared Word + PPT module | 🔴 Next |
| 3 | Portal Settings page rebuild — master config UI | 🔴 Next |
| 4 | FM Settings tab → demote to read-only; remove gear from TSAP FM | 🔴 After portal settings |
| 5 | Docket → Profile → SASC flow coherence | 🔴 Next |
| 6 | Semantic Context Tree — Supabase + seed + wire scraper/RE/PEI | 🔴 Next |
| 7 | AI Centre Configurator (full stack) | 🔴 Next laptop session |
| 8 | TSAP FM repricing (GPU SKU pricing, territory overrides, investment actors) | 🔴 After Settings |
| 9 | S5 Full Pitch Document | 🟡 After S4 stable |
| 10 | Mode 1 — Budget Envelope Model | 🟡 Next |
| 11 | UC Definition + Reconciliation flow | 🟡 Next |
| 12 | Mode 2 — Detailed FM rebuild | 🟡 Next |
| 13 | Enable daily scraper schedule (after semantic tree) | 🟡 Soon |
| 14 | Global feed discovery (HPCwire, C4ISRNET etc.) | 🟡 Soon |
| 15 | GCP billing investigation | 🟡 Soon |
| 16 | Decide portfolio code rename L2-INF → L2-AIC | 🟡 Soon |
| 17 | UX pass — Engagement Docket | ⬜ Later |
| 18 | Visualisations (territory map, tokenomics) | ⬜ Later |
| 19 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions |
