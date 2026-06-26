# MaaS Sizing Implementation Notes
## Against: Infrastructure Sizing Blueprint for Model-as-a-Service (MaaS)

*Last updated: 2026-06-26 | SizingEngine v3 — sizeMaaS() rebuilt to blueprint spec*

---

## Blueprint Coverage Status

### Section 1 — Factors Influencing MaaS Infrastructure Size

| Factor | Blueprint Requirement | Implementation Status |
|---|---|---|
| Catalog Dynamics & Model Heterogeneity | Size for multiple models across usage types | ✅ 6 usage types in requirement_archetypes, each sized independently |
| Dedicated vs Shared VRAM | Dedicated provisioning model (low complexity, high isolation) | ✅ Each usage type gets its own GPU allocation (dedicated pool) |
| Base Model + Multi-LoRA | LoRA adapters near-zero extra memory | 🟡 Not modelled — LoRA delta (~50-200MB) negligible vs base model, omitted by design |
| Traffic Profiles & SLA | Peak concurrent requests govern KV cache; TTFT targets require dedicated resources | ✅ B_max derived from TTFT SLA; Enterprise vs Standard SLA tiers |
| Networking & Topology | TP via NVLink for models spanning cards; PP via IB across servers | ✅ TP_i computed (GPUs per instance); PP implicit in I_i × TP_i; network sizing in BOM |

---

### Section 2 — The MaaS Sizing Formula Framework

#### Step 1: Catalog Memory V_catalog

**Blueprint formula:**
```
V_catalog = Σ(W_i × Instances_i) [dedicated] + Σ W_j [shared] + Σ Size(LoRA_k)
```

**Implementation (sizeMaaS + calcVCatalog):**
```javascript
W_i       = params_b × BYTES_PER_PARAM[precision]   // model weights at chosen precision
KV_pool   = exact: 2×L×H_kv×D_head×C×B_max×2bytes  // per instance (KV always FP16)
            fallback: field rule (MB/token × context × B_max / 1024)
VRAM_inst = (W_i + KV_pool) × 1.20                  // +20% framework overhead

// Cross-catalog check in calcVCatalog():
V_catalog = Σ(W_i × I_i)  // summed across all active usage types
```

**Status:** ✅ Implemented. `calcVCatalog(maasResults)` returns total catalog VRAM and per-type breakdown.

---

#### Step 2: Traffic-Driven Concurrency

**Blueprint formula:**
```
I_i = ⌈(Peak_Concurrency_i × Avg_Context_Window) / (B_max_sla × KV_Cache_per_Instance)⌉
VRAM_instance = W_i + KV_Cache_Pool + Framework_Overhead
```

**Implementation:**
```javascript
// Tensor Parallelism — GPUs to host one instance
TP_i = ceil(VRAM_instance / GPU_vram_per_gpu)

// B_max_sla: max concurrent requests before TTFT SLA violated
// Derived from GPU throughput at chosen precision and SLA tier
tflops_instance  = (tflops_per_gpu × TP_i) × (derating/100)
throughput_inst  = tflops_instance × 1e12 / (2 × params_b × 1e9)   // tokens/sec
B_max = floor(throughput_inst × ttft_sla_ms/1000 / avg_output_tokens)
  // Standard SLA: ttft_sla_ms = 2000ms
  // Enterprise SLA: ttft_sla_ms = 1000ms  ← tighter = smaller B_max = more instances

// KV cache refined with known B_max (not over-provisioned for full peakConcurrent)
KV_pool_refined = calcKVCache(model, contextLen, B_max, precision)

// Instance count
I_i = ceil(peak_concurrent / B_max)

// Base GPU count — the formula that was previously missing
base_gpus = I_i × TP_i
```

**Key change from previous version:** Previously used `max(gpus_for_fit, gpus_for_throughput)` which conflated TP_i and I_i. Now correctly computes them independently and multiplies.

**Status:** ✅ Implemented. `sizeMaaS()` result now exposes `tp_i`, `b_max`, `i_i`, `base_gpus = i_i × tp_i`.

---

#### Step 3: Infrastructure Count

**Blueprint formula:**
```
TP_i (already computed above)
Total GPUs = Σ(I_i × TP_i)
Total Server Nodes = ceil(Total GPUs / GPUs_per_node)
```

**Implementation:**
```javascript
// Three SLA buffer layers on top of I_i × TP_i base
peakBuffer      = ceil(base_gpus × headroom_pct/100)   // 25% standard, 30% enterprise
failoverReserve = ceil(base_gpus × failover_pct/100)   // 15% standard, 30% enterprise
multiTenancy    = ceil(base_gpus × 12/100)             // 12% isolation overhead
total_gpus      = base_gpus + peakBuffer + failoverReserve + multiTenancy
```

**Utilisation cap:** 75-80% GPU utilisation enforced via `derating_pct` (default 80%) — matches blueprint's "production guardrail for dynamic context routing."

**Status:** ✅ Implemented. Packaging (nodes/racks) deferred to BOM — sizing outputs raw GPU count only.

---

### Section 3 — Host-Level Memory & Storage Hierarchy

| Component | Blueprint Requirement | Implementation |
|---|---|---|
| System RAM | 2×–3× total GPU VRAM per node; holds inactive weights in vLLM Level-1 Sleep | ✅ `fleetTotal()` returns `host_sizing.ram_min_gb` (2×) and `ram_rec_gb` (2.5×) |
| Local NVMe | PCIe Gen5 RAID-0, >10 GB/s read per node | ✅ `host_sizing.nvme_total_tb` (20TB/node) and `nvme_per_node_tb` |
| BOM integration | RAM and NVMe feed into BOM line items | 🟡 Pending — values computed, not yet wired to calculateBOM() |

---

## What Is Not Yet Modelled (Intentional Scope Decisions)

| Item | Reason Not Modelled |
|---|---|
| Multi-LoRA adapters | LoRA delta 50-200MB per adapter — negligible vs base model VRAM at proposal stage |
| Shared VRAM (vLLM packing) | Dedicated provisioning chosen for simplicity and isolation (Phase 1) |
| Pipeline Parallelism (PP) | PP across servers relevant only for 100B+ models on small GPUs — TP handles within-node sharding |
| Auto-scaling / cold start | Modelled via B_max_sla and vLLM Sleep headroom in RAM sizing |
| Per-model benchmark data | `benchmark_results` table ready; currently uses formula-based throughput estimate |

---

## Key Constants & Defaults

| Parameter | Value | Source |
|---|---|---|
| Framework overhead | × 1.20 | RUNTIME_OVERHEAD constant |
| KV cache dtype | FP16 (2 bytes) always | Industry standard — vLLM keeps KV in FP16 even at INT4 weights |
| Derating (GPU utilisation cap) | 80% default | Blueprint: 75-80% for dynamic context routing |
| TTFT SLA — Standard | 2,000ms | `sizeMaaS()` default |
| TTFT SLA — Enterprise | 1,000ms | `sizeMaaS()` enterprise tier |
| RAM sizing ratio | 2.0× min, 2.5× rec | Blueprint: "2× to 3× total VRAM" |
| NVMe per node | 20TB | PCIe Gen5 RAID-0 estimate |
| Peak headroom — Standard | 25% | `requirement_archetypes.config.peak_headroom_pct_standard` |
| Peak headroom — Enterprise | 30% | `requirement_archetypes.config.peak_headroom_pct_enterprise` |
| Failover — Standard | 15% | N+1 style reserve |
| Failover — Enterprise | 30% | Dedicated failover block |
| Multi-tenancy overhead | 12% | Tenant isolation buffer |

---

## Output Fields from sizeMaaS()

```javascript
{
  // Demand
  usage_type, dau, peak_concurrent, precision, params_b,

  // Step 1 — Catalog memory
  w_i_gb,            // model weights at precision
  kv_pool_gb,        // KV cache per instance at B_max sessions
  vram_instance_gb,  // (W_i + KV) × 1.20

  // Step 2 — Concurrency
  tp_i,              // Tensor Parallelism factor (GPUs per instance)
  b_max,             // max concurrent sessions per instance (SLA-bounded)
  i_i,               // concurrent instances needed
  ttft_sla_ms,       // TTFT target used
  throughput_per_instance_tps,

  // Step 3 — GPU count
  base_gpus,         // I_i × TP_i
  peak_buffer_gpus, failover_gpus, multi_tenancy_gpus,
  total_gpus,        // what to allocate from fleet

  // Capacity
  throughput_tokens_per_sec, tokens_per_month_75pct, power_kw,

  // Audit trail
  audit: { step1, step2_tp, step2_bmax, step2_instances, step3_base, step3_buffers, kv_method }
}
```

---

*Companion to: claude-session-activator.md | SizingEngine: shared/sasc-sizing.js (inlined in sasc/index.html)*
