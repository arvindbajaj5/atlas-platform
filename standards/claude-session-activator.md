# ATLAS Claude Session Activator
# Version: 3.4 | Last Updated: 2026-06-04

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
  AI Centre Builder        Core flow — Steps 1-7 (see below)
  AI Centre Configurator   Full stack modelling engine → BOM + ROM
        ↓
FINANCIAL MODELLING
  Mode 1: Budget Envelope Model    (early stage, pre-UC)
  Mode 2: Detailed Financial Model (post-UC, sign-off quality)
        ↓
SIGN-OFF PACKAGE
  BOM + ROM + Pitch Report
```

---

## AI Centre Builder — The Real Decision Flow

**Critical insight:** UCs are NOT known at the start. Financial modelling happens in two phases — first to set budget constraints, then in detail once UCs are locked. The flow is iterative, not linear.

```
Step 1  Territory Profile
        From PEI + Territory Profiler
        Archetype: territory_coe / govt_sectorial / defence / enterprise

Step 2  Strategic Objectives + Budget Envelope   ← MODE 1 FINANCIAL MODEL
        Revenue expectation: Y/N, how much
        Financing appetite: which sources politically acceptable
        Programme scale: T-shirt (XS/S/M/L/XL)
        → Output: Indicative cost range (parametric, ±35%)
                  Annual cash-out profile
                  Financing structure
                  BUDGET CONSTRAINTS for Steps 3-4:
                  "Your envelope supports 8-12 medium UCs"
                  "Phase 1 budget: ₹X Cr. Phase 2 trigger: ₹Y Cr"

Step 3  DC Design
        DC type (B&M or MDC), sites, T-shirt per site
        Constrained by Step 2 envelope

Step 4  UC Definition + Prioritisation
        UC identification from UC Library + RE
        Constrained by Step 2 envelope
        RECONCILIATION: total UC cost vs envelope
        Three levers if over budget:
          → Cut UCs (reduce scope)
          → Phase UCs (defer to Phase 2/3)
          → Expand financing (find more sources)
        → Output: Validated UC set that fits the budget

Step 5  AI Centre Configurator                   ← FULL STACK ONCE UCs LOCKED
        All layers: Infra, Compute, Networking, Platform,
        Security, Resilience, Data, UC Dev, Skills + Ops
        → Detailed BOM + ROM (±15% once UCs defined)

Step 6  Detailed Financial Model                 ← MODE 2 FINANCIAL MODEL
        All 6 tabs with real numbers
        Reconciliation vs Step 2 envelope
        UC Schedule + Benefit Phasing
        Full curves + what-if scenarios

Step 7  Sign-off Package
        BOM + ROM + Pitch Report generated in the room
```

---

## Financial Model — Two Modes

### MODE 1 — Budget Envelope Model (Step 2, pre-UC)

**When:** Before UCs are defined. Sets the financial frame for the requirements discussion.

**Inputs:**
- Financing appetite (which sources, rough amounts)
- Programme scale (T-shirt: XS/S/M/L/XL)
- Parametric assumptions: standard CapEx/OpEx per MW from reference models
- Confidence: ±35% (pre-UC, parametric estimate)

**Outputs:**
- Indicative total cost range (₹ min - max)
- Annual cash-out profile (phased by standard curve)
- Financing structure (how much from where, indicative terms)
- Budget constraints for requirements phase:
  - "Your envelope supports N UCs of medium complexity"
  - "Phase 1 budget: ₹X Cr. Phase 2 trigger: ₹Y Cr"
- Explicit assumptions log — "this is a parametric estimate, will be refined in Step 6"

**Purpose:** Prevents requirements gold-plating. Sets a realistic anchor before the technical discussion. Creates shared understanding of what the territory can afford.

---

### MODE 2 — Detailed Financial Model (Step 6, post-UC)

**When:** After UCs are locked and BOM/ROM from AI Centre Configurator is available.

**Three model types:**
- **Type A — Pure Public Good:** No revenue. Justification via socio-economic BCR.
- **Type B — Revenue-Generating Infrastructure:** Token/API revenue. Justification via ROI.
- **Type C — Hybrid (most common):** Revenue covers opex; BCR justifies capex. HP is Type C.

#### Tab 1 — Programme Objectives
- Model type: A / B / C
- Primary KPI: BCR / ROI / Breakeven year / Self-sufficiency year
- Revenue ambition: None / Opex recovery / Full cost recovery / Surplus
- Strategic objectives (checklist): Sovereignty / Service delivery / Economic development / Revenue / Research

#### Tab 2 — Cost Model
- Auto-populated from AI Centre Configurator BOM/ROM
- CapEx phasing by year (Year 0-5)
- OpEx by year (Year 1-10)
- Contingency % (default 15%)
- Confidence range (±15% once UCs defined)
- Reconciliation vs Mode 1 envelope — variance explanation

#### Tab 3 — UC Schedule & Benefit Phasing ← KEY TAB
**For each UC (from docket):**
- Expected go-live quarter
- Benefit type: Revenue / Cost avoidance / Social value / Strategic
- Benefit value: Conservative / Base / Optimistic (₹ Cr/yr at maturity)
- Benefit start lag (UCs rarely deliver full value on Day 1)
- Ramp curve: 0% → 25% → 75% → 100% over N quarters
- UC controls: Pull-in / Delay / Phase (split into quick-win + deeper)

**Visual outputs:**
- UC delivery Gantt with benefit ramp overlay
- Cumulative benefit curve built from UC schedule
- "Benefit gap" zone — cash-out period with no cash-in (the political kill zone)
- UC trade-off view: impact of pulling in / delaying each UC on combined curve

**Revenue streams (Type B/C):**
- Internal government (captive) — cost recovery + margin
- Central agencies (high value) — ISRO, NDMA, MoD etc.
- Neighbouring territories (medium term) — bulk compute
- Private sector — commercial SaaS rates
- Academic/research — subsidised
- GST capture estimate

**Socio-Economic Benefits (Type A/C):**
- Disaster avoidance (GLOF etc.) — EAL × reduction % × years
- Agricultural productivity — yield uplift × area × price
- Healthcare outcomes — lives saved × VSL
- Government efficiency — FTE × salary × automation rate
- Fraud/leakage reduction — scheme size × leakage % × reduction
- Jobs (direct + indirect + induced) — multiplier model
- Startup ecosystem value
- Skill premium — workers retrained × wage uplift
- Data sovereignty — risk-adjusted avoided cost
- Infrastructure asset multiplier (1.5-2.5x for India)
- BCR = Total quantified benefit (10yr NPV) ÷ Total programme cost

#### Tab 4 — Financing Sources
**Per source:**
- Type: Self-funded / Central grant / Domestic debt / Multilateral / Bilateral / PPP / Mixed
- Amount (₹ Cr) and % of total
- Interest rate (% p.a.)
- Tenure (years)
- **Moratorium period** — defers debt service through cash-out zone. Often more important than rate.
- Grace period
- Repayment schedule: Bullet / Amortising / Step-up / Step-down
- Currency: INR / USD / JPY / EUR (FX risk flag)
- Conditions precedent: procurement rules, tied aid, environmental covenants
- Blended cost of capital (auto-calculated)

**Moratorium impact visualisation:**
- Debt service curve WITH vs WITHOUT moratorium
- "Moratorium value" = NPV of deferred payments
- Sources ranked by moratorium-adjusted effective cost
  (often changes preferred source vs pure rate comparison)

#### Tab 5 — Financial Curves
**Single chart, four lines:**
- Red: Cumulative cash-out (capex + opex + debt service)
- Green: Cumulative cash-in (grants + revenue + benefit value)
- Blue: Cumulative net position
- Amber: Debt service sub-line (within red)

**Markers:**
- ◆ Each UC go-live point
- ✕ Breakeven (blue crosses zero)
- ● Self-sufficiency (revenue covers opex)
- ★ Debt-free

**Shaded zones:**
- Red zone: Cash-out exceeds cash-in (political kill zone)
- Amber zone: Moratorium period (no debt service yet)
- Green zone: Programme in surplus

**Supporting charts:**
- P&L curve: Revenue vs OpEx (when does centre cover running costs?)
- BCR accumulation: Social value over time
- Debt service waterfall: Annual repayments by source

#### Tab 6 — Scenarios & What-If
**Controls:**
- UC pull-in / delay sliders (per UC or category)
- Moratorium toggle per source
- Revenue ramp (Conservative / Base / Optimistic)
- Cost overrun % slider (0% to +35%)
- Interest rate ± slider
- Financing mix rebalancer
- Programme delay (0 / 6 / 12 / 24 months)

**Scenario comparison (side-by-side):**
- Columns: Conservative / Base / Optimistic / Custom
- Rows: Breakeven yr / BCR / Peak cash-out / Self-sufficiency yr / 10yr NPV / Jobs
- Highlight: most resilient scenario to revenue shortfall
- Recommended scenario with rationale

**UC scheduling scenarios:**
- Pull-in revenue UCs → earlier breakeven
- Delay complex UCs → reduce early cash-out
- Phase large UCs → smooth the curve

---

## Territory AI Programme Profiler — Design Spec

**Language:** "Territory" not "State" throughout

**10 profile dimensions (mixed single/multi-select):**
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
- Radar chart across all 10 dimensions
- Matched reference archetype:
  - HP Glacial Hub — constrained fiscal, hydel power, small population
  - Maharashtra Industrial — strong fiscal, large enterprise base, PPP-ready
  - Northeast Strategic — central grant, DONER-funded, strategic importance
  - Union Territory Digital — central control, high funding, small geography
- Financing model recommendation → feeds Mode 2 Tab 4
- Actions playbook + challenges per matched profile
- Radar overlay: profile vs reference archetype

---

## AI Centre Configurator — Full Stack

**Replaces: "Inferencing Factory"**

Layers: Infrastructure → Compute → **Networking** → Platform → Security →
Resilience → Data & Integration → UC Development → Skills & Ops

**Networking Layer (critical, often underestimated):**
- East-West: InfiniBand (NDR/HDR) for GPU-to-GPU within training cluster
- East-West: 100/200GbE for inference cluster and storage
- North-South: 100GbE uplinks, spine-leaf architecture
- Proprietary stack: NKC switches
- Out-of-band management network
- Air-gap boundary (defence/classified)
- Latency + bandwidth sizing per UC workload

**Output:** BOM + ROM (±15% once UCs defined, ±35% parametric pre-UC)

---

## Portfolio Catalogue

```
L1     L1-TSAP    Territory Sovereign AI Programme
L1.1-L1.5         Programme components (partner-led)
L2     L2-GIB     GenAI-in-a-Box ✅
L2     L2-AIF     Multi-Purpose AI Factory ✅
L2     L2-INF     AI Centre ← rename pending (L2-AIC candidate)
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

T-shirt = per site. Total programme MW = sum of sites = headline number.

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

## Sprint Plan

### Sprint 3 — AI Centre Configurator Foundations (next laptop session)
- Rename Inferencing Factory → AI Centre Configurator in UI + nav
- DC Decision modal: B&M or MDC, T-shirt + multi-site
- Networking layer added to configurator
- Data integration + UC development + skills layers added
- ROM output alongside BOM
- Saves to docket: solution, bom, pricing items

### Sprint 4 — Budget Envelope Model (Mode 1)
- Parametric cost model by T-shirt size (no UCs needed)
- Financing sources with moratorium/terms
- Budget constraint outputs for requirements phase
- Lives at Step 2 of AI Centre Builder flow

### Sprint 5 — UC Definition + Reconciliation
- UC trade-off view (fit to budget or expand financing)
- Reconciliation: UC portfolio cost vs Mode 1 envelope
- Three levers: cut / phase / expand financing

### Sprint 6 — Detailed Financial Model (Mode 2)
- All 6 tabs with real numbers from Configurator BOM/ROM
- UC Schedule + Benefit Phasing engine
- Moratorium impact visualisation
- Combined financial curves chart
- What-if scenario engine

### Sprint 7 — Territory Profiler + Pitch Report
- Territory AI Programme Profiler (10 dims, radar, 4 archetypes)
- Pitch Report generator (in the room)
- Unified AI Centre Builder flow Steps 1-7 end to end

### Sprint 8 — Polish + Visualisations
- Territory map, radar chart, tokenomics chart, financial curves
- UX pass on Engagement Docket
- Portfolio catalogue rename
- Brand + hardware standards files

---

## Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Decide portfolio code rename: L2-INF → L2-AIC? | 🔴 Before Sprint 3 |
| 2 | Sprint 3 — AI Centre Configurator foundations | 🟡 Next laptop session |
| 3 | Sprint 4 — Mode 1 Budget Envelope Model | 🟡 Next |
| 4 | Sprint 5 — UC trade-off + reconciliation | 🟡 Next |
| 5 | Sprint 6 — Mode 2 Detailed Financial Model | 🟡 Next |
| 6 | Sprint 7 — Territory Profiler + Pitch Report | 🟡 Next |
| 7 | Re-enable intelligence scraper (test first) | 🟡 Soon |
| 8 | GCP billing investigation | 🟡 Soon |
| 9 | Sprint 8 — UX + visualisations + polish | ⬜ Later |
| 10 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions |

---

## Notes for Phone-Based Sessions

Good phone tasks:
- Decide L2-INF rename
- Define 4 reference archetypes in detail
- Pitch Report section-by-section outline
- Parametric cost assumptions per T-shirt size (Mode 1 inputs)
- HP use case benefit data (GLOF, horticulture, e-gov, API revenue)
- Revenue stream sizing for HP
- 
