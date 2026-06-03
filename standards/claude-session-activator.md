# ATLAS Claude Session Activator
# Version: 3.0 | Last Updated: 2026-06-03

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.
**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Platform Overview

**ATLAS** (AI Transaction and Lifecycle Architecture Suite) — internal sales, presales and operations portal.
- **URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Stack:** GitHub Pages + Supabase (RLS disabled on all tables) + Multi-provider AI

---

## Tool Registry

| Tool | Version | Status | Path |
|---|---|---|---|
| Second Brain | v2.3 | ✅ Live | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.4 | ✅ Live | `tools/pei-tool/` |
| Intelligence Scraper | v2.1 | ⏸ Paused (fixed, not re-enabled) | `scripts/scrape-intelligence.js` |
| Engagement Docket | v2.2 | ✅ Live | `tools/engagement-docket/` |
| Domain Configurator | v3.0 | ✅ Live | `tools/domain-configurator/` |
| Inferencing Factory | v2.3 | ✅ Live | `tools/inferencing-factory/` |
| Benchmark Tool | v1.0 | ✅ Live | `tools/benchmark-tool/` |
| RAC Tool | v2.0 | ✅ Live | `tools/rac-tool/` |
| Deal Analysis Tool | v1.0 | ✅ Live | `tools/deal-analysis/` |
| HPC Monitoring | v1.0 | ✅ Live | `tools/hpc-monitoring/` |
| COMPASS | v2.0 | ✅ Live | `tools/compass-v2/` |

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

**Engagements archetype constraint:** Valid values: `territory_coe` | `govt_sectorial` | `enterprise` | `defence`
- NOT `tsap` — use `territory_coe` for TSAP engagements
- TSAP Configure button shows only when `archetype = 'territory_coe'`

---

## CRITICAL — thinkingConfig Rule

NEVER add `thinkingConfig:{thinkingBudget:0}` to Gemini API calls.
Causes 400 errors on all standard models. Also kills search grounding.

---

## CRITICAL — Key Resolution Pattern

All AI calls must use this robust fallback (same as generatePEI):
```javascript
var g = atlasGetGlobal()
var model = atlasGetTaskModel('task_id') || 'gemini-3.1-flash-lite'
var key = atlasGetKeyForModel(model) || g.key_gemini || g.key_anthropic || g.key_openai || ''
if(!atlasGetKeyForModel(model) && key){
  if(g.key_gemini) model = 'gemini-3.1-flash-lite'
  else if(g.key_anthropic) model = 'claude-haiku-4-5-20251001'
}
```
`atlasGetTaskModel('pei')` defaults to `claude-haiku-4-5-20251001` — fails silently if only Gemini key configured without this fallback.

---

## Engagement Docket v2.2 — Sprint Status

**Sprint 1 — Complete ✅**
- Second Brain → `+ Docket` on intel/UC items
- PEI → `+ Docket` with Load Saved JSON (no token spend)
- Trigger modal: customer dropdown, archetype selector, CustomerName — EngagementName labels
- localStorage cleared only after confirmed Supabase insert
- sbInsert logs real Supabase errors with HTTP status

**Sprint 2 — Complete ✅**
- Header: orange ⚡ Recommend button, status dropdown top-right, docket pill counter
- RE auto-runs on engagement open if docket has intel/UC/PEI/RFP items
- RE scopes by archetype: territory_coe=L1+L1.x+L2+L3, defence=L2.2-INF+edge+L3, others=L2+L3
- RE reads docket signals (intel/UC/PEI titles + notes)
- Recommendation panel: orange left-border, priority badges, reasoning, upsell, Apply + Dismiss
- applyRecommendationsToPortfolio() pre-selects PORTFOLIO_SELECTION → opens Portfolio Map
- savePortfolioSelection creates `solution` docket item, refreshes header pill
- TSAP Configure button: territory_coe archetype only

**Sprint 3 — Not yet built**
See sprint plan below.

---

## PEI Tool v0.4 — Key Facts

- `📁 Load Saved Brief` button near Generate — loads JSON, calls renderPEI, no API call
- peiOutput hidden on load, shown by renderPEI on success
- addPEIToDocket: safeText() helper, correct docket URL, try/catch localStorage
- generatePEI: robust key fallback, single var model declaration

---

## Second Brain v2.3 — Key Facts

- `+ Docket` on every intel card, UC library items, UC queue items
- offerAddToDocket: no confirm dialog, direct trigger
- thinkingConfig removed from all Gemini calls

---

## Intelligence Scraper v2.1 — Fixed, Paused

**Fixes applied (not yet live — needs re-enable):**
- `xml2js` added to workflow npm install
- `thinkingConfig:{thinkingBudget:0}` removed from callGemini
- `parts[]` concat fixed — filters out thought parts, joins text parts only

**To re-enable:** GitHub Actions → Intelligence Scraper → Enable workflow
**Test first:** Run manually via workflow_dispatch before enabling schedule

---

## Portfolio Catalogue — Current State

```
L1     L1-TSAP    Territory Sovereign AI Programme
L1.1-L1.5         Programme components (partner-led)
L2     L2-GIB     GenAI-in-a-Box ← ADDED today
L2     L2-AIF     Multi-Purpose AI Factory ← RENAMED today
L2     L2-INF     Purpose-Built Inferencing Factory (full solution)
L2.1-L2.4         Domain Inferencing Factories (GeoAI, Defence, Health, Fin)
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
| M | 10 MW | 512–1,024 | 5–10B | State hub |
| L | 15 MW | 1,024–1,536 | 10–15B | Large state flagship |
| XL | 20 MW | 1,536–2,048+ | 15–25B | National/multi-state |

T-shirt = per site. Total programme MW = sum of all sites = headline number.

---

## Sprint Plan

### Sprint 3 — Inferencing Factory → Docket (next build session)
- DC Decision modal (B&M or MDC) when L2-INF selected from portfolio map
- If MDC: T-shirt size selector (XS/S/M/L/XL) + multi-site support
- L2-MDC auto-added to solution items when MDC selected
- Opens Inferencing Factory pre-loaded with engagement context (customer, domain, UCs)
- Inferencing Factory output saves back to docket: solution, bom, pricing items
- DC type feeds tokenomics (PUE → cost/token)

### Sprint 4 — Output Documents + Territory AI Programme Profiler
- **Territory AI Programme Profiler** (inspired by Atlas of Innovation)
  - Replaces "state" with "Territory" throughout
  - 8-10 profile dimensions (not limited to 3 questions):
    - Fiscal capacity
    - Political mandate + timeline
    - Ownership preference
    - DC readiness (existing vs greenfield)
    - Data sensitivity / air-gap requirement
    - Central scheme alignment (CHECKLIST — multiple selections)
    - Programme scale (XS → XL T-shirt)
    - Implementation urgency
    - Stakeholder landscape
  - Visual profile output: radar/spider chart across all dimensions
  - Reference profile comparison: 3-4 pre-built archetypes
    (HP Glacial Hub / Maharashtra Industrial / Northeast Strategic / UT Digital)
  - Actions + challenges playbook per matched profile
  - Financing model recommendation (Bilateral+PPP, Central Grant, Self-funded etc.)
  - Save to docket as pricing item
  - Lives inside TSAP Financial Model tab
- **Pitch Report generator** (TSAP boardroom document):
  - Territory context + opportunity
  - Problem statement (from PEI)
  - Programme proposition (L2 blocks by site with T-shirt sizes)
  - Use case showcase (top 5-8 from UC Library)
  - Economic impact (jobs, GDP, startups, MW headline)
  - Financial model summary (financing model + build cost)
  - Implementation roadmap (phased by site)
  - Call to action
- **Solution Brief** (govt/sectorial/enterprise): lighter version

### Sprint 5 — Portfolio Catalogue + MDC Config
- MDC T-shirt sizes as configuration parameters in portfolio map
- TSAP Building Blocks tab — MDC multi-site + T-shirt UI
- Finish remaining TSAP tabs (objectives, financial model with Profiler)

---

## Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Sprint 3 — Inferencing Factory → Docket + DC/MDC modal | 🟡 Next session |
| 2 | Sprint 4 — Territory AI Programme Profiler | 🟡 Next session |
| 3 | Sprint 4 — Pitch Report generator | 🟡 Next session |
| 4 | Sprint 5 — Portfolio catalogue MDC T-shirt params | 🟡 Soon |
| 5 | Re-enable intelligence scraper (test first) | 🟡 Soon |
| 6 | TSAP territory map (GeoJSON/Leaflet) | ⬜ Later |
| 7 | Full .docx export for docket | ⬜ Later |
| 8 | GCP billing investigation | 🟡 Soon |
| 9 | Brand.md + hardware-preferences.md | ⬜ Later (after hardware decisions finalised) |

---

## Notes for Phone-Based Sessions

If working on phone (next 3-4 days):
- Design, planning and spec work is fine
- Avoid large code builds — save for laptop
- Good phone tasks: Sprint 3 L&F design, Territory Profiler question set design, Pitch Report structure, reviewing existing tool flows
