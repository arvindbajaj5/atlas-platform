# ATLAS Claude Session Activator
# Version: 2.7 | Last Updated: 2026-06-03

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.
**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Platform Overview

**ATLAS** (AI Transaction and Lifecycle Architecture Suite) — internal sales, presales and operations portal.
- **URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Stack:** GitHub Pages + Supabase + Multi-provider AI (7 providers)

---

## Tool Registry

| Tool | Version | Status | Path |
|---|---|---|---|
| Second Brain | v2.2 | ✅ Live | `tools/second-brain/` |
| Customer Intelligence (PEI) | v0.3 | ✅ Live (83KB) | `tools/pei-tool/` |
| Intelligence Scraper | v2.0 | ⏸ Paused (fidelity issues) | `tools/intelligence-scraper/` |
| Engagement Docket | v2.0 | ✅ Live (115KB) | `tools/engagement-docket/` |
| Domain Configurator | v3.0 | ✅ Live | `tools/domain-configurator/` |
| Inferencing Factory | v2.3 | ✅ Live (288KB) | `tools/inferencing-factory/` |
| Benchmark Tool | v1.0 | ✅ Live | `tools/benchmark-tool/` |
| RAC Tool | v2.0 | ✅ Live | `tools/rac-tool/` |
| Deal Analysis Tool | v1.0 | ✅ Live | `tools/deal-analysis/` |
| HPC Monitoring | v1.0 | ✅ Live | `tools/hpc-monitoring/` |
| COMPASS | v2.0 | ✅ Live | `tools/compass-v2/` |
| AI Centre Builder | v1.1 | ⚠️ Legacy | `tools/ai-centre-builder/` |
| `claude-session-activator.md` | v2.7 | ✅ This file | `standards/` |

---

## Portal Navigation

```
01 · Intelligence    Second Brain, PEI (scraper paused)
02 · Engagement      Engagement Docket only
03 · Pre-Sales       Domain Configurator, Inferencing Factory, Benchmark
04 · Sales           RAC Pipeline, Deal Analysis
05 · Operations      HPC Monitoring, COMPASS
```

---

## CRITICAL — thinkingConfig Rule

NEVER add `thinkingConfig:{thinkingBudget:0}` to Gemini API calls.
Only valid for `-thinking` model variants. Causes 400 errors on all standard models including `gemini-3.1-flash-lite`.
Also kills search grounding if present on grounded calls.

---

## Engagement Docket v2.0 — Key Facts

**Architecture:** `customers → engagements → engagement_dockets → docket_items`

**Archetypes:** `tsap` | `govt_sectorial` | `enterprise` | `defence`

**All 7 modals in static HTML** — never create dynamically:
contactModal, tsapModal, newCustomerModal, newEngagementModal, addItemModal, portfolioMapModal, newTxnModal

**Working:** Customer directory, contacts, elevation, docket items (11 types), portfolio map, TSAP config (4 tabs), AI Enrich, Vision Doc, My Action Docket, Export (.txt), PEI → Add to Docket trigger

**Pending next iteration:**
- Second Brain → Add to Docket
- UC acceptance → Add to Docket
- Inferencing Factory → Add to Docket (solution config connection)
- Recommendation Engine enhancements (see sprint plan below)
- TSAP territory map (GeoJSON/Leaflet)
- Full .docx export

---

## Portfolio Catalogue — Finalized Taxonomy

```
L1     L1-TSAP    Territory Sovereign AI Programme (flagship)
L1.1   L1.1-TSAP  AI Skills & Workforce Development (partner-led, population-scale)
L1.2   L1.2-TSAP  Startup & Innovation Ecosystem (partner-led)
L1.3   L1.3-TSAP  Data Governance & Sovereign Data (partner-led)
L1.4   L1.4-TSAP  Research & Academic Partnership (partner-led)
L1.5   L1.5-TSAP  AI Policy, Regulation & Governance (partner-led)

L2     L2-GIB     GenAI-in-a-Box (turnkey appliance, 4-8 GPUs, PoC/pilot)
L2     L2-AIF     Multi-Purpose AI Factory (converged training + inference + storage)
L2     L2-INF     Purpose-Built Inferencing Factory ← FULL SOLUTION (see below)
L2.1   L2.1-INF   GeoAI Inferencing Factory (EO/geospatial domain pack)
L2.2   L2.2-INF   Defence AI Inferencing Factory (air-gapped, MIL-SPEC)
L2.3   L2.3-INF   Health AI Inferencing Factory (DICOM/FHIR, clinical)
L2.4   L2.4-INF   FinAI Inferencing Factory (fraud, AML, RBI compliance)
L2     L2-TRC     GPU Training Cluster (HPC-class model training)
L2     L2-HPC     HPC Cluster (scientific compute)
L2     L2-EDG     Edge AI Node (field-deployed, air-gappable)
L2     L2-MDC     Modular Datacenter (physical container — see MDC sizing below)

L3     L3-*       23 Lifecycle Services (V5 — 5 journey stages)
```

**Key rules:**
- `level_code` NOT unique — multiple items share `L2`, `L3`. `code` IS unique.
- `partner_led = true` for all L1.x.
- L2.x items = same full solution as L2-INF but pre-configured with domain pack.
- L2-GIB is missing from current portfolio_catalogue SQL — needs INSERT.
- L2-AIF rename from "AI Factory" to "Multi-Purpose AI Factory" pending in catalogue.

---

## Inferencing Factory — Full Solution Definition

**L2-INF is NOT just hardware sizing.** It is a complete solution configurator.
The live tool (`tools/inferencing-factory/`) has these sections:

```
1. Strategy          Inferencing Factory vs Generic AI Factory comparison
2. Workload Config   Use case → GPU mapping, per-workload sizing cards
3. Project Scope     Full solution scope from Domain Configurator JSON
4. Tokenomics        On-prem cost/token vs cloud, total AI value over contract
5. Architecture      HA/DR config, load balancing, security layer
6. Performance       SLA, latency, throughput modelling
7. BOM & Sizing      GPUs, CPUs, NICs, storage, racks, cables
8. Edge Deployment   Remote/tactical node sizing
9. Scenarios         HA multiplier, config variants
10. Report Generator Full Word document output (cover → exec summary → 
                     workloads → architecture → tokenomics → BOM → 
                     power/cooling → SLA/HA)
11. Parameters       Global settings (GPU type, quantization, serving engine)
```

Also includes: **manpower sizing** over contract duration (infra ops, MLOps, security, support roles).

**L2.x variants** = same tool, launched with domain pack pre-loaded (same as Domain Configurator domain packs).

---

## DC Layer — Foundation of Every L2 Solution

Every L2 building block needs a physical home. The DC decision is the first question:

| Option | Description | Lead Time | Best For |
|---|---|---|---|
| Brick & Mortar (B&M) | Customer's existing DC or new-build | 18–30 months (new build) | Permanent national hub, existing DC available |
| Modular DC (MDC) | Our L2-MDC — pre-engineered, DLC integrated | 8–14 months | Rapid deployment, phased scale, no existing DC |

**For TSAP specifically:** MDC is a strong pitch — operational in 14 months vs 30 months for new-build B&M, which is within an election cycle.

**DC type feeds tokenomics:** DC type → PUE → cost per token → on-prem vs cloud comparison.

---

## MDC T-Shirt Sizing (per site)

T-shirt size applies **per site** — most TSAPs will have multiple sites for socio-political reasons (every district/region wants inclusion). Phasing allows a rollout narrative across the electoral cycle.

| Size | IT Capacity | Containers (approx) | GPUs (approx) | Tokens/day (approx) | Typical positioning |
|---|---|---|---|---|---|
| XS | ≤2 MW | 1 | 64–128 | 500M–1B | District AI node, pilot, edge hub |
| S | 5 MW | 2–3 | 256–512 | 2–5B | City-level AI centre, departmental cluster |
| M | 10 MW | 4–6 | 512–1,024 | 5–10B | State AI hub, sectoral inferencing factory |
| L | 15 MW | 6–8 | 1,024–1,536 | 10–15B | Large state flagship, multi-domain TSAP |
| XL | 20 MW | 8–12 | 1,536–2,048+ | 15–25B | National-scale or multi-state programme |

**Strategic logic:** T-shirt sizing creates aspirational comparison between states. Once one state announces an M-class programme, neighbouring states face political pressure to match or exceed. The naming is familiar (like cloud instance sizing), non-threatening to start small, with XL as an aspirational target.

**Multi-site TSAP example:**
```
HP TSAP (example):
  Site 1 — Kangra (primary):   M  = 10 MW  (flagship hub, training + inference)
  Site 2 — Bilaspur (DR):      XS = 2 MW   (DR + healthcare AI)
  Site 3 — Chamba (edge):      XS = 2 MW   (GeoAI + tribal language AI)
  Total programme:             14 MW across 3 sites
  Headline: "14 MW Territory Sovereign AI Programme — 3 sites, Phase 1"
```

Total programme MW = sum of all site capacities = the headline announcement number.

**TSAP Building Blocks tab** (next iteration) should show:
- DC type selector (B&M or MDC per site)
- If MDC: site name + location + T-shirt size (XS/S/M/L/XL)
- Add/remove sites
- Auto-calculated: total programme MW, total containers, total racks
- Headline generator: "X MW Territory AI Programme across Y sites"

---

## Next Sprint Plan — Full Engagement Flow

### Sprint 1 — Connect Intelligence Layer
- Wire Second Brain → Add to Docket (intel items + sales actions)
- Wire UC acceptance → Add to Docket
- Enhance TSAP AI Enrich: pull Second Brain intel + UC Library (not just web search)

### Sprint 2 — Fix Recommendation Engine
- Read docket items already added (intel, UCs) as signals
- Switch output scope by archetype:
  - TSAP: full L1-TSAP + L1.x + L2 blocks + L3 services
  - Govt/sectorial: L2 blocks + L3 services
  - Enterprise: L2 blocks + L3 services
  - Defence: L2.2-INF + L2-EDG + L3-SEC
- Make Recommend button visible in engagement header
- Upsell mode for existing won accounts

### Sprint 3 — Inferencing Factory → Docket Connection
- Portfolio Map: selecting L2-INF or L2.x-INF opens DC Decision modal (B&M or MDC)
- If MDC: T-shirt size selector (XS/S/M/L/XL) per site + multi-site support
- Opens Inferencing Factory tool pre-loaded with engagement context (customer, domain, UCs from docket)
- Inferencing Factory output saves back to docket:
  - `solution` item (full config JSON)
  - `bom` item (hardware BOM)
  - `pricing` item (tokenomics + deal value)
- L2-MDC automatically added to solution items when MDC selected

### Sprint 4 — Output Documents
- **Pitch Report** (TSAP): structured boardroom document
  - Territory context + opportunity
  - Problem statement (from PEI)
  - Programme proposition (L1-TSAP + L1.x + L2 blocks by site with T-shirt sizes)
  - Use case showcase (top 5-8 from UC Library)
  - Economic impact (jobs, GDP, startups, MW headline number)
  - Financial model summary (financing options + build cost)
  - Implementation roadmap (phased by site)
  - Call to action
- **Solution Brief** (govt/sectorial/enterprise): lighter version
- Vision Document: already built — improve to pull from docket content

### Sprint 5 — Catalogue + SQL Updates
- Add L2-GIB to portfolio_catalogue
- Rename L2-AIF to "Multi-Purpose AI Factory"
- Add MDC T-shirt sizes as configuration parameters (not separate catalogue entries)
- Fix archetype CHECK constraint if needed

---

## Supabase Tables

| Table | Status |
|---|---|
| `intelligence_items` | ✅ Live |
| `uc_queue`, `uc_library` | ✅ Live |
| `sales_actions` | ✅ Live |
| `engagement_dockets` | ✅ Live — has customer_id, engagement_id |
| `docket_items` | ✅ Live |
| `customers` | ✅ Created (schema v2.1) |
| `engagements` | ✅ Created — archetype CHECK includes 'tsap' |
| `transactions` | ✅ Created |
| `portfolio_catalogue` | ✅ Created — seeded 34 items. L2-GIB missing. |
| `l1_configurations` | ✅ Created |

---

## Intelligence Scraper Status

**Paused** — GitHub Actions disabled (daily failures).
Root causes: `xml2js` not installed in workflow, `gemini-3.5-flash` thinking model splits response parts.
Fix ready but deferred until fidelity issues resolved.
To re-enable: fix workflow (add `xml2js`), fix parts[] concat, fix date gate.

---

## Current Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Upload docket + PEI from laptop (pending since yesterday) | 🔴 Now |
| 2 | Test PEI end-to-end after v0.3 upload | 🔴 Now |
| 3 | Test docket — customer, engagement, contacts, TSAP config | 🔴 Now |
| 4 | Sprint 1 — Second Brain → Add to Docket | 🟡 Next |
| 5 | Sprint 2 — Recommendation Engine enhancements | 🟡 Next |
| 6 | Sprint 3 — Inferencing Factory → Docket + DC/MDC decision | 🟡 Next |
| 7 | Sprint 4 — Pitch Report generator | 🟡 Next |
| 8 | Sprint 5 — Portfolio catalogue updates (L2-GIB, MDC sizes) | 🟡 Next |
| 9 | TSAP Building Blocks tab — MDC multi-site + T-shirt sizing UI | 🟡 Next |
| 10 | Intelligence scraper fidelity fixes | ⬜ Later |
| 11 | TSAP territory map (GeoJSON/Leaflet) | ⬜ Later |
| 12 | Full .docx export for docket | ⬜ Later |
| 13 | GCP billing investigation | 🟡 Soon |
