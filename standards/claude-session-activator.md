# ATLAS Claude Session Activator
# Version: 4.2 | Last Updated: 2026-06-19

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.
**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Strategic Positioning

**ATLAS is a Strategy & Consulting Enablement Platform** — used with the customer in boardrooms and workshops, not just as a salesperson's backend.

**Customer-facing intent:** A Chief Secretary, Finance Secretary, or CM works through ATLAS with the presales team. The sign-off package is generated in the room.

**OEM commercial position:** We prefer CapEx deals. MaaS/GPUaaS/BMaaS models are built to help our customers model their own service offerings to end users — we are not an OpEx provider except in rare cases.

---

## Full Engagement Chain — Settled Architecture

```
CUSTOMER (new entity — root of everything)
  → type: Q1-Q4 archetype + Strategic/Tactical tier
  → sector, geography, org name, primary contact
  → one customer → many engagements

ENGAGEMENT (per opportunity)
  → linked to customer_id
  → type: TSAP | Domain-Vertical | Generic
  → stage: Intelligence → Qualify → Configure → Size & Propose → Win & Scope → Deliver → Renew
  → REQUIREMENTS BLOCK: objective (free text), problem statement (free text),
    budget range, timeline, compliance constraints, success criteria
  → territory field: TSAP engagements only

DOCKET (= engagement working space, always 1:1 with engagement)
  6 tabs:
  Tab 1: Overview       → requirement block first, then stats, then next-step quick actions
  Tab 2: Intelligence   → intel items from DB tagged to customer/territory/sector (suggestion, not requirement)
                          PEI summary in right panel
  Tab 3: Portfolio      → full portfolio catalogue, AI maps against requirement, user confirms
                          "✨ AI Map" button calls atlasAI.js → Gemini suggests items
  Tab 4: Use Cases      → UC library (selectable from DB), S/M/L/XL sizing per UC
                          OR for MaaS: model catalogue selector (archetype → model → config)
  Tab 5: Models & Agents → NEW TAB, only visible when L2-MAAS selected in Portfolio
                           Model catalogue selector + agent harness config
  Tab 6: Territory Profile → ONLY visible when engagement_type === 'TSAP'
                              S1-S4 status, key territory metrics, 2x2 positioning
  Tab 7: Docket Items   → Outputs section (SASC BOM, Territory Profile, Vision Doc, FM scenario)
                          + Actions section (tasks, owner, status, overdue flags)

SASC (invoked from Docket — NOT standalone entry point)
  → reads: portfolio selection + UC list + MaaS config from docket
  → reads: unit costs from Settings (hardware SKUs, UC dev costs, people rates)
  → reads: territory cost ratios from Territory Config (for TSAP)
  → user configures: DC type, stack layers, workload profile, phase plan, people mix,
                     MaaS service model parameters
  → outputs: BOM/ROM Mode 1 (±35%), stored as docket_item {type: 'sasc_bom'}
  → buttons: "→ TSAP Financial Model" (TSAP only), "→ AI Inferencing Factory" (all types)

TSAP FM (TSAP engagements only)
  → reads SASC BOM from docket_item — NO hardcoded territory data
  → Programme Cost tab: SASC values as reference + override column + effective column
  → source badges: SASC | Settings | Nat Avg × ratio | Override | Auto
  → adds: funding model, revenue model, cash flow, scenario analysis on top of BOM

AI INFERENCING FACTORY (Stage 4, all engagement types)
  → reads SASC BOM as starting point
  → refines compute sizing with benchmark validation
  → outputs near-final BOM → updates docket_item
  → feeds back into FM for Mode 2 cost validation
```

**The key principle:**
- SASC answers: "What does this cost to build?"
- TSAP FM answers: "How do we fund it, what does it generate, does it work financially?"
- No duplication. SASC owns BOM. FM owns financial structure.

---

## Customer & Engagement Data Model

### customers table (NEW — not yet built)
```sql
CREATE TABLE customers (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         text NOT NULL,
  short_name   text,
  sector       text,        -- 'State Government'|'Central Government'|'Regulatory Body'|
                            --   'Defence / Military'|'Private Enterprise'|'CSP / Cloud Provider'|
                            --   'BFSI'|'Healthcare'|'Energy & Utilities'
  country      text DEFAULT 'India',
  segment      text,        -- 'Q1'|'Q2'|'Q3'|'Q4'
  strategic_tier text,      -- 'Strategic'|'Tactical'
  primary_contact text,
  created_at   timestamptz DEFAULT now()
);
```

### engagements table (ENHANCED — add customer_id + requirements)
```sql
ALTER TABLE engagements
  ADD COLUMN customer_id text REFERENCES customers(id),
  ADD COLUMN requirements jsonb;
  -- requirements: {
  --   objective: "free text",
  --   problem: "free text",
  --   success_criteria: "free text",
  --   budget_range: "₹500 Cr+",
  --   timeline: "2–5 years",
  --   constraints: ["Sovereign data", "Green / renewable"]
  -- }
```

### Engagement types
- **TSAP** — Territory Sovereign AI Programme. Full chain: SASC → Territory Profile S1-S4 → TSAP FM → Vision Doc. Territory field required.
- **Domain-Vertical** — Single regulator/sector. Deep AI for one domain. SASC → Inferencing Factory → Vertical Pitch.
- **Generic** — Enterprise/govt AI need. SASC → Inferencing Factory.

---

## MaaS / Service Model Architecture — SETTLED

### Two economic layers
**Layer 1 (OEM → Customer):** We sell CapEx — hardware, platform, services. SASC BOM is our deal.
**Layer 2 (Customer → End Users):** Customer monetises their infrastructure. SASC models their service pricing so they can build a business case.

### Four service models (all modelled in SASC)
```
MaaS — Model as a Service
  Customer offers AI capability by model archetype to end users
  Pricing: per 1M tokens (input/output), per concurrent session, per minute (audio)
  OEM sees: GPU CapEx. Customer sees: token revenue model.

GPUaaS — GPU as a Service
  Customer offers raw GPU hours to developers/researchers
  Low margin, but some CSP/hyperscale customers need this modelled
  OEM sees: GPU CapEx. Customer sees: GPU-hour pricing.

BMaaS — Bare Metal as a Service
  Customer offers server time (CPU-intensive AI preprocessing)
  Even lower margin. Supported but not led with.

UC Applications — Use Case Based
  Customer offers packaged AI applications (highest margin, what we recommend leading with)
  OEM sees: UC dev cost + GPU CapEx. Customer sees: per-user or per-dept pricing.
```

**In rare OEM OpEx deals:** use Layer 2 pricing as our own billing model. Flag: `deal_mode = capex | opex`.

### MaaS stack (4 layers, all modelled)
```
Layer 4 — Agent Harness (optional add-on within MaaS config)
  Our harness (LangGraph / AutoGen / CrewAI — included in platform stack)
  OR BYO harness (customer brings own framework — we provide compute buffer ~15%)
  Config: orchestration model (small fast model), memory store (Redis/pgvector/Chroma)
  Compute: adds ~1 GPU per 8 inference GPUs for orchestration

Layer 3 — Models (inference)
  Selected by archetype from model_catalogue
  GPU sizing = f(model params, quantisation, SLA tier, concurrent sessions)

Layer 2 — Platform (serving + routing + guardrails)
  Our AI platform stack (Data Fusion, RAG, APIs, gateways, guardrails)
  Already in SASC scope. Adds ~10-15% compute overhead.

Layer 1 — Infrastructure
  SASC BOM: hardware + DC + network
```

### MaaS sizing logic
```
Input: archetypes selected + models + quant + SLA + expected concurrent sessions/RPS
    ↓
model_catalogue lookup: gpu_memory_gb[quant] → gpus_per_instance[quant]
    ↓
concurrent sessions × gpus_per_instance = inference GPUs
    ↓
+ agent overhead (if enabled): ~1 GPU per 8 inference GPUs
    ↓
+ platform overhead: 10-15% additional
    ↓
total GPUs → ÷ gpus_per_chassis → rack count (ceiling) → CapEx BOM
    ↓
GPU cost amortisation → pricing model (token price to end users)
```

---

## Model Catalogue — Supabase Table (NEW — not yet built)

### model_catalogue table
```sql
CREATE TABLE model_catalogue (
  id                     text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                   text NOT NULL,
  vendor                 text,
  family                 text,
  archetype              text[],     -- ['coding','document','audio','video','vision','multimodal','embedding','reranking']
  params_b               numeric,
  quant_options          text[],     -- ['FP16','BF16','INT8','INT4','GGUF-Q4']
  context_length_k       integer,
  max_input_tokens       integer,
  max_output_tokens      integer,
  gpu_memory_gb          jsonb,      -- {"FP16": 140, "INT4": 35}
  gpus_per_instance      jsonb,      -- {"FP16": 2, "INT4": 1}
  throughput_rps         jsonb,      -- {"INT4": 12, "INT8": 8} per GPU
  bench_mmlu             numeric,
  bench_humaneval        numeric,
  bench_mbpp             numeric,
  bench_gsm8k            numeric,
  bench_hellaswag        numeric,
  bench_arc              numeric,
  bench_notes            text,
  license                text,       -- 'Apache2'|'MIT'|'Llama-Community'|'Custom'
  release_date           date,
  price_input_per_1m     numeric,    -- our recommended sell price Rs/USD
  price_output_per_1m    numeric,
  sla_bronze_ttft_ms     integer,
  sla_silver_ttft_ms     integer,
  sla_gold_ttft_ms       integer,
  enabled                boolean DEFAULT true,
  source                 text DEFAULT 'manual', -- 'manual'|'scraper_detected'
  notes                  text,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE TABLE model_catalogue_staging (
  id                     text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  raw_intel_id           text,       -- FK to intelligence_items
  detected_name          text,
  detected_vendor        text,
  detected_params_b      numeric,
  detected_context_k     integer,
  detected_benchmarks    jsonb,
  detected_license       text,
  source_url             text,
  source_date            timestamptz,
  enriched_data          jsonb,      -- filled during user review
  status                 text DEFAULT 'pending', -- 'pending'|'approved'|'rejected'
  reviewed_by            text,
  reviewed_at            timestamptz,
  created_at             timestamptz DEFAULT now()
);
```

### Catalogue scope — models to seed (~150 entries)

**Language — General:**
Meta Llama 3.1 (8B/70B/405B), 3.2 (1B/3B), 3.3 (70B), 4 Scout, 4 Maverick
Mistral 7B, Mixtral 8x7B, 8x22B, Small 3.1, Large 2, Codestral
Google Gemma 2 (2B/9B/27B), Gemma 3 (all sizes)
Microsoft Phi-3-mini/small/medium, Phi-4, Phi-4-mini
Cohere Command-R, Command-R+, Command-A
TII Falcon 2-11B, Falcon 3 (all sizes)
Allen AI OLMo 2 (all sizes)

**Chinese Models:**
DeepSeek V2/V2.5/V3/R1/R1-Zero, R1-Distill variants, Coder V2, Janus Pro
Alibaba Qwen 2.5 (0.5B→72B), Qwen 2.5-Coder, Qwen 2.5-Math, QwQ-32B, Qwen-VL, Qwen-Audio, Qwen3 (all sizes)
Zhipu AI GLM-4, GLM-4-9B, GLM-4V, CogVideoX, CogView
Moonshot Kimi k1.5, Kimi-VL (open variants)
01.AI Yi-1.5 (all sizes), Yi-VL
Shanghai AI Lab InternLM 2.5 (all sizes), InternVL 2.5 (all sizes)
MiniMax MiniCPM 3, MiniCPM-V
ByteDance Doubao (open variants)

**Indian:**
Sarvam-1, Sarvam-2B, Sarvam-M, Maya, Bulbul TTS, Shuka STT
AI4Bharat Airavata, IndicBERT, IndicBART

**Coding:**
StarCoder2 (3B/7B/15B), OctoCoder, WizardCoder
(DeepSeek Coder V2 and Qwen Coder already above)

**Vision / Multimodal:**
LLaMA 3.2 Vision (11B/90B), Pixtral-12B, Pixtral Large
Phi-3.5-Vision, InternVL 2.5 (2B→78B), LLaVA 1.5/1.6/NeXT, Idefics 3

**Audio / Speech:**
Whisper (tiny→large-v3), SeamlessM4T, Voicebox
XTTS-v2 (Coqui), Kokoro 82M TTS
(Sarvam TTS/STT already above)

**Embedding / Reranking:**
Nomic Embed Text 1.5, BGE-M3, BGE reranker, Cohere Embed 3, mxbai-embed-large, Jina v3

**Video Generation:**
Wan 2.1 (14B), CogVideoX-5B, LTX-Video

### Model discovery via Intel Scraper (FUTURE)
```
Scraper detects item tagged 'model_release' via Semantic Context Tree
    ↓
Extracts: model name, vendor, params, benchmarks, license, context length
    ↓
Writes to model_catalogue_staging (status: 'pending')
    ↓
User notification in ATLAS: "N new models detected — review"
    ↓
User reviews staging queue in Settings → Model Catalogue tab:
  Approve (with enrichment) → moves to model_catalogue
  Reject → status: 'rejected'
  Edit → enriched_data filled, then approve
```

---

## Portfolio Map — Enhanced Structure (to be built)

### Full catalogue with MaaS as first-class category

```
L1 — TSAP Programme
  L1-TSAP  Territory Sovereign AI Programme (XL)
  L1.1     Programme Management (L)
  L1.2     Governance Framework (M)
  L1.3     Ecosystem Development (M)
  L1.4     Policy & Regulatory (M)
  L1.5     Financing & Structuring (M)

L2 — AI Infrastructure
  L2-AIC   AI Centre (Flagship) (XL)
  L2-GIB   GenAI-in-a-Box (S/M)
  L2-MDC   Modular Datacenter (L)
  L2-TRC   GPU Training Cluster (L)
  L2-HPC   HPC Cluster (XL)
  L2-EDG   Edge AI Node (XS)
  L2-AIF   Multi-Purpose AI Factory (XL)

L2.x — Domain AI Centres
  L2.1-INF GeoAI Centre (M)
  L2.2-INF Defence AI Centre — air-gapped, MIL-SPEC (L)
  L2.3-INF Health AI Centre (M)
  L2.4-INF FinAI Centre (M)

L2-MAAS — Model as a Service (NEW — first-class portfolio item)
  Coding Assistant Package    (DeepSeek-Coder, Qwen-Coder, StarCoder, Llama Code)
  Document Intelligence       (Mistral, Llama, Sarvam for Indian languages)
  Audio / Speech Package      (Whisper, Sarvam TTS/STT, SeamlessM4T)
  Vision & Video Package      (LLaVA, InternVL, Pixtral, Wan for video)
  Multimodal Suite            (combined vision + language + audio)
  Embedding & Reranking       (BGE-M3, Nomic, Jina — for RAG pipelines)
  Agent Harness Package       (framework + orchestration model + memory store)
  GPUaaS / BMaaS Package      (raw capacity — low margin, supported not led)

L3 — Lifecycle Services (23 items)
  L3-DEP   Deployment & Integration (L)
  L3-SKL   AI Skills Academy (M)
  L3-GOV   AI Governance (M)
  L3-SEC   AI Security (M)
  L3-OPS   Managed Operations (L)
  L3-AMC   AMC & Refresh (L)
  L3-RAG   RAG Platform Setup (M)
  L3-INT   System Integration (L)
  L3-TRN   Training & Capacity Building (M)
  ... (remaining L3 items)
```

### service_model_type field on portfolio items
Every portfolio item has a service_model_type:
- `infrastructure` — L2 items (CapEx asset)
- `maas` — L2-MAAS items (service, OpEx model for customer's users)
- `uc_app` — UC Applications (SI + service)
- `service` — L3 Lifecycle Services

### AI Portfolio Mapping (in Docket)
"✨ AI Map against Requirement" button calls atlasAI.js (never direct Gemini fetch):
```javascript
atlasAI.call(prompt, { tool: 'portfolio-mapper', callType: 'requirement_analysis' })
// prompt includes: requirement text + customer type + engagement type + intel context
// returns: suggested portfolio items with rationale
// suggested items shown in blue in portfolio grid
// user confirms → green
```

---

## Unit Cost Granularity — SETTLED

### GPU SKU unit_type field (Settings → Hardware & Costs)
```
SKU                         unit_type       gpus_per_unit   usd_per_unit
MI325X (8-GPU server)       per_server      8               $22,000
H100 SXM (8-GPU)            per_server      8               $30,000
L40S (8-GPU server)         per_server      8               $8,000
A100 SXM (8-GPU)            per_server      8               $15,000
GB200 NVL2 (2-GPU SC)       per_superchip   2               $70,000
GB200 NVL72 (72-GPU rack)   per_rack        72              $3,200,000
VR NVL72 (72-GPU rack)      per_rack        72              TBD
VR NVL4 (4-GPU module)      per_superchip   4               TBD
```

### BOM calculation with unit_type
```javascript
// Given: gpus_needed, sku
var units_needed = Math.ceil(gpus_needed / sku.gpus_per_unit)
var hardware_cost_usd = units_needed * sku.usd_per_unit
// Always ceiling — can't buy half a rack
```

---

## Docket Tab Visibility Rules

```javascript
// Territory Profile tab — engagement_type === 'TSAP' only
if (engagement.type !== 'TSAP') hideTab('territory')

// Models & Agents tab — L2-MAAS selected in portfolio only
if (!portfolio.includes('L2-MAAS')) hideTab('models-agents')

// All other tabs always visible
```

---

## Build Status — Honest Assessment

### BUILT AND WORKING ✅

| Component | Status | Notes |
|---|---|---|
| Second Brain | ✅ Live v2.3 | |
| PEI Tool | ✅ Fixed | data is not defined + _t0 bugs fixed |
| Engagement Docket | ✅ Live v2.2 | Sprint 1+2 — pre-new architecture |
| Intel Scraper | ✅ Fixed | script tag + init() + duplicate code fixed |
| Portal Settings Page | ✅ Built | 5 tabs, settings/index.html |
| TSAP FM Territory Profiler | ✅ Live | S1→S4 pipeline complete |
| TSAP FM Territory Config tab | ✅ Built | 6-col override table, priority chain |
| atlasAI.js | ✅ Live | shared/atlasAI.js |
| Root Index | ✅ Updated | Settings nav all roles, points to settings/index.html |

### IN PROGRESS / PARTIALLY BUILT ⚡

| Component | Status | Notes |
|---|---|---|
| Portal Settings | ⚡ v1 built | Needs Model Catalogue tab + unit_type on SKUs |
| TSAP Financial Model | ⚡ Live | Programme Cost reads HAICE defaults — needs SASC wiring |
| Territory 2x2 Framework | ⚡ Live in FM | Standalone tool also exists |
| S4 Vision Document | ⚡ Built | Word export working; atlasExport.js pending |
| S1 Wiki | ⚡ Expanded | 12 sections; N/A fields need ↻ Refresh |

### DESIGNED, MOCKUPS IN PROGRESS 📐

| Component | Status | Notes |
|---|---|---|
| Customer entity + flow | 📐 Mockup v2 done | Mockup 1 |
| Docket v2 | 📐 Mockup v2 done | Mockup 2 — needs MaaS tab |
| SASC → FM handoff | 📐 Mockup done | Mockup 3 |

### NOT YET BUILT 🔧 (priority order)

| # | Item | Priority |
|---|---|---|
| 1 | SQL: customers table + engagements enhancement | 🔴 Next |
| 2 | SQL: model_catalogue + model_catalogue_staging tables | 🔴 Next |
| 3 | Mockup 2 rebuild: MaaS tab + full portfolio + UC library | 🔴 Next |
| 4 | Settings: Model Catalogue tab + staging queue | 🔴 Next |
| 5 | Settings: unit_type on GPU SKUs | 🔴 Next |
| 6 | Portfolio Map tool: add L2-MAAS category | 🔴 Next |
| 7 | Customer creation UI in portal | 🔴 Next |
| 8 | Docket v2: full rebuild with new tab structure | 🔴 Next |
| 9 | SASC: receives engagement_id, reads docket, writes BOM | 🔴 Next |
| 10 | FM: reads SASC BOM docket_item, removes HAICE defaults | 🔴 Next |
| 11 | atlasExport.js shared Word + PPT module | 🟡 Soon |
| 12 | S5 Full Pitch Document | 🟡 Soon |
| 13 | Semantic Context Tree | 🟡 Soon |
| 14 | Model discovery via scraper → staging queue | 🟡 Soon |
| 15 | AI Inferencing Factory: receives engagement_id, reads SASC BOM | 🟡 Soon |
| 16 | Intel duplication strategy: S1 queries DB before live search | 🟡 Soon |
| 17 | Mode 1 Budget Envelope Model | 🟡 Soon |

---

## Portal Settings Page — Current State ✅

**Location:** `atlas-platform/settings/index.html`
**Tabs:** Company | API Keys | AI Models | Hardware & Costs | National Averages

### Pending Settings enhancements
- **unit_type field** on GPU SKU table rows (per_gpu / per_server / per_rack / per_superchip)
- **Model Catalogue tab** (new 6th tab) — editable model_catalogue rows + staging queue

### Key alignment (what Settings writes)
| Field | localStorage | Supabase app_config |
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

### Tab Bar
```
Territory Profile | Programme Cost | Funding Sources | Funding Gap |
Revenue Model | Cash Flow | What-If | Territory Config →
```

### Territory Config tab (manual, separate from AI-generated S1-S4)
- Lives as separate tab in TSAP FM — NOT in global Settings
- 6-column table: Parameter / Unit / Override / S1 Extracted / National Avg / Effective (FM uses)
- Source badge: orange Config / teal S1 Data / grey Nat Avg
- Priority chain: Config Override → S1 Index Ratio → National Average
- Programme defaults: period, currency, investment scenario
- `tcSave(key, val)` writes to `atlas_global_cfg.territory_config`

### Cost calculation priority chain
```javascript
getTerritoryCosts() → returns effective costs
// 1. atlas_global_cfg.territory_config[key]   ← manual override (highest)
// 2. S1 extracted index_pct / 100 × nat_avg   ← territory intelligence
// 3. atlas_global_cfg.national_averages[key]  ← Settings national averages
// 4. NAT_AVG hardcoded defaults               ← absolute fallback
```

### Programme Cost (PENDING FIX)
Currently reads HAICE hardcoded defaults. Should read from SASC BOM docket_item.
Fix: `MODEL` object populated from `docket_items` where `type = 'sasc_bom'` for this engagement.
Override column allows FM-level adjustments. SASC value always visible as reference.

---

## atlasAI.js — Shared AI Module ✅

**ALL Gemini calls across ALL tools must flow through atlasAI.js. No exceptions. No direct fetch to Gemini API anywhere.**

**Location:** `atlas-platform/shared/atlasAI.js`

**Public API:**
```javascript
atlasAI.init(sbUrl, sbKey)           // load config from Supabase app_config
atlasAI.call(prompt, opts)            // text generation, fallback chain, thinking-part skip
atlasAI.search(prompt, opts)          // + google_search grounding, returns sources[]
atlasAI.parseJSON(text)               // 4-strategy JSON repair
atlasAI.callAndParse(prompt, opts)
atlasAI.sectionMaxTokens(name)
atlasAI.getGeminiKey()
atlasAI.config                        // s4_max_tokens, s4_timeout_ms from Supabase
atlasAI.ready
```

**Per-call timeout override:** `opts._timeout` overrides global config

**This applies to:**
- TSAP FM S1 extraction, S2 profile, S4 Vision Doc
- Docket portfolio AI mapping
- MaaS model suggestion
- Requirement analysis
- ALL future Docket/SASC AI calls

---

## CRITICAL — Technical Rules

### Never do this
```javascript
// NEVER — direct Gemini fetch
fetch('https://generativelanguage.googleapis.com/...', {...})

// NEVER — thinkingConfig
{ thinkingConfig: { thinkingBudget: 0 } }
```

### Always do this
```javascript
// ALL AI calls through atlasAI.js
atlasAI.call(prompt, opts)
atlasAI.search(prompt, opts)
atlasAI.callAndParse(prompt, opts)
```

### sbInsert — always upsert
```javascript
headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
```

### switchTab (TSAP FM)
```javascript
switchTab(tab)         // internal — preserves stage
switchTab(tab, true)   // from tab bar — resets profile to S1
```

### Territory Config save
```javascript
tcSave(key, val)
// Blank/null/0 → deletes key (clears override)
// Numeric strings → converted to float
// programme_years/currency also synced to MODEL
```

### URL-based engagement routing
```javascript
// All tools receive engagement context via URL
?eng=ENGAGEMENT_ID
// On load: fetch engagement + docket + SASC BOM from Supabase
// Context bar always shows: customer · engagement · type
```

---

## Supabase — Tables Reference

### Existing tables
- `customers` — NEW, not yet created
- `engagements` — exists, needs customer_id + requirements jsonb
- `docket_items` — exists, needs item_subtype field
  - subtypes: `sasc_bom` | `fm_scenario` | `territory_profile` | `uc_list` | `portfolio_selection` | `vision_doc`
- `territory_profiles` — S1-S4 session, working correctly
- `tsap_unit_costs` — 43 unit costs, now owned by Settings
- `people_params` — manpower roles + day rates, surfaced in Settings
- `intelligence_items` — scraper output
- `app_config` — atlasai_* config + nat_avg_* + brand_* + hw_cost_* + gpu_skus

### New tables needed
- `model_catalogue` — full OS model catalogue (see schema above)
- `model_catalogue_staging` — scraper-detected models pending review

### Supabase migrations applied
- `territory_profiler_session.sql` — session jsonb column
- `national_averages_migration.sql` — nat_avg_* + atlasai_s4_* in app_config

### RLS: DISABLED on all tables

---

## Mockups Status

**Mockup 1 — Customer & Engagement (v2):** `atlas-mockup-1-customer.html`
- Customer list / search → New customer form (segment + tier) → Engagement creation with requirements block → Confirm + open docket
- Requirements: objective (free text, large), problem statement (free text, large), budget chips, timeline chips, compliance chips, success criteria (free text)
- Territory field: TSAP engagements only
- Pending: textarea height fix (currently too small)

**Mockup 2 — Engagement Docket (v2):** `atlas-mockup-2-docket.html`
- 6 tabs: Overview | Intelligence | Portfolio | Use Cases | Territory Profile | Docket Items
- Territory tab: TSAP engagement_type only
- Models & Agents tab: NOT YET IN MOCKUP — needs rebuild
- Portfolio: AI mapping button calls atlasAI.js
- Docket Items: Outputs section + Actions section with tasks/owner/status
- Pending: MaaS tab, full portfolio with L2-MAAS, UC library selector

**Mockup 3 — SASC → FM Handoff:** `atlas-mockup-3-sasc-fm.html`
- Shows BOM/ROM tab + FM Programme Cost tab + Inferencing Factory entry
- Source badges: SASC / Settings / Nat Avg × ratio / Override / Auto
- Override column: changes to orange when user edits
- Status: design complete, pending actual SASC wiring

---

## Intelligence Duplication — TO BE ADDRESSED

Current state: multiple tools run independent Gemini search calls:
- Scraper: RSS + topic searches → intelligence_items
- Second Brain: reads intelligence_items + runs Gemini analysis
- PEI: queries intelligence_items + runs Gemini generation
- TSAP S1: runs Gemini search grounding for territory — DUPLICATES scraper work

**Target architecture:**
- Scraper = ONLY tool that calls Gemini search grounding
- S1 = queries intelligence_items first; only triggers live search if < N items for territory in last 90 days
- Second Brain + PEI = read from intelligence_items only, local Gemini summarisation
- Semantic Context Tree = classifies items once on ingest (not per-tool)
- Online search = fallback only, used sparingly

**Not yet implemented — deferred until Semantic Context Tree is built**

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

## UC S/M/L/XL Sizing

| Size | Teams | Duration | Example |
|---|---|---|---|
| S — Simple | 1 team, 1 model | 3–6 months | Document Q&A, basic classification |
| M — Medium | 2 teams, 2–3 models | 6–12 months | Multimodal health diagnostic, RAG platform |
| L — Large | 3+ teams, 3–5 models | 12–18 months | Real-time sensor fusion, GLOF detection |
| XL — Complex | Platform-level, multiple integrations | 18–36 months | Sovereign AI OS, multi-ministry platform |

---

## Portfolio Catalogue

```
L1: L1-TSAP, L1.1–L1.5 (programme components)
L2: L2-AIC, L2-GIB, L2-MDC, L2-TRC, L2-HPC, L2-EDG, L2-AIF
L2.x: L2.1-INF (GeoAI), L2.2-INF (Defence), L2.3-INF (Health), L2.4-INF (FinAI)
L2-MAAS: Coding / Document / Audio / Vision / Multimodal / Embedding / Agent Harness / GPUaaS / BMaaS
L3: 23 lifecycle services (DEP, SKL, GOV, SEC, OPS, AMC, RAG, INT, TRN, ...)
```

---

## ATLAS GitHub

**Repo:** `arvindbajaj5/atlas-platform`
**Live:** `arvindbajaj5.github.io/atlas-platform`
**Shared:** `atlas-platform/shared/` (atlasAI.js live; atlasExport.js pending)
**Settings:** `atlas-platform/settings/index.html`
**TSAP FM:** `atlas-platform/tools/tsap-financial-model/index.html`
**Drive root:** `1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd`
