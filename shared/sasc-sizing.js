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

  // Performance tier — derived from latency_sensitivity + context length
  // Drives: precision enforcement, B_max cap, dedicated pool, concurrency model
  var PERF_TIER = {
    interactive:  'tier1',   // TTFT <500ms, real_time latency_sensitivity
    analytical:   'tier2',   // <5s total, interactive/near_realtime
    async_batch:  'tier3'    // queue-based, batch latency_sensitivity
  }

  // Tier hard caps on batch size (B_max cannot exceed this regardless of VRAM/SLA)
  var TIER_BATCH_CAP = {
    tier1: 8,           // Tier 1 Interactive — tight latency, no sharing
    tier2: 32,          // Tier 2 Analytical — shared pool, cost-optimised
    tier3: Infinity     // Tier 3 Async Batch — maximise throughput
  }

  // Tier precision enforcement
  // Tier 1: FP16/BF16 only (warn if INT4 selected — quality risk)
  // Tier 2: FP8/INT4 preferred (cost reduction)
  // Tier 3: INT4 enforced (maximum throughput)
  var TIER_PREFERRED_PRECISION = {
    tier1: ['FP16', 'BF16'],
    tier2: ['FP8', 'INT8', 'INT4'],
    tier3: ['INT4', 'FP4']
  }

  // Availability SLA → HA reserve percentage
  var AVAILABILITY_HA_PCT = {
    '99.5':  0.10,   // N+1 at cluster level
    '99.9':  0.20,   // N+1 at rack level
    '99.99': 1.00    // active-active — full duplicate
  }

  // Coherent memory usability factor
  // Coherent (CPU) memory is slower than HBM — usable for overflow KV cache
  // not for hot model weights or active KV cache path
  var COHERENT_USABILITY = {
    'NVLink-C2C':       0.30,
    'NVLink-C2C Gen 2': 0.35,
    'AMD Infinity Fabric': 0.25
  }

  // ─── Helper: derive performance tier from UC type + context ─────────────────

  /**
   * Derive performance tier from uc_interaction_types data + context length
   * Returns 'tier1' | 'tier2' | 'tier3'
   *
   * Logic:
   *   real_time + short context (<8K)  → Tier 1 Interactive
   *   batch latency_sensitivity        → Tier 3 Async Batch
   *   everything else                  → Tier 2 Analytical
   */
  function derivePerformanceTier (ucType, maxContextTokens) {
    var latSens = ucType ? (ucType.latency_sensitivity || 'interactive') : 'interactive'
    var ctx     = maxContextTokens || 8192

    if (latSens === 'batch') return 'tier3'
    if ((latSens === 'real_time') && ctx <= 8192) return 'tier1'
    if (latSens === 'real_time' || latSens === 'interactive') return 'tier2'
    if (latSens === 'near_realtime') return 'tier2'
    return 'tier2'  // default
  }

  /**
   * Effective GPU VRAM including coherent CPU memory (for unified memory GPUs)
   * GB200, GB300, VR NVL72, Instinct Helios have NVLink-C2C / Infinity Fabric
   * CPU memory is slower — apply usability factor for sizing purposes
   */
  function effectiveVRAM (gpu) {
    if (!gpu.unified_memory || !gpu.coherent_cpu_mem_gb) {
      return gpu.vram_per_gpu_gb || 80
    }
    var factor = COHERENT_USABILITY[gpu.coherent_interconnect] || 0.25
    return (gpu.vram_per_gpu_gb || 80) + (gpu.coherent_cpu_mem_gb * factor)
  }

  /**
   * Check and warn if precision is inappropriate for performance tier
   */
  function precisionTierWarning (precision, tier) {
    var preferred = TIER_PREFERRED_PRECISION[tier] || []
    if (tier === 'tier1' && (precision === 'INT4' || precision === 'FP4')) {
      return 'Warning: INT4/FP4 not recommended for Tier 1 Interactive — quality degradation risk at low batch sizes'
    }
    if (tier === 'tier3' && precision === 'FP16') {
      return 'Note: FP16 for Tier 3 Batch is cost-inefficient — consider INT4 to maximise throughput'
    }
    return null
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
  // Engine-specific KV cache paging efficiency (Enterprise_Sizing_SLA_Blueprint:
  // "PagedAttention allows scaling the KV Cache allocation efficiency
  // coefficient close to 0.90-0.95"). Distinct from RUNTIME_OVERHEAD (which
  // covers activation/framework memory on weights+KV together) — this is
  // specifically about how much of the ALLOCATED KV pool is wasted to
  // fragmentation. Lower efficiency = more effective KV cache needed.
  var ENGINE_KV_EFFICIENCY = {
    vllm:     0.93,  // PagedAttention — blueprint's 0.90-0.95 range, midpoint
    trt_llm:  0.93,  // TensorRT-LLM paged KV cache, comparable
    sglang:   0.93,  // RadixAttention — comparable paging efficiency
    triton:   0.80,  // varies by backend — conservative default
    lorax:    0.85,  // LoRA-focused serving, decent but not fully paged
    default:  0.75   // unknown/naive (non-paged) engine — conservative fallback
  }

  function calcKVCache (model, contextLenTokens, concurrentRequests, precision, engine) {
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
      var eff    = ENGINE_KV_EFFICIENCY[engine] || ENGINE_KV_EFFICIENCY.default
      return Math.max(gb / eff, 0.1)
    }

    // Field rule fallback — calibrated for FP16 KV cache, directionally accurate
    var sizeClass  = kvCacheSizeClass(model ? model.params_b : null)
    var mbPerToken = KV_CACHE_MB_PER_TOKEN[sizeClass]
    var totalGB    = (mbPerToken * contextLenTokens * concurrentRequests) / 1024
    var eff2       = ENGINE_KV_EFFICIENCY[engine] || ENGINE_KV_EFFICIENCY.default
    return Math.max(totalGB / eff2, 0.1)
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
  function calcTotalVRAM (params_b, precision, contextLenTokens, concurrentRequests, model, engine) {
    var weights = calcModelVRAM(params_b, precision)
    var kv      = calcKVCache(model, contextLenTokens, concurrentRequests, precision, engine)
    return (weights + kv) * RUNTIME_OVERHEAD
  }

  /**
   * GPUs needed to fit model in VRAM
   * Considers model's gpu_memory_gb jsonb if available (more accurate)
   */
  function calcGPUsForFit (params_b, precision, gpu, model, contextLenTokens, concurrentRequests, engine) {
    // Use effective VRAM — includes coherent CPU memory for unified memory GPUs
    // (GB200/GB300/VR NVL72/Instinct Helios with NVLink-C2C or Infinity Fabric)
    var vramPerGPU = effectiveVRAM(gpu)
    var isUnified  = !!(gpu.unified_memory && gpu.coherent_cpu_mem_gb)

    // Embedding models (modality='embed') have no autoregressive KV cache
    // Single forward pass only — size on weights + activation memory
    var isEmbedding = model && model.modality === 'embed'
    if (isEmbedding) {
      var weights = calcModelVRAM(params_b, precision)
      var activations = params_b * 0.1  // ~10% of weights for activations
      return Math.max(1, Math.ceil((weights + activations) * RUNTIME_OVERHEAD / vramPerGPU))
    }

    // Use model's known VRAM requirement if available
    var modelVRAMNeeded = null
    if (model && model.gpu_memory_gb) {
      var memMap = typeof model.gpu_memory_gb === 'string'
        ? JSON.parse(model.gpu_memory_gb) : model.gpu_memory_gb
      modelVRAMNeeded = memMap[precision] || memMap['INT4'] || null
    }

    if (modelVRAMNeeded) {
      var kv = calcKVCache(model, contextLenTokens, concurrentRequests, precision, engine)
      var total = (modelVRAMNeeded + kv) * RUNTIME_OVERHEAD
      return Math.max(1, Math.ceil(total / vramPerGPU))
    }

    // Fallback: estimate from params
    var total = calcTotalVRAM(params_b, precision, contextLenTokens, concurrentRequests, model, engine)
    return Math.max(1, Math.ceil(total / vramPerGPU))
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
      if (bm && (bm.tokens_per_sec || bm.tokens_per_sec_p50)) return bm.tokens_per_sec || bm.tokens_per_sec_p50
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
  /**
   * capacityForGPU(gpu, model, params_b, precision, gpuCount, demandShape, profile)
   *
   * BOTTOM-UP — reverse of calcGPUsForThroughput(). Given a GPU architecture
   * and a GPU count (rather than a demand figure), returns the maximum
   * demand that configuration can support before breaching SLA/derating.
   *
   * Mirrors the exact same constants and chain as the top-down path
   * (calcPeakRPS -> calcPeakTokenThroughput -> calcGPUsForThroughput) so
   * the two are always consistent — same derating, same throughput
   * formula, same profile logic. Solving in the opposite direction.
   *
   * demandShape: { requests_per_user_per_day, peak_multiplier, avg_output_tokens }
   *   (the SHAPE of one user's demand — everything except DAU itself,
   *    since DAU is exactly what this function solves for)
   *
   * Returns: {
   *   max_dau,                  // maximum DAU this GPU count can serve
   *   max_concurrent_sessions,  // at peak, derived from max_dau
   *   max_throughput_tps,       // total derated throughput available
   *   throughput_per_unit_tps,  // same calcGPUThroughput() value used
   *                             // by the top-down path, for transparency
   *   derating_pct,
   *   audit: { formula, chain }
   * }
   */
  function capacityForGPU (gpu, model, params_b, precision, gpuCount, demandShape, profile, deratingPct) {
    var reqPerDay  = (demandShape && demandShape.requests_per_user_per_day) || 5
    var peakMult   = (demandShape && demandShape.peak_multiplier) || 3
    var outputTok  = (demandShape && demandShape.avg_output_tokens) || 500
    var derate     = (deratingPct || 80) / 100

    // Same per-unit throughput formula the top-down path uses — benchmark
    // first, formula fallback. Identical function call, zero divergence risk.
    var throughputPerUnit = calcGPUThroughput(gpu, model, params_b, precision, profile || 'A')
    var maxThroughputTps  = throughputPerUnit * gpuCount * derate

    // Reverse calcPeakTokenThroughput(): tokens/sec -> peak RPS
    var maxPeakRPS = outputTok > 0 ? maxThroughputTps / outputTok : 0

    // Reverse calcPeakRPS(): peak RPS -> avg RPS -> DAU
    var maxAvgRPS = peakMult > 0 ? maxPeakRPS / peakMult : 0
    var maxDau    = reqPerDay > 0 ? Math.floor((maxAvgRPS * 86400) / reqPerDay) : 0

    // Max concurrent sessions at that DAU, for display alongside the
    // top-down path's own concurrent-session figure
    var maxConcurrentSessions = Math.max(1, Math.ceil(maxPeakRPS * 1))  // ~1s avg hold, rough

    return {
      max_dau:                  Math.max(0, maxDau),
      max_concurrent_sessions:  maxConcurrentSessions,
      max_throughput_tps:       Math.round(maxThroughputTps),
      throughput_per_unit_tps:  Math.round(throughputPerUnit),
      gpu_count:                gpuCount,
      derating_pct:             deratingPct || 80,
      audit: {
        formula: 'max_dau = (max_throughput_tps / avg_output_tokens / peak_multiplier) × 86400 / requests_per_day',
        chain: 'GPUs(' + gpuCount + ') × throughput/GPU(' + Math.round(throughputPerUnit) + ') × derate(' + (derate*100) + '%) '
             + '= ' + Math.round(maxThroughputTps) + ' tok/s → ÷' + outputTok + ' tok/req = ' + Math.round(maxPeakRPS*100)/100 + ' peak RPS '
             + '→ ÷' + peakMult + 'x peak mult = ' + Math.round(maxAvgRPS*100)/100 + ' avg RPS → ×86400 ÷' + reqPerDay + ' req/day = ' + Math.max(0,maxDau) + ' max DAU'
      }
    }
  }

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


  // ── workloadYield (moved from PRAXIS Phase 1.1) ─────────────────────────
  function workloadYield(w) {
    if (!w) return 1.0
    var tp = w.tp || 'uc'
    if (tp === 'gpuaas' || tp === 'bmaas' || tp === 'closed') return 1.0
    var rag = w.ragType || 'none'
    var RAG_YIELD = {
      simple: 0.97, hybrid: 0.95, multi_stage: 0.92, graph: 0.90, agentic: 0.85, none: 0.88
    }
    var base = (rag in RAG_YIELD) ? RAG_YIELD[rag] : 0.88
    if (tp === 'maas' && rag === 'none') base = 0.82
    var steps = w.steps || w.agentSteps || 0
    var effective
    if (w.isAgentic && steps > 1) {
      var s = Math.min(steps, 50)
      effective = Math.pow(base, s)
    } else {
      effective = base
    }
    return Math.max(0.30, Math.min(1.0, effective))
  }

  // ── computeEntryAnchor (moved from PRAXIS Phase 1.1) ────────────────────
  // entryModeConfig: {mode: 1|2, mwBudget} — passed explicitly by the caller
  // (was M.entryMode inside PRAXIS; shared engine takes no implicit globals).
  function computeEntryAnchor(bomGpuTotal, bomPowerKw, det, skuBom, entryModeConfig) {
    var cfg = entryModeConfig || {}
    var mode = cfg.mode || 2
    var skuKeys = (skuBom && skuBom.bySku) ? Object.keys(skuBom.bySku) : []
    var dominant = skuKeys.length ? skuBom.bySku[skuKeys[0]] : null
    var skuUnit = (dominant && dominant.skuUnit) || 8
    var kwPerGpu = bomGpuTotal > 0 ? (bomPowerKw / bomGpuTotal) : 1.4
    var anchorGpus
    if (mode === 1) {
      var mwBudget = cfg.mwBudget || 6.7667
      var rawFit = Math.floor((mwBudget * 1000) / kwPerGpu)
      anchorGpus = skuUnit ? Math.floor(rawFit / skuUnit) * skuUnit : rawFit
    } else {
      anchorGpus = bomGpuTotal
    }
    var totalRaw = 0, totalYieldedRaw = 0
    ;(det || []).forEach(function (d) {
      var g = d.rawGpus || 0
      if (!g) return
      var y = workloadYield(d)
      totalRaw += g
      totalYieldedRaw += g * y
    })
    var blendedYield = totalRaw > 0 ? (totalYieldedRaw / totalRaw) : 1.0
    var effectiveCapacity = anchorGpus * blendedYield
    var utilization = anchorGpus > 0 ? (bomGpuTotal / anchorGpus) : 0
    var headroom = anchorGpus - bomGpuTotal
    return {
      mode: mode, anchorGpus: anchorGpus, demandGpus: bomGpuTotal,
      kwPerGpu: kwPerGpu, skuUnit: skuUnit,
      blendedYield: blendedYield, effectiveCapacity: effectiveCapacity,
      utilization: utilization, headroom: headroom,
      fitsWithinBudget: mode === 1 ? (bomGpuTotal <= anchorGpus) : true
    }
  }

  // ── benchLookup (moved + consolidated from PRAXIS's praxisBenchLookup) ──
  // Was a separate, redundant fetch (PRAXIS's own M.benchmarkMap). Now uses
  // this module's own internal getBenchmark(), populated once by init() —
  // one benchmark_results fetch for every caller, not one per tool.
  function benchLookup(gpuId, modelId, engine, quant) {
    if (!gpuId || !modelId) return null
    var bm = getBenchmark(gpuId, modelId)
    if (!bm) return null
    var baseTps = bm.tokens_per_sec || bm.tokens_per_sec_p50
    if (!baseTps) return null
    var engFactor = (engine === 'trt_llm') ? 1.3 : (engine === 'sglang') ? 1.1 : 1.0
    var quantFactor = (quant === 'fp16') ? 0.5 : (quant === 'int4') ? 1.3 : 1.0
    return {
      tps: Math.round(baseTps * engFactor * quantFactor),
      source: 'measured (benchmark_results, gpu×model, engine/quant-adjusted)'
    }
  }

  // ── checkQuantCompat (moved from PRAXIS Phase 1.1) ──────────────────────
  // servingEngineMap: optional {engineName: {supported_precisions:[...]}} —
  // passed explicitly (was M.servingEngineMap; never actually populated in
  // PRAXIS, so behavior is unchanged — always used the documented fallback).
  function checkQuantCompat(engine, precision, servingEngineMap) {
    var live = servingEngineMap ? servingEngineMap[engine] : null
    if (live && Array.isArray(live.supported_precisions)) {
      var ok = live.supported_precisions.indexOf(precision) !== -1
      return { compatible: ok, source: 'serving_engine_configs', warning: ok ? null : (precision.toUpperCase() + ' not in ' + engine + "'s supported precisions") }
    }
    var FALLBACK_MATRIX = {
      vllm: ['fp16', 'fp8', 'int8', 'int4'],
      trt_llm: ['fp16', 'fp8', 'int8', 'int4'],
      sglang: ['fp16', 'fp8', 'int4'],
      triton: ['fp16', 'fp8', 'int8'],
      lorax: ['fp16', 'int8']
    }
    var supported = FALLBACK_MATRIX[engine] || ['fp16', 'fp8', 'int8', 'int4']
    var isOk = supported.indexOf(precision) !== -1
    return {
      compatible: isOk,
      source: 'documented-fallback (unverified against Supabase)',
      warning: isOk ? null : (precision.toUpperCase() + ' is not commonly supported on ' + engine + ' — verify before committing to this configuration')
    }
  }


  // ── UC/MaaS legacy estimator (moved from PRAXIS, Phase 1 Stage B2) ───────
  // NOTE: this is the EXISTING PRAXIS methodology, moved verbatim (zero
  // behavior change) — deliberately NOT reconciled with sizeUC()'s newer
  // Little's-Law/three-constraint approach above. Reconciling the two into
  // one methodology is a separate, later decision — this move only
  // centralizes WHERE the code lives, per Arvind's direction: no calc logic
  // inside any tool, everything here, so MaaS/agentic/etc share exactly one
  // implementation regardless of which tool calls it.
  // Takes model/gpu/decode-proc objects and the decode proc's unit price as
  // explicit params rather than calling a local lookup/price function
  // internally — keeps this a pure function, no dependency on any one
  // tool's data-fetching or pricing layer. decodePricePerUnit is the ONLY
  // pricing input (needed for decCost, which downstream code sums directly
  // into total gCost) — everything else here is pure sizing.
  var MIG_PROFILES = {
    "full": {n:"Full GPU (7/7)", frac:1,     inst:1},
    "4g":   {n:"4/7 (~109GB B200)", frac:0.571, inst:1},
    "3g":   {n:"3/7 (~82GB B200)",  frac:0.428, inst:2},
    "2g":   {n:"2/7 (~54GB B200)",  frac:0.285, inst:3},
    "1g":   {n:"1/7 (~27GB B200)",  frac:0.142, inst:7}
  }
  var HA_TIERS = {
    mission_critical: {n:"Mission Critical", gpu_mult:1.5, n_plus:2},
    business:         {n:"Business Critical", gpu_mult:1.2, n_plus:1},
    best_effort:      {n:"Best Effort",       gpu_mult:1,   n_plus:0}
  }

  function estimateUC(w, m, p, decodeP, decodePricePerUnit) {
    if (!m || !p || (!p.hbm && p.t !== 'CPU')) return {gpus:0, kv:0, tpsG:0, peakConc:0, dailyReqs:0, dailyTok:0, moTok:0, memG:0, perfG:0, decGPUs:0, decCost:0, decPow:0}

    var vram = w.qt === 'fp16' ? m.v16 : (m.v8 || m.v16 / 2)
    var prec = w.qt === 'fp16' ? 2 : 1
    var migFrac = ((MIG_PROFILES[w.migProfile] || {}).frac) || 1
    var effHBM = (p.hbm || 80) * migFrac

    // Multimodal: visual tokens
    var effAI = w.ai
    if (w.inputModality === 'image_text' && w.avgImgPerReq > 0) {
      var vtokPerImg = w.imgRes === '512' ? 576 : w.imgRes === '1024' ? 1024 : 2048
      effAI += w.avgImgPerReq * vtokPerImg
    }

    // Agentic: multiply by steps
    var effTokensPerTask = w.isAgentic ? (effAI + w.ao) * w.steps : (effAI + w.ao)
    var gpuUtilFactor = w.isAgentic ? w.gpuUtil : 0.85

    // KV cache
    var layers = Math.max(Math.ceil(m.pb * 1.2), 1), hdim = Math.ceil(Math.sqrt(Math.max(m.pb, 0.01) * 1e9 / layers / 4) / 128) * 128
    var heads = Math.max(1, Math.floor(hdim / 128))
    var bSz = w.batch || 8
    var ctxForKV = w.isAgentic ? Math.min(effAI * w.steps, 32768) : Math.min(effAI, 8192)
    var kv = (2 * layers * heads * 128 * ctxForKV * bSz * prec) / 1e9
    var tot = vram + kv
    var memG = Math.ceil(tot / (effHBM * 0.85))

    // TPS per GPU — benchmark lookup first, then estimation fallback
    var bm = benchLookup(w.proc, w.md, w.eng, w.qt)
    var tpsG_raw, estTTFT_bm = 0, estTBT_bm = 0, bmSource = 'estimated'
    if (bm) {
      tpsG_raw = bm.tps * migFrac
      estTTFT_bm = bm.ttft_ms || 0
      estTBT_bm = bm.tbt_ms || 0
      bmSource = bm.source
    } else {
      tpsG_raw = (m.tps || 100) * ((p.fp8 || p.fp16 || 1000) / 4500) * (w.qt === 'fp16' ? 0.5 : w.qt === 'int4' ? 1.3 : 1) * migFrac
      var engFactor = w.eng === 'trt_llm' && p.v === 'NVIDIA' ? 1.3 : w.eng === 'sglang' ? 1.1 : 1.0
      tpsG_raw *= engFactor
    }
    var tpsG = tpsG_raw * gpuUtilFactor

    // Traffic
    var dailyReqs = w.dau * w.rpud, avgRPS = dailyReqs / 86400, peakRPS = avgRPS * w.pk
    var reqDur = w.isAgentic ? (w.ao * w.steps / Math.max(tpsG_raw, 1) + w.steps * w.toolWait / 1000) : (w.ao > 0 ? w.ao / Math.max(tpsG_raw, 1) : 0.5)
    var peakConc = Math.max(1, Math.ceil(peakRPS * Math.max(reqDur, 0.05)))
    var perfG = Math.ceil(peakConc * Math.max(reqDur, 0.05) / bSz / gpuUtilFactor)

    // HA multiplier
    var ha = HA_TIERS[w.criticality] || HA_TIERS.best_effort
    var raw = Math.max(memG, perfG, 1)
    var need = Math.ceil(raw * ha.gpu_mult) + ha.n_plus

    // Cascade: split load
    var cascadeGPUs = 0
    if (w.cascadeModel && w.cascadeSplit > 0) {
      cascadeGPUs = Math.max(1, Math.ceil(need * w.cascadeSplit / 100 * 0.5))
    }

    // Disaggregated decode
    var decGPUs = 0, decCost = 0, decPow = 0, tbtPenalty = 1
    if (w.disaggAccepted && w.decodeProc && decodeP) {
      decGPUs = Math.max(1, Math.ceil(need * 0.6))
      decCost = decGPUs * (decodePricePerUnit || 0) * 1.8
      decPow = decGPUs * (decodeP.tdp || 300) * 1.1 / 1000
      tbtPenalty = decodeP.tbt_factor || 1
    }

    // Hybrid: reduce on-prem by split
    var onPremFrac = 1
    if (w.src === 'hybrid') onPremFrac = w.hybridSplit / 100
    if (w.src === 'api') onPremFrac = 0
    var adjustedGPUs = Math.ceil((need + cascadeGPUs) * onPremFrac)

    var dailyTok = dailyReqs * effTokensPerTask
    var moTok = dailyTok * 30

    return {
      gpus: adjustedGPUs, kv: kv, tpsG: tpsG, peakConc: peakConc, dailyReqs: dailyReqs,
      avgRPS: avgRPS.toFixed(1), peakRPS: peakRPS.toFixed(1),
      dailyTok: dailyTok, moTok: moTok, memG: memG, perfG: perfG, vramTot: tot,
      decGPUs: decGPUs, decCost: decCost, decPow: decPow, cascadeGPUs: cascadeGPUs, tbtPenalty: tbtPenalty,
      need: need + cascadeGPUs, effAI: effAI, effTokensPerTask: effTokensPerTask, reqDur: reqDur,
      onPremFrac: onPremFrac, bSz: bSz,
      bmTTFT: estTTFT_bm, bmTBT: estTBT_bm, bmSource: bmSource
    }
  }

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
    /**
     * capacityForGPU(gpuConfigId, config)
     *
     * BOTTOM-UP — public wrapper. Given a GPU architecture + count, returns
     * maximum demand (DAU) that configuration can support. Reverse of
     * sizeUC()/sizeMaaS() — same underlying formulas, opposite direction.
     * See Solution Builder Spec Section 13 for full design rationale.
     *
     * config: {
     *   model_id:            string  (model_catalogue.id — REQUIRED)
     *   gpu_count:           number  (REQUIRED — the GPU count to test)
     *   precision:           string  (optional — default INT4)
     *   profile:             string  A|B (optional, default 'A' — MaaS/throughput.
     *                         Use 'B' for UC/latency-bound capacity testing)
     *   requests_per_day:    number  (optional, default 5)
     *   peak_multiplier:     number  (optional, default 3)
     *   avg_output_tokens:   number  (optional, default 500)
     *   derating_pct:        number  (optional, default 80)
     * }
     */
    capacityForGPU: function (gpuConfigId, config) {
      var gpu   = getGPU(gpuConfigId)
      var model = getModel(config.model_id)
      if (!gpu)   return { error: 'GPU config not found: ' + gpuConfigId }
      if (!model) return { error: 'Model not found: ' + config.model_id }
      if (!config.gpu_count || config.gpu_count < 1) return { error: 'gpu_count required and must be >= 1' }

      var precision = config.precision || 'INT4'
      var profile   = config.profile || 'A'
      var params_b  = model.params_b || 7

      return capacityForGPU(
        gpu, model, params_b, precision, config.gpu_count,
        {
          requests_per_user_per_day: config.requests_per_day,
          peak_multiplier:           config.peak_multiplier,
          avg_output_tokens:         config.avg_output_tokens
        },
        profile,
        config.derating_pct
      )
    },

    sizeUC: function (config, gpuConfigId) {
      var gpu    = getGPU(gpuConfigId)
      var model  = getModel(config.model_id)
      var ucType = getUCType(config.uc_type_id)

      if (!gpu) return { error: 'GPU config not found: ' + gpuConfigId }

      // ── Resolve inputs with uc_type defaults ──────────────────────────────
      var dau        = config.dau || 1000
      var reqPerDay  = config.requests_per_day   || (ucType && ucType.requests_per_user_per_day) || 5
      var outputTok  = config.avg_output_tokens  || (ucType && ucType.avg_output_tokens) || 500
      var precision  = config.precision          || (ucType && ucType.min_precision) || 'INT4'
      var engine     = config.engine             || 'vllm'
      var slaTier    = config.sla_tier           || 'standard'
      var haRequired = config.ha_required !== undefined ? config.ha_required
                     : (ucType && ucType.ha_required !== undefined ? ucType.ha_required : true)
      var drType     = config.dr_type            || 'none'
      var growth     = config.growth_headroom_pct !== undefined ? config.growth_headroom_pct : 20
      var derating   = config.derating_pct       || 80
      var params_b   = model ? model.params_b : 7
      var availSLA   = config.availability_sla   || '99.5'

      // Context: P50 (typical) and P95 (max/guaranteed) — key for VRAM sizing
      // P50 drives utilisation estimate, P95 drives SLA guarantee GPU count
      var contextP50 = config.typical_context_tokens
        || config.context_window
        || ((model && model.context_length_k) ? Math.min(model.context_length_k * 1000, 8192) : 4096)
      var contextP95 = config.max_context_tokens
        || config.context_window
        || ((model && model.context_length_k) ? model.context_length_k * 1000 : 8192)

      // Sizing policy from engagement: 'p50_utilisation' or 'p95_guaranteed'
      var sizingPolicy = config.sizing_policy || 'p95_guaranteed'

      // Active context for sizing (P95 for guaranteed, P50 for utilisation)
      var contextLen = sizingPolicy === 'p50_utilisation' ? contextP50 : contextP95

      // ── Performance tier (derived — not user-selected) ────────────────────
      var perfTier     = config.performance_tier || derivePerformanceTier(ucType, contextP95)
      var tierBatchCap = TIER_BATCH_CAP[perfTier] || 32
      var tierWarning  = precisionTierWarning(precision, perfTier)
      var dedicatedPool = perfTier === 'tier1'  // Tier 1 never shares pool

      // ── P95 concurrency — Little's Law with P95 peak ──────────────────────
      // P95 peak multiplier: P95 traffic is typically 2-3× average peak
      // Use explicit p95_peak_multiplier if provided, else estimate from peak_mult
      var peakMult     = config.peak_multiplier || (ucType && ucType.peak_multiplier) || 3
      var p95Mult      = config.p95_peak_multiplier || (peakMult * 1.5)  // P95 ≈ 1.5× avg peak

      var avgRPS   = (dau * reqPerDay) / 86400
      var peakRPS  = avgRPS * peakMult      // average peak (P50)
      var p95RPS   = avgRPS * p95Mult       // P95 spike

      // Active RPS for sizing
      var activeRPS = sizingPolicy === 'p50_utilisation' ? peakRPS : p95RPS

      // Little's Law: concurrent sessions = RPS × response time
      var ttftSlaMs = config.ttft_sla_ms
        || (ucType && ucType.typical_sla_ms)
        || (perfTier === 'tier1' ? 500 : perfTier === 'tier2' ? 3000 : 30000)
      var responseTimeSec  = Math.max(0.5, ttftSlaMs / 1000)
      var concurrentSessions = Math.max(1, Math.ceil(activeRPS * responseTimeSec))

      // ── Effective VRAM (includes coherent memory for unified GPUs) ─────────
      var vramPerGPU    = effectiveVRAM(gpu)
      var isUnifiedMem  = !!(gpu.unified_memory && gpu.coherent_cpu_mem_gb)

      // ── Speculative decoding: draft model adds its own VRAM footprint ──────
      // Enterprise_Sizing_SLA_Blueprint: "VRAM_instance = W_base + W_draft + KV_cache_pool"
      var draftModel = config.draft_model_id ? getModel(config.draft_model_id) : null
      var W_draft    = draftModel ? calcModelVRAM(draftModel.params_b, precision) : 0

      // ── VRAM constraint: B_max from available KV cache budget ─────────────
      var W_i           = calcModelVRAM(params_b, precision)
      var kvPerSession  = calcKVCache(model, contextLen, 1, precision, engine)  // per single session
      var vramForWeights = (W_i + W_draft) * RUNTIME_OVERHEAD
      var kvBudget      = Math.max(0, vramPerGPU - vramForWeights)
      var B_max_vram    = Math.max(1, Math.floor(kvBudget / kvPerSession))

      // ── SLA constraint: B_max from TTFT target ────────────────────────────
      // GPU throughput at this batch size (Profile B — bandwidth bound)
      var throughputPerGPU = calcGPUThroughput(gpu, model, params_b, precision, 'B')
      var B_max_sla = Math.max(1, Math.floor(
        (throughputPerGPU * (derating / 100) * (ttftSlaMs / 1000)) / outputTok
      ))

      // ── Three-constraint B_max ─────────────────────────────────────────────
      var B_max = Math.min(B_max_vram, B_max_sla, tierBatchCap)
      var bindingBatch = B_max === B_max_vram   ? 'vram'
                       : B_max === B_max_sla    ? 'sla_ttft'
                       : 'tier_cap_' + perfTier

      // ── GPU fit: TP_i (GPUs per model instance) ────────────────────────────
      var kvForBmax  = calcKVCache(model, contextLen, B_max, precision, engine)
      var vramNeeded = (W_i + W_draft + kvForBmax) * RUNTIME_OVERHEAD
      var TP_i       = Math.max(1, Math.ceil(vramNeeded / vramPerGPU))

      // ── GPU throughput: I_i (instances needed) ────────────────────────────
      var gpusForThroughput = calcGPUsForThroughput(activeRPS, outputTok, gpu, model, params_b, precision, 'B', derating)
      var I_i = Math.max(1, Math.ceil(gpusForThroughput / Math.max(TP_i, 1)))

      // Base GPU count: I_i instances × TP_i GPUs each
      var baseGPUs          = I_i * TP_i
      var bindingConstraint = TP_i >= gpusForThroughput ? 'memory_fit' : 'throughput'

      // ── Availability SLA → HA reserve ─────────────────────────────────────
      var haPct     = AVAILABILITY_HA_PCT[availSLA] || 0.10
      var haGPUs    = haRequired ? Math.ceil(baseGPUs * haPct) : 0
      var drGPUs    = drType === 'warm'          ? Math.ceil(baseGPUs * RESILIENCE_OVERHEAD.dr_warm)
                    : drType === 'active-active'  ? Math.ceil(baseGPUs * RESILIENCE_OVERHEAD.dr_active_active)
                    : 0

      // ── SLA buffers (no multi-tenancy for UC — dedicated per tenant) ───────
      var sla             = SLA_BUFFERS[slaTier] || SLA_BUFFERS.standard
      var peakBuffer      = Math.ceil(baseGPUs * sla.peak_headroom_pct / 100)
      var failoverReserve = Math.ceil(baseGPUs * sla.failover_pct / 100)
      var growthGPUs      = Math.ceil(baseGPUs * (growth / 100))

      // Tier 1: dedicated pool — no sharing, additional isolation buffer
      var isolationGPUs   = dedicatedPool ? Math.ceil(baseGPUs * 0.10) : 0

      var rawTotalGPUs    = baseGPUs + peakBuffer + failoverReserve + haGPUs + drGPUs + growthGPUs + isolationGPUs

      // ── Production yield (Blueprint Section 30) — applied ONCE, after all
      // buffers, before unit rounding. Ports the same rule PRAXIS's skuRollup
      // uses: yield-inflate raw demand, round to units ONCE, never twice.
      // Consumer UCs (this function) always incur production-yield loss;
      // raw-capacity types don't (workloadYield returns 1.0 for those).
      var ucYield  = workloadYield({ tp: 'uc', ragType: config.rag_type || 'none', isAgentic: !!config.is_agentic, steps: config.agent_steps || 0 })
      var totalGPUs = Math.ceil(rawTotalGPUs / ucYield)

      // ── Performance estimates ─────────────────────────────────────────────
      var unitCalc       = gpusToUnits(totalGPUs, gpu)
      var powerKW        = calcPowerKW(unitCalc.units, gpu)
      var totalThroughput = throughputPerGPU * unitCalc.actual_gpus * (derating / 100)

      // TTFT estimate: time to generate first token = model_size / bandwidth
      var ttftEstimateMs = Math.round(
        (params_b * (BYTES_PER_PARAM[precision] || 2) * 1e9) /
        ((gpu.hbm_bw_tbps || 3) * 1e12 / TP_i) * 1000
      )
      var slaMet = ttftEstimateMs <= ttftSlaMs

      // ── P50 utilisation estimate ───────────────────────────────────────────
      // Show what utilisation looks like at normal (P50) load
      var p50Sessions   = Math.max(1, Math.ceil(peakRPS * responseTimeSec))
      var p50Util       = Math.round(p50Sessions / Math.max(concurrentSessions, 1) * 100)

      return {
        // Demand inputs
        dau:                    dau,
        requests_per_day:       reqPerDay,
        peak_rps_p50:           Math.round(peakRPS * 100) / 100,
        peak_rps_p95:           Math.round(p95RPS * 100) / 100,
        active_rps:             Math.round(activeRPS * 100) / 100,
        sizing_policy:          sizingPolicy,

        // Performance tier
        performance_tier:       perfTier,
        tier_batch_cap:         tierBatchCap,
        dedicated_pool:         dedicatedPool,
        precision:              precision,
        engine:                 engine,
        production_yield:       Math.round(ucYield * 1000) / 1000,
        raw_gpus_before_yield:  rawTotalGPUs,
        speculative_decoding:   !!draftModel,
        draft_model_vram_gb:    Math.round(W_draft * 100) / 100,
        tier_warning:           tierWarning,

        // Context
        context_p50_tokens:     contextP50,
        context_p95_tokens:     contextP95,
        context_used_tokens:    contextLen,

        // Three-constraint B_max
        b_max_vram:             B_max_vram,
        b_max_sla:              B_max_sla,
        b_max_tier_cap:         tierBatchCap,
        b_max:                  B_max,
        binding_batch_constraint: bindingBatch,

        // GPU breakdown
        tp_i:                   TP_i,
        i_i:                    I_i,
        gpus_for_fit:           TP_i,
        gpus_for_throughput:    gpusForThroughput,
        binding_constraint:     bindingConstraint,
        base_gpus:              baseGPUs,
        peak_buffer_gpus:       peakBuffer,
        failover_gpus:          failoverReserve,
        ha_gpus:                haGPUs,
        dr_gpus:                drGPUs,
        isolation_gpus:         isolationGPUs,
        growth_gpus:            growthGPUs,
        total_gpus:             totalGPUs,

        // Coherent memory
        vram_per_gpu_effective: Math.round(vramPerGPU * 10) / 10,
        unified_memory:         isUnifiedMem,
        coherent_note:          isUnifiedMem
          ? 'Effective VRAM includes coherent CPU memory (' + gpu.coherent_interconnect + ')'
          : null,

        // Availability
        availability_sla:       availSLA,
        ha_pct_applied:         Math.round(haPct * 100),

        // Units (packaging — BOM concern, shown for reference)
        units_required:         unitCalc.units,
        unit_type:              unitCalc.unit_type,
        actual_gpus:            unitCalc.actual_gpus,
        gpus_per_unit:          unitCalc.gpus_per_unit,

        // Performance
        params_b:               params_b,
        throughput_tokens_per_sec: Math.round(totalThroughput),
        ttft_estimate_ms:       ttftEstimateMs,
        ttft_sla_ms:            ttftSlaMs,
        sla_met:                slaMet,
        power_kw:               Math.round(powerKW * 10) / 10,
        p50_utilisation_pct:    p50Util,

        // Sizing profile
        sizing_profile: 'B',

        // Full audit trail
        notes: [
          'Profile B | Tier: ' + perfTier + ' | Policy: ' + sizingPolicy,
          'P95 RPS: ' + Math.round(p95RPS*100)/100 + ' | Concurrent: ' + concurrentSessions + ' (Littles Law: ' + Math.round(activeRPS*100)/100 + ' RPS × ' + responseTimeSec + 's)',
          'B_max: min(' + B_max_vram + ' VRAM, ' + B_max_sla + ' SLA, ' + tierBatchCap + ' tier) = ' + B_max + ' [' + bindingBatch + ']',
          'GPU: TP_i=' + TP_i + ' × I_i=' + I_i + ' = ' + baseGPUs + ' base | Effective VRAM: ' + Math.round(vramPerGPU) + 'GB' + (isUnifiedMem ? ' (unified)' : '') + (draftModel ? ' | Speculative decoding: +' + Math.round(W_draft) + 'GB draft (' + draftModel.name + ')' : ''),
          'Buffers: +' + peakBuffer + ' peak +' + failoverReserve + ' failover +' + haGPUs + ' HA(' + availSLA + '%) +' + isolationGPUs + ' isolation +' + growthGPUs + ' growth = ' + rawTotalGPUs + ' pre-yield',
          'Yield: ' + rawTotalGPUs + ' / ' + (Math.round(ucYield*1000)/1000) + ' = ' + totalGPUs + ' total (Blueprint §30 production yield)',
          'TTFT: ' + ttftEstimateMs + 'ms vs SLA ' + ttftSlaMs + 'ms → ' + (slaMet ? '✓ met' : '✗ breach'),
          'KV: ' + kvCacheMethod(model)
        ].join(' | '),

        audit: {
          formula:              'base = I_i × TP_i | B_max = min(VRAM, SLA, tier)',
          w_i_gb:               Math.round(W_i * 100) / 100,
          kv_per_session_gb:    Math.round(kvPerSession * 100) / 100,
          kv_for_bmax_gb:       Math.round(kvForBmax * 100) / 100,
          vram_needed_gb:       Math.round(vramNeeded * 100) / 100,
          vram_available_gb:    Math.round(vramPerGPU * 100) / 100,
          b_max_vram:           B_max_vram,
          b_max_sla:            B_max_sla,
          b_max_final:          B_max,
          binding_batch:        bindingBatch,
          tp_i:                 TP_i,
          i_i:                  I_i,
          base_gpus:            baseGPUs,
          kv_cache_method:      kvCacheMethod(model),
          littles_law:          'N = ' + Math.round(activeRPS*100)/100 + ' RPS × ' + responseTimeSec + 's = ' + concurrentSessions,
          p95_vs_p50:           'P95 sessions: ' + concurrentSessions + ' | P50 sessions: ' + p50Sessions + ' | P50 util: ' + p50Util + '%'
        }
      }
    },

    /**
     * sizeMaaS(config, gpuConfigId)
     *
     * Size a single Model offered via MaaS. Profile A — throughput-driven,
     * high concurrency, shared/dedicated pool per tenant attribution.
     *
     * CHANGED 30 June 2026: model_id is now the primary required input.
     * archetype_id is OPTIONAL — used only as a one-time preset to pre-fill
     * demand-shape fields (requests/day, tokens, context) when a row is
     * first created. It is never required and never stored as a dependency
     * — matches the principle that nobody buys "an archetype" from an API
     * provider, they pick a specific model. Demand-shape defaults now
     * resolve from model_catalogue first, with safe hardcoded fallbacks.
     *
     * config: {
     *   model_id:          string  (model_catalogue.id — REQUIRED)
     *   archetype_id:      string  (OPTIONAL — preset only, never required)
     *   dau:               number  total DAU for this model's pool
     *   requests_per_day:  number  (optional — fallback default)
     *   avg_input_tokens:  number  (optional — model max_input_tokens scaled, else fallback)
     *   avg_output_tokens: number  (optional — model max_output_tokens scaled, else fallback)
     *   context_window_k:  number  (optional — model context_length_k, else fallback)
     *   peak_concurrent_pct: number (optional, default 5)
     *   commercial_sla:    string  bronze|silver|gold (CUSTOMER-FACING — drives TTFT/uptime
     *                       promise AND internal buffer tier. Confirmed 30 June 2026 —
     *                       supersedes earlier standard/enterprise-only product decision.
     *                       NO free trial tier — dropped from scope.)
     *   pool_type:         string  reserved|open (Tenant block — open default)
     *   precision:         string  (optional — inferred from model)
     *   derating_pct:      number  (optional, default 80)
     * }
     */
    sizeMaaS: function (config, gpuConfigId) {
      var gpu   = getGPU(gpuConfigId)
      var model = getModel(config.model_id)

      if (!gpu)   return { error: 'GPU config not found: ' + gpuConfigId }
      if (!model) return { error: 'Model not found: ' + config.model_id }

      // Optional archetype preset — used only if explicitly passed AND
      // config fields are not already set. Never required, never the
      // primary source. Falls through cleanly if no archetype given.
      var archetype = config.archetype_id ? getArchetype(config.archetype_id) : null
      var presetCfg = (archetype && archetype.config) || {}

      var dau        = config.dau || 1000
      var poolType   = config.pool_type || 'open'   // Tenant block

      // ── Commercial SLA: Bronze / Silver / Gold ──────────────────────────
      // Customer-facing product tier, sourced from model_catalogue's own
      // sla_bronze/silver/gold_ttft_ms + uptime_pct columns. Pool type
      // sets a sensible default — Reserved tenants typically choose
      // Silver/Gold, Open pool defaults to Bronze — but is always
      // explicitly overridable per row.
      var commercialSla = config.commercial_sla
        || (poolType === 'reserved' ? 'gold' : 'bronze')
      var ttftTargetMs  = model['sla_' + commercialSla + '_ttft_ms']    || 2000
      var uptimePct     = model['sla_' + commercialSla + '_uptime_pct'] || 99.5

      // Internal buffer tier (peak headroom / failover / multi-tenancy %) —
      // an IMPLEMENTATION detail, separate from the commercial SLA shown
      // to the customer. Bronze/Silver -> standard buffers, Gold -> enterprise
      // buffers (dedicated, highest assurance). See SLA_BUFFERS constant.
      var slaTier = commercialSla === 'gold' ? 'enterprise' : 'standard'

      var precision  = config.precision || 'INT4'
      var derating   = config.derating_pct || 80

      // Resolve demand-shape: explicit config → real model_catalogue columns
      // → optional archetype preset → hardcoded safe fallback (in that order)
      var reqPerDay   = config.requests_per_day
        || presetCfg.requests_per_user_per_day
        || 5
      var inputTok    = config.avg_input_tokens
        || (model.max_input_tokens ? Math.round(model.max_input_tokens * 0.3) : null)
        || presetCfg.avg_input_tokens
        || 300
      var outputTok   = config.avg_output_tokens
        || (model.max_output_tokens ? Math.round(model.max_output_tokens * 0.3) : null)
        || presetCfg.avg_output_tokens
        || 500
      var contextLen  = (config.context_window_k
        || model.context_length_k
        || presetCfg.avg_context_window_k
        || 8) * 1000
      var peakConcPct = config.peak_concurrent_pct || presetCfg.peak_concurrent_pct || 5
      var params_b    = model ? model.params_b : 7

      // ── Base Model + Multi-LoRA (MaaS_Infrastructure_Sizing_Blueprint):
      // "a massive base model remains permanently resident in VRAM, and
      // hundreds of custom fine-tuned LoRA adapters are applied dynamically
      // per API request, causing near-zero extra memory footprint." When
      // this item IS a LoRA-served variant, the memory-fit constraint uses
      // the adapter's small incremental VRAM instead of a full separate
      // model load — throughput/compute sizing is UNCHANGED (adapters don't
      // reduce compute needed to serve traffic, only the memory question).
      // NOTE: cross-adapter GPU-sharing (multiple LoRA variants packed onto
      // one shared base pool) is NOT modeled here — this item still sizes
      // its own throughput-GPU need independently, which is a safe/
      // conservative assumption, not an exploited cost saving. That
      // portfolio-level packing optimization is a separate, bigger question
      // (flagged, not built) — same open item as dedicated-vs-shared pooling.
      var isLoraVariant   = !!config.lora_base_model_id
      var LORA_ADAPTER_VRAM_GB = 1.5  // ESTIMATE — typical rank-16/32 adapter footprint; not from the blueprint (which doesn't give an exact figure), flagged for validation

      // Peak concurrent users at any moment
      var peakConcurrent = Math.ceil(dau * peakConcPct / 100)

      // Peak RPS from concurrent users × requests per session
      // At peak, concurrent users are actively generating — assume 1 req/10s average
      var peakRPS = Math.ceil(peakConcurrent / 10)

      // GPU fit (VRAM for model + KV cache for concurrent sessions) — LoRA
      // variants use adapter-only VRAM instead of the full model
      var gpusForFit
      if (isLoraVariant) {
        var kvForLora = calcKVCache(model, contextLen, peakConcurrent, precision, config.engine)
        var vramPerGPU_lora = effectiveVRAM(gpu)
        gpusForFit = Math.max(1, Math.ceil(((LORA_ADAPTER_VRAM_GB + kvForLora) * RUNTIME_OVERHEAD) / vramPerGPU_lora))
      } else {
        gpusForFit = calcGPUsForFit(params_b, precision, gpu, model, contextLen, peakConcurrent, config.engine)
      }

      // GPU throughput (Profile A — compute bound at large batch)
      var gpusForThroughput = calcGPUsForThroughput(peakRPS, outputTok, gpu, model, params_b, precision, 'A', derating)

      var baseGPUs = Math.max(gpusForFit, gpusForThroughput, 1)
      var bindingConstraint = gpusForFit >= gpusForThroughput ? 'memory_fit' : 'throughput'

      // MaaS buffers — all three layers applied. Buffer % is a property of
      // SLA tier (derived from Tenant pool_type), not of model or archetype.
      var headroomPct    = slaTier === 'enterprise' ? (presetCfg.peak_headroom_pct_enterprise || 30) : (presetCfg.peak_headroom_pct_standard || 25)
      var failoverPct    = slaTier === 'enterprise' ? (presetCfg.failover_pct_enterprise || 30)      : (presetCfg.failover_pct_standard || 15)
      var multiTenPct    = presetCfg.multi_tenancy_overhead_pct || 12

      var peakBuffer      = Math.ceil(baseGPUs * headroomPct  / 100)
      var failoverReserve = Math.ceil(baseGPUs * failoverPct  / 100)
      var multiTenancy    = Math.ceil(baseGPUs * multiTenPct  / 100)
      var rawTotalGPUs    = baseGPUs + peakBuffer + failoverReserve + multiTenancy

      // ── Production yield (Blueprint Section 30) — was completely missing
      // from sizeMaaS, unlike PRAXIS's UC pipeline (which applies it via
      // skuRollup). MaaS items genuinely need this: not every inference
      // attempt succeeds (schema failures, hallucination retries, agentic
      // step compounding). Applied ONCE, after buffers, before unit rounding.
      var maasYield = workloadYield({ tp: 'maas', ragType: config.rag_type || 'none', isAgentic: !!config.is_agentic, steps: config.agent_steps || 0 })
      var totalGPUs = Math.ceil(rawTotalGPUs / maasYield)

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
        model_id:              config.model_id,
        model_name:             model.name || config.model_id,
        pool_type:              poolType,
        commercial_sla:         commercialSla,        // bronze|silver|gold — customer-facing
        ttft_target_ms:         ttftTargetMs,          // from model's own sla_<tier>_ttft_ms
        uptime_pct:             uptimePct,             // from model's own sla_<tier>_uptime_pct
        internal_buffer_tier:   slaTier,               // standard|enterprise — implementation detail
        dau:                   dau,
        peak_concurrent:       peakConcurrent,
        peak_rps:              peakRPS,
        precision:             precision,
        params_b:              params_b,
        is_lora_variant:       isLoraVariant,
        production_yield:      Math.round(maasYield * 1000) / 1000,
        raw_gpus_before_yield: rawTotalGPUs,
        lora_base_model_id:    config.lora_base_model_id || null,

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
          'Profile A (MaaS API): compute-bound at batch 128+' + (isLoraVariant ? ' | LoRA variant of ' + config.lora_base_model_id + ' — adapter-only VRAM (' + LORA_ADAPTER_VRAM_GB + 'GB), cross-adapter pool-sharing not modeled' : ''),
          'SLA: ' + commercialSla.toUpperCase() + ' (TTFT ' + ttftTargetMs + 'ms, ' + uptimePct + '% uptime) — pool: ' + poolType,
          'DAU ' + dau + ' → ' + peakConcurrent + ' peak concurrent (' + peakConcPct + '%)',
          'Base: max(' + gpusForFit + ' fit, ' + gpusForThroughput + ' throughput) = ' + baseGPUs + ' (' + bindingConstraint + ')',
          'Buffers: +' + peakBuffer + ' peak(' + headroomPct + '%), +' + failoverReserve + ' failover(' + failoverPct + '%), +' + multiTenancy + ' multi-tenancy(' + multiTenPct + '%) = ' + rawTotalGPUs + ' pre-yield',
          'Yield: ' + rawTotalGPUs + ' / ' + (Math.round(maasYield*1000)/1000) + ' = ' + totalGPUs + ' total → ' + unitCalc.units + ' ' + unitCalc.unit_type + '(s)'
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

      // ── Dedicated vs shared pool (INCOMPLETE — single-item approximation) ──
      // Real packing efficiency needs visibility into ALL GPUaaS items
      // sharing a pool simultaneously (portfolio-level, not solvable by one
      // item's own sizing call) — flagged, not built. This applies only a
      // documented, conservative discount to THIS item's own burst reserve
      // when pool_type='shared', representing that a shared pool statistically
      // needs less burst held per-tenant than a fully dedicated one. Reserved
      // (baseline) capacity is untouched either way — only burst is affected.
      var isShared     = config.pool_type === 'shared'
      var SHARED_BURST_DISCOUNT = 0.30 // ESTIMATE — not from a proven source
      var effectiveBurst = isShared ? Math.ceil(burst * (1 - SHARED_BURST_DISCOUNT)) : burst

      var haReserve    = Math.ceil(reserved * ((cfg.ha_reserve_pct || 10) / 100))
      var totalGPUs    = reserved + effectiveBurst + haReserve
      var unitCalc     = gpusToUnits(totalGPUs, gpu)
      var powerKW      = calcPowerKW(unitCalc.units, gpu)

      return {
        reserved_gpus: reserved,
        burst_gpus:    effectiveBurst,
        burst_gpus_before_pool_discount: burst,
        pool_type:     config.pool_type || 'dedicated',
        ha_reserve:    haReserve,
        total_gpus:    totalGPUs,
        units_required: unitCalc.units,
        unit_type:     unitCalc.unit_type,
        actual_gpus:   unitCalc.actual_gpus,
        power_kw:      Math.round(powerKW * 10) / 10,
        notes: reserved + ' reserved + ' + effectiveBurst + ' burst' + (isShared ? ' (shared pool, -' + Math.round(SHARED_BURST_DISCOUNT*100) + '% single-item approximation)' : '') + ' + ' + haReserve + ' HA reserve = ' + totalGPUs + ' GPUs'
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
            label: 'MaaS — ' + (r.model_name || r.model_id || 'API') + (r.pool_type === 'reserved' ? ' (Reserved)' : ' (Open)'),
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
    KV_CACHE_MB_PER_TOKEN: KV_CACHE_MB_PER_TOKEN,

    // Moved from PRAXIS (Phase 1 Stage B1) — production yield, entry-mode
    // anchor, benchmark lookup (consolidated with this module's own
    // getBenchmark), quant-engine compatibility.
    workloadYield:       workloadYield,
    computeEntryAnchor:  computeEntryAnchor,
    benchLookup:         benchLookup,
    checkQuantCompat:    checkQuantCompat,
    estimateUC:          estimateUC,
    MIG_PROFILES:        MIG_PROFILES,
    HA_TIERS:             HA_TIERS
  }

  // Export
  root.SizingEngine = SizingEngine

})(typeof window !== 'undefined' ? window : global)
