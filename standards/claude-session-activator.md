# ATLAS Claude Session Activator
**Read this file at the start of every ATLAS build session before touching any code.**

---

## Platform Identity

**ATLAS** — AI Transaction and Lifecycle Architecture Suite
**Owner:** Arvind Bajaj, Mumbai. OEM specialising in AI/HPC hardware + SI delivery.
**Deployed at:** `arvindbajaj5.github.io/atlas-platform`
**Stack:** GitHub Pages (hosting) · Supabase (database + auth) · Google Drive (file storage)
**Brand:** Navy `#002870` · Orange `#FF5539` · Teal `#00B290` · Amber `#FFB600` · Blue `#1C38F5` · Font: Inter

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
| Engagement Docket | `tools/engagement-docket/index.html` | v2.3.1 ✓ |
| SASC | `tools/sasc/index.html` | S2–S3 fixed — validation in progress |
| TSAP Financial Model | `tools/tsap-financial-model/index.html` | Updated ✓ |
| Inferencing Factory | `tools/inferencing-factory/index.html` | Live |
| GeoAI Configurator | `tools/geoai-configurator/index.html` | Live |
| COMPASS | `tools/compass/index.html` | Live |
| Deal Analysis | `tools/deal-analysis/index.html` | Live |
| Shared libs | `shared/atlasAI.js`, `shared/atlasExport.js` | Live |
| HPC Monitoring | TBD | Not yet built |
| AI Sovereignty Index | TBD | Not yet built |

---

## Supabase Schema — Critical Facts

**Connection:** `atlas_global_cfg` in localStorage → `{ sbUrl, sbKey }`

### `docket_items` — confirmed columns
```
id (text PK), docket_id (text FK), item_type (text), title (text),
content (jsonb), source_id (text), status (text), assigned_to (text),
due_date (date), notes (text), created_at (timestamptz), created_by (text),
section (text), ref_table (text), ref_id (text), sort_order (int), item_subtype (text)
```

### Check constraints — MUST respect on ALL inserts
```
item_type: action | intel | pei | uc | rfp | pitch | solution | bom | proposal | pricing | exec_doc
section:   profile | strategy | uc | action | output | note | agreement
status:    pending | in_progress | done | closed
```

### Status translation (UI labels ↔ DB values)
```
UI → DB:  proposed→pending, agreed→done, scratched→closed
          open→pending, wip→in_progress, blocked→closed, active→pending
DB → UI:  uc section:     pending→proposed, done→agreed, closed→scratched
          action section: pending→open, in_progress→wip, done→done, closed→blocked
```
Functions in Docket: `toDbStatus()`, `fromDbStatus(section, s)`, `normalizeItems(arr)`

### Key save patterns
```javascript
// UC:        section='uc', item_type='uc', ref_table='uc_library', ref_id=ucId (slug e.g. geo-uc-010)
// Portfolio: section='output', item_type='solution', item_subtype='portfolio_selection', content={items:[...]}
// MaaS:      section='output', item_type='solution', item_subtype='maas_config', content={...}
// Action:    section='action', item_type='action', status='pending'  (NOT 'open')
// Strategy:  section='strategy', item_type='pitch', item_subtype='position'|'pitch'|'watch'
// Vision:    section='output', item_type='exec_doc', item_subtype='vision_doc', content={...}
```

**UC ref_id format:** slug (e.g. `geo-uc-010`), NOT a UUID. Accept any non-empty string. Docket is source of truth — all refs kept even if not in active uc_library. Title-match fallback when ref_id absent.

### Other key tables
- `engagements` — id, name, customer_id, type, engagement_type, territory, requirements(jsonb), docket_id
- `territory_profiles` — id(slug), territory, profile(jsonb S1), raw_intel, session(jsonb {s2,objectives,overrides,twoByTwo})
- `app_config` — key, value. Territory cost overrides: `key=territory_config_{engId}`, value=`{power_tariff, water_cost, land_cost, engineer_salary, civil_index, construction_cr}`
- `uc_library` — id (slug, e.g. geo-uc-010), uc_name, cluster, complexity, status
- `gpu_configs` — 12 architectures seeded + simulation columns. NVIDIA: H200 SXM5, B200/B300/GB200/GB200 NVL144/Vera Rubin NVL72. AMD: MI355X, MI400X, MI450X
- `model_catalogue` — 67 rows confirmed. Coding models added. Codestral disabled (MNPL).
- `customers`, `profiler_archetypes`, `profiler_archetype_dims`

---

## Engagement Docket v2.3.1

### Tab flow
`Overview → Profile & Intelligence → Portfolio → [Use Cases] → [Service Model] → [Territory] → Actions → Outputs → History`
- UC tab: only when `L2-DAC` in portfolio selection
- Service Model tab: when `L2-MAAS/GPUAAS/BMAAS` in portfolio
- Territory tab: TSAP engagements only

### Territory Intelligence Modal (S1→S2→S3)
- Opens to **S1** always; "View Strategic Profile →" goes to S3 when S2 exists
- S1: Gemini search + 12-section extraction → saved to `territory_profiles`
- S2: Objectives form + AI profiling
- S3: Radar, 2×2, archetype match, feasibility grid
- Key TP functions: `tpStartS1`, `tpRunS2`, `tpS3Result`, `tpLoadCached`, `tpSaveProfile`
- PATCH-first then POST fallback for saves
- `showToast` requires `<div id="toast">` in HTML body

### addUCToDocket — save pattern
```javascript
{ id: genId('DI'), docket_id, section:'uc', item_type:'uc',
  title: uc.uc_name, ref_table:'uc_library', ref_id: ucId,
  content: { uc_id: ucId, uc_name: uc.uc_name, cluster: uc.cluster },
  status:'pending', created_by:'ATLAS' }
```

---

## TSAP Financial Model

- S1-S4 pipeline removed — lives in Docket
- Opens to `cost` tab; `← Docket` button in header
- `loadTerritoryConfigFromDocket(engId)` loads overrides from `app_config` on init
- Tabs: `cost | supply | gap | revenue | cashflow | whatif | terrconfig`

---

## SASC — Architecture & Known State

### Screen structure
| Step | Key | Condition |
|---|---|---|
| 1 | `scope` | Always |
| 2 | `workloads_a` | `outputStack.ucdev === true` |
| 3 | `workloads_b` | `outputStack.maas/gpuaas/bmaas === true` |
| 4 | `workloads_c` | `outputStack.skills/coe` — placeholder 🚧 |
| 5 | `bom` | Always |

### Critical architecture rules (hard-won)
- **Render functions must never trigger async re-renders of themselves.** Only `renderStep()` owns the async load → render sequence.
- `loadSvcModelCatalogue()` is called only from `renderStep(workloads_b)`, never from `renderWorkloadB()` or `renderMaasSimTab()`.
- `loadWorkloadProfiles()` is called only from `renderStep(workloads_a)`.
- All `renderStep(N)` hardcodes inside MaaS section must be `renderStep(SASC_STEP)` — step numbers shift with outputStack.
- `SASC_LOAD_GEN` counter: incremented on every `renderStep()` call; `loadWorkloadProfiles()` captures `_myGen` at start and aborts final DOM write if generation has changed (user navigated away).
- `SVC_MC_STATE` guards: `loadSvcModelCatalogue()` returns immediately on `loading | loaded | error` — never re-runs on error.

### SASC reads from Docket
- Scope, UCs (`section=uc`, `ref_id` = uc_library slug), portfolio (`item_subtype=portfolio_selection`)
- MaaS config (`item_subtype=maas_config`)
- Territory cost overrides from `app_config` key `territory_config_{engId}`
- After `Object.assign(SASC_DATA, saved)` from docket item: URL params are immediately re-applied (docketId/engId must never be overwritten by saved config)

### UC matching priority in init()
1. `ref_id` direct lookup in `_ucById` map (accepts slug or UUID)
2. `content.uc_id` jsonb field
3. `ref_id` present but not in active library — kept anyway (docket is source of truth)
4. Title match against `uc_library.uc_name` as last resort

### Workloads A (S2)
- UCs display using `uc.uc_name || uc.title` — GeoAI UCs have no `title` field
- UC type matching uses `uc.uc_name` not `uc.title` for type inference
- `fmtNum(n)` defined as global utility: `Number(n||0).toLocaleString()`

### Workloads B (S3) — MaaS / GPUaaS / BMaaS
- MaaS: 3-layer sim (Architecture Comparison, Usage Heatmap, Mix Optimiser)
- `MAAS_SIM_SEL = []` on init — user must select GPU(s) to run simulation
- GPUaaS: toggle + GPU count + USD/GPU-hr
- BMaaS: toggle + server count + USD/server/hr
- `renderGpuBmaasSection()` toggle buttons still have hardcoded `renderStep(3)` — fix when next touching S3

### Workloads C (S4)
- Pure placeholder 🚧 — "Skills Academy & CoE sizing coming in next release"
- Only shown when `outputStack.skills || outputStack.coe`

### FX rates
- `loadFxRates()` calls `api.frankfurter.app` — blocked by CORS on GitHub Pages. Non-fatal, falls back to hardcoded rates. Do not attempt to fix via CORS workaround; replace with static fallback table if needed.

---

## MaaS Product Spec

**Pricing model:** API/consumption-only — no subscription bundles
**Usage types (6 fixed):** text · coding · document · audio · indic · generic
**Model tiers:** Basic · Mid · Advanced
**Demand input:** DAU — set in Docket MaaS tab
**SLA tiers:** Standard · Enterprise
**Free trial:** 15 days

---

## Output Stack Concept

| Bucket | What | Status |
|---|---|---|
| AI Applications | Use Cases (UCs) | Active |
| AI Infrastructure Services | MaaS / GPUaaS / BMaaS | Active |
| AI Capability Building | Skills Academy / CoE | Placeholder |

**Portfolio A vs B distinction (parked):** A = Centre Build (OEM → SI/govt P&L), B = Centre Services (centre → enterprise/agency P&L).

---

## Google Drive Structure

**Root folder ID:** `1L6Ta_fqSlUpzE0iNr0Be9ooRjfhPRsRd`
Categories: 01-Sales Enablement · 02-Opportunity Management · 03-Presales · 04-Business Operations Management
Tools baselined: Portfolio Deck V5 · AI Value Chain Tool · Deal Analysis HTML · Sovereign Playbook+Brief · Inferencing Factory v2.2+Profiler+GeoAI NE India · GeoAI Civilian+decks+BOM · GeoAI Military HTML · COMPASS slides+validator · RAC Tool HTML

---

## Development Conventions

### Python patching
```python
old = "exact string from file"   # must match exactly, count=1
new = "replacement"
c = content.count(old)           # verify = 1 before replacing
content = content.replace(old, new, 1)
```

### Syntax validation
```python
r = subprocess.run(['node', '--check', '/tmp/check.js'], capture_output=True, text=True)
fns = re.findall(r'(?:async\s+)?function\s+(\w+)\s*\(', js)
dupes = [(f,c) for f,c in Counter(fns).items() if c>1]
```

### atlasAI.js
```javascript
atlasAI.init(sbUrl, sbKey)
atlasAI.call(prompt, opts)        // {ok, text, tokens}
atlasAI.callAndParse(prompt, opts) // {ok, data, tokens}
```

### GitHub push
Token (`$GITHUB_TOKEN`) not available in Claude sessions — always output to `/mnt/user-data/outputs/` for manual deploy. Reliable fetch via `curl -s raw.githubusercontent.com/...`.

---

## Standards Files (.md) — Build Priority

`brand.md` · `project-definition-schema.md` · `hardware-preferences.md` · `architecture-tiers.md` · `tool-features.md` · `claude-session-activator.md` (this file)

---

## Build Tracker & Pending Work

**Primary reference:** `SASC-Requirements-Modelling-Gap-Analysis.md` — the living requirements, design spec, and gap register. Read this at the start of any SASC, MaaS, FM, or BOM build session. It contains the full confirmed spec from the June 23 design session and a prioritised gap register (Sections 5.1–5.6) with status tracking.

**Gap register summary — current Phase:**

Phase 1 — Fleet View (in progress):
- [x] **[Supabase]** `pricing_params` table seeded — 47 rows, 10 categories (Gap B1 ✅ 2026-06-24)
- [ ] **[SASC S3]** MaaS buffer model — peak headroom + failover + multi-tenancy (Gaps M1, M2)
- [ ] **[SASC S3]** Fleet allocation table — aggregate UC + MaaS + GPUaaS GPUs, MW check (Gaps F1, F2, F3)
- [ ] **[SASC S3]** Demand curves / temporal heatmap — archetype shapes, aggregate curve (Gap M4)
- [ ] **[SASC S3]** Cost per million tokens — GPU cost ÷ throughput × utilisation (Gap M7)

Phase 2 — Complete BOM:
- [ ] Networking in BOM (Gap B3)
- [ ] Platform software / security / resilience uplifts (Gaps B4, B5, B6)
- [ ] UC dev effort in ROM (Gap B7)
- [ ] SASC → FM BOM push (Gap FM1)

Phase 3 — Commercial Model:
- [ ] FM Revenue tab: MaaS token pricing + margin curves (Gap FM2)
- [ ] FM Fleet P&L (Gap F4)

Other open items:
- [ ] SASC S3: fix `renderStep(3)` hardcodes in `renderGpuBmaasSection` toggle buttons (Gap H1)
- [ ] SASC S2–S5: full validation with live docket data — in progress
- [ ] SASC S4 (Workloads C): Skills Academy / CoE — parked until Phase 1 complete
- [ ] Docket: UC status display, action persistence, history tab
- [ ] TSAP FM: verify territory cost override flow end-to-end
- [ ] Vision Document: generate from Outputs tab
- [ ] HPC Monitoring tool
- [ ] AI Sovereignty Index v3.0

---

*Last updated: 2026-06-24 | Build: SASC S2–S3 nav fixed, UC matching fixed, MaaS loop fixed, fmtNum added*

---

## Vision Document — Architecture

**Function:** `generateVisionDoc()` in Engagement Docket
**Trigger:** Overview tab OR S3 modal "Generate Vision Doc" button
**Library:** `atlasExport.word()` · **Logo:** `atlas_global_cfg.company.brandLogoData` or `atlas_logo` localStorage

### AI generation — 3 calls (each under 2000-token Supabase cap)
```
Call 1 (~1400 tokens): territory_narrative + needs_narrative + strengths_risks_narrative
Call 2 (~1300 tokens): strategic_position_narrative + vision_statement
Call 3 (~1200 tokens): uc_services_narrative + territory_benefits_narrative
```
AtlasAI config: `{"model":"gemini-2.5-flash","maxTok":2000,"timeout":30000}` · Per-call maxTokens: 1800

### Caching
Cache in `docket_items`: `id='{docketId}-vision-narrative'`, `item_type='exec_doc'`, `item_subtype='vision_narrative'`
`content.inputs_hash` = hash of territory + objectives + UCs + portfolio + S1/S2 headlines

### 10 document sections
1. Territory — Why Here · 2. The Challenge · 3. Strengths & Risks · 4. Strategic Positioning (2×2)
5. The Vision · 6. Scope of Work (plain English, NO L1/L2/L3) · 7. What the Centre Will Do (UC table)
7a. Managed Services · 8. What [Territory] Gains · 9. Investment & Timeline (skips if "Not defined")
10. Next Steps

### Key rules
- NEVER use L1/L2/L3 codes — use `SCOPE_LABELS` map
- Services: "Model as a Service" not "MaaS", "GPU as a Service" not "GPUaaS"
- 2×2 table: "PRIMARY:" and "Also:" markers, no `\n` in cells
- All sections have fallback content — doc never renders empty

---

## Session Rules

- Read this file fully before doing any work
- Never use L1/L2/L3 codes in customer-facing outputs
- Currency: USD default (configurable)
- Tools open in same tab
- 3D Office Visualization and AI Team JDs are NOT part of ATLAS
- For Sovereign AI Platform engagements: load `Sovereign_AI_Platform_Playbook_v1.0.docx` + Project Brief first. Confirm: *"Playbook v1.0 and [Project name] Brief loaded. Ready to proceed."*
