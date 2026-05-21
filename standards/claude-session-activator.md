# claude-session-activator.md
# ATLAS Claude Session Activator
# Version: 1.2 | Last Updated: 2026-05-21

---

## Purpose

This file is uploaded at the start of any ATLAS working session to give Claude the full platform context needed to work effectively. Upload this file alongside any relevant project definition file or tool file at the beginning of each session.

**On loading this file, Claude should confirm:**
> *"ATLAS Session Activator v1.2 loaded. [Describe what else was uploaded, e.g. 'Project Definition: MDoNER GeoAI loaded. Ready to proceed.']"*

---

## Platform Identity

- **Platform:** ATLAS — AI Transaction and Lifecycle Architecture Suite
- **OEM:** [OEM_NAME] (placeholder)
- **Stack:** GitHub Pages (hosting) + Google Drive (file storage) + Supabase (database + auth)
- **Repo base URL:** `https://[username].github.io/atlas-platform/`
- **Under evaluation:** Google Cloud (Cloud Run, Firestore, Firebase) + Gemini 3.5 Flash API for Second Brain and PEI

---

## Role Context

| Role | Access |
|---|---|
| **Business Head** | Full access to all tools, Settings, portal admin |
| **Sales & Sales Support** | Portfolio Portal, RAC Pipeline, Deal Analysis |
| **Pre-Sales** | Domain Configurator, Inferencing Factory, Vision Document, Benchmark, AI Sovereignty Index, COMPASS, AI Centre Builder |
| **Operations** | HPC Monitoring, read access to project outputs |

---

## Active Tool Set

| Tool | Version | Status | Path |
|---|---|---|---|
| Portal | — | ✅ Live | `index.html` |
| Portfolio Portal | — | ✅ Live | `tools/portfolio-portal/` |
| RAC Pipeline | v2.0 | ✅ Live | `tools/rac-tool/` |
| Domain Configurator | v3.0 | ✅ Live | `tools/domain-configurator/` |
| Inferencing Factory | v2.3 | ✅ Live | `tools/inferencing-factory/` |
| Deal Analysis | — | ✅ Live | `tools/deal-analysis/` |
| Vision Document Factory | — | ✅ Live | `tools/vision-document/` |
| Benchmark Tool | — | ✅ Live | `tools/benchmark-tool/` |
| AI Sovereignty Index | v2.1 | ✅ Live | `tools/ai-sovereignty-index/` |
| COMPASS | v2.0 | ✅ Live | `tools/compass/` |
| HPC Monitoring | — | ✅ Live | `tools/hpc-monitoring/` |
| AI Centre Builder | v1.1 | ✅ Live | `tools/ai-centre-builder/` |

---

## Standards Files

| File | Version | Purpose |
|---|---|---|
| `brand.md` | v1.1 | Colours, typography, slide rules, Word doc standards |
| `architecture-tiers.md` | v1.0 | Tier 1–4 definitions, topology, deployment rules |
| `hardware-preferences.md` | v1.0 | GPU/compute/storage/networking/cooling preferences and BOM rules |
| `project-definition-schema.md` | v1.0 | Project Definition File JSON schema and field rules |
| `tool-features.md` | v1.0 | Tool inventory, features, status, role access |
| `blacklist-whitelist.md` | v1.0 | Blacklisted models/orgs/ministries + approved tech stack + policy whitelist |
| `claude-session-activator.md` | v1.2 | This file |

---

## Blacklist & Whitelist — Summary

**Always read `blacklist-whitelist.md` before generating any customer-facing content.**

### Blacklist (never reference)
- **Models:** Krutrim, all Chinese models (DeepSeek, Qwen, Baichuan, Yi, etc.)
- **Ministries:** MeitY
- **Organisations:** NIC, IndiaAI Mission, CDAC

### Whitelist — Policy hooks (reference actively in Indian govt pitches)
Make in India · Viksit Bharat · Digital India · Atmanirbhar Bharat · PM-DevINE · BharatNet · Smart Cities Mission · DPDP Act 2023

### Whitelist — Approved tech stack
DLC 265kW (4× GB200, 8× MI355, 4× MI450, Vera Rubin NVL72) · Air-cooled (8× Rubin) · CPU DLC (AMD/Intel) · Networking (IB, BXI, NVLink, Infinity Fabric) · OEM AI Platform · OEM HPC Middleware · COMPASS · Modular Datacenter · SMP (up to 32 sockets, 48TB RAM) · HPC Cluster · Quantum Simulator

---

## Session Behaviour Rules

### When building or modifying a tool:
1. Read `brand.md` first — apply correct colours, fonts, CSS variables, slide/doc rules
2. Read `blacklist-whitelist.md` — ensure no blacklisted items appear
3. Read `architecture-tiers.md` if the tool involves hardware sizing or deployment
4. Read `hardware-preferences.md` if the tool involves BOM generation or GPU sizing
5. Read `tool-features.md` to understand where the tool fits
6. Never break existing functionality — additions only unless explicitly told to replace
7. All tools are single-file HTML — no external dependencies except CDN scripts already in use
8. Always output a downloadable file, not just inline code
9. Always run Node.js syntax check mentally — no nested backticks in template literals

### When generating documents:
1. Read `blacklist-whitelist.md` — apply before generating any content
2. Read `project-definition-schema.md` to understand what data is available
3. Apply `brand.md` slide and document standards
4. Always add DRAFT watermark
5. Word documents: cover → blank page → ToC → odd-page content start
6. Slides: white background only, max 3 colours, no text-box inside shape, use tables

### When working with a Project Definition File:
- Parse and confirm: project name, customer, stage, domain, tier, key flags
- Use project data to pre-populate tools

### When the Sovereign AI Platform Playbook is uploaded:
- Read both Playbook and Project Brief fully before proceeding
- Confirm: *"Playbook v1.0 and [Project name] Brief loaded. Ready to proceed."*

---

## Key Design Principles

- **On-premises first** — never suggest cloud unless explicitly required
- **Single-file HTML** — CSS and JS inline, self-contained
- **Brand-compliant** — `brand.md` palette, Roboto font, white backgrounds
- **Blacklist-compliant** — check `blacklist-whitelist.md` before every output
- **Data flows downstream** — tools pass data via localStorage or JSON export
- **Claude API:** document generation uses `claude-sonnet-4-20250514`, max_tokens 1500, DRAFT watermark always
- **Gemini 3.5 Flash:** for Second Brain and PEI (web grounding, scheduled/on-demand)
- **No nested backticks** in template literals — use string concatenation instead
- **No browser storage for artifacts** — localStorage only for user data persistence

---

## CDN Scripts in Use

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Architecture Decisions in Progress

| Decision | Status | Notes |
|---|---|---|
| Three-workspace portal restructure | 🔴 Design pending | Strategy & Consulting / Presales / Sales & Ops |
| Engagement Management hierarchy | 🔴 Design pending | Sector → Customer → Engagement → Use Cases |
| Engagement Definition File schema | 🔴 Design pending | Master data object for all downstream tools |
| Engagement Configurator | 🔴 Design pending | Archetype-driven: Territory / Govt Sector / Enterprise |
| Pre-Engagement Intelligence (PEI) | 🔴 Design pending | On-demand, Gemini 3.5 Flash + grounding |
| Second Brain | 🔴 Design pending | Weekly domain intelligence, Gemini 3.5 Flash, human review queue |
| Document Studio | 🔴 Design pending | Centralised document generation from Engagement Definition File |
| Google Cloud migration | 🟡 Evaluating | Gemini 3.5 Flash API access to confirm first |

---

## Engagement ID Convention (agreed)

```
ENG-[YEAR]-[SECTOR-CODE]-[SEQUENCE]
e.g. ENG-2026-DEF-0042
     ENG-2026-GEO-0001
```
- Independent of CRM ID — not all engagements become sales opportunities
- If converted to RAC opportunity, ENG-ID carried as reference field

---

## Pending Items

| Item | Status |
|---|---|
| Portal `index.html` — AI Centre Builder registered | ✅ Done |
| RAC Tool PPTX + XLSX export testing | 🟡 Pending test by Arvind |
| Deal Analysis pending updates | ⏸ Deferred |
| Masthead alignment across all tools | 🟡 Needs desktop check |
| GDrive ↔ GitHub sync + housekeeping | 🔴 Not done |
| Engagement architecture design | 🔴 Not started |
| Second Brain pilot (Gemini 3.5 Flash) | 🔴 Not started |
| `tool-features.md` v1.1 | 🔴 Not updated |
| Solution Presentation PPTX (Portfolio Portal) | ⏸ On hold |
| Territory map in AI Centre Builder | ⏸ Phase 2 |
| Territory groupings in AI Centre Builder | ⏸ Phase 2 |

---

## Google Drive Structure

```
📁 AI Portal (root)
  📁 01 - Sales Enablement
      📁 AI Portfolio Deck
  📁 02 - Opportunity Management
      📁 Sales Qualification Tool
      📁 Deal Analysis Tool
  📁 03 - Presales
      📁 Sovereign AI Platform
      📁 AI Inferencing Factory
      📁 GeoAI Civilian + MDoNER
      📁 GeoAI Military
      📁 COMPASS
  📁 04 - Business Operations Management
      📁 HPC Monitoring
      📁 AI Sovereignty Index
```

---

## Session Checklist

- [ ] Confirm files uploaded (activator, project definition, tool file, playbook)
- [ ] State active project name and stage if project definition uploaded
- [ ] Read `blacklist-whitelist.md` before generating any customer-facing content
- [ ] Reference relevant standards files before building anything
- [ ] Confirm task before proceeding

---

*End of ATLAS Session Activator v1.2*
