# ATLAS Claude Session Activator
# Version: 3.3 | Last Updated: 2026-06-04

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

## ATLAS — Core Architecture

```
INTELLIGENCE LAYER
  Second Brain          Market signals, domain intel, competitor data
  PEI Tool              Customer/organisation intelligence brief
        ↓
ANALYSIS & RECOMMENDATION
  Recommendation Engine    Portfolio fit by archetype + docket signals
  Territory Profiler       10-dimension profile → reference archetypes → playbook
        ↓
DESIGN & CONFIGURATION
  AI Centre Builder        Core flow — programme design for any sovereign AI deployment
  AI Centre Configurator   Full stack modelling engine → BOM + ROM
        ↓
FINANCIAL MODELLING
  Executive Financial Model   6-tab decision model (see full spec below)
        ↓
SIGN-OFF PACKAGE
  BOM           Hardware + software bill of materials
  ROM           Rough order of magnitude — cost with confidence range
  Pitch Report  Boardroom-ready document generated in the room
```

---

## AI Centre Builder — The Core Flow

```
Step 1  Who are you?
        Territory/org profile — from PEI + Territory Profiler
        Archetype: territory_coe / govt_sectorial / defence / enterprise

Step 2  What do you need?
        Use cases from UC Library + RE → workload mapping (tokens/day, latency, batch/RT)

Step 3  Where will it live?
        DC type (B&M or MDC), sites, T-shirt size per site
        Total programme MW = sum of sites = headline number

Step 4  Full stack configuration
        → AI Centre Configurator (all layers)

Step 5  Financial modelling
        → Executive Financial Model (6 tabs)

Step 6  Sign-off package
        → BOM + ROM + Pitch Report
```

---

## AI Centre Configurator — Full Stack Model

**Replaces: "Inferencing Factory" (too narrow)**
**New name: AI Centre Configurator**

### Infrastructure Layer
- Physical/virtual DC (B&M or MDC, T-shirt sized per site)
- Power capacity, cooling (DLC/air/hybrid), PUE
- Physical security, perimeter

### Compute Layer
- GPU clusters — training (large-scale model training)
- GPU clusters — inference (high-volume, domain-specific)
- CPU servers (AMD EPYC), NVMe/all-flash storage
- Edge nodes (field-deployed / air-gappable)

### Networking Layer ← CRITICAL
- East-West: InfiniBand (NDR/HDR) for GPU-to-GPU within training cluster
- East-West: 100/200GbE for inference cluster and storage
- North-South: 100GbE uplinks, spine-leaf architecture
- Proprietary network stack: NKC switches
- Out-of-band management network
- Air-gap network boundary (defence/classified)
- Latency + bandwidth sizing per UC workload

### Platform Layer
- AI platform software: Data Fusion, RAG, model registry, APIs, gateways, guardrails
- MLOps: experiment tracking, model versioning, pipeline orchestration
- Private/hybrid cloud software (OpenStack / VMware / Kubernetes)
- Observability: monitoring, logging, alerting

### Security & Compliance Layer
- Zero-trust architecture
- Air-gap configuration (defence/classified)
- DPDP Act 2023 compliance
- SIEM, threat detection, SOC integration
- Encryption at rest and in transit

### Resilience Layer
- Load balancing (inference traffic)
- HA configuration (active-active / active-passive)
- DR site — RTO/RPO targets
- Automated failover, backup and recovery

### Data & Integration Layer
- Data ingestion pipelines, source system connectors
- Data lake/warehouse architecture
- ETL/ELT effort estimation
- Integration with existing government systems

### Use Case Development Layer
- UC development effort (person-months per UC by complexity)
- Domain-specific model fine-tuning effort
- Application integration, testing, validation
- UC deployment pipeline

### Skills & Operations Layer
- AI workforce development programme sizing
- MLOps team sizing (infra ops, model ops, data engineering)
- Managed services scope (if SI-operated)
- Ongoing ops cost (Year 1-5)

### Output: BOM + ROM
- **BOM** — detailed hardware + software bill of materials with unit costs
- **ROM** — rough order of magnitude total programme cost
  - CapEx (hardware, DC/MDC, integration, UC development)
  - OpEx (power, cooling, staffing, licensing, managed services)
  - Confidence range (±15% / ±25% / ±35%)
  - Key assumptions listed explicitly
  - 5-year TCO
  - Tokenomics: on-prem cost/token vs cloud equivalent

---

## Executive Financial Model — Full Spec

**The critical insight:** Benefits and revenue don't start when the programme starts. There is always a massive cash-out period (Year 0-2) before any cash-in. This is the political kill zone where programmes die. The financial model must make this survivable and legible to a Finance Secretary.

**Three model types:**
- **Type A — Pure Public Good:** No revenue. Justification via socio-economic BCR.
- **Type B — Revenue-Generating Infrastructure:** Token/API/compute revenue. Justification via ROI + breakeven.
- **Type C — Hybrid (most common):** Revenue covers opex; BCR justifies capex. HP TSAP is Type C.

### Tab 1 — Programme Objectives
- Model type: Cost centre / Revenue-generating / Hybrid
- Primary KPI: BCR / ROI / Breakeven year / Self-sufficiency year
- Revenue ambition: None / Opex recovery / Full cost recovery / Surplus
- Strategic objectives (checklist): Sovereignty / Service delivery / Economic development / Revenue / Research

### Tab 2 — Cost Model
- Auto-populated from AI Centre Configurator BOM/ROM
- CapEx phasing by year (Year 0-5)
- OpEx by year (Year 1-10)
- Contingency % (default 15%)
- Confidence range toggle (±15% / ±25% / ±35%)

### Tab 3 — UC Schedule & Benefit Phasing ← KEY
**For each UC in the docket:**
- Expected go-live quarter
- Benefit type: Revenue / Cost avoidance / Social value / Strategic
- Benefit value: Conservative / Base / Optimistic (₹ Cr/yr at maturity)
- Benefit start lag (UCs rarely deliver full value on Day 1)
- Ramp curve: 0% → 25% → 75% → 100% over N quarters
- UC controls: Pull-in / Delay / Phase (split into quick-win + deeper phase)

**Visual outputs:**
- UC delivery Gantt with benefit ramp overlay
- Cumulative benefit curve built from UC schedule
- "Benefit gap" zone highlighted — cash-out period with no cash-in
- Scenario impact: pulling in one UC vs delaying another on the combined curve

**Revenue streams (if Type B or C):**
- Internal government (captive, guaranteed) — cost recovery + margin
- Central government agencies (high value, strategic) — market rate
- Neighbouring territories (medium term) — bulk compute rates
- Private sector (market development) — commercial SaaS rates
- Academic/research — subsidised
- GST capture estimate on all above

**Socio-Economic Benefits (if Type A or C):**
- GLOF / disaster avoidance — EAL × reduction % × years
- Agricultural productivity — yield uplift × area × price
- Healthcare outcomes — lives saved × VSL, diagnosis accuracy uplift
- Government efficiency — FTE × salary × automation rate
- Fraud/leakage reduction — scheme size × leakage % × reduction
- Jobs (direct + indirect + induced) — multiplier model
- Startup ecosystem — incubated startups × average valuation
- Skill premium — workers retrained × wage uplift × years
- Data sovereignty value — breach cost × probability × years (risk-adjusted)
- Infrastructure asset value — investment × multiplier (1.5-2.5x for India)

**BCR calculation:**
- Total quantified benefit (10-year NPV) ÷ Total programme cost
- Conservative / Base / Optimistic BCR shown side by side

### Tab 4 — Financing Sources
**Per financing source:**
- Source type: Self-funded / Central grant / Domestic debt / Multilateral / Bilateral / PPP / Mixed
- Amount (₹ Cr) and % of total programme cost
- Interest rate (% p.a.)
- Tenure (years)
- Moratorium period (years) — critical: defers debt service through cash-out zone
- Grace period (years)
- Repayment schedule: Bullet / Amortising / Step-up / Step-down
- Currency: INR / USD / JPY / EUR (FX risk flag for non-INR)
- Conditions precedent: Procurement rules / Tied aid / Environmental covenants
- Blended cost of capital (auto-calculated across mix)

**Moratorium impact visualisation:**
- Debt service curve WITH vs WITHOUT moratorium per source
- "Moratorium value" = NPV of deferred payments
- Ranking of financing sources by moratorium-adjusted effective cost
  (not just headline interest rate — this often changes the preferred source)
- Side-by-side: Rate-optimised mix vs Moratorium-optimised mix

### Tab 5 — Financial Curves
**Four curves on one chart:**
- Red: Cumulative cash-out (capex + opex + debt service)
- Green: Cumulative cash-in (grants + revenue + benefit value)
- Blue: Cumulative net position (green minus red)
- Amber: Debt service only (sub-line within red)

**Markers on timeline:**
- ◆ Each UC go-live point
- ✕ Breakeven (blue crosses zero)
- ● Self-sufficiency (revenue covers opex)
- ★ Debt-free (all financing repaid)

**Shaded zones:**
- Red zone: Cash-out exceeds cash-in (the political kill zone)
- Amber zone: Moratorium period (cash-out but no debt service yet)
- Green zone: Programme in surplus

**Supporting charts:**
- P&L curve: Revenue ramp vs OpEx (when does centre cover its running costs?)
- BCR accumulation: Social value building over time
- Debt service waterfall: Annual repayments by financing source

### Tab 6 — Scenarios & What-If
**What-if controls:**
- UC pull-in / delay sliders (per UC or by category)
- Moratorium toggle per financing source
- Revenue ramp selector (Conservative / Base / Optimistic)
- Cost overrun % slider (0% to +35%)
- Interest rate ± slider (per source)
- Financing mix rebalancer (drag % between sources)
- Programme delay slider (0 / 6 / 12 / 24 months)

**Scenario comparison table (side-by-side):**
- Columns: Conservative / Base / Optimistic / Custom
- Rows: Breakeven year / BCR / Peak cash-out / Self-sufficiency year / 10yr NPV / Jobs created
- Highlight: Most resilient scenario to revenue shortfall
- Recommended scenario with one-line rationale

**UC scheduling scenarios:**
- Pull-in revenue UCs → earlier breakeven
- Delay complex UCs → reduce early cash-out
- Phase large UCs → smooth the curve
- Each change instantly updates all curves

---

## Territory AI Programme Profiler — Design Spec

**Inspired by:** Atlas of Innovation (atlasofinnovation.org)
**Language:** "Territory" not "State" throughout

**10 profile dimensions:**
1. Fiscal capacity (Strong / Moderate / Constrained)
2. Political mandate + timeline (Flagship / Central scheme / Long-term)
3. Ownership preference (Full territory / PPP / Hybrid)
4. DC readiness (Existing DC / Greenfield / Colocation)
5. Data sensitivity (Standard / Sensitive / Air-gapped)
6. Central scheme alignment (CHECKLIST: IndiaAI / NM-ICPS / Smart Cities / DONER / PM-WANI / None)
7. Programme scale (XS / S / M / L / XL)
8. Implementation urgency (Within 1yr / 2-3yr / 5+yr)
9. Stakeholder landscape (Single DM / Coalition / Multi-level bureaucratic)
10. Existing AI maturity (None / Pilots / Some production / Mature)

**Output:**
- Radar/spider chart across all 10 dimensions
- Matched reference archetype (4 pre-built):
  - HP Glacial Hub — constrained fiscal, hydel power, small population, tourism+horticulture
  - Maharashtra Industrial — strong fiscal, large enterprise base, PPP-ready, manufacturing
  - Northeast Strategic — central grant, DONER-funded, strategic importance, connectivity
  - Union Territory Digital — central control, high funding, small geography, e-governance
- Financing model recommendation (feeds Tab 4 of financial model)
- Actions playbook + challenges per matched profile
- Radar overlay: your profile vs reference archetype
- Saves as `pricing` docket item

---

## Platform URL & Stack

- **URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Stack:** GitHub Pages + Supabase (RLS disabled) + Multi-provider AI

---

## Tool Registry

| Tool | Version | Status | Notes |
|---|---|---|---|
| Second Brain | v2.3 | ✅ Live | |
| PEI Tool | v0.4 | ✅ Live | Load Saved JSON added |
| Intelligence Scraper | v2.1 | ⏸ Paused | Fixed, test before re-enabling |
| Engagement Docket | v2.2 | ✅ Live | Sprint 1+2 complete |
| Inferencing Factory | v2.3 | ✅ Live | → becomes AI Centre Configurator |
| Domain Configurator | v3.0 | ✅ Live | |
| Benchmark Tool | v1.0 | ✅ Live | |
| RAC Tool | v2.0 | ⚠️ Moving out | → Commercial/Deals tool |
| Deal Analysis | v1.0 | ⚠️ Moving out | → Commercial/Deals tool |
| HPC Monitoring | v1.0 | ⚠️ Moving out | → Ops tool |
| COMPASS | v2.0 | ⚠️ Moving out | → Delivery tool |

---

## Supabase — Critical Notes

**RLS disabled on ALL tables:**
```sql
ALTER TABLE engagements DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_dockets DISABLE ROW LEVEL SECURITY;
ALTER TABLE docket_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE l1_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_catalogue DISABLE ROW LEVEL SECURITY;
ALTER TABLE uc_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE uc_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_items DISABLE ROW LEVEL SECURITY;
```

**Engagements archetype:** `territory_coe` | `govt_sectorial` | `enterprise` | `defence`
TSAP Configure shows only for `territory_coe`.

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
L2     L2-INF     AI Centre (was: Inferencing Factory) ← rename pending
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

Note: L2-INF suffix pending rename — `L2-AIC` (AI Centre) candidate. Decide before Sprint 3.

---

## MDC T-Shirt Sizing (per site)

| Size | Capacity | GPUs | Tokens/day | Use |
|---|---|---|---|---|
| XS | ≤2 MW | 64–128 | 500M–1B | District node, pilot |
| S | 5 MW | 256–512 | 2–5B | City-level |
| M | 10 MW | 512–1,024 | 5–10B | Territory hub |
| L | 15 MW | 1,024–1,536 | 10–15B | Large territory flagship |
| XL | 20 MW | 1,536–2,048+ | 15–25B | National/multi-territory |

T-shirt = per site. Total programme MW = sum of sites = headline number.

---

## Sprint Plan

### Sprint 3 — AI Centre Configurator Foundations (next laptop session)
- Rename Inferencing Factory → AI Centre Configurator in UI + nav
- DC Decision modal: B&M or MDC, T-shirt + multi-site
- Add networking layer (E-W InfiniBand, N-S 100GbE, NKC switches)
- Add data integration + UC development + skills layers
- ROM output alongside BOM (CapEx + OpEx + confidence range)
- Saves to docket: solution, bom, pricing items

### Sprint 4 — Executive Financial Model + Territory Profiler
- Executive Financial Model — all 6 tabs (full spec above)
- UC Schedule & Benefit Phasing engine (Tab 3)
- Moratorium impact visualisation (Tab 4)
- Combined financial curves chart (Tab 5)
- What-if scenario engine (Tab 6)
- Territory AI Programme Profiler (10 dims, radar, 4 archetypes)
- Financing Navigator integrated into profiler → feeds Tab 4

### Sprint 5 — Pitch Report + AI Centre Builder v1
- Pitch Report generator (full boardroom document, in the room)
- Solution Brief (lighter version)
- Unified AI Centre Builder flow (Steps 1-6 connected end to end)
- UX pass on Engagement Docket
- Visualisations: territory map, radar chart, tokenomics chart

### Sprint 6 — Polish + Catalogue
- Portfolio catalogue rename (L2-INF → L2-AIC)
- MDC multi-site T-shirt UI
- Remaining TSAP tabs (finish financing tab)
- Brand + hardware preferences standards files

---

## Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Decide portfolio code rename: L2-INF → L2-AIC? | 🔴 Before Sprint 3 |
| 2 | Sprint 3 — AI Centre Configurator foundations | 🟡 Next laptop session |
| 3 | Sprint 4 — Executive Financial Model (full 6-tab spec) | 🟡 Next |
| 4 | Sprint 4 — Territory Profiler | 🟡 Next |
| 5 | Sprint 5 — Pitch Report + AI Centre Builder v1 unified flow | 🟡 Next |
| 6 | Re-enable intelligence scraper (test manually first) | 🟡 Soon |
| 7 | GCP billing investigation | 🟡 Soon |
| 8 | Sprint 6 — UX pass + visualisations + polish | ⬜ Later |
| 9 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions finalised |

---

## Notes for Phone-Based Sessions

Good phone tasks:
- Decide L2-INF rename
- Define 4 reference archetypes in detail
- Pitch Report section-by-section outline
- AI Centre Configurator layer-by-layer question spec
- Financial model UC benefit data (HP use cases: GLOF, horticulture, e-gov)
- Revenue stream sizing for HP (internal govt, ISRO, neighbouring states)
