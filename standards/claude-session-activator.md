# ATLAS Claude Session Activator
# Version: 2.6 | Last Updated: 2026-06-02

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.

**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Platform Overview

**ATLAS** (AI Transaction and Lifecycle Architecture Suite) — internal sales, presales and operations portal.
- **URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Stack:** GitHub Pages + Supabase + Multi-provider AI (7 providers)
- **Auth:** Simple role-based login (localStorage) — Business Head / Sales / Presales / Operations

---

## Tool Registry

| Tool | Version | Status | Path |
|---|---|---|---|
| Second Brain | v2.2 | ✅ Live | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.3 | ✅ Live (83KB) | `tools/pei-tool/` |
| Intelligence Scraper | v2.0 | ✅ Live (84KB) | `tools/intelligence-scraper/` |
| Engagement Docket | v2.0 | ✅ Live (115KB) | `tools/engagement-docket/` |
| Engagement Management | v1.0 | ⚠️ Legacy | `tools/engagement-management/` |
| AI Centre Builder | v1.1 | ⚠️ Legacy | `tools/ai-centre-builder/` |
| Domain Configurator | v3.0 | ✅ Live | `tools/domain-configurator/` |
| Inferencing Factory | v2.3 | ✅ Live | `tools/inferencing-factory/` |
| Benchmark Tool | v1.0 | ✅ Live | `tools/benchmark-tool/` |
| RAC Tool | v2.0 | ✅ Live | `tools/rac-tool/` |
| Deal Analysis Tool | v1.0 | ✅ Live | `tools/deal-analysis/` |
| HPC Monitoring | v1.0 | ✅ Live | `tools/hpc-monitoring/` |
| COMPASS | v2.0 | ✅ Live | `tools/compass-v2/` |
| `claude-session-activator.md` | v2.6 | ✅ This file | `standards/` |

---

## Portal Navigation

```
01 · Intelligence    Second Brain, PEI, Intelligence Scraper
02 · Engagement      Engagement Docket only
03 · Pre-Sales       Use Case Identification, Inferencing Factory, Benchmark
04 · Sales           RAC Pipeline, Deal Analysis
05 · Operations      HPC Monitoring, COMPASS
```

Vision Document — output of TSAP workflow inside Engagement Docket (not in nav).
AI Centre Builder — L2 config inside portfolio map (not in nav).

---

## ATLAS Model Registry

Functions available in all tools:
- `atlasGetGlobal()` — reads `atlas_global_cfg` from localStorage
- `atlasGetConfiguredProviders()` — providers with keys set
- `atlasCallModel(modelId, prompt, systemPrompt, maxTokens)` — universal call
- `atlasGetKeyForModel(modelId)` — returns API key for any model
- `atlasGetTaskModel(taskId)` — reads task-specific model from `model_tiers`

**CRITICAL — thinkingConfig:** NEVER add `thinkingConfig:{thinkingBudget:0}` to regular Gemini calls. Only valid for `-thinking` variants. Causes 400 errors on `gemini-3.1-flash-lite` and all standard models.

**CRITICAL — Search Grounding:** Never set `thinkingBudget:0` on grounded calls — kills the search tool.

---

## PEI Tool v0.3 — Key Facts

- Config card replaced — no key inputs. Reads from `atlas_global_cfg`.
- Settings status banner shows key/SB state on load.
- Key resolution in `generatePEI`: `atlasGetKeyForModel(model)` → `g.key_gemini` → `g.key_anthropic` → `g.key_openai`
- Model: from `modelSelect` dropdown → `atlasGetTaskModel('pei')` → fallback `gemini-3.1-flash-lite`
- `addPEIToDocket()` sets `atlas_pending_docket_item` in localStorage, opens Docket in new tab
- `+ Add to Docket` button appears AFTER successful brief generation (hidden before)
- DOM elements removed: `apiKey`, `sbUrl`, `sbKey` — any reference to these crashes tool

---

## Engagement Docket v2.0 — Key Facts

**Three-layer model:** `customers → engagements → engagement_dockets → docket_items`

**Customer tiers:** Strategic (full docket) | Transactional (lightweight, elevatable)

**Engagement archetypes:** `tsap` | `govt_sectorial` | `enterprise` | `defence`
(CHECK CONSTRAINT must include `tsap` — run ALTER TABLE if needed)

**All modals in static HTML:** contactModal, tsapModal, newCustomerModal, newEngagementModal, addItemModal, portfolioMapModal, newTxnModal — do NOT create dynamically.

**Working features:**
- Customer directory (sidebar) — Strategic/Transactional tiers
- New Customer modal — full profile
- New Engagement modal — archetype, phase, domain, value
- Customer profile tabs — Profile (contacts), Engagements, Transactions
- Add Contact modal — name, role, seniority, influence, email, phone
- Elevation flow — transactional → strategic, retrofits transactions
- Engagement docket — auto-created on first open
- Docket items — 11 types, status flow, filter bar
- Portfolio Map — L1/L2/L3, AI recommendation engine
- TSAP Configuration — 4 tabs: Territory, Objectives, Building Blocks, Financial
- TSAP Building Blocks — L2 nodes + L1.x programme components (PARTNER badge)
- AI Enrich — web search + AI builds regional uniqueness analysis
- Generate Vision Document — saves as exec_doc docket item
- My Action Docket — salesperson action list (sidebar)
- Export Docket (.txt) — in engagement action row
- Add to Docket trigger — checks `atlas_pending_docket_item` on load

**Pending / next iteration:**
- TSAP territory map (GeoJSON/Leaflet)
- Full .docx export (txt only for now)
- Second Brain → Add to Docket trigger
- UC acceptance → Add to Docket trigger

---

## Portfolio Catalogue — Finalized Taxonomy

```
L1     L1-TSAP    Territory Sovereign AI Programme
L1.1   L1.1-TSAP  AI Skills & Workforce Development (partner-led)
L1.2   L1.2-TSAP  Startup & Innovation Ecosystem (partner-led)
L1.3   L1.3-TSAP  Data Governance & Sovereign Data (partner-led)
L1.4   L1.4-TSAP  Research & Academic Partnership (partner-led)
L1.5   L1.5-TSAP  AI Policy, Regulation & Governance (partner-led)

L2     L2-AIF     AI Factory
L2     L2-INF     Inferencing Factory (generic baseline)
L2.1   L2.1-INF   GeoAI Inferencing Factory (EO/geospatial stack)
L2.2   L2.2-INF   Defence AI Inferencing Factory (air-gapped, MIL-SPEC)
L2.3   L2.3-INF   Health AI Inferencing Factory (DICOM/FHIR)
L2.4   L2.4-INF   FinAI Inferencing Factory (fraud, AML, RBI)
L2     L2-TRC     Training Cluster
L2     L2-HPC     HPC Cluster
L2     L2-EDG     Edge AI Node
L2     L2-MDC     Modular Datacenter

L3     L3-*       23 Lifecycle Services (V5 — 5 journey stages)
```

`level_code` NOT unique — multiple items share `L2`, `L3`. `code` IS unique.
`partner_led = true` for all L1.x. L2.x = pre-configured Inferencing Factory variants.

---

## Supabase Tables

| Table | Status |
|---|---|
| `intelligence_items` | ✅ Live — new fields: source_url, source_language, model_used, scrape_method, published_year, geography, is_real |
| `uc_queue` | ✅ Live |
| `uc_library` | ✅ Live (39 GeoAI UCs) |
| `sales_actions` | ✅ Live |
| `engagement_dockets` | ✅ Live — added customer_id, engagement_id columns |
| `docket_items` | ✅ Live |
| `customers` | ✅ Created (schema v2.1) |
| `engagements` | ✅ Created — archetype CHECK includes 'tsap' |
| `transactions` | ✅ Created |
| `portfolio_catalogue` | ✅ Created — seeded with 34 items (L1/L1.x/L2/L2.x/L3) |
| `l1_configurations` | ✅ Created |

---

## Intelligence Engine v2.0

**Hybrid:** RSS Feeds (GitHub Actions) + Gemini Search Grounding (browser + Actions)
**Fidelity issues deferred:** thinking model parts[], date gate, markdown fences in response
**Browser scraper:** reads keys from `atlas_global_cfg`, geography multi-select, sources toggle
**GitHub Actions v2.1:** `scripts/scrape-intelligence-v2.js` — pending upload

---

## Current Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Test PEI tool end-to-end after v0.3 upload | 🔴 Now |
| 2 | Test Engagement Docket — create customer, engagement, contacts, TSAP config | 🔴 Now |
| 3 | Wire Second Brain → Add to Docket trigger | 🟡 Next |
| 4 | Wire UC acceptance → Add to Docket trigger | 🟡 Next |
| 5 | Upload GitHub Actions scraper v2.1 | 🟡 Next |
| 6 | Intelligence scraper fidelity (thinking model, date gate) | 🟡 Soon |
| 7 | TSAP territory map (GeoJSON/Leaflet) | 🟡 Soon |
| 8 | Full .docx export for docket | 🟡 Soon |
| 9 | Network graph for intel items | ⬜ Later |
