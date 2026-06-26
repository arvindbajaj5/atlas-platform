# ATLAS Claude Session Activator v2.6
**Read this file fully at the start of every ATLAS build session before touching any code.**
*Last updated: 2026-06-26 | Build: SizingEngine v4 + FACTORY named*

---

## Architectural Principles (locked — do not deviate)

### 1. ATLAS is an internal OEM tool — always
ATLAS is used by the OEM's sales, pre-sales, and business team. It is not a customer-facing product and will not be productised as-is. Customers never see or access ATLAS directly.

### 2. TSAP Config Package — extract at deal close, not a live product
When a TSAP deal closes, ATLAS generates a **TSAP Configuration Package** — a versioned, structured export of everything that went into designing that specific TSAP. This package is delivered to the operator alongside the hardware. It serves as:
- Day 1 configuration baseline for the operator
- Audit trail of what was promised, sized, and priced
- Future import source for a TSAP Management Console (when built)

The extraction method and scripts will be designed and written AFTER Atlas is correctly built — not now. Keep export in mind when designing schemas (versioned tables, structured JSON outputs) but do not build the export function yet.

### 2a. FACTORY — the TSAP operator tool
**FACTORY** = the tool extracted from ATLAS and delivered to the TSAP operator at deal close.
Full name options (all valid, to be finalised):
- Fleet Administration & Configuration Tool for Operational Reliability & Yield
- Fleet & AI Configuration Tool for Operational Reliability & Yield
- Fleet Administration & Configuration for Operational Reliability & Yield

Positioning: ATLAS is the design and sales tool. FACTORY is the operational tool.
"AI Factory" framing — a TSAP is an industrial-scale AI production system, not a cloud.
FACTORY = TSAP Config Package + operational management surfaces extracted from ATLAS Settings.
Not built yet. Design and extraction method to be decided after ATLAS is correctly built.

### 3. Fleet vs Tenant separation
```
Fleet level (TSAP FM manages):
  Public MaaS shared pool       ← aggregate DAU across all tenants
  Public GPUaaS burst pool
  Fleet inventory (GPU count, MW)
  Platform P&L and revenue

Tenant level (SASC manages, per engagement):
  UC workloads                  ← always dedicated per tenant
  Enterprise MaaS               ← dedicated or priority pool, contracted SLA
  Enterprise GPUaaS             ← reserved GPU allocation
  BMaaS                         ← dedicated CPU servers
  Tenant BOM and ROM
```

SASC = one engagement = one tenant. Multi-tenant aggregation happens in TSAP FM by combining multiple SASC outputs.

### 4. Utilities are standalone, reusable packages
Every utility (SizingEngine, TokenEcon, future Fleet Manager) is:
- Pure functions, no DOM, no ATLAS-specific assumptions
- Importable by any future tool (TSAP Console, Tenant Portal)
- Documented public API
- Syntax-checked before every deployment

Current utilities:
- `shared/sasc-sizing.js` → SizingEngine v3
- `shared/token-economics.js` → TokenEcon v1 (deploy pending)

### 5. Sizing evolves iteratively — imperfection is expected
Atlas sizing will never be perfect. Each session may refine formulas, add inputs, or restructure approaches as new blueprints or customer requirements surface. This is intentional. Document what changed and why in the activator. Do not over-engineer for edge cases not yet encountered.

Current known pending improvements (do not lose these):
- ~~P95 concurrency in sizeUC()~~ — ✅ done v4
- ~~Performance tier (Tier 1/2/3)~~ — ✅ done v4
- ~~Three-constraint B_max (VRAM + SLA + tier cap)~~ — ✅ done v4
- ~~Dual context (P50/P95) per UC~~ — ✅ done v4
- Speculative decoding VRAM — not yet implemented
- ~~GPU specs normalised to per-GPU (NVL72 rack specs fixed)~~ — ✅ done
- ~~Coherent/unified memory (GB200/GB300/VR NVL72/Helios)~~ — ✅ done v4
- ~~GPU specs normalised to per-GPU (NVL72 rack specs fixed)~~ — ✅ done
- ~~Coherent/unified memory (GB200/GB300/VR NVL72/Helios)~~ — ✅ done v4 (effectiveVRAM)
- ~~Embedding UC shortcut (skip KV cache)~~ — ✅ done v4
- GPUaaS: isolation model, burst model, availability SLA-driven HA — not yet implemented
- BMaaS: server class, network tier, storage tier — not yet implemented
- Enterprise MaaS: provisioning model, rate limit floor — not yet implemented
- Pipeline UC (multi-stage) — designed, not yet implemented
- Serving engine selector on S1/S2 — not yet implemented
- Token budget panel on S2 UC profiler — not yet implemented
- Competitive tokenomics panel in SASC output — not yet implemented

### 6. Settings = admin-only reference data
Settings pages are the seed of a future TSAP Management Console. Access will be role-gated (Business Head only) in Phase 2. For now treat all Settings pages as admin territory — never expose to end customers.

Tables that belong in Settings (and eventually in TSAP Config Package):
  gpu_configs · model_catalogue · pricing_params · serving_engine_configs
  requirement_archetypes · uc_interaction_types · app_config · hyperscaler_pricing

### 7. Build order discipline
When multiple things need building, prioritise in this order:
  1. Schema / data model (get structure right first)
  2. Core utility functions (SizingEngine, TokenEcon)
  3. SASC UI wiring (connect utilities to the tool)
  4. Settings UI (admin management of reference data)
  5. Export / integration (TSAP Config Package, TSAP FM connections)

---

## Product Definition Profile — Tenant Model

### The 2×2 Commercial Archetype
Every tenant sits in one or more quadrants. Quadrant drives commercial model.

```
                    Infrastructure          Use Case
                ┌───────────────────┬───────────────────┐
    Supplier    │  TSAP Operator    │  SI / UC Delivery │
                │  (build & run)    │  (build & deploy) │
                ├───────────────────┼───────────────────┤
    Consumer    │  GPUaaS / BMaaS   │  MaaS API         │
                │  (rent compute)   │  (consume AI)     │
                └───────────────────┴───────────────────┘
```

A single tenant can occupy multiple quadrants simultaneously.
The territory is always a tenant — typically the anchor tenant, often across all four quadrants.

### Security Tier Taxonomy

| Tier | Label | Isolation | Key Features | Typical Customer |
|---|---|---|---|---|
| S1 | Standard | VLAN | Encryption, API keys, basic audit | Commercial SME |
| S2 | Enhanced | Dedicated VLAN | HSM, MFA, SIEM, vulnerability scan | Finance, Healthcare |
| S3 | Sovereign | Physical nodes | Air-gap option, govt audit trail, data residency, cleared ops staff | Territory govt, defence PSUs, critical infra |
| S4 | Classified | Separate MDC/cage | Full air-gap, TEMPEST, two-person integrity, HW security modules | Defence, intelligence, nuclear |

Security tier drives automatically:
- `isolation_model` → S1: shared pool, S2: dedicated VLAN, S3: dedicated physical, S4: separate MDC
- `audit_level` → S1: standard logs, S2: SIEM, S3: sovereign tamper-evident, S4: classified
- `data_residency` → S1: none, S2: country, S3: in-territory, S4: facility-locked
- `pricing_uplift` → S1: 0%, S2: +10%, S3: +25-35%, S4: bespoke cost-plus

### Commercial Model Matrix (Quadrant × Security Tier)

```
GPUaaS (Infra Consumer):
  S1: Standard reserved, shared pool allowed
  S2: Enhanced reserved, dedicated VLAN, HSM add-on
  S3: Sovereign rate, dedicated physical nodes, compliance overhead
  S4: Bespoke cost-plus, govt contract vehicle

MaaS (Use Case Consumer):
  S1: Token pricing, shared pool, best-effort SLA
  S2: Token + SLA premium, dedicated queue
  S3: Token + sovereignty premium, dedicated pool, data residency guarantee
  S4: N/A — must be UC Supplier (dedicated deployment only)

UC SI Delivery (Use Case Supplier):
  S1: Standard SI margin
  S2: Enhanced SI + security uplift
  S3: Sovereign SI + compliance delivery overhead
  S4: Classified SI — cost-plus, cleared staff, separate MDC

TSAP Co-investor (Infra Supplier):
  Always S3 minimum
  Cost recovery model + revenue share + sovereignty stake
```

### Product Profile Structure (per tenant in SASC)

```javascript
tenant.product_profile = {
  // Position
  quadrants:              ['infra_consumer', 'uc_consumer'],  // one or more
  is_territory:           true,    // anchor tenant flag — special treatment
  security_tier:          'S3',    // S1 / S2 / S3 / S4

  // Derived automatically from security_tier
  isolation_model:        'dedicated_physical',
  audit_level:            'sovereign',
  data_residency:         'in_territory',

  // Commercial
  chargeout_model:        'external_cost_recovery',
  // options: external_commercial | external_cost_recovery |
  //          internal_standard | internal_subsidised | internal_zero

  internal_rates:         true,    // has internal sub-tenants (departments)

  // Pricing uplifts applied in BOM
  security_uplift_pct:    25,      // hardware + ops cost uplift
  compliance_overhead_pct: 15,     // audit, cleared staff, process
  sovereignty_premium_pct: 10,     // data residency guarantee

  // Activated commercial models per service
  commercial_model: {
    maas:    'token_sovereign_rate',
    gpuaas:  'reserved_dedicated_physical',
    bmaas:   'reserved_dedicated',
    uc_si:   'sovereign_si_rate'
  }
}
```

### Territory Tenant — Special Rules
- Always `is_territory: true` on one tenant per TSAP engagement
- Minimum security tier S3
- May be co-investor → `chargeout_model: external_cost_recovery`
- Emergency burst priority — pre-empts commercial tenants during declared emergencies
- Internal sub-tenants (departments) with own chargeout rates
- SDMA / disaster management department → `chargeout_model: internal_zero`
- Education / university departments → `chargeout_model: internal_subsidised`

### BOM Impact of Security Tier
Security tier automatically applies uplifts in `calculateBOM()`:
```
S1: base pricing
S2: base × 1.10
S3: base × 1.25 (hardware) + compliance_overhead_pct on services
S4: cost-plus — bespoke line items, no standard formula
```

---

## PTaaS — Post-Training as a Service

**Status:** Product defined, not yet in ATLAS. Add to SASC as fourth service type alongside MaaS/GPUaaS/BMaaS.
**Strategic rationale:** Sovereign AI = owning model weights, not just renting GPU hours. Defensible against hyperscaler commoditisation. In-house Data Science team is the differentiator.

### Three-Tier Product Structure

```
PTaaS Tier 1 — Managed Fine-Tuning (MFT)
  Customer provides:  Dataset + target capability description
  We provide:         Full LoRA/QLoRA pipeline, evaluation, merged model → MaaS pool
  Duration:           Days to weeks
  Pricing:            Fixed project fee or per-GPU-hour + managed overhead
  Customer expertise: None required
  Outcome:            Fine-tuned model checkpoint deployed in customer's MaaS pool

PTaaS Tier 2 — Domain Model Factory (DMF)
  Customer provides:  Domain documents + use cases + acceptance criteria
  We provide:         Synthetic data generation → SFT → DPO/GRPO alignment → deployment
  Duration:           Weeks to 2 months
  Pricing:            Milestone-based engagement
  Customer expertise: Domain knowledge only
  Outcome:            Customer-owned domain model, deployed + versioned in their MaaS pool

PTaaS Tier 3 — Sovereign Model Programme (SMP)
  Customer provides:  Domain corpus + branding + governance requirements
  We provide:         Continued pre-training + SFT + alignment + custom tokeniser
                      + benchmarking suite + knowledge transfer + model governance
  Duration:           3-6 months
  Pricing:            Large programme, co-investment structure
  Customer expertise: Steering committee level only
  Outcome:            Named sovereign model (e.g. "HP-GPT", "AgriBot India")
                      Customer owns IP (subject to base model licence)
                      Multi-year maintenance relationship
```

### Why Differentiated vs GPUaaS

| Dimension | GPUaaS | PTaaS |
|---|---|---|
| Customer ML expertise needed | High | None (Tier 1) to Low (Tier 3) |
| Customer risk | High (may waste GPU hours) | Low (fixed outcome) |
| Your margin | Low (commodity) | Medium-High (Tier 1) to Very High (Tier 3) |
| Stickiness | Low | Medium (Tier 1) to Very High (Tier 3) |
| Sovereign AI narrative | Partial | Complete (customer owns model weights) |

### Stickiness Mechanism
Resulting model trained on your infra → deployed in your MaaS pool → maintained by your DS team. Customer has no easy migration path without full retraining. Creates multi-year relationship anchored in IP co-creation.

### ATLAS Integration (pending)

**New service type in SASC S3:**
```
PTaaS config per tenant:
  tier:              'mft' | 'dmf' | 'smp'
  base_model_id:     model_catalogue.id  (starting point)
  dataset_size_gb:   number
  dataset_tokens_b:  number (billions of training tokens)
  target_epochs:     number
  method:            'lora' | 'qlora' | 'full_sft' | 'continued_pretrain'
  alignment:         'none' | 'dpo' | 'grpo' | 'rlhf'
  outcome_model:     'lora_adapter' | 'merged_model' | 'full_pretrain'
  deployment_target: 'maas_pool' | 'dedicated' | 'customer_export'
  timeline_weeks:    number
```

**New SizingEngine function: `sizeTraining(config, gpuConfigId)`**
Training compute sizing is fundamentally different from inference sizing:
```
Training FLOP budget = 6 × N × D
  N = model parameters (e.g. 7B)
  D = training tokens (dataset_tokens × epochs)
  6 = multiply-add × forward + backward pass

GPU-hours = FLOP_budget / (gpu_tflops × MFU × 3600)
  MFU = Model FLOP Utilisation (typically 35-45% for well-configured distributed training)

GPU count for timeline:
  gpus_needed = GPU_hours_total / (timeline_hours × target_utilisation)

Memory per GPU (training vs inference — very different):
  Model weights (FP32 master):  params_b × 4 bytes
  Gradients:                    params_b × 4 bytes
  Optimiser states (Adam):      params_b × 8 bytes (2 moments)
  Activations (checkpointed):   ~2-4 GB depending on batch size
  Total:                        ~16-18 bytes per parameter (vs 2 bytes for FP16 inference)
  → A 7B model needs ~112-126 GB for training vs 14 GB for FP16 inference
  → Requires multiple GPUs even for small models
```

**New pricing_params rows needed:**
```
category: services_training
  managed_fine_tuning_per_gpu_hr
  domain_model_factory_base_fee
  domain_model_factory_per_gpu_hr
  sovereign_model_programme_base_fee
  sovereign_model_programme_milestone
  data_preparation_per_gb
  alignment_per_gpu_hr
  evaluation_per_run
  knowledge_transfer_per_day
```

### Training GPU Recommendations
Training has different GPU requirements than inference:
- Full pre-training / continued pre-training: H200 SXM, B200 SXM (high HBM, NVLink)
- SFT / LoRA: H200 SXM minimum, MI355X also suitable
- QLoRA: runs on smaller GPUs (less VRAM needed due to quantised base)
- NOT recommended for training: NVL72 rack-scale (optimised for inference throughput)
- GB200 NVL72 exception: unified memory helps with very large model training

### Base Model Licence Considerations
IP ownership in Tier 3 (SMP) depends on base model licence:
```
Apache-2.0 (Llama community, Qwen, Gemma):  Customer can own derivative weights ✅
Llama Community Licence:                     Permitted for commercial deployment ✅
                                             (>700M MAU requires Meta permission)
MIT:                                         Full freedom ✅
Research Only (LLaVA-Med, Genie 2):         Cannot commercialise derivative ❌
Proprietary (π0):                            Cannot fine-tune without agreement ❌
```
model_catalogue.license_type field is the reference for this check.

---

## Coherent Memory Architecture (gpu_configs)

**Status:** Schema updated, SQL ready to run (`gpu_configs_coherent_memory.sql`)

### Applies to (unified_memory = true)
| GPU | Interconnect | CPU Paired | CPU Mem/GPU | Effective Mem |
|---|---|---|---|---|
| GB200 NVL72 | NVLink-C2C | Grace (Neoverse V2) | 480 GB LPDDR5X | 336 GB |
| GB300 NVL72 | NVLink-C2C | Grace (Neoverse V2) | 480 GB LPDDR5X | 432 GB |
| Vera Rubin NVL72 | NVLink-C2C Gen 2 | Grace 2 (est.) | 480 GB LPDDR5X | 456 GB |
| Instinct Helios | AMD Infinity Fabric | EPYC Venice pair | 768 GB DDR5 | 576 GB |

**Effective memory formula:**
```
effective_mem_gb = vram_per_gpu_gb + (coherent_cpu_mem_gb × usability_factor)
usability_factor: NVLink-C2C = 0.30-0.35, Infinity Fabric = 0.25
(coherent is ~10× slower than HBM — suitable for overflow KV cache and cold weights)
```

**Pricing justification use cases:**
- Large model fit without tensor parallelism (405B on fewer nodes)
- Larger context windows (overflow KV cache to CPU memory)
- Better CPU-side preprocessing co-located with GPU
- PTaaS Tier 3 training (larger effective memory for training states)

**SizingEngine changes needed (pending):**
When `unified_memory = true`, sizeUC() and sizeMaaS() should:
1. Use `effective_mem_gb` instead of `vram_per_gpu_gb` for model fit check
2. Surface "fits due to coherent memory" in audit trail
3. Flag as premium SKU with pricing justification note

---

## GPU Spec Fixes Applied (gpu_configs)

**Status:** `gpu_configs_fix.sql` run ✅ — all specs now per-GPU not per-rack

Key fixes:
- NVL72 racks: bf16_tflops and hbm_bw_tbps corrected from rack-total to per-GPU
- GB200 NVL72: vram_per_gpu_gb corrected 96→192 GB (was per-die, not per-GPU)
- rack_bf16_tflops and rack_hbm_bw_tbps added as reference columns (marketing specs)
- specs_per_gpu = true flag added to make semantic explicit

SizingEngine formula impact:
- Profile B (bandwidth bound): now uses correct per-GPU HBM bandwidth
- Profile A (compute bound): now uses correct per-GPU TFlops
- TTFT estimate: correct (was near-zero for NVL72 due to rack bandwidth)

---

## Platform Identity

**ATLAS** — AI Transaction and Lifecycle Architecture Suite
**Owner:** Arvind Bajaj, Mumbai. OEM specialising in AI/HPC hardware + SI delivery.
**Deployed at:** `arvindbajaj5.github.io/atlas-platform`
**Stack:** GitHub Pages (hosting) · Supabase (database + auth) · Google Drive (file storage)
**Brand:** Navy `#002870` · Orange `#FF5539` · Teal `#00B290` · Amber `#FFB600` · Blue `#1C38F5` · Font: Roboto

**Roles:**
| Role | Access |
|---|---|
| Business Head | Full access |
| Sales & Sales Support | Sales Enablement + Opportunity Management + RAC Tool |
| Pre-Sales | Presales + read Opportunity Mgmt |
| Operations | Biz Ops + read project outputs |

---

## Tool Inventory & Locations

| Tool | Path | Status |
|---|---|---|
| Portal / Home | `index.html` | Live |
| Engagement Docket | `tools/engagement-docket/index.html` | v2.3.2 ✓ |
| SASC | `tools/sasc/index.html` | v3.0 — SizingEngine integrated ✓ |
| TSAP Financial Model | `tools/tsap-financial-model/index.html` | Live |
| Inferencing Factory | `tools/inferencing-factory/index.html` | Live |
| GeoAI Configurator | `tools/geoai-configurator/index.html` | Live |
| COMPASS | `tools/compass/index.html` | Live |
| Deal Analysis | `tools/deal-analysis/index.html` | Live |
| SizingEngine | **inlined in sasc/index.html** | v4.0 — P95 concurrency, perf tier, 3-constraint B_max, unified memory (deploy pending) |
| TokenEcon | `shared/token-economics.js` | v1.0 — 4-layer token economics engine (deploy pending) |
| FACTORY | TBD — future extract from ATLAS | Named 2026-06-26. Full name TBD. Extracted at deal close. |
| model_catalogue | Supabase | 102 models, 9 domains, domain+specialisation+country schema |
| HPC Monitoring | TBD | Not yet built |
| AI Sovereignty Index | TBD | Not yet built |

---

## Supabase Schema — Critical Facts

**Connection:** `atlas_global_cfg` in localStorage → `{ sbUrl, sbKey }`

### `docket_items` — confirmed columns
```
id (text PK), docket_id (text FK), item_type (text), title (text),
content (jsonb), section (text), ref_table (text), ref_id (text),
item_subtype (text), status (text), sort_order (int),
created_at (timestamptz), created_by (text), notes (text)
```

### Check constraints — MUST respect on ALL inserts
```
item_type: action | intel | pei | uc | rfp | pitch | solution | bom | proposal | pricing | exec_doc
section:   profile | strategy | uc | action | output | note | agreement
status:    pending | in_progress | done | closed
```

### Status translation (UI labels ↔ DB values)
Functions: `toDbStatus()`, `fromDbStatus(section, s)`, `normalizeItems(arr)`
```
UI → DB:  proposed→pending, agreed→done, scratched→closed
          open→pending, wip→in_progress, blocked→closed, active→pending
```

### Key save patterns
```javascript
// UC:        section='uc',     item_type='uc',       ref_table='uc_library', ref_id=ucSlug
// Portfolio: section='output', item_type='solution', item_subtype='portfolio_selection', content={items:[...]}
// MaaS:      section='output', item_type='solution', item_subtype='maas_config',         content={...}
// SASC:      section='output', item_type='solution', item_subtype='sasc_config',          content={type:'sasc',sasc:{...}}
// SASC BOM:  section='output', item_type='solution', item_subtype='sasc_bom',             content={type:'sasc',...}
// Action:    section='action', item_type='action',   status='pending'
// Vision:    section='output', item_type='exec_doc', item_subtype='vision_doc'
```

### Other key tables
- `gpu_configs` — 12 architectures. Columns: `id, name, vram_per_gpu_gb, tdp_kw, gpus_in_unit, rack_scale, hbm_bw_tbps, bf16_tflops, int4_tflops, placeholder, active`
- `model_catalogue` — 67 rows. Key columns: `id, name, params_b, enabled, vendor, gpu_memory_gb(jsonb), gpus_per_instance(jsonb), num_layers, num_kv_heads, head_dim, kv_cache_dtype, architecture, context_length_k`
- `uc_interaction_types` — 12 UC archetypes. Key cols: `id, name, requests_per_user_per_day, avg_input_tokens, avg_output_tokens, typical_sla_ms, peak_multiplier, min_precision, compute_intensity, default_headroom_pct, ha_required, batch_tolerant`
- `requirement_archetypes` — 8 rows: 6 MaaS + 1 GPUaaS + 1 BMaaS. Key cols: `id, archetype_type (maas|gpuaas|bmaas), name, config(jsonb)`
- `pricing_params` — 47 rows, 10 categories seeded. Columns: `id, category, component, description, unit, base_price_usd, confidence_range, min_quantity, volume_breaks, vendor_options, notes, active`
- `benchmark_results` — measured throughput (gpu_config_id × model_id → tokens/sec)
- `app_config` — key, value. Territory cost overrides: `key=territory_config_{engId}`
- `uc_library` — id (slug e.g. geo-uc-010), uc_name, cluster, complexity, status
- `engagements`, `customers`, `territory_profiles`, `profiler_archetypes`

### Pending SQL (needs running in Supabase)
- `model_catalogue_extend.sql` — adds `num_layers, num_kv_heads, head_dim, kv_cache_dtype, architecture` columns + seeds architecture params for exact KV cache formula. **Not yet run.**

---

## SizingEngine v4 — Core Physics

**Location:** Inlined in `sasc/index.html` as `<script>` block (external file returns 403 on GitHub Pages).
**Status:** v4 built and syntax-checked. Deploy pending — inline into sasc/index.html.
**Init:** `SizingEngine.init(sbUrl, sbKey)` — called in SASC `init()` before `renderStep(1)`. Loads all reference tables, syncs to `ALL_GPU_CONFIGS`, `ALL_MODELS`, `ALL_UC_TYPES`.
**Reference doc:** `MaaS_Sizing_Notes.md` — full blueprint coverage analysis.

### sizeUC() v4 — Profile B (UC internal, latency-bound)

### New in v4
```javascript
// Constants
PERF_TIER           = { interactive:'tier1', analytical:'tier2', async_batch:'tier3' }
TIER_BATCH_CAP      = { tier1:8, tier2:32, tier3:Infinity }
AVAILABILITY_HA_PCT = { '99.5':0.10, '99.9':0.20, '99.99':1.00 }
COHERENT_USABILITY  = { 'NVLink-C2C':0.30, 'NVLink-C2C Gen 2':0.35, 'AMD Infinity Fabric':0.25 }

// New helpers
derivePerformanceTier(ucType, maxContextTokens) // → tier1/tier2/tier3
effectiveVRAM(gpu)                              // HBM + coherent CPU mem
precisionTierWarning(precision, tier)           // warn INT4 on Tier 1
```

### sizeUC() v4 — key changes
```
Inputs added:  typical_context_tokens (P50), max_context_tokens (P95)
               sizing_policy, availability_sla, p95_peak_multiplier
Computation:   perfTier derived automatically from ucType + context
               effectiveVRAM used (coherent memory for unified GPUs)
               p95RPS = avgRPS × p95Mult (P95 = peakMult × 1.5)
               B_max = min(B_max_vram, B_max_sla, TIER_BATCH_CAP[tier])
               base_gpus = I_i × TP_i (explicit tensor parallelism × instances)
               HA reserve = AVAILABILITY_HA_PCT[availSLA]
               Tier 1: +10% isolation buffer (dedicated pool)
               Embedding models: skip KV cache entirely
Outputs added: performance_tier, b_max/constraints, tp_i, i_i,
               vram_per_gpu_effective, unified_memory, p50_utilisation_pct
               peak_rps_p50, peak_rps_p95, availability_sla, ha_pct_applied
```


```
KV cache (exact): M_KV = 2 × L × H_kv × D_head × C_max × N × B_cache (FP16 always)
KV cache (fallback): field rule 0.15–0.50 MB/token by model size class
VRAM_total = (W_i + M_KV) × 1.20 overhead
gpus_for_fit = ceil(VRAM_total / GPU_vram)
Concurrency: N = λ × W (Little's Law, W from latency SLA)
Bandwidth bound: BW_GBs / model_GB_per_GPU (Profile B — low batch)
base_gpus = max(gpus_for_fit, gpus_for_throughput)
```

### sizeMaaS() — Profile A (3-step blueprint framework)

```
Step 1 — Catalog memory per instance:
  W_i          = params_b × bytes_per_param[precision]
  KV_pool      = calcKVCache(model, contextLen, B_max, 'FP16')
  VRAM_inst    = (W_i + KV_pool) × 1.20

Step 2 — Tensor Parallelism + Instance count:
  TP_i         = ceil(VRAM_inst / GPU_vram)           // GPUs per instance
  throughput   = tflops_instance × 1e12 / (2×params_b×1e9) × derating
  B_max        = floor(throughput × TTFT_sla_ms/1000 / avg_output_tokens)
                 Standard: TTFT=2000ms · Enterprise: TTFT=1000ms
  I_i          = ceil(peak_concurrent / B_max)        // instances needed
  base_gpus    = I_i × TP_i                           ← KEY formula

Step 3 — HA/SLA buffers:
  +peak_headroom (25%/30%) +failover (15%/30%) +multi-tenancy (12%)
  total_gpus = base_gpus × (1 + buffer_sum)
```

### calcVCatalog(maasResults)
```
V_catalog = Σ(W_i × I_i)  // total VRAM to hold all active model instances
```

### fleetTotal() — also returns host_sizing
```
host_sizing.ram_min_gb  = total_fleet_vram × 2.0   // vLLM L1 Sleep headroom
host_sizing.ram_rec_gb  = total_fleet_vram × 2.5
host_sizing.nvme_total_tb = gpu_nodes × 20TB        // PCIe Gen5 RAID-0 per node
```

### Public API
```javascript
SizingEngine.init(sbUrl, sbKey)
SizingEngine.sizeUC(config, gpuId)        // raw GPU count, audit trail
SizingEngine.sizeMaaS(config, gpuId)      // tp_i, b_max, i_i, base=i_i×tp_i, buffers
SizingEngine.calcVCatalog(maasResults)    // V_catalog across all usage types
SizingEngine.sizeGPUaaS(config, gpuId)
SizingEngine.sizeBMaaS(config)
SizingEngine.fleetTotal(ucR, maasR, gaas, bmaas, mdcSpec)  // + host_sizing
SizingEngine.getGPUConfigs() .getModels() .getUCTypes() .getArchetypes()
```

### Constants
```
RUNTIME_OVERHEAD = 1.20 · GPU utilisation cap = 80% (derating_pct)
KV cache dtype: always FP16 (2 bytes) regardless of weight precision
Packaging: raw GPU count only from all size functions — BOM handles servers/racks
```

---

## Token Economics Engine — shared/token-economics.js

**Status:** Built, syntax-checked. Deploy to `shared/token-economics.js`. SQL run in Supabase.
**Companion doc:** MaaS_Sizing_Notes.md
**Depends on:** Nothing (pure functions, no DOM, no Supabase)
**Used by:** SizingEngine (sizing inputs), SASC S2/S3 (token budget), SASC output (competitive comparison)

### Four Layers

**Layer 1 — Token Estimator:** `TokenEcon.estimateTokens(config)`
Handles 9 content types with correct physics per type:
- `text` → words × 1.3
- `code` → chars ÷ 3.6
- `image` → (H/patch) × (W/patch) × tiles (ViT patch tokenisation, default patch=14)
- `audio` → duration_seconds × 50 tok/sec (Whisper framing)
- `document` → pages × words_per_page × 1.3
- `structured` → fields × avg_field_length ÷ 4 (JSON/XML/CSV)
- `rag` → chunk_size × top_k × (1 + overlap_waste)
- `system_prompt` → preset (minimal=150, standard=500, detailed=1200, complex=2500) or exact
- `chat_history` → avg_turns × tokens_per_turn

**Layer 2 — Request Budget:** `TokenEcon.budgetRequest(stages, traffic, engineId, engineConfig)`
- Pipeline-aware: array of stages, each sized independently, totals aggregated
- Waste analysis: system prompt waste, RAG overlap waste, padding waste (TRT-LLM), prefix cache savings (SGLang)
- Token Yield % = useful tokens / consumed tokens (Excellent ≥70%, Good ≥55%, Fair ≥40%, Poor <40%)
- Recommendations: context window breach, compression suggestions, engine switching advice
- Output feeds directly into `SizingEngine.sizeUC()` via `sizing_inputs` object

**Layer 3 — Fleet Economics:** `TokenEcon.fleetEconomics(budget, capexUSD, opexMonthly, years)`
- CAPEX amortised over projection horizon + monthly OPEX → cost per MTok
- Own platform cost for competitive comparison

**Layer 4 — Competitive Tokenomics:** `TokenEcon.compareVsHyperscalers(mtok, ownCost, rows, years)`
- Blended cost = input_price × 0.70 + output_price × 0.30 (configurable ratio)
- Monthly / annual / N-year savings per provider
- Year-by-year projection with 30% annual hyperscaler price decline assumption
- Sovereignty note appended (data residency non-negotiable for govt/defence)

### Serving Engine Configs (Supabase: serving_engine_configs)

| Engine | compute_efficiency | prefix_cache_benefit | padding_waste | best_for |
|---|---|---|---|---|
| vLLM | 30% | 0% | 0% | General MaaS, latency-sensitive |
| TRT-LLM | 45% | 0% | 15% | High-volume batch, MaaS at scale |
| SGLang | 38% | 25% | 0% | RAG, shared-prefix, document UCs |
| llama.cpp | 8% | 0% | 0% | Edge, air-gapped, CPU-only |
| Ollama | 12% | 0% | 0% | Dev/test only |

**Centre-level default engine with per-UC override** — decision locked 2026-06-26.

### Hyperscaler Pricing (Supabase: hyperscaler_pricing)
Price history seeded for: OpenAI (GPT-4 → GPT-4.1), Anthropic (Claude 3 → Claude 4),
Google (Gemini 1.0 → 2.5), AWS Bedrock (Nova, Llama), Azure OpenAI.
`is_current=true` marks latest known prices. User can add rows via Settings (upload or manual).

### Pipeline UC Support
`budgetRequest()` accepts `stages` array — each stage has its own model, content types, output tokens.
GPU counts summed across stages in SizingEngine. Enables:
- ASR → LLM pipelines (Whisper → Sarvam-M)
- VLM → Text pipelines (GeoChat → analysis model)
- LLM → TTS pipelines

### SASC Integration (pending — next session)
1. Serving engine selector on S1 (centre default) with per-UC override on S2
2. Token budget panel on S2 UC profiler — content type pickers replace raw token inputs
3. Token Yield badge on each UC card
4. Competitive comparison panel in SASC output screen (Layer 4)

---

## Model Catalogue — Supabase: model_catalogue

**Status:** 102 models, 0 null domains. Schema fully extended.
**Settings UI:** `settings/index.html` — Model Catalogue tab (moved before Hardware & Costs)

### Schema (key new columns)
```
domain          text      -- primary vertical (9 domains)
specialisation  text[]    -- capability tags (13 types, array)
family_name     text      -- Llama, Qwen, Sarvam, DeepSeek etc.
country_origin  text      -- US, CN, IN, FR, DE, AE, CA
level           text      -- small | medium | large | frontier
is_reasoning    boolean   -- DeepSeek R1, QwQ, Qwen3 etc.
is_multimodal   boolean
modality        text      -- text_gen, vlm, audio_asr, embed etc.
license_type    text
review_needed   boolean   -- intel flag
review_note     text
```

### Domains (10)
general · code · indic · geospatial · biomedical · finance · legal · aerospace · industrial · world_model

### Specialisations (13)
text_gen · reasoning · vlm · embed · audio_asr · audio_tts · img_gen · video_gen · geo_vision · timeseries · anomaly · world_sim · med_seg

### Distribution
| Domain | Count |
|---|---|
| general | 72 |
| code | 9 |
| biomedical | 3 |
| geospatial | 4 |
| indic | 4 |
| finance | 2 |
| legal | 1 |
| industrial | 2 |
| world_model | 5 |

### Sources consolidated
- model_catalogue (original 43) + Inferencing Factory MDL (32 unique) + world_model seeds (3: Cosmos, π0, Genie 2) + pre-existing rows (24)

### Settings UI features
- Free-text search (name, family, domain, specialisation, country)
- Filter dropdowns: domain, specialisation, country (flags), level (colour-coded), reasoning flag, enabled status
- ⚠ review badge — click to filter to models needing intel review
- Edit form: all new fields including domain, specialisation, country, level, reasoning
- Sync to Supabase saves all new columns
- Staging queue: approve/reject intel-detected models

---

## SASC v3.0 — Full Architecture

### Screen structure
| Step | Key | Condition |
|---|---|---|
| 1 | `scope` | Always |
| 2 | `workloads_a` | `outputStack.ucdev === true` |
| 3 | `workloads_b` | MaaS/GPUaaS/BMaaS enabled |
| 4 | `workloads_c` | Skills/CoE — placeholder 🚧 |
| 5 | `bom` | Always |

### Critical architecture rules (hard-won — DO NOT VIOLATE)
1. **Never hardcode `renderStep(3)`** — always use `renderStep(SASC_STEP)`. Step numbers shift.
2. **Render functions never trigger async re-renders of themselves.** `renderStep()` owns async.
3. `loadWorkloadProfiles()` called only from `renderStep(workloads_a)`
4. S3 (`workloads_b`) skips `loadSvcModelCatalogue()` when `SizingEngine.ready === true` — new MaaS screen uses SizingEngine directly
5. `wlChange()` calls `renderStep(SASC_STEP)` — not `renderScreen2()` — to trigger auto-save
6. `SASC_LOAD_GEN` counter: captured at async start, abort if changed (user navigated away)

### SASC_DATA structure (key fields)
```javascript
{
  engId, docketId, docketItemId,
  scope, dcType, mdc: {tshirt, sites, siteNames}, bm: {...},
  gpuConfigId,          // centre-level GPU arch — drives ALL sizing
  powerMode,            // 'total' | 'gpu'
  pue,                  // default 1.2
  overhead: {networking_pct, storage_pct, mgmt_pct},
  fleetInventory,       // computed by calcFleetInventory()
  layers,               // {infra, compute, network, platform, security, resilience, data}
  outputStack,          // {ucdev, maas, gpuaas, bmaas, skills, coe}
  serviceModel,         // {maas, gpuaas, bmaas} with enabled flags
  selectedUCs,          // array of UC ref_ids
  ucWorkloads,          // {[ucId]: {dau, peak_mult, model_id, uc_type_id, precision, ...}}
  deratingPct,          // default 80
  maasParams,           // {[type]: {precision, derating_pct, peak_concurrent_pct}}
  maasMix,              // {text:40, coding:30, ...} — capacity view mix
  maasSizingResults,    // array from renderMaasSimTab()
  totalMaasGPU,         // sum of MaaS GPU demand
  rom, bom              // BOM/ROM results
}
```

### S1 — Scope & Stack (rebuilt)
- **GPU Architecture selector** (centre-level, one choice for entire fleet)
- **MDC T-shirt:** XS/S/M/L/XL (2/5/10/15/20 MW)
- **Power mode cards:** 🏗 Total DC Power vs ⚡ GPU-Ready Power
- **Deduction factors:** PUE · Network% · Storage% · Mgmt% (shown when Total DC selected)
- **Fleet inventory panel (navy):** GPUs available / servers or racks / MW for GPU + trail
- `calcFleetInventory()` — pure function, no Supabase call
- Auto-save status indicator bottom-left of nav bar

### S2 — UC Workloads
- Reads from `model_catalogue` (67 models) — NOT `ai_models` (10 stale rows)
- Fleet context banner at top (GPU arch from S1, "Change ↑" link)
- UC sizing via `SizingEngine.sizeUC()` — GPU count shown as raw number
- Expanded card: GPU breakdown (base/peak/failover/HA/growth) + formula audit
- `wlChange()` → `renderStep(SASC_STEP)` → auto-save fires 1.5s later

### S3 — MaaS / GPUaaS / BMaaS (rebuilt)
- `renderMaasSimTab()` — new fleet capacity model (replaces old 3-layer simulation)
  - For each enabled usage type from MAAS_CFG: calls `SizingEngine.sizeMaaS()`
  - Shows 5-column breakdown: Base / +Peak / +Failover / +Multi-T / Total
  - Sizing formula trail: model VRAM, throughput formula, binding constraint
  - Editable params panel: Precision (INT4/INT8/FP16), Derating%, Peak concurrency%
- `buildMaasParamsPanel(ut, arch)` — helper function (extracted to avoid node parse issues)
- `renderMaasCapacityView()` — reverse calculation:
  - Headroom GPUs = fleet − UC − MaaS − GPUaaS
  - Mix sliders (default from Docket DAU proportions, adjustable to 100%)
  - Capacity table at 50% / 70% / 90% utilisation showing users per type
- `renderFleetAllocation()` — stacked bar + table: UC/MaaS/GPUaaS/Unallocated, MW check
- GPUaaS/BMaaS: toggle + config inputs

### BOM (S5)
- `calculateBOM(pricing)` — `ucProfiles` param removed (uses SizingEngine instead)
- GPU count from `SizingEngine.sizeUC()` aggregated across UCs
- CPU servers = `ceil(gpuUnits / 4)` · storage = `gpuUnits × 20TB`
- `loadAndRenderBOM()` has generation guard + error boundary
- `adjustedPeopleCost` self-reference fix applied

### Persistence / Auto-save
```
Trigger:    renderStep() fires autoSaveSASC() debounced 1.5s
            wlChange() → renderStep() → auto-save
Item:       docket_items, item_type='solution', item_subtype='sasc_config', status='in_progress'
Load:       init() searches for sasc_config|sasc_bom by docket_id first, then URL item param
Restores:   ucWorkloads, maasParams, maasMix, outputStack, serviceModel, overhead, gpuConfigId
Status:     'Saved HH:MM' indicator in S1 nav bar
```

---

## Engagement Docket v2.3.2

### Key changes in this session
- MaaS model tier labels: GPU count removed (`"Llama 70B"` not `"Llama 70B (1GPU)"`)
- GPU estimate panel replaced with config summary (usage types + total users + SLA + "GPU sizing in SASC →")
- Portfolio selection: `togglePI()` now auto-saves 800ms after every click (silent mode)
- Portfolio save status indicator next to Save button

### Tab flow
`Overview → Profile & Intelligence → Portfolio → [Use Cases] → [Service Model] → [Territory] → Actions → Outputs → History`

### Portfolio persistence
- `savePortfolioSelection(silent?)` — silent=true for auto-save (no toast)
- Auto-save debounced 800ms in `togglePI()` — NEVER needs manual save again
- Load: `DOCKET_ITEMS.filter(i => i.item_subtype === 'portfolio_selection')` → `content.items`

---

## Fleet Management Model (decided 2026-06-25)

### Key decisions (locked)
- **Single GPU architecture** for the entire centre (Phase 1). Multi-arch deferred.
- GPU count is always a **raw number**. Packaging (servers/racks) at BOM only.
- Fleet inventory = MDC T-shirt power ÷ PUE ÷ infra overheads ÷ GPU TDP
- UC sizing = Profile B (memory-bandwidth bound, low concurrency)
- MaaS sizing = Profile A (dual-bound, high concurrency, 3 buffer layers)
- **Capacity reverse model:** `maxUsersFromGPUs()` — headroom GPUs → max additional users at utilisation%

### Two directions of calculation
```
Direction 1 (Sizing):  Given users → how many GPUs?  [SASC S2/S3]
Direction 2 (Capacity): Given GPUs → how many users? [SASC S3 Fleet Capacity View → FM]
```

### Fleet view (bottom of S3)
```
Fleet inventory:    X GPUs  (N racks/servers · YMW)
UC inference:       A GPUs  (Z%) — cost centre
MaaS total:         B GPUs  (Z%) — revenue
GPUaaS:             C GPUs  (Z%) — revenue
Unallocated:        D GPUs  (Z%) — headroom
MW check:           X.X MW of Y MW  ✓/⚠/🔴
```

### FM integration (next phase)
- SASC pushes `max_dau_per_type` at 50%/70%/90% utilisation to `app_config`
- FM reads these + token pricing → revenue = volume × price
- Utilisation phasing = the scenario planning tool (Y1/Y2/Y3)

---

## MaaS Product Spec

**Pricing:** API/consumption-only — no subscription bundles
**Usage types (6):** text · coding · document · audio · indic · generic
**Model tiers:** Basic · Mid · Advanced (within same model family)
**Demand input:** DAU (stored in Docket as `concurrent_users` — label to fix later)
**SLA:** Standard · Enterprise
**Free trial:** 15 days, 1M tokens, API only

---

## Development Conventions

### Python patching
```python
old = "exact string from file"   # must match exactly, count=1
c = content.count(old)           # ALWAYS verify = 1 before replacing
content = content.replace(old, new, 1)
```

### Syntax validation (MANDATORY before every present_files)
```python
# Extract main JS block from HTML
with open('/home/claude/sasc-live.html') as f: c = f.read()
s = c.rfind('<script charset="utf-8">')
e = c.rfind('</script>')
open('/tmp/sasc_check.js','w').write(c[s+24:e])
# Run check
subprocess.run(['node','--check','/tmp/sasc_check.js'], capture_output=True, text=True)
```

### Div balance check (for HTML-generating JS)
```python
import re
opens  = len(re.findall(r'<div[^/]', block))
closes = len(re.findall(r'</div>', block))
# NEVER use <div> inside <button> — use <span style="display:block"> instead
# Divs in JS string literals are counted by parser — must balance
```

### Binary search for syntax errors
```python
# When node --check reports error at "last line" — binary search the function
lo, hi = 0, len(lines)
while hi - lo > 5:
    mid = (lo + hi) // 2
    if check('\n'.join(lines[:mid])): lo = mid
    else: hi = mid
```

### GitHub deployment
- Token (`$GITHUB_TOKEN`) not available in Claude sessions
- Always output to `/mnt/user-data/outputs/` for manual deploy
- GitHub Pages deployment queued/stuck: re-run workflow, or trivial commit to trigger fresh
- If Pages source stuck on GitHub Actions (greyed out): Settings → Environments → delete `github-pages`
- FX rates (`frankfurter.app`) blocked by CORS on GitHub Pages — non-fatal, uses fallback rates

---

## Build Tracker — Current Phase

### Completed this session ✅
- SizingEngine v1.2: dual-bound throughput formula (BW × B^0.6 vs TFlops × 17%), exact KV cache formula
- `maxUsersFromGPUs()`: reverse calculation for fleet capacity view
- `throughputAudit()`: formula trail for UI transparency
- S1 rebuilt: GPU arch selector + power mode cards + fleet inventory panel + auto-save
- S2 fixed: model_catalogue (67 models) instead of ai_models (10 stale)
- S3 rebuilt: fleet capacity model per usage type, capacity view with mix sliders, fleet allocation table
- BOM: `gpuServers` undefined fixed → `gpuUnits`; `adjustedPeopleCost` self-reference fixed
- Docket: GPU count removed from model tier labels, portfolio auto-save on every toggle
- Persistence: full SASC config (UC workloads + MaaS params + GPU config) auto-saved to Supabase

### Open — Phase 1 (complete fleet view)
- [ ] MW envelope validation in fleet allocation (power check vs MDC envelope)
- [ ] Cost per million tokens in MaaS card (GPU cost ÷ throughput × utilisation)
- [ ] SASC → FM data push (write capacity projections to app_config)
- [ ] `model_catalogue_extend.sql` — run in Supabase (adds KV cache architecture params)
- [ ] Docket MaaS `concurrent_users` label → rename to `dau` for clarity

### Open — Phase 2 (BOM completion)
- [ ] Networking in BOM (InfiniBand + NKC switch sizing)
- [ ] Platform software / security / resilience uplifts
- [ ] UC dev effort in ROM
- [ ] SASC BOM → FM push

### Open — Phase 3 (commercial model)
- [ ] FM Revenue tab: MaaS token pricing + margin curves
- [ ] FM Fleet P&L (GPU cost + power + people → EBITDA)
- [ ] Utilisation scenario planning (Y1/Y2/Y3 ramp)

### Parked
- Multi-GPU architecture (Phase 2 — revisit after single-arch validated)
- SASC S4 Workloads C (Skills/CoE sizing)
- Portfolio A vs B P&L split
- HPC Monitoring tool
- AI Sovereignty Index v3.0

---

## Session Rules

- Read this file fully before doing any work
- Run `node --check` on extracted JS before every `present_files` — no exceptions
- Check div balance in any block that generates HTML
- Never hardcode step numbers — always use `SASC_STEP` or `getActiveSteps()`
- Never use `<div>` inside `<button>` — use `<span style="display:block">`
- Currency: USD default (configurable INR/EUR/GBP/AED/SGD)
- Tools open in same tab (`window.location.href`)
- 3D Office Visualization and AI Team JDs are NOT part of ATLAS
- For Sovereign AI Platform engagements: load Playbook v1.0 + Project Brief first. Confirm: *"Playbook v1.0 and [Project name] Brief loaded. Ready to proceed."*
