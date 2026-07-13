# PRAXIS Calculation Modules

**Status:** Active · **Layer:** Model (MVC) · **Location:** `tools/praxis/index.html` (extractable to separate JS)

## Principle

Calculation lives in **domain modules**. Views (Scope, Workloads, Arch, Perf, Tok, BOM, Yield) and the KPI bar are **consumers** — they read from the Model, never calculate. `praxisSizing()` is a pure **dispatcher + aggregator**: it loops workloads, calls the right module, and sums results. This prevents engine drift (the historical UC=32-vs-BOM=72 bug came from two parallel engines).

The Model lives in memory (`M.workloads` + the modules). Editing is instant (memory/cache); persistence to Supabase is a separate, deliberate snapshot step.

## Modules

### 1. `calcInferencing(w)` — Use Cases (UC)
On-prem/hybrid inference sizing. May use **batch** tokens. UC-specific latency/throughput (TTFT/TBT/E2E) and SLA rules. Returns per-workload `det` + GPU/cost/power contribution.

### 2. `calcMaaS(w)` — Model-as-a-Service
**Separate from UC by design:** streaming/online tokens (not batch), **tenancy**, consumption/DAU-driven demand, `$/Mtok` economics, provisioned-GPU overrides, MaaS-specific latency/throughput semantics. Currently mirrors the inference core (`_calcInferenceCore`) but will diverge — **MaaS-specific rules go in this module, not the shared core.**

### 3. `calcBlock(w)` — BM + GPUaaS
Raw GPU/server allocation, **no token sizing**. GPUaaS = GPU count → servers; BMaaS = server count → GPUs. Both round to the GPU unit (`gpus_in_unit`).

### Shared: `unitRound(demandGpus, gpuId)` — Unit / MOQ
The **single** place unit rounding happens. `unit = gpus_in_unit` from the GPU catalogue (8 SXM, 72 NVL72, 144 future). Rounds demand **up** to whole units: `provisioned = ceil(demand/unit) × unit`. Flags `moqRounded` when `provisioned ≠ demand` (i.e. demand not a clean multiple) → drives the `*` marker + BOM footnote. Used by all modules AND (later) the post-yield BOM rebuild.

## BOM = Aggregator

BOM performs **no calculation**. It sums module `det[]` outputs and applies Unit/MOQ at the aggregate level. Displays the `*` + footnote for MOQ-rounded workloads.

## Yield (TODO — next iteration)

- Yield is a **per-workload factor** (differs across workloads), not a global multiplier.
- Applying yield changes effective capacity → **BOM must be rebuilt** post-yield.
- **Unit/MOQ re-applies** on the post-yield BOM (rounding is not one-and-done).
- Yield calc will become its own module (`calcYield`) documented here.

## Rules for changes

- New sizing logic goes in the **owning module**, never inline in `praxisSizing` or a view.
- Shared math that UC + MaaS genuinely share stays in `_calcInferenceCore`; anything type-specific goes in `calcInferencing` / `calcMaaS`.
- Unit rounding **only** via `unitRound()` — never reimplement per module.
