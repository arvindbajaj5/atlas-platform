/**
 * ATLAS SizingEngine — shared/sasc-sizing.js
 * Single source of truth for all GPU sizing across SASC, TSAP FM, Inferencing Factory
 *
 * Reads from Supabase:
 *   gpu_configs          — GPU specs (vram_per_gpu_gb, bf16_tflops, hbm_bw_tbps, tdp_kw, etc.)
 *   model_catalogue      — Model specs (gpu_memory_gb jsonb, gpus_per_instance jsonb, params_b)
 *   uc_interaction_types — UC archetypes (requests_per_user_per_day, avg_input_tokens, etc.)
 *   requirement_archetypes — MaaS/GPUaaS/BMaaS archetypes
 *   benchmark_results    — Measured throughput (gpu_config_id × model_id → tokens/sec)
 *
 * Physics reference: Sizing GPUs for LLM Inferencing
 *   Memory capacity determines if the model can run.
 *   Memory bandwidth determines how fast at low batch (Profile B — UC internal).
 *   Compute (TFlops) determines throughput at high batch (Profile A — MaaS API).
 *
 * Usage:
 *   await SizingEngine.init(sbUrl, sbKey)
 *   const result = SizingEngine.sizeUC(ucConfig, gpuConfigId)
 *   const result = SizingEngine.sizeMaaS(maasConfig, gpuConfigId)
 *   const fleet  = SizingEngine.fleetTotal(ucResults, maasResults, gpuaasConfig, bmaasConfig, mdcSpec)
 *
 * All functions are pure (no DOM, no side effects) except init() which fetches from Supabase.
 */

;(function (root) {
  'use strict'

  // ─── Internal state ────────────────────────────────────────────────────────
  var _sbUrl = ''
  var _sbKey = ''
  var _ready = false

  // Reference data loaded from Supabase on init()
  var _gpuConfigs       = []   // gpu_configs rows
  var _models           = []   // model_catalogue rows
  var _ucTypes          = []   // uc_interaction_types rows
  var _archetypes       = []   // requirement_archetypes rows
  var _benchmarks       = []   // benchmark_results rows

  // ─── Constants ─────────────────────────────────────────────────────────────

  // Bytes per parameter by precision
  var BYTES_PER_PARAM = { FP16: 2, BF16: 2, FP8: 1, INT8: 1, INT4: 0.5, FP4: 0.5 }

  // KV cache field rules (MB per token at FP16) when exact layer specs unavailable
  var KV_CACHE_MB_PER_TOKEN = {
    small:  0.15,   // 7B–14B models
    medium: 0.25,   // 14B–35B models
    large:  0.35,   // 70B–80B models
    xlarge: 0.50    // 100B+ models
  }

  // Words to tokens ratio
  var WORDS_TO_TOKENS = 1.3

  // Runtime overhead factor (PyTorch/CUDA activations + framework)
  var RUNTIME_OVERHEAD = 1.20

  // SLA buffer presets — applied on top of base GPU count
  var SLA_BUFFERS = {
    standard: {
      peak_headroom_pct:    25,   // above P95 traffic
      failover_pct:         15,   // N+1 style reserve
      multi_tenancy_pct:    12    // tenant isolation overhead
    },
    enterprise: {
      peak_headroom_pct:    30,
      failover_pct:         30,   // dedicated failover block
      multi_tenancy_pct:    12
    }
  }

  // HA / DR GPU overhead (added to base after SLA buffers)
  var RESILIENCE_OVERHEAD = {
    ha_none:           0,
    ha_standard:       0.15,   // N+1 at cluster level ~15%
    dr_warm:           0.50,   // warm standby — 50% of primary
    dr_active_active:  1.00    // full duplicate
  }

  // Compute intensity → default headroom when no archetype headroom specified
  var INTENSITY_HEADROOM = {
    low:       15,
    medium:    20,
    high:      25,
    very_high: 30
  }

  // ─── Supabase fetch helper ──────────────────────────────────────────────────
  function _fetch (table, params, limit) {
    var url = _sbUrl + '/rest/v1/' + table + '?' + params + (limit ? '&limit=' + limit : '')
    return fetch(url, {
      headers: { apikey: _sbKey, Authorization: 'Bearer ' + _sbKey }
    }).then(function (r) {
      if (!r.ok) {
        console.error('[SizingEngine] fetch failed:', table, r.status)
        return []
      }
      return r.json()
    }).catch(function (e) {
      console.error('[SizingEngine] fetch error:', table, e.message)
      return []
    })
  }

  // ─── Lookup helpers ────────────────────────────────────────────────────────
  function getGPU (id) {
    return _gpuConfigs.find(function (g) { return g.id === id }) || null
  }

  function getModel (id) {
    return _models.find(function (m) { return m.id === id }) || null
  }

  function getUCType (id) {
    return _ucTypes.find(function (t) { return t.id === id }) || null
  }

  function getArchetype (id) {
    return _archetypes.find(function (a) { return a.id === id }) || null
  }

  function getBenchmark (gpuConfigId, modelId) {
    return _benchmarks.find(function (b) {
      return b.gpu_config_id === gpuConfigId && b.ai_model_id === modelId
    }) || null
  }

  function kvCacheSizeClass (params_b) {
    if (!params_b) return 'medium'
    if (params_b <= 14)  return 'small'
    if (params_b <= 35)  return 'medium'
    if (params_b <= 80)  return 'large'
    return 'xlarge'
  }

  // ─── Core Math (pure functions) ────────────────────────────────────────────

  /**
   * VRAM required for model weights at given precision (GB)
   * Formula: params_b × bytes_per_param
   */
  function calcModelVRAM (params_b, precision) {
    var bpp = BYTES_PER_PARAM[precision] || 2
    return params_b * bpp  // GB (1B params × 2 bytes = 2 GB)
  }

  /**
   * VRAM required for KV cache (GB)
   *
   * Exact formula when model architecture params available (num_layers, num_kv_heads, head_dim):
   *   M_KV = 2 × L × H_kv × D_head × C_max × N × B_cache
   *   where:
   *     L       = num_layers (transformer layers)
   *     H_kv    = num_kv_heads (GQA KV heads — typically 8 for GQA, not full attention head count)
   *     D_head  = head_dim (hidden dimension per head, typically 128)
   *     C_max   = context_len in tokens (input + output)
   *     N       = concurrent_requests
   *     B_cache = bytes per KV element — always FP16 (2 bytes) by default
   *               (frameworks like vLLM keep KV cache in FP16 even when weights are INT4)
   *
   * Field rule fallback when architecture params absent:
   *   Small models 7B-14B:  0.15 MB/token (FP16)
   *   Medium 14B-35B:       0.25 MB/token
   *   Large 70B-80B:        0.35 MB/token
   *   XLarge 100B+:         0.50 MB/token
   */
  function calcKVCache (model, contextLenTokens, concurrentRequests, precision) {
    // KV cache is always kept at FP16 regardless of weight precision
    // (this is standard practice in vLLM, TGI, TensorRT-LLM)
    var B_cache = 2  // FP16 = 2 bytes

    // Optional: FP8 KV cache if model explicitly configured for it
    if (model && model.kv_cache_dtype === 'FP8') B_cache = 1

    // Use exact formula if model architecture params are in model_catalogue
    if (model && model.num_layers && model.num_kv_heads && model.head_dim) {
      var L      = model.num_layers
      var H_kv   = model.num_kv_heads
      var D_head = model.head_dim
      // M_KV = 2 × L × H_kv × D_head × C_max × N × B_cache (bytes → GB)
      var bytes  = 2 * L * H_kv * D_head * contextLenTokens * concurrentRequests * B_cache
      var gb     = bytes / (1024 * 1024 * 1024)
      return Math.max(gb, 0.1)
    }

    // Field rule fallback — calibrated for FP16 KV cache, directionally accurate
    var sizeClass  = kvCacheSizeClass(model ? model.params_b : null)
    var mbPerToken = KV_CACHE_MB_PER_TOKEN[sizeClass]
    var totalGB    = (mbPerToken * contextLenTokens * concurrentRequests) / 1024
    return Math.max(totalGB, 0.1)
  }

  /**
   * Return which KV cache calculation method was used — for audit trail in UI
   */
  function kvCacheMethod (model) {
    if (model && model.num_layers && model.num_kv_heads && model.head_dim) {
      return 'exact (2×L×H_kv×D_head×C×N | L=' + model.num_layers + ' H_kv=' + model.num_kv_heads + ' D=' + model.head_dim + ')'
    }
    var sc = kvCacheSizeClass(model ? model.params_b : null)
    return 'field rule (' + (KV_CACHE_MB_PER_TOKEN[sc] || 0.25) + ' MB/token)'
  }

  /**
   * Total VRAM footprint for model at full load (GB)
   * M_total = (M_weights + M_KV_cache) × 1.20 overhead
   */
  function calcTotalVRAM (params_b, precision, contextLenTokens, concurrentRequests, model) {
    var weights = calcModelVRAM(params_b, precision)
    var kv      = calcKVCache(model, contextLenTokens, concurrentRequests, precision)
    return (weights + kv) * RUNTIME_OVERHEAD
  }

  /**
   * GPUs needed to fit model in VRAM
   * Considers model's gpu_memory_gb jsonb if available (more accurate)
   */
  function calcGPUsForFit (params_b, precision, gpu, model, contextLenTokens, concurrentRequests) {
    var vramPerGPU = gpu.vram_per_gpu_gb || 80

    // Use model's known VRAM requirement if available
    var modelVRAMNeeded = null
    if (model && model.gpu_memory_gb) {
      var memMap = typeof model.gpu_memory_gb === 'string'
        ? JSON.parse(model.gpu_memory_gb) : model.gpu_memory_gb
      modelVRAMNeeded = memMap[precision] || memMap['INT4'] || null
    }

    if (modelVRAMNeeded) {
      // Add KV cache on top of known model VRAM
      var kv = calcKVCache(model, contextLenTokens, concurrentRequests, precision)
      var total = (modelVRAMNeeded + kv) * RUNTIME_OVERHEAD
      return Math.ceil(total / vramPerGPU)
    }

    // Fallback: estimate from params
    var total = calcTotalVRAM(params_b, precision, contextLenTokens, concurrentRequests, model)
    return Math.ceil(total / vramPerGPU)
  }

  /**
   * Peak requests per second
   */
  function calcPeakRPS (dau, requestsPerUserPerDay, peakMultiplier) {
    var avgRPS = (dau * requestsPerUserPerDay) / 86400
    return avgRPS * peakMultiplier
  }

  /**
   * Token throughput needed (tokens/sec) at peak
   */
  function calcPeakTokenThroughput (peakRPS, avgOutputTokens) {
    return peakRPS * avgOutputTokens
  }

  /**
   * GPU throughput (tokens/sec per GPU unit) from benchmark or formula
   *
   * Profile B (internal UC — low concurrency, latency-bound):
   *   tokens/sec ≈ GPU_bandwidth_GBs / model_size_GB  (memory bandwidth bound)
   *
   * Profile A (MaaS API — high concurrency, compute-bound at batch 128+):
   *   tokens/sec from benchmark_results (measured)
   *   fallback: estimate from TFlops × efficiency factor
   */
  function calcGPUThroughput (gpu, model, params_b, precision, profile) {
    // Try benchmark first (most accurate)
    if (model) {
      var bm = getBenchmark(gpu.id, model.id)
      if (bm && bm.tokens_per_sec_p50) return bm.tokens_per_sec_p50
    }

    var modelSizeGB = calcModelVRAM(params_b, precision)
    var bwGBs = (gpu.hbm_bw_tbps || 3.0) * 1000  // TB/s → GB/s

    if (profile === 'B') {
      // Memory bandwidth bound (small batch, latency-driven)
      // tokens/sec per GPU ≈ bandwidth / model_size (rough but directionally correct)
      return Math.round(bwGBs / Math.max(modelSizeGB / (gpu.gpus_in_unit || gpu.gpus_per_unit || 8), 1))
    } else {
      // Profile A — compute bound at large batch
      // Effective tokens/sec: TFlops × 2 (multiply-add) / model_ops_per_token
      // Model ops per token ≈ 2 × params_b × 1e9 (2 flops per param per token)
      var tflops = precision === 'INT4' || precision === 'FP4'
        ? (gpu.int4_tflops || gpu.bf16_tflops * 2)
        : (gpu.bf16_tflops || 1000)
      // tflops is per unit (rack or server)
      var flopsPerToken = 2 * params_b * 1e9  // ~2 flops per param
      var rawTokensPerSec = (tflops * 1e12) / flopsPerToken
      // Apply 30% efficiency factor (realistic utilisation of peak TFlops)
      return Math.round(rawTokensPerSec * 0.30)
    }
  }

  /**
   * GPUs needed to meet throughput demand
   */
  function calcGPUsForThroughput (peakRPS, avgOutputTokens, gpu, model, params_b, precision, profile, deratingPct) {
    var throughputNeeded = calcPeakTokenThroughput(peakRPS, avgOutputTokens)
    var throughputPerUnit = calcGPUThroughput(gpu, model, params_b, precision, profile)
    var derate = (deratingPct || 80) / 100
    var derated = throughputPerUnit * derate
    if (derated <= 0) return 1
    var units = Math.ceil(throughputNeeded / derated)
    return Math.max(units, 1)
  }

  /**
   * Apply SLA + resilience buffers to base GPU count
   * Returns breakdown object for full transparency
   */
  function applyBuffers (baseGPUs, slaTier, haRequired, drType, growthHeadroomPct) {
    var sla = SLA_BUFFERS[slaTier] || SLA_BUFFERS.standard

    var peakBuffer       = Math.ceil(baseGPUs * sla.peak_headroom_pct / 100)
    var failoverReserve  = Math.ceil(baseGPUs * sla.failover_pct / 100)
    var multiTenancy     = Math.ceil(baseGPUs * sla.multi_tenancy_pct / 100)

    var haGPUs = haRequired ? Math.ceil(baseGPUs * RESILIENCE_OVERHEAD.ha_standard) : 0
    var drGPUs = 0
    if (drType === 'warm')          drGPUs = Math.ceil(baseGPUs * RESILIENCE_OVERHEAD.dr_warm)
    if (drType === 'active-active') drGPUs = Math.ceil(baseGPUs * RESILIENCE_OVERHEAD.dr_active_active)

    var growthGPUs = Math.ceil(baseGPUs * ((growthHeadroomPct || 0) / 100))

    var totalGPUs = baseGPUs + peakBuffer + failoverReserve + multiTenancy + haGPUs + drGPUs + growthGPUs

    return {
      base_gpus:        baseGPUs,
      peak_buffer:      peakBuffer,
      failover_reserve: failoverReserve,
      multi_tenancy:    multiTenancy,
      ha_gpus:          haGPUs,
      dr_gpus:          drGPUs,
      growth_gpus:      growthGPUs,
      total_gpus:       totalGPUs
    }
  }

  /**
   * Convert GPU count to rack/server units
   */
  function gpusToUnits (totalGPUs, gpu) {
    var gpusPerUnit = gpu.gpus_in_unit || gpu.gpus_per_unit || 8
    var unitType = gpu.rack_scale ? 'rack' : 'server'
    var units = Math.ceil(totalGPUs / gpusPerUnit)
    // Recalculate actual GPU count (round up to full units)
    var actualGPUs = units * gpusPerUnit
    return { units: units, unit_type: unitType, actual_gpus: actualGPUs, gpus_per_unit: gpusPerUnit }
  }

  /**
   * Power draw estimate
   */
  function calcPowerKW (units, gpu) {
    return units * (gpu.tdp_kw || (gpu.power_watts_tdp / 1000) || 10)
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  var SizingEngine = {

    ready: false,

    /**
     * init(sbUrl, sbKey)
     * Load all reference data from Supabase. Call once on app start.
     * Returns Promise<void>
     */
    init: function (sbUrl, sbKey) {
      _sbUrl = sbUrl
      _sbKey = sbKey
      var self = this

      return Promise.all([
        _fetch('gpu_configs',           'active=eq.true&order=name.asc', 50),
        _fetch('model_catalogue',       'enabled=eq.true&order=name.asc', 100),
        _fetch('uc_interaction_types',  'active=eq.true&order=sort_order.asc', 50),
        _fetch('requirement_archetypes','active=eq.true&order=sort_order.asc', 20),
        _fetch('benchmark_results',     'order=created_at.desc', 200)
      ]).then(function (results) {
        _gpuConfigs  = results[0] || []
        _models      = results[1] || []
        _ucTypes     = results[2] || []
        _archetypes  = results[3] || []
        _benchmarks  = results[4] || []
        self.ready = true
        _ready = true
        console.log('[SizingEngine] ready — GPUs:', _gpuConfigs.length,
          'Models:', _models.length, 'UC types:', _ucTypes.length,
          'Archetypes:', _archetypes.length, 'Benchmarks:', _benchmarks.length)
      })
    },

    // Expose reference data for UI use
    getGPUConfigs:  function () { return _gpuConfigs },
    getModels:      function () { return _models },
    getUCTypes:     function () { return _ucTypes },
    getArchetypes:  function () { return _archetypes },
    getMaaSArchetypes: function () {
      return _archetypes.filter(function (a) { return a.archetype_type === 'maas' })
    },

    /**
     * sizeUC(config, gpuConfigId)
     *
     * Size a single Use Case workload. Profile B — latency-driven, low concurrency.
     *
     * config: {
     *   uc_type_id:          string  (uc_interaction_types.id — provides defaults)
     *   model_id:            string  (model_catalogue.id)
     *   dau:                 number
     *   requests_per_day:    number  (optional — uses uc_type default)
     *   avg_input_tokens:    number  (optional — uses uc_type default)
     *   avg_output_tokens:   number  (optional — uses uc_type default)
     *   context_window:      number  in tokens (optional — uses model default)
     *   precision:           string  FP16|INT8|INT4 (optional — uses uc_type min_precision)
     *   peak_multiplier:     number  (optional — uses uc_type default)
     *   sla_tier:            string  standard|enterprise
     *   ha_required:         boolean (optional — uses uc_type default)
     *   dr_type:             string  none|warm|active-active
     *   growth_headroom_pct: number  (optional, default 20)
     *   derating_pct:        number  (optional, default 80)
     * }
     */
    sizeUC: function (config, gpuConfigId) {
      var gpu   = getGPU(gpuConfigId)
      var model = getModel(config.model_id)
      var ucType = getUCType(config.uc_type_id)

      if (!gpu) return { error: 'GPU config not found: ' + gpuConfigId }

      // Resolve config with uc_type defaults
      var dau         = config.dau || 100
      var reqPerDay   = config.requests_per_day    || (ucType && ucType.requests_per_user_per_day) || 5
      var inputTok    = config.avg_input_tokens    || (ucType && ucType.avg_input_tokens)  || 300
      var outputTok   = config.avg_output_tokens   || (ucType && ucType.avg_output_tokens) || 500
      var contextLen  = config.context_window      || ((model && model.context_length_k) ? model.context_length_k * 1000 : 8192)
      var precision   = config.precision           || (ucType && ucType.min_precision) || 'INT4'
      var peakMult    = config.peak_multiplier     || (ucType && ucType.peak_multiplier) || 3
      var slaTier     = config.sla_tier            || 'standard'
      var haRequired  = config.ha_required !== undefined ? config.ha_required : (ucType && ucType.ha_required !== undefined ? ucType.ha_required : true)
      var drType      = config.dr_type             || 'none'
      var growth      = config.growth_headroom_pct !== undefined ? config.growth_headroom_pct : 20
      var derating    = config.derating_pct        || 80
      var params_b    = model ? model.params_b : 7

      // Peak RPS from demand inputs
      var peakRPS = calcPeakRPS(dau, reqPerDay, peakMult)
      // Concurrent sessions via Little's Law: N = λ × W
      // W = average service time derived from latency SLA
      // Tighter SLA = shorter service time = fewer concurrent sessions for same RPS
      var responseTimeSec = config.ttft_sla_ms
        ? Math.max(0.5, config.ttft_sla_ms / 1000)
        : (ucType && ucType.typical_sla_ms ? ucType.typical_sla_ms / 1000 : 2.0)
      var concurrentSessions = Math.max(1, Math.ceil(peakRPS * responseTimeSec))

      // GPU fit (VRAM)
      var gpusForFit        = calcGPUsForFit(params_b, precision, gpu, model, contextLen, concurrentSessions)

      // GPU throughput (Profile B — memory bandwidth bound at low batch)
      var gpusForThroughput = calcGPUsForThroughput(peakRPS, outputTok, gpu, model, params_b, precision, 'B', derating)

      // Binding constraint
      var baseGPUs = Math.max(gpusForFit, gpusForThroughput, 1)
      var bindingConstraint = gpusForFit >= gpusForThroughput ? 'memory_fit' : 'throughput'

      // Apply buffers — note: for UCs we DON'T apply MaaS multi-tenancy overhead
      var sla = SLA_BUFFERS[slaTier] || SLA_BUFFERS.standard
      var peakBuffer      = Math.ceil(baseGPUs * sla.peak_headroom_pct / 100)
      var failoverReserve = Math.ceil(baseGPUs * sla.failover_pct / 100)
      var haGPUs          = haRequired ? Math.ceil(baseGPUs * RESILIENCE_OVERHEAD.ha_standard) : 0
      var drGPUs          = drType === 'warm' ? Math.ceil(baseGPUs * RESILIENCE_OVERHEAD.dr_warm)
                          : drType === 'active-active' ? Math.ceil(baseGPUs * RESILIENCE_OVERHEAD.dr_active_active)
                          : 0
      var growthGPUs      = Math.ceil(baseGPUs * (growth / 100))
      var totalGPUs       = baseGPUs + peakBuffer + failoverReserve + haGPUs + drGPUs + growthGPUs

      // Convert to units
      var unitCalc    = gpusToUnits(totalGPUs, gpu)
      var powerKW     = calcPowerKW(unitCalc.units, gpu)

      // Throughput estimate (for SLA validation)
      var throughputPerUnit = calcGPUThroughput(gpu, model, params_b, precision, 'B')
      var totalThroughput   = throughputPerUnit * unitCalc.actual_gpus * (derating / 100)
      var ttftEstimateMs    = model
        ? Math.round((params_b * 2 * 1e9) / ((gpu.hbm_bw_tbps || 3) * 1e12) * 1000)
        : null
      var slaRequired = ucType ? ucType.typical_sla_ms : (config.ttft_sla_ms || 2000)
      var slaMet = ttftEstimateMs ? ttftEstimateMs <= slaRequired : true

      return {
        // Inputs resolved
        dau: dau, requests_per_day: reqPerDay, peak_rps: Math.round(peakRPS * 100) / 100,
        precision: precision, params_b: params_b, context_window: contextLen,

        // GPU sizing breakdown
        gpus_for_fit:        gpusForFit,
        gpus_for_throughput: gpusForThroughput,
        binding_constraint:  bindingConstraint,
        base_gpus:           baseGPUs,
        peak_buffer_gpus:    peakBuffer,
        failover_gpus:       failoverReserve,
        ha_gpus:             haGPUs,
        dr_gpus:             drGPUs,
        growth_gpus:         growthGPUs,
        total_gpus:          totalGPUs,

        // Units
        units_required: unitCalc.units,
        unit_type:      unitCalc.unit_type,
        actual_gpus:    unitCalc.actual_gpus,
        gpus_per_unit:  unitCalc.gpus_per_unit,

        // Performance
        throughput_tokens_per_sec: Math.round(totalThroughput),
        ttft_estimate_ms:          ttftEstimateMs,
        sla_met:                   slaMet,
        power_kw:                  Math.round(powerKW * 10) / 10,

        // Explanation
        sizing_profile: 'B',
        notes: [
          'Profile B (UC internal): memory-bandwidth bound at low concurrency',
          'Base: max(' + gpusForFit + ' fit, ' + gpusForThroughput + ' throughput) = ' + baseGPUs + ' GPUs (' + bindingConstraint + ')',
          'Buffers: +' + peakBuffer + ' peak, +' + failoverReserve + ' failover, +' + haGPUs + ' HA, +' + drGPUs + ' DR, +' + growthGPUs + ' growth',
          'Total: ' + totalGPUs + ' GPUs → ' + unitCalc.units + ' ' + unitCalc.unit_type + '(s) × ' + unitCalc.gpus_per_unit + ' GPUs',
        'KV: ' + kvCacheMethod(model)
      ].join(' | '),

      // Audit trail — full sizing inputs/outputs for customer transparency
      audit: {
        formula:             'M_total = (M_weights + M_KV) × 1.20',
        m_weights_gb:        Math.round(calcModelVRAM(params_b, precision) * 100) / 100,
        m_kv_gb:             Math.round(calcKVCache(model, contextLen, concurrentSessions, precision) * 100) / 100,
        m_total_gb:          Math.round(calcTotalVRAM(params_b, precision, contextLen, concurrentSessions, model) * 100) / 100,
        vram_per_gpu_gb:     gpu.vram_per_gpu_gb || 80,
        gpus_for_fit:        gpusForFit,
        gpus_for_throughput: gpusForThroughput,
        binding_constraint:  bindingConstraint,
        kv_cache_method:     kvCacheMethod(model),
        concurrent_sessions: concurrentSessions,
        littles_law:         'λ=' + Math.round(peakRPS*100)/100 + ' RPS × W=' + responseTimeSec + 's = N=' + concurrentSessions
      }
    },

    /**
     * sizeMaaS(config, gpuConfigId)
     *
     * Size a MaaS usage type. Profile A — throughput-driven, high concurrency.
     *
     * config: {
     *   archetype_id:     string  (requirement_archetypes.id — provides all defaults)
     *   model_id:         string  (model_catalogue.id — selected tier)
     *   dau:              number  total DAU for this usage type
     *   sla_tier:         string  standard|enterprise
     *   precision:        string  (optional — inferred from model)
     *   derating_pct:     number  (optional, default 80)
     * }
     */
    sizeMaaS: function (config, gpuConfigId) {
      var gpu       = getGPU(gpuConfigId)
      var model     = getModel(config.model_id)
      var archetype = getArchetype(config.archetype_id)

      if (!gpu)       return { error: 'GPU config not found: ' + gpuConfigId }
      if (!archetype) return { error: 'Archetype not found: ' + config.archetype_id }

      var cfg = archetype.config || {}
      var dau        = config.dau || 1000
      var slaTier    = config.sla_tier || 'standard'
      var precision  = config.precision || 'INT4'
      var derating   = config.derating_pct || 80

      // Resolve from archetype
      var reqPerDay   = cfg.requests_per_user_per_day || 5
      var inputTok    = cfg.avg_input_tokens  || 300
      var outputTok   = cfg.avg_output_tokens || 500
      var contextLen  = (cfg.avg_context_window_k || 8) * 1000
      var peakConcPct = cfg.peak_concurrent_pct || 5
      var params_b    = model ? model.params_b : 7

      // Peak concurrent users at any moment
      var peakConcurrent = Math.ceil(dau * peakConcPct / 100)

      // Peak RPS from concurrent users × requests per session
      // At peak, concurrent users are actively generating — assume 1 req/10s average
      var peakRPS = Math.ceil(peakConcurrent / 10)

      // GPU fit (VRAM for model + KV cache for concurrent sessions)
      var gpusForFit = calcGPUsForFit(params_b, precision, gpu, model, contextLen, peakConcurrent)

      // GPU throughput (Profile A — compute bound at large batch)
      var gpusForThroughput = calcGPUsForThroughput(peakRPS, outputTok, gpu, model, params_b, precision, 'A', derating)

      var baseGPUs = Math.max(gpusForFit, gpusForThroughput, 1)
      var bindingConstraint = gpusForFit >= gpusForThroughput ? 'memory_fit' : 'throughput'

      // MaaS buffers — all three layers applied
      var headroomPct    = slaTier === 'enterprise' ? (cfg.peak_headroom_pct_enterprise || 30) : (cfg.peak_headroom_pct_standard || 25)
      var failoverPct    = slaTier === 'enterprise' ? (cfg.failover_pct_enterprise || 30)      : (cfg.failover_pct_standard || 15)
      var multiTenPct    = cfg.multi_tenancy_overhead_pct || 12

      var peakBuffer      = Math.ceil(baseGPUs * headroomPct  / 100)
      var failoverReserve = Math.ceil(baseGPUs * failoverPct  / 100)
      var multiTenancy    = Math.ceil(baseGPUs * multiTenPct  / 100)
      var totalGPUs       = baseGPUs + peakBuffer + failoverReserve + multiTenancy

      // Units
      var unitCalc = gpusToUnits(totalGPUs, gpu)
      var powerKW  = calcPowerKW(unitCalc.units, gpu)

      // Cost per million tokens (at 75% utilisation)
      var throughputPerUnit  = calcGPUThroughput(gpu, model, params_b, precision, 'A')
      var totalThroughput    = throughputPerUnit * unitCalc.actual_gpus * (derating / 100)
      var tokensPerMonth     = totalThroughput * 60 * 60 * 24 * 30 * 0.75  // 75% utilisation
      var capexPerUnit       = null  // populated externally from pricing_params
      var powerCostPerMonth  = null  // populated externally from territory config

      return {
        // Demand
        usage_type:            cfg.usage_type,
        dau:                   dau,
        peak_concurrent:       peakConcurrent,
        peak_rps:              peakRPS,
        precision:             precision,
        params_b:              params_b,

        // GPU breakdown
        gpus_for_fit:          gpusForFit,
        gpus_for_throughput:   gpusForThroughput,
        binding_constraint:    bindingConstraint,
        base_gpus:             baseGPUs,
        peak_buffer_gpus:      peakBuffer,
        failover_gpus:         failoverReserve,
        multi_tenancy_gpus:    multiTenancy,
        total_gpus:            totalGPUs,

        // Units
        units_required:        unitCalc.units,
        unit_type:             unitCalc.unit_type,
        actual_gpus:           unitCalc.actual_gpus,
        gpus_per_unit:         unitCalc.gpus_per_unit,

        // Capacity
        throughput_tokens_per_sec: Math.round(totalThroughput),
        tokens_per_month_75pct:    Math.round(tokensPerMonth),
        power_kw:                  Math.round(powerKW * 10) / 10,

        // Economics (to be completed by FM with pricing_params)
        cost_per_mtoken_usd:   null,  // FM layer completes this
        capex_usd:             null,

        // Explanation
        sizing_profile: 'A',
        notes: [
          'Profile A (MaaS API): compute-bound at batch 128+',
          'DAU ' + dau + ' → ' + peakConcurrent + ' peak concurrent (' + peakConcPct + '%)',
          'Base: max(' + gpusForFit + ' fit, ' + gpusForThroughput + ' throughput) = ' + baseGPUs + ' (' + bindingConstraint + ')',
          'Buffers: +' + peakBuffer + ' peak(' + headroomPct + '%), +' + failoverReserve + ' failover(' + failoverPct + '%), +' + multiTenancy + ' multi-tenancy(' + multiTenPct + '%)',
          'Total: ' + totalGPUs + ' GPUs → ' + unitCalc.units + ' ' + unitCalc.unit_type + '(s)'
        ].join(' | ')
      }
    },

    /**
     * sizeGPUaaS(config, gpuConfigId)
     * GPUaaS is a direct allocation — no inference sizing needed.
     */
    sizeGPUaaS: function (config, gpuConfigId) {
      var gpu       = getGPU(gpuConfigId)
      var archetype = getArchetype(config.archetype_id || 'gpuaas-std')
      if (!gpu) return { error: 'GPU config not found: ' + gpuConfigId }

      var cfg          = (archetype && archetype.config) || {}
      var reserved     = config.reserved_gpus || cfg.default_reserved_gpus || 8
      var burst        = config.burst_gpus    || cfg.default_burst_gpus    || 0
      var haReserve    = Math.ceil(reserved * ((cfg.ha_reserve_pct || 10) / 100))
      var totalGPUs    = reserved + burst + haReserve
      var unitCalc     = gpusToUnits(totalGPUs, gpu)
      var powerKW      = calcPowerKW(unitCalc.units, gpu)

      return {
        reserved_gpus: reserved,
        burst_gpus:    burst,
        ha_reserve:    haReserve,
        total_gpus:    totalGPUs,
        units_required: unitCalc.units,
        unit_type:     unitCalc.unit_type,
        actual_gpus:   unitCalc.actual_gpus,
        power_kw:      Math.round(powerKW * 10) / 10,
        notes: reserved + ' reserved + ' + burst + ' burst + ' + haReserve + ' HA reserve = ' + totalGPUs + ' GPUs'
      }
    },

    /**
     * sizeBMaaS(config)
     * BMaaS is CPU servers — no GPU sizing.
     */
    sizeBMaaS: function (config) {
      var archetype = getArchetype(config.archetype_id || 'bmaas-std')
      var cfg       = (archetype && archetype.config) || {}
      var servers   = config.servers || cfg.default_servers || 4
      var haReserve = Math.ceil(servers * ((cfg.ha_reserve_pct || 10) / 100))
      var total     = servers + haReserve
      // CPU server power estimate: ~700W per server (2× EPYC 9654)
      var powerKW   = total * 0.7

      return {
        servers:       servers,
        ha_reserve:    haReserve,
        total_servers: total,
        power_kw:      Math.round(powerKW * 10) / 10,
        notes:         servers + ' servers + ' + haReserve + ' HA = ' + total + ' total servers'
      }
    },

    /**
     * fleetTotal(ucResults, maasResults, gpuaasResult, bmaasResult, mdcSpec)
     *
     * Aggregate all GPU allocations and validate against MDC envelope.
     *
     * ucResults:    array of sizeUC() results (one per UC)
     * maasResults:  array of sizeMaaS() results (one per usage type)
     * gpuaasResult: sizeGPUaaS() result or null
     * bmaasResult:  sizeBMaaS() result or null
     * mdcSpec: { capacity_gpus, capacity_kw }
     */
    fleetTotal: function (ucResults, maasResults, gpuaasResult, bmaasResult, mdcSpec) {
      var alloc = []

      // UC inference
      var ucGPUs = 0, ucKW = 0
      ;(ucResults || []).forEach(function (r) {
        if (r && !r.error) { ucGPUs += r.actual_gpus || r.total_gpus; ucKW += r.power_kw || 0 }
      })
      if (ucGPUs > 0) alloc.push({ label: 'UC Inference', gpus: ucGPUs, kw: Math.round(ucKW * 10)/10, type: 'cost_centre' })

      // MaaS per usage type
      var maasGPUs = 0, maasKW = 0
      ;(maasResults || []).forEach(function (r) {
        if (r && !r.error) {
          alloc.push({
            label: 'MaaS — ' + (r.usage_type || 'API'),
            gpus:  r.actual_gpus || r.total_gpus,
            kw:    r.power_kw || 0,
            type:  'revenue'
          })
          maasGPUs += r.actual_gpus || r.total_gpus
          maasKW   += r.power_kw || 0
        }
      })

      // GPUaaS
      var gaasGPUs = 0, gaasKW = 0
      if (gpuaasResult && !gpuaasResult.error) {
        gaasGPUs = gpuaasResult.actual_gpus || gpuaasResult.total_gpus
        gaasKW   = gpuaasResult.power_kw || 0
        alloc.push({ label: 'GPUaaS', gpus: gaasGPUs, kw: gaasKW, type: 'revenue' })
      }

      // BMaaS (servers, not GPUs — listed separately)
      var bmaasServers = 0, bmaasKW = 0
      if (bmaasResult && !bmaasResult.error) {
        bmaasServers = bmaasResult.total_servers
        bmaasKW      = bmaasResult.power_kw || 0
        alloc.push({ label: 'BMaaS (CPU servers)', gpus: 0, kw: bmaasKW, type: 'revenue', servers: bmaasServers })
      }

      var totalGPUs = ucGPUs + maasGPUs + gaasGPUs
      var totalKW   = ucKW + maasKW + gaasKW + bmaasKW
      var capGPUs   = (mdcSpec && mdcSpec.capacity_gpus) || 0
      var capKW     = (mdcSpec && mdcSpec.capacity_kw)   || 0

      var headroomGPUs = capGPUs > 0 ? capGPUs - totalGPUs : null
      var headroomKW   = capKW   > 0 ? capKW   - totalKW   : null

      if (headroomGPUs !== null && headroomGPUs > 0)
        alloc.push({ label: 'Unallocated Headroom', gpus: headroomGPUs, kw: Math.max(0, headroomKW || 0), type: 'reserve' })

      var gpuStatus = capGPUs > 0 ? (totalGPUs > capGPUs ? 'over' : totalGPUs > capGPUs * 0.9 ? 'warning' : 'ok') : 'unchecked'
      var mwStatus  = capKW   > 0 ? (totalKW   > capKW   ? 'over' : totalKW   > capKW   * 0.9 ? 'warning' : 'ok') : 'unchecked'

      var warnings = []
      if (gpuStatus === 'over')    warnings.push('GPU demand (' + totalGPUs + ') exceeds MDC capacity (' + capGPUs + '). Upsize MDC or reduce scope.')
      if (gpuStatus === 'warning') warnings.push('GPU demand at ' + Math.round(totalGPUs/capGPUs*100) + '% of MDC capacity — limited headroom.')
      if (mwStatus  === 'over')    warnings.push('Power demand (' + totalKW.toFixed(1) + 'kW) exceeds MDC envelope (' + capKW + 'kW). Critical.')
      if (mwStatus  === 'warning') warnings.push('Power at ' + Math.round(totalKW/capKW*100) + '% of MDC capacity.')

      return {
        allocation:        alloc,
        total_gpus:        totalGPUs,
        total_kw:          Math.round(totalKW * 10) / 10,
        total_bmaas_servers: bmaasServers,
        capacity_gpus:     capGPUs,
        capacity_kw:       capKW,
        headroom_gpus:     headroomGPUs,
        headroom_kw:       headroomKW !== null ? Math.round(headroomKW * 10) / 10 : null,
        gpu_status:        gpuStatus,
        mw_status:         mwStatus,
        warnings:          warnings
      }
    },

    // ── Utility: resolve precision from model + preference ──────────────────
    resolvePrecision: function (modelId, preferredPrecision) {
      var model = getModel(modelId)
      if (!model || !model.gpu_memory_gb) return preferredPrecision || 'INT4'
      var memMap = typeof model.gpu_memory_gb === 'string'
        ? JSON.parse(model.gpu_memory_gb) : model.gpu_memory_gb
      // Use preferred if model supports it, else fall back to best available
      if (preferredPrecision && memMap[preferredPrecision]) return preferredPrecision
      if (memMap['INT4']) return 'INT4'
      if (memMap['INT8'] || memMap['FP8']) return 'INT8'
      return 'FP16'
    },

    // ── Utility: expose core math for UI use ────────────────────────────────
    calcPeakRPS:        calcPeakRPS,
    calcModelVRAM:      calcModelVRAM,
    kvCacheMethod:      kvCacheMethod,
    calcKVCache:        calcKVCache,
    calcTotalVRAM:      calcTotalVRAM,
    calcGPUThroughput:  calcGPUThroughput,
    gpusToUnits:        gpusToUnits,
    calcPowerKW:        calcPowerKW,
    applyBuffers:       applyBuffers,

    // Expose constants for UI reference
    SLA_BUFFERS:          SLA_BUFFERS,
    RESILIENCE_OVERHEAD:  RESILIENCE_OVERHEAD,
    BYTES_PER_PARAM:      BYTES_PER_PARAM,
    KV_CACHE_MB_PER_TOKEN: KV_CACHE_MB_PER_TOKEN
  }

  // Export
  root.SizingEngine = SizingEngine

})(typeof window !== 'undefined' ? window : global)
