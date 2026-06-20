# ATLAS Claude Session Activator
# Version: 4.3 | Last Updated: 2026-06-20

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.
**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Strategic Positioning

**ATLAS is a Strategy & Consulting Enablement Platform** — used with the customer in boardrooms and workshops, not just as a salesperson's backend.

**OEM commercial position:** We prefer CapEx deals. MaaS/GPUaaS/BMaaS models are built to help our customers model their own service offerings to end users — we are not an OpEx provider except in rare cases.

---

## Full Engagement Chain — Settled Architecture

```
CUSTOMER (root entity — exists in Supabase customers table)
  → tier: 'strategic' | 'transactional' (existing column)
  → ownership: GOV | MIL | PVT | PSU
  → segment: Q1 | Q2 | Q3 | Q4
  → org_type, state, primary_contact, contacts (jsonb), divisions (jsonb)
  → ai_maturity, parent_org, elevated_at, elevated_by
  → one customer → many engagements

ENGAGEMENT (per opportunity — engagements table)
  → customer_id FK → customers.id
  → engagement_type: 'TSAP' | 'Domain' | 'Generic'
  → stage: Intelligence → Qualify → Configure → Size & Propose → Win & Scope
  → territory (TSAP only) — saved alongside engagement_type
  → requirements jsonb: {objective, problem, success_criteria, budget_range, timeline, constraints[]}
  → name (engagement name) — primary identifier with customer name

DOCKET (engagement working space — always 1:1 with engagement)
  7 tabs:
  Tab 1: Overview      → requirement block at top, KPIs, customer profile, strategy, quick actions
  Tab 2: Intelligence  → intel from intelligence_items table (tagged by territory/sector)
  Tab 3: Portfolio     → full catalogue, AI Map button (atlasAI.js), togglePI preserves state
  Tab 4: Use Cases     → UC library from Supabase, S/M/L/XL sizing
  Tab 5: MaaS Config   → only when L2-MAAS selected in Portfolio
  Tab 6: Territory     → only when engagement_type === 'TSAP'
  Tab 7: Actions/Outputs → existing tabs (Actions, Outputs, History)

SASC (invoked from Docket via "SASC" button)
  → receives ?eng= from URL
  → reads portfolio selection + UC list + MaaS config from docket_items
  → reads unit costs from Settings
  → outputs BOM/ROM Mode 1 (±35%) → stored as docket_item {type: 'sasc_bom'}

TSAP FM (TSAP engagements only — "Financial Model" button)
  → receives ?eng= from URL
  → reads SASC BOM from docket_item
  → adds funding model, revenue model, cash flow, scenarios
  → Territory Config tab: manual cost overrides for this territory

AI INFERENCING FACTORY (Stage 4 all types)
  → reads SASC BOM as starting point
  → refines compute sizing
  → outputs near-final BOM
```

---

## Supabase — customers table (EXISTING + enhanced)

```
id, name, short_name
tier: 'strategic' | 'transactional'    ← USE THIS, not strategic_tier
ownership: 'GOV' | 'MIL' | 'PVT' | 'PSU'
org_type, state, country
segment: 'Q1' | 'Q2' | 'Q3' | 'Q4'   ← NEW (added by us)
primary_contact
contacts (jsonb), divisions (jsonb)
ai_maturity, parent_org
elevated_at, elevated_by
created_at, updated_at
```

**DO NOT use `strategic_tier`** — dropped, redundant with `tier`.

---

## Supabase — engagements table (enhanced)

```
customer_id FK → customers.id          ← NEW
engagement_type: TSAP|Domain|Generic   ← NEW
territory (text)                       ← NEW (TSAP only)
requirements (jsonb)                   ← NEW
  {objective, problem, success_criteria, budget_range, timeline, constraints[]}
name / opportunity_name (existing)
stage, status, owner
opened_at, created_at
```

---

## Supabase — new tables built

### model_catalogue
63 models seeded across 21 vendors. Key fields:
- `archetype[]` — coding|document|audio|video|vision|multimodal|embedding|reranking|general|indic
- `gpu_memory_gb` jsonb — per quantisation
- `gpus_per_instance` jsonb — per quantisation
- `bench_mmlu`, `bench_humaneval`, `bench_gsm8k` — benchmark scores
- `enabled`, `featured`, `license`, `release_date`, `source`

### model_catalogue_staging
Scraper-detected models pending review. Status: pending|approved|rejected.
Surfaced in Settings → Model Catalogue tab → Staging Queue section.

### docket_items (enhanced)
Added `item_subtype`:
- `sasc_bom` | `fm_scenario` | `territory_profile` | `uc_list`
- `portfolio_selection` | `vision_doc` | `maas_config`
- `action_item` | `intel_summary` | `proposal_doc`

---

## Portal (root index) — Customer & Engagement flow BUILT ✅

**Sidebar** — "Customers" section: All Customers + New Customer links (all roles).

**All Customers** — loads from Supabase, shows all 7 customers, click → Customer Detail.

**Customer Detail** — shows customer summary + all engagements list. "+ New Engagement" button.

**New Customer wizard** (3 steps):
1. Customer form: name, short_name, ownership, org_type, state, contact + Q1-Q4 segment + Strategic/Transactional tier → saves to `customers`
2. Engagement + Requirements: engagement name, stage, type (TSAP/Domain/Generic), territory (TSAP), then full requirements block (objective rows=6+, problem rows=5+, budget chips, timeline chips, compliance chips, success criteria rows=5+, service model chips) → saves to `engagements`
3. Confirm + "Open Engagement Docket →" → navigates to `tools/engagement-docket/index.html?eng=ID`

**Key helpers in root index:**
```javascript
sbFetch(path, opts)   // GET from Supabase
sbPost(table, body)   // POST to Supabase (returns saved row)
loadDashboardCounts() // async, updates stat boxes from Supabase
openDocket(engId)     // navigates to engagement-docket/?eng=ID
```

---

## Engagement Docket — v2.3 BUILT ✅

**Location:** `atlas-platform/tools/engagement-docket/index.html`

### Key state variables
```javascript
CURRENT_ENG          // loaded engagement object (includes _cust)
CURRENT_DOCKET_ID    // docket id
DOCKET_ITEMS         // all docket_items for this engagement
PORTFOLIO_SELECTION  // array of portfolio item IDs selected
MAAS_MODELS_SELECTED // array of selected model catalogue rows
INTEL_ITEMS          // loaded intel items (tagged to this engagement)
MC_ROWS_D            // model catalogue rows (docket copy)
MC_LOAD_D            // 'idle'|'loading'|'loaded'|'error'|'no-creds'
AGENT_ON             // agent harness toggle state
window.MAAS_ARCHS    // selected capability type archetypes
window.MAAS_VENDOR_FILTER // vendor filter for MaaS model table
ACTIVE_TAB           // current active tab
```

### Tab visibility rules
```javascript
// Always visible: overview, intel, portfolio, uc, actions, outputs, history
// Conditional:
if (PORTFOLIO_SELECTION.includes('L2-MAAS')) → show 'maas' tab
if (eng.engagement_type === 'TSAP' || eng.type === 'tsap') → show 'territory' tab
```

### Tab rendering (async pattern)
```javascript
// renderTab() is synchronous — async tabs use deferred pattern:
if (tab === 'intel') { loadAndRenderIntel(); return '<loading placeholder>' }
if (tab === 'maas')  { loadAndRenderMaas();  return '<loading placeholder>' }
// These async fns inject into #tab-body when done, only if ACTIVE_TAB still matches
```

### Portfolio tab
- Full L1/L2/L2.x/L2-Services/L3 catalogue as toggleable chips
- `togglePI(id, el)` — updates PORTFOLIO_SELECTION, calls `updateTabBar()` (NOT renderDocket)
- `updateTabBar()` — surgically updates just `.tab-bar` innerHTML, preserves state
- AI Map button → `runAIPortfolioMap()` → calls atlasAI.js (stub suggests items by engagement_type)
- Save → writes `docket_item {item_subtype: 'portfolio_selection'}`

**L2 Services portfolio items (3 peer offerings at same level):**
```
L2-MAAS    MaaS — Model as a Service
L2-GPUAAS  GPUaaS — GPU as a Service
L2-BMAAS   BMaaS — Bare Metal as a Service
```

### MaaS Config tab (when L2-MAAS selected)
- **Capability Type selector** (8 cards — these are model selection filters, NOT sub-offerings):
  Text Generation / Coding / Vision / Audio / Embedding / Video / Indic / Multimodal
- **Model table** — filtered by selected capability types from `model_catalogue`
- **Agent Harness** — optional add-on: Our Harness (LangGraph/AutoGen/CrewAI) or BYO (~15% compute buffer)
- **GPU estimate box** — auto-calculated: inference + agent + platform overhead
- Save → writes `docket_item {item_subtype: 'maas_config'}`

### Territory tab (TSAP only)
- If `territory` is null → shows text input "Set Territory" form, saves to `engagements.territory`
- If territory set → shows links to TSAP FM (S1-S4 profile + Territory Config)
- "Change" button to update territory

### Engagement type dropdown
- Inline `<select>` in docket header — dark-bordered, visible on white background
- `setEngagementType(val)` → PATCHes `engagements.engagement_type`, re-renders docket
- When TSAP selected with no territory → prompts for territory name immediately
- Tab bar updates instantly (Territory tab appears)

### Requirements block (Overview tab)
- Shows at top of Overview before KPIs
- Displays objective, problem, success criteria, constraint chips
- "Edit" button → modal with large textareas → saves to `engagements.requirements`
- If no requirements → amber warning with "+ Add Requirements" button

### Supabase helpers in docket
```javascript
getSB()                    // returns {url, key} from atlasGetGlobal()
sbGet(table, filter)       // GET
sbPost(table, body)        // POST with upsert
sbPatch(table, filter, body) // PATCH
openSASC()                 // navigates to SASC with ?eng=
openFM()                   // navigates to TSAP FM with ?eng=
saveTerritory(changeMode)  // saves territory field to engagements
savePortfolioSelection()   // saves PORTFOLIO_SELECTION as docket_item
saveMaasConfig()           // saves MaaS config as docket_item
```

---

## Settings Page — v1 BUILT ✅

**Location:** `atlas-platform/settings/index.html`

### 6 Tabs
1. **Company** — brand name, tool logo (upload/URL), document logo (upload/URL), parent company (name, website, address, city, country), local entity, document defaults (author, prefix), brand colours
2. **API Keys** — Gemini, Supabase URL+key, Anthropic, OpenAI. Test buttons.
3. **AI Models** — primary model, per-task overrides
4. **Hardware & Costs** — GPU SKU table (unit_type: per_server|per_rack|per_superchip), rack costs, network, software licensing
5. **National Averages** — power tariff, water, land, engineer salary, civil index, construction cost
6. **Model Catalogue** — full `model_catalogue` table editable, staging queue for scraper-detected models

### Model Catalogue tab
- State machine: `MC_LOAD_STATE` = idle|loading|loaded|error|no-creds
- Loads lazily when tab opened (not on every boot)
- Filter by archetype, vendor, enabled/disabled
- Toggle enable/disable per row, featured checkbox
- Edit button → prompt-based quick edit
- Sync → PATCHes all rows to Supabase
- Staging queue: Approve (moves to model_catalogue) / Reject

### Key alignment (Settings writes)
| Field | localStorage | Supabase app_config |
|---|---|---|
| Company name | `companyName` | `brand_name` |
| Tool logo | `logoUrl` | `brand_logo_url` |
| Doc logo | `docLogoUrl` | `brand_doc_logo_url` |
| Parent company | `parentCompanyName` etc | `parent_company_name` etc |
| Gemini key | `key_gemini`+`geminiKey`+`atlas_gemini_key` | — |
| Supabase | `sbUrl`+`sb_url`, `sbKey`+`sb_key` | — |
| Primary model | `geminiTextModel`+`model_tiers.default` | `atlasai_primary_model` |
| National averages | `national_averages.*` | `nat_avg_*` |
| GPU SKUs | `gpu_skus` (JSON) | `gpu_skus` |
| Hardware costs | `hardware_costs.*` | `hw_cost_*` |

---

## MaaS / Service Model Architecture — SETTLED

### Two economic layers
**Layer 1 (OEM → Customer):** CapEx — hardware, platform, services. SASC BOM.
**Layer 2 (Customer → End Users):** OpEx service model we help them model.

### Three peer service offerings (NOT sub-items of each other)
```
MaaS    — Model as a Service  (token pricing, our platform, models from model_catalogue)
GPUaaS  — GPU as a Service    (raw GPU hours, low margin)
BMaaS   — Bare Metal          (raw server time, lowest margin)
```
UC Applications — fourth peer offering (highest margin, SI work).

### MaaS 4-layer stack
```
Layer 4: Agent Harness (optional — Our Harness or BYO)
Layer 3: Models (from model_catalogue, selected by capability type)
Layer 2: Platform (Data Fusion, RAG, APIs, guardrails — ~10-15% compute overhead)
Layer 1: Infrastructure (SASC BOM)
```

### MaaS capability types (for model selection — NOT sub-offerings)
Text Generation | Coding | Vision/Multimodal | Audio/Speech | Embedding/RAG | Video | Indic/Indian Languages | General Purpose

### GPU sizing
```
inference GPUs = selected_models × gpus_per_instance[quant]
agent GPUs     = AGENT_ON ? ceil(inference_GPUs / 8) : 0
platform GPUs  = ceil((inference + agent) × 0.15)
total MaaS GPUs → added to UC infrastructure in SASC BOM
```

---

## Unit Cost Granularity — SETTLED

```
unit_type       Example SKU              GPUs/unit   Price unit
per_server      MI325X, H100, L40S       8           $22K/server
per_superchip   GB200 NVL2, VR NVL4      2 or 4      $70K/SC
per_rack        GB200 NVL72, VR NVL72    72          $3.2M/rack
```
BOM calc: `units = ceil(gpus_needed / gpus_per_unit); cost = units × usd_per_unit`

---

## TSAP FM — Architecture

### Tabs
```
Territory Profile | Programme Cost | Funding Sources | Funding Gap |
Revenue Model | Cash Flow | What-If | Territory Config →
```

### Territory Config tab
- Manual cost overrides — separate from AI-generated S1-S4
- 6 columns: Parameter / Unit / Override / S1 Extracted / National Avg / Effective (FM uses)
- Source badge: orange Config / teal S1 Data / grey Nat Avg
- `tcSave(key, val)` → writes to `atlas_global_cfg.territory_config`
- Priority chain: Config Override → S1 Index Ratio → National Average → NAT_AVG defaults

### FM reads SASC BOM (PENDING — HAICE defaults still in FM)
FM still reads HAICE hardcoded defaults — needs wiring to SASC BOM docket_item.

---

## atlasAI.js — Shared AI Module ✅

**ALL Gemini calls through atlasAI.js. NO exceptions. NO direct fetch to Gemini API.**

```javascript
atlasAI.init(sbUrl, sbKey)
atlasAI.call(prompt, opts)
atlasAI.search(prompt, opts)      // + google_search grounding
atlasAI.callAndParse(prompt, opts)
atlasAI.parseJSON(text)
atlasAI.getGeminiKey()
atlasAI.config                    // s4_max_tokens, s4_timeout_ms
```

---

## CRITICAL Technical Rules

```javascript
// NEVER
fetch('https://generativelanguage.googleapis.com/...')  // direct Gemini
{ thinkingConfig: { thinkingBudget: 0 } }               // thinkingConfig

// ALWAYS
atlasAI.call(prompt, opts)    // all AI calls
{ Prefer: 'resolution=merge-duplicates,return=minimal' } // sbInsert

// TSAP FM switchTab
switchTab(tab)        // internal — preserves stage
switchTab(tab, true)  // from tab bar — resets to S1

// Engagement routing
?eng=ENGAGEMENT_ID   // all tools receive this via URL
```

---

## Build Status

### BUILT AND WORKING ✅
| Component | Version | Notes |
|---|---|---|
| Portal root index | v1 | Customer + Engagement creation flow live |
| Engagement Docket | v2.3 | 7 tabs, MaaS Config, Territory, Requirements |
| Portal Settings | v1 | 6 tabs including Model Catalogue |
| TSAP FM Territory Profiler | v1 | S1→S4 complete |
| TSAP FM Territory Config tab | v1 | 6-col override table |
| Second Brain | v2.3 | |
| PEI Tool | v0.4 | Fixed |
| Intel Scraper | v1 | Fixed |
| atlasAI.js | v1 | Live at shared/ |

### PENDING / IN PROGRESS ⚡
| Component | Status | Notes |
|---|---|---|
| FM reads SASC BOM | 🔴 Next | Currently reads HAICE defaults |
| SASC wiring | 🔴 Next | Needs to receive ?eng=, read docket, write BOM |
| Intel items tagged by territory | 🔴 Next | Currently empty in docket |
| atlasExport.js | 🟡 Soon | Shared Word + PPT module |
| S5 Full Pitch Document | 🟡 Soon | |
| Semantic Context Tree | 🟡 Soon | Intel classification |
| Model discovery (scraper → staging) | 🟡 Soon | |

---

## Portfolio Catalogue

```
L1:  L1-TSAP, L1.1–L1.5 (programme components)
L2:  L2-AIC, L2-GIB, L2-MDC, L2-TRC, L2-HPC, L2-EDG, L2-AIF
L2.x: L2.1-INF (GeoAI), L2.2-INF (Defence), L2.3-INF (Health), L2.4-INF (FinAI)
L2-Services: L2-MAAS, L2-GPUAAS, L2-BMAAS  ← 3 peer service offerings
L3:  L3-DEP, L3-SKL, L3-GOV, L3-SEC, L3-OPS, L3-AMC, L3-RAG, L3-INT, L3-TRN
```

---

## MDC T-Shirt Sizing

| Size | Capacity | GPUs | Use |
|---|---|---|---|
| XS | ≤2 MW | 64–128 | District node, pilot |
| S | 5 MW | 256–512 | City-level |
| M | 10 MW | 512–1,024 | Territory hub |
| L | 15 MW | 1,024–1,536 | Large territory flagship |
| XL | 20 MW | 1,536–2,048+ | National/multi-territory |

---

## UC S/M/L/XL Sizing

| Size | Teams | Duration | Example |
|---|---|---|---|
| S | 1 team, 1 model | 3–6 months | Document Q&A, basic classification |
| M | 2 teams, 2–3 models | 6–12 months | Health diagnostic, RAG platform |
| L | 3+ teams, 3–5 models | 12–18 months | GLOF detection, sensor fusion |
| XL | Platform-level | 18–36 months | Sovereign AI OS, multi-ministry |

---

## ATLAS GitHub

**Repo:** `arvindbajaj5/atlas-platform`
**Live:** `arvindbajaj5.github.io/atlas-platform`
**Portal:** `index.html`
**Settings:** `settings/index.html`
**Docket:** `tools/engagement-docket/index.html`
**TSAP FM:** `tools/tsap-financial-model/index.html`
**Shared:** `shared/atlasAI.js`
**Drive root:** `1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd`

---

## Pending — Priority Order

| # | Item | Priority |
|---|---|---|
| 1 | FM wiring — reads SASC BOM docket_item, removes HAICE defaults | 🔴 |
| 2 | SASC wiring — receives ?eng=, reads docket portfolio+UC+MaaS, writes BOM | 🔴 |
| 3 | Intel items tagged by territory — scraper enhancement | 🔴 |
| 4 | atlasExport.js — shared Word + PPT module | 🟡 |
| 5 | S5 Full Pitch Document | 🟡 |
| 6 | Semantic Context Tree — intel classification | 🟡 |
| 7 | Model discovery via scraper → staging queue | 🟡 |
| 8 | AI Portfolio Mapping via atlasAI.js (stub → real) | 🟡 |
| 9 | AI Inferencing Factory wiring (?eng=, reads SASC BOM) | 🟡 |
