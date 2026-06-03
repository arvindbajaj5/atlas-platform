# ATLAS Claude Session Activator
# Version: 3.1 | Last Updated: 2026-06-03

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.
**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Strategic Positioning — Refocused

**ATLAS is a Strategy & Consulting Enablement Platform** — used with the customer, not just behind the scenes. It is NOT a sales backend or operations tool.

**What stays in ATLAS:**
Intelligence → Analysis & Recommendation → Programme Design → Financial Modelling → Pitch Output

**What moves out (separate tools, later):**
- RAC Tool + Deal Analysis → Commercial/Deals tool (internal, finance team)
- HPC Monitoring → Ops tool
- COMPASS → Delivery tool
- AI Centre Builder (legacy) → replaced by new AI Centre Builder (see below)

**Customer-facing intent:** ATLAS is designed to be opened in a boardroom or workshop with a Chief Secretary, state IT Secretary, or ministry decision maker. The Pitch Report is generated in the room, based on what's been worked through together. This is a co-working tool, not a salesperson's backend.

---

## ATLAS — Refocused Architecture

```
INTELLIGENCE LAYER
  Second Brain      Market signals, domain intel, competitor data, sales actions
  PEI Tool          Customer/organisation intelligence brief
        ↓
ANALYSIS & RECOMMENDATION
  Recommendation Engine   Portfolio fit by archetype + docket signals
  Territory Profiler      8-10 dimension profile → reference archetypes → playbook
        ↓
DESIGN & CONFIGURATION
  AI Centre Builder       THE core tool — programme design for any sovereign AI deployment
  (Territory/org → UCs → DC design → Compute config → Platform → HA/DR → Security)
        ↓
FINANCIAL MODELLING
  Financing Navigator     Profile-based financing model routing
  Tokenomics              On-prem vs cloud, total AI value over contract
  Economic Impact         Jobs, GDP, investment multiplier
        ↓
OUTPUT
  Pitch Report            Boardroom-ready document generated in the room
  Solution Brief          Lighter version for sectorial/enterprise
```

---

## AI Centre Builder — The Core Tool

**Replaces and extends:** TSAP Configuration + Inferencing Factory connection + MDC T-shirt multi-site + DC decision + UC mapping + solution architecture

**Not just TSAP** — works for any sovereign AI deployment: territory, ministry, defence command, enterprise. Questions adapt by archetype but flow is the same.

**The AI Centre Builder flow:**
```
1. Who are you?         Territory/org profile (from PEI + Territory Profiler)
2. What do you need?    Use cases, domains, workloads (from UC Library + RE)
3. What can you build?  DC type (B&M or MDC), sites, T-shirt sizing
4. What will it run?    Inferencing Factory — compute, platform, HA/DR, security, manpower
5. What will it cost?   BOM, tokenomics, opex, manpower over contract
6. How will you fund it? Financing Navigator → model recommendation
7. What's the impact?   Economic model — jobs, GDP, sovereignty premium
        ↓
   Pitch Report generated from all of the above
```

**Inferencing Factory tool** (`tools/inferencing-factory/`) = the compute configuration engine inside AI Centre Builder. Not a standalone tool in the refocused ATLAS — it's the engine under the hood for step 4.

---

## Territory AI Programme Profiler — Design Spec

**Inspired by:** Atlas of Innovation (atlasofinnovation.org) — question flow → routing → reference profiles

**Language:** "Territory" not "State" throughout

**Profile dimensions (8-10, mixed single/multi-select):**
1. Fiscal capacity (single: Strong / Moderate / Constrained)
2. Political mandate + timeline (single: Flagship election cycle / Central scheme / Long-term strategic)
3. Ownership preference (single: Full territory / PPP / Hybrid)
4. DC readiness (single: Existing DC available / Greenfield / Colocation)
5. Data sensitivity (single: Standard / Sensitive / Air-gapped/Classified)
6. Central scheme alignment (CHECKLIST — multiple: IndiaAI / NM-ICPS / Smart Cities / DONER / PM-WANI / None)
7. Programme scale (single: XS pilot / S city / M state / L large state / XL national)
8. Implementation urgency (single: Within 1 year / 2-3 years / 5+ years)
9. Stakeholder landscape (single: Single decision maker / Coalition / Bureaucratic multi-level)
10. Existing AI maturity (single: None / Pilots only / Some production / Mature)

**Output:**
- Visual radar/spider chart across all 10 dimensions
- Matched reference archetype (closest fit from 4 pre-built profiles):
  - HP Glacial Hub — constrained fiscal, hydel power, small population, tourism+horticulture AI
  - Maharashtra Industrial — strong fiscal, large enterprise base, PPP-ready, manufacturing AI
  - Northeast Strategic — central grant dependent, DONER-funded, strategic importance, connectivity AI
  - Union Territory Digital — central control, high central funding, small geography, e-governance AI
- Financing model recommendation (from Financing Navigator logic)
- Actions playbook for matched profile
- Challenges and risks for matched profile
- Comparison view — your profile vs reference archetype radar overlay

**Lives inside:** AI Centre Builder (step 6) + saves as `pricing` docket item

---

## Visualisations Planned (later, not now)

- Territory map (GeoJSON/Leaflet) — sites plotted with T-shirt size labels
- Radar chart — Territory Profiler output + archetype overlay
- Tokenomics chart — on-prem vs cloud cost curves over contract life
- Economic impact visual — jobs/GDP waterfall or timeline
- Programme roadmap — phased site delivery Gantt/timeline

---

## Platform URL & Stack

- **URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Stack:** GitHub Pages + Supabase (RLS disabled all tables) + Multi-provider AI

---

## Tool Registry

| Tool | Version | Status | Notes |
|---|---|---|---|
| Second Brain | v2.3 | ✅ Live | |
| PEI Tool | v0.4 | ✅ Live | Load Saved JSON feature added |
| Intelligence Scraper | v2.1 | ⏸ Paused | Fixed, test before re-enabling |
| Engagement Docket | v2.2 | ✅ Live | Sprint 1+2 complete |
| Inferencing Factory | v2.3 | ✅ Live | Will become AI Centre Builder engine |
| Domain Configurator | v3.0 | ✅ Live | |
| Benchmark Tool | v1.0 | ✅ Live | |
| RAC Tool | v2.0 | ⚠️ Moving out | → Commercial/Deals tool |
| Deal Analysis | v1.0 | ⚠️ Moving out | → Commercial/Deals tool |
| HPC Monitoring | v1.0 | ⚠️ Moving out | → Ops tool |
| COMPASS | v2.0 | ⚠️ Moving out | → Delivery tool |

---

## Supabase — Critical Notes

**RLS disabled on ALL tables.** Run if silent failures return:
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
NOT `tsap` — use `territory_coe`. TSAP Configure shows only for `territory_coe`.

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
L2     L2-GIB     GenAI-in-a-Box ✅ added
L2     L2-AIF     Multi-Purpose AI Factory ✅ renamed
L2     L2-INF     Purpose-Built Inferencing Factory (full solution)
L2.1   L2.1-INF   GeoAI Inferencing Factory
L2.2   L2.2-INF   Defence AI Inferencing Factory (air-gapped, MIL-SPEC)
L2.3   L2.3-INF   Health AI Inferencing Factory
L2.4   L2.4-INF   FinAI Inferencing Factory
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
| M | 10 MW | 512–1,024 | 5–10B | State/territory hub |
| L | 15 MW | 1,024–1,536 | 10–15B | Large territory flagship |
| XL | 20 MW | 1,536–2,048+ | 15–25B | National/multi-territory |

T-shirt = per site. Total programme MW = sum of all sites = headline number.
Socio-political reality: most programmes need multiple sites even if phased.

---

## Sprint Plan (Revised)

### Sprint 3 — AI Centre Builder Foundations (next laptop session)
- DC Decision modal (B&M or MDC) when L2-INF selected from portfolio map
- MDC: T-shirt size + multi-site support, L2-MDC auto-added to solution
- Opens Inferencing Factory pre-loaded with engagement context
- Inferencing Factory output saves back to docket (solution, bom, pricing)
- DC type → tokenomics (PUE → cost/token)
- Frame as AI Centre Builder step 3-4 foundations

### Sprint 4 — AI Centre Builder v1 + Territory Profiler
- Territory AI Programme Profiler (10 dimensions, radar chart, 4 reference archetypes)
- Financing Navigator wired into profiler output
- Economic impact model
- Pitch Report generator (full boardroom document, generated in the room)
- Solution Brief (lighter version)
- Unified AI Centre Builder flow connecting all above

### Sprint 5 — Polish + Catalogue
- Territory map (GeoJSON/Leaflet)
- MDC multi-site UI in AI Centre Builder
- Portfolio catalogue MDC T-shirt params
- UX pass on Engagement Docket

---

## Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Sprint 3 — AI Centre Builder foundations | 🟡 Next laptop session |
| 2 | Sprint 4 — Territory Profiler + Pitch Report | 🟡 Next |
| 3 | Sprint 4 — AI Centre Builder v1 unified flow | 🟡 Next |
| 4 | Re-enable intelligence scraper (test first) | 🟡 Soon |
| 5 | GCP billing investigation | 🟡 Soon |
| 6 | UX pass — Engagement Docket | ⬜ Sprint 5 |
| 7 | Visualisations (radar, territory map, tokenomics chart) | ⬜ Later |
| 8 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions finalised |

---

## Notes for Phone-Based Sessions (next 3-4 days)

Good phone tasks:
- AI Centre Builder flow design and UX spec
- Territory Profiler — refine 10 questions, define 4 reference archetypes in detail
- Pitch Report structure — section by section outline
- Sprint 3 L&F design mockup
- Any planning, spec, or design work

Avoid on phone: large code builds, file uploads, GitHub Desktop operations
