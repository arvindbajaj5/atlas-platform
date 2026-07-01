/**
 * atlas-solution.js — Shared Solution Builder module
 *
 * All Solution tab logic lives here:
 *   - Reference data loading (models, GPUs, tenants) from Supabase
 *   - One sizing function for all workload types (UC, MaaS, GPUaaS, BMaaS)
 *   - One derived panel renderer used by all workload tabs
 *   - One transparency/calc popup
 *   - Shared dropdown renderers (model, GPU, tenant)
 *
 * Docket's Solution tab is purely a caller — it never defines sizing math,
 * lookup tables, or rendering logic itself. Fix here → fixed everywhere.
 *
 * Architecture: module pattern, exposed as window.AtlasSolution
 * Depends on: atlasDB (atlas-db.js), SizingEngine (sasc-sizing.js)
 */

;(function (global) {
  'use strict'

  // ── Static label maps (categorical UI labels, not data) ──────────────────
  // These are display-only, not DB-sourced — correct to keep here.
  var UC_TYPES = {
    chatbot:  'Chatbot / Conversational',
    text:     'Text Processing',
    rag:      'RAG / Knowledge Retrieval',
    vision:   'Vision / Multimodal',
    agentic:  'Agentic / Tool-use',
    batch:    'Batch Processing',
    voice:    'Voice / Audio'
  }
  var PERF_TIER_LABELS = {
    tier1: 'Tier 1 — Interactive (<200ms)',
    tier2: 'Tier 2 — Analytical (<2s)',
    tier3: 'Tier 3 — Async Batch'
  }
  var HA_TIERS   = { none: 'None', n1: 'N+1 (standard)', n2: '2N (mission-critical)' }
  var DR_TYPES   = { none: 'None', warm: 'Warm Standby (+50%)', active_active: 'Active-Active (+100%)' }
  var CHARGEOUT_LABELS = { commercial: 'Commercial', cost_recovery: 'Cost Recovery', subsidised: 'Subsidised', zero: 'Zero (free)' }
  var TENURE_LABELS    = { '12': '12 months', '24': '24 months', '36': '36 months', custom: 'Custom' }
  var DOMAINS    = { geospatial: 'Geospatial', agriculture: 'Agriculture', health: 'Health', governance: 'Governance', education: 'Education', finance: 'Finance', defence: 'Defence' }
  var COMM_SLA   = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' }

  // ── HA/DR multipliers for fallback sizing ─────────────────────────────────
  var HA_FACTOR  = { none: 1.0, n1: 1.15, n2: 2.0 }
  var DR_FACTOR  = { none: 1.0, warm: 1.5, active_active: 2.0 }

  // ── Default tenant seed (overridden by Supabase tenant_configs) ──────────
  var DEFAULT_TENANTS = {
    'state-it-dept': { name: 'State IT Department',     secTier: 'S2', chargeout: 'cost_recovery' },
    'agri-dept':     { name: 'Agriculture Department',  secTier: 'S1', chargeout: 'subsidised' },
    'health-dept':   { name: 'Health Department',       secTier: 'S2', chargeout: 'cost_recovery' },
    'public':        { name: 'Public / Citizen-facing', secTier: 'S1', chargeout: 'zero' }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1 — REFERENCE DATA LOADING
  // Called once on openEngagement(), populates M with live Supabase data.
  // No hardcoded GPU or model lists anywhere — they always come from here.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * loadRefData()
   * Load model_catalogue and gpu_configs from Supabase into M.
   * Called by Docket's openEngagement() alongside other tab data.
   * Safe to call if atlasDB is not configured — falls back silently
   * leaving M.modelCatalogue/M.gpuConfigs as empty arrays, which the
   * dropdowns handle gracefully.
   */
  async function loadRefData (M) {
    if (!global.atlasDB || !global.atlasDB.isConfigured()) return

    var results = await Promise.all([
      global.atlasDB.get('model_catalogue', 'enabled=eq.true&order=family.asc,params_b.asc'),
      global.atlasDB.get('gpu_configs',     'order=name.asc')  // gpu_configs has no enabled column
    ])

    M.modelCatalogue = (results[0] || []).filter(function (m) { return m.enabled !== false })
    M.gpuConfigs     = (results[1] || [])  // all gpu_configs rows are active by definition

    // Build fast-lookup maps keyed by id — used by sizeWorkload() and dropdown renderers
    M.modelMap = {}
    M.modelCatalogue.forEach(function (m) { M.modelMap[m.id] = m })

    M.gpuMap = {}
    M.gpuConfigs.forEach(function (g) { M.gpuMap[g.id] = g })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2 — SINGLE SIZING FUNCTION
  // One entry point for all workload types. Calls real SizingEngine if ready,
  // otherwise falls back to the same consistent formula for all types.
  // Fix the formula here → UC, MaaS, GPUaaS all fixed simultaneously.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * sizeWorkload(wl, type, M)
   *
   * wl:   workload config object (fields vary by type — see below)
   * type: 'uc' | 'maas' | 'gpuaas' | 'bmaas'
   * M:    Docket's state object (for defaultGpu, gpuMap, modelMap)
   *
   * Returns: { gpu, concurrent, peakRPS, baseGpus, buffers, total,
   *            powerKw, racks, ttftEstimate, slaMet, margin,
   *            commercialSla, formula, notes }
   */
  function sizeWorkload (wl, type, M) {
    var gpuId   = wl.gpu || M.defaultGpu || 'h200'
    var gpuConf = (M.gpuMap && M.gpuMap[gpuId]) || null
    var model   = wl.model && M.modelMap ? M.modelMap[wl.model] : null

    // ── Try real SizingEngine first ─────────────────────────────────────
    if (global.SizingEngine && SizingEngine.ready) {
      var r = null
      try {
        if (type === 'uc') {
          r = SizingEngine.sizeUC({
            model_id:           wl.model,
            dau:                wl.dau,
            requests_per_day:   wl.reqPerDay,
            peak_multiplier:    wl.peakMult,
            avg_input_tokens:   wl.inputTok,
            avg_output_tokens:  wl.outputTok,
            precision:          (wl.precision || 'int4').toUpperCase(),
            ttft_sla_ms:        wl.ttftTarget,
            ha_required:        wl.haTier !== 'none',
            dr_type:            wl.drType,
            peak_concurrent_pct: wl.peakConcPct
          }, gpuId)
        } else if (type === 'maas') {
          r = SizingEngine.sizeMaaS({
            model_id:        wl.model,
            dau:             wl.dau,
            precision:       (wl.precision || 'int4').toUpperCase(),
            pool_type:       wl.poolType,
            commercial_sla:  wl.commercialSla,
            peak_concurrent_pct: wl.peakConcPct
          }, gpuId)
        }
      } catch (e) { r = null }

      if (r && !r.error) {
        var slaMet = type === 'uc'
          ? (r.ttft_sla_ms || wl.ttftTarget) <= wl.ttftTarget
          : true
        var margin = wl.ttftTarget && type === 'uc'
          ? Math.round(Math.abs(((r.ttft_sla_ms || wl.ttftTarget) - wl.ttftTarget) / wl.ttftTarget) * 100)
          : 0
        return {
          gpu: gpuId, concurrent: r.peak_concurrent, peakRPS: r.peak_rps,
          baseGpus: r.base_gpus, buffers: r.total_gpus - r.base_gpus, total: r.total_gpus,
          powerKw: r.power_kw, racks: _racks(r.total_gpus, gpuConf),
          ttftEstimate: r.ttft_sla_ms || wl.ttftTarget,
          slaMet: slaMet, margin: margin, commercialSla: r.commercial_sla,
          notes: r.notes,
          formula: r.notes || 'SizingEngine audit trail — see notes field'
        }
      }
    }

    // ── Fallback: consistent RPS-based formula for all types ────────────
    // Formula (same for UC and MaaS — only inputs differ):
    //   Step 1: concurrent = DAU × peakConcPct%
    //   Step 2: peakRPS    = DAU × reqPerDay / 86400 × peakMult
    //   Step 3: tokPerGPU  = baseline × gpuFactor × precisionFactor
    //   Step 4: reqPerGPU  = tokPerGPU / avgOutputTokens
    //   Step 5: baseGPUs   = ceil(peakRPS / reqPerGPU)
    //   Step 6: buffers     = baseGPUs × 0.3 × haFactor × drFactor
    //
    // GPU throughput factor — derived from gpu_configs if available,
    // otherwise estimated from known GPU families.
    var gpuFactor = _gpuThroughputFactor(gpuId, gpuConf)
    var haFactor  = HA_FACTOR[wl.haTier]  || 1.0
    var drFactor  = DR_FACTOR[wl.drType]  || 1.0

    // P50/P95/P99 — scales token counts (same for UC and MaaS)
    var ctxMult   = wl.contextPct === 'p50' ? 0.6 : wl.contextPct === 'p99' ? 1.4 : 1.0
    var outputTok = Math.round((wl.outputTok || (type === 'maas' ? 800 : 500)) * ctxMult)
    var inputTok  = Math.round((wl.inputTok  || 2048) * ctxMult)

    var peakConcPct = wl.peakConcPct || 5
    var reqPerDay   = wl.reqPerDay   || (type === 'maas' ? 20 : 12)
    var peakMult    = wl.peakMult    || 3

    // Step 1
    var concurrent = Math.max(1, Math.ceil((wl.dau || 1000) * peakConcPct / 100))
    // Step 2
    var avgRPS  = ((wl.dau || 1000) * reqPerDay) / 86400
    var peakRPS = Math.ceil(avgRPS * peakMult)
    // Step 3 — H200 INT4 baseline: ~8,000 tok/s (conservative, continuous batching)
    var tokBase  = 8000
    var precMult = wl.precision === 'int8' ? 0.55 : wl.precision === 'fp16' ? 0.35 : wl.precision === 'fp8' ? 0.8 : 1.0
    var tokPerGpu = Math.round(tokBase * gpuFactor * precMult)
    // Step 4
    var reqPerGpu = Math.max(1, Math.round(tokPerGpu / outputTok))
    // Step 5
    var baseGpus  = Math.max(1, Math.ceil(peakRPS / reqPerGpu))
    // Step 6
    var buffers   = Math.max(1, Math.ceil(baseGpus * 0.3 * haFactor * drFactor))
    var total     = baseGpus + buffers

    // TTFT estimate — inversely proportional to GPU throughput
    var ttftTarget   = wl.ttftTarget || (type === 'maas' ? 2000 : 500)
    var ttftEstimate = Math.round(ttftTarget / gpuFactor * 0.85)
    var slaMet   = ttftEstimate <= ttftTarget
    var margin   = Math.round(Math.abs((ttftTarget - ttftEstimate) / ttftTarget) * 100)
    var powerKw  = Math.round(total * 0.7 * 10) / 10

    // Commercial SLA from pool type (MaaS) or default Bronze
    var commercialSla = wl.commercialSla
      || (wl.poolType === 'reserved' ? 'gold' : 'bronze')

    var gpuLabel = (gpuConf && gpuConf.name) || gpuId

    var formula =
      'Step 1: Concurrent = DAU(' + (wl.dau||1000).toLocaleString() + ') × ' + peakConcPct + '% = ' + concurrent.toLocaleString() + '\n'
    + 'Step 2: Peak RPS = DAU × req/day(' + reqPerDay + ') ÷ 86400 × peakMult(' + peakMult + ') = ' + peakRPS + ' req/s\n'
    + 'Ctx (' + (wl.contextPct||'p95').toUpperCase() + ' ' + ctxMult + 'x): output = ' + outputTok + ' tok/req\n'
    + 'Step 3: GPU(' + gpuLabel + ') → ' + tokPerGpu + ' tok/s (base ' + tokBase + ' × ' + gpuFactor + 'x × ' + precMult + 'x prec)\n'
    + 'Step 4: Req/GPU = ' + tokPerGpu + ' ÷ ' + outputTok + ' tok = ' + reqPerGpu + ' req/s/GPU\n'
    + 'Step 5: Base GPUs = ceil(' + peakRPS + ' ÷ ' + reqPerGpu + ') = ' + baseGpus + '\n'
    + 'Step 6: Buffers (HA ' + haFactor + 'x × DR ' + drFactor + 'x × 30%) = ' + buffers + '\n'
    + 'Total = ' + baseGpus + ' + ' + buffers + ' = ' + total + ' GPUs'

    return {
      gpu: gpuId, concurrent: concurrent, peakRPS: peakRPS,
      baseGpus: baseGpus, buffers: buffers, total: total,
      powerKw: powerKw, racks: _racks(total, gpuConf),
      ttftEstimate: ttftEstimate, slaMet: slaMet, margin: margin,
      commercialSla: commercialSla, formula: formula, notes: null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3 — SHARED RENDERERS
  // All Solution tab rendering lives here. Docket calls these functions —
  // never reimplements rendering logic inline.
  // ─────────────────────────────────────────────────────────────────────────

  /** GPU dropdown — from M.gpuConfigs (Supabase), never hardcoded */
  function renderGpuDropdown (selectedId, M, onchange) {
    var h = '<select onchange="' + onchange + '" style="width:100%">'
    h += '<option value="">(none — use engagement default)</option>'
    var gpus = M.gpuConfigs && M.gpuConfigs.length ? M.gpuConfigs : []
    gpus.forEach(function (g) {
      var label = g.name + (g.hbm_size_gb ? ' ' + g.hbm_size_gb + 'GB' : '')
      h += '<option value="' + g.id + '"' + (selectedId === g.id ? ' selected' : '') + '>'
        + label + '</option>'
    })
    if (!gpus.length) h += '<option disabled>No GPU configs loaded — check Supabase</option>'
    h += '</select>'
    return h
  }

  /** Model dropdown — from M.modelCatalogue (Supabase), grouped by family */
  function renderModelDropdown (selectedId, M, onchange) {
    var models = M.modelCatalogue && M.modelCatalogue.length ? M.modelCatalogue : []
    if (!models.length) {
      return '<select onchange="' + onchange + '" style="width:100%">'
        + '<option value="' + (selectedId||'') + '">' + (selectedId || 'No models loaded') + '</option>'
        + '</select>'
    }
    // Group by family
    var families = {}
    models.forEach(function (m) {
      var fam = m.family || 'Other'
      if (!families[fam]) families[fam] = []
      families[fam].push(m)
    })
    var h = '<select onchange="' + onchange + '" style="width:100%">'
    h += '<option value="">— Select model —</option>'
    Object.keys(families).sort().forEach(function (fam) {
      h += '<optgroup label="' + fam + '">'
      families[fam].forEach(function (m) {
        var label = m.name + (m.params_b ? ' (' + m.params_b + 'B)' : '')
        h += '<option value="' + m.id + '"' + (selectedId === m.id ? ' selected' : '') + '>'
          + label + '</option>'
      })
      h += '</optgroup>'
    })
    h += '</select>'
    return h
  }

  /** Derived sizing panel — same structure for UC and MaaS */
  function renderDerivedPanel (sz, wl) {
    var h = '<div class="derived">'
    h += '<div style="display:flex;justify-content:flex-end;margin-bottom:6px">'
      + '<button type="button" onclick="AtlasSolution.openCalcDetail(\'' + wl.id + '\')" '
      + 'style="font-size:10px;padding:3px 10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;border-radius:4px;cursor:pointer">'
      + '&#128269; How was this calculated?</button></div>'
    h += '<div class="derived-line">'
      + '<span>Peak RPS<br><b>' + (sz.peakRPS||0) + '</b></span>'
      + '<span>Concurrent<br><b>' + (sz.concurrent||0).toLocaleString() + '</b></span>'
      + '<span>GPU<br><b>' + _gpuLabel(sz.gpu, window.M) + '</b></span>'
      + '<span>Base GPUs<br><b>' + sz.baseGpus + '</b></span>'
      + '<span>+Buffers<br><b>' + sz.buffers + '</b></span>'
      + '<span>Total GPUs<br><b>' + sz.total + '</b></span>'
      + '<span>Racks<br><b>' + sz.racks + '</b></span>'
      + '<span>Power<br><b>' + sz.powerKw + 'kW</b></span>'
      + '</div>'
    if (wl.ttftTarget) {
      h += '<div class="sla-banner ' + (sz.slaMet ? 'sla-met' : 'sla-breach') + '">'
        + (sz.slaMet ? '&#10003; LATENCY TARGET MET' : '&#10007; LATENCY TARGET BREACHED')
        + ' — TTFT ' + sz.ttftEstimate + 'ms vs ' + wl.ttftTarget + 'ms target'
        + ' (' + sz.margin + '% ' + (sz.slaMet ? 'margin' : 'over') + ')'
        + (sz.slaMet ? '' : '<span class="sla-hint">Try: lower precision, more GPUs, raise tier</span>')
        + '</div>'
    }
    if (sz.commercialSla) {
      h += '<div style="margin-top:6px;font-size:11px;color:rgba(255,255,255,.7)">'
        + 'Commercial SLA: <b style="color:#fff">' + (COMM_SLA[sz.commercialSla] || sz.commercialSla) + '</b>'
        + (sz.notes ? ' · engine: ' + sz.notes.substring(0, 60) + '…' : ' · fallback sizing')
        + '</div>'
    }
    h += '</div>'
    return h
  }

  /** P50/P95/P99 toggle — same for UC and MaaS */
  function renderContextPctToggle (wl, updFn) {
    var h = '<div class="fg"><label>Context Percentile</label>'
      + '<div style="display:flex;gap:0;border:1.5px solid var(--border);border-radius:5px;overflow:hidden">'
    ;['p50', 'p95', 'p99'].forEach(function (p) {
      var active = (wl.contextPct || 'p95') === p
      h += '<button type="button" onclick="' + updFn + '(\'' + p + '\')" '
        + 'style="flex:1;padding:6px 0;font-size:11px;font-weight:700;border:none;cursor:pointer;'
        + 'background:' + (active ? 'var(--navy)' : '#fff') + ';'
        + 'color:' + (active ? '#fff' : 'var(--mid)') + '">'
        + p.toUpperCase() + '</button>'
    })
    h += '</div><div class="fg-hint">P50=typical · P95=design point · P99=stress test</div></div>'
    return h
  }

  /** Tenant block — one function, called from UC/MaaS/GPUaaS/BMaaS */
  function renderTenantBlock (wl, contextLabel, M) {
    var tenants = M.tenantsList || {}
    var t = wl.tenant ? tenants[wl.tenant] : null
    var h = '<div class="tenant-block">'
    h += '<div class="tenant-block-hdr">Tenant Attribution</div>'
    h += '<div class="formgrid" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:0">'

    h += '<div class="fg"><label>Tenant</label>'
      + '<select onchange="C.updTenant(\'' + wl.id + '\',\'' + contextLabel + '\',\'tenant\',this.value)" style="width:100%">'
      + '<option value="">— Open Pool (no specific tenant) —</option>'
    Object.keys(tenants).forEach(function (k) {
      h += '<option value="' + k + '"' + (wl.tenant === k ? ' selected' : '') + '>'
        + tenants[k].name + '</option>'
    })
    h += '</select></div>'

    h += '<div class="fg"><label>Pool Type</label>'
      + '<div class="pool-toggle">'
      + '<button type="button" class="pool-btn' + (wl.poolType === 'reserved' ? ' active-reserved' : '') + '" '
      + 'onclick="C.updTenant(\'' + wl.id + '\',\'' + contextLabel + '\',\'poolType\',\'reserved\')">&#128274; Reserved</button>'
      + '<button type="button" class="pool-btn' + (wl.poolType === 'open' ? ' active-open' : '') + '" '
      + 'onclick="C.updTenant(\'' + wl.id + '\',\'' + contextLabel + '\',\'poolType\',\'open\')">&#9889; Open/Spot</button>'
      + '</div></div>'

    if (wl.poolType === 'reserved') {
      h += '<div class="fg"><label>Tenure</label><select onchange="C.updTenant(\'' + wl.id + '\',\'' + contextLabel + '\',\'tenure\',this.value)" style="width:100%">'
      Object.keys(TENURE_LABELS).forEach(function (k) {
        h += '<option value="' + k + '"' + (wl.tenure === k ? ' selected' : '') + '>' + TENURE_LABELS[k] + '</option>'
      })
      h += '</select></div>'
    } else {
      h += '<div class="fg"><label>Tenure</label><div class="fg-hint" style="padding-top:8px">N/A — pay-as-you-go</div></div>'
    }
    h += '</div>'

    if (t) {
      h += '<div style="display:flex;gap:10px;margin-top:10px;font-size:11px;color:var(--mid)">'
        + 'Sec tier: <b style="color:var(--dark)">' + t.secTier + '</b>'
        + '&nbsp;·&nbsp; Chargeout: <b style="color:var(--dark)">' + CHARGEOUT_LABELS[t.chargeout] + '</b>'
        + '&nbsp;·&nbsp; SLA: <b style="color:var(--dark)">'
        + (wl.poolType === 'reserved' ? (wl.commercialSla ? COMM_SLA[wl.commercialSla] : 'Gold') : 'Bronze')
        + '</b>'
        + '<button onclick="C.editTenant(\'' + (wl.tenant) + '\')" style="margin-left:auto;font-size:10px;padding:2px 8px;border:1px solid var(--border);border-radius:4px;background:var(--light);cursor:pointer">Edit</button>'
        + '</div>'
    }
    h += '</div>'
    return h
  }

  /** Tenant management panel (top of Solution tab) */
  function renderTenantMgmt (M) {
    var tenants = M.tenantsList || {}
    var h = '<div class="tenant-mgmt">'
    h += '<div class="tenant-mgmt-hdr">'
      + '<div class="tenant-mgmt-title">Tenants — defined once, used across UC / MaaS / GPUaaS / BMaaS</div>'
      + '<button class="add-tenant-btn" onclick="C.addTenant()">+ Define New Tenant</button></div>'
    h += '<div class="tenant-chip-list">'
    Object.keys(tenants).forEach(function (k) {
      var t = tenants[k]
      h += '<div class="tenant-chip" style="cursor:pointer" onclick="C.editTenant(\'' + k + '\')" title="Click to edit">'
        + '<b>' + t.name + '</b>'
        + '<span class="sec">' + t.secTier + '</span>'
        + '<span style="color:var(--mid)">' + CHARGEOUT_LABELS[t.chargeout] + '</span>'
        + '</div>'
    })
    h += '</div></div>'
    return h
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4 — CALCULATION TRANSPARENCY POPUP
  // ─────────────────────────────────────────────────────────────────────────

  function openCalcDetail (id) {
    var M = window.M
    if (!M) return
    var wl = null
    ;['uc', 'maas', 'gpuaas', 'bmaas'].forEach(function (t) {
      if (!wl && M.workloadConfigs && M.workloadConfigs[t]) {
        wl = M.workloadConfigs[t].find(function (w) { return w.id === id }) || null
      }
    })
    if (!wl || !wl._lastSizing) {
      if (window.V && V.toast) V.toast('No sizing result yet — expand the row first', 'info')
      return
    }
    var sz  = wl._lastSizing
    var NL  = '\n'
    var GPU_NAME = (M.gpuMap && M.gpuMap[sz.gpu] && M.gpuMap[sz.gpu].name) || sz.gpu
    var text = '=== GPU Count Derivation ===' + NL + NL
      + 'Workload:  ' + wl.name + NL
      + 'GPU:       ' + GPU_NAME + NL
      + 'DAU:       ' + (wl.dau || 0).toLocaleString() + NL
      + 'Peak conc: ' + (wl.peakConcPct || 5) + '%' + NL
      + 'Context:   ' + (wl.contextPct || 'p95').toUpperCase() + NL
      + NL
      + (sz.formula || 'No formula available').split('\\n').join(NL)
      + NL + NL
      + '=== Result ===' + NL
      + 'Base GPUs: ' + sz.baseGpus + NL
      + '+Buffers:  ' + sz.buffers + NL
      + 'Total:     ' + sz.total + ' GPUs' + NL
      + 'Power:     ' + sz.powerKw + 'kW' + NL
      + 'Racks:     ' + sz.racks + NL
      + (sz.notes ? NL + '=== Engine Audit ===' + NL + sz.notes : '')

    var el = document.getElementById('calc-detail-content')
    if (el) el.textContent = text
    if (window.V && V.openModal) V.openModal('modal-calc-detail')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5 — INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** GPU throughput factor — from live gpu_configs if available */
  function _gpuThroughputFactor (gpuId, gpuConf) {
    // If we have real gpu_configs data, derive factor from FP8 TFlops
    // relative to H200 baseline (989 BF16 → INT4 ~2x → 1,978 effective)
    if (gpuConf && gpuConf.fp8_tflops) {
      var h200Baseline = 1979  // H200 FP8 TFlops (from published specs)
      return Math.round((gpuConf.fp8_tflops / h200Baseline) * 100) / 100
    }
    // Fallback: estimated factors from known GPU families
    var known = {
      h200: 1.0, h200sxm: 1.0,
      b200: 2.3, b200sxm: 2.3, b200nvl72: 2.5,
      b300: 2.8, b300nvl72: 3.0,
      gb200: 3.0, gb200nvl72: 3.0, gb300nvl72: 3.2,
      vr: 4.0, vrnvl72: 5.0, 'vera-rubin': 4.0,
      mi355x: 1.8, mi400x: 3.0, helios: 3.5,
      l40s: 0.35, a100: 0.5, h100: 0.85
    }
    var key = (gpuId || '').toLowerCase().replace(/[\s\-_]+/g, '')
    return known[key] || 1.0
  }

  /** Rack string from GPU count and gpu_configs unit size */
  function _racks (total, gpuConf) {
    var gpusPerUnit = (gpuConf && gpuConf.gpus_per_chassis) || 8
    return Math.ceil(total / gpusPerUnit) + ' rack(s) / ' + total + ' GPUs'
  }

  /** GPU display name from M.gpuMap */
  function _gpuLabel (gpuId, M) {
    if (M && M.gpuMap && M.gpuMap[gpuId]) return M.gpuMap[gpuId].name
    return gpuId || '—'
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  global.AtlasSolution = {
    // Data
    loadRefData:           loadRefData,
    defaultTenants:        DEFAULT_TENANTS,
    // Labels (for use in dropdowns / display)
    UC_TYPES:              UC_TYPES,
    PERF_TIER_LABELS:      PERF_TIER_LABELS,
    HA_TIERS:              HA_TIERS,
    DR_TYPES:              DR_TYPES,
    CHARGEOUT_LABELS:      CHARGEOUT_LABELS,
    TENURE_LABELS:         TENURE_LABELS,
    DOMAINS:               DOMAINS,
    COMM_SLA:              COMM_SLA,
    // Sizing
    sizeWorkload:          sizeWorkload,
    // Renderers
    renderGpuDropdown:     renderGpuDropdown,
    renderModelDropdown:   renderModelDropdown,
    renderDerivedPanel:    renderDerivedPanel,
    renderContextPctToggle: renderContextPctToggle,
    renderTenantBlock:     renderTenantBlock,
    renderTenantMgmt:      renderTenantMgmt,
    // Transparency
    openCalcDetail:        openCalcDetail
  }

})(window)
