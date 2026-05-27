# claude-session-activator.md
# ATLAS Claude Session Activator
# Version: 1.5 | Last Updated: 2026-05-27

---

## Purpose

Upload this file at the start of any ATLAS working session. Claude reads it fully before proceeding.

**On loading, Claude confirms:**
> *"ATLAS Session Activator v1.5 loaded. [State any other files uploaded. Ready to proceed.]"*

---

## Platform Identity

- **Platform:** ATLAS — AI Transaction and Lifecycle Architecture Suite
- **Stack:** GitHub Pages (hosting) + Google Drive (file storage) + Supabase (database + auth)
- **Repo:** arvindbajaj5/atlas-platform
- **Live URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Gemini API:** Gemini 3.5 Flash — key stored in browser localStorage

---

## Portal Structure (5 stages — LIVE)

```
🧠 Intelligence Engine    → second-brain, pei-tool, intelligence-scraper
🚀 Engagement Initiation  → engagement-management, ai-centre-builder, portfolio-portal, vision-doc
⚙️ Pre-Sales              → domain-config, inferencing, benchmark, ai-sovereignty
💼 Sales                  → rac-tool, deal-analysis
🔧 Operations             → compass, hpc-monitor
```

- Home page: 5 stage cards — click to show tools ✅
- Left sidebar: 5 stage navigator only ✅
- Portal rebuilt as clean single file — no backticks, classic JS ✅

---

## Active Tool Set

| Tool | Version | Status | Path |
|---|---|---|---|
| Portal | v2.0 | ✅ Live | `index.html` |
| Second Brain | v1.0 | ✅ Live | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.1 | ✅ Live | `tools/pei-tool/` |
| Intelligence Scraper | v1.0 | ✅ Live | `tools/intelligence-scraper/` |
| Engagement Management | v1.0 | ✅ Live | `tools/engagement-management/` |
| AI Centre Builder | v1.1 | ✅ Live | `tools/ai-centre-builder/` |
| Portfolio Portal | — | ✅ Live | `tools/portfolio-portal/` |
| Vision Document Factory | — | ✅ Live | `tools/vision-document/` |
| Domain Configurator (Use Case ID) | v3.0 | ✅ Live | `tools/domain-configurator/` |
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
| `tool-features.md` | v1.0 | ⏸ Needs v1.1 update |
| `claude-session-activator.md` | v1.5 | ✅ This file |

---

## Blacklist Summary (always apply before generating content)

**Never reference in customer-facing content:** Krutrim, all Chinese models (DeepSeek, Qwen etc.), MeitY, NIC, IndiaAI Mission, CDAC

**Note:** Chinese models (Qwen, DeepSeek) ARE acceptable for local offline processing on MacBook via Ollama — they never leave the machine and are not customer-facing.

**Policy whitelist (use in Indian govt pitches):**
Make in India · Viksit Bharat · Digital India · Atmanirbhar Bharat · PM-DevINE · BharatNet · Smart Cities · DPDP Act 2023

**Approved tech stack:**
DLC 265kW (4× GB200, 8× MI355, 4× MI450, Vera Rubin NVL72) · Air-cooled (8× Rubin) · CPU DLC (AMD/Intel) · Networking (IB, BXI, NVLink, Infinity Fabric) · OEM AI Platform · OEM HPC Middleware · COMPASS · Modular Datacenter · SMP (up to 32 sockets, 48TB RAM) · HPC Cluster · Quantum Simulator

---

## Session Behaviour Rules

### Building or modifying a tool:
1. Read `brand.md` — apply colours, fonts, CSS variables
2. Read `blacklist-whitelist.md` — no blacklisted items in output
3. Read `architecture-tiers.md` if hardware sizing involved
4. Read `hardware-preferences.md` if BOM generation involved
5. Never break existing functionality — additions only unless told otherwise
6. All tools: single-file HTML, CSS and JS inline, self-contained
7. Always output a downloadable file
8. **No nested backticks in template literals** — use string concatenation throughout
9. **No inline onclick with dynamic JS args** — use data attributes instead
10. **No HTML entities in JS** — use Unicode escape sequences or actual chars
11. **No non-ASCII chars in JS** — escape all emoji with \u{XXXXX} or chr() approach
12. Always run Node.js syntax check before delivering

### Generating documents:
1. Apply `blacklist-whitelist.md` first
2. Apply `brand.md` slide and document standards
3. Always add DRAFT watermark
4. Word docs: cover → blank page → ToC → odd-page content start
5. Slides: white background only, max 3 colours, no text-box inside shape, use tables

---

## Key Design Principles

- **On-premises first** — never suggest cloud unless explicitly required
- **Single-file HTML** — no external dependencies except approved CDNs
- **Brand-compliant** — `brand.md` palette, Roboto font, white backgrounds
- **No backticks in JS** — string concatenation only, data attributes for dynamic onclick
- **Claude API:** `claude-sonnet-4-20250514`, max_tokens 1500, DRAFT watermark
- **Gemini 3.5 Flash:** PEI Tool and Intelligence Scraper (browser, on-demand)
- **Gemma 4 E2B or Qwen 3.5 4B via Ollama:** Local MacBook processing (offline, zero cost)
- **Qwen 3.5 4B pulled and working on MacBook** ✅

---

## Intelligence Engine Architecture (agreed and partially built)

**7-domain intelligence system:**

| # | Domain | Cadence | Model | Status |
|---|---|---|---|---|
| 1 | Customer Intelligence | On-demand | Gemini Flash + grounding (browser) | ✅ PEI Tool live |
| 2 | Domain Intelligence | Weekly | GitHub Actions scraper | 🔴 Billing issue |
| 3 | Technology Intelligence | Monthly | GitHub Actions scraper | 🔴 Not built |
| 4 | Market News | Weekly | GitHub Actions scraper | 🔴 Billing issue |
| 5 | Benchmarks | Quarterly | Manual | 🔴 Not built |
| 6 | Tech Specs | Quarterly | Manual | 🔴 Not built |
| 7 | Market Pricing | Monthly | GitHub Actions scraper | 🔴 Not built |

**Intelligence Scraper v1.0 (browser, on-demand):**
- 10 domains + 5 news topics, selectable via checkboxes
- Configurable item count (5/10/15/20), grounding toggle
- Token tracking + cost display per session
- Incremental — deduplicates on title
- Export JSON
- **Current issue:** Gemini free tier output token cap (~69 tokens) truncates responses
- **Fix needed:** Link correct Google Cloud billing to API key

**Two-stage pipeline (architecture locked, Phase 1 build in progress):**
```
Stage 1 — SCRAPING (GitHub Actions, scheduled) — billing issue blocking
Stage 2 — PROCESSING (MacBook, Ollama + Qwen 3.5 4B) — not yet built
```

**Intelligence database design (agreed):**
- Incremental scraping — metadata.json per domain, no duplicates
- Incremental extraction — check existing before adding, merge updates
- Semantic tagging — tags, cross_refs, related_sectors, related_use_cases per item
- Phase 2: ChromaDB + RAG when 200+ items (Ollama nomic-embed-text embeddings)
- Phase 3: LightRAG knowledge graph on own server

**MacBook setup:**
- Ollama installed ✅
- Qwen 3.5 4B pulled and working ✅
- Gemma 4 E2B: not pulled (Qwen sufficient for now)

---

## Gemini Billing Issue (MUST FIX NEXT SESSION)

**Root cause:** API key from AI Studio is linked to Google AI Pro subscription (Pixel purchase) — separate from Google Cloud billing account. Free tier caps output at ~69 tokens per request, truncating all responses.

**Fix:** Generate new API key from Google Cloud Console (My First Project — billing already linked) with Gemini API restriction enabled. Update key in browser localStorage and GitHub Secret `GEMINI_API_KEY`.

**Steps:**
1. Go to console.cloud.google.com → My First Project
2. APIs & Services → Library → enable Gemini API (if not already)
3. APIs & Services → Credentials → Create API key → restrict to Gemini API
4. Update key in Intelligence Scraper tool (Save Config)
5. Update GitHub Secret GEMINI_API_KEY
6. Test scraper — should now get full responses

---

## Current Pending Items

| # | Item | Status |
|---|---|---|
| 1 | Fix Gemini billing — new API key from billed project | 🔴 First priority next session |
| 2 | Test Intelligence Scraper with billed key — full rich output | 🔴 After billing fix |
| 3 | MacBook processing script (Ollama + Qwen) | 🔴 After scraper validated |
| 4 | GitHub Actions automation (dual-track) | 🟡 After on-demand validated |
| 5 | Engagement Configurator (replaces Domain Configurator) | 🔴 Next major build |
| 6 | GDrive ↔ GitHub sync | 🔴 Low priority |
| 7 | RAC Tool PPTX + XLSX export testing | 🟡 Cosmetic — later |
| 8 | Masthead alignment across tools | 🟡 Cosmetic — later |
| 9 | `tool-features.md` v1.1 | ⏸ On hold |
| 10 | Deal Analysis updates | ⏸ Deferred |

---

## ATLAS Phase 2 — Architecture Backlog

| # | Item | Notes |
|---|---|---|
| P2-1 | Intelligence Engine v2 | 7-domain system — IN PROGRESS |
| P2-2 | Technical Solution Builder | 10-block modular configurator replacing Inferencing Factory |
| P2-3 | Tokenomics Module | Peak vs sustained tokens, cost/latency curves, make vs rent, sovereign vs cloud breakeven |
| P2-4 | Recommendation Engine | Matches engagement inputs to intelligence database |
| P2-5 | Engagement Design Engine | Archetype-driven defaults — Territory/Govt/Defence/Enterprise |
| P2-6 | Solution Document Generator | Architecture doc, BOM, pricing from configured solution |
| P2-7 | Portfolio Portal update | Dynamic — pulls from Technical Solution Builder |
| P2-8 | Modular DC Configurator | Phase 1: container count, layout, power/cooling |
| P2-9 | Agents | Research + recommendation agents. Needs server infrastructure first. |

---

## Google Drive Structure

```
📁 AI Portal (root) — ID: 1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd
  📁 01 - Sales Enablement
  📁 02 - Opportunity Management
  📁 03 - Presales
  📁 04 - Business Operations Management
```

Portal Drive file ID: `1F_qo4b6_jfhL-Skx7YFU5GtQH8Jry8Wt`

---

## Next Session Sequence

1. Fix Gemini billing — new API key from Google Cloud Console (My First Project)
2. Test Intelligence Scraper with billed key
3. Build MacBook processing script (Ollama + Qwen 3.5 4B)
4. Then: Engagement Configurator design and build

---

*End of ATLAS Session Activator v1.5*
