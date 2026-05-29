# claude-session-activator.md
# ATLAS Claude Session Activator
# Version: 1.8 | Last Updated: 2026-05-29

---

## Purpose

Upload this file at the start of any ATLAS working session. Claude reads it fully before proceeding.

**On loading, Claude confirms:**
> *"ATLAS Session Activator v1.8 loaded. [State any other files uploaded. Ready to proceed.]"*

---

## Platform Identity

- **Platform:** ATLAS — AI Transaction and Lifecycle Architecture Suite
- **Stack:** GitHub Pages (hosting) + Supabase (central database) + Google Drive (file storage)
- **Repo:** arvindbajaj5/atlas-platform
- **Live URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Gemini API:** `gemini-3.1-flash-lite` — key stored in browser localStorage + GitHub Secret
- **Supabase:** Central intelligence database — URL and anon key stored in browser localStorage + GitHub Secret

---

## Portal Structure (5 stages — LIVE)

```
🧠 Intelligence Engine    → second-brain, pei-tool, intelligence-scraper
🚀 Engagement Initiation  → engagement-management, ai-centre-builder, portfolio-portal, vision-doc
⚙️ Pre-Sales              → domain-config, inferencing, benchmark, ai-sovereignty
💼 Sales                  → rac-tool, deal-analysis
🔧 Operations             → compass, hpc-monitor
```

---

## Active Tool Set

| Tool | Version | Status | Path |
|---|---|---|---|
| Portal | v2.0 | ✅ Live | `index.html` |
| Second Brain | v2.1 | ✅ Live | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.1 | ✅ Live | `tools/pei-tool/` |
| Intelligence Scraper | v1.3 | ✅ Live | `tools/intelligence-scraper/` |
| Engagement Management | v1.0 | ✅ Live | `tools/engagement-management/` |
| AI Centre Builder | v1.1 | ⚠️ Form empty — pending fix | `tools/ai-centre-builder/` |
| Portfolio Portal | — | ✅ Live | `tools/portfolio-portal/` |
| Vision Document Factory | — | ✅ Live | `tools/vision-document/` |
| Domain Configurator | v3.0 | ✅ Live | `tools/domain-configurator/` |
| AI Inferencing Factory | v2.3 | ✅ Live | `tools/inferencing-factory/` |
| Benchmark Tool | — | ✅ Live | `tools/benchmark-tool/` |
| AI Sovereignty Index | v2.1 | ✅ Live | `tools/ai-sovereignty-index/` |
| RAC Pipeline | v2.0 | ✅ Live | `tools/rac-tool/` |
| Deal Analysis | — | ✅ Live | `tools/deal-analysis/` |
| COMPASS | v2.0 | ✅ Live | `tools/compass-v2/` |
| HPC Monitoring | — | ✅ Live | `tools/hpc-monitoring/` |

---

## Standards Files (in `standards/` on GitHub)

| File | Version | Status |
|---|---|---|
| `brand.md` | v1.1 | ✅ Live |
| `architecture-tiers.md` | v1.0 | ✅ Live |
| `hardware-preferences.md` | v1.0 | ✅ Live |
| `project-definition-schema.md` | v1.0 | ✅ Live |
| `blacklist-whitelist.md` | v1.0 | ✅ Live |
| `domain-taxonomy.md` | v1.1 | ✅ Live |
| `tool-features.md` | v1.0 | ⏸ Needs v1.1 |
| `claude-session-activator.md` | v1.8 | ✅ This file |

---

## Blacklist Summary

**Never reference in customer-facing content:** Krutrim, Chinese models (DeepSeek, Qwen etc.), MeitY, NIC, IndiaAI Mission, CDAC

**Policy whitelist:** Make in India · Viksit Bharat · Digital India · Atmanirbhar Bharat · PM-DevINE · BharatNet · Smart Cities · DPDP Act 2023

**Approved tech stack:** DLC 265kW (4× GB200, 8× MI355, 4× MI450, Vera Rubin NVL72) · Air-cooled (8× Rubin) · CPU DLC (AMD/Intel) · Networking (IB, BXI, NVLink, Infinity Fabric) · OEM AI Platform · OEM HPC Middleware · COMPASS · Modular Datacenter · SMP (up to 32 sockets, 48TB RAM) · HPC Cluster · Quantum Simulator

---

## Session Behaviour Rules — Building Tools

1. Read `brand.md` — apply colours, fonts, CSS variables
2. Read `blacklist-whitelist.md` — no blacklisted items
3. All tools: single-file HTML, CSS and JS inline, self-contained
4. Always output a downloadable file
5. **No nested backticks in template literals** — string concatenation only
6. **No inline onclick with dynamic JS args** — use data attributes
7. **No HTML entities in JS** — use Unicode escapes
8. **No non-ASCII chars in JS** — escape all with \uXXXX
9. **NEVER use `responseMimeType: 'application/json'`** — hard caps Gemini output to ~40 tokens
10. **Always disable thinking** — add `thinkingConfig: {thinkingBudget: 0}` to generationConfig
11. Always run Node.js syntax check before delivering

---

## Key Design Principles

- **On-premises first** — never suggest cloud unless explicitly required
- **Single-file HTML** — no external dependencies except approved CDNs
- **No backticks in JS** — string concatenation only
- **Gemini model:** `gemini-3.1-flash-lite` — fast, cheap, no thinking tokens, clean JSON
- **One model everywhere** — no MacBook, no Qwen, no Ollama (dropped permanently)
- **NEVER:** `responseMimeType: 'application/json'` or missing `thinkingBudget: 0`

---

## Domain Taxonomy v1.1 (LOCKED)

### 17 Intelligence Domains

| Code | Domain |
|---|---|
| GOV-GOV | Government & Governance |
| DEF-MIL | Defence — Armed Forces |
| DEF-SPC | Defence — Space & Satellite |
| DEF-HLS | Defence — Homeland Security |
| DEF-INT | Defence — Intelligence & Signals |
| GEO-SPA | Geospatial & Earth Observation (civilian) |
| INF-CIV | Critical Infrastructure |
| RES-NAT | Natural Resources |
| TEL-NET | Telecom & Networks |
| TEC-GEN | Technology |
| MED-BRD | Media & Broadcast |
| FIN-BFS | Banking & Financial Services |
| MFG-IND | Manufacturing & Industry |
| ENR-UTL | Energy & Utilities |
| REG-AIP | Regional AI Programmes |
| LAB-AIR | AI Labs & Research |
| HLT-LIF | Healthcare & Life Sciences |

DEF is a display umbrella — 4 sub-domains scraped individually.
GEO-SPA = civilian geospatial (NRSC, Survey of India, Pixxel). Defence geospatial tagged to DEF-MIL/DEF-INT.

### 5 Market News Topics

| Code | Topic |
|---|---|
| MKT-HPC | AI & HPC in India |
| MKT-COM | Competitor & Vendor Activity |
| MKT-TND | Government AI Tenders |
| MKT-DEF | Defence Technology News |
| MKT-SOV | Sovereign AI & Policy |

### 3 Intelligence Streams
`market_pulse` / `domain_intel` / `tech_watch`

---

## Intelligence Engine Architecture (FINAL)

**Two-phase pipeline — browser (on-demand) + GitHub Actions (scheduled):**

```
Phase 1 — SCRAPE
  gemini-3.1-flash-lite
  3 prompt types per domain: Market Pulse / Domain Intel / Tech Watch
  → writes to Supabase intelligence_items

Phase 2 — ENRICH
  gemini-3.1-flash-lite
  Expands each item: problem_statement, technical_context,
  infrastructure_signals, uc_extracted, depth_score
  → updates Supabase item
```

**GitHub Actions background scraper:**
- File: `scripts/scrape-intelligence.js`
- Workflow: `.github/workflows/scrape_intelligence.yml`
- Schedule: daily at 2am IST (20:30 UTC)
- Manual trigger: Actions tab → Intelligence Scraper → Run workflow
- Manual inputs: `domains` (comma-separated codes), `items_per_domain`, `run_enrichment`
- Secrets required: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
- Node.js 22, ES module (`"type": "module"` in `package.json`)
- Deduplicates against existing Supabase titles before inserting

**Supabase schema (live):**
Tables: `intelligence_items`, `scraping_metadata`, `uc_queue`, `sales_actions`, `uc_library`

New fields on `intelligence_items`: `intelligence_stream`, `problem_statement`, `technical_context`, `infrastructure_signals` (jsonb), `uc_extracted` (jsonb), `enriched_at`, `depth_score`

`uc_library` table: full rich UC schema — problem, benefit, process, actors, data requirements, technical requirements, hardware profile, maturity, reference deployments, source

---

## Second Brain v2.1

- 17 domains + 5 MKT news topics in sidebar
- DEF umbrella — collapsible, shows 4 sub-domains
- Counts loaded from Supabase on startup
- Three tabs per domain: Intelligence / Use Cases / Sales Actions
- Intelligence tab: filter by stream (All / Market Pulse / Domain Intel / Tech Watch) — client-side, instant
- UC tab: shows uc_queue items, Accept/Reject/Create Action
- Sales Actions tab: create, assign, track, convert to engagement
- Supabase config saved in localStorage key `atlas_sb2_cfg`
- **Backfill note:** Run this SQL on existing items missing stream: `UPDATE intelligence_items SET intelligence_stream = 'market_pulse' WHERE intelligence_stream IS NULL`

---

## Gemini API — Critical Rules

- **Model:** `gemini-3.1-flash-lite` everywhere
- **Always add:** `thinkingConfig: {thinkingBudget: 0}` to generationConfig
- **Never add:** `responseMimeType: 'application/json'`
- **Free tier:** 15 RPM, 1500 RPD
- **Key:** From Google Cloud Console (My First Project, billing enabled) via AI Studio

---

## Supabase

- **Project:** atlas-platform — South Asia (Mumbai)
- **Auth:** None for now (shared anon key) — add when going live
- **Credentials:** Stored in browser localStorage per tool + GitHub Secrets for Actions

---

## Build Sequence (confirmed — left to right on lifecycle)

```
STAGE 1 — Intelligence Scraper v1.3 + Supabase schema  ✅ COMPLETE
STAGE 2 — Second Brain v2.1                            ✅ COMPLETE
STAGE 3 — Customer Intelligence (PEI) enhancements     🔴 Next
STAGE 4 — AI Centre Builder fix                        🔴 After stage 3
STAGE 5 — Engagement Configurator                      🔴 After stage 4
STAGE 6 — GitHub Actions automation                    ✅ COMPLETE
```

---

## Current Pending Items

| # | Item | Stage | Priority |
|---|---|---|---|
| 1 | Intelligence Scraper — results panel below log not populating after run | 1 | 🟡 Next iteration |
| 2 | PEI — save API key in config | 3 | 🔴 Next build |
| 3 | PEI — query Supabase before Gemini, match by sector/country/ownership, "From Intelligence DB" section | 3 | 🔴 Next build |
| 4 | AI Centre Builder — form empty, investigate and fix | 4 | 🔴 After PEI |
| 5 | Engagement Configurator — receives converted Sales Actions, full lifecycle docket | 5 | 🔴 Major build |
| 6 | UC Library — manual add + bulk import (39 GeoAI UCs + civil aviation UCs) | 2 | 🔴 With Second Brain v2.2 |
| 7 | Second Brain — UC Library tab (rich form, manual add, bulk import) | 2 | 🔴 v2.2 |
| 8 | Network Graph View — D3.js force-directed graph in Second Brain | 2 | 🟡 Stretch goal |
| 9 | GDrive sync | — | 🔴 Low priority |
| 10 | RAC Tool exports testing | — | 🟡 Cosmetic |
| 11 | `tool-features.md` v1.1 | — | ⏸ On hold |

---

## ATLAS Phase 2 — Architecture Backlog

| # | Item | Notes |
|---|---|---|
| P2-1 | Intelligence Engine v2 | 17-domain — COMPLETE |
| P2-2 | Technical Solution Builder | 10-block modular configurator |
| P2-3 | Tokenomics Module | Make vs rent, sovereign vs cloud breakeven |
| P2-4 | Recommendation Engine | Smart version of Sales Actions — auto-matches intel to prospects |
| P2-5 | Engagement Design Engine | Archetype-driven — Territory/Govt/Defence/Enterprise |
| P2-6 | Solution Document Generator | Architecture, BOM, pricing |
| P2-7 | Portfolio Portal update | Dynamic from Technical Solution Builder |
| P2-8 | Modular DC Configurator | Container count, layout, power/cooling |
| P2-9 | Agents | Phase 2 only — needs server |

---

## Engagement Docket (future — Stage 5)

Replaces current Engagement Management. Builds over engagement lifecycle:
```
Intelligence Brief → UC Set → Pitch Report → Technical Solution
→ Financial Structuring → Proposal Document → Executive Documents
```
Portfolio selection updates docket automatically. Linked to Sales Actions via ENG-ID.

---

## Google Drive

```
📁 AI Portal (root) — ID: 1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd
```
Portal Drive file ID: `1F_qo4b6_jfhL-Skx7YFU5GtQH8Jry8Wt`

---

*End of ATLAS Session Activator v1.8*
