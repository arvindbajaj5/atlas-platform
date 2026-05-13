# tool-features.md
# ATLAS Tool Features & Inventory
# Version: 1.0 | Last Updated: 2026-05-13

---

## Overview

This file is the canonical reference for all ATLAS tools — what each tool does, its current feature set, status, GitHub path, and Drive location. Use this file to orient Claude at the start of any session involving tool development, updates, or document generation.

---

## Tool Inventory

### 1. ATLAS Portal
**GitHub Path:** `index.html`
**Status:** ✅ Live
**Role:** Business Head, Sales & Sales Support, Pre-Sales, Operations (role-gated)
**Description:** Main launch page for the ATLAS platform. Displays all tools, project library, lifecycle bar, and platform stats. Links to each tool via GitHub Pages URLs.

**Features:**
- Role-gated access (4 roles: Business Head, Sales & Sales Support, Pre-Sales, Operations)
- 8-stage lifecycle bar (Prospect → Renew) with tool-to-stage mapping
- Project library (Supabase-backed)
- Stats bar: projects, opportunities, tools live, coming soon
- Tool launcher with `?project=<id>` context passing
- Company logo upload via Settings (Business Head only), stored as base64
- Engineering To-Do panel
- Settings panel with platform info

---

### 2. Portfolio Portal (AI Portfolio Portal)
**GitHub Path:** `tools/portfolio-portal/index.html`
**Status:** ✅ Live
**Role:** Sales & Sales Support, Business Head
**Description:** Opportunity creation and portfolio item activation tool. Allows sales to define an opportunity and select relevant portfolio items from the 26-item catalogue.

**Features:**
- 26 portfolio items across 5 lifecycle phases (Explore, Pilot, Train, Run, Govern & Scale)
- 2×2 customer segmentation (4 archetypes: Q1–Q4)
- Opportunity creation with customer, segment, complexity
- Portfolio item activation per opportunity
- Export opportunity to RAC pipeline (localStorage handoff)
- Import from/to RAC Tool

---

### 3. RAC Pipeline Tool
**GitHub Path:** `tools/rac-tool/index.html`
**Status:** ✅ Live v2.0
**Role:** Sales & Sales Support, Business Head
**Description:** Revenue, Activity, and Coverage pipeline management tool. Tracks all opportunities through 8 pipeline stages with Kanban, List, and Dashboard views.

**Features:**
- 8-stage pipeline: Prospect → Qualify → Instantiate → Size → Propose → Win → Deliver → Renew
- Kanban, List, and Dashboard views
- Opportunity drawer with stage progress, next actions, portfolio items, activity feed
- Multi-currency support: USD, INR, EUR, GBP, AED, SGD
- Stage-specific next actions with tool deep-links
- Import from Portfolio Portal (localStorage)
- Weighted pipeline value calculation
- Charts: pipeline by stage, by type, by size, by domain
- Vision Doc and COMPASS flags per opportunity
- PPTX and XLSX export *(status: to be tested)*

**Pending:** Export testing (PPTX + XLSX)

---

### 4. Domain Configurator
**GitHub Path:** `tools/domain-configurator/index.html`
**Status:** ✅ Live v2
**Role:** Pre-Sales, Business Head
**Description:** Requirement capture and project definition tool. Outputs a Project Definition File (JSON + MD) consumed by all downstream tools.

**Features:**
- Domain selection (Geospatial, Defence, Enterprise AI, HPC, Sovereign Platform)
- Use case capture (up to 40, with category, priority, model type)
- Persona definition
- Architecture tier selection (Tier 1–4)
- Volumetrics input (users, RPS, tokens, latency SLA, model sizes)
- Commercial parameters (currency, size, channel, procurement route)
- Flag setting (vision doc, COMPASS, air-gap, classified, modular DC)
- Export: JSON project definition file + Markdown summary
- Requirements Document generation *(planned — not yet built)*
- Project Brief generation *(planned — not yet built)*

---

### 5. AI Inferencing Factory
**GitHub Path:** `tools/inferencing-factory/index.html`
**Status:** ✅ Live v2.2
**Role:** Pre-Sales, Business Head
**Description:** Hardware sizing and BOM generation tool for AI inferencing workloads. Domain-aware with 40 pre-loaded NE India GeoAI use cases.

**Features:**
- Workload sizing by use case type (LLM, Vision, Multimodal, Satellite/EO)
- GPU and server BOM generation
- Storage, networking, cooling BOM
- Power and space estimates
- Commercial parameters (margin, currency, AMC)
- GeoAI import (JSON upload of use case set)
- 40 NE India use cases pre-loaded
- PPTX BOM export
- Profiler view
- Technical Architecture Document (TAD) generation *(planned — not yet built)*

---

### 6. Deal Analysis Tool
**GitHub Path:** `tools/deal-analysis/index.html`
**Status:** ✅ Live (as-is; pending updates TBD)
**Role:** Sales & Sales Support, Business Head
**Description:** Full deal lifecycle financial analysis tool for HPC/supercomputer deals.

**Features:**
- 13 tabs: Dashboard, Deal Overview, Channel, Key Financials, Milestones, Cash Flow, Profitability, Penalty, Delivery Planning, Risk Analysis, IFRS 15, Forex, Settings
- Multi-currency (deal, supply, reporting)
- Milestone-based payment schedule (6 cash-in, 10 cash-out)
- Cumulative cash flow chart
- Peak cash requirement, negative cash duration metrics
- What-if penalty scenarios
- IFRS 15 revenue recognition (point-in-time and POC)
- Forex rate projection
- Delivery planning with delay tracking
- BG commission, risk contingency, transport costs
- JSON save/load
- Logo upload via Settings
- PPTX export with cash profile and cash curve
- Sample scenario: $60M deal (DEAL-2026-0042)

**Pending updates:** Not yet defined — deferred.

---

### 7. Vision Document Factory
**GitHub Path:** `tools/vision-document/index.html`
**Status:** ✅ Live
**Role:** Pre-Sales, Business Head
**Description:** Claude API-powered vision document generator. Standalone tool — generates the first document in an engagement, before project definition data exists.

**Features:**
- Customer context input (name, sector, challenge, objectives)
- Domain selection
- Claude API call generating structured vision document
- Sections: Executive Summary, Strategic Context, Vision Statement, Proposed Solution, Benefits, Next Steps
- Export as .txt / copy to clipboard
- Draft watermark

---

### 8. Benchmark Tool
**GitHub Path:** `tools/benchmark-tool/index.html`
**Status:** ✅ Live
**Role:** Pre-Sales, Business Head
**Description:** GPU/hardware performance benchmark reference and comparison tool.

**Features:**
- Benchmark database (reference data)
- GPU performance comparison across model types
- Throughput, latency, and power efficiency metrics
- Filter by model size, GPU class, workload type

---

### 9. AI Sovereignty Index
**GitHub Path:** `tools/ai-sovereignty-index/index.html`
**Status:** ✅ Live v2.1
**Role:** Pre-Sales, Business Head
**Description:** Strategic evaluation tool scoring AI proposals across Sovereignty (ASI), Supremacy (API), and Platform Vitality (PVS) over a 6-year lifecycle.

**Features:**
- LASI composite scoring (weighted: Y1=10%, Y3=30%, Y6=60%)
- Three dimensions: ASI (40%), API (40%), PVS (20%)
- Year 1, 3, 6 scoring inputs per dimension
- Strategic Growth Vector (bubble chart with trajectory arrows)
- Dimension Radar chart (Y1/Y3/Y6 overlay)
- Multi-proposal comparison table (ranked by LASI)
- Classifications: Strategic Champion, Secure Niche, Tactical Dependency, Standard Market
- Session save/load (JSON)
- PPTX export
- XLSX export
- **Evaluation Report** (Claude API — generates 600–800 word strategic report with Executive Summary, Positioning, Trajectory, Risks, Recommendations, Investment Verdict)

---

### 10. COMPASS
**GitHub Path:** `tools/compass/index.html`
**Status:** ✅ Live v2.0
**Role:** Pre-Sales, Business Head
**Description:** Token governance, workload scheduling, and latency OLA framework tool for Sovereign AI Platform engagements.

**Features:**
- Token governance framework
- Workload scheduling model
- Latency OLA definition
- National metrics reporting framework
- Hub-spoke-edge architecture reference
- Indigo sub-brand palette

---

### 11. HPC Monitoring
**GitHub Path:** `tools/hpc-monitoring/index.html`
**Status:** ✅ Live
**Role:** Operations, Business Head
**Description:** Live cluster performance monitoring dashboard.

**Features:**
- GPU utilisation, memory, temperature monitoring
- Job queue status
- Node health overview
- Alert indicators

---

## Planned / Not Yet Built

| Tool | Description | Priority |
|---|---|---|
| Requirements Document (in Domain Configurator) | Auto-generate requirements doc from project definition | Medium |
| Project Brief (in Domain Configurator) | Auto-generate project brief from project definition | Medium |
| TAD (in Inferencing Factory) | Technical Architecture Document from BOM | Medium |
| Solution Presentation PPTX (in Portfolio Portal) | Customer-facing solution deck | On Hold |
| Second Brain domain files | geospatial.md, defence.md, enterprise.md | Medium |
| tool-features.md v1.1 | Visualisation standards update | Low |

---

## GitHub Pages URL Convention

Base URL: `https://[username].github.io/atlas-platform/`

| Tool | URL Path |
|---|---|
| Portal | `/` |
| Portfolio Portal | `/tools/portfolio-portal/` |
| RAC Pipeline | `/tools/rac-tool/` |
| Domain Configurator | `/tools/domain-configurator/` |
| Inferencing Factory | `/tools/inferencing-factory/` |
| Deal Analysis | `/tools/deal-analysis/` |
| Vision Document | `/tools/vision-document/` |
| Benchmark Tool | `/tools/benchmark-tool/` |
| AI Sovereignty Index | `/tools/ai-sovereignty-index/` |
| COMPASS | `/tools/compass/` |
| HPC Monitoring | `/tools/hpc-monitoring/` |

---

## Role Access Matrix

| Tool | Business Head | Sales & Sales Support | Pre-Sales | Operations |
|---|---|---|---|---|
| Portal | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Portfolio Portal | ✅ | ✅ | — | — |
| RAC Pipeline | ✅ | ✅ | Read | — |
| Domain Configurator | ✅ | — | ✅ | — |
| Inferencing Factory | ✅ | — | ✅ | — |
| Deal Analysis | ✅ | ✅ | — | Read |
| Vision Document | ✅ | — | ✅ | — |
| Benchmark Tool | ✅ | — | ✅ | — |
| AI Sovereignty Index | ✅ | — | ✅ | — |
| COMPASS | ✅ | — | ✅ | — |
| HPC Monitoring | ✅ | — | — | ✅ |
