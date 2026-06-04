# ATLAS Claude Session Activator
# Version: 3.3 | Last Updated: 2026-06-04

---

## Strategic Positioning

**ATLAS is a Strategy & Consulting Enablement Platform** — used with the customer in boardrooms and workshops, not just a salesperson's backend. Customer-facing: Chief Secretary, IT Secretary, ministry decision makers work through ATLAS with the presales team. Pitch Report / ROM package generated in the room.

**What stays in ATLAS:** Intelligence → Analysis & Recommendation → Programme Design → Financial Modelling → Sign-off Package

**What moves out:** RAC Tool + Deal Analysis → Commercial/Deals tool | HPC Monitoring → Ops | COMPASS → Delivery

---

## ATLAS Core Architecture

```
INTELLIGENCE          Second Brain, PEI Tool
RECOMMENDATION        Recommendation Engine, Territory AI Programme Profiler
DESIGN                AI Centre Builder (flow), Sovereign AI Centre Configurator (engine)
FINANCIAL MODELLING   Financing Navigator, Tokenomics, Economic Impact
SIGN-OFF PACKAGE      BOM + ROM, Pitch Report, Solution Brief
```

---

## Platform URL & Stack

- **URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Stack:** GitHub Pages + Supabase (RLS disabled all tables) + Multi-provider AI

---

## Tool Registry

| Tool | Version | Status | Notes |
|---|---|---|---|
| Second Brain | v2.3 | ✅ Live | + Docket on intel/UC items |
| PEI Tool | v0.4 | ✅ Live | Load Saved JSON, + Docket |
| Intelligence Scraper | v2.1 | ⏸ Paused | Fixed, test before re-enabling |
| Engagement Docket | v2.5 | ✅ Live | See full feature list below |
| Inferencing Factory | v2.3 | ✅ Live | → becomes Sovereign AI Centre Configurator |
| Domain Configurator | v3.0 | ✅ Live | |
| RAC Tool | v2.0 | ⚠️ Moving out | → Commercial/Deals tool |
| Deal Analysis | v1.0 | ⚠️ Moving out | → Commercial/Deals tool |
| HPC Monitoring | v1.0 | ⚠️ Moving out | → Ops tool |
| COMPASS | v2.0 | ⚠️ Moving out | → Delivery tool |

---

## Engagement Docket v2.5 — Complete Feature List

**Architecture:** `customers → engagements → engagement_dockets → docket_items`

**Archetype values:** `territory_coe` | `govt_sectorial` | `enterprise` | `defence`
TSAP Configure button shows only for `territory_coe`.

**Sprint 1 ✅**
- Second Brain → `+ Docket` on intel/UC/queue items
- PEI → `+ Docket` (with Load Saved JSON to skip token spend)
- Trigger modal: customer dropdown, archetype selector, CustomerName — EngagementName labels
- localStorage cleared only after confirmed Supabase insert
- sbInsert logs real Supabase errors with HTTP status

**Sprint 2 ✅**
- Header: orange ⚡ Recommend button, status dropdown, docket pill counter
- Recommendation Engine: reads docket signals, scopes by archetype, auto-runs on open
- RE scope: territory_coe=L1+L1.x+L2+L3, defence=L2.2-SOV+edge+L3, others=L2+L3
- Recommendation panel: priority badges, reasoning, upsell, Apply to Portfolio Map, Dismiss
- Portfolio Map: saves solution docket item, refreshes header pill
- TSAP Configure: TSAP button for territory_coe only

**Sprint 3 / 4 (Territory Profiler) ✅**
- Territory AI Programme Profiler — 10-question flow, reads from Supabase tables
- Weighted cosine similarity matching against 4 reference archetypes
- 4 radar charts (profile vs each archetype) with similarity %
- AI-generated actions + challenges + financing rationale
- Previous run auto-loaded on reopen (retake keeps answers)
- Saves to `profiler_runs` table + pricing docket item (upsert — no duplicates)
- Financing Navigator: reads from `financing_models` + `financing_rules` Supabase tables
- Auto-matches financing model from profiler answers (fiscal + mandate + ownership + archetype)
- Shows primary + fallback model, terms, timeline, watch-out, all models toggle
- Profile docket item: clickable, shows archetype card + scores grid + "Open Profiler" button

**TSAP Configuration modal — 5 tabs:**
- ◉ Profile — Territory Profiler (loads previous run if exists)
- 1. Territory — name, type, governance, security, ownership, scale
- 2. Objectives — core objective, vision, justification, uniqueness, success metrics
  - AI Enrich: robust key fallback, 800 token budget, trailing comma cleanup, apply to form
- 3. Building Blocks — L2 blocks (toggleTsapBlock) + L1.x components (forEach onclick)
  - toggleTsapBlock handles both L2 (L2_BLOCKS_DEF) AND L1x (L1X_COMPONENTS_DEF)
- 4. Financial Model — 3 sections: scale/cost + financing model + gap calculator (needs UX redesign)
- Save button: stays open (✓ Saved confirmation), upserts existing TSAP Config item

**Generate Vision Doc:**
- Renders inside tsapTabContent (does NOT close modal)
- Upserts existing exec_doc item — no duplicates
- Clicking exec_doc docket item shows document text + close

**Docket items — clickable:**
- All items open expandable detail panel below card
- TSAP Config → opens TSAP Configure modal
- Profiler → shows archetype card + scores + "Open Profiler" button
- exec_doc (Vision Doc) → shows document text
- intel/pei → shows notes, problem, opportunity
- solution → shows notes + blocks list

**Key TSAP functions:**
- `openL1Config(engId)` — loads existing TSAP config from docket, pre-populates from engagement
- `saveTsapConfig()` — upserts solution item, stays open, silent CURRENT_ITEMS refresh
- `generateVisionDoc()` — renders in modal, upserts exec_doc item
- `toggleTsapBlock(code)` — handles L2 + L1x codes
- `retakeProfiler()` — keeps answers, resets to step 0 for review/edit

---

## Supabase Tables

**Core:**
`customers`, `engagements`, `engagement_dockets`, `docket_items`, `transactions`, `l1_configurations`

**Portfolio:**
`portfolio_catalogue` (L2-GIB added, L2-AIF renamed to Multi-Purpose AI Factory)

**Intelligence:**
`intelligence_items`, `uc_queue`, `uc_library`, `sales_actions`

**Profiler (new):**
`profiler_questions` (10), `profiler_options` (36), `profiler_archetypes` (4), `profiler_archetype_dims` (36), `profiler_runs`

**Financing Navigator (new):**
`financing_models` (10), `financing_rules` (19)

**RLS disabled on all tables.** Run if silent failures return:
```sql
ALTER TABLE profiler_questions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiler_options         DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiler_archetypes      DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiler_archetype_dims  DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiler_runs            DISABLE ROW LEVEL SECURITY;
ALTER TABLE financing_models         DISABLE ROW LEVEL SECURITY;
ALTER TABLE financing_rules          DISABLE ROW LEVEL SECURITY;
```

**Engagements archetype:** `territory_coe` | `govt_sectorial` | `enterprise` | `defence`

---

## CRITICAL — thinkingConfig

NEVER add `thinkingConfig:{thinkingBudget:0}` to Gemini calls. Causes 400 errors + kills search grounding.

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
L2     L2-GIB     GenAI-in-a-Box (PoC/pilot, entry point)
L2     L2-SOV     Sovereign AI Centre ← renamed from L2-INF (pending in catalogue SQL)
L2.1   L2.1-SOV   GeoAI Sovereign Centre
L2.2   L2.2-SOV   Defence Sovereign Centre (air-gapped, MIL-SPEC)
L2.3   L2.3-SOV   Health Sovereign Centre (DICOM/FHIR)
L2.4   L2.4-SOV   FinAI Sovereign Centre
L2     L2-TRC     GPU Training Cluster
L2     L2-HPC     HPC Cluster
L2     L2-EDG     Edge AI Node
L2     L2-MDC     Modular Datacenter
L3     L3-*       23 Lifecycle Services
```

L2-AIF retired as catalogue item → lives as deployment mode parameter inside L2-SOV configurator.
L2-SOV catalogue rename: pending SQL update.

---

## MDC T-Shirt Sizing (per site)

| Size | Capacity | GPUs | Tokens/day | Use |
|---|---|---|---|---|
| XS | ≤2 MW | 64–128 | 500M–1B | District node, pilot |
| S | 5 MW | 256–512 | 2–5B | City-level |
| M | 10 MW | 512–1,024 | 5–10B | Territory hub |
| L | 15 MW | 1,024–1,536 | 10–15B | Large territory flagship |
| XL | 20 MW | 1,536–2,048+ | 15–25B | National/multi-territory |

T-shirt = per site. Total programme MW = sum of all sites = headline number.

---

## AI Centre Configurator — Full Stack

**Replaces "Inferencing Factory" (too narrow). New name: Sovereign AI Centre Configurator.**
**L2-AIF retired as separate item — lives as deployment mode parameter inside configurator.**

9 layers modelled → BOM + ROM output:
1. Infrastructure (DC type, power, cooling, PUE)
2. Compute (GPU clusters: training + inference, CPU servers, edge nodes)
3. Storage (NVMe hot tier, SSD warm, object cold, parallel filesystem, storage networking)
4. Networking (InfiniBand E-W, 100GbE N-S, NKC switches, out-of-band, air-gap boundary)
5. Platform (AI platform software, MLOps, private/hybrid cloud, observability)
6. Security & Compliance (zero-trust, air-gap, DPDP, SIEM, audit)
7. Resilience (load balancing, HA, DR, failover, backup)
8. Data & Integration (ingestion, connectors, ETL, data lake)
9. Use Case Development + Skills & Operations (UC dev effort, workforce, managed services)

**ROM output:** CapEx + OpEx + 5-year TCO + confidence range + assumptions + tokenomics

---

## Territory AI Programme Profiler — Reference Archetypes

| Code | Name | Profile |
|---|---|---|
| `emerging_sovereign` | Emerging Sovereign | Resource-rich, budget-constrained, high strategic value, greenfield |
| `economic_engine` | Economic Engine | Strong fiscal, industrial base, PPP-ready, large scale |
| `strategic_frontier` | Strategic Frontier | Security-sensitive, centrally-funded, connectivity-first, classified |
| `digital_first` | Digital First | Central alignment, small geography, e-governance, fast deployment |

---

## Sprint Plan (Revised)

### Remaining Sprint 4 items
- **Finance tab redesign** — 3-section UX: Scale/Cost (T-shirt + sites + CapEx/OpEx) + Financing Model (manual selector + Navigator) + Gap Calculator. Currently functional but needs UX polish.
- **Economic Impact Model** — jobs multiplier, GDP contribution, startup ecosystem value
- **Pitch Report generator** — full boardroom document from all docket content

### Sprint 5
- Sovereign AI Centre Configurator (rename + extend Inferencing Factory)
- DC Decision modal (B&M vs MDC) + multi-site T-shirt selector
- ROM output alongside BOM
- L2-SOV rename in portfolio catalogue

### Sprint 6
- Territory map (GeoJSON/Leaflet)
- UX pass — Engagement Docket
- Visualisations (radar overlay, tokenomics chart, economic impact)

---

## Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Finance tab UX redesign | 🔴 Next session |
| 2 | Economic Impact Model | 🟡 Sprint 4 |
| 3 | Pitch Report generator | 🟡 Sprint 4 |
| 4 | Sprint 5 — Sovereign AI Centre Configurator | 🟡 Next |
| 5 | L2-SOV rename in portfolio_catalogue SQL | 🟡 Soon |
| 6 | Re-enable intelligence scraper (test manually first) | 🟡 Soon |
| 7 | GCP billing investigation | 🟡 Soon |
| 8 | Visualisations (radar, territory map, tokenomics) | ⬜ Sprint 6 |
| 9 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions |

---

## Notes for Next Session

**Start here:** Finance tab redesign → confirm layout → build → test
**Then:** Economic Impact Model → Pitch Report generator
**Key file to pull fresh:** `tools/engagement-docket/index.html` always pull from GitHub before editing
