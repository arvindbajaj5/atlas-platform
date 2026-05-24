# claude-session-activator.md
# ATLAS Claude Session Activator
# Version: 1.3 | Last Updated: 2026-05-24

---

## Purpose

Upload this file at the start of any ATLAS working session. Claude reads it fully before proceeding.

**On loading, Claude confirms:**
> *"ATLAS Session Activator v1.3 loaded. [State any other files uploaded. Ready to proceed.]"*

---

## Platform Identity

- **Platform:** ATLAS — AI Transaction and Lifecycle Architecture Suite
- **Stack:** GitHub Pages (hosting) + Google Drive (file storage) + Supabase (database + auth)
- **Repo:** arvindbajaj5/atlas-platform
- **Live URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Under evaluation:** Google Cloud (Cloud Run, Firestore) + Gemini 3.5 Flash API

---

## Role Access

| Role | Access |
|---|---|
| Business Head | Full access — all tools, Settings, Engineering To-Do |
| Sales & Sales Support | Sales stage tools only |
| Pre-Sales | Pre-Sales + read Opportunity Management |
| Operations | Operations tools + read project outputs |

---

## Portal Structure (5 stages)

```
🧠 Intelligence Engine    → second-brain, pei-tool
🚀 Engagement Initiation  → engagement-management, ai-centre-builder, portfolio-portal, vision-doc
⚙️ Pre-Sales              → domain-config, inferencing, benchmark, ai-sovereignty
💼 Sales                  → rac-tool, deal-analysis
🔧 Operations             → compass, hpc-monitor
```

Left sidebar: shows all 5 stage categories + tool links. Next iteration: collapse sidebar to stage navigator only (Option 4).

---

## Active Tool Set

| Tool | Version | Status | Path |
|---|---|---|---|
| Portal | — | ✅ Live | `index.html` |
| Second Brain | v1.0 | ✅ Live | `tools/second-brain/` |
| PEI Tool | v0.1 | ✅ Live | `tools/pei-tool/` |
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

| File | Version | Purpose |
|---|---|---|
| `brand.md` | v1.1 | Colours, typography, slide rules, Word doc standards |
| `architecture-tiers.md` | v1.0 | Tier 1–4 definitions, topology, deployment |
| `hardware-preferences.md` | v1.0 | GPU/compute/BOM rules and approved stack |
| `project-definition-schema.md` | v1.0 | Project Definition File JSON schema |
| `tool-features.md` | v1.0 | Tool inventory (needs v1.1 update) |
| `blacklist-whitelist.md` | v1.0 | Blacklist + approved tech stack + policy whitelist |
| `claude-session-activator.md` | v1.3 | This file |

---

## Blacklist Summary (always apply before generating content)

**Never reference:** Krutrim, all Chinese models (DeepSeek, Qwen etc.), MeitY, NIC, IndiaAI Mission, CDAC

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
8. **No nested backticks in template literals** — use string concatenation
9. Always run Node.js syntax check before delivering

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
- **Claude API:** `claude-sonnet-4-20250514`, max_tokens 1500, DRAFT watermark
- **Gemini 3.5 Flash:** Second Brain (with grounding) and PEI (with grounding)
- **Claude Haiku:** UC extraction and structured classification tasks

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

## Current Pending Items

| # | Item | Status |
|---|---|---|
| 1 | Sidebar → stage navigator only (Option 4) | 🟡 Next iteration |
| 2 | RAC Tool PPTX + XLSX export testing | 🟡 Pending test by Arvind |
| 3 | Second Brain — Foundation files (geospatial.md, defence.md) | 🔴 Not built |
| 4 | Engagement Configurator (replaces Domain Configurator) | 🔴 Not built |
| 5 | PEI Tool — register in portal TOOLS + CATEGORIES | 🟡 Snippets provided |
| 6 | GDrive ↔ GitHub sync + housekeeping | 🔴 Manual, not done |
| 7 | `tool-features.md` v1.1 | ⏸ On hold |
| 8 | Deal Analysis updates | ⏸ Deferred |

---

## ATLAS Phase 2 — Architecture Backlog (after current backlog)

| # | Item | Notes |
|---|---|---|
| P2-1 | Intelligence Engine v2 | Expand Second Brain to 7 domains — Customer, Domain, Technology, Market News, Benchmarks, Tech Specs, Market Pricing. Each with dedicated agents and cadence. Common intelligence database. |
| P2-2 | Technical Solution Builder | 10-block modular configurator replacing Inferencing Factory — Inferencing, AI Platform, Security, NOC/SOC, HA/DR, HPC Cluster, Modular DC, BOM & Pricing, Tokenomics, Solution Doc Generator |
| P2-3 | Tokenomics Module | Peak vs sustained tokens, cost/latency/throughput curves, make vs rent, sovereign vs cloud breakeven |
| P2-4 | Recommendation Engine | Matches engagement inputs to intelligence database. User picks, adapts, adds, deletes. |
| P2-5 | Engagement Design Engine | Archetype-driven defaults. Full configurator. Territory/Govt/Defence/Enterprise. |
| P2-6 | Solution Document Generator | Architecture doc, BOM, pricing — from full configured solution |
| P2-7 | Portfolio Portal update | Dynamic — pulls from Technical Solution Builder |
| P2-8 | Modular DC Configurator | Phase 1: container count, layout, power/cooling. Phase 2: visual design tool. |

---

## Google Drive Structure

```
📁 AI Portal (root) — ID: 1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd
  📁 01 - Sales Enablement / AI Portfolio Deck
  📁 02 - Opportunity Management / Sales Qualification Tool / Deal Analysis Tool
  📁 03 - Presales / Sovereign AI Platform / AI Inferencing Factory / GeoAI / COMPASS
  📁 04 - Business Operations Management / HPC Monitoring / AI Sovereignty Index
```

Portal file ID: `1F_qo4b6_jfhL-Skx7YFU5GtQH8Jry8Wt`

---

## Memory Export Format

When Arvind requests memory export: categories in order (Instructions, Identity, Career, Projects, Preferences), one entry per line sorted oldest-first, formatted as `[YYYY-MM-DD] - Entry`, wrapped in a single code block, completeness note after.

---

*End of ATLAS Session Activator v1.3*
