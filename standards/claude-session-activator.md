# ATLAS Claude Session Activator
# Version: 2.5 | Last Updated: 2026-05-31

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
| Second Brain | v2.2 | ✅ Live (91KB) | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.2 | ✅ Live (79KB) | `tools/pei-tool/` |
| Intelligence Scraper | v2.0 | ✅ Live (84KB) | `tools/intelligence-scraper/` |
| Engagement Docket | v2.0 | ✅ Live (104KB) | `tools/engagement-docket/` |
| Engagement Management | v1.0 | ⚠️ Legacy — replaced by Engagement Docket | `tools/engagement-management/` |
| AI Centre Builder | v1.1 | ⚠️ Legacy — L2 config inside Docket | `tools/ai-centre-builder/` |
| Domain Configurator | v3.0 | ✅ Live | `tools/domain-configurator/` |
| Inferencing Factory | v2.3 | ✅ Live | `tools/inferencing-factory/` |
| Benchmark Tool | v1.0 | ✅ Live | `tools/benchmark-tool/` |
| RAC Tool | v2.0 | ✅ Live | `tools/rac-tool/` |
| Deal Analysis Tool | v1.0 | ✅ Live | `tools/deal-analysis/` |
| HPC Monitoring | v1.0 | ✅ Live | `tools/hpc-monitoring/` |
| COMPASS | v2.0 | ✅ Live | `tools/compass-v2/` |
| `claude-session-activator.md` | v2.5 | ✅ This file | `standards/` |

---

## Portal Navigation (updated)

```
01 · Intelligence    Second Brain, PEI, Intelligence Scraper
02 · Engagement      Engagement Docket (TSAP config, portfolio map, recommendation engine)
03 · Pre-Sales       Use Case Identification, Inferencing Factory, Benchmark
04 · Sales           RAC Pipeline, Deal Analysis
05 · Operations      HPC Monitoring, COMPASS
```

Vision Document Factory removed from nav — output of TSAP workflow inside Engagement Docket.
AI Centre Builder removed from nav — L2 building block config inside portfolio map.

---

## ATLAS Model Registry (shared utility — embedded in all tools)

Key functions available in all tools:
- `atlasGetConfiguredProviders()` — returns only providers with keys set in Settings
- `atlasBuildModelSelect(selectedModel)` — builds select HTML showing only configured providers
- `atlasGetKeyForModel(modelId)` — returns API key for any model
- `atlasCallModel(modelId, prompt, systemPrompt, maxTokens)` — universal call, routes to correct provider
- `atlasGetTaskModel(taskId)` — reads task-specific model from `atlas_global_cfg.model_tiers`

**Design principle:** Tool dropdowns show ONLY models whose provider key is configured in Settings.

---

## Global Settings (atlas_global_cfg)

Single localStorage key shared across all tools. Set once in portal Settings (Business Head only):
- `sbUrl`, `sbKey` — Supabase credentials
- `key_gemini`, `key_openai`, `key_anthropic`, `key_mistral`, `key_qwen`, `key_sarvam` — AI provider keys
- `endpoint_ollama` — local Ollama endpoint
- `model_tiers` — per-task model assignments

**Model tiers by task (defaults):**

| Task | Default model |
|---|---|
| Scraping | `gemini-3.1-flash-lite` |
| Intel Enrichment | `gemini-3.1-flash-lite` |
| UC Auto-Enrichment | `gemini-3.5-flash` |
| PEI Brief | `claude-haiku-4-5-20251001` |
| Document Generation | `claude-haiku-4-5-20251001` |
| Indic / Regional | `sarvam-m` |
| Air-Gapped | `llama3.3` |

**7 AI Providers supported:**

| Provider | Region | Key models |
|---|---|---|
| Google Gemini | US | `gemini-3.1-flash-lite`, `gemini-3.5-flash` |
| Anthropic Claude | US | `claude-haiku-4-5-20251001`, `claude-sonnet-4-6` |
| OpenAI | US | `gpt-4o`, `gpt-4o-mini` |
| Mistral AI | 🇫🇷 EU | `mistral-large-latest`, `mistral-small-latest` |
| Qwen (Alibaba) | 🇨🇳 CN/Intl | `qwen3.5-plus`, `qwen3.5-flash` |
| Sarvam AI | 🇮🇳 India | `sarvam-m` |
| Ollama | Local | any local model |

---

## Gemini API — Critical Rules

- **Search Grounding:** `tools:[{googleSearch:{}}]` — do NOT set `thinkingBudget:0` or grounding will not fire
- **Thinking model:** `gemini-3.5-flash` splits response across multiple `parts[]` — concat ALL parts, not just `parts[0]`
- **thinkingBudget:0** — safe for plain Gemini calls (RSS extraction etc.) but KILLS search grounding
- **Scraping model:** `gemini-3.5-flash` hardcoded in `callGeminiGrounded` — bypasses model registry (intentional)

---

## Intelligence Engine Architecture — v2.0 (REAL WEB SEARCH)

**Hybrid pipeline — RSS Feeds + Gemini Search Grounding:**

```
Source 1 — RSS Feeds (GitHub Actions, free, real URLs)
  15 feeds: PIB, MoD, DRDO, GeM, ET, Hindu BL, Mint, BS, Dainik Bhaskar (hi), Eenadu (te)
  → Parse XML → filter last 30 days → Sarvam translate (Indic) → Gemini extract signals

Source 2 — Gemini Search Grounding (browser + GitHub Actions, free on paid tier)
  tools:[{googleSearch:{}}] — Gemini searches Google in real-time
  → Grounding citations = real URLs → Save with source_url, is_real=true
```

**Fidelity issues deferred (fix separately):**
- `gemini-3.5-flash` returns thinking parts — need to concat all response parts
- Response wrapped in ```json markdown — extractJSON strips it but not always reliably
- Date gate may be too aggressive — rejects 2022-2024 items including legitimate background context

**New fields on intelligence_items:** `source_url`, `source_name`, `source_language`, `model_used`, `scrape_method`, `published_date`, `published_year`, `geography`, `is_real`

**GitHub Actions v2.1:**
- Script: `scripts/scrape-intelligence-v2.js`
- Workflow: `.github/workflows/scrape_intelligence_v2.yml`
- Install: `npm install node-fetch@3 xml2js`
- Env vars: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `SARVAM_API_KEY` (optional)

---

## Engagement Docket v2.0 — Architecture

**Three-layer model:**
```
customers → engagements → engagement_dockets → docket_items
           ↓
      transactions (transactional customers only)
           ↓
      l1_configurations (TSAP engagements only)
           ↓
      portfolio_catalogue (seed data — L1/L2/L3)
```

**Two customer tiers:**
- **Strategic** — full engagement lifecycle, dockets, TSAP config, portfolio map
- **Transactional** — lightweight record, transactions, elevatable to strategic

**Elevation flow:** Business Head elevates transactional → docket auto-created → all transactions retrofitted as docket items

**Two docket types:**
- Customer Engagement Docket — full lifecycle, Word export
- Salesperson Action Docket — one per person, auto-created on first action

**Engagement archetype values:**
```sql
-- Run this to fix CHECK constraint (territory_coe → tsap):
ALTER TABLE engagements DROP CONSTRAINT IF EXISTS engagements_archetype_check;
ALTER TABLE engagements ADD CONSTRAINT engagements_archetype_check
  CHECK (archetype IN ('tsap','govt_sectorial','enterprise','defence'));
```

**Docket item types:** action | intel | pei | uc | rfp | pitch | solution | bom | proposal | pricing | exec_doc

**TSAP Configuration (L1) — 4 tabs:**
1. Territory: name, type, governance, security classification, ownership, scale
2. Objectives: core objective, vision, justification, uniqueness, success metrics + AI Enrich button
3. Building Blocks: L2 blocks + L1.x programme components
4. Financial Model: Side A (financing) + Side B (build costs) → financing gap

**Generate Vision Document:** calls AI model (documents task tier), saves as exec_doc docket item

---

## Portfolio Catalogue — Finalized Taxonomy

```
L1     L1-TSAP    Territory Sovereign AI Programme (flagship)
L1.1   L1.1-TSAP  AI Skills & Workforce Development (partner-led, population-scale)
L1.2   L1.2-TSAP  Startup & Innovation Ecosystem (partner-led)
L1.3   L1.3-TSAP  Data Governance & Sovereign Data (partner-led)
L1.4   L1.4-TSAP  Research & Academic Partnership (partner-led)
L1.5   L1.5-TSAP  AI Policy, Regulation & Governance (partner-led)

L2     L2-AIF     AI Factory (general-purpose GPU compute)
L2     L2-INF     Inferencing Factory (generic baseline)
L2.1   L2.1-INF   GeoAI Inferencing Factory (pre-configured, EO/geospatial stack)
L2.2   L2.2-INF   Defence AI Inferencing Factory (air-gapped, MIL-SPEC)
L2.3   L2.3-INF   Health AI Inferencing Factory (DICOM/FHIR, clinical)
L2.4   L2.4-INF   FinAI Inferencing Factory (fraud, AML, RBI compliance)
L2     L2-TRC     Training Cluster
L2     L2-HPC     HPC Cluster
L2     L2-EDG     Edge AI Node
L2     L2-MDC     Modular Datacenter

L3     L3-*       23 Lifecycle Services across 5 journey stages (V5 portfolio)
```

**Key design rules:**
- `level_code` is NOT unique — multiple items share `L2`, `L3` etc.
- `code` IS unique — `L2-AIF`, `L2.1-INF` etc.
- `partner_led = true` for all L1.x components
- L2.x items are pre-architected Inferencing Factory variants — same hardware, domain-specific software stack
- Vision Document is an OUTPUT of TSAP config, not a standalone tool

---

## Supabase Tables

| Table | Purpose | Status |
|---|---|---|
| `intelligence_items` | Intelligence engine | ✅ Live |
| `uc_queue` | UC suggestions from scraper | ✅ Live |
| `uc_library` | Curated use case library | ✅ Live (39 GeoAI UCs) |
| `sales_actions` | Sales actions from Second Brain | ✅ Live |
| `engagement_dockets` | Docket containers | ✅ Live |
| `docket_items` | Items inside dockets | ✅ Live |
| `customers` | Customer profiles | 🔴 Run schema SQL |
| `engagements` | Engagement records | 🔴 Run schema SQL |
| `transactions` | Transactional customer sales | 🔴 Run schema SQL |
| `portfolio_catalogue` | Portfolio items L1/L2/L3 | 🔴 Run schema SQL |
| `l1_configurations` | TSAP programme configs | 🔴 Run schema SQL |

**Schema file:** `engagement_docket_full_schema.sql` (run in Supabase SQL Editor)

---

## Engagement Docket v2.0 — Known Issues (fix next iteration)

| # | Issue |
|---|---|
| ED-1 | Button text showing unicode escapes (`\uD83D\uDCBC`, `\u002B`) in browser — root cause: JS string concat writes escape sequences as literal DOM text. Fix: use `el.textContent` or actual characters in template strings, not JS unicode escapes. |
| ED-2 | Supabase CHECK constraint on `engagements.archetype` does not include `tsap` — run ALTER TABLE fix above. |
| ED-3 | Contact management UI — `addContact()` is a placeholder, needs full contacts card. |
| ED-4 | My Action Docket — `openMyActions()` is a placeholder. |
| ED-5 | TSAP territory map — GeoJSON/Leaflet integration pending. |

---

## Build Sequence Status

```
STAGE 1 — Intelligence Scraper v2.0          ✅ Live (fidelity issues deferred)
STAGE 2 — Second Brain v2.2                  ✅ Live
STAGE 3 — PEI v0.2                           ✅ Live
STAGE 4 — AI Centre Builder fix              ⚠️ Superseded by Engagement Docket
STAGE 5 — Engagement Docket v2.0             ✅ Built — ED-1 to ED-5 fixes pending
STAGE 6 — GitHub Actions automation          ✅ Live (v2.1 pending upload to scripts/)
STAGE 7 — Portfolio Catalogue                ✅ Schema written, pending SQL run
```

---

## Current Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Run `engagement_docket_full_schema.sql` in Supabase | 🔴 Now |
| 2 | Fix archetype CHECK constraint (tsap) | 🔴 Now |
| 3 | Fix ED-1: Button unicode escapes in Engagement Docket | 🔴 Next build |
| 4 | Upload GitHub Actions scraper v2.1 (`scrape-intelligence-v2.js`) | 🔴 Next |
| 5 | Upload workflow yml v2 | 🔴 Next |
| 6 | Wire PEI → Add to Docket trigger | 🟡 Soon |
| 7 | Wire UC acceptance → Add to Docket trigger | 🟡 Soon |
| 8 | TSAP territory map (GeoJSON/Leaflet) | 🟡 Soon |
| 9 | Contact management UI in Docket | 🟡 Soon |
| 10 | My Action Docket (salesperson) | 🟡 Soon |
| 11 | Word export for docket (docx skill) | 🟡 Soon |
| 12 | Intelligence scraper fidelity (thinking model, date gate) | 🟡 Soon |
| 13 | Network graph for intel items (defer until real data accumulates) | ⬜ Later |
