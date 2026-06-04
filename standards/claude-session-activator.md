# ATLAS Claude Session Activator
# Version: 3.2 | Last Updated: 2026-06-03

---

## Session Start Instructions

At the start of any ATLAS session, load this file to restore full context.
**Sovereign AI Platform sessions:** Upload `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief → confirm loaded before proceeding.

---

## Strategic Positioning

**ATLAS is a Strategy & Consulting Enablement Platform** — used with the customer in boardrooms and workshops, not just as a salesperson's backend.

**Customer-facing intent:** A Chief Secretary, state IT Secretary, or ministry decision maker works through ATLAS with the presales team. The Pitch Report / ROM package is generated in the room.

**What stays in ATLAS:**
Intelligence → Analysis & Recommendation → Programme Design → Financial Modelling → Sign-off Package

**What moves out (separate tools):**
- RAC Tool + Deal Analysis → Commercial/Deals tool (internal)
- HPC Monitoring → Ops tool
- COMPASS → Delivery tool

---

## ATLAS — Core Architecture

```
INTELLIGENCE LAYER
  Second Brain          Market signals, domain intel, competitor data
  PEI Tool              Customer/organisation intelligence brief
        ↓
ANALYSIS & RECOMMENDATION
  Recommendation Engine    Portfolio fit by archetype + docket signals
  Territory Profiler       10-dimension profile → reference archetypes → playbook
        ↓
DESIGN & CONFIGURATION
  AI Centre Builder        The core flow — programme design for any sovereign AI deployment
  AI Centre Configurator   The modelling engine (see full stack below)
        ↓
FINANCIAL MODELLING
  Financing Navigator      Profile-based financing model routing
  Tokenomics               On-prem vs cloud, total AI value over contract
  Economic Impact          Jobs, GDP, investment multiplier
        ↓
SIGN-OFF PACKAGE
  BOM                      Hardware + software bill of materials
  ROM                      Rough order of magnitude — cost with confidence range + assumptions
  Pitch Report             Boardroom-ready document generated in the room
  Solution Brief           Lighter version for sectorial/enterprise
```

---

## AI Centre Builder — The Core Flow

**Works for any sovereign AI deployment:** territory, ministry, defence command, enterprise.
Questions adapt by archetype but flow is consistent.

```
Step 1  Who are you?
        Territory/org profile — from PEI + Territory Profiler
        Archetype: territory_coe / govt_sectorial / defence / enterprise

Step 2  What do you need?
        Use cases, domains, workloads — from UC Library + Recommendation Engine
        UC → workload mapping (tokens/day, latency SLA, batch vs real-time)

Step 3  Where will it live?
        DC type: B&M (existing / new-build) or MDC
        Sites: number, location, T-shirt size (XS/S/M/L/XL) per site
        Total programme MW = sum of all sites = headline announcement number

Step 4  Full stack configuration
        → AI Centre Configurator (see below)

Step 5  Financial modelling
        → Financing Navigator + Tokenomics + Economic Impact

Step 6  Sign-off package
        → BOM + ROM + Pitch Report
```

---

## AI Centre Configurator — Full Stack Model

**Replaces "Inferencing Factory" (too narrow — inference only)**
**New name: AI Centre Configurator**

Models a full production-grade sovereign AI environment across all layers:

### Infrastructure Layer
- Physical / virtual DC (B&M or MDC, T-shirt sized per site)
- Power capacity, cooling type (DLC / air / hybrid), PUE
- Physical security, perimeter

### Compute Layer
- GPU clusters — training workloads (large-scale model training)
- GPU clusters — inference workloads (high-volume, domain-specific)
- CPU servers (AMD EPYC — AI platform, orchestration, control plane)
- Edge nodes (if field-deployed / air-gappable)

### Storage Layer
- NVMe all-flash (hot tier — model weights, active datasets, checkpoints)
- High-capacity SSD / NL-SAS (warm tier — training data, logs, telemetry)
- Object storage (cold tier — archival, model registry, long-term datasets)
- Parallel file system (Lustre / GPFS — high-throughput training I/O)
- Storage networking: NVMe-oF / iSCSI / FC fabric
- Capacity sizing per workload (training checkpoint size, inference model cache, dataset volumes)
- Data protection: RAID, replication, snapshots
- Backup target (DR copy of critical datasets and model artefacts)

### Networking Layer ← CRITICAL, often underestimated
- East-West fabric: InfiniBand (NDR/HDR) for GPU-to-GPU within training cluster
- East-West fabric: 100/200GbE for inference cluster and storage
- North-South: 100GbE uplinks, spine-leaf architecture
- Proprietary network stack: NKC switches (our stack)
- Out-of-band management network
- Air-gap network boundary (if defence/classified)
- Latency and bandwidth sizing per UC workload

### Platform Layer
- AI platform software: Data Fusion, RAG, model registry, APIs, gateways, guardrails
- MLOps stack: experiment tracking, model versioning, pipeline orchestration
- Private cloud software (OpenStack / VMware / Kubernetes)
- Public/hybrid cloud connectors (if applicable)
- Observability: monitoring, logging, alerting

### Security & Compliance Layer
- Zero-trust architecture
- Air-gap configuration (defence / classified workloads)
- Data governance framework (DPDP Act 2023 compliance)
- SIEM, threat detection, SOC integration
- Audit trails, access control, identity management
- Encryption at rest and in transit

### Resilience Layer
- Load balancing (inference traffic distribution)
- High Availability (HA) configuration — active-active / active-passive
- Disaster Recovery (DR) site — RTO/RPO targets
- Automated failover
- Backup and recovery

### Data & Integration Layer
- Data ingestion pipelines (source system connectors)
- Data lake / warehouse architecture
- ETL/ELT effort estimation
- Data quality and lineage
- Integration with existing government systems

### Use Case Development Layer
- UC development effort (person-months per UC, by complexity)
- Domain-specific model fine-tuning effort
- Application integration effort
- Testing and validation effort
- UC deployment pipeline

### Skills & Operations Layer
- AI workforce development programme sizing
- MLOps team sizing (infra ops, model ops, data engineering)
- Managed services scope (if SI-operated)
- Training curriculum and delivery model
- Ongoing ops cost (year 1-5)

### Output: BOM + ROM
- **BOM** — detailed hardware + software bill of materials with unit costs
- **ROM** — rough order of magnitude total programme cost
  - CapEx (hardware, DC build/MDC, integration, UC development)
  - OpEx (power, cooling, staffing, licensing, managed services)
  - Confidence range (±15% / ±25% / ±35% depending on design maturity)
  - Key assumptions listed explicitly
  - 5-year TCO
  - Tokenomics: on-prem cost/token vs cloud equivalent
  - Total AI value over contract lifetime

---

## Territory AI Programme Profiler — Design Spec

**Inspired by:** Atlas of Innovation (atlasofinnovation.org)
**Language:** "Territory" not "State" throughout

**10 profile dimensions:**
1. Fiscal capacity (single: Strong / Moderate / Constrained)
2. Political mandate + timeline (single: Flagship election cycle / Central scheme / Long-term)
3. Ownership preference (single: Full territory / PPP / Hybrid)
4. DC readiness (single: Existing DC / Greenfield / Colocation)
5. Data sensitivity (single: Standard / Sensitive / Air-gapped/Classified)
6. Central scheme alignment (CHECKLIST: IndiaAI / NM-ICPS / Smart Cities / DONER / PM-WANI / None)
7. Programme scale (single: XS / S / M / L / XL — T-shirt)
8. Implementation urgency (single: Within 1 year / 2-3 years / 5+ years)
9. Stakeholder landscape (single: Single DM / Coalition / Multi-level bureaucratic)
10. Existing AI maturity (single: None / Pilots / Some production / Mature)

**Output:**
- Radar/spider chart across all 10 dimensions
- Matched reference archetype (4 pre-built profiles):
  - HP Glacial Hub — constrained fiscal, hydel power, small population
  - Maharashtra Industrial — strong fiscal, large enterprise base, PPP-ready
  - Northeast Strategic — central grant, DONER-funded, strategic importance
  - Union Territory Digital — central control, high funding, small geography
- Financing model recommendation
- Actions playbook + challenges per matched profile
- Radar overlay: your profile vs reference archetype
- Saves as `pricing` docket item

---

## Visualisations Planned (later)

- Territory map (GeoJSON/Leaflet) — sites with T-shirt labels
- Radar chart — Territory Profiler + archetype overlay
- Tokenomics chart — on-prem vs cloud cost curves
- Economic impact — jobs/GDP waterfall
- Programme roadmap — phased site delivery timeline
- Network topology diagram — E-W / N-S fabric

---

## Platform URL & Stack

- **URL:** https://arvindbajaj5.github.io/atlas-platform/
- **Stack:** GitHub Pages + Supabase (RLS disabled) + Multi-provider AI

---

## Tool Registry

| Tool | Version | Status | Notes |
|---|---|---|---|
| Second Brain | v2.3 | ✅ Live | |
| PEI Tool | v0.4 | ✅ Live | Load Saved JSON added |
| Intelligence Scraper | v2.1 | ⏸ Paused | Fixed, test before re-enabling |
| Engagement Docket | v2.2 | ✅ Live | Sprint 1+2 complete |
| Inferencing Factory | v2.3 | ✅ Live | → becomes AI Centre Configurator engine |
| Domain Configurator | v3.0 | ✅ Live | |
| Benchmark Tool | v1.0 | ✅ Live | |
| RAC Tool | v2.0 | ⚠️ Moving out | → Commercial/Deals tool |
| Deal Analysis | v1.0 | ⚠️ Moving out | → Commercial/Deals tool |
| HPC Monitoring | v1.0 | ⚠️ Moving out | → Ops tool |
| COMPASS | v2.0 | ⚠️ Moving out | → Delivery tool |

---

## Supabase — Critical Notes

**RLS disabled on ALL tables:**
```sql
ALTER TABLE engagements DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_dockets DISABLE ROW LEVEL SECURITY;
ALTER TABLE docket_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE l1_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_catalogue DISABLE ROW LEVEL SECURITY;
ALTER TABLE uc_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE uc_library DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_items DISABLE ROW LEVEL SECURITY;
```

**Engagements archetype:** `territory_coe` | `govt_sectorial` | `enterprise` | `defence`
TSAP Configure button shows only for `territory_coe`.

---

## CRITICAL — thinkingConfig

NEVER add `thinkingConfig:{thinkingBudget:0}` to Gemini calls.

---

## CRITICAL — Key Resolution Pattern

```javascript
var g = atlasGetGlobal()
var model = atlasGetTaskModel('task_id') || 'gemini-3.1-flash-lite'
var key = atlasGetKeyForModel(model) || g.key_gemini || g.key_anthropic || g.key_openai || ''
if(!atlasGetKeyForModel(model) && key){
  if(g.key_gemini) model = 'gemini-3.1-flash-lite'
  else if(g.key_anthropic) model = 'claude-haiku-4-5-20251001'
}
```

---

## Portfolio Catalogue

```
L1     L1-TSAP    Territory Sovereign AI Programme
L1.1-L1.5         Programme components (partner-led)
L2     L2-GIB     GenAI-in-a-Box ✅
L2     L2-AIF     Multi-Purpose AI Factory ✅
L2     L2-INF     Purpose-Built AI Centre (was: Inferencing Factory) ← rename pending
L2.1   L2.1-INF   GeoAI AI Centre
L2.2   L2.2-INF   Defence AI Centre (air-gapped, MIL-SPEC)
L2.3   L2.3-INF   Health AI Centre (DICOM/FHIR)
L2.4   L2.4-INF   FinAI Centre (fraud, AML, RBI)
L2     L2-TRC     GPU Training Cluster
L2     L2-HPC     HPC Cluster
L2     L2-EDG     Edge AI Node
L2     L2-MDC     Modular Datacenter
L3     L3-*       23 Lifecycle Services
```

Note: L2-INF and L2.x-INF codes pending rename decision — "INF" suffix is now misleading.
Consider: L2-AIC (AI Centre) or L2-SOV (Sovereign AI Centre)

---

## MDC T-Shirt Sizing (per site)

| Size | Capacity | GPUs | Tokens/day | Use |
|---|---|---|---|---|
| XS | ≤2 MW | 64–128 | 500M–1B | District node, pilot |
| S | 5 MW | 256–512 | 2–5B | City-level |
| M | 10 MW | 512–1,024 | 5–10B | Territory hub |
| L | 15 MW | 1,024–1,536 | 10–15B | Large territory flagship |
| XL | 20 MW | 1,536–2,048+ | 15–25B | National/multi-territory |

T-shirt = per site. Total programme MW = headline number.

---

## Sprint Plan (Revised)

### Sprint 3 — AI Centre Configurator Foundations (next laptop session)
- Rename Inferencing Factory → AI Centre Configurator in UI + nav
- DC Decision modal: B&M or MDC, T-shirt + multi-site
- Add networking layer to configurator (E-W InfiniBand, N-S 100GbE, NKC switches)
- Add data integration + UC development + skills layer to configurator
- ROM output alongside BOM (CapEx + OpEx + confidence range + assumptions)
- Saves to docket: solution, bom, pricing items

### Sprint 4 — AI Centre Builder v1 + Territory Profiler
- Territory AI Programme Profiler (10 dims, radar, 4 archetypes, playbook)
- Financing Navigator wired into profiler
- Economic impact model
- Pitch Report / ROM package generator (produced in the room)
- Unified AI Centre Builder flow

### Sprint 5 — Polish + Visualisations
- Territory map, radar chart, tokenomics chart
- UX pass on Engagement Docket
- Portfolio catalogue rename (L2-INF → L2-AIC or similar)
- MDC multi-site UI

---

## Pending Items

| # | Item | Priority |
|---|---|---|
| 1 | Sprint 3 — AI Centre Configurator foundations | 🟡 Next laptop session |
| 2 | Portfolio code rename: L2-INF → L2-AIC (pending decision) | 🟡 Decide before Sprint 3 |
| 3 | Sprint 4 — Territory Profiler + Pitch Report + AI Centre Builder v1 | 🟡 Next |
| 4 | Re-enable intelligence scraper (test manually first) | 🟡 Soon |
| 5 | GCP billing investigation | 🟡 Soon |
| 6 | Sprint 5 — UX pass + visualisations | ⬜ Later |
| 7 | Brand.md + hardware-preferences.md | ⬜ After hardware decisions finalised |

---

## Notes for Phone-Based Sessions (next 3-4 days)

Good phone tasks:
- Decide portfolio code rename (L2-INF → what?)
- Define 4 reference archetypes in detail for Territory Profiler
- Pitch Report section-by-section outline
- AI Centre Configurator layer-by-layer spec (what questions per layer)
- Sprint 3 L&F design mockup
