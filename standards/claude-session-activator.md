# ATLAS Claude Session Activator v2.6
**Read this file fully at the start of every ATLAS build session before touching any code.**
*Last updated: 2026-06-25 | Build: SizingEngine, MaaS fleet model, fleet capacity view, auto-save, BOM fixes*

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
| SizingEngine | **inlined in sasc/index.html** | v1.2 ✓ (was shared/sasc-sizing.js — 403 on GH Pages) |
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

## SizingEngine — Core Physics (v1.2)

**Location:** Inlined in `sasc/index.html` as `<script>` block (external file returns 403 on GitHub Pages).
**Init:** `SizingEngine.init(sbUrl, sbKey)` — called in SASC `init()` before `renderStep(1)`. Loads all reference tables, syncs to `ALL_GPU_CONFIGS`, `ALL_MODELS`, `ALL_UC_TYPES`.

### Throughput formula (dual-bound model)
```
Bandwidth bound: (BW_GBs / model_GB_per_GPU) × B^0.6   (sub-linear batch amortisation)
Compute bound:   TFlops × 0.17 / flops_per_token        (17% efficiency — realistic vLLM)
Actual TPS:      min(bandwidth_bound, compute_bound)     (binding constraint varies with batch)
```
- Profile B (UC internal, low concurrency): batch=4, memory-bandwidth bound
- Profile A (MaaS API, high concurrency): batch=peak_concurrent, transitions to compute-bound

### KV cache formula
- **Exact** (when `num_layers`, `num_kv_heads`, `head_dim` in model_catalogue):
  `M_KV = 2 × L × H_kv × D_head × C_max × N × B_cache`
  KV cache is always FP16 (B_cache=2) regardless of weight precision — standard vLLM/TRT-LLM behaviour
- **Field rule fallback** (when architecture params absent):
  Small 7-14B: 0.15 MB/token · Medium 14-35B: 0.25 · Large 70-80B: 0.35 · XLarge: 0.50

### Concurrency model
- Little's Law: `N = λ × W` where W = latency SLA in seconds (not hardcoded 2s)
- MaaS peak concurrent = DAU × peak_concurrent_pct (from archetype, default 5%)

### Public API
```javascript
SizingEngine.init(sbUrl, sbKey)          // loads all reference data
SizingEngine.sizeUC(config, gpuId)       // Profile B — raw GPU count, no packaging
SizingEngine.sizeMaaS(config, gpuId)     // Profile A — GPU count with 3 buffer layers
SizingEngine.sizeGPUaaS(config, gpuId)  // direct allocation
SizingEngine.sizeBMaaS(config)           // CPU servers
SizingEngine.fleetTotal(ucR, maasR, gaas, bmaas, mdcSpec)  // aggregate + MW check
SizingEngine.maxUsersFromGPUs(archetypeCfg, gpu, gpus, utilisationPct)  // reverse calc
SizingEngine.throughputAudit(gpu, model, params_b, precision, profile, batchSize)
SizingEngine.getGPUConfigs()  .getModels()  .getUCTypes()  .getArchetypes()
```

### Buffer layers (MaaS Profile A)
```
Standard SLA:  +25% peak headroom · +15% failover · +12% multi-tenancy
Enterprise SLA: +30% peak headroom · +30% failover · +12% multi-tenancy
```

### GPU count philosophy
- `sizeUC()` and `sizeMaaS()` return **raw GPU count only**
- Packaging (GPUs → servers/racks) happens at BOM time only
- `gpusToUnits()` used in BOM: `ceil(totalGPUs / gpus_per_unit)`

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
