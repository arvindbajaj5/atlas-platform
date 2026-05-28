# claude-session-activator.md
# ATLAS Claude Session Activator
# Version: 1.6 | Last Updated: 2026-05-28

---

## Purpose

Upload this file at the start of any ATLAS working session. Claude reads it fully before proceeding.

**On loading, Claude confirms:**
> *"ATLAS Session Activator v1.6 loaded. [State any other files uploaded. Ready to proceed.]"*

---

## Platform Identity

- **Platform:** ATLAS — AI Transaction and Lifecycle Architecture Suite
- **Stack:** GitHub Pages (hosting) + Supabase (central database) + Google Drive (file storage)
- **Repo:** arvindbajaj5/atlas-platform
- **Live URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Gemini API:** Gemini 3.5 Flash — key stored in browser localStorage
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
| Second Brain | v1.0 | ✅ Live | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.1 | ✅ Live | `tools/pei-tool/` |
| Intelligence Scraper | v1.1 | ✅ Live | `tools/intelligence-scraper/` |
| Engagement Management | v1.0 | ✅ Live | `tools/engagement-management/` |
| AI Centre Builder | v1.1 | ✅ Live | `tools/ai-centre-builder/` |
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
| `claude-session-activator.md` | v1.6 | ✅ This file |

---

## Blacklist Summary

**Never reference in customer-facing content:** Krutrim, Chinese models (DeepSeek, Qwen etc.), MeitY, NIC, IndiaAI Mission, CDAC

**Chinese models OK for:** local offline MacBook processing via Ollama only.

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
7. **No HTML entities in JS** — use Unicode escapes or actual chars
8. **No non-ASCII chars in JS** — escape all emoji with \u{XXXXX}
9. **No `responseMimeType: 'application/json'`** — causes Gemini Flash output token cap (~40 tokens). Never use this.
10. Always run Node.js syntax check before delivering

---

## Key Design Principles

- **On-premises first** — never suggest cloud unless explicitly required
- **Single-file HTML** — no external dependencies except approved CDNs
- **No backticks in JS** — string concatenation only
- **Claude API:** `claude-sonnet-4-20250514`, max_tokens 1500
- **Gemini 3.5 Flash (no grounding):** Intelligence Scraper default
- **Gemini 3.5 Flash (with grounding):** PEI Tool, Intelligence Scraper optional toggle
- **CRITICAL:** Never use `responseMimeType: 'application/json'` in Gemini API calls — hard caps output to ~40 tokens
- **Qwen 3.5 4B via Ollama:** MacBook local processing ✅ working

---

## Intelligence Engine Architecture

**7-domain system — two-stage pipeline:**

```
Stage 1 — SCRAPING (browser on-demand OR GitHub Actions scheduled)
  Gemini 3.5 Flash → extracts items → writes to Supabase intelligence_items

Stage 2 — PROCESSING (MacBook, Ollama + Qwen 3.5 4B) — NOT YET BUILT
  Reads raw data → structures, tags, cross-refs → writes to Supabase
```

**Supabase schema (live):**
- `intelligence_items` — all scraped intelligence
- `scraping_metadata` — last run per domain
- `uc_queue` — UC recommendations pending review

**Intelligence Scraper v1.1 features:**
- 10 domains + 5 news topics
- Configurable item count (5/10/15/20), default 10
- Grounding toggle (off by default)
- Writes to Supabase in real-time as items are extracted
- Incremental — deduplicates on title
- Token tracking + cost display
- Export JSON
- Multi-method JSON extraction (Methods 1, 2, 2.5, 3)
- **Known issue:** Some items still truncate — Method 2.5 truncation recovery handles most cases

**Storage architecture (locked):**
- GitHub Actions (automated) → Supabase
- Browser scraper (on-demand) → Supabase
- MacBook processing → Supabase
- All ATLAS tools read from Supabase

**Phase 2:** ChromaDB + RAG when 200+ items. Phase 3: LightRAG knowledge graph on own server.

**MacBook setup:**
- Ollama ✅ installed
- Qwen 3.5 4B ✅ pulled and working

---

## Gemini API — Critical Notes

- **API key:** Generated from Google Cloud Console (My First Project, billing enabled) via AI Studio
- **Free tier limits:** 15 RPM, 1500 RPD — sufficient for on-demand scraping
- **NEVER use `responseMimeType: 'application/json'`** — hard caps output tokens to ~40, breaks all responses
- **Grounding:** Available but uses more quota — toggle in scraper config

---

## Supabase

- **Project:** atlas-platform
- **Region:** South Asia (Mumbai)
- **Auth:** None for now (shared anon key access) — add proper auth when going live
- **Credentials:** Stored in browser localStorage (Supabase URL + anon key)
- **Tables:** intelligence_items, scraping_metadata, uc_queue

---

## Current Pending Items

| # | Item | Status |
|---|---|---|
| 1 | Verify Intelligence Scraper working after cache clears | 🟡 Cache issue — wait 10 min |
| 2 | MacBook processing script (Ollama + Qwen) | 🔴 Not built |
| 3 | GitHub Actions → write to Supabase | 🔴 Not updated |
| 4 | Engagement Configurator | 🔴 Next major build |
| 5 | Second Brain — update to read from Supabase | 🔴 Not updated |
| 6 | GDrive sync | 🔴 Low priority |
| 7 | RAC Tool exports testing | 🟡 Cosmetic — later |
| 8 | `tool-features.md` v1.1 | ⏸ On hold |

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

## Google Drive Structure

```
📁 AI Portal (root) — ID: 1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd
```

Portal Drive file ID: `1F_qo4b6_jfhL-Skx7YFU5GtQH8Jry8Wt`

---

*End of ATLAS Session Activator v1.6*
