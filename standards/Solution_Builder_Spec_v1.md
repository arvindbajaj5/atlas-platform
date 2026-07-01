# ATLAS Solution / Sizing Tab — Combined Specification v1.0
**Date:** 30 June 2026
**Merges:** tools/sasc (5,354 lines) + tools/inferencing-factory (3,793 lines)
**Status:** Spec for review — prototype to follow after sign-off

---

## 0. Why this document exists

SASC and Inferencing Factory were built independently and overlap heavily, but
each has genuinely good ideas the other lacks. Rather than pick one and lose
the other's strengths, this spec merges them into a single Solution tab inside
the Docket — replacing both standalone tools.

Confirmed Supabase reference data available today (checked 30 June 2026):

| Table | Rows |
|---|---|
| gpu_configs | 12 |
| model_catalogue | 103 |
| uc_interaction_types | 12 |
| requirement_archetypes | 8 |
| uc_library | 69 |
| benchmark_results | 0 (empty — formula fallback path used) |

`shared/sasc-sizing.js` (SizingEngine v4) is confirmed complete and callable:
`init(sbUrl, sbKey)`, `sizeUC(config, gpuConfigId)`, `sizeMaaS(config, gpuConfigId)`,
`fleetTotal(...)`. Pure functions, full audit trail in return value, no DOM,
no AI calls. Nothing new needs to be built in the engine itself for Phase A.

---

## 1. The scoping vs sizing distinction (decided 30 June 2026)

Two genuinely separate jobs were being conflated under "agent-based solution
building." Separating them changes what gets built and when.

**Job 1 — Scoping (defaults + judgment).** Given a requirement and portfolio
selection, propose a *starting* configuration: DAU, model tier, SLA tier.
This is pattern-matching against `uc_interaction_types` defaults and similar
past engagements. It does not invent facts — it suggests sensible starting
points a human reviews and overrides. This is where AI/agent framing
honestly applies, and it is **deferred to Phase B** (backlog).

**Job 2 — Sizing (pure formula).** Given a *fully specified* config, compute
GPU count, power, cost. Zero AI, zero agent — `SizingEngine.sizeUC()` is a
deterministic function. This is **Phase A — build now.**

The earlier "agent fragment" UX (progress indicators, done/running/waiting
states) was designed for Job 2, where it doesn't belong — sizing is instant,
pretending it takes time is dishonest UX. That framing is correctly applied
to Job 1 instead, once Phase B exists.

**Phase A ships with manual config forms, not simulated agent delay.**

---

## 2. What SASC contributes (keep, adapt)

### 2.1 The proven step flow
Confirmed working structure from `getActiveSteps()`:

```
S1 — Scope & Stack        (DC type, hardware base, layer toggles)
S2 — UC Workloads         (shown if UC development is in scope)
S3 — Tenant Services      (shown if MaaS/GPUaaS/BMaaS/PTaaS or infra layer on)
S4 — Fleet Allocation     (aggregates S2+S3 into total fleet)
S5 — BOM / ROM            (final output, document generation)
```

Steps are **conditionally shown** based on what's toggled on — not a fixed
linear wizard. This maps directly onto the Docket's portfolio selection:
if B5A (UCs) is selected → S2 shows. If B5E/B5F/B5G/B5H selected → S3 shows.
**Reuse this conditional-step pattern exactly.**

### 2.2 calcSizing() / calcUsageTypeGpus() / calcMaasTotalGpus()
These exist in SASC as wrapper functions around what should be direct
`SizingEngine` calls. Confirmed (Section 28 of blueprint, code salvage map):
SizingEngine is currently **inlined** in SASC rather than referenced as
`shared/sasc-sizing.js`. **Action: de-inline. Every sizing call in the new
Solution tab goes directly to `SizingEngine.sizeUC()`/`sizeMaaS()` — no
wrapper duplication.**

### 2.3 renderFleetAllocation / calcFleetInventory
S4's job — aggregate all S2 (UC) and S3 (MaaS/GPUaaS/BMaaS) sizing results
into one fleet total, by GPU type, with buffers applied once at fleet level
(not per-workload, which double-counts HA/failover). **Reuse this
aggregation logic — it's the `fleetTotal()` SizingEngine call already
designed for this.**

### 2.4 renderROMSummary / calculateBOM
S5's BOM assembly — turns fleet totals into priced line items. Currently
reads from in-memory unit costs (`tsap_unit_costs` table, confirmed to exist
with 50 rows from earlier audit). **Reuse the BOM line structure, but read
unit costs from `tsap_unit_costs` via `atlasDB`, not inline objects.**

### 2.5 People cost (calcPeopleCost) and renderPeopleTab
SASC has a people-cost model (OPERATE team sizing) that Inferencing Factory
lacks entirely. **Keep as-is, wire to `people_params` table (confirmed to
exist from earlier audit).**

---

## 3. What Inferencing Factory contributes (new, not in SASC)

### 3.1 Data Source Registry — genuinely new capability
`renderScope()` includes a registry of data sources feeding workloads via
RAG/fine-tuning/ingestion: name, modality, volume (GB), format
(clean/semi/unstructured/mixed), connection type, refresh cadence, cleanup
needs, labelling needs, PII flag. This feeds `calcServices()` — implementation
services effort estimation (data engineering hours).

**This maps to PREPARE block (P03 — Data Estate Planning) and feeds the
services BOM. SASC has no equivalent. Add as a new sub-section, shown when
P03 or any B5x (UC/MaaS) requiring data ingestion is selected.**

New table needed: `data_sources` (engagement-scoped, not global) —
`id, engagement_id, name, modality, volume_gb, format, connectivity,
refresh_cadence, cleanup_needed, labelling_needed, pii_flag, notes`.

### 3.2 Benchmark matrix — editable measured performance
`renderParams()` builds an editable table of GPU×Model×Engine×Quantization×
Batch combinations with measured TPS/TTFT/TBT. This is exactly the
`benchmark_results` table SizingEngine already checks (and prefers over
formula estimates) — but no UI exists today to populate it. Inferencing
Factory has that UI; SASC doesn't.

**Action: adapt this UI into a "Benchmark Override" panel in the Solution
tab, writing to `benchmark_results`. Default: empty (formula-based sizing).
Power users can add measured data points which SizingEngine then prefers
automatically — no other code changes needed since SizingEngine already
has this preference logic built in.**

### 3.3 Tokenomics / API-equivalent savings comparison
`renderTok()` computes, per workload: on-prem $/month, $ per million tokens,
equivalent API cost (using market rates), and % savings. This is the CPST
concept from blueprint Section 30, partially pre-built.

**Action: adapt into the Solution tab's summary view — show savings vs API
per L5 item, contributing to the proposal narrative ("This on-prem deployment
saves 64% vs equivalent API spend over 3 years"). Genuinely persuasive
commercial content, currently dormant in a tool nobody opens day to day.**

### 3.4 Source toggle: on-prem / API / hybrid per workload
Inferencing Factory lets each workload independently be sized as on-prem
GPU, pure API consumption, or hybrid. SASC assumes everything is on-prem.

**Action: add this toggle to each UC/MaaS config card. When 'api' or
'hybrid' selected, skip GPU sizing for that portion, show API cost estimate
instead (reuses 3.3's cost model). Relevant for CSP/Consumer archetypes
that don't want full sovereign infra for every workload.**

---

## 4. What gets dropped (deliberately, not by oversight)

| From | What | Why dropped |
|---|---|---|
| Inferencing Factory | Own GPU sizing formulas (`sizing()`, `calcUsageTypeGpus` duplicates) | Replaced entirely by SizingEngine — no parallel sizing math allowed (blueprint Section 13, non-negotiable rule) |
| Inferencing Factory | Standalone tool shell, own nav, own CSS | Retired per blueprint Section 13 — functionality merges into Docket Solution tab |
| SASC | Own AI call wrapper | Replaced by atlas-ai.js (when wired) |
| SASC | Own Supabase fetch patterns | Replaced by atlas-db.js (already wired in Docket) |
| Both | Standalone-tool CSS, headers, navigation | Replaced by shared atlas.css, single Docket shell |

---

## 5. Phase A build scope — what we prototype next

```
Solution tab, four conditional tabs based on Portfolio selection
(see Section 9 for full UI layer — table-first, expand-in-place,
NOT individually collapsible cards):

  ALWAYS SHOWN
    Engagement-level default GPU (set once; pre-fills every new
      Workload Profiler row; override per-row always available —
      see Section 6a, heterogeneous fleet decision)

  TABS — only shown if their portfolio item is selected
    UCs tab      (if B5A selected)
    MaaS tab     (if B5E selected)
    GPUaaS tab   (if B5F selected)
    BMaaS tab    (if B5G/B5H selected)

  EACH TAB — summary table (always full, no truncation) + totals row
    Click any row → expands in place (animated) → full Workload
    Profiler form for that row (see Section 9 field layout)

  UCs tab fields
    Pick UC from uc_library (69 available) OR define ad-hoc
    Inputs: DAU (slider), requests/user/day, peak multiplier (slider),
            avg input/output tokens, model (from 103 in
            model_catalogue), precision, SLA tier, TTFT target,
            GPU (defaults to engagement default, override available),
            Deployment mode (Production on-prem / Pilot-Validation API)
    Quick-start: complexity tier dropdown pre-fills the explicit
            fields above — never the only input mode
    Live call to SizingEngine.sizeUC() on every input change
    Live SLA-met/breach banner (Section 9) — not buried in a sub-line
    Shows: total_gpus, power_kw, notes (audit trail), CPST/savings

  MaaS/GPUaaS/BMaaS tabs fields
    Pick archetype (from 8 requirement_archetypes)
    Inputs: DAU, model tier, SLA tier, GPU (defaults to engagement
            default, override available), Model hosting (Self-hosted /
            Pass-through resell)
    Live call to SizingEngine.sizeMaaS()

  IF P03 (Data Estate Planning) or any data-dependent B5x selected
    Data Source Registry (from Inferencing Factory, adapted)

  FLEET AGGREGATION (always shown once any workload exists)
    SizingEngine.fleetTotal() across all UC + MaaS results
    Excludes rows marked Pilot-Validation / Pass-through — those
      consume zero GPUs from our fleet (see Section 6a)
    Real GPU count, rack count, power — not fake numbers
    Heterogeneous fleet shown clearly: "3 racks H200, 1 rack B200"
      when rows used different GPU overrides (see Q1 decision)
    Make vs Buy chart — Combined Fleet context (Section 8)

  BOM / ROM (always shown once fleet is sized)
    Line items from tsap_unit_costs + fleet totals
    People cost from people_params
    Save as solution_versions row (level = 'L1-rom')

  BENCHMARK DATA — lives in Settings, NOT the Solution tab (per Q2 decision)
    Adapted from Inferencing Factory's editable matrix
    ATLAS-seeded starting values (vendor-published throughput) +
      user-added measurements
    Qualifier fields distinguish entries: source_type, measured_by,
      engagement_id (null = global/reusable), measured_date, confidence
    SizingEngine preference order: user_measured (engagement-specific)
      → user_measured (global) → vendor/atlas_seed → formula fallback
```

**Explicitly NOT in Phase A:** agent progress UX, yield-adjusted sizing
(yield_pct=100 default, "coming soon" label per backlog), Financing Model
step, L2 Detailed/Priced distinction, full 6-simulation suite, AI-suggested
defaults (Job 1). All logged in `ATLAS_Feature_Backlog.md` already.

---

## 6. New database objects needed for Phase A

```sql
-- data_sources (new, from Inferencing Factory adaptation)
CREATE TABLE data_sources (
  id              text PRIMARY KEY,
  engagement_id   text NOT NULL,
  name            text,
  modality        text,
  volume_gb       float,
  format          text,
  connectivity    text,
  refresh_cadence text,
  cleanup_needed  boolean DEFAULT false,
  labelling_needed boolean DEFAULT false,
  pii_flag        boolean DEFAULT false,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- benchmark_results — extend with qualifier fields (table exists, 0 rows today)
ALTER TABLE benchmark_results
  ADD COLUMN IF NOT EXISTS source_type   text DEFAULT 'atlas_seed'
    CHECK (source_type IN ('atlas_seed','vendor_published','user_measured')),
  ADD COLUMN IF NOT EXISTS measured_by   text,
  ADD COLUMN IF NOT EXISTS engagement_id text,  -- null = global/reusable
  ADD COLUMN IF NOT EXISTS measured_date date DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS confidence    text DEFAULT 'medium'
    CHECK (confidence IN ('high','medium','low'));

-- workload_configs (new — stores UC/MaaS Workload Profiler state per engagement,
-- separate from solution_versions which stores the FINAL frozen snapshot)
CREATE TABLE workload_configs (
  id              text PRIMARY KEY,
  engagement_id   text NOT NULL,
  workload_type   text CHECK (workload_type IN ('uc','maas','gpuaas','bmaas','ptaas')),
  uc_library_id   text,              -- FK to uc_library, null if ad-hoc
  archetype_id    text,              -- FK to requirement_archetypes, for maas/gpuaas/bmaas
  gpu_config_id   text,              -- override; null = use engagement default
  source_mode     text DEFAULT 'on_prem'
    CHECK (source_mode IN ('on_prem','pilot_api','self_hosted','pass_through')),
  config          jsonb,             -- full config object passed to SizingEngine
  last_sizing_result jsonb,          -- cached SizingEngine output
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

No changes needed to `solution_versions`, `portfolio_items`, or any table
already migrated — those are confirmed sufficient as-is.

---

## 6a. Workload Profiler — naming decision and SASC vs Inferencing Factory comparison

**Decision: "Workload Profiler" is the name for the per-UC/per-MaaS input card.**
Replaces "Workload card", "Config card" used loosely earlier in this spec.

### Direct comparison — input field design

SASC's UC input (`renderUCComplexityTier`) is **abstraction-driven**: the user
picks a complexity tier (Simple/Medium/Complex button group), and SASC
translates that internally toward a sizing call. This is fast for the user
but loses precision — two "Medium complexity" UCs with very different real
DAU end up sized identically unless the user also separately sets DAU
elsewhere.

Inferencing Factory's workload object (`mkWL`, `addWL`) is **field-driven**:
explicit `dau`, `rpud` (requests/user/day), `pk` (peak multiplier), `ai`/`ao`
(avg input/output tokens), `batch`, `sla`, `ttft`, `tbt`, `e2e`, plus agentic
fields (`isAgentic`, `steps`, `toolWait`). This maps almost directly onto
`SizingEngine.sizeUC()`'s actual config parameter shape — far less translation
distance between what the user enters and what the engine consumes.

**Decision: Workload Profiler is field-driven (Inferencing Factory's model),
not tier-driven (SASC's model) — because direct fields are what SizingEngine
actually needs, and tier abstraction was solving a UX problem (overwhelming
forms) that the "expand for entry, defaults pre-filled, P50/P95 toggle"
principles already established earlier in this build solve better.**

However, SASC's tier buttons are kept as a **quick-start preset**, not the
only way in: clicking "Medium complexity" pre-fills the explicit fields with
sensible defaults (this is exactly `preset()` in Inferencing Factory, which
does the same thing under a different name — confirms both tools converged
on the same underlying need). The user then sees and can adjust the real
fields, never locked into an opaque tier.

### Workload Profiler — three contexts, three purposes (per your Q4 answer)

The Profiler's actual fields stay constant, but its **purpose and the
decisions it surfaces** differ by context — this directly answers "use these
ideas and suggest" from Q4:

| Context | Purpose | Profiler-specific UI |
|---|---|---|
| **Use Case (B5A)** | Right-size GPUs for ONE customer's specific workload, sovereign by default | Deployment mode toggle: Production (on-prem) / Pilot-Validation (API). Shows TTFT/SLA prominently — UCs are usually latency-sensitive (Tier 1/2). |
| **MaaS (B5E)** | Right-size a SHARED multi-tenant pool, throughput-driven | Model hosting toggle: Self-hosted / Pass-through (resell upstream API). Shows throughput (tokens/sec) and CPST prominently — MaaS is Profile A (compute-bound at high batch), not latency-bound like UCs. |
| **Fleet Aggregation (S4)** | Combine all Profiler outputs into one buildable, priced fleet | No new inputs — pure aggregation. Excludes any Profiler marked Pilot/Pass-through (those don't consume our GPUs). Shows GPU type breakdown when fleet is heterogeneous (per Q1 decision). |

### What carries over from each tool into the new Workload Profiler

| Feature | From | Verdict |
|---|---|---|
| Explicit DAU/tokens/SLA fields | Inferencing Factory | Keep — primary input mode |
| Complexity tier quick-start buttons | SASC | Keep — as preset, not sole input |
| Agentic fields (steps, toolWait) | Inferencing Factory | Keep — feeds blueprint Section 30 yield compounding (Phase B, but capture the fields now so Phase B doesn't need a schema change) |
| GPU choice per workload | Neither (both assumed engagement-wide GPU) | New — per Q1 decision, default + override |
| Deployment mode / hosting toggle | Neither (new synthesis) | New — per Q4 decision, context-specific labels |
| Tokenomics/savings comparison | Inferencing Factory | Keep — shown per-Profiler and rolled up in Fleet view |
| Benchmark override | Inferencing Factory | Keep — moved to Settings per Q2, not inline in Profiler |

---

## 7. Decisions confirmed (30 June 2026) — no longer open

1. **GPU base selection** — Engagement-level default, override per Workload
   Profiler. Heterogeneous fleets fully supported; Fleet Aggregation groups
   automatically by actual GPU used, no manual reconciliation required.

2. **Benchmark Data location** — Settings page, new "Benchmark Data" tab.
   Not inline in the Solution tab. ATLAS-seeded starting values (vendor
   published numbers) + user additions, qualified by source/engagement/date/
   confidence to handle duplicate combos correctly.

3. **Data Source Registry scope** — Engagement-level only for Phase A.
   Cross-engagement reuse logged to `ATLAS_Feature_Backlog.md` as a Phase B
   item, revisit once real reuse patterns are observed across a few
   engagements.

4. **Source/deployment mode** — Three distinct contexts, three distinct
   labels and defaults (see Section 6a): UC defaults to Production/on-prem
   with a Pilot-Validation/API option; MaaS defaults to Self-hosted with a
   Pass-through/resell option; Fleet Aggregation simply excludes whichever
   Profilers are marked non-GPU-consuming.

**Next step: prototype the Workload Profiler V (UI shell, dummy data) for
one UC and one MaaS card, validate visually, before wiring any Controller
or running the two new table migrations.**

---

## 8. Make vs Buy — Tokenomics Curve (decided 30 June 2026)

### Purpose

Not a static "% saved" line item — a strategic capacity decision tool.
Plots cost vs token volume across the full 0–100% range of fleet capacity,
so the customer sees where on-prem becomes cheaper than buying from the
market, not just a single snapshot number that's misleading at low volume.

**Critical framing constraint:** actual token consumption per UC cannot be
predicted at this stage — we don't know real usage patterns, prompt lengths,
or adoption curves for a system that doesn't exist yet. The X-axis is
**theoretical fleet capacity utilisation** (0–100% of what the provisioned
GPUs CAN produce, from `SizingEngine`'s `throughput_tokens_per_sec`), never
a fabricated "predicted consumption" number. The Workload Profiler's
DAU/requests inputs are used only to mark a single "planned utilisation"
reference point on the curve — explicitly labelled a planning assumption,
not a forecast.

### Chart structure — one per context, toggle-switched

```
TOGGLE: ⦿ Use Case   ○ MaaS Pool   ○ Combined Fleet

  Y-axis: $ cost per month
  X-axis: 0% to 100% of THIS context's fleet capacity

  Lines:
    1. Our on-prem cost curve (capex amortised + variable opex)
    2. Market API — Closed Weights (linear $/token)
    3. Market API — Open Weights (linear $/token)

  Markers:
    Breakeven point — separately marked vs line 2 and vs line 3
    Planned utilisation — dotted vertical line from Workload
      Profiler DAU/requests inputs, labelled "Planning assumption"
```

### Cost model

```
on_prem_cost_per_month(util%) =
    (total_capex / 60)                          // 5-year amortisation
  + monthly_fixed_opex                          // people, AMC, facility
  + (power_kw_full_load × util% × power_tariff × hours_per_month)

tokens_at_util% =
    fleet_throughput_tokens_per_sec × seconds_per_month × util%

api_cost_per_month(util%) =
    tokens_at_util% × api_price_per_token        // pure linear, no fixed cost
```

**Amortisation period: 5 years (60 months) — confirmed default.**
Matches typical DC capex accounting; GPU-specific refresh cycles handled
separately via SUSTAIN block (S03 Hardware Refresh), not by shortening
this amortisation assumption.

### New database object

```sql
-- api_pricing_reference (new — small, periodically refreshed)
CREATE TABLE api_pricing_reference (
  id                    text PRIMARY KEY,
  provider              text NOT NULL,
  model_class           text NOT NULL,        -- e.g. 'gpt-4o-class', 'llama-3.1-405b-class'
  weight_type           text NOT NULL CHECK (weight_type IN ('closed','open')),
  input_price_per_mtok  float,
  output_price_per_mtok float,
  source_url            text,
  last_updated          date DEFAULT current_date
);
```

**Action: seed with current public pricing** for one representative Closed
Weights model (e.g. GPT-4o or Claude class) and one representative Open
Weights model (e.g. Llama-3.1-405B via Together/Groq/Fireworks, matching
the market-ceiling check already referenced in blueprint Section 19) —
done as part of Phase A migration, not left for manual entry.

### Where it lives in the UI

Embedded within each expanded Workload Profiler row (Section 9) as a
sub-section, defaulting its toggle to the row's own context. Also shown
at Fleet Aggregation level for the full combined-system strategic story —
this is the version most likely to appear in the customer proposal.

---

## 9. UI Layer — Workload Profiler (decided 30 June 2026)

### Structure: table-first, expand-in-place — not collapsible cards

Earlier drafts of this spec proposed individually collapsible cards. Revised:
**every workload is always visible in a summary table — full screen, no
truncation, no hidden rows.** Clicking a row expands it in place (smooth
animated height transition) to reveal the full Workload Profiler form.
Multiple rows can be expanded simultaneously — no forced single-open
accordion, since comparing two workloads side by side is a legitimate need.

### Four tabs, one per workload type, conditionally shown

```
[ UCs ]   [ MaaS ]   [ GPUaaS ]   [ BMaaS ]

Only tabs for portfolio-selected types appear:
  B5A selected → UCs tab shown
  B5E selected → MaaS tab shown
  B5F selected → GPUaaS tab shown
  B5G selected → BMaaS tab shown

Each tab has its own summary table + its own expand-in-place detail —
same mechanism, different field sets per type.
```

### Summary table (default view, every tab)

```
UCs Tab

┌────────────────────────┬────────┬───────┬──────┬───────┬────────┬──────┐
│ Use Case                │ DAU    │ GPU   │ GPUs │ Power │ SLA    │      │
├────────────────────────┼────────┼───────┼──────┼───────┼────────┼──────┤
│ GLOF Early Warning      │ 500    │ H200  │ 12   │ 3.2kW │ ✓ Met  │  ▸   │
│ Crop Disease Detection  │ 50,000 │ H200  │ 3    │ 0.9kW │ ✓ Met  │  ▸   │
└────────────────────────┴────────┴───────┴──────┴───────┴────────┴──────┘
  TOTALS:                                    15      4.1kW

  [+ Add UC Workload]
```

Every row, every key number, fully visible — never hidden behind a click.
Totals row beneath the table, summing GPUs and power across all rows in
that tab. Each workload type's table has its own relevant columns (MaaS
shows Throughput/CPST instead of TTFT/SLA-met, matching Profile A vs
Profile B distinction from Section 5).

### Expand-in-place — full detail, nothing collapsed within it

```
┌────────────────────────┬────────┬───────┬──────┬───────┬────────┬──────┐
│ GLOF Early Warning      │ 500    │ H200  │ 12   │ 3.2kW │ ✓ Met  │  ▾   │
├────────────────────────┴────────┴───────┴──────┴───────┴────────┴──────┤
│                                                                          │
│  UC LIBRARY MATCH          GPU                    DEPLOYMENT MODE      │
│  [GLOF Early Warning ▾]    [H200 SXM ▾]           ⦿ Production         │
│   or + Define ad-hoc                               ○ Pilot (API)       │
│                                                                          │
│  DAU (slider, log scale)                            PEAK MULT (slider) │
│  ●────────────────── 500          REQ/USER/DAY      ●──── 3x           │
│                                    [12          ]                       │
│                                                                          │
│  AVG INPUT TOK              AVG OUTPUT TOK           PRECISION         │
│  [4,096      ]             [800         ]           [INT4    ▾]       │
│                                                                          │
│  SLA TIER                   TTFT TARGET                                │
│  [Tier 1 — Interactive ▾]  [<200ms              ]                     │
│                                                                          │
│  ▸ Agentic workflow (optional — collapsed unless UC is agentic)        │
│                                                                          │
│  ┌─── DERIVED SIZING ──────────────────────────────────────────────┐  │
│  │  P95 RPS: 0.21   Concurrent: 1   TP_i: 4 GPUs                    │  │
│  │  Base: 4 GPUs  +Buffers: 8  Total: 12 GPUs                       │  │
│  │  = 1 rack (partial)  ·  3.2kW                                     │  │
│  │                                                                    │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │ ✓ SLA MET — TTFT 180ms vs 200ms target (10% margin)        │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ▸ Make vs Buy — On-prem vs API (Section 8 chart, this UC's context)  │
│                                                                          │
│  [Remove]                                              [▴ Collapse]   │
└──────────────────────────────────────────────────────────────────────┘
│ Crop Disease Detection  │ 50,000 │ H200  │ 3    │ 0.9kW │ ✓ Met  │  ▸   │
└────────────────────────┴────────┴───────┴──────┴───────┴────────┴──────┘
```

### Field type rules (slider vs dropdown vs number input)

| Field | Type | Why |
|---|---|---|
| Domain | Dropdown | Categorical, drives UC library filtering + model recommendation |
| UC Library Match | Dropdown (+ ad-hoc) | Pick existing UC or define new |
| AI Model | Dropdown | Categorical (103 in model_catalogue), filtered by domain/precision |
| UC Type | Dropdown | Categorical (Chatbot/Text/RAG/Vision/Agentic/Batch/Voice) — drives RAG field visibility and SLA defaults |
| Tenant | Dropdown (+ new) | Which customer/department this workload serves — see Section 10 |
| DAU | Slider (log scale) | Biggest single lever on sizing — seeing GPU count change while dragging is the point |
| Peak multiplier | Slider (1x–10x) | Continuous range, impact-driven exploration |
| Requests/user/day | Number input | User typically knows this precisely from UC library or direct knowledge |
| Avg input/output tokens | Number input | Same — known value, not an exploratory range |
| RAG retrieval latency budget | Number input (conditional) | Only shown when UC Type = RAG; subtracted from TTFT target before generation budget calculated |
| GPU | Dropdown | Categorical (12 options) |
| Precision | Dropdown | Categorical (FP16/INT8/INT4/FP4) |
| SLA tier | Dropdown | Categorical (Tier 1/2/3) |
| HA / Failover | Dropdown | None / N+1 / 2N — maps to SizingEngine's existing `ha_required` param, previously had no UI |
| DR Type | Dropdown | None / Warm Standby / Active-Active — maps to existing `dr_type` param, previously had no UI |
| Deployment mode / Model hosting | Radio toggle (2 options) | Binary choice, not a range |

### RAG indicator — visual treatment (corrected 30 June 2026)

Not a buried dropdown value — a visible badge on both the summary table row
and inside the expanded form, since RAG genuinely changes sizing
characteristics (retrieval latency adds to the TTFT budget before
generation even starts):

```
Summary table:  GLOF Early Warning System  🔍 RAG    [other columns...]

Expanded form, when UC Type = RAG, shows an additional highlighted field:
  Retrieval Latency Budget (ms)
  "RAG-enabled — this latency is subtracted from TTFT target before
   the generation budget is calculated, so the SLA banner reflects
   the true generation-only budget."
```

### Real-time SLA verification (live on every field change)

Not a quiet line inside the sizing panel — a dedicated, colour-coded banner,
impossible to miss, exactly matching the pattern from Inferencing Factory's
`renderPerf`/TTFT display:

```
✓ SLA MET     — green banner, shows margin (e.g. "10% margin")
✗ SLA BREACH  — red banner, shows overage % AND an actionable hint:
                 "Try: lower precision, add GPU, raise SLA tier"
```

Updates instantly on every input change — same call to
`SizingEngine.sizeUC()`/`sizeMaaS()` that updates the GPU count also
re-evaluates this banner, no separate logic path.

### Animation

Row expansion: smooth height transition on click (measured-height JS
transition, since dynamic form content makes pure CSS `max-height`
unreliable). Arrow rotates 90° on expand. Table rows below the expanded
one shift down smoothly rather than jumping. Collapse reverses the same
transition. Multiple rows may be expanded at once.

### Add-new flow

```
[+ Add UC Workload]   (shown only within the UCs tab)
[+ Add MaaS Pool]     (shown only within the MaaS tab)
[+ Add GPUaaS]        (shown only within the GPUaaS tab)
[+ Add BMaaS]         (shown only within the BMaaS tab)
```

**Section 9 prototype status: UCs tab built and confirmed (30 June 2026)
— Domain, AI Model, UC Type, RAG badge + conditional field, HA/Failover,
DR Type, Tenant dropdown all implemented. MaaS/GPUaaS/BMaaS tabs deferred
until Section 10 (Tenant modeling) is resolved, since they are coupled.**

---

## 10. Tenant Modeling (decided 30 June 2026)

### What problem this solves

Without tenant attribution, OPERATE is one undifferentiated cost bucket —
nobody can answer "what did Department X actually cost/consume," which
makes cost-recovery or chargeback commercially indefensible. It is also
the literal mechanism that makes a real, already-captured requirement
buildable: HAICE req-002 — *"Must serve all 50 government departments as
tenants with separate billing per department"* — currently has no
implementation path without this.

### Two consumption patterns, now confirmed as one consistent mechanism

A tenant can consume in either or both ways simultaneously:

| Pattern | Description | Maps to |
|---|---|---|
| **Curated UCs** | We size and run specific applications for the tenant (chatbot, document processing, GLOF warning) — tenant thinks in outcomes, not GPUs | UC tab, `tenant` field (already added) |
| **Raw capacity** | Tenant buys dedicated GPU/server capacity and runs their own workloads on it — tenant thinks in compute units, like a cloud VM | GPUaaS / BMaaS tabs |

### Pool type — corrected to apply uniformly across ALL four tabs

Initial framing treated GPUaaS/BMaaS as inherently "Reserved" by nature.
**Corrected:** Reserved vs Open is a genuine commitment/pricing dimension
that applies identically to all four consumption types — UC, MaaS,
GPUaaS, and BMaaS — matching the familiar cloud-market pattern (AWS
Reserved Instances vs Spot/On-Demand), which customers will recognise
without new explanation.

```
RESERVED (committed term)
  Tenure: 12mo / 24mo / 36mo / custom
  SLA: Enterprise
  Pricing: committed-use rate (lower $/unit)
  Capacity: guaranteed, dedicated, never contended

OPEN / SPOT (no commitment)
  Tenure: none (pay-as-you-go) or short-term
  SLA: Standard
  Pricing: on-demand rate (higher $/unit)
  Capacity: best-effort, shared pool, may be deprioritised at peak
```

This directly resolves the earlier MaaS confusion: **Standard vs
Enterprise SLA**, already present in the MaaS model per usage type, was
a property of the model offering with no tenant attached. Corrected
model — per model offered:

```
Model: Llama-3.3-70B
  OPEN POOL allocation       — X GPUs, Standard SLA, any tenant may call
  TENANT-RESERVED allocations — zero or more, one per reserving tenant:
      Tenant: State IT Dept   → Y1 GPUs reserved, Enterprise SLA, 24mo
      Tenant: Health Dept     → Y2 GPUs reserved, Enterprise SLA, 12mo
  TOTAL for this model = Open Pool (X) + Σ Tenant Reservations (Σ Yn)
```

GPUaaS/BMaaS gain the identical Reserved/Open toggle — a tenant buying
raw GPU capacity can commit to a 24-month reservation (lower rate,
guaranteed) or draw from an open/spot pool (higher rate, no commitment,
best-effort).

### Uniform Tenant block — same fields, all four tabs

```
TENANT
  Tenant identity          [dropdown / + new]
  Pool type                 ⦿ Reserved   ○ Open/Spot
  IF Reserved: Tenure       [12mo / 24mo / 36mo / custom]
  Chargeout model           [Commercial / Cost-recovery / Subsidised / Zero]
  Security tier             [S1 / S2 / S3 / S4]
```

Matches `tenant_configs` table already defined in blueprint Section 25
(`oversubscription_factor`, `chargeout_model`, `security_tier` fields
anticipated there, never previously wired to a UI).

### Value confirmed (30 June 2026 discussion)

For the seller: per-tenant cost attribution is the foundation of any
chargeback model, and is pure upside on the BOM/commercial side — same
sizing work, richer output. For the buyer: defensible internal chargeback
("here's exactly what Department X cost"), and genuine choice between
curated low-complexity UCs vs raw capacity for their own data science
teams, plus a familiar Reserved/Spot commitment trade-off they already
understand from cloud experience.

### Schema implication

`tenant_configs` (blueprint Section 25) extended with:

```sql
ALTER TABLE tenant_configs
  ADD COLUMN IF NOT EXISTS pool_type     text DEFAULT 'open'
    CHECK (pool_type IN ('reserved','open')),
  ADD COLUMN IF NOT EXISTS tenure_months int;  -- null if pool_type = 'open'
```

`workload_configs` (Section 6) extended with:

```sql
ALTER TABLE workload_configs
  ADD COLUMN IF NOT EXISTS tenant_id text;  -- FK to tenant_configs, null = unattributed
```

**Tenant block prototype status (30 June 2026): built and confirmed working
identically across UC, MaaS, and GPUaaS tabs — Tenant Management panel,
Pool Type toggle (Reserved/Open), conditional Tenure dropdown, auto-derived
SLA, security tier and chargeout display, all via one shared
`renderTenantBlock()` function. See Section 11 for the MaaS-specific engine
reconciliation that followed.**

---

## 11. MaaS Sizing — Model-Driven, Not Archetype-Driven (decided 30 June 2026)

### Source of truth discovered

`standards/MaaS_Sizing_Notes.md` — a detailed implementation log against an
"Infrastructure Sizing Blueprint for Model-as-a-Service," last updated
26 June 2026, predates this Workload Profiler prototype and contains the
authoritative `sizeMaaS()` formula derivation (V_catalog, TP_i/B_max/I_i
three-step sizing, three-layer buffer model, host-level RAM/NVMe sizing).
This document is the formula source of truth — this spec section records
how the Workload Profiler design reconciles with it.

### The conflict found and resolved

The live `sizeMaaS(config, gpuConfigId)` engine required `archetype_id`
(one of 8 `requirement_archetypes` — Text/Chat, Coding, Document, Audio,
Indic, Generic) as the **primary required input**, with `model_id` used
only to read `params_b`. This directly conflicted with the Tenant/per-model
redesign already underway in this spec, and with a direct objection:
*"When I buy API from Gemini/Claude we don't buy for an archetype, no?"*
— correct. No commercial API product is purchased by abstract usage-type
category; a specific model is always the unit of purchase.

**Resolved: `model_id` is now the primary required input. `archetype_id`
is optional, preset-only — pre-fills demand-shape fields once when a row
is first created, never required, never a stored dependency.**

```javascript
// Demand-shape resolution order (shared/sasc-sizing.js, sizeMaaS()):
reqPerDay   = config.requests_per_day
            || model.default_requests_per_day        // from model_catalogue
            || presetCfg.requests_per_user_per_day    // optional archetype preset
            || 5                                       // hardcoded fallback
// avg_input_tokens, avg_output_tokens, context_window_k follow the same
// explicit -> model default -> optional preset -> fallback order
```

`requirement_archetypes` is not deleted — it remains usable as a
quick-start preset (same UX pattern as the UC tab's complexity-tier
buttons), but the engine no longer requires it and never stores it as a
dependency on the sized result.

### Pool type now drives SLA tier directly

The existing Standard/Enterprise SLA distinction in `sizeMaaS()`
(TTFT 2000ms vs 1000ms, different buffer percentages) is preserved exactly
as documented in `MaaS_Sizing_Notes.md` — but is now explicitly derived
from the Tenant block's Pool Type (Section 10), closing the loop between
the two design threads:

```
pool_type = 'reserved'  →  sla_tier = 'enterprise'  (unless explicitly overridden)
pool_type = 'open'      →  sla_tier = 'standard'    (default)
```

### Pass-through / upstream API reselling — dropped from MaaS entirely

Considered and rejected for Phase A (30 June 2026 discussion):

**Against:** introduces a third-party billing/reselling relationship with
real commercial complexity (upstream contracts, margin stacking, outage
liability), and directly undermines the sovereignty pitch central to most
archetypes (TSAP, Defence) — "your data stays on sovereign infrastructure"
is incompatible with a MaaS catalogue entry that silently calls a US-based
upstream API. It also does zero GPU sizing work, making it an architectural
distraction inside a tool whose purpose is GPU sizing.

**For (acknowledged, not pursued now):** real commercial pattern (Azure AI
Foundry, AWS Bedrock model marketplaces), gives access to frontier
closed-weight models without us needing GPU capacity for them.

**Decision: every MaaS row is self-hosted by definition. The
Self-hosted/Pass-through toggle is removed entirely from the Workload
Profiler.** If wanted later, pass-through belongs in **B5I — AI API
Marketplace** (already a distinct portfolio item from B5E MaaS in the
blueprint), built as a clearly separate, clearly-labelled capability —
logged to `ATLAS_Feature_Backlog.md`, not built now.

### Model Tier dropdown also removed (same redundancy as Archetype)

A separate "Model Tier" (Basic/Mid/Advanced) dropdown was also found
redundant once Model is the primary selector — a specific model like
Llama-3.3-70B already implies its tier. Tier is now derived from the
selected model (by parameter count) for internal sizing logic only, never
shown as a separate user-facing input.

### What stays exactly as documented (no change needed)

Confirmed correct, carried forward unchanged from `MaaS_Sizing_Notes.md`:
the three-step formula (V_catalog → TP_i/B_max/I_i → buffer layers),
75-80% derating guardrail, RAM 2-3× VRAM / NVMe 20TB-per-node host sizing,
Multi-LoRA and shared-VRAM pooling correctly deferred (Phase 1 scope
decision, independently matches this spec's Option A pooling deferral —
see Section 7, item 1 backlog reference).

### Known gap carried forward (not solved here, not forgotten)

`host_sizing` (RAM/NVMe) is computed by `fleetTotal()` but explicitly
flagged in the source document as **"Pending — not yet wired to
calculateBOM()."** This predates this spec and remains open — logged to
`ATLAS_Feature_Backlog.md` so it is not lost a second time.

### Engine change applied (30 June 2026)

`shared/sasc-sizing.js` `sizeMaaS()` rewritten and pushed to `main`:
model-driven demand resolution, pool_type→SLA derivation, return shape
updated (`model_id`/`model_name`/`pool_type` replace `usage_type`),
`fleetTotal()` allocation label updated to match. Workload Profiler
prototype (v4) updated to match: Model dropdown replaces Archetype and
Model Tier, Self-hosted/Pass-through toggle removed entirely.

**Section 11 status update (same day, later): see Section 12 — the SLA
model in this section's engine change was further refined from a
collapsed Standard/Enterprise mapping to the correct Bronze/Silver/Gold
three-tier model, once original MaaS architecture discussion notes were
recovered and reviewed.**

---

## 12. MaaS — Original Architecture Recovered & Reconciled (30 June 2026)

### Source

A substantial prior design conversation (pre-dating this spec) was
recovered and reviewed in full: bottom-up/top-down/crossover sizing
methodology, complete model catalogue with licensing rationale, GPU
catalogue, pricing model evolution (subscription bundles considered and
explicitly rejected), free trial spec, and chatbot/harness infrastructure
scope (considered and explicitly rejected). This section reconciles that
recovered design against everything built today.

### Confirmed unchanged — already aligned with today's work

**API/consumption-only pricing** — locked in the original discussion
after explicitly weighing subscription bundles against pure consumption.
Subscription was rejected because it forces ownership of a chatbot UI,
intent classifier, and usage-specific harnesses (RAG, code sandbox, audio
pipeline) — a SaaS product build outside the OEM's infrastructure lane,
6-12 months of extra engineering, and weakens the sovereignty pitch
("customer's application, not ours" — confirmed, matches today's pass-
through rejection in Section 11 for the same underlying reason).

**No harness/chatbot infrastructure costs** — confirmed explicitly out
of scope. Customer brings their own application and harness; we expose
clean metered API endpoints only. Confirmed again 30 June 2026 — no
intent classifier, RAG infrastructure, or per-request overhead cost
modelling anywhere in `sizeMaaS()`.

**GPU catalogue** — 9 NVIDIA (H200 through Vera Rubin NVL72) + 3 AMD
(MI355X, MI400X placeholder, Instinct Helios placeholder) = 12 total.
Matches what is already seeded in `gpu_configs` (confirmed earlier this
engagement). No change needed.

### Confirmed superseded — explicit decision, not silent override

**SLA tiers — Bronze / Silver / Gold confirmed correct (30 June 2026),
supersedes the original discussion's "Standard and Enterprise only, don't
make it too complex" instruction.** The original instruction predates the
discovery that `model_catalogue` already has dedicated
`sla_bronze/silver/gold_ttft_ms` and `sla_bronze/silver/gold_uptime_pct`
columns — real schema, not invented. Explicitly reconfirmed today rather
than silently picked.

```
Commercial SLA (customer-facing, what we sell):
  Bronze  — default for Open pool tenants, best-effort
  Silver  — available to Reserved tenants, mid-tier guarantee
  Gold    — available to Reserved tenants, highest guarantee
  (sourced directly from the selected model's own sla_<tier>_ttft_ms
   and sla_<tier>_uptime_pct columns — varies per model, not a flat
   platform-wide constant)

Internal buffer tier (implementation detail, NOT shown to customer):
  standard  — bronze/silver tenants, lighter peak/failover buffers
  enterprise — gold tenants, dedicated failover block, heavier buffers
  (this is the ORIGINAL standard/enterprise concept — repurposed as
   an internal sizing parameter rather than the customer-facing tier
   name, resolving the apparent conflict without losing either concept)
```

**Free trial — confirmed dropped, not implemented.** Fully specified in
the original discussion (15 days, 1M tokens, Bronze/Standard only, hard
stop, one per organisation) but explicitly removed from scope 30 June
2026. Not present in Tenant block Pool Type options (only Reserved/Open).
If reinstated later, the original spec is preserved here for reference —
no need to redesign from scratch.

### Model catalogue — real list now in prototype

Workload Profiler's placeholder `MODELS` object replaced with the
confirmed catalogue from the original discussion, organised by usage
type, n/n-2 versioning, clean-licence-only rule (Apache 2.0 / MIT /
Qwen licence; Llama community licence clean at sovereign scale; Sarvam
commercial terms to be verified before customer-facing use):

| Usage Type | Models |
|---|---|
| Coding | DeepSeek-Coder-V2 Lite 16B / 236B, Qwen2.5-Coder 32B / 72B |
| Text/Chat | Llama 3.1 8B / 3.3 70B / 3.1 405B, Mistral Small 3.1 24B / Large 2 123B |
| Document | Qwen2.5 7B / 32B / 72B |
| Audio | Sarvam Whisper S / M / Large, Whisper Large-v3 (MIT, on-prem OK) |
| Indic/Regional | Sarvam-2B, Sarvam-M |
| Generic | Same Llama/Mistral families as Text/Chat, different deployment context |

### Bottom-up / Top-down / Crossover — reframing Sections 8 and the
### deferred What-If layer

The original discussion's bottom-up (supply→capacity) and top-down
(demand→infrastructure) framework, with crossover as the headline
insight, is recognised as the **same underlying methodology** already
present in two places in this spec, not a third competing design:

- **Make vs Buy (Section 8)** is the crossover applied to *cost*: our
  on-prem cost curve vs market API price, crossing at a breakeven
  utilisation point.
- **What-If GPU Architecture Comparison** (raised, not yet built — see
  `SASC-Requirements-Modelling-Gap-Analysis.md` Three-Layer Simulation,
  Layers 1-3) is the crossover applied to *capacity*: supply curve (GPU
  architecture → users supportable) vs demand curve (users → throughput
  needed), per architecture.

Both are legitimate, complementary lenses on the same crossover idea —
cost-crossover and capacity-crossover — not duplicated effort. The
Three-Layer Simulation (architecture comparison, usage-heatmap,
mix-optimiser) remains a real, valuable, partially-built capability from
prior work, paused for explicit reconciliation before building — status:
**paused, not designed into this spec yet, pending a dedicated session.**

### Engine changes applied (30 June 2026, this session)

`shared/sasc-sizing.js` `sizeMaaS()`: `commercial_sla` parameter
(bronze|silver|gold) replaces the earlier collapsed `sla_tier`
(standard|enterprise) as the customer-facing field; sourced from the
selected model's own SLA columns. Internal `slaTier` variable retained
but now derived (bronze/silver→standard buffers, gold→enterprise
buffers) rather than directly set. Demand-shape fallback chain corrected
to use real `model_catalogue` columns (`max_input_tokens`,
`max_output_tokens`, `context_length_k`) — the previous version
referenced invented `default_*` columns that do not exist in the schema.

Workload Profiler prototype (v5): real model catalogue replaces
placeholder list; MaaS form's SLA Tier dropdown replaced with a
derived-from-Pool-Type display (Bronze shown read-only for Open pool;
Silver/Gold selectable for Reserved tenants); Tenant block's SLA line
updated to show Bronze/Gold instead of Standard/Enterprise.

**Section 12 status update (same day, immediately after): see Section 13
— What-If / Bottom-up-Top-down-Crossover is UN-PAUSED. Confirmed in
scope for the current build, not deferred to a later session. Free
trial remains dropped (unchanged from Section 12).**

---

## 13. What-If — Bottom-up / Top-down / Crossover (un-paused 30 June 2026)

### Status change

Section 12 paused the full Three-Layer Simulation pending a dedicated
session. On reflection: the bottom-up/top-down/crossover methodology and
GPU architecture comparison (Layers 1) are core to how MaaS/UC sizing
should be presented — not an optional add-on — and are now **confirmed
in scope for the current build**, not deferred. Layer 2 (usage heatmap)
and Layer 3 (mix optimiser) remain fleet-level, scoped separately below.

**Free trial: confirmed dropped, unchanged from Section 12. Not part of
this un-pausing.**

### Three pieces — scoped against what already exists

```
PIECE 1 — Bottom-up / Top-down / Crossover (per Workload Profiler row)
  Lives inside EVERY UC and MaaS row, alongside Make vs Buy (Section 8).
  Top-down (already built): DAU → GPU count (existing sizeUC/sizeMaaS)
  Bottom-up (NEW): for the row's chosen GPU, what is the maximum
    capacity (users/throughput) that configuration can serve?
  Crossover: plot both on one chart, mark the intersection — the point
    where demand exactly consumes available supply.

PIECE 2 — What-If: GPU Architecture Comparison (per row)
  Select 1-5 GPU architectures, show Piece 1's crossover for EACH,
  side by side, in a comparison table. Answers: "which GPU is cheapest
  for THIS workload's demand?"
  Reuses SizingEngine.sizeUC()/sizeMaaS() called once per selected GPU
  — no new engine math beyond Piece 1's bottom-up formula. Cheapest
  piece to build once Piece 1 exists.

PIECE 3 — What-If: Usage Heatmap + Mix Optimiser (Fleet Aggregation only)
  Requires seeing the whole solution's model mix simultaneously — only
  meaningful at S4 Fleet Aggregation, not per-row. Remains a separate,
  later scope item (not part of this un-pausing) — genuinely needs the
  full set of Workload Profiler rows populated first before a mix
  hypothesis means anything.
```

### Piece 1 — bottom-up formula (the missing half of sizing)

```
TOP-DOWN (existing, already in sizeUC/sizeMaaS):
  DAU → peak_concurrent → RPS → GPU count needed

BOTTOM-UP (new — runs the same formula in reverse):
  GPU architecture + GPU count → max throughput (tokens/sec)
  → max concurrent sessions supportable → max DAU supportable

CROSSOVER (the visualisation):
  X-axis: concurrent users (0 to max)
  Supply curve: flat/step line — max users this GPU configuration supports
  Demand curve: linear — DAU × requests/day × tokens/request
  Intersection: point where demand exactly consumes available supply
  Below intersection: headroom (serving capacity to spare, or
    over-provisioned — worth flagging either way)
  Above intersection: SLA breach risk — demand exceeds what was sized
```

**New engine function required:** `shared/sasc-sizing.js` needs a
reverse-calculation — given a GPU architecture and count (rather than a
demand figure), return maximum supportable capacity. Proposed signature:

```javascript
SizingEngine.capacityForGPU(gpuConfigId, gpuCount, modelConfig)
// modelConfig: same shape as sizeUC/sizeMaaS config (model_id, precision,
// context, sla parameters) MINUS the demand fields (dau, requests_per_day)
// Returns: { max_concurrent_sessions, max_throughput_tps, max_dau_estimate,
//            ttft_at_max_load_ms, audit: {...} }
```

This is genuine new engine logic — not a UI-only change — and must be
built before either the prototype crossover chart or the GPU comparison
table can show real (not placeholder) numbers.

### Piece 2 — GPU Architecture Comparison

```
Within the row's expanded form, alongside Make vs Buy (Section 8):

▸ What-If — GPU Architecture Comparison
  Select GPUs to compare (checkboxes, up to 5 of the 12 available):
  ☑ H200  ☑ B200  ☐ GB200 NVL72  ☐ VR NVL72  ☐ MI355X  ...

  Chart: same crossover pattern as Piece 1, one supply line per
  selected GPU, demand line shared across all (same row's demand)

  Table beneath chart:
    GPU         | Max users @ demand | GPUs needed | Cost  | $/user
    H200        | 850                 | 12          | $2.1M | $2,470
    B200        | 1,400               | 8           | $2.8M | $2,000
    GB200 NVL72 | 2,100               | 6           | $4.2M | $2,000
  Cheapest configuration that meets demand highlighted automatically.
```

Implementation: call `SizingEngine.sizeUC()`/`sizeMaaS()` once per
selected GPU with the row's existing demand config, varying only
`gpuConfigId`. No new sizing math needed for this piece beyond Piece 1's
bottom-up function (used to draw each GPU's supply curve).

### Where this lives — extending the established UI pattern

```
Every UC and MaaS Workload Profiler row gains a THIRD collapsible
section, alongside the two already specified in Section 9:

  ▸ Make vs Buy — On-prem vs API                  [Section 8, built]
  ▸ Capacity — Bottom-up vs Top-down Crossover     [NEW — Piece 1]
  ▸ What-If — GPU Architecture Comparison          [NEW — Piece 2]

Fleet Aggregation (S4) — Piece 3 remains separate future scope:
  ▸ Make vs Buy — Combined Fleet                   [Section 8, built]
  ▸ What-If — Usage Heatmap + Mix Optimiser         [Future, fleet-level]
```

### Build sequence for this section

```
1. Engine — shared/sasc-sizing.js: add capacityForGPU() reverse
   calculation. Required before any chart shows real numbers.
2. Prototype — Workload Profiler: add Capacity crossover chart
   (reuses Make vs Buy's SVG curve rendering pattern) and What-If
   GPU comparison table to every UC/MaaS row.
3. Validate visually with dummy data first (same V-before-wiring
   discipline as everywhere else in this build) — confirm the chart
   and table layout read correctly before wiring to the real engine
   function from step 1.
```

**Next step: build the engine's `capacityForGPU()` function first (Piece
1's foundation), since both the Capacity crossover chart and the What-If
comparison table depend on its output shape.**

---

## 14. Fleet Commercial Yield — MaaS Catalogue Planning (decided 1 July 2026)

### The insight

Current sizing runs supply → demand: "given these use cases, size me a fleet."
This section captures the reverse: "given a fleet (planned or deployed), what
MaaS catalogue, pricing, and customer volume makes it commercially viable?"
Two distinct scenarios, same underlying fleet headroom calculation.

### Scenario 1 — Top-down commercial planning (pre-deployment)

```
Input:
  Planned fleet size (GPU count, from BOM)
  UC + GPUaaS committed allocations (sized workloads)
  Failover/HA reserve % (typically 20-30%)
  Target gross margin %
  Market reference prices (model_catalogue.price_input/output_per_1m)
  Proposed discount % per model (vs market)
  Average customer consumption (tokens/month, by segment)

Output:
  Available MaaS GPU pool (fleet - committed - failover)
  Token throughput available per model (from benchmark_results or estimate)
  Our price per model = market × (1 - discount%)
  Monthly token volume needed to hit margin target
  Customer count needed = volume / avg_consumption
  Suggested catalogue mix (which models, at what discounts)

Use case:
  Board / investor conversation, bid pricing, capacity planning
  "Your 10MW sovereign AI platform needs N customers consuming
   Y million tokens/month at Z pricing to reach target margin"
  Runs once, feeds into the proposal document
```

### Scenario 2 — Inventory yield management (post-deployment)

```
Input:
  Actual fleet utilisation (from SLA Monitor / observability stack)
  Current pricing per model
  Headroom = available_capacity - current_demand (live or estimated)

Output:
  Which models are underutilised and by how much?
  At what discount level would incremental demand fill the gap?
  Revenue impact of a seasonal/promotional push at X% discount
  Break-even: does the incremental revenue at lower price exceed
  the opportunity cost of idle GPU capacity?

Use case:
  Operator revenue management dashboard
  "Model X is at 40% utilisation. A 25% seasonal discount would
   attract N new customers and improve gross margin by Y% vs
   leaving GPUs idle"
  Runs continuously — triggered by utilisation falling below
  a configurable threshold (e.g. <60% for 24hrs)
```

### Link to SLA Monitor

Underutilisation (Scenario 2) is the mirror image of SLA breach risk
(SLA Monitor). Same fleet utilisation data, opposite direction:
- Utilisation too HIGH → SLA breach risk → scale up or throttle
- Utilisation too LOW  → yield opportunity → promotional push or price cut

The Fleet Yield tool should receive alerts from the SLA Monitor layer
rather than polling independently.

### Dependencies before building

```
Required (block build):
  fleetTotal() in sasc-sizing.js: EXISTS — needs to be called from
    Solution tab and exposed as M.fleetHeadroom
  UC + GPUaaS workloads wired to real Supabase data (Controller wiring)
  model_catalogue.price_input/output_per_1m confirmed as market
    reference prices (confirmed 30 June 2026)
  margin_pct / discount_pct in Settings (not yet built)
  Customer consumption model: avg tokens/month per segment
    (light/medium/heavy — new, no table yet)

Preferred (improve accuracy):
  benchmark_results populated with measured throughput
    (otherwise headroom uses estimated tok/s baseline)
  SLA Monitor operational (for Scenario 2 trigger)
```

### Placeholder V shell

Tab key: `fleetyield` — visible in Solution tab bar as "Fleet Yield",
opens `renderComingSoon('fleetyield')` showing both scenarios, their
inputs/outputs, and all dependencies. Stage 2: fill in M + C.

**This is a Stage 2 build item, not Phase A. Captured here so the
design intent and both scenarios are not lost between sessions.**
