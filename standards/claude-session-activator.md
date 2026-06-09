# ATLAS Claude Session Activator
# Version: 3.6 | Last Updated: 2026-06-07

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.
**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Strategic Positioning

**ATLAS is a Strategy & Consulting Enablement Platform** — used with the customer in boardrooms and workshops, not just as a salesperson's backend.

**Customer-facing intent:** A Chief Secretary, Finance Secretary, or CM works through ATLAS with the presales team. The sign-off package is generated in the room.

**What stays in ATLAS:**
Intelligence → Analysis & Recommendation → Programme Design → Financial Modelling → Sign-off Package

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

### NOT YET BUILT 🔧 (in priority order)

| Component | Priority | Notes |
|---|---|---|
| Semantic Context Tree | 🔴 Next | Foundational — upgrades scraper + RE + PEI simultaneously |
| AI Centre Configurator | 🔴 Next | Full stack modelling → BOM + ROM |
| Mode 1 — Budget Envelope Model | 🔴 Next | Pre-UC parametric cost model |
| UC Definition + Reconciliation | 🔴 Next | UC vs budget fit |
| Mode 2 — Detailed Financial Model | 🔴 Next | 6 tabs, curves, scenarios |
| Territory AI Programme Profiler | 🟡 Next | 10 dims, radar, 4 archetypes |
| Pitch Report generator | 🟡 Next | Boardroom document in the room |
| AI Centre Builder unified flow | 🟡 Next | Steps 1-7 connected end to end |

---

## NEXT PRIORITY: Semantic Context Tree

**Why it's first:** Single build that upgrades intelligence quality across scraper, Second Brain, PEI, and Recommendation Engine simultaneously. The current extraction prompt oscillates between junk and low yield — the semantic tree solves this permanently.

### Architecture

```
Supabase: semantic_contexts table
  → tier (direct_opportunity | technology_signal | market_signal | exclude)
  → context_string (natural language description of the signal)
  → portfolio_codes (which L1/L2/L3 items this signal maps to)
  → active (boolean)

intelligence_items table (add 2 columns):
  → matched_context text
  → matched_tier text
```

### Context Tree Design

**TIER 1 — Direct Opportunity (high value)**
- Government issuing RFP/RFI/tender for AI, data centre, HPC, or digital infrastructure
- State government announcing AI programme, digital mission, or data sovereignty initiative
- Defence ministry procurement for surveillance, autonomous systems, C4I, ISR
- Ministry or PSU signing MoU for AI/digital transformation
- Budget allocation for AI, HPC, supercomputing, or digital infrastructure
- National AI mission, sovereign AI, or digital public infrastructure announcement

**TIER 2 — Technology Signal (medium value)**
- AI/ML model deployment in government, defence, health, agriculture, or finance
- GPU cluster, HPC, or supercomputer deployment or procurement
- Satellite data analytics, EO processing, geospatial AI application
- Defence system with AI, sensor fusion, autonomous, or surveillance technology
- LLM, generative AI, or foundation model deployment in enterprise or government
- Data centre investment, cloud infrastructure, or edge computing deployment
- Cybersecurity AI, threat detection, or signals intelligence technology

**TIER 3 — Market Signal (lower value, track)**
- NVIDIA, AMD, HPE, Dell, Supermicro announcing product/win/partnership in India
- Indian AI startup raising significant funding (>50 crore)
- Global sovereign AI centre deployment (UAE, Saudi, Singapore, France, UK)
- AI regulation, data localisation, or sovereignty policy announcement
- State election manifesto or budget with digital/AI commitments

**HARD EXCLUDE — never relevant**
- Military personnel appointments, promotions, retirements, command handovers
- Military ceremonies, parades, exercises without technology angle
- Geopolitical analysis without technology procurement angle
- Stock prices, mutual funds, commodity prices, personal finance
- General health news without digital health or AI angle
- Sports, entertainment, celebrity, weather, obituaries

### Context → Portfolio Mapping

```javascript
const CONTEXT_TO_PORTFOLIO = {
  'government RFP for AI or digital infrastructure':    ['L1-TSAP', 'L2-INF'],
  'state government AI programme':                      ['L1-TSAP', 'L1.1-TSAP'],
  'national AI mission or sovereign AI':               ['L1-TSAP', 'L1.3-TSAP'],
  'budget allocation for AI or HPC':                   ['L1-TSAP', 'L2-AIF'],
  'GPU cluster or HPC deployment':                     ['L2-AIF', 'L2-TRC'],
  'satellite data or geospatial AI':                   ['L2.1-INF', 'L2-EDG'],
  'defence surveillance or autonomous systems':         ['L2.2-INF', 'L2-EDG'],
  'LLM or generative AI in government':                ['L2-INF', 'L2-GIB'],
  'data centre investment or edge computing':           ['L2-MDC', 'L2-EDG'],
  'AI regulation or data localisation':                ['L1.3-TSAP', 'L1.5-TSAP'],
  'global sovereign AI centre':                        ['L1-TSAP'],
}
```

### Two-Phase Filtering (keyword + semantic)

```
Phase 1 — Keyword pre-filter (free, instant)
  Title/content must contain AI-adjacent keywords
  FAIL → skip without API call (cost saving)
  PASS → go to Phase 2

Phase 2 — Semantic context tree matching (Gemini)
  Match against context tree
  Output: tier + matched_context + portfolio_codes
  Store in intelligence_items with context metadata
```

### Cross-Platform Impact

- **Scraper** — context tree replaces blunt extraction prompt
- **Second Brain** — items grouped/filtered by matched_context and tier
- **PEI** — customer text parsed through tree → matched contexts as structured signals
- **RE** — reads matched_context tags → maps to portfolio codes directly → precise recommendations
- **TSAP AI Enrich** — pulls items filtered by context + geography

---

## ATLAS — Core Architecture

```
INTELLIGENCE LAYER ✅
  Second Brain + PEI + Scraper (with semantic tree pending)
        ↓
ANALYSIS & RECOMMENDATION ✅ (RE working, context tree will improve it)
        ↓
DESIGN & CONFIGURATION 🔧
  AI Centre Builder Steps 1-7 (not built)
  AI Centre Configurator — full stack (not built)
        ↓
FINANCIAL MODELLING 🔧
  Mode 1: Budget Envelope (not built)
  Mode 2: Detailed 6-tab model (not built)
        ↓
SIGN-OFF PACKAGE 🔧
  Pitch Report (not built)
```

---

## Financial Model — Two Modes (full spec in v3.3-3.5)

**Mode 1** — Parametric budget envelope pre-UC (±35%)
**Mode 2** — Detailed 6-tab post-UC model:
- Tab 1: Objectives (Type A/B/C)
- Tab 2: Cost Model (from Configurator BOM/ROM)
- Tab 3: UC Schedule & Benefit Phasing ← key tab
- Tab 4: Financing Sources (moratorium critical — often more important than rate)
- Tab 5: Financial Curves (cash-in/out, breakeven, political kill zone visualisation)
- Tab 6: Scenarios & What-If

**Key insight:** Benefits don't flow when programme starts. Moratorium period bridges the cash-out zone. UC pull-in/delay controls the benefit curve.

---

## Intelligence Scraper — Current State

**Status:** Running daily, functional but low yield (2-3 items/run)
**Root cause:** Extraction prompt too blunt — oscillates between quality and yield
**Fix:** Semantic context tree (next priority build)

**Current settings:**
- RSS: true (15 active feeds from feed_library)
- Items per domain: 2
- Delay: 1000ms
- Dedup window: 7 days
- Search grounding: gemini-3.5-flash (correct model — do not change)
- Global topics: 5 (UC-GLB, TEC-GLB, OEM-GLB, POL-GLB, INV-GLB)

**Feed Library:**
- 15 active feeds across DEF-MIL, DEF-SPC, GEO-SPA, MKT-DEF, TEC-GEN, HLT-LIF, MKT-SOV
- Weekly discovery workflow (feed_discovery.yml) — runs Sundays
- Health check auto-dormants failing feeds, re-activates recovered ones
- Global feed discovery still needed (HPCwire, The Register, C4ISRNET etc.)

**Do NOT enable daily schedule yet** — wait until semantic tree improves quality

**Multilingual:** Deferred — literal translation approach won't work, needs careful design

---

## Supabase — Critical Notes

**RLS disabled on ALL tables.**
**Engagements archetype:** `territory_coe` | `govt_sectorial` | `enterprise` | `defence`

**New columns needed (before semantic tree build):**
```sql
ALTER TABLE intelligence_items 
  ADD COLUMN IF NOT EXISTS matched_context text,
  ADD COLUMN IF NOT EXISTS matched_tier text;

CREATE TABLE IF NOT EXISTS semantic_contexts (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tier        text NOT NULL CHECK (tier IN ('direct_opportunity','technology_signal','market_signal','exclude')),
  name        text NOT NULL,
  context_string text NOT NULL,
  portfolio_codes text[] DEFAULT '{}',
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
```

---

## CRITICAL — thinkingConfig

NEVER add `thinkingConfig:{thinkingBudget:0}` to Gemini calls.

---

## CRITICAL — Key Resolution Pattern

```javascript
var g = atlasGetGlobal()
var model = atlasGetTaskModel('task_id') || 'gemini-3.1-flash-lite'
var key = atlasGetKeyForModel(model) || g.key_gemini || g.key_anthropic || g.key_openai || ''
if(!atlasGetKeyForModel(model) && key){
  if(g.key_gemini) model = 'gemini-3.1-flash-lite'
  else if(g.key_anthropic) model = 'claude-haiku-4-5-20251001'
}
```

---

## Portfolio Catalogue

```
L1     L1-TSAP    Territory Sovereign AI Programme
L1.1-L1.5         Programme components (partner-led)
L2     L2-GIB     GenAI-in-a-Box ✅
L2     L2-AIF     Multi-Purpose AI Factory ✅
L2     L2-INF     AI Centre (rename L2-AIC pending decision)
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

## MDC T-Shirt Sizing (per site)

| Size | Capacity | GPUs | Tokens/day | Use |
|---|---|---|---|---|
| XS | ≤2 MW | 64–128 | 500M–1B | District node, pilot |
| S | 5 MW | 256–512 | 2–5B | City-level |
| M | 10 MW | 512–1,024 | 5–10B | Territory hub |
| L | 15 MW | 1,024–1,536 | 10–15B | Large territory flagship |
| XL | 20 MW | 1,536–2,048+ | 15–25B | National/multi-territory |

---

## Pending Items (Priority Order)

| # | Item | Priority |
|---|---|---|
| 1 | Semantic Context Tree — Supabase table + seed data | 🔴 Next session |
| 2 | Wire semantic tree into scraper (replace extraction prompt) | 🔴 Next session |
| 3 | Wire semantic tree into RE (context → portfolio mapping) | 🔴 Next session |
| 4 | Wire semantic tree into PEI (parse brief through tree) | 🟡 Next |
| 5 | AI Centre Configurator (full stack, all layers) | 🔴 Next laptop session |
| 6 | Mode 1 — Budget Envelope Model | 🔴 Next |
| 7 | UC Definition + Reconciliation flow | 🔴 Next |
| 8 | Mode 2 — Detailed Financial Model (6 tabs) | 🔴 Next |
| 9 | Territory AI Programme Profiler | 🟡 Next |
| 10 | Pitch Report generator | 🟡 Next |
| 11 | Enable daily scraper schedule (after semantic tree) | 🟡 Soon |
| 12 | Global feed discovery (HPCwire, C4ISRNET etc.) | 🟡 Soon |
| 13 | GCP billing investigation | 🟡 Soon |
| 14 | Decide portfolio code rename L2-INF → L2-AIC | 🟡 Soon |
| 15 | UX pass — Engagement Docket | ⬜ Later |
| 16 | Visualisations (radar, territory map, tokenomics) | ⬜ Later |
| 17 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions |

---

## Intelligence Operations — Agent Architecture (Future Sprint)

**Decision: Build after current ATLAS priorities (AI Centre Configurator, Financial Model, Pitch Report)**

### Planned Agent Harness

```
Agent 1 — Feed Discovery Agent (weekly, feed_discovery.yml — BUILT)
  Finds new RSS feeds, validates accessibility, writes to feed_library

Agent 2 — Feed Health Agent (daily, part of feed_discovery.yml — BUILT)
  Dormants/drops underperformers, reactivates recovered feeds

Agent 3 — Intelligence Gathering Agent (daily, scrape-intelligence.js — BUILT)
  Fetches feeds + search grounding, two-phase semantic filter, writes to intelligence_items

Agent 4 — Intelligence Quality Agent (future)
  Weekly: reviews captured items, scores quality, flags stale/irrelevant
  Feeds back to improve semantic context tree

Agent 5 — Context Tree Improvement Agent (future)
  Monthly: analyses what's captured vs missed
  Suggests new contexts, refines existing ones — human approval before applying
```

### Search API Evaluation (June 2026)

**Exa.ai — RECOMMENDED for future Intelligence Gathering Agent**
- $7 per 1,000 searches (standard, includes 10 results + full page content)
- $12 per 1,000 searches (Exa Deep / agentic)
- Free tier: 1,000 searches/month
- **Killer feature:** "Find Similar" — give it a URL, get 10 semantically similar articles from sources not yet indexed. Perfect for feed discovery.
- Dedicated news search mode — structured, LLM-ready
- At our daily volume (~200 searches/day): ~$50/month
- Use case: replace Gemini search grounding in Agent 3, power Agent 1 feed discovery

**Tavily — SKIP**
- Credit-based pricing ($30-100/month)
- Unpredictable cost on research tasks (4-250 credits per request)
- Good for RAG pipelines but overcomplicated for our use case

**Current approach (keep for now):**
- Gemini search grounding (free, already working)
- Add Exa.ai when refactoring into proper agent architecture

---

## Intelligence Scraper — Current Bugs to Fix

**Bug 1 (next session):** `prompt is not defined` in RSS Phase 2
- `phase2SemanticMatch` builds its own prompt internally
- But `callGemini(prompt)` is still being called somewhere with undefined `prompt`
- Fix: find and remove the orphaned `callGemini(prompt)` call in scrapeRSS

**Bug 2 (low priority):** FE AI feed has malformed XML (`&` in entity name)
- Feed itself is broken — dormant it in feed_library

**Known issue:** 498 titles in dedup set suppressing yield
- Will clear naturally as 7-day window ages out old items
- Do NOT enable daily schedule until yield stabilises at 10+ items/run

---

## Sprint 3 — Complete ✅ (2026-06-08)

### Sovereign AI Stack Configurator (SASC) — Live at `tools/sasc/`

**New tool:** `tools/sasc/index.html`
**Launch flows:**
1. Engagement Docket → solution item → `Configure` button → SASC pre-loaded with context
2. Engagement Docket header → `SASC` button → fresh configuration
3. Portal nav → SASC card in presales section

**Three-screen flow:**
- Screen 1: UC pills from docket (checkboxes), scope selector (full/hardware/software/custom), DC decision (MDC T-shirt+sites / B&M existing / B&M new build)
- Screen 2: 9 toggleable stack layers, pre-checked by scope
- Screen 3: BOM + ROM from pricing_params table, currency toggle (USD/INR/EUR), Indian numbering, ±35% confidence, Export CSV, Save to docket

**Foundation tables (in Supabase):**
- `pricing_params` — 45 components, all prices in USD
- `people_params` — 20 roles with USD rates + COLA %
- `benchmark_results` — 8 GPU benchmarks (H100, MI325X, GB200)
- `uc_workload_profiles` — 7 HP TSAP UC profiles
- `fx_rates` — USD→INR/EUR/GBP/JPY, updated manually

**Key design decisions:**
- All prices stored in USD — forex applied at display time via `fx_latest` view
- INR display uses Indian numbering (Crores/Lakhs)
- T-shirt sizing (XS-XL) only for MDC — B&M uses actual power/rack specs
- UC workload profiles drive compute sizing (GPU count from tokens/day + latency SLA)
- BOM traces: UC → workload → compute → networking → power → T-shirt validation

**Pending (next sessions):**
- SASC: wire UC workload profiles more precisely to compute sizing (currently uses estimated GPU count)
- SASC: add people model tab (team ramp-up/down, COLA, multi-year)
- SASC: networking sizing from compute count
- SASC: detailed layer configuration forms (currently just toggles)
- Mode 1 Budget Envelope Model (pre-UC parametric — Sprint 4)
- Mode 2 Detailed Financial Model (post-UC, 6 tabs — Sprint 4)

---

## SASC — Current Status (June 2026)

**Live at:** `tools/sasc/index.html`

**Working:**
- 4-screen flow: Scope & DC → Stack layers → Workload Profiler → BOM + ROM
- Supabase connection fixed — was reading from wrong localStorage key (`atlas_global` vs `atlas_global_cfg` / `sbUrl` vs `sb_url`)
- UCs load from docket when launched via `?eng=...&docket=...` params
- GPU sizing from workload inputs (DAU, peak multiplier, session length, tokens/session)
- Traceability chain: UC → tokens/day → benchmark → servers → power
- BOM driven by real UC workload sizing
- Currency toggle USD/INR/EUR with Indian numbering
- Save to docket, Export CSV

**Known gaps for next session:**
- BOM figures need review against real HP pricing
- People model tab (team ramp, COLA, multi-year OpEx)
- Detailed layer config forms (layers currently just toggles)
- UC complexity tier selector (Simple/Medium/Complex/Research) affects UC dev cost
- Benchmark override UI (currently alert-only)

**Critical: SASC localStorage pattern**
```javascript
// CORRECT - matches all other ATLAS tools
function getSB() {
  var g = typeof atlasGetGlobal === 'function' ? atlasGetGlobal()
    : (function(){ try{ return JSON.parse(localStorage.getItem('atlas_global_cfg')||'{}') }catch(e){ return {} } })()
  return { url: g.sbUrl || g.sb_url || '', key: g.sbKey || g.sb_key || '' }
}
```
