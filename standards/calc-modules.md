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

### Shared: Unit / MOQ + single provisioning point

**`unitRound(demandGpus, gpuId)`** — the **single** place unit rounding happens. `unit = gpus_in_unit` **from the GPU catalogue (the database)** — the packaging granularity of that specific architecture: 72 (VR NVL72 rack), 8 (SXM server), 4 (VR NVL4 blade), 2 (2-GPU server), etc. **Always follow the DB unit** — never hardcode 8 or assume. Rounds **up**: `provisioned = ceil(demand/unit) × unit`. Flags `moqRounded` when `provisioned ≠ demand` → drives the `*` marker + BOM footnote.

**`provisionGpus(rawDemand, gpuId, w)`** — the single provisioning pipeline: `rawDemand × yieldFactor(w) → unitRound (ONCE)`. Modules pass **raw (unrounded) demand**; this applies yield then rounds exactly once.

**`gpusPer` (server/unit size) also = `gpus_in_unit`** — the same DB unit drives both MOQ rounding and the server/power/cost math. No separate capped assumption.

#### ⚠️ ROUND ONCE — never twice
Rounding happens **once, AFTER yield**, on the yield-adjusted demand:
```
raw demand 38  →  × yield 1.2  →  45.6  →  unitRound(72-unit)  →  72   ✓
```
NOT:
```
38 → round → 72 → × 1.2 → 86.4 → round again → 144   ✗ (double rounding, wrong)
```

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
