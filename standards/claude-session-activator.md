# ATLAS Claude Session Activator
# Version: 2.9 | Last Updated: 2026-06-03

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
| Intelligence Scraper | v2.0 | ⏸ Paused | `tools/intelligence-scraper/` |
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

**RLS disabled on ALL tables** — run if any silent insert/update failures occur:
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
ALTER TABLE scraping_metadata DISABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_items DISABLE ROW LEVEL SECURITY;
```

**Engagements archetype constraint:** Valid values: `territory_coe` | `govt_sectorial` | `enterprise` | `defence`
- NOT `tsap` — use `territory_coe` for TSAP engagements
- TSAP Configure button shows only when `archetype = 'territory_coe'`
- Trigger modal has Archetype dropdown so new engagements can be set correctly

---

## CRITICAL — thinkingConfig Rule

NEVER add `thinkingConfig:{thinkingBudget:0}` to Gemini API calls.
Causes 400 errors on all standard models. Also kills search grounding.

---

## CRITICAL — Key Resolution Pattern

All AI calls must use this fallback chain (same pattern as generatePEI):
```javascript
var model = atlasGetTaskModel('task_id') || 'gemini-3.1-flash-lite'
var key = atlasGetKeyForModel(model) || g.key_gemini || g.key_anthropic || g.key_openai || ''
if(!atlasGetKeyForModel(model) && key){
  if(g.key_gemini) model = 'gemini-3.1-flash-lite'
  else if(g.key_anthropic) model = 'claude-haiku-4-5-20251001'
}
```
`atlasGetTaskModel('pei')` defaults to `claude-haiku-4-5-20251001` — if only Gemini key is configured, this fails silently without the fallback.

---

## Engagement Docket v2.2 — Key Facts

**Architecture:** `customers → engagements → engagement_dockets → docket_items`

**Archetype values (schema):** `territory_coe` | `govt_sectorial` | `enterprise` | `defence`

**All 8 modals in static HTML:**
triggerModal, contactModal, tsapModal, newCustomerModal, newEngagementModal, addItemModal, portfolioMapModal, newTxnModal

**Sprint 1 — Complete ✅**
- Second Brain → `+ Docket` on intel/UC items
- PEI → `+ Docket` (with Load Saved JSON to skip token spend)
- Trigger modal: customer dropdown, archetype selector, CustomerName — EngagementName labels
- localStorage cleared only after confirmed Supabase insert
- sbInsert logs real Supabase errors

**Sprint 2 — Complete ✅ (testing in progress)**
- Header: orange ⚡ Recommend button, status dropdown top-right, docket pill (📋 3 intel · 2 UCs · 1 PEI)
- RE auto-runs on engagement open if docket has intel/UC/PEI/RFP items
- RE scopes by archetype: territory_coe=full L1+L1.x+L2+L3, defence=L2.2-INF+edge+L3, others=L2+L3
- RE reads docket signals (intel titles/notes, UC names, PEI brief)
- RE key resolution: robust fallback chain — doesn't fail silently if task model key missing
- rec-panel: if missing on click, re-renders engagement before retrying
- Recommendation panel: orange left-border card, priority badges HIGH/MED/LOW, reasoning, upsell, Apply to Portfolio Map, Dismiss
- applyRecommendationsToPortfolio() pre-selects PORTFOLIO_SELECTION then opens Portfolio Map
- TSAP Configure button: shows only for territory_coe archetype

**Pending Sprint 2 testing:**
- RE fires and returns useful recommendations ← IN PROGRESS
- Apply to Portfolio Map correctly pre-selects items
- Portfolio Map save creates solution docket item
- Manual Recommend button click works correctly

**Pending next sprints:**
- Sprint 3 — Inferencing Factory → Docket + DC/MDC decision modal + T-shirt sizing
- Sprint 4 — Pitch Report generator (TSAP boardroom document)
- Sprint 5 — Portfolio catalogue updates (L2-GIB, MDC T-shirt params)

---

## PEI Tool v0.4 — Key Facts

- `📁 Load Saved Brief` button near Generate — loads JSON, calls renderPEI, no API call
- peiOutput hidden on load, shown by renderPEI on success
- addPEIToDocket: safeText() helper, correct URL, try/catch localStorage
- generatePEI: atlasGetGlobal(), single var model, fallback gemini-3.1-flash-lite

---

## Second Brain v2.3 — Key Facts

- `+ Docket` on every intel card → addIntelToDocket()
- `+ Docket` on UC library/queue items → addUCToDocket()
- offerAddToDocket: no confirm dialog, direct trigger
- thinkingConfig removed from all Gemini calls

---

## Portfolio Catalogue — Finalized Taxonomy

```
L1     L1-TSAP    Territory Sovereign AI Programme
L1.1-L1.5         Programme components (partner-led)
L2     L2-GIB     GenAI-in-a-Box (MISSING from catalogue — needs INSERT)
L2     L2-AIF     Multi-Purpose AI Factory
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

## Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Test RE end-to-end (HP engagement) | 🔴 Now |
| 2 | Test Apply to Portfolio Map | 🔴 Now |
| 3 | Sprint 3 — Inferencing Factory → Docket + DC/MDC modal | 🟡 Next |
| 4 | Sprint 4 — Pitch Report generator | 🟡 Next |
| 5 | Sprint 5 — Portfolio catalogue (L2-GIB, MDC sizes) | 🟡 Next |
| 6 | TSAP Building Blocks — MDC multi-site + T-shirt UI | 🟡 Next |
| 7 | Intelligence scraper fidelity fixes | ⬜ Later |
| 8 | TSAP territory map (GeoJSON/Leaflet) | ⬜ Later |
| 9 | Full .docx export for docket | ⬜ Later |
| 10 | GCP billing investigation | 🟡 Soon |
