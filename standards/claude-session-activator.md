# ATLAS Claude Session Activator
# Version: 4.1 | Last Updated: 2026-06-18

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
| PEI Tool | ✅ Live v0.4 | Fixed: data is not defined + _t0 undefined |
| Engagement Docket | ✅ Live v2.2 | Sprint 1+2 complete |
| Recommendation Engine | ✅ Live | Auto-runs, scopes by archetype |
| Intelligence Scraper | ✅ Fixed | Fixed: missing script tag + init() never called + duplicate code |
| Feed Library | ✅ Live | 15 active feeds, weekly discovery workflow |
| Portfolio Catalogue | ✅ Updated | L2-GIB added, L2-AIF renamed |
| TSAP FM Territory Profiler | ✅ Live | S1→S2→S3→2x2→S4 pipeline complete |
| atlasAI.js | ✅ Live | Shared AI module at atlas-platform/shared/ |
| Portal Settings Page | ✅ Built | settings/index.html — 5 tabs, all tools read from it |

### IN PROGRESS / PARTIALLY BUILT ⚡

| Component | Status | Notes |
|---|---|---|
| TSAP Financial Model | ⚡ v2.x live | Territory Config tab built; repricing pending |
| Territory 2x2 Framework | ⚡ Live in FM | Standalone atlas-territory-2x2.html also exists as BD reference tool |
| S4 Vision Document | ⚡ Built in FM | Word export working (docx@8.5.0); atlasExport.js wiring pending |
| S1 Wiki | ⚡ Expanded | All 12 sections extracted; N/A fields need ↻ Refresh to repopulate |

### NOT YET BUILT 🔧 (in priority order)

| Component | Priority | Notes |
|---|---|---|
| Docket → Profile → SASC flow coherence | 🔴 Next | Wire territory slug + session data across tools |
| atlasExport.js | 🔴 Next | Shared Word + PPT module; replaces all per-tool export functions |
| S5 Full Pitch Document | 🔴 Next | After S4 stable; uses FM numbers + S3 profile |
| TSAP FM repricing | 🔴 Next | GPU SKU-level pricing from Settings; territory overrides; investment actors |
| Semantic Context Tree | 🔴 Next | Foundational — upgrades scraper + RE + PEI simultaneously |
| AI Centre Configurator | 🔴 Next | Full stack modelling → BOM + ROM |
| Mode 1 — Budget Envelope Model | 🟡 Next | Pre-UC parametric cost model |
| UC Definition + Reconciliation | 🟡 Next | UC vs budget fit |
| Mode 2 — Detailed FM rebuild | 🟡 Next | 6 tabs, curves, scenarios |
| Pitch Report generator | 🟡 Next | Boardroom document in the room |

---

## Portal Settings Page — BUILT ✅

**Location:** `atlas-platform/settings/index.html`
**Linked from:** Portal sidebar (all roles), individual tool "missing key" banners

### 5 Tabs

**Company**
- Brand name (short) — used in tool headers, nav, exports
- Tool logo (simple) — upload file OR paste URL; for headers/nav
- Document logo (formal) — upload file OR paste URL; for Word/PPT covers
- Parent company: full legal name, website, address 1/2, city, country
- Local/regional entity: name, address, city
- Document defaults: author name, document prefix
- Brand colours: primary + accent (colour picker + hex input)

**API Keys**
- Gemini API key — writes `key_gemini` + `geminiKey` + `atlas_gemini_key` simultaneously (all tools covered)
- Supabase URL — writes `sbUrl` + `sb_url`
- Supabase anon key — writes `sbKey` + `sb_key`
- Anthropic + OpenAI keys (future use)
- Live test buttons for Gemini + Supabase

**AI Models**
- Primary text model → writes `geminiTextModel` + `model_tiers.default`
- Per-task overrides: PEI (`model_tiers.pei`), scraping (`model_tiers.scraping`), S4 (`model_tiers.s4`), search (`geminiSearchModel`)

**Hardware & Costs**
- GPU SKU table (7 defaults from Inferencing Factory: GB200 NVL2, B200, H200 SXM, MI325X, MI350X, L40S, Vera Rubin)
- Editable: vendor, name, type, TDP W, FP8 TFLOPS, USD/unit, GPUs/chassis, cooling, enabled
- Add/remove rows; click dot to set primary (click doesn't propagate to edit inputs)
- Primary SKU → `primaryGpuSku` in localStorage
- Rack & Infrastructure costs: DLC rack, AC rack, CDU, PDU, chilled water loop, chassis, DRAM, NVMe $/TB, kWh rate, rack kW capacity
- Network costs: IB/RoCE port cost, spine switch cost
- Software licensing: NVAIE per GPU/yr, OS per server/yr
- All save to Supabase `app_config` via Save/Sync buttons

**National Averages**
- Power tariff Rs/kWh, water Rs/kL, land Rs lakh/acre, engineer salary Rs lakh/yr, civil cost index, construction Rs Cr/MW
- "Sync to Supabase" button → writes `nat_avg_*` keys to `app_config`
- Also loaded automatically from Supabase on Settings open (fills gaps)

### Data flow
```
Settings page → localStorage atlas_global_cfg  ← all tools read via atlasGetGlobal()
Settings page → Supabase app_config            ← atlasAI.js reads atlasai_* and nat_avg_*
                                               ← root index reads brand_* keys
```

### Key alignment (what writes what)
| Settings field | localStorage keys | Supabase app_config keys |
|---|---|---|
| Company name | `companyName` | `brand_name` |
| Tool logo | `logoUrl` | `brand_logo_url` |
| Document logo | `docLogoUrl` | `brand_doc_logo_url` |
| Parent company | `parentCompanyName` etc | `parent_company_name` etc |
| Gemini key | `key_gemini` + `geminiKey` + `atlas_gemini_key` | — |
| Supabase URL/key | `sbUrl`+`sb_url`, `sbKey`+`sb_key` | — |
| Primary model | `geminiTextModel` + `model_tiers.default` | `atlasai_primary_model` |
| National averages | `national_averages.*` | `nat_avg_*` |
| GPU SKUs | `gpu_skus` (JSON) | `gpu_skus` |
| Hardware costs | `hardware_costs.*` | `hw_cost_*` |

---

## TSAP FM — Full Architecture

### Tab Bar (left to right)
```
Territory Profile | Programme Cost | Funding Sources | Funding Gap |
Revenue Model | Cash Flow | What-If | Territory Config →
```

### Territory Profile Pipeline (S1→S4)

```
S1: Territory Intel Search
    → Gemini search grounding (12 sections extracted)
    → Cached in territory_profiles (Supabase)
    → Displays: AI Opportunities, Hard Stats, Demographics, Infrastructure, Geography, Policy, Programmes
    → Sources panel: collapsible grounding source chips

S2: Objectives Selection + AI Profile Generation
    → No-respend: _objectives_fingerprint check skips Gemini if same objectives
    → "View saved profile →" button if unchanged; "↺ Re-generate" available

S3: Profile Display
    → Working in favour / Needs attention / Feasibility / Radar
    → 2x2 positioning block (auto-computed from dim_scores)
    → "✨ Generate Vision Doc" button

S4: Vision Document
    → Gemini generates 5 sections (60s timeout from config)
    → Editorial: click-to-edit inline, confidence flags ⚠
    → Company name inline input (saves to atlas_global_cfg)
    → Export Word: docx@8.5.0, A4, brand palette, logo, sources appendix
    → Saved as session.s4

Territory Config tab (manual, separate from AI-generated S1-S4):
    → Cost overrides table: 6 columns (Parameter / Unit / Override / S1 Extracted / National Avg / Effective)
    → Colour-coded source badge: orange Config, teal S1 Data, grey Nat Avg
    → Programme defaults: period, currency, investment scenario
    → Priority chain: Config Override → S1 Index Ratio → National Average
```

### Session Persistence
All S2/S3/S4 state saved to `territory_profiles.session` (jsonb):
```json
{
  "objectives": [],
  "freeText": "",
  "s2": { "_objectives_fingerprint": "...", "dim_scores": {}, ... },
  "overrides": { "working": [], "attention": [] },
  "twoByTwo": { "dom": 1, "sec": 4, "domPct": 78, "secPct": 17 },
  "s4": { "sections": {}, "edits": {}, "generated_at": "..." },
  "sources": [],
  "stage": "s3",
  "saved_at": "..."
}
```

Auto-saves: after S3 render (300ms), after each objective toggle (500ms), after each override edit (300ms), after S4 generation (300ms).

Auto-restores: `init()` queries most recent session from Supabase → if found, restores to S3 directly.

### Territory Config (manual cost overrides)
Lives as separate tab in TSAP FM — NOT in global Settings.
Reads/writes `atlas_global_cfg.territory_config` via `tcSave(key, val)`.
Used by `getTerritoryCosts()` which implements priority chain:
1. `territory_config` override (highest)
2. S1 extracted index ratio × national average
3. National average baseline (from `atlas_global_cfg.national_averages` → `NAT_AVG` defaults)

### Cost calculation chain
```javascript
getTerritoryCosts() → returns {
  power_tariff, water_cost, land_cost, engineer_salary,
  civil_index, civil_ratio, power_ratio, has_s1,
  nat_power, nat_water
}
// FM calcOpex uses tc_costs.power_tariff for power calculations
// FM calcCapex uses tc_costs.civil_ratio for civil cost adjustment
```

### Navigation rules
- Tab bar click on "Territory Profile" → always lands on S1 (fromTabBar=true resets stage)
- Internal navigation (switchTab without flag) → goes to current stage
- Back from S4 → S1
- Auto-restore on init → opens Cost tab if no session, Profile tab if session found

### Territory dropdown (tpHome)
- Shows existing territories from `territory_profiles` ordered by date
- ✓ suffix if territory has a saved S2/S3 session
- "Search new territory..." option reveals free-text input
- If engagement has territory → pre-fills + locks dropdown

### S1 Extraction (12 sections)
Sections: `macro, energy, water, land, workers, digital, policy, programmes, geography, opportunities, demographics, infrastructure`
- Prompt: 12,000 char truncation (was 6,000)
- `SECTION_HINTS` per section for targeted extraction
- Realistic example values in schemas (not zeros) to guide Gemini magnitude
- Explicit "Use null for genuinely missing values — do NOT use 0 unless actual value is zero"
- National averages stated in prompt (power Rs 7.5/unit etc.) for index computation

### 2x2 Framework
Axes: **Role (Y)** Supplier vs Consumer × **Advantage (X)** Infrastructure/Cost vs Domain/Use Case

| | Infrastructure / Cost | Domain / Use Case |
|---|---|---|
| **Supplier** | Q1 Green AI Hub (teal) | Q2 Knowledge Exporter (amber) |
| **Consumer** | Q3 Governance Moderniser (blue) | Q4 Heritage/Sector Renaissance (orange) |

- Dominant (55-78%) + supporting (15-30%) quadrant
- 15 states pre-mapped in `TP2X2_SD` (HP, Raj, Ladakh, UK, Kerala, J&K, Sikkim, Manipur, UP, Maha, Guj, Tel, Odisha, Assam, Varanasi)
- Auto-computed from dim_scores for all others

### S4 Vision Document structure
1. THE MOMENT — why AI, why now, why this territory
2. WHAT THIS TERRITORY OFFERS — dominant + supporting quadrant narrative
3. THE RECOMMENDATION — what to build, phased, plain language
4. WHAT IT DELIVERS — outcomes: jobs, revenue, services, GST
5. THE ASK — one clear action

Word export: `docx@8.5.0` CDN, A4, Roboto font, brand palette, logo, 2x2 strip, grounding sources appendix.
Parser: strips markdown (**, *, #, ---) before section matching; 5 match strategies + paragraph fallback.

### Supabase tables
- `territory_profiles` — S1 cache + full session (raw_intel, profile, session jsonb)
- `territory_assessments` — legacy; partially used
- `profiler_archetypes` / `profiler_archetype_dims` — T1-T5 archetypes
- `app_config` — atlasai_* config + nat_avg_* + brand_* + hw_cost_* + gpu_skus

### Supabase migrations applied
- `territory_profiler.sql` — base schema
- `territory_profiler_v2.sql` — raw_intel, sections, failed_sections columns
- `territory_profiler_session.sql` — session jsonb column (`ADD COLUMN IF NOT EXISTS session jsonb`)
- `national_averages_migration.sql` — nat_avg_* + atlasai_s4_* rows in app_config
- atlasai_* rows manually inserted

---

## atlasAI.js — Shared AI Module ✅

**Location:** `arvindbajaj5.github.io/atlas-platform/shared/atlasAI.js`

**Public API:**
```javascript
atlasAI.init(sbUrl, sbKey)        // load config from Supabase app_config
atlasAI.call(prompt, opts)         // Gemini text call, fallback chain, thinking-part skip
atlasAI.search(prompt, opts)       // + google_search grounding, returns sources[]
atlasAI.parseJSON(text)            // 4-strategy: direct → all_blocks(last-first) → fence → repair
atlasAI.repair(str)                // Indian numbers, unquoted enums, trailing commas, fences
atlasAI.callAndParse(prompt, opts)
atlasAI.sectionMaxTokens(name)     // s2:8192, s4:4096, opportunities:4096 etc.
atlasAI.getGeminiKey()
atlasAI.config                     // includes s4_max_tokens, s4_timeout_ms
atlasAI.ready
```

**Per-call timeout override:** `opts._timeout` overrides global `_cfg.timeout_ms`
**S4 specific:** reads `atlasai_s4_max_tokens` (4096) and `atlasai_s4_timeout_ms` (60000) from Supabase

**Grounding sources:** `result.sources[]` — each has `{ uri, title, domain }`, de-duplicated by domain

**Supabase app_config keys:**
```
atlasai_primary_model        gemini-2.5-flash
atlasai_fallback_models      ["gemini-2.0-flash-lite","gemini-1.5-flash"]
atlasai_search_models        ["gemini-2.0-flash","gemini-1.5-flash-latest"]
atlasai_default_max_tokens   2000
atlasai_s2_max_tokens        8192
atlasai_s4_max_tokens        4096
atlasai_s4_timeout_ms        60000
atlasai_temperature          0.1
atlasai_retry_on_400         true
atlasai_timeout_ms           30000
```

---

## PEI Tool — Fixed ✅

**Bugs fixed:**
1. `data is not defined` — `atlasLogUsage()` referenced `data.usageMetadata` but `data` (raw Gemini response) not in scope after migration to `atlasCallModel()`. Fixed: token counts set to 0.
2. `_t0 undefined` — `var _t0 = Date.now()` added at start of try block in `generatePEI()`.

**Key resolution:** reads `key_gemini` from `atlas_global_cfg` ✓

---

## Intel Scraper — Fixed ✅

**Bugs fixed:**
1. Missing `<script>` opening tag — entire 84KB JS block was inside a `<div>`, never executed. Fixed: `<script charset="utf-8">` inserted before JS block.
2. `init()` never called — no `window.onload` or boot trigger. Fixed: async IIFE at end: loads TTL config → loads run records → calls `init()` → loads from Supabase.
3. Duplicate `getSupabaseUrls` function fragment at end. Trimmed.

**Do NOT enable daily schedule** — wait for semantic tree.

---

## Root Index — Updated ✅

**Settings nav item:** Now visible to all roles (was Business Head only), under "Configuration" category.
**Settings click:** Navigates to `settings/index.html` (standalone page).
**Legacy showSettings():** Still works, now shows green banner: "Settings have moved → Open Settings →" at top, followed by legacy unit costs editor.

---

## CRITICAL — Technical Rules

### thinkingConfig
NEVER add `thinkingConfig:{thinkingBudget:0}` to Gemini calls.

### Key Resolution
```javascript
// atlasAI.js tools (TSAP FM + all new tools):
var key = atlasAI.getGeminiKey()

// Legacy tools (Second Brain, PEI, Scraper):
var g = atlasGetGlobal()
var model = atlasGetTaskModel('task_id') || 'gemini-2.0-flash'
var key = atlasGetKeyForModel(model) || g.key_gemini || ''
```

### sbInsert — always upsert
```javascript
headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
```

### switchTab signature (TSAP FM)
```javascript
switchTab(tab)              // internal navigation — preserves stage
switchTab(tab, true)        // from tab bar — resets profile to S1
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

### Territory Config save pattern
```javascript
tcSave(key, val)
// Writes to atlas_global_cfg.territory_config
// Blank/null/0 → deletes the key (clears override)
// Numeric strings → converted to float
// programme_years/currency also synced to MODEL
```

### getTerritoryCosts() priority chain
```
1. atlas_global_cfg.territory_config[key]   ← manual override (highest)
2. S1 extracted index_pct / 100 × nat_avg   ← territory intelligence
3. atlas_global_cfg.national_averages[key]  ← Settings national averages
4. NAT_AVG hardcoded defaults               ← absolute fallback
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
  TSAP FM live (Territory Config tab built; repricing pending)
        ↓
SIGN-OFF PACKAGE ⚡
  S4 Vision Doc → S5 Full Pitch → Board Deck
```

---

## Docket → Profile → SASC Flow (decided, not yet wired)

```
Docket (engagement created, territory set)
    ↓  territory slug flows downstream
Territory Profile (S1 → S2 → S3 → 2x2 → S4 Vision Doc)
    ↓  dim_scores + archetype + objectives
SASC (Solution Architecture)
    ↓  sizing + BOM
FM (Territory Config + Programme Cost)
    ↓
Deliverables (S4 Word, PPT deck, BOM)
```

**Current gaps:**
- Territory Profile dim_scores/archetype not flowing into SASC
- S4 not creating a docket_item on save
- No single session ID tying full engagement flow together

---

## Export Architecture (decided, not yet built)

**`atlasExport.js`** at `atlas-platform/shared/atlasExport.js`:
- `atlasExport.word(config)` — `.docx` via `docx@8.5.0`, brand from `atlasGetGlobal()`
- `atlasExport.ppt(config)` — `.pptx` via `pptxgenjs`, brand from `atlasGetGlobal()`
- Reads `companyName`, `docLogoUrl`, `logoUrl`, brand colours automatically
- Tools pass content only: `atlasExport.word({ title, sections, territory, date, sources })`
- Current state: S4 Word export is inline (working but not using this module yet)

---

## Semantic Context Tree — Next Priority for Intelligence Layer

### Architecture
```
Supabase: semantic_contexts table
  → tier (direct_opportunity | technology_signal | market_signal | exclude)
  → context_string, portfolio_codes, active

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

**Mode 1** — Parametric budget envelope pre-UC (±35%) — NOT YET BUILT
**Mode 2** — Detailed TSAP FM (live, repricing pending)

**FM repricing — pending:**
- GPU SKU pricing from Settings Hardware tab (not hardcoded)
- Territory-level overrides via Territory Config tab
- Investment actors: Territory Govt, Govt Rep, OEM, AI Model Co, AI Operator
- Investment scenarios: State / Operator / Hybrid / Viability Gap

---

## Portfolio Catalogue

```
L1     L1-TSAP    Territory Sovereign AI Programme
L1.1-L1.5         Programme components (partner-led)
L2     L2-GIB     GenAI-in-a-Box ✅
L2     L2-AIF     Multi-Purpose AI Factory ✅
L2     L2-INF     AI Centre (rename → L2-AIC pending decision)
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
**Settings:** `atlas-platform/settings/index.html`
**TSAP FM:** `atlas-platform/tools/tsap-financial-model/index.html`
**Drive root:** `1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd`

---

## Pending Items (Priority Order)

| # | Item | Priority |
|---|---|---|
| 1 | Docket → Profile → SASC flow coherence | 🔴 Next |
| 2 | atlasExport.js — shared Word + PPT module | 🔴 Next |
| 3 | S5 Full Pitch Document | 🔴 After S4 stable |
| 4 | TSAP FM repricing (GPU SKU pricing from Settings, investment actors) | 🔴 Next |
| 5 | Semantic Context Tree — Supabase + seed + wire scraper/RE/PEI | 🔴 Next |
| 6 | AI Centre Configurator (full stack) | 🔴 Next laptop session |
| 7 | Mode 1 — Budget Envelope Model | 🟡 Next |
| 8 | UC Definition + Reconciliation flow | 🟡 Next |
| 9 | Mode 2 — Detailed FM rebuild | 🟡 Next |
| 10 | Enable daily scraper schedule (after semantic tree) | 🟡 Soon |
| 11 | Global feed discovery (HPCwire, C4ISRNET etc.) | 🟡 Soon |
| 12 | GCP billing investigation | 🟡 Soon |
| 13 | Decide portfolio code rename L2-INF → L2-AIC | 🟡 Soon |
| 14 | UX pass — Engagement Docket | ⬜ Later |
| 15 | Visualisations (territory map, tokenomics) | ⬜ Later |
| 16 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions |
