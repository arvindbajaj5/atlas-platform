# claude-session-activator.md
# ATLAS Claude Session Activator
# Version: 1.7 | Last Updated: 2026-05-28

---

## Purpose

Upload this file at the start of any ATLAS working session. Claude reads it fully before proceeding.

**On loading, Claude confirms:**
> *"ATLAS Session Activator v1.7 loaded. [State any other files uploaded. Ready to proceed.]"*

---

## Platform Identity

- **Platform:** ATLAS — AI Transaction and Lifecycle Architecture Suite
- **Stack:** GitHub Pages (hosting) + Supabase (central database) + Google Drive (file storage)
- **Repo:** arvindbajaj5/atlas-platform
- **Live URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Gemini API:** `gemini-3.1-flash-lite` — key stored in browser localStorage
- **Supabase:** Central intelligence database — URL and anon key stored in browser localStorage

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
| Second Brain | v1.0 | 🔴 Needs full redesign | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.1 | ✅ Live | `tools/pei-tool/` |
| Intelligence Scraper | v1.1 | ✅ Live | `tools/intelligence-scraper/` |
| Engagement Management | v1.0 | ✅ Live | `tools/engagement-management/` |
| AI Centre Builder | v1.1 | ⚠️ Form empty — check | `tools/ai-centre-builder/` |
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
| `tool-features.md` | v1.0 | ⏸ Needs v1.1 |
| `claude-session-activator.md` | v1.7 | ✅ This file |

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
8. **No non-ASCII chars in JS** — escape all emoji
9. **NEVER use `responseMimeType: 'application/json'`** — hard caps Gemini output to ~40 tokens
10. **Always disable thinking** — add `thinkingConfig: {thinkingBudget: 0}` to generationConfig
11. Always run Node.js syntax check before delivering

---

## Key Design Principles

- **On-premises first** — never suggest cloud unless explicitly required
- **Single-file HTML** — no external dependencies except approved CDNs
- **No backticks in JS** — string concatenation only
- **Gemini model:** `gemini-3.1-flash-lite` — fast, cheap, no thinking tokens, clean JSON
- **One model everywhere** — no MacBook, no Qwen, no Ollama
- **NEVER:** `responseMimeType: 'application/json'` or missing `thinkingBudget: 0`

---

## MacBook / Ollama / Qwen — DROPPED

MacBook processing, Ollama, and Qwen have been dropped from the architecture entirely. Reasons:
- Intelligence data is not confidential (publicly available domain data)
- Gemini 3.1 Flash-Lite cost is negligible (~$0.001 per call)
- Browser-based processing works for the whole team
- No local dependencies simplifies the stack

All processing — scraping AND enrichment — uses `gemini-3.1-flash-lite` in the browser.

---

## Intelligence Engine Architecture (FINAL)

**7-domain system — two-phase browser pipeline:**

```
Phase 1 — SCRAPE (Intelligence Scraper, browser)
  gemini-3.1-flash-lite
  Three prompt types per domain:
    1. Market Pulse — India/APAC, tenders, contracts, vendor wins
    2. Domain Intelligence — global, use cases, architectures, patterns
    3. Technology Watch — global, emerging capabilities, infrastructure
  → writes raw items to Supabase intelligence_items

Phase 2 — ENRICH (Intelligence Scraper, browser, after Phase 1)
  gemini-3.1-flash-lite
  Takes each raw item, expands with:
    - problem_statement
    - technical_context
    - infrastructure_signals
    - uc_extracted (name, cluster, hardware_needed, confidence)
  → updates item in Supabase

GitHub Actions (scheduled, when built)
  Same two phases, automated on cadence
  → writes to same Supabase tables
```

**Supabase schema (current + planned fields):**

Current: `id, domain_code, source_type, title, summary, type, intelligence_value, organisations, tags, opportunity, competitor_signals, uc_suggest, confidence, scraped_at, scraped_by, topic_code, topic_name, domain_name`

To add (v1.2): `intelligence_stream (market_pulse/domain_intel/tech_watch), problem_statement, technical_context, infrastructure_signals (jsonb), uc_extracted (jsonb), enriched_at, depth_score`

**Second Brain v2 — reads from Supabase:**
- Foundation: static human-curated markdown per domain (stays)
- Domain Intelligence: reads `intelligence_items` filtered by domain_code + intelligence_stream
- UC Queue: reads `uc_queue` table
- Search and filter across all domains
- Export domain brief
- Feeds engagement configurator

**Intelligence Scraper = collection tool**
**Second Brain = reading/analysis/synthesis tool**

**Phase 2:** ChromaDB + RAG at 200+ items. Phase 3: LightRAG on own server.

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
- **Credentials:** Stored in browser localStorage per tool

---

## Current Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Intelligence Scraper v1.2 — three prompt types, enrichment phase, richer schema, intelligence_stream field | 🔴 Next build |
| 2 | Supabase schema update — add new fields for v1.2 | 🔴 With scraper v1.2 |
| 3 | Second Brain v2 — reads Supabase, three streams, UC queue | 🔴 After scraper v1.2 |
| 4 | Scraper — restore item count below log | 🟡 With v1.2 |
| 5 | PEI — save API key in config | 🟡 Next iteration |
| 6 | PEI — query Supabase intel DB before Gemini, match by sector/country/ownership, "From Intelligence DB" section | 🟡 Next iteration |
| 7 | AI Centre Builder — form empty, investigate and fix | 🔴 Check first next session |
| 8 | GitHub Actions → write to Supabase | 🔴 After scraper stable |
| 9 | Engagement Configurator | 🔴 After Second Brain |
| 10 | GDrive sync | 🔴 Low priority |
| 11 | RAC Tool exports testing | 🟡 Cosmetic |
| 12 | `tool-features.md` v1.1 | ⏸ On hold |

---

## ATLAS Phase 2 — Architecture Backlog

| # | Item | Notes |
|---|---|---|
| P2-1 | Intelligence Engine v2 | 7-domain — IN PROGRESS |
| P2-2 | Technical Solution Builder | 10-block modular configurator |
| P2-3 | Tokenomics Module | Make vs rent, sovereign vs cloud breakeven |
| P2-4 | Recommendation Engine | Matches engagement to intelligence DB |
| P2-5 | Engagement Design Engine | Archetype-driven — Territory/Govt/Defence/Enterprise |
| P2-6 | Solution Document Generator | Architecture, BOM, pricing |
| P2-7 | Portfolio Portal update | Dynamic from Technical Solution Builder |
| P2-8 | Modular DC Configurator | Container count, layout, power/cooling |
| P2-9 | Agents | Phase 2 only — needs server |

---

## Google Drive

```
📁 AI Portal (root) — ID: 1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd
```
Portal Drive file ID: `1F_qo4b6_jfhL-Skx7YFU5GtQH8Jry8Wt`

---

*End of ATLAS Session Activator v1.7*
