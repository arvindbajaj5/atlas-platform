# claude-session-activator.md
# ATLAS Claude Session Activator
# Version: 1.4 | Last Updated: 2026-05-25

---

## Purpose

Upload this file at the start of any ATLAS working session. Claude reads it fully before proceeding.

**On loading, Claude confirms:**
> *"ATLAS Session Activator v1.4 loaded. [State any other files uploaded. Ready to proceed.]"*

---

## Platform Identity

- **Platform:** ATLAS — AI Transaction and Lifecycle Architecture Suite
- **Stack:** GitHub Pages (hosting) + Google Drive (file storage) + Supabase (database + auth)
- **Repo:** arvindbajaj5/atlas-platform
- **Live URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Gemini API:** Gemini 3.5 Flash — key stored in browser localStorage, used for PEI and Second Brain

---

## Portal Structure (5 stages — LIVE)

```
🧠 Intelligence Engine    → second-brain, pei-tool
🚀 Engagement Initiation  → engagement-management, ai-centre-builder, portfolio-portal, vision-doc
⚙️ Pre-Sales              → domain-config, inferencing, benchmark, ai-sovereignty
💼 Sales                  → rac-tool, deal-analysis
🔧 Operations             → compass, hpc-monitor
```

- Home page: 5 stage cards — click to show tools
- Left sidebar: 5 stage items only (stage navigator, not tool list) ✅ Done
- Portal rebuilt as clean single file — no backticks, classic JS ✅ Done

---

## Active Tool Set

| Tool | Version | Status | Path |
|---|---|---|---|
| Portal | v2.0 | ✅ Live | `index.html` |
| Second Brain | v1.0 | ✅ Live | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.1 | ✅ Live | `tools/pei-tool/` |
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
| `claude-session-activator.md` | v1.4 | ✅ This file |

---

## Blacklist Summary (always apply before generating content)

**Never reference:** Krutrim, all Chinese models (DeepSeek, Qwen etc.) in customer-facing content, MeitY, NIC, IndiaAI Mission, CDAC

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
10. Always run Node.js syntax check before delivering

### Generating documents:
1. Apply `blacklist-whitelist.md` first
2. Apply `brand.md` slide and document standards
3. Always add DRAFT watermark
4. Word docs: cover → blank page → ToC → odd-page content start
5. Slides: white background only, max 3 colours, no text-box inside shape, use tables

### Sovereign AI Platform Playbook sessions:
Read both Playbook and Project Brief fully before proceeding.
Confirm: *"Playbook v1.0 and [Project name] Brief loaded. Ready to proceed."*

---

## Key Design Principles

- **On-premises first** — never suggest cloud unless explicitly required
- **Single-file HTML** — no external dependencies except approved CDNs
- **Brand-compliant** — `brand.md` palette, Roboto font, white backgrounds
- **Blacklist-compliant** — check before every output
- **No backticks in JS** — string concatenation only, data attributes for dynamic onclick
- **Claude API:** `claude-sonnet-4-20250514`, max_tokens 1500, DRAFT watermark
- **Gemini 3.5 Flash + grounding:** PEI Tool and Intelligence Engine scraping
- **Gemma 4 E2B via Ollama:** Local MacBook processing (offline, zero cost)
- **Claude Haiku:** UC extraction and structured classification

---

## CDN Scripts in Use

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/docx@9.0.2/build/index.umd.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Engagement Architecture (locked)

```
SECTOR (Ownership: GOV/MIL/INT/PSU/PVT + Functional: 15 sectors)
  └── CUSTOMER (CUST-YYYY-NNNN)
        └── DIVISION / UNIT (DIV-NNNN)
              └── CONTACTS (influence levels)
              └── ENGAGEMENT (ENG-YYYY-SECTOR-SEQ)
                    └── USE CASE SET (versioned, engagement-specific)
                    └── DOCUMENTS / BRIEFS (timestamped, author-stamped)
                    └── COMMERCIAL
```

**ENG-ID format:** `ENG-[YEAR]-[SECTOR]-[SEQUENCE]` — independent of CRM ID

**Three engagement archetypes:**
- Territory CoE → AI Centre Builder mode
- Govt Sectorial → Domain solution + sovereign architecture
- Enterprise → ROI-led value case + commercial model

---

## Intelligence Engine Architecture (agreed, build next)

**Expanded from Second Brain to full 7-domain intelligence system:**

| # | Domain | Agent | Cadence | Model |
|---|---|---|---|---|
| 1 | Customer Intelligence | Gemini 3.5 Flash + grounding | On-demand | API (browser) |
| 2 | Domain Intelligence | Gemini 3.5 Flash + grounding | Weekly | GitHub Actions |
| 3 | Technology Intelligence | Gemini 3.5 Flash + grounding | Monthly | GitHub Actions |
| 4 | Market News | Gemini 3.5 Flash + grounding | Weekly | GitHub Actions |
| 5 | Benchmarks | Manual + curated fetch | Quarterly | GitHub Actions |
| 6 | Tech Specs | Manual + curated fetch | Quarterly | GitHub Actions |
| 7 | Market Pricing | Gemini 3.5 Flash + grounding | Monthly | GitHub Actions |

**Two-stage pipeline (NO agents — simple scripts):**

```
Stage 1 — SCRAPING (GitHub Actions, online, scheduled)
  scraper.py per domain → data/raw/[domain]/YYYY-MM-DD.json (committed to repo)

Stage 2 — PROCESSING (MacBook, offline, manual trigger)
  process.py → Ollama + Gemma 4 E2B → data/intelligence/[domain].json
```

**Model routing:**
- Scraping: Gemini 3.5 Flash + grounding (free tier, GitHub Actions)
- Processing: Gemma 4 E2B via Ollama on MacBook (zero cost, fully local)
- UC extraction: Gemma 4 E2B via Ollama (local)
- Customer PEI: Gemini 3.5 Flash + grounding (browser, on-demand)
- Documents: Claude Sonnet (browser API)

**MacBook setup (pending):**
- Ollama installed ✅
- Gemma 4 E2B: not yet pulled — `ollama pull gemma4:e2b`
- GitHub Actions: not yet set up

**Pilot domains:** Domain Intelligence + Market News (first two to build)

**No agents in Phase 1** — deterministic pipeline scripts. Agents considered for Phase 2 when server infrastructure is ready.

---

## Current Pending Items

| # | Item | Status |
|---|---|---|
| 1 | Ollama — pull Gemma 4 E2B on MacBook | 🔴 Tomorrow |
| 2 | Intelligence Engine — pilot scraping scripts (Domain Intel + Market News) | 🔴 Next build |
| 3 | Intelligence Engine — GitHub Actions workflow setup | 🔴 Next build |
| 4 | Intelligence Engine — MacBook processing script | 🔴 Next build |
| 5 | Intelligence Engine v2 — browser tool | 🔴 Next build |
| 6 | Engagement Configurator (replaces Domain Configurator) | 🔴 After Intelligence Engine |
| 7 | GDrive ↔ GitHub sync + housekeeping | 🔴 Manual, low priority |
| 8 | RAC Tool PPTX + XLSX export testing | 🟡 Cosmetic — later |
| 9 | Masthead alignment across tools | 🟡 Cosmetic — later |
| 10 | `tool-features.md` v1.1 | ⏸ On hold |
| 11 | Deal Analysis updates | ⏸ Deferred |

---

## ATLAS Phase 2 — Architecture Backlog

| # | Item | Notes |
|---|---|---|
| P2-1 | Intelligence Engine v2 | 7-domain system — IN PROGRESS (next build) |
| P2-2 | Technical Solution Builder | 10-block modular configurator replacing Inferencing Factory — Inferencing, AI Platform, Security, NOC/SOC, HA/DR, HPC Cluster, Modular DC, BOM & Pricing, Tokenomics, Solution Doc Generator |
| P2-3 | Tokenomics Module | Peak vs sustained tokens, cost/latency/throughput curves, make vs rent, sovereign vs cloud breakeven |
| P2-4 | Recommendation Engine | Matches engagement inputs to intelligence database. User picks, adapts, adds, deletes. |
| P2-5 | Engagement Design Engine | Archetype-driven defaults. Territory/Govt/Defence/Enterprise. |
| P2-6 | Solution Document Generator | Architecture doc, BOM, pricing — from full configured solution |
| P2-7 | Portfolio Portal update | Dynamic — pulls from Technical Solution Builder |
| P2-8 | Modular DC Configurator | Phase 1: container count, layout, power/cooling. Phase 2: visual design tool. |
| P2-9 | Agents (Phase 2 only) | Research agent + recommendation agent. Needs server infrastructure first. |

---

## Google Drive Structure

```
📁 AI Portal (root) — ID: 1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd
  📁 01 - Sales Enablement / AI Portfolio Deck
  📁 02 - Opportunity Management / Sales Qualification Tool / Deal Analysis Tool
  📁 03 - Presales / Sovereign AI Platform / AI Inferencing Factory / GeoAI / COMPASS
  📁 04 - Business Operations Management / HPC Monitoring / AI Sovereignty Index
```

Portal Drive file ID: `1F_qo4b6_jfhL-Skx7YFU5GtQH8Jry8Wt`

---

## Next Session Sequence

1. Pull Gemma 4 E2B on MacBook (`ollama pull gemma4:e2b`)
2. Build Domain Intelligence + Market News scraping scripts
3. Set up GitHub Actions workflow
4. Build MacBook processing script
5. Build Intelligence Engine v2 browser tool

---

*End of ATLAS Session Activator v1.4*
