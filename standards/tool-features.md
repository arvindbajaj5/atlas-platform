# tool-features.md
# ATLAS Tool Features & Inventory
# Version: 2.0 | Last Updated: 2026-06-14

---

## Overview

This file is the canonical reference for all ATLAS tools — what each tool does, its current status, GitHub path, Supabase tables it reads/writes, and known gaps. Use this at the start of any session involving tool development, integration, or document generation.

**Platform URL:** https://arvindbajaj5.github.io/atlas-platform/
**Stack:** GitHub Pages (frontend), Supabase (database), Google Drive (documents)
**Auth model:** 4 roles — Business Head, Sales & Sales Support, Pre-Sales, Operations
**Supabase connectivity:** All tools read `atlas_global_cfg` from localStorage using `sbUrl`/`sbKey` property names. Never use `atlas_global` or `sb_url`/`sb_key` — this breaks connectivity silently.

---

## Lifecycle Stage → Tool Mapping

| Stage | Tools |
|---|---|
| 1. Intelligence | Intelligence Scraper (background + portal), PEI Tool, Second Brain |
| 2. Engagement | Engagement Docket |
| 3. Pre-Sales (HL) | SASC, TSAP Financial Model |
| 4. Pre-Sales (DL) | AI Inferencing Factory (planned rebuild) |
| 5. Sales | RAC Pipeline, Deal Analysis (JSON-based, pending Supabase migration) |
| 6. Operations | COMPASS, HPC Monitoring (planned) |

---

## Tool 1: ATLAS Portal

**Path:** `index.html`
**Status:** ✅ Live
**Supabase tables:** `intelligence_items`, `tsap_unit_costs`, `usage_last_30d` (view)

**Features:**
- Role-gated nav (4 roles)
- Tool launcher with stage grouping
- Settings panel: API keys, Supabase config, model tiers (7 task types), exchange rates, API usage dashboard, TSAP unit costs (inline editable)
- `gemini-2.0-flash` in ATLAS_MODEL_REGISTRY and all 7 tier selects (no duplicates — fixed June 2026)
- TSAP FM in Pre-Sales stage

**Known issues:** None currently

---

## Tool 2: Intelligence Scraper (Background — GitHub Actions)

**Path:** `scripts/scrape-intelligence.js` + `.github/workflows/scrape_intelligence.yml`
**Status:** ✅ Live
**Schedule:** Weekly cron — Sunday 2:00 AM IST (30 20 * * 0)
**Supabase tables:** `intelligence_items`, `scrape_runs`, `semantic_contexts`, `api_usage_log`, `app_config`, `feed_library`

**Features:**
- Two-phase pipeline: Phase 1 keyword pre-filter (free) → Phase 2 Gemini semantic matching (batched 5:1)
- 8 search domains + 3 global topics, all using `gemini-2.0-flash` with search grounding
- TTL-based domain skipping: adaptive TTL (7d → 14d → 21d) after empty runs
- Content hash deduplication (3 layers: URL, title normalisation, content hash)
- "Published after" constraint in grounding prompt
- All API calls logged to `api_usage_log` (flushed at end of run)
- scrape_runs starts empty — needs one manual trigger to populate domain locking indicators

**Model:** `gemini-2.0-flash` (search grounding support, $0.10/$0.40 per 1M tokens)

---

## Tool 3: Intelligence Scraper (Portal — On-demand)

**Path:** `tools/intelligence-scraper/index.html`
**Status:** ✅ Live
**Supabase tables:** `intelligence_items`, `scrape_runs`, `app_config`, `api_usage_log`, `scraping_metadata`, `uc_queue`

**Features:**
- Domain grid: last scraped date, items added, TTL lock status (locked tiles greyed)
- Same two-phase pipeline as background scraper
- Usage logging via `atlasLogUsage()` after each Gemini call
- **Test DB panel** (added June 2026): Load / Reload / Wipe buttons
  - Master data from `standards/test-data/intelligence_items_master.json` in GitHub
  - All test rows tagged: `source_type='test'`, `is_real=false`, `scraped_by='test-master-v1'`
  - Wipe only deletes `source_type=test AND is_real=false` — real data safe

---

## Tool 4: PEI Tool (Pre-Engagement Intelligence)

**Path:** `tools/pei-tool/index.html`
**Status:** ✅ Live
**Supabase tables:** `intelligence_items`, `pei_cache`

**Features:**
- Generates structured intelligence brief for a named organisation
- Model: `gemini-3.5-flash` (customer-facing quality; `maxOutputTokens: 4096`)
- 30-day cache: offers cached version if regenerated within 30 days
- Queries `intelligence_items` for domain-matched signals
- Usage logging: `atlasLogUsage()` after `savePEICache()` call
- Standard `atlas-nav-btn` back button → `window.location.href='../../'`

---

## Tool 5: Second Brain

**Path:** `tools/second-brain/index.html`
**Status:** ✅ Live
**Supabase tables:** `intelligence_items`, `uc_library`, `uc_queue`, `engagements`, `docket_items`

**Features:**
- Processes intelligence items into structured signals
- **UC Suggestion from Intel** (added June 2026):
  - "+ Suggest UC" button on every intel detail modal
  - Pre-fills Enrich UC modal from intel item (title, opportunity, summary, domain)
  - Saves with `status='suggested'`, `suggested_by='second_brain'`, `suggested_from=<intel_id>`
- **UC Review Queue** (added June 2026):
  - Shows all `status='suggested'` UCs at top of UC tab
  - Per UC: Approve (→ `status='active'`) | Enrich (open modal, save marks active) | Reject (→ `status='rejected'` + reason)
  - Queue refreshes automatically after each action
- Modal mode indicator: shows "Saving as Suggested" vs "Enriching suggestion" context
- `enrichModalMode` div in modal HTML for mode display

---

## Tool 6: Engagement Docket

**Path:** `tools/engagement-docket/index.html`
**Status:** ✅ Live (rebuilt June 2026)
**Supabase tables:** `customers`, `engagements`, `engagement_dockets`, `docket_items`, `uc_library`

**Features:**
- Sidebar: customers list + engagements nested, + buttons to create new
- Full docket header: engagement name, customer, owner, type/status badges, SASC + FM shortcut buttons
- **6 tabs:**
  - **Overview:** KPI row (UCs, open actions, outputs, strategy), customer profile grid, strategy snapshot, top 3 open actions
  - **Use Cases:** UC cards from `uc_library` (name, cluster, complexity, status: agreed/proposed/scratched). UC modal with cluster filter + search across 69 active UCs. Agree/Scratch/Remove per UC
  - **Actions:** Grouped by Open / Blocked / Done. Owner badge, due date, overdue highlight. Add/Edit/Complete/Delete
  - **Strategy:** Position / Key pitch / Watch points. Edit modal. Upserts to `docket_items` as `section='strategy'`
  - **Outputs:** All `section='output'` docket items. Links to SASC/FM/PEI with `?eng=` param
  - **History:** All docket items sorted newest first
- New customer + new engagement creation with auto `docket_id` generation
- Reads `engagements.docket_id` (new column); falls back to `engagement_dockets` for older records

**Data model — pointer-based (no data copies):**
- `section`: profile | strategy | uc | action | output | note | agreement
- `ref_table`: pointer to source table (uc_library, intelligence_items, pei_cache, etc.)
- `ref_id`: pointer to source row
- `sort_order`: display ordering

---

## Tool 7: SASC (Sovereign AI Stack Configurator)

**Path:** `tools/sasc/index.html`
**Status:** ✅ Live
**Supabase tables:** `uc_library`, `docket_items`, `engagements`, `ai_models`, `gpu_configs`, `benchmark_results`, `uc_interaction_types`, `uc_workload_profiles`, `pricing_params`, `fx_rates`, `people_params`

**Features:**
- 4-screen flow: Scope & DC → Stack Layers → Workload Profiler → BOM + ROM
- **UC selector** (updated June 2026): loads from `uc_library` with `status='active'` — all 69 UCs
  - Pre-selects UCs already in docket via `docket_items.ref_id` pointers
  - Cluster filter buttons (All / Agriculture / Water / Emergency / Aircraft Safety / Crew Safety etc.)
  - UC cards show `uc_name` + complexity badge (colour-coded: teal=simple, grey=medium, orange=complex, purple=research)
  - Shows "X of 69 selected" count
- **Live FX rates** (added June 2026): tries `frankfurter.app` first (4s timeout), falls back to Supabase `fx_rates`
  - On successful live fetch: saves fresh rates to `app_config` + appends to `exchange_rate_history`
  - `saveFxRatesToConfig()` runs in background — non-blocking
- RPS-based compute sizing (not token-based) using `benchmark_results` table
- People model: auto-suggested from scope + UC count, COLA + ramp, T&M/Fixed/Hybrid
- ROM Summary tab: "Financial Model →" button (teal) → opens TSAP FM with `?eng=`
- **Scope:** Not TSAP-only — works for TSAP, CSP, AI Lab, Inferencing Provider, Enterprise. Engagement type drives UC filter, tokenomics mode, BOM framing.

**FX default rates (as of June 2026):** USD/INR=95.76, USD/EUR=0.865, EUR/INR=110.70

---

## Tool 8: TSAP Financial Model

**Path:** `tools/tsap-financial-model/index.html`
**Status:** ✅ Live
**Supabase tables:** `engagements`, `docket_items`, `tsap_unit_costs`, `tsap_funding_sources`, `tsap_scenarios`

**Features:**
- 6 tabs: Programme Cost | Funding Sources | Funding Gap | Revenue Model | Cash Flow | What-If
- Demand derived from SASC output × unit costs from `tsap_unit_costs` (50 rows)
- Supply: full loan instrument modelling (EMI, grace, moratorium, repayment type)
- Revenue (Track 2): Bear/Base/Bull, CAGR, capture %, ramp, gross margin, GST
- Cash flow: quarterly, peak cash, break-even quarter, NPV, IRR (Chart.js)
- What-if scenarios saveable to `tsap_scenarios` per engagement
- **Currency selector** (added June 2026): INR / USD / EUR — rendered next to tab bar
- **Live FX rates** (added June 2026): same frankfurter.app → app_config fallback pattern as SASC
- `fmtCr()` and `fmtCrFull()` currency-aware: INR=Rs Cr, USD=$M, EUR=EUR M
- Standard atlas-hdr masthead with ATLAS brand, engagement badge, KPI row, Portal back button

**Note:** Unit costs in `tsap_unit_costs` apply across SASC and AI Inferencing Factory — not TSAP-specific despite table name.

---

## Tool 9: RAC Pipeline Tool

**Path:** `tools/rac-tool/index.html`
**Status:** ⚠️ Live but JSON-based (Supabase migration pending)
**Current storage:** localStorage / JSON

**Features:**
- Opportunity tracking across sales stages
- Revenue, account, contribution reporting
- Pending: migrate to Supabase `sales_actions` table and new schema

---

## Tool 10: Deal Analysis Tool

**Path:** `tools/deal-analysis/index.html`
**Status:** ⚠️ Live but JSON-based (Supabase migration pending)
**Current storage:** localStorage / JSON

**Features:**
- 12-tab deal analysis with Chart.js charts
- PPTX export via pptxgenjs
- AMC phase modelling, cash flow, IFRS 15, forex
- Pending: migrate to Supabase

---

## Tool 11: AI Inferencing Factory

**Path:** `tools/inferencing/index.html`
**Status:** ⚠️ Live (v2.2) but requires redesign
**Current storage:** JSON / in-memory

**Features (current v2.2):**
- Token economy model + pricing
- GPU sizing from benchmark profiles
- Revenue model (Track 2): Bear/Base/Bull

**Planned redesign:**
- Takes SASC BOM output as starting point (not standalone)
- Goes deeper: benchmark run design + script generation
- Near-final technical price (not ROM)
- Full token economy pricing model (input/output cost per token by model)
- Supabase-backed

---

## Tool 12: COMPASS

**Path:** `tools/compass/index.html`
**Status:** ✅ Live (standalone)
**Features:** Token governance across 6 pillars — Latency OLA, Token Economy/MOAT, Load Intelligence, Transparency/Provenance, Behavioural Nudge, Sovereign Metrics

---

## Shared Standards

### Masthead (all tools)
```css
.atlas-hdr — standard navy header, 52px height, sticky
.atlas-brand — "ATL<span>A</span>S" with orange A
.atlas-tool-name — tool identifier badge
.atlas-nav-btn — ghost button, rgba white border
.atlas-ver — version pill, orange on dark background
```
Back buttons: always `window.location.href='../../'` — never `history.back()`

### Supabase connectivity
```js
// Always use this pattern — never atlas_global or sb_url/sb_key
var g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}')
var sb = { url: g.sbUrl || g.sb_url || '', key: g.sbKey || g.sb_key || '' }
```

### Usage logging
`atlasLogUsage(params)` — shared function in PEI, Intel Scraper, TSAP FM
Logs to `api_usage_log`: tool, call_type, provider, model, input_tokens, output_tokens, cost_usd, latency_ms

### Currency architecture
- **USD:** Procurement / cost side
- **EUR:** Internal reporting
- **INR:** Customer-facing (Indian numbering: Cr / Lakh)
- Live rates via frankfurter.app, fallback via Supabase `app_config`

---

## Pending — Next Sprint

| Item | Priority |
|---|---|
| AI Inferencing Factory redesign | High |
| RAC Pipeline → Supabase migration | Medium |
| Deal Analysis → Supabase migration | Medium |
| HPC Monitoring tool | Low |
| Operations carve-out | Low |
