/**
 * ATLAS Token Economics Engine — shared/token-economics.js
 * Layer 1: Token Estimator (per content type)
 * Layer 2: Request Budget (full request cost breakdown + waste analysis)
 * Layer 3: Fleet Economics (sizing inputs for SizingEngine)
 * Layer 4: Competitive Tokenomics (vs hyperscalers, crossover analysis)
 *
 * Pure functions — no DOM, no Supabase, no side effects.
 * Loaded as a dependency alongside sasc-sizing.js.
 *
 * Usage:
 *   TokenEcon.estimateTokens({ type: 'image', width: 512, height: 512 })
 *   TokenEcon.budgetRequest(stages, trafficConfig, engineConfig)
 *   TokenEcon.compareVsHyperscalers(monthlyTokens, ownCostPerMTok, hyperscalerPrices)
 */

;(function (root) {
  'use strict'

  // ─── Constants ─────────────────────────────────────────────────────────────

  // Text token estimation ratios
  var WORDS_TO_TOKENS     = 1.3    // English prose
  var CHARS_TO_TOKENS     = 0.29   // General text (1/3.5 chars per token)
  var CODE_CHARS_TO_TOKENS = 0.28  // Code is slightly denser
  var STRUCTURED_CHARS    = 0.25   // JSON/XML/CSV field data

  // Vision encoder constants (ViT-style patch tokenisation)
  // Most VLMs use 14px or 16px patches
  var DEFAULT_PATCH_SIZE  = 14     // pixels per patch (InternVL, LLaVA default)

  // Audio token estimation
  // Whisper: 80ms frames, 1500 tokens per 30s = 50 tokens/sec
  var WHISPER_TOKENS_PER_SEC = 50
  // Sarvam Whisper uses same architecture
  var AUDIO_TOKENS_PER_SEC   = 50

  // System prompt size categories (when exact count not known)
  var SYSTEM_PROMPT_PRESETS = {
    minimal:  150,    // "You are a helpful assistant." — brief
    standard: 500,    // Typical enterprise system prompt
    detailed: 1200,   // Detailed persona + instructions + examples
    complex:  2500    // Full RAG system prompt with schema + examples
  }

  // RAG overlap waste: typical chunking strategies waste tokens on overlap
  var RAG_OVERLAP_WASTE = {
    none:       0.00,
    low:        0.10,   // 10% overlap (sliding window, small overlap)
    medium:     0.25,   // 25% overlap (common default)
    high:       0.50,   // 50% overlap (aggressive chunking)
    aggressive: 0.60    // 60% overlap (poor practice)
  }

  // Serving engine efficiency configs
  // These are defaults — overridden by serving_engine_configs table if loaded
  var ENGINE_DEFAULTS = {
    vllm: {
      compute_efficiency_pct:   30,
      batch_scaling_exp:        0.60,
      bandwidth_efficiency_pct: 80,
      prefix_cache_benefit:     0.00,
      padding_waste_pct:        0,
      ttft_multiplier:          1.00,
      tbt_multiplier:           1.00
    },
    trt_llm: {
      compute_efficiency_pct:   45,
      batch_scaling_exp:        0.70,
      bandwidth_efficiency_pct: 85,
      prefix_cache_benefit:     0.00,
      padding_waste_pct:        15,
      ttft_multiplier:          0.75,
      tbt_multiplier:           0.65
    },
    sglang: {
      compute_efficiency_pct:   38,
      batch_scaling_exp:        0.65,
      bandwidth_efficiency_pct: 82,
      prefix_cache_benefit:     0.25,
      padding_waste_pct:        0,
      ttft_multiplier:          0.85,
      tbt_multiplier:           0.90
    },
    llama_cpp: {
      compute_efficiency_pct:   8,
      batch_scaling_exp:        0.50,
      bandwidth_efficiency_pct: 60,
      prefix_cache_benefit:     0.00,
      padding_waste_pct:        0,
      ttft_multiplier:          3.00,
      tbt_multiplier:           4.00
    }
  }

  // Hyperscaler price history (static seed — update via Settings upload)
  // Format: [date, input_$/MTok, output_$/MTok]
  var HYPERSCALER_HISTORY = {
    'OpenAI/GPT-4o': [
      ['2024-05-13', 5.00, 15.00],
      ['2024-10-01', 2.50, 10.00],
      ['2026-01-01', 1.80,  7.20]
    ],
    'OpenAI/GPT-4.1': [
      ['2025-04-14', 2.00,  8.00],
      ['2026-01-01', 1.50,  6.00]
    ],
    'Anthropic/Claude 4 Sonnet': [
      ['2026-01-01', 2.50, 12.00]
    ],
    'Google/Gemini 2.5 Pro': [
      ['2025-05-01', 1.25, 10.00],
      ['2026-01-01', 1.00,  8.00]
    ],
    'Google/Gemini 2.5 Flash': [
      ['2025-05-01', 0.15,  0.60],
      ['2026-01-01', 0.08,  0.30]
    ],
    'AWS/Nova Pro': [
      ['2024-12-03', 0.80,  3.20],
      ['2026-01-01', 0.70,  2.80]
    ]
  }

  // ─── LAYER 1: Token Estimator ──────────────────────────────────────────────

  /**
   * estimateTokens(config)
   *
   * Estimate token count for a single content item.
   *
   * config.type: 'text' | 'code' | 'image' | 'audio' | 'structured' |
   *              'rag' | 'system_prompt' | 'chat_history' | 'document'
   *
   * Returns: { tokens, method, breakdown }
   */
  function estimateTokens (config) {
    var type = config.type || 'text'
    var tokens = 0
    var method = ''
    var breakdown = {}

    switch (type) {

      case 'text':
        // Words × 1.3 or character-based if no word count
        if (config.avg_words) {
          tokens = Math.round(config.avg_words * WORDS_TO_TOKENS)
          method = 'words × 1.3'
          breakdown = { words: config.avg_words, ratio: WORDS_TO_TOKENS }
        } else if (config.characters) {
          tokens = Math.round(config.characters * CHARS_TO_TOKENS)
          method = 'chars ÷ 3.5'
          breakdown = { chars: config.characters, ratio: CHARS_TO_TOKENS }
        }
        break

      case 'code':
        // Code is denser: ~3.5 chars per token (similar to text but slightly more)
        var chars = config.characters || (config.lines || 0) * 60  // ~60 chars/line avg
        tokens = Math.round(chars * CODE_CHARS_TO_TOKENS)
        method = 'code chars ÷ 3.6'
        breakdown = { chars: chars, ratio: CODE_CHARS_TO_TOKENS }
        break

      case 'image':
        // ViT patch tokenisation: (H/patch_size) × (W/patch_size)
        // Most VLMs also add CLS token and use dynamic resolution
        var patch = config.patch_size || DEFAULT_PATCH_SIZE
        var w     = config.width  || 512
        var h     = config.height || 512
        var patches_w = Math.ceil(w / patch)
        var patches_h = Math.ceil(h / patch)
        tokens = patches_w * patches_h
        // Dynamic resolution models (InternVL, Qwen-VL) tile large images
        // Each tile adds (H_tile/patch)×(W_tile/patch) tokens
        var tiles = config.tiles || 1
        tokens = tokens * tiles
        // Add thumbnail token if model uses it (InternVL: always adds 256 thumbnail)
        if (config.thumbnail_tokens) tokens += config.thumbnail_tokens
        method = '(' + w + '×' + h + ') ÷ patch' + patch + '² × ' + tiles + ' tiles'
        breakdown = { width: w, height: h, patch_size: patch, patches: tokens, tiles: tiles }
        break

      case 'audio':
        // Whisper-style: 80ms frames, 50 tokens/sec
        var secs = config.duration_seconds || 30
        tokens = Math.round(secs * AUDIO_TOKENS_PER_SEC)
        method = duration + 's × 50 tok/sec (Whisper framing)'
        method = secs + 's × 50 tok/sec (Whisper framing)'
        breakdown = { duration_seconds: secs, tokens_per_sec: AUDIO_TOKENS_PER_SEC }
        break

      case 'structured':
        // JSON/XML/CSV: fields × avg field length ÷ 3.5
        var fields  = config.fields || 10
        var avg_len = config.avg_field_length || 15  // chars
        var raw_chars = fields * avg_len
        // Add key names (typically 10-20 chars each in JSON)
        var key_chars = fields * (config.avg_key_length || 12)
        var total_chars = raw_chars + key_chars + (fields * 4)  // 4 chars for : , " "
        tokens = Math.round(total_chars * STRUCTURED_CHARS)
        method = fields + ' fields × ' + avg_len + ' chars avg ÷ 4'
        breakdown = { fields: fields, avg_field_length: avg_len, total_chars: total_chars }
        break

      case 'rag':
        // Retrieved chunks: chunk_size × top_k × (1 + overlap_waste)
        var chunk_size = config.chunk_size || 512    // tokens per chunk
        var top_k      = config.top_k      || 5
        var overlap    = RAG_OVERLAP_WASTE[config.overlap_strategy || 'medium']
        var raw_tokens = chunk_size * top_k
        var waste_tokens = Math.round(raw_tokens * overlap)
        tokens = raw_tokens + waste_tokens
        method = chunk_size + ' tok × ' + top_k + ' chunks + ' + (overlap*100) + '% overlap waste'
        breakdown = {
          chunk_size: chunk_size, top_k: top_k,
          raw_tokens: raw_tokens,
          overlap_waste_tokens: waste_tokens,
          overlap_pct: overlap * 100
        }
        break

      case 'system_prompt':
        // Known count or preset
        if (config.tokens) {
          tokens = config.tokens
          method = 'exact count provided'
        } else if (config.preset) {
          tokens = SYSTEM_PROMPT_PRESETS[config.preset] || SYSTEM_PROMPT_PRESETS.standard
          method = 'preset: ' + config.preset + ' (' + tokens + ' tok)'
        } else if (config.avg_words) {
          tokens = Math.round(config.avg_words * WORDS_TO_TOKENS)
          method = 'words × 1.3'
        } else {
          tokens = SYSTEM_PROMPT_PRESETS.standard
          method = 'default standard preset (500 tok)'
        }
        breakdown = { preset: config.preset || 'estimated' }
        break

      case 'chat_history':
        // Rolling window: avg turns × avg tokens per turn
        var turns     = config.avg_turns     || 4
        var tok_turn  = config.tokens_per_turn || 300  // avg user+assistant per turn
        tokens = turns * tok_turn
        method = turns + ' history turns × ' + tok_turn + ' tok/turn'
        breakdown = { avg_turns: turns, tokens_per_turn: tok_turn }
        break

      case 'document':
        // Full document: pages × words_per_page × 1.3
        if (config.pages) {
          var wpp = config.words_per_page || 400
          tokens = Math.round(config.pages * wpp * WORDS_TO_TOKENS)
          method = config.pages + ' pages × ' + wpp + ' words/page × 1.3'
          breakdown = { pages: config.pages, words_per_page: wpp }
        } else {
          tokens = estimateTokens({ type: 'text', avg_words: config.avg_words || 1000 }).tokens
          method = 'treated as text'
        }
        break

      default:
        tokens = config.tokens || 0
        method = 'direct count'
    }

    return {
      type:      type,
      tokens:    Math.max(0, tokens),
      method:    method,
      breakdown: breakdown
    }
  }

  // ─── LAYER 2: Request Budget ───────────────────────────────────────────────

  /**
   * budgetRequest(stages, trafficConfig, engineId, loadedEngineConfig)
   *
   * Compute full token budget and waste analysis for a UC or pipeline.
   *
   * stages: array of stage configs (single-element for non-pipeline UCs)
   * Each stage: {
   *   model_id, model_params_b, model_context_k,
   *   content_types: [estimateTokens configs],
   *   system_prompt: { type:'system_prompt', preset:'standard' },
   *   avg_output_tokens: 500,
   *   is_pipeline_stage: true/false
   * }
   *
   * trafficConfig: { dau, requests_per_day, peak_mult, sla_tier }
   * engineId:      'vllm' | 'trt_llm' | 'sglang' | 'llama_cpp'
   * loadedEngineConfig: row from serving_engine_configs (optional — uses default if absent)
   */
  function budgetRequest (stages, trafficConfig, engineId, loadedEngineConfig) {
    var engine = loadedEngineConfig || ENGINE_DEFAULTS[engineId || 'vllm'] || ENGINE_DEFAULTS.vllm
    var traffic = trafficConfig || {}

    var stageResults = (stages || []).map(function (stage) {
      // Estimate each content type
      var contentEstimates = (stage.content_types || []).map(function (ct) {
        return estimateTokens(ct)
      })
      var content_tokens = contentEstimates.reduce(function (sum, e) { return sum + e.tokens }, 0)

      // System prompt
      var sp = estimateTokens(stage.system_prompt || { type: 'system_prompt', preset: 'standard' })

      // Total input
      var total_input = content_tokens + sp.tokens

      // Output
      var output_tokens = stage.avg_output_tokens || 500

      // Context window check
      var total_context = total_input + output_tokens
      var context_k     = stage.model_context_k || 32
      var fits          = total_context <= context_k * 1000
      var context_util  = Math.round(total_context / (context_k * 1000) * 100)

      // ── Waste analysis ─────────────────────────────────────
      // System prompt waste: tokens beyond the minimum useful prompt (~150 tok)
      var MIN_USEFUL_SYSTEM = 150
      var system_waste = Math.max(0, sp.tokens - MIN_USEFUL_SYSTEM)
      var system_waste_pct = sp.tokens > 0
        ? Math.round(system_waste / total_input * 100) : 0

      // RAG waste: over-retrieved or high-overlap chunks
      var rag_estimates = contentEstimates.filter(function (e) { return e.type === 'rag' })
      var rag_waste = rag_estimates.reduce(function (sum, e) {
        return sum + (e.breakdown.overlap_waste_tokens || 0)
      }, 0)
      var rag_waste_pct = total_input > 0 ? Math.round(rag_waste / total_input * 100) : 0

      // Padding waste (static batching engines like TRT-LLM)
      var padding_waste_tokens = Math.round(total_input * (engine.padding_waste_pct || 0) / 100)
      var padding_waste_pct    = engine.padding_waste_pct || 0

      // Prefix cache savings (SGLang RadixAttention)
      // If content includes RAG or system prompts shared across requests
      var shared_tokens = sp.tokens + (rag_estimates.length > 0
        ? rag_estimates.reduce(function(s,e){ return s+e.tokens }, 0) * 0.7  // 70% typically shared
        : 0)
      var prefix_savings = Math.round(shared_tokens * (engine.prefix_cache_benefit || 0))

      // Effective input after prefix cache
      var effective_input = total_input - prefix_savings

      // Token Yield
      // = tokens doing useful work (output + non-wasted input) / total tokens consumed
      var useful_tokens    = output_tokens + (total_input - system_waste - rag_waste)
      var consumed_tokens  = total_input + output_tokens + padding_waste_tokens
      var token_yield_pct  = Math.round(useful_tokens / consumed_tokens * 100)

      return {
        // Per stage breakdown
        model_id:          stage.model_id,
        content_tokens:    content_tokens,
        system_tokens:     sp.tokens,
        total_input:       total_input,
        output_tokens:     output_tokens,
        total_context:     total_context,
        effective_input:   effective_input,     // after prefix cache
        context_k:         context_k,
        context_util_pct:  context_util,
        fits_in_context:   fits,

        // Content breakdown
        content_breakdown: contentEstimates,
        system_prompt_est: sp,

        // Waste analysis
        waste: {
          system_prompt_tokens:   system_waste,
          system_prompt_pct:      system_waste_pct,
          rag_overlap_tokens:     rag_waste,
          rag_overlap_pct:        rag_waste_pct,
          padding_tokens:         padding_waste_tokens,
          padding_pct:            padding_waste_pct,
          total_waste_tokens:     system_waste + rag_waste + padding_waste_tokens,
          total_waste_pct:        system_waste_pct + rag_waste_pct + padding_waste_pct
        },

        prefix_cache_savings:    prefix_savings,
        token_yield_pct:         token_yield_pct,

        // Recommendations
        recommendations: _generateRecommendations(
          system_waste_pct, rag_waste_pct, padding_waste_pct,
          context_util, fits, engineId
        )
      }
    })

    // ── Aggregate across pipeline stages ───────────────────────
    var total_input_all  = stageResults.reduce(function (s, r) { return s + r.effective_input }, 0)
    var total_output_all = stageResults.reduce(function (s, r) { return s + r.output_tokens }, 0)
    var total_context_all = Math.max.apply(null, stageResults.map(function (r) { return r.total_context }))
    var avg_yield = Math.round(
      stageResults.reduce(function (s, r) { return s + r.token_yield_pct }, 0) / stageResults.length
    )

    // ── Fleet economics inputs ─────────────────────────────────
    var dau            = traffic.dau || 1000
    var req_per_day    = traffic.requests_per_day || 5
    var peak_mult      = traffic.peak_mult || 3
    var avg_rps        = (dau * req_per_day) / 86400
    var peak_rps       = avg_rps * peak_mult
    var tokens_per_day = dau * req_per_day * (total_input_all + total_output_all)
    var tokens_per_month = tokens_per_day * 30

    // Minimum context window needed
    var min_context_k = Math.ceil(total_context_all / 1000)
    var recommended_context_k = [4, 8, 16, 32, 64, 128].find(function (k) {
      return k >= min_context_k
    }) || 128

    return {
      // Engine used
      engine_id:               engineId || 'vllm',
      engine_name:             engine.name || engineId,

      // Pipeline stages (or single stage)
      stages:                  stageResults,
      is_pipeline:             stageResults.length > 1,

      // Aggregate totals
      total_input_tokens:      total_input_all,
      total_output_tokens:     total_output_all,
      total_context_tokens:    total_context_all,
      recommended_context_k:   recommended_context_k,

      // Efficiency
      avg_token_yield_pct:     avg_yield,
      token_yield_label:       _yieldLabel(avg_yield),

      // Traffic
      avg_rps:                 Math.round(avg_rps * 1000) / 1000,
      peak_rps:                Math.round(peak_rps * 100) / 100,
      tokens_per_day:          Math.round(tokens_per_day),
      tokens_per_month:        Math.round(tokens_per_month),

      // SizingEngine inputs (ready to pass to sizeUC / sizeMaaS)
      sizing_inputs: {
        avg_input_tokens:    total_input_all,
        avg_output_tokens:   total_output_all,
        context_window:      recommended_context_k * 1000,
        engine_id:           engineId || 'vllm',
        compute_efficiency:  engine.compute_efficiency_pct,
        prefix_cache_benefit: engine.prefix_cache_benefit || 0
      }
    }
  }

  // ─── LAYER 3: Fleet Economics ──────────────────────────────────────────────

  /**
   * fleetEconomics(budget, ownCapexUSD, ownOpexPerMonthUSD, years)
   *
   * Compute monthly cost of own platform vs hyperscalers.
   * budget: output of budgetRequest()
   * ownCapexUSD: total CAPEX for the platform
   * ownOpexPerMonthUSD: monthly OPEX (power, staff, maintenance)
   * years: projection horizon (default 5)
   */
  function fleetEconomics (budget, ownCapexUSD, ownOpexPerMonthUSD, years) {
    years = years || 5
    var monthlyTokens = budget.tokens_per_month || 0
    var monthlyTokensMTok = monthlyTokens / 1e6  // convert to MTok

    if (!monthlyTokensMTok || !ownCapexUSD) {
      return { error: 'Need tokens_per_month and ownCapexUSD to compute fleet economics' }
    }

    // Own platform cost per MTok
    var capexMonthly  = ownCapexUSD / (years * 12)  // amortise over horizon
    var totalMonthly  = capexMonthly + (ownOpexPerMonthUSD || 0)
    var ownCostPerMTok = totalMonthly / monthlyTokensMTok

    return {
      monthly_tokens:       monthlyTokens,
      monthly_tokens_mtok:  Math.round(monthlyTokensMTok),
      capex_monthly_usd:    Math.round(capexMonthly),
      opex_monthly_usd:     ownOpexPerMonthUSD || 0,
      total_monthly_usd:    Math.round(totalMonthly),
      own_cost_per_mtok:    Math.round(ownCostPerMTok * 100) / 100,
      projection_years:     years
    }
  }

  // ─── LAYER 4: Competitive Tokenomics ──────────────────────────────────────

  /**
   * compareVsHyperscalers(monthlyTokensMTok, ownCostPerMTok, hyperscalerRows, years)
   *
   * monthlyTokensMTok:  monthly token volume in MTok
   * ownCostPerMTok:     own platform cost (USD/MTok, blended input+output)
   * hyperscalerRows:    array of { provider, model_name, price_input, price_output }
   *                     loaded from hyperscaler_pricing table (is_current=true)
   *                     or passed as static data
   * years:              projection horizon
   *
   * Returns crossover analysis and savings per provider
   */
  function compareVsHyperscalers (monthlyTokensMTok, ownCostPerMTok, hyperscalerRows, years, inputOutputRatio) {
    years = years || 5
    // Typical enterprise: 70% input, 30% output (input is usually larger)
    var inputRatio  = inputOutputRatio || 0.70
    var outputRatio = 1 - inputRatio

    var results = (hyperscalerRows || []).map(function (h) {
      // Blended cost = (input_price × input_ratio) + (output_price × output_ratio)
      var blendedCost = (h.price_input * inputRatio) + (h.price_output * outputRatio)

      // Monthly cost comparison
      var hyperscalerMonthly = blendedCost * monthlyTokensMTok
      var ownMonthly         = ownCostPerMTok * monthlyTokensMTok
      var monthlySaving      = hyperscalerMonthly - ownMonthly
      var annualSaving       = monthlySaving * 12
      var fiveYearSaving     = monthlySaving * 12 * years

      // Crossover: month at which cumulative savings > 0
      // (assumes ownMonthly already includes amortised CAPEX)
      var cheaper = ownMonthly < hyperscalerMonthly
      var savingPct = hyperscalerMonthly > 0
        ? Math.round((monthlySaving / hyperscalerMonthly) * 100) : 0

      // Price trajectory (simple linear decline assumption — conservative)
      // Hyperscaler prices have been dropping ~35% per year historically
      var priceDeclineRate = 0.30  // 30% per year
      var yearlyComparison = []
      for (var y = 1; y <= years; y++) {
        var hsCostThisYear = blendedCost * Math.pow(1 - priceDeclineRate, y-1)
        // Own platform cost stays flat (CAPEX amortised, OPEX stable)
        yearlyComparison.push({
          year:              y,
          hyperscaler_mtok:  Math.round(hsCostThisYear * 100) / 100,
          own_mtok:          Math.round(ownCostPerMTok * 100) / 100,
          annual_saving_usd: Math.round((hsCostThisYear - ownCostPerMTok) * monthlyTokensMTok * 12)
        })
      }

      return {
        provider:            h.provider,
        model_name:          h.model_name,
        blended_cost_per_mtok: Math.round(blendedCost * 100) / 100,
        price_input:         h.price_input,
        price_output:        h.price_output,
        monthly_cost_usd:    Math.round(hyperscalerMonthly),
        own_monthly_usd:     Math.round(ownMonthly),
        monthly_saving_usd:  Math.round(monthlySaving),
        annual_saving_usd:   Math.round(annualSaving),
        total_saving_usd:    Math.round(fiveYearSaving),
        saving_pct:          savingPct,
        own_is_cheaper:      cheaper,
        yearly_comparison:   yearlyComparison,

        // Human-readable summary
        summary: cheaper
          ? 'Own platform saves $' + _fmt(Math.round(fiveYearSaving)) + ' vs ' + h.provider + ' over ' + years + ' years (' + savingPct + '% cheaper)'
          : h.provider + ' is cheaper by $' + _fmt(Math.abs(Math.round(fiveYearSaving))) + ' over ' + years + ' years at this volume'
      }
    })

    // Sort: own-cheaper first, biggest saving first
    results.sort(function (a, b) {
      if (a.own_is_cheaper && !b.own_is_cheaper) return -1
      if (!a.own_is_cheaper && b.own_is_cheaper) return 1
      return b.total_saving_usd - a.total_saving_usd
    })

    // Volume breakeven: minimum MTok/month for own platform to win vs cheapest hyperscaler
    var cheapestHS = hyperscalerRows.reduce(function (min, h) {
      var bc = (h.price_input * inputRatio) + (h.price_output * outputRatio)
      return bc < min ? bc : min
    }, Infinity)

    var breakeven_mtok = cheapestHS <= ownCostPerMTok ? null
      : null  // Own is already cheaper at any volume if cost < hyperscaler

    return {
      monthly_tokens_mtok:   monthlyTokensMTok,
      own_cost_per_mtok:     ownCostPerMTok,
      input_output_ratio:    inputRatio + '/' + outputRatio,
      projection_years:      years,
      comparisons:           results,
      cheapest_hyperscaler:  Math.round(cheapestHS * 100) / 100,
      sovereignty_note:      'Data residency and sovereignty requirements may make on-prem the only option regardless of cost comparison.',
      methodology_note:      'Token yield estimated from request design. Hyperscaler price trajectory assumes 30% annual decline (historical average 2023-2026). Own platform cost assumes flat OPEX.'
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  function _yieldLabel (pct) {
    if (pct >= 70) return 'Excellent (' + pct + '%) — well-optimised'
    if (pct >= 55) return 'Good (' + pct + '%) — minor optimisation potential'
    if (pct >= 40) return 'Fair (' + pct + '%) — review system prompt and RAG config'
    return 'Poor (' + pct + '%) — significant token waste, review prompt design'
  }

  function _generateRecommendations (sysWastePct, ragWastePct, paddingPct, ctxUtil, fits, engineId) {
    var recs = []
    if (!fits)           recs.push({ severity:'critical', message:'Context window exceeded — reduce input length, chunk size, or top_k, or choose a model with larger context window' })
    if (ctxUtil > 85)    recs.push({ severity:'warning',  message:'Context utilisation ' + ctxUtil + '% — limited headroom. Consider increasing context window or reducing input.' })
    if (sysWastePct > 30) recs.push({ severity:'warning', message:'System prompt is ' + sysWastePct + '% of input tokens — consider compressing or externalising static instructions' })
    if (ragWastePct > 20) recs.push({ severity:'info',    message:'RAG overlap waste ' + ragWastePct + '% — reduce chunk overlap or use semantic deduplication. Consider SGLang for prefix caching.' })
    if (paddingPct > 10)  recs.push({ severity:'info',    message:'Static batching padding waste ' + paddingPct + '% — consider vLLM continuous batching for variable-length workloads' })
    if (ragWastePct > 10 && engineId !== 'sglang')
      recs.push({ severity:'info', message:'RAG workload detected — SGLang RadixAttention could reduce effective token cost by ~25% via prefix caching' })
    return recs
  }

  function _fmt (n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  root.TokenEcon = {
    // Layer 1
    estimateTokens:          estimateTokens,

    // Layer 2
    budgetRequest:           budgetRequest,

    // Layer 3
    fleetEconomics:          fleetEconomics,

    // Layer 4
    compareVsHyperscalers:   compareVsHyperscalers,

    // Reference data (for UI dropdowns)
    SYSTEM_PROMPT_PRESETS:   SYSTEM_PROMPT_PRESETS,
    RAG_OVERLAP_WASTE:       RAG_OVERLAP_WASTE,
    ENGINE_DEFAULTS:         ENGINE_DEFAULTS,
    HYPERSCALER_HISTORY:     HYPERSCALER_HISTORY,

    // Content type catalogue (for UI pickers)
    CONTENT_TYPES: [
      { id:'text',          label:'Text / Prose',           fields:['avg_words'] },
      { id:'code',          label:'Code',                   fields:['characters','lines'] },
      { id:'image',         label:'Image (VLM)',            fields:['width','height','patch_size','tiles'] },
      { id:'audio',         label:'Audio / Speech',         fields:['duration_seconds'] },
      { id:'document',      label:'Document / PDF',         fields:['pages','words_per_page'] },
      { id:'structured',    label:'Structured Data (JSON)', fields:['fields','avg_field_length'] },
      { id:'rag',           label:'RAG Context',            fields:['chunk_size','top_k','overlap_strategy'] },
      { id:'system_prompt', label:'System Prompt',          fields:['preset','tokens'] },
      { id:'chat_history',  label:'Chat History',           fields:['avg_turns','tokens_per_turn'] }
    ]
  }

})(typeof window !== 'undefined' ? window : global)
