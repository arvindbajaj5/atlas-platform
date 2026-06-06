# ATLAS Claude Session Activator
# Version: 3.5 | Last Updated: 2026-06-06

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

### BUILT AND WORKING ✅ (Intelligence & Engagement Layer)

| Component | Status | Notes |
|---|---|---|
| Second Brain | ✅ Live v2.3 | + Docket buttons on intel/UC items |
| PEI Tool | ✅ Live v0.4 | Load Saved JSON, + Docket |
| Engagement Docket | ✅ Live v2.2 | Full Sprint 1+2 complete |
| Recommendation Engine | ✅ Live | Auto-runs, scopes by archetype, panel with Apply/Dismiss |
| Intelligence Scraper | ✅ Functional | Needs tuning — 3 items/run, global phase added |
| Portfolio Catalogue | ✅ Updated | L2-GIB added, L2-AIF renamed |

### NOT YET BUILT 🔧 (Design & Financial Layer — the customer-facing heart)

This is the majority of the remaining work — 4-6 focused laptop sessions:

| Component | Priority | Estimate |
|---|---|---|
| AI Centre Configurator (full stack) | 🔴 Next | 1-2 sessions |
| Mode 1 — Budget Envelope Model | 🔴 Next | 1 session |
| UC Definition + Reconciliation flow | 🔴 Next | 1 session |
| Mode 2 — Detailed Financial Model (6 tabs) | 🔴 Next | 2 sessions |
| Territory AI Programme Profiler | 🟡 Next | 1 session |
| Pitch Report generator | 🟡 Next | 1 session |
| AI Centre Builder unified flow (Steps 1-7) | 🟡 Next | 1 session |

---

## ATLAS — Core Architecture

```
INTELLIGENCE LAYER ✅
  Second Brain          Market signals, domain intel, competitor data
  PEI Tool              Customer/organisation intelligence brief
        ↓
ANALYSIS & RECOMMENDATION ✅
  Recommendation Engine    Portfolio fit by archetype + docket signals
  Territory Profiler       10-dimension profile → archetypes (NOT BUILT)
        ↓
DESIGN & CONFIGURATION 🔧
  AI Centre Builder        Core flow Steps 1-7 (NOT BUILT)
  AI Centre Configurator   Full stack modelling → BOM + ROM (NOT BUILT)
        ↓
FINANCIAL MODELLING 🔧
  Mode 1: Budget Envelope  (NOT BUILT)
  Mode 2: Detailed Model   (NOT BUILT — 6 tabs)
        ↓
SIGN-OFF PACKAGE 🔧
  BOM + ROM + Pitch Report (NOT BUILT)
```

---

## AI Centre Builder — The Real Decision Flow

```
Step 1  Territory Profile (PEI + Territory Profiler)
Step 2  Strategic Objectives + Budget Envelope   ← MODE 1
Step 3  DC Design (B&M or MDC, sites, T-shirt)
Step 4  UC Definition + Prioritisation + Reconciliation
Step 5  AI Centre Configurator (full stack → BOM + ROM)
Step 6  Detailed Financial Model                 ← MODE 2
Step 7  Sign-off Package (BOM + ROM + Pitch Report)
```

---

## Financial Model — Two Modes (Full Spec)

### MODE 1 — Budget Envelope Model (Step 2, pre-UC)
- Parametric cost by T-shirt size (no UCs needed)
- Financing appetite + indicative sources
- Output: budget constraints for Steps 3-4
- Confidence: ±35%
- "Your envelope supports N UCs of medium complexity"

### MODE 2 — Detailed Financial Model (Step 6, post-UC)

**Three model types:**
- Type A: Pure Public Good (socio-economic BCR)
- Type B: Revenue-Generating Infrastructure (ROI + breakeven)
- Type C: Hybrid — most common, HP TSAP is Type C

#### Tab 1 — Programme Objectives
Model type, primary KPI, revenue ambition, strategic objectives

#### Tab 2 — Cost Model
From AI Centre Configurator BOM/ROM (auto-populated), CapEx/OpEx phasing, contingency, reconciliation vs Mode 1

#### Tab 3 — UC Schedule & Benefit Phasing ← KEY
- Per UC: go-live quarter, benefit type, value (C/B/O), ramp curve
- Pull-in / Delay / Phase controls
- Revenue streams by customer segment (internal govt, central agencies, neighbouring territories, private, academic)
- Socio-economic benefits: disaster avoidance, agricultural productivity, healthcare, govt efficiency, fraud reduction, jobs multiplier, startup ecosystem, data sovereignty value
- BCR calculation: total quantified benefit (10yr NPV) ÷ total cost

**Critical insight:** Benefits and revenue don't flow when the programme starts — massive cash-out in Year 0-2 with zero cash-in. This is the political kill zone. UC scheduling (pull-in/delay) and moratorium period are the key levers.

#### Tab 4 — Financing Sources
Per source: amount, %, interest rate, tenure, **moratorium period** (often more important than rate — defers debt service through cash-out zone), grace period, repayment schedule, currency, conditions precedent. Moratorium-adjusted effective cost ranking.

#### Tab 5 — Financial Curves
- Red: cumulative cash-out (capex + opex + debt service)
- Green: cumulative cash-in (grants + revenue + benefit value)
- Blue: cumulative net position
- Amber: moratorium period (no debt service yet)
- Markers: ◆ UC go-live, ✕ breakeven, ● self-sufficiency, ★ debt-free
- Zones: Red (political kill zone), Amber (moratorium), Green (surplus)

#### Tab 6 — Scenarios & What-If
- UC pull-in/delay sliders, moratorium toggles, revenue ramp, cost overrun %, interest rate ±, financing mix rebalancer, programme delay
- Scenario comparison: Conservative / Base / Optimistic / Custom
- Rows: breakeven yr, BCR, peak cash-out, self-sufficiency yr, 10yr NPV, jobs

---

## Territory AI Programme Profiler — Design Spec

**Language:** "Territory" not "State"
**Inspired by:** Atlas of Innovation (atlasofinnovation.org)

**10 dimensions (mixed single/multi-select):**
1. Fiscal capacity (Strong / Moderate / Constrained)
2. Political mandate + timeline (Flagship / Central scheme / Long-term)
3. Ownership preference (Full territory / PPP / Hybrid)
4. DC readiness (Existing DC / Greenfield / Colocation)
5. Data sensitivity (Standard / Sensitive / Air-gapped)
6. Central scheme alignment (CHECKLIST: IndiaAI / NM-ICPS / Smart Cities / DONER / PM-WANI / None)
7. Programme scale (XS / S / M / L / XL)
8. Implementation urgency (Within 1yr / 2-3yr / 5+yr)
9. Stakeholder landscape (Single DM / Coalition / Multi-level)
10. Existing AI maturity (None / Pilots / Some production / Mature)

**Output:** Radar chart, matched archetype (HP Glacial Hub / Maharashtra Industrial / Northeast Strategic / UT Digital), financing recommendation, actions playbook, challenges

---

## AI Centre Configurator — Full Stack

**Replaces: Inferencing Factory (too narrow)**

Layers:
1. Infrastructure (DC, power, cooling, PUE)
2. Compute (GPU training + inference, CPU, NVMe, edge)
3. **Networking** (E-W InfiniBand NDR/HDR, N-S 100GbE, NKC switches, OOB management, air-gap boundary)
4. Platform (AI platform software, MLOps, private cloud, observability)
5. Security & Compliance (zero-trust, air-gap, DPDP, SIEM)
6. Resilience (HA, DR, failover, backup)
7. Data & Integration (pipelines, connectors, ETL, data lake)
8. UC Development (effort per UC, fine-tuning, integration, testing)
9. Skills & Operations (AI workforce, MLOps team, managed services)

**Output:** BOM + ROM (±15% once UCs defined, ±35% parametric pre-UC)

---

## Intelligence Scraper — Current State

**Status:** Functional but needs tuning
**Runtime:** 14-17 minutes
**Yield:** 3 items/run (too low — dedup blocking most results)
**Global phase:** Added (`[GLOBAL]` label), 1 item/run so far

**Pending fixes for next session:**
- Global focus strings too narrow — broaden to general AI/HPC/tech (not sovereign-specific)
  - `UC-GLB`: "AI deployment production government defence health agriculture 2025 2026"
  - `TEC-GLB`: "GPU cluster HPC AI infrastructure supercomputer 2025 2026"
  - `OEM-GLB`: "NVIDIA AMD HPE Dell AI server HPC contract announcement 2025 2026"
- Remove `NOT India` constraint — too restrictive
- Dedup will improve naturally after 7 days as old items age out
- Do NOT enable daily schedule yet — test for 2-3 more days first

**Key settings (live):**
- RSS: false (govt sites block cloud IPs)
- Items per domain: 2
- Delay: 1000ms
- Dedup window: 7 days
- Sarvam: enabled (but Indic RSS feeds all failing — future fix)

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

## Next Session Priority (laptop)

1. **Fix global scraper focus strings** (quick — 15 mins)
2. **Start AI Centre Configurator** — DC decision modal + networking layer
3. **Mode 1 Budget Envelope Model** — parametric cost by T-shirt size

---

## Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Fix global scraper focus strings | 🔴 Next session start |
| 2 | AI Centre Configurator (full stack, all layers) | 🔴 Next |
| 3 | Mode 1 — Budget Envelope Model | 🔴 Next |
| 4 | UC Definition + Reconciliation flow | 🔴 Next |
| 5 | Mode 2 — Detailed Financial Model (6 tabs) | 🔴 Next |
| 6 | Territory AI Programme Profiler | 🟡 Next |
| 7 | Pitch Report generator | 🟡 Next |
| 8 | AI Centre Builder unified flow (Steps 1-7) | 🟡 Next |
| 9 | Decide portfolio code rename: L2-INF → L2-AIC? | 🟡 Soon |
| 10 | Enable daily scraper schedule (after 2-3 more test runs) | 🟡 Soon |
| 11 | GCP billing investigation | 🟡 Soon |
| 12 | UX pass — Engagement Docket | ⬜ Later |
| 13 | Visualisations (radar, territory map, tokenomics chart) | ⬜ Later |
| 14 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions |
