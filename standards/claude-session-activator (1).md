# claude-session-activator.md
# ATLAS Claude Session Activator
# Version: 1.1 | Last Updated: 2026-05-16

---

## Purpose

This file is uploaded at the start of any ATLAS working session to give Claude the full platform context needed to work effectively. Upload this file alongside any relevant project definition file or tool file at the beginning of each session.

**On loading this file, Claude should confirm:**
> *"ATLAS Session Activator v1.0 loaded. [Describe what else was uploaded, e.g. 'Project Definition: MDoNER GeoAI loaded. Ready to proceed.']"*

---

## Platform Identity

- **Platform:** ATLAS — AI Transaction and Lifecycle Architecture Suite
- **OEM:** [OEM_NAME] (placeholder)
- **Stack:** GitHub Pages (hosting) + Google Drive (file storage) + Supabase (database + auth)
- **Repo base URL:** `https://[username].github.io/atlas-platform/`

---

## Role Context

| Role | Access |
|---|---|
| **Business Head** | Full access to all tools, Settings, portal admin |
| **Sales & Sales Support** | Portfolio Portal, RAC Pipeline, Deal Analysis, RAC Tool exports |
| **Pre-Sales** | Domain Configurator, Inferencing Factory, Vision Document, Benchmark, AI Sovereignty Index, COMPASS |
| **Operations** | HPC Monitoring, read access to project outputs |

---

## Active Tool Set

Refer to `tool-features.md` for full tool inventory. Quick reference:

| Tool | Status | Path |
|---|---|---|
| Portal | ✅ Live | `index.html` |
| Portfolio Portal | ✅ Live | `tools/portfolio-portal/` |
| RAC Pipeline v2.0 | ✅ Live | `tools/rac-tool/` |
| Domain Configurator v3 | ✅ Live | `tools/domain-configurator/` |
| Inferencing Factory v2.2 | ✅ Live | `tools/inferencing-factory/` |
| Deal Analysis | ✅ Live | `tools/deal-analysis/` |
| Vision Document Factory | ✅ Live | `tools/vision-document/` |
| Benchmark Tool | ✅ Live | `tools/benchmark-tool/` |
| AI Sovereignty Index v2.1 | ✅ Live | `tools/ai-sovereignty-index/` |
| COMPASS v2.0 | ✅ Live | `tools/compass/` |
| HPC Monitoring | ✅ Live | `tools/hpc-monitoring/` |

---

## Standards Files

The following `.md` files define platform standards. Reference them when building or updating tools:

| File | Purpose |
|---|---|
| `brand.md` | Colours, typography, CSS variables, tone |
| `architecture-tiers.md` | Tier 1–4 definitions, topology, deployment rules |
| `hardware-preferences.md` | GPU/compute/storage/networking/cooling preferences and BOM rules |
| `project-definition-schema.md` | Project Definition File JSON schema and field rules |
| `tool-features.md` | Tool inventory, features, status, role access |
| `claude-session-activator.md` | This file |

---

## Session Behaviour Rules

### When building or modifying a tool:
1. Read `brand.md` first — apply correct colours, fonts, CSS variables
2. Read `architecture-tiers.md` if the tool involves hardware sizing or deployment
3. Read `hardware-preferences.md` if the tool involves BOM generation or GPU sizing
4. Read `tool-features.md` to understand where the tool fits and what it must connect to
5. Never break existing functionality — additions only unless explicitly told to replace
6. All tools are single-file HTML — no external dependencies except CDN scripts already in use
7. Always output a downloadable file, not just inline code

### When generating documents:
1. Read `project-definition-schema.md` to understand what data is available
2. Use project definition data as the source — do not invent customer details
3. Apply `brand.md` tone guidelines
4. Always add DRAFT watermark on generated documents
5. Match document type to the correct pipeline stage (refer to `tool-features.md`)

### When working with a Project Definition File:
- If a `.json` project definition is uploaded, parse it and confirm: project name, customer, stage, domain, tier, key flags
- If a `.md` project summary is uploaded, read it and confirm the same fields
- Use the project data to pre-populate any tool being built or updated for that engagement

### When the Sovereign AI Platform Playbook is uploaded:
- Read both the Playbook (`Sovereign_AI_Platform_Playbook_v1.0.docx`) and the Project Brief fully before proceeding
- Confirm: *"Playbook v1.0 and [Project name] Brief loaded. Ready to proceed."*

---

## Key Design Principles (for tool building)

- **On-premises first** — never suggest cloud unless explicitly required
- **Single-file HTML** — all tools are self-contained; CSS and JS inline
- **Brand-compliant** — always use `brand.md` palette and Roboto font
- **Role-aware** — tools show/hide features based on role where relevant
- **Data flows downstream** — tools pass data via localStorage or JSON export; never isolated silos
- **Claude API integration** — document generation features use `claude-sonnet-4-20250514`, max_tokens 1500, always add DRAFT watermark
- **No browser storage for artifacts** — use in-memory state; localStorage only for persistence of user data (opportunities, sessions)

---

## CDN Scripts in Use (do not change without checking all tools)

```html
<!-- Charts -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<!-- PPTX generation -->
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"></script>

<!-- Excel generation -->
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

<!-- Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Pending Items (as of 2026-05-16)

| Item | Status |
|---|---|
| RAC Tool PPTX + XLSX export testing | 🟡 Pending test by Arvind |
| Deal Analysis Tool pending updates | ⏸ Deferred — not yet defined |
| Requirements Doc in Domain Configurator | 🔴 Not yet built |
| TAD in Inferencing Factory | ✅ Done (v2.3) |
| Solution Presentation PPTX in Portfolio Portal | ⏸ On hold |
| Second Brain domain files | ⏸ Architecture defined — token strategy discussion pending |
| Domain Configurator v3 | ✅ Done — live at tools/domain-configurator/ |
| Inferencing Factory v2.3 (Services + Manpower + TAD) | ✅ Done |
| AI Sovereignty Index v2.1 (Evaluation Report) | ✅ Done |
| DGCA / Aviation Safety AI domain pack | 🔴 Not yet built |
| Masthead alignment across all tools | 🟡 Needs desktop check |
| GDrive ↔ GitHub sync + housekeeping | 🔴 Manual — not done |
| AI Centre Builder tool | 🔴 Not yet built |
| tool-features.md v1.1 visualisation standards | ⏸ On hold |

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

At the start of every ATLAS session, Claude should:

- [ ] Confirm what files have been uploaded (activator, project definition, tool file, playbook)
- [ ] State the active project name and stage (if a project definition was uploaded)
- [ ] Confirm what task is being worked on
- [ ] Reference relevant standards files before building anything
- [ ] Not proceed with building until context is confirmed

---

*End of ATLAS Session Activator v1.0*
