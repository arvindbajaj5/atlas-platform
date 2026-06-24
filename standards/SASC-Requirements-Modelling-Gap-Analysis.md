# SASC — Requirements, Modelling Design & Implementation Gap Analysis
**Version:** 2.0 | **Date:** 2026-06-24 | **Source:** June 23 design session + current build state

---

## 0. How to Use This Document

This is the living requirements and gap register for the SASC tool and everything it connects to (Docket, TSAP FM). At the start of every build session, read Section 5 (Gap Register) to know what's confirmed-designed but not yet built. Update it as things get built or decisions change. The spec in Sections 1–4 is locked unless explicitly revised.

---

## 1. What We Are Modelling — The Full Chain

SASC is not a compute sizing tool. It is a **sovereign AI Centre configuration and commercial viability engine**. The customer — a government body or large enterprise — wants to build an AI Centre. SASC takes them from "what do you want to achieve" to a sign-off-ready BOM, ROM, and commercial case.

**The full modelling chain:**

```
Programme Definition (Docket)
    Territory, engagement type, objectives, budget envelope
         ↓
Centre Design Decision (SASC S1)
    B&M vs MDC, T-shirt size, number of sites
    → Sets physical envelope: GPU inventory, MW available, rack positions
         ↓
Output Stack Configuration (SASC S1)
    What does the centre DO?
    ├── AI Applications (UCs) → internal use cases
    ├── AI Infra Services (MaaS / GPUaaS / BMaaS) → revenue-generating services
    └── AI Capability Building (Skills/CoE) → workforce development [placeholder]
         ↓
Workload Profiling per Output (SASC S2 + S3)
    UC workloads: DAU, latency SLA, model, batch vs real-time
    MaaS: usage types, model families, DAU, SLA tier, GPU architecture
         ↓
GPU Fleet Sizing Engine (SASC S2 + S3)
    This is the core: total GPU inventory allocated across all demands
    UCs → inference GPU count
    MaaS → API GPU count (base + peak buffer + failover reserve)
    GPUaaS → reserved GPU count
    Training → training GPU count (if fine-tuning UCs)
    All must fit within MDC MW envelope
         ↓
Full Infrastructure Stack (SASC S4 — to build)
    Networking, platform software, security, resilience
         ↓
BOM — line items with quantity × unit price (from pricing_params)
         ↓
ROM — CapEx + OpEx + UC dev effort + skills
         ↓
Commercial Case → TSAP FM
    Revenue (MaaS + GPUaaS), cost, margin, break-even, 5-year P&L
         ↓
Customer sign-off
```

The key insight driving all of this: **the centre has a fixed physical GPU inventory constrained by MW. That inventory must be intelligently allocated across UCs (cost centres) and services (revenue centres). The allocation decision IS the commercial case.**

---

## 2. MaaS — Full Confirmed Spec

### 2.1 What MaaS Is

Sovereign AI inference API. Customers bring their own applications and integrate against endpoints. They pay per token consumed. No front-end UI, no harness — that is the customer's responsibility. This keeps the OEM in its lane (infrastructure + model hosting) and makes the proposition strongest for enterprise/government customers who have their own application teams.

### 2.2 Usage Types — 6 Fixed

Text/Chat · Coding · Document · Audio · Indic/Regional · Generic

These are fixed. Not configurable per engagement.

### 2.3 Model Catalogue — Confirmed

| Usage Type | Family | Tiers (within family only — never mix across families) |
|---|---|---|
| Text/Chat | Llama + Mistral | Llama 3.1 8B / 3.3 70B / 3.1 405B · Mistral Small 3.1 24B / Large 2 123B |
| Coding | DeepSeek-Coder + Qwen2.5-Coder | DS-Coder-V2 Lite 16B / DS-Coder-V2 236B · Qwen2.5-Coder 7B / 32B / 72B |
| Document | Qwen2.5 | 7B / 32B / 72B (long context, structured extraction) |
| Audio | Sarvam Whisper + Whisper v3 | Sarvam Whisper S / M / Large · Whisper large-v3 (MIT, on-prem OK) |
| Indic/Regional | Sarvam | Sarvam-2B / Sarvam-M |
| Generic | Llama + Mistral | Same families as Text/Chat — for RAG backends, agent orchestration |

**Versioning rule:** Always n (latest) and n-2. Catalogue updates when new versions release. Older versions sunset from new configs, existing deployments continue.

**Licensing:** Apache 2.0 / MIT / Qwen licence (commercial OK). No MNPL. Sarvam — verify commercial deployment terms before customer commitment. Kimi excluded (licensing unclear). Codestral excluded (MNPL non-commercial).

**Tiers are always within the same model family** — no mixing across families for a given usage type.

### 2.4 GPU Catalogue — 12 Architectures (2026–2028)

**NVIDIA (9):**
H200 SXM 141GB · B200 SXM 192GB · B200 NVL72 · B300 SXM ~288GB · B300 NVL72 · GB200 NVL72 · GB300 NVL72 · Vera Rubin SXM ~288GB HBM4 · Vera Rubin NVL72

No A100, no H100. Those are excluded — 2026 onwards only.

**AMD (3):**
MI355X 288GB HBM3e (available now) · MI400X (2027, HBM4, placeholder) · Instinct Helios rack-scale (2027, placeholder)

Placeholders: include in simulation with "Coming 2027 — specs indicative" flag. Results marked as estimated.

**GPU specs source:** `benchmark_results` / `gpu_configs` Supabase tables — NOT hardcoded in SASC. SASC reads from these tables. This was agreed: specs in benchmarking tables, SASC reads from them.

**Cost inputs source:** Settings (Hardware SKU section) + territory overrides from `app_config`.

### 2.5 SLA Tiers — 2 Only

**Standard:** Best-effort throughput, 99.5% uptime
**Enterprise:** Guaranteed throughput reservation, priority queue, 99.9% uptime, dedicated capacity option

No Professional tier. Keep it simple.

**SLA multiplier on pricing:** Enterprise = 1.5× Standard price for same bundle.

### 2.6 Pricing Model — API/Consumption Only

**NOT subscription bundles.** This was explicitly decided — subscription forces owning chatbot UI, intent routing, harnesses, billing metering, quota management. That's a SaaS product build, not an infrastructure play.

**Pricing basis:**
- Input tokens: ₹/million tokens (per usage type)
- Output tokens: ₹/million tokens (per usage type, higher than input)
- Audio: ₹/minute
- Prices are NOT hardcoded — they are OUTPUT of the FM simulation: cost-to-serve + margin target → customer price

**Free trial:** 15 days · 1M tokens · API access only · Standard SLA · hard stop at quota · one per organisation · converts to consumption contract

**Market reference:** Fireworks AI / Together AI / Groq pricing as ceiling check — your price should be at or below equivalent for sovereign positioning.

### 2.7 MaaS GPU Fleet Model — The Three-Layer Capacity Model

This is what's largely missing from the current SASC MaaS simulation.

**Layer 1 — Base capacity per catalogue item**

For each `usage_type × model_tier × SLA_tier` combination:
```
Peak RPS = DAU × requests/user/day × peak_mult / 86400
Peak token throughput = Peak RPS × avg_tokens_per_request
GPU throughput = from benchmark_results (model × GPU arch × quantisation), derated 80%
Base GPUs = ceil(Peak token throughput / derated throughput per GPU)
VRAM check: model VRAM × instances ≤ total VRAM per GPU × GPU count
```

**Layer 2 — Operational buffers (per catalogue item)**

On top of base capacity:
- **Peak headroom:** +25–30% above P95 load (traffic spikes that can't be queue-absorbed)
- **Failover reserve:** Standard SLA = +15–20% fleet-wide; Enterprise = +30% (dedicated reserve)
- **Multi-tenancy isolation overhead:** +10–15% for token-level tenant isolation

```
Total GPUs per item = Base × (1 + peak_headroom%) × (1 + failover%) × (1 + multi-tenancy%)
Example: 800 base × 1.25 peak × 1.20 failover × 1.12 multi-tenancy = ~1340 GPUs
```

**Layer 3 — Aggregate and fleet validation**

```
Total MaaS GPUs = sum across all enabled usage types
Total fleet demand = UC inference GPUs + MaaS GPUs + GPUaaS reserved + training GPUs
MW demand = total_GPUs × avg_TDP_per_GPU / 1000
Fleet check: total fleet demand ≤ physical inventory AND MW demand ≤ MDC MW capacity
```

### 2.8 The Heatmap — Temporal Demand Model

GPU demand is not flat. It has intraday and day-of-week patterns. **This is what makes fleet management non-trivial.**

**Why it matters:** If Text peaks at 10am and Coding peaks at 8pm, the fleet peak is NOT Text_peak + Coding_peak. The actual required reserve is lower. The heatmap shows this.

**Demand curve shapes (per usage type):**
| Usage Type | Pattern | Peak hours |
|---|---|---|
| Text/Chat | Business hours | 9am–6pm weekdays |
| Coding | Evening peak | 6pm–11pm, weekdays + weekends |
| Document | Monday morning spike | 8am–11am Mon, business hours otherwise |
| Audio | Business hours | 9am–5pm weekdays |
| Indic | Flat-ish | Slight morning peak |
| Generic | Mixed | Broad daytime |

**Archetype approach (4 presets):** Flat / Business-hours / Evening-peak / Mixed. User assigns an archetype per usage type. Optional manual hourly override.

**Aggregate curve:** Overlay of all enabled usage types weighted by DAU allocation. Shows:
1. When is the fleet fully loaded? (risk of SLA breach)
2. Which hours have spare capacity? (spot/burst pricing opportunity)
3. Minimum reserve that covers all combinations (true peak vs naive sum)

**Fleet P&L view** (connects to heatmap):
```
Each GPU allocation block:
  UCs:    Cost centre — GPU CapEx amortised + power / UC delivery value
  MaaS:   Revenue centre — token revenue - GPU cost = gross margin per usage type
  GPUaaS: Revenue centre — GPU-hr revenue - GPU cost = gross margin
  Unallocated headroom: Pure cost — justify as reserve or resize MDC

Fleet question: given fixed GPU inventory at known CapEx and power cost,
what allocation across UCs/MaaS/GPUaaS maximises:
  (a) UC delivery  (b) service revenue  (c) within MW constraint?
```

### 2.9 Three-Layer SASC Simulation (Architecture Comparison)

**Layer 1 — Architecture Comparison Curves**
- User selects 1–5 GPU architectures from catalogue
- X axis: concurrent users (0 to max)
- Supply curve per GPU: flat/step function showing supportable users at target latency
- Demand curve: linear — users × tokens/request × requests/user/hour = throughput needed
- Intersection = target operating point (where supply meets demand)
- Beyond intersection = need more hardware or reduce scope
- Shaded zone = headroom / surplus revenue opportunity
- Output: which GPU meets demand at lowest cost, and at what minimum user count

**Layer 2 — Usage Type Performance Heatmap**
- Same 1–5 GPUs × 6 usage types
- Score = throughput efficiency × memory fit × cost per million tokens
- Heatmap: rows = GPUs, cols = usage types, colour = relative score
- Best GPU per usage type highlighted
- Tooltip: actual tokens/sec and ₹/M tokens
- Insight: large-model usage types (Coding 236B, Document 72B) → GB200/VR wins; small models (Audio, Indic 2B) → cheapest GPU wins

**Layer 3 — Usage Mix Optimiser**
- User defines mix hypothesis: % per usage type (sum = 100%), total DAU target
- System calculates per GPU architecture (and for mixed arch):
  - Weighted GPU count needed
  - Total CapEx
  - Monthly OpEx (power + AMC)
  - Monthly revenue at token pricing × utilisation assumption
  - Gross margin
  - Break-even months
- Output: crossover curves weighted by mix — one line per GPU + optimal mixed arch
- Decision recommendation: "Single arch [GPU X] optimal" or "Mixed [X for large models + Y for small] saves ₹X Cr"
- **Mixed arch analysis:** Primary (80% workload) + secondary (20% specialist) — does mixed beat single?

### 2.10 Data Flow — Confirmed

```
Docket MaaS screen (wish list)
    → usage types enabled, model family + tier selected, DAU per type, SLA preference
    → saved as docket_items (item_type='solution', item_subtype='maas_config')

SASC S3 reads MaaS config from Docket
    → runs 3-layer simulation
    → computes GPU count per usage type (base + buffers)
    → aggregates with UC GPUs and GPUaaS into fleet total
    → validates against MDC MW envelope
    → outputs: chosen arch, GPU count, power draw, cost per million tokens

SASC outputs saved to Docket
    → item_type='solution', item_subtype='maas_bom'
    → content: {arch, gpu_count, cost_per_mtoken, capacity, price_card}

FM Revenue tab reads from Docket/SASC output
    → cost per million tokens → + margin target → customer price
    → revenue at utilisation levels (60% / 75% / 90%)
    → break-even analysis
    → trial conversion rate → CAC payback
    → fleet P&L: subscription floor + consumption upside
```

---

## 3. Fleet Management View — The Master View

This is what makes SASC commercially useful. After all the workload profiling and MaaS simulation, the user needs to see one screen that answers: **does my GPU fleet make sense?**

**Fleet Allocation Table (target design for SASC):**

| Block | Base GPUs | Peak buffer | Failover | Total | MW | % of fleet | Revenue/Cost |
|---|---|---|---|---|---|---|---|
| MaaS — Coding/Adv | 800 | 200 | 160 | 1160 | 2.8MW | 27.6% | Revenue |
| MaaS — Text/Mid | 400 | 100 | 80 | 580 | 1.4MW | 13.8% | Revenue |
| MaaS — Document | 200 | 50 | 40 | 290 | 0.7MW | 6.9% | Revenue |
| MaaS — Indic/Audio | 120 | 30 | 24 | 174 | 0.4MW | 4.1% | Revenue |
| UC inference total | 640 | 0 | 96 | 736 | 1.8MW | 17.5% | Cost |
| UC training (fine-tune) | 200 | 0 | 0 | 200 | 0.5MW | 4.8% | Cost |
| GPUaaS reserved | 300 | 100 | 0 | 400 | 1.0MW | 9.5% | Revenue |
| Headroom | 160 | — | — | 160 | 0.4MW | 3.8% | Reserve |
| **Total** | **2820** | **480** | **400** | **3700** | **9.0MW** | **88%** | |
| **vs Inventory** | | | | **4200** | **10MW** | | ✓ |

MW check: if over → flag which items to cut or upsize MDC.

---

## 4. Other Infrastructure Layers (Beyond Compute)

These are confirmed requirements from the June 10 session that feed the BOM beyond GPUs.

### 4.1 Networking
- **East-West (GPU fabric):** NVLink within node; IB/RoCE between nodes — training >8 GPUs needs IB; inference can use 100GbE
- **North-South (user traffic):** API gateway → inference; ~1 Gbps per 500 concurrent sessions
- **Switch count:** Spine-leaf topology from server count — NKC proprietary stack
- **Sizing rule:** Rule-based from GPU/server count — not manually entered

### 4.2 Platform Software
- AI Platform components: Data Fusion, RAG, model registry, API gateway, guardrails, security, governance
- MLOps: experiment tracking, model versioning, pipeline orchestration
- Data integration: connectors, ETL pipelines, data lake
- Monitoring: GPU utilisation, model performance (HPC Monitoring tool)
- **Cost model:** % of compute BOM (platform software ≈ 20–30%) OR per-component from pricing_params

### 4.3 Security & Compliance
- Air-gap (defence/classified): separate management network, data diodes, offline model serving
- Zero-trust, CERT-In/DPDP compliance tooling, SIEM
- **Cost model:** Security uplift % (standard = 8%, classified = 18%)

### 4.4 Resilience
- HA config: active-active vs active-passive — determines if GPU count doubles for critical UCs
- DR site: +30–50% of primary site BOM depending on warm/cold
- Load balancer count
- **Cost model:** HA adds ~15% GPU overhead; DR adds configurable % of primary BOM

### 4.5 People & Skills
- Ops team: sized from GPU count (rule of thumb: 1 MLOps/GPU cluster ops per 200 GPUs)
- UC dev team: UCs × complexity × effort days × blended day rate
- Skills build: cohort size × training cost
- ROM line — people costs use territory salary_ratio override

### 4.6 pricing_params Table (Supabase — Not Yet Created)
Every BOM line needs configurable unit prices. This table is the missing enabler.

```sql
create table pricing_params (
  id text primary key,           -- e.g. 'gpu-server-h200', 'nkc-switch-spine'
  category text,                 -- compute|network|storage|platform|security|people
  item_code text,                -- L2/L3 code or free-form
  description text,
  unit text,                     -- per server|per rack|per licence|per FTE-month
  base_price_usd numeric,
  base_price_inr numeric,        -- INR override if applicable
  notes text,
  active boolean default true,
  updated_at timestamptz default now()
);
```

---

## 5. Gap Register — Implementation vs Design

### 5.1 What's Working (Confirmed in Current Build)

| Component | Status |
|---|---|
| Docket → SASC data flow (UCs, portfolio, MaaS config, territory costs) | ✓ Working |
| UC workload profiling: DAU → RPS → GPU count via benchmark_results | ✓ Working |
| UC display on S2: uc_name matching, 5/5 UCs showing | ✓ Working |
| MaaS simulation structure: 3-layer tabs in S3 | ✓ Structure exists |
| GPU architecture comparison (Layer 1): select 1-5, compare curves | ✓ Partially working |
| Usage type heatmap (Layer 2): GPU × usage type performance | ✓ Partially working |
| Mix optimiser (Layer 3): weighted by usage mix % | ✓ Partially working |
| GPUaaS config: toggle, GPU count, USD/GPU-hr | ✓ Working |
| BMaaS config: toggle, server count, USD/server-hr | ✓ Working |
| Navigation: S1→S2→S3→S4→S5, back/forward | ✓ Now working |
| SASC_LOAD_GEN race condition guard | ✓ Fixed |
| SVC_MC_STATE infinite loop fix | ✓ Fixed |
| fmtNum utility | ✓ Fixed |

### 5.2 MaaS Gaps (High Priority)

| Gap | Description | Priority |
|---|---|---|
| **M1** | Layer 2 (peak buffer) and Layer 3 (failover reserve) not applied to MaaS GPU count. Current simulation gives base GPUs only — no operational buffers. | 🔴 Critical |
| **M2** | Multi-tenancy isolation overhead (+10–15%) not modelled | 🔴 Critical |
| **M3** | MaaS GPU total not aggregated into fleet BOM. Simulation runs but output never flows to BOM. | 🔴 Critical |
| **M4** | Demand curves / temporal heatmap not built. Layer 2 tab in simulation is stub. Aggregate curve (peak vs naive sum) not shown. | 🟠 High |
| **M5** | Usage mix optimiser (Layer 3): crossover curves exist but mixed-arch analysis not built | 🟠 High |
| **M6** | SLA tier (Standard vs Enterprise) has no effect on failover reserve % in sizing | 🟠 High |
| **M7** | Cost per million tokens not computed from GPU cost + utilisation assumption | 🟠 High |
| **M8** | Token pricing not passed to FM Revenue tab | 🟠 High |
| **M9** | Model family → tier mapping in Docket MaaS screen uses old spec. Needs updating to confirmed model catalogue (Section 2.3) | 🟡 Medium |
| **M10** | Free trial (15 days, 1M tokens) — modelled as flag in config but not costed as CAC in FM | 🟡 Medium |
| **M11** | ~~GPU specs in benchmark_results / gpu_configs~~ | ✅ Done — gpu_configs confirmed complete with tdp_kw, bf16_tflops, int4_tflops, hbm_bw_tbps, gpus_in_unit, rack_scale |

### 5.3 Fleet Management Gaps

| Gap | Description | Priority |
|---|---|---|
| **F1** | Fleet allocation table (Section 3) not built. No single view showing UC + MaaS + GPUaaS GPU allocation with MW check. | 🔴 Critical |
| **F2** | MW envelope validation not implemented. Nothing checks total GPU power demand vs MDC MW capacity. | 🔴 Critical |
| **F3** | UC GPUs + MaaS GPUs + GPUaaS GPUs not summed into one fleet total | 🔴 Critical |
| **F4** | Fleet P&L view not built — cost vs revenue per allocation block | 🟠 High |

### 5.4 BOM Gaps

| Gap | Description | Priority |
|---|---|---|
| **B1** | ~~pricing_params Supabase table does not exist. All prices hardcoded.~~ | ✅ Done 2026-06-24 — 47 rows seeded across 10 categories |
| **B2** | BOM is compute-only. Missing: networking, platform software, security uplift, resilience uplift, UC dev effort. Currently ~40–50% of actual cost. | 🟡 Partial — networking, software, security, services all now in BOM. MaaS/GPUaaS GPU lines added. UC dev effort added. Confidence range now weighted from pricing_params. |
| **B3** | Networking not sized from workload (switch count, IB requirements, NKC units) | 🟠 High |
| **B4** | Platform software has no cost model (enabling AI Platform layer adds nothing to BOM) | 🟠 High |
| **B5** | Security uplift % not applied | 🟠 High |
| **B6** | Resilience (HA/DR) multiplier not applied to BOM | 🟠 High |
| **B7** | UC development effort not estimated in ROM | 🟠 High |
| **B8** | No BOM line traceability (which UC / service drove each line) | 🟡 Medium |
| **B9** | B&M DC type has no size parameters — only MDC T-shirts are sized | 🟡 Medium |

### 5.5 FM Integration Gaps

| Gap | Description | Priority |
|---|---|---|
| **FM1** | SASC does not push BOM totals to FM. TSAP FM reads territory config from app_config but not SASC BOM output. | 🟠 High |
| **FM2** | FM Revenue tab not built for MaaS token pricing (cost-to-serve + margin → price card) | 🟠 High |
| **FM3** | Trial conversion rate / CAC payback not modelled in FM | 🟡 Medium |

### 5.6 Minor / Housekeeping

| Gap | Description | Priority |
|---|---|---|
| **H1** | renderGpuBmaasSection toggle buttons still hardcode renderStep(3) | 🟡 Medium |
| **H2** | FX rates (frankfurter.app) blocked by CORS — falls back to hardcoded. Non-fatal. Replace with static table. | 🟡 Low |
| **H3** | Budget envelope from Docket not surfaced in SASC for ROM capping / feasibility | 🟡 Low |

---

## 6. Recommended Build Sequence

### Phase 1 — Close the Fleet View (most critical, unblocks sign-off)
1. **[Supabase] Create pricing_params table** — seed with GPU server, MDC, NKC switch prices
2. **[SASC S3] MaaS buffer model** — add peak headroom + failover + multi-tenancy to GPU sizing (M1, M2)
3. **[SASC S3] Fleet allocation table** — aggregate UC + MaaS + GPUaaS GPUs, MW check (F1, F2, F3)
4. **[SASC S3] Demand curves / temporal heatmap** — archetype shapes, aggregate curve (M4)
5. **[SASC S3] Cost per million tokens** — GPU cost ÷ throughput × utilisation assumption (M7)

### Phase 2 — Complete the BOM
6. **[SASC BOM] Networking** — rule-based from GPU/server count
7. **[SASC BOM] Platform software, security, resilience** — % uplifts from pricing_params
8. **[SASC BOM] UC dev effort in ROM**
9. **[SASC → FM] Push BOM totals to app_config** for FM pickup

### Phase 3 — Commercial Model
10. **[FM] Revenue tab** — MaaS token pricing + margin + utilisation curves
11. **[FM] Fleet P&L** — cost vs revenue per allocation block
12. **[FM] Break-even + trial CAC** modelling

### Phase 4 — Deepen
13. Mixed GPU architecture analysis (M5)
14. B&M DC sizing (B9)
15. BOM traceability (B8)
16. People sizing engine from GPU count / UC count

---

## 7. Decisions Locked — Do Not Revisit Without Explicit Discussion

| Decision | What was decided |
|---|---|
| MaaS pricing model | API/consumption only — NO subscription bundles |
| MaaS usage types | 6 fixed: text, coding, document, audio, indic, generic |
| Model families | Fixed per usage type — tiers within same family only, never cross-family |
| GPU catalogue | 12 architectures: NVIDIA H200 through VR NVL72; AMD MI355X+. No A100/H100/MI300X/MI325X |
| GPU specs source | benchmark_results / gpu_configs Supabase tables — not hardcoded in SASC |
| Cost inputs source | Settings (Hardware SKU) + territory overrides in app_config |
| SLA tiers | Standard and Enterprise only |
| Free trial | 15 days, 1M tokens, API, Standard only, one per org |
| Architecture simulation | 1–5 GPU selection, 3-layer: comparison curves / heatmap / mix optimiser |
| Simulation saves to | Docket: item_type=solution, item_subtype=maas_bom |
| TSAP FM role | Receives BOM from SASC, runs financial model — not rebuilt inside SASC |
| Capability Building | Placeholder in SASC — not built until MaaS/BOM complete |
| Front-end chatbot | NOT the OEM's problem — customer brings their own application |
