# ATLAS Claude Session Activator
**Read this file at the start of every ATLAS build session before touching any code.**

---

## Platform Identity

**ATLAS** — AI Transaction and Lifecycle Architecture Suite
**Owner:** Arvind Bajaj, Mumbai. OEM specialising in AI/HPC hardware + SI delivery.
**Deployed at:** `arvindbajaj5.github.io/atlas-platform`
**Stack:** GitHub Pages (hosting) · Supabase (database + auth) · Google Drive (file storage)
**Brand:** Navy `#002870` · Orange `#FF5539` · Teal `#00B290` · Amber `#FFB600` · Blue `#1C38F5` · Font: Inter

---

## Tool Inventory & Locations

| Tool | Path | Status |
|---|---|---|
| Portal / Home | `index.html` | Live |
| Engagement Docket | `tools/engagement-docket/index.html` | v2.3.1 ✓ |
| SASC | `tools/sasc/index.html` | Updated ✓ |
| TSAP Financial Model | `tools/tsap-financial-model/index.html` | Updated ✓ |
| Inferencing Factory | `tools/inferencing-factory/index.html` | Live |
| GeoAI Configurator | `tools/geoai-configurator/index.html` | Live |
| COMPASS | `tools/compass/index.html` | Live |
| Deal Analysis | `tools/deal-analysis/index.html` | Live |
| Shared libs | `shared/atlasAI.js`, `shared/atlasExport.js` | Live |

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
// UC:        section='uc', item_type='uc', ref_table='uc_library', ref_id=ucId, status='pending'
// Portfolio: section='output', item_type='solution', item_subtype='portfolio_selection', content={items:[...]}
// MaaS:      section='output', item_type='solution', item_subtype='maas_config', content={...}
// Action:    section='action', item_type='action', status='pending'  (NOT 'open')
// Strategy:  section='strategy', item_type='pitch', item_subtype='position'|'pitch'|'watch'
// Vision:    section='output', item_type='exec_doc', item_subtype='vision_doc', content={...}
```

### Other key tables
- `engagements` — id, name, customer_id, type, engagement_type, territory, requirements(jsonb), docket_id
- `territory_profiles` — id(slug), territory, profile(jsonb S1), raw_intel, session(jsonb {s2,objectives,overrides,twoByTwo})
- `app_config` — key, value. Territory cost overrides: `key=territory_config_{engId}`, value=`{power_tariff, water_cost, land_cost, engineer_salary, civil_index, construction_cr}`
- `uc_library` — id, uc_name, cluster, complexity, status
- `customers`, `model_catalogue`, `profiler_archetypes`, `profiler_archetype_dims`

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

### Known bugs fixed in v2.3.1
- `#toast` div was missing → showToast crashed
- `tp_parseJSON` recursive call → stack overflow
- Nav buttons called `switchTab('profile')` → reset TP state
- `loadProfileFromSB` reset TP while modal open
- `tpTimerStart/Stop/Display` and `TP_TIMER` were missing
- `docket_items` column errors: `data`→`content`, removed `engagement_id`/`rag`, fixed `item_type` and `status` check constraints

---

## TSAP Financial Model (cleaned up)

- S1-S4 pipeline **removed** — lives in Docket now
- Opens to `cost` tab; `← Docket` button in header
- `loadTerritoryConfigFromDocket(engId)` loads overrides from `app_config` on init
- Field mapping Docket→FM: `power_tariff`→`power_tariff_inr`, `engineer_salary`→`engineer_salary_lakh`, etc.
- Tabs: `cost | supply | gap | revenue | cashflow | whatif | terrconfig`

---

## SASC

- 4 screens: Scope Confirmation → Stack Config → People/ROM → BOM
- Screen 1 reads from Docket: requirements, UCs (`section=eq.uc`), portfolio (`item_subtype=eq.portfolio_selection`)
- Portfolio loading pre-enables service models and sets `dcType`
- Territory costs from `app_config` → salary_ratio applied to ROM people cost
- `backToDocket()` returns with `?eng=&docket=` params

---

## Development Conventions

### Python patching
```python
old = "exact string from file"   # must match exactly, count=1
new = "replacement"
c = content.count(old)           # verify = 1 before replacing
content = content.replace(old, new, 1)
```

### Syntax validation (always run after patches)
```python
r = subprocess.run(['node', '--check', '/tmp/check.js'], capture_output=True, text=True)
# Check for duplicate function names too
fns = re.findall(r'(?:async\s+)?function\s+(\w+)\s*\(', js)
dupes = [(f,c) for f,c in Counter(fns).items() if c>1]
```

### atlasAI.js
```javascript
atlasAI.init(sbUrl, sbKey)
atlasAI.call(prompt, opts)           // {ok, text, tokens}
atlasAI.callAndParse(prompt, opts)   // {ok, data, tokens}
```

---

## Pending Work

- [ ] Docket validation pass — UC status display, action persistence, history tab
- [ ] TSAP FM — verify territory cost overrides in financial calculations
- [ ] SASC — full Screen 2-4 validation with live docket data
- [ ] Vision Document (S4) — generate from Outputs tab
- [ ] Intel Ops — curation/coherence architecture
- [ ] HPC Monitoring tool
- [ ] AI Sovereignty Index v3.0

---

*Last updated: 2026-06-22 | Build: Docket v2.3.1 + SASC + TSAP FM updated*

---

## Vision Document — Architecture (updated 2026-06-22)

**Function:** `generateVisionDoc()` in Engagement Docket  
**Trigger:** Overview tab "Generate Vision Doc" button OR S3 modal "Generate Vision Doc" button  
**Library:** `atlasExport.word()` for formatting + font/brand rules  
**Logo:** Read from `atlas_global_cfg.company.brandLogoData` or `atlas_logo` in localStorage (data URL)

### AI generation — 3 focused calls (each under 2000 token Supabase cap)
```
Call 1 (~1400 tokens): territory_narrative + needs_narrative + strengths_risks_narrative
Call 2 (~1300 tokens): strategic_position_narrative + vision_statement
Call 3 (~1200 tokens): uc_services_narrative + territory_benefits_narrative
```
AtlasAI Supabase config: `{"model":"gemini-2.5-flash","maxTok":2000,"timeout":30000}`  
Per-call maxTokens: 1800 (safely under cap)

### Caching
- Cache stored in `docket_items`: `id='{docketId}-vision-narrative'`, `item_type='exec_doc'`, `item_subtype='vision_narrative'`
- `content.inputs_hash` = hash of territory + objectives + UCs + portfolio + S1/S2 headlines
- Cache hit = instant doc, no AI call. Cache miss or hash changed = regenerate.
- TP loaded from `territory_profiles` Supabase table if not in memory (after page refresh)

### 10 document sections
1. Territory — Why Here (S1-grounded narrative)
2. The Challenge (requirements + metadata table)
3. Assessment — Strengths & Risks (S2 synthesis + bullets)
4. Strategic Positioning (2×2 matrix table + narrative)
5. The Vision (AI-written vision statement)
6. Scope of Work (plain English, NO L1/L2/L3 product codes)
7. What the Centre Will Do (UC table + narrative)
7a. Managed Services (with plain-English descriptions)
8. What [Territory] Gains (benefits narrative — critical section)
9. Investment & Timeline (only renders if data present, skips "Not defined")
10. Next Steps (all actions)

### Key rules
- Scope labels: NEVER use L1/L2/L3 codes — use `SCOPE_LABELS` map for plain English
- Services: "Model as a Service" not "MaaS", "GPU as a Service" not "GPUaaS"
- Section 9 only renders if budget_range ≠ 'Not defined' AND timeline present
- All sections have fallback content when AI fails — doc never renders empty sections
- 2×2 table: uses "PRIMARY:" and "Also:" markers, no `\n` in cells
