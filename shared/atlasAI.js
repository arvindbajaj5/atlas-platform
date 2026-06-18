/**
 * atlasAI.js  —  ATLAS Shared AI Utility Module  v1.1
 * =====================================================
 * Single source for all Gemini calls, JSON parsing and repair across ATLAS tools.
 * Zero hardcoding: all parameters driven from Supabase app_config table.
 *
 * Usage:
 *   <script src="https://arvindbajaj5.github.io/atlas-platform/shared/atlasAI.js"></script>
 *   await atlasAI.init(sbUrl, sbKey)   // once on startup
 *   var result = await atlasAI.call(prompt, { maxTokens: 4096, tool: 'myTool' })
 *   var parsed = atlasAI.parseJSON(result.text)
 *
 * Public API (window.atlasAI):
 *   .init(sbUrl, sbKey)                 load config from Supabase
 *   .call(prompt, opts)                 Gemini text call with model fallback
 *   .search(prompt, opts)               Gemini call with google_search grounding
 *   .parseJSON(text)                    4-strategy JSON extraction
 *   .repair(str)                        JSON string repair
 *   .callAndParse(prompt, opts)         call() + parseJSON() in one step
 *   .searchAndParse(prompt, opts)       search() + parseJSON() in one step
 *   .sectionMaxTokens(sectionName)      recommended maxTokens per section type
 *   .buildModelList(primary, fallbacks) build custom model chain
 *   .getGeminiKey()                     read Gemini key from localStorage
 *   .config                             current config snapshot (read-only)
 *   .ready                              true after init() completes
 *
 * Supabase app_config keys (prefix: atlasai_):
 *   atlasai_primary_model       gemini-2.5-flash
 *   atlasai_fallback_models     ["gemini-2.0-flash-lite","gemini-1.5-flash"]
 *   atlasai_search_models       ["gemini-2.0-flash","gemini-1.5-flash-latest"]
 *   atlasai_default_max_tokens  2000
 *   atlasai_temperature         0.1
 *   atlasai_retry_on_400        true
 *   atlasai_timeout_ms          30000
 *   atlasai_log_prefix          [atlasAI]
 */

;(function (global) {
  'use strict'

  // ── Default config (used when Supabase is unreachable) ──────────────────────
  var DEFAULTS = {
    primary_model:      'gemini-2.5-flash',
    fallback_models:    ['gemini-2.0-flash-lite', 'gemini-1.5-flash'],
    search_models:      ['gemini-2.0-flash', 'gemini-1.5-flash-latest'],
    default_max_tokens: 2000,
    temperature:        0.1,
    retry_on_400:       true,
    timeout_ms:         30000,
    log_prefix:         '[atlasAI]'
  }

  // ── Internal state ───────────────────────────────────────────────────────────
  var _cfg   = Object.assign({}, DEFAULTS)
  var _sbUrl = ''
  var _sbKey = ''
  var _ready = false

  // ── Logging ──────────────────────────────────────────────────────────────────
  function _log() {
    var args = [_cfg.log_prefix].concat(Array.prototype.slice.call(arguments))
    console.log.apply(console, args)
  }
  function _warn() {
    var args = [_cfg.log_prefix].concat(Array.prototype.slice.call(arguments))
    console.warn.apply(console, args)
  }

  // ── Config helpers ───────────────────────────────────────────────────────────
  function _cfgVal(rows, key, fallback) {
    var row = rows.filter(function (r) { return r.key === key })[0]
    if (!row) return fallback
    try { return JSON.parse(row.value) } catch (e) { return row.value }
  }

  // ── Gemini key ───────────────────────────────────────────────────────────────
  function _getGeminiKey() {
    try {
      var g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}')
      return g.geminiKey || g['key_gemini'] || g.gemini_key || ''
    } catch (e) { return '' }
  }

  // ── Model lists ──────────────────────────────────────────────────────────────
  function _textModels() {
    return [_cfg.primary_model].concat(
      _cfg.fallback_models.filter(function (m) { return m !== _cfg.primary_model })
    )
  }
  function _searchModels() { return _cfg.search_models.slice() }

  // ── init ─────────────────────────────────────────────────────────────────────
  async function _init(sbUrl, sbKey) {
    _sbUrl = sbUrl || ''
    _sbKey = sbKey || ''

    // Check localStorage for model override set via Settings UI
    try {
      var g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}')
      if (g.geminiTextModel) _cfg.primary_model = g.geminiTextModel
    } catch (e) {}

    if (!_sbUrl || !_sbKey) {
      _warn('No Supabase config — using defaults')
      _ready = true
      return Object.assign({}, _cfg)
    }

    try {
      var ctrl = new AbortController()
      var tid  = setTimeout(function () { ctrl.abort() }, 8000)
      var r = await fetch(
        _sbUrl + '/rest/v1/app_config?key=like.atlasai_%25&limit=50',
        { headers: { apikey: _sbKey, Authorization: 'Bearer ' + _sbKey }, signal: ctrl.signal }
      )
      clearTimeout(tid)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      var rows = await r.json()
      _cfg.primary_model      = _cfgVal(rows, 'atlasai_primary_model',      _cfg.primary_model)
      _cfg.fallback_models    = _cfgVal(rows, 'atlasai_fallback_models',    _cfg.fallback_models)
      _cfg.search_models      = _cfgVal(rows, 'atlasai_search_models',      _cfg.search_models)
      _cfg.default_max_tokens = _cfgVal(rows, 'atlasai_default_max_tokens', _cfg.default_max_tokens)
      _cfg.temperature        = _cfgVal(rows, 'atlasai_temperature',        _cfg.temperature)
      _cfg.retry_on_400       = _cfgVal(rows, 'atlasai_retry_on_400',       _cfg.retry_on_400)
      _cfg.timeout_ms         = _cfgVal(rows, 'atlasai_timeout_ms',         _cfg.timeout_ms)
      _cfg.log_prefix         = _cfgVal(rows, 'atlasai_log_prefix',         _cfg.log_prefix)
      _log('Config loaded from Supabase:', JSON.stringify({
        model:   _cfg.primary_model,
        maxTok:  _cfg.default_max_tokens,
        timeout: _cfg.timeout_ms
      }))
    } catch (e) {
      _warn('Config load failed (' + e.message + ') — using defaults')
    }

    _ready = true
    return Object.assign({}, _cfg)
  }

  // ── Core Gemini fetch (shared by call and search) ────────────────────────────
  async function _fetch(models, body, timeout) {
    var key = _getGeminiKey()
    if (!key) return { ok: false, error: 'No Gemini API key in Settings' }

    for (var i = 0; i < models.length; i++) {
      var model = models[i]
      try {
        var ctrl = new AbortController()
        var tid  = setTimeout(function () { ctrl.abort() }, timeout)
        var r = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' +
          model + ':generateContent?key=' + key,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body), signal: ctrl.signal }
        )
        clearTimeout(tid)

        if (r.ok) {
          var data  = await r.json()
          var text  = ''
          var parts = data.candidates &&
                      data.candidates[0] &&
                      data.candidates[0].content &&
                      data.candidates[0].content.parts
          // Skip thinking parts (gemini-2.5-flash outputs p.thought === true)
          if (parts) parts.forEach(function (p) {
            if (p.text && p.thought !== true) text += p.text
          })
          var tokens = (data.usageMetadata && data.usageMetadata.totalTokenCount) || 0
          var truncated = !!(data.candidates &&
                             data.candidates[0] &&
                             data.candidates[0].finishReason === 'MAX_TOKENS')
          if (truncated) _warn('Response truncated (MAX_TOKENS) model=' + model +
                               ' tokens=' + tokens + '. Increase maxTokens.')
          // Capture grounding sources (present only for google_search calls)
          var sources = []
          var gm = data.candidates &&
                   data.candidates[0] &&
                   data.candidates[0].groundingMetadata
          if (gm) {
            var chunks = gm.groundingChunks || []
            chunks.forEach(function (c) {
              if (c.web && c.web.uri) {
                sources.push({
                  uri:    c.web.uri,
                  title:  c.web.title || c.web.uri,
                  domain: c.web.uri.replace(/^https?:\/\/(?:www\.)?/, '').split('/')[0]
                })
              }
            })
            var seen = {}
            sources = sources.filter(function (src) {
              if (seen[src.domain]) return false
              seen[src.domain] = true
              return true
            })
          }
          if (sources.length) _log('grounding sources=' + sources.length + ' model=' + model)
          return { ok: true, text: text, tokens: tokens, model: model, truncated: truncated, sources: sources }
        }

        _log('skip model=' + model + ' status=' + r.status)
        // Rate limit or server error — abort, don't try next model
        if (r.status === 429 || r.status >= 500) {
          var ed = await r.json().catch(function () { return {} })
          return { ok: false, error: 'API ' + r.status + ': ' + (ed.error ? ed.error.message : r.statusText) }
        }
        // 400 (bad request) or 404 (model not found) — try next model if retry_on_400 set
        if (r.status !== 400 && r.status !== 404) {
          var ed2 = await r.json().catch(function () { return {} })
          return { ok: false, error: 'API ' + r.status + ': ' + (ed2.error ? ed2.error.message : r.statusText) }
        }
        // else continue to next model

      } catch (e) {
        if (e.name === 'AbortError') return { ok: false, error: 'Timed out after ' + Math.round(timeout / 1000) + 's' }
        return { ok: false, error: e.message }
      }
    }
    return { ok: false, error: 'All Gemini models unavailable' }
  }

  // ── Text call ────────────────────────────────────────────────────────────────
  async function _call(prompt, opts) {
    opts = opts || {}
    var models = opts.models || _textModels()
    var maxTok = opts.maxTokens  || _cfg.default_max_tokens
    var temp   = opts.temperature !== undefined ? opts.temperature : _cfg.temperature
    var body   = {
      contents:         [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: temp, maxOutputTokens: maxTok }
    }
    var result = await _fetch(models, body, _cfg.timeout_ms)
    if (result.ok) _log('call OK model=' + result.model + ' tokens=' + result.tokens +
      (opts.tool ? ' tool=' + opts.tool : '') + (opts.callType ? ' type=' + opts.callType : ''))
    return result
  }

  // ── Search call ──────────────────────────────────────────────────────────────
  async function _search(prompt, opts) {
    opts = opts || {}
    var models = opts.models || _searchModels()
    var maxTok = opts.maxTokens  || 4096
    var temp   = opts.temperature !== undefined ? opts.temperature : _cfg.temperature
    var body   = {
      contents:         [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: temp, maxOutputTokens: maxTok },
      tools:            [{ google_search: {} }]
    }
    var result = await _fetch(models, body, _cfg.timeout_ms)
    if (result.ok) _log('search OK model=' + result.model + ' tokens=' + result.tokens)
    return result
  }

  // ── JSON repair ───────────────────────────────────────────────────────────────
  function _repair(str) {
    if (typeof str !== 'string') return str
    return str
      .replace(/^```json\s*/,  '').replace(/^```\s*/, '').replace(/```\s*$/, '')
      .replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      // Fix boolean enum placeholders
      .replace(/": true\|false/g,   '": false')
      .replace(/": "true\|false"/g, '": false')
      .replace(/": boolean/g,       '": false')
      // Fix Indian number formatting: 10,281 or 1,00,000 → remove commas in numbers
      .replace(/(\d),(\d{2,3})(?=,|\s|"|\})/g, function (m, a, b) { return a + b })
      .replace(/(\d),(\d{2,3})(?=,|\s|"|\})/g, function (m, a, b) { return a + b })
      // Fix unquoted string values: ":value," or ": value," (optional space after colon)
      .replace(/": ?([a-zA-Z][a-zA-Z_-]*)([,\s\}])/g, function (m, w, t) {
        if (w === 'true' || w === 'false' || w === 'null') return '": ' + w + t
        return '": "' + w + '"' + t
      })
      // Fix missing comma between adjacent } and next key
      .replace(/\}\s*"/g, '}, "')
      // Fix missing comma between value and next key (2+ spaces)
      .replace(/([\d"tfn])\s{2,}"/g, function (m, c) { return c + ', "' })
      // Remove trailing commas before } or ]
      .replace(/,(\s*[}\]])/g, '$1')
  }

  // ── JSON parsing: 4 strategies ───────────────────────────────────────────────
  //
  // Strategy order:
  //   1. direct       — trimmed text starts with { and parses directly
  //   2. all_blocks   — find ALL top-level {} blocks, try each LAST-TO-FIRST
  //                     (handles thinking models that prepend schema examples)
  //                     For each block: try direct parse, then repaired parse
  //   3. fence_strip  — strip ``` fences, retry strategies 1+2
  //   4. full_repair  — repair the entire text then try brace-count extraction
  //
  function _parseJSON(text) {
    if (!text || typeof text !== 'string') {
      return { ok: false, error: 'Empty or non-string input' }
    }

    var trimmed = text.trim()

    // ── Strategy 1: direct parse ─────────────────────────────────────────────
    if (trimmed.charAt(0) === '{') {
      try {
        return { ok: true, data: JSON.parse(trimmed), strategy: 'direct' }
      } catch (e) {}
    }

    // ── Strategy 2: all blocks, last-to-first ────────────────────────────────
    // WHY last-to-first: thinking models output reasoning/schema examples BEFORE
    // the actual JSON response. The last complete block is the real data.
    // Also handles trailing explanation text after the JSON.
    var blocks = _findAllBlocks(text)
    var s2 = _tryBlocks(blocks)
    if (s2.ok) return { ok: true, data: s2.data, strategy: s2.strategy }

    // ── Strategy 3: strip markdown fences and retry strategies 1+2 ───────────
    var stripped = text
      .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim()

    if (stripped !== trimmed) {
      if (stripped.charAt(0) === '{') {
        try { return { ok: true, data: JSON.parse(stripped), strategy: 'fence_direct' } }
        catch (e) {}
      }
      var blocks2 = _findAllBlocks(stripped)
      var s3 = _tryBlocks(blocks2)
      if (s3.ok) return { ok: true, data: s3.data, strategy: 'fence_' + s3.strategy }
    }

    // ── Strategy 4: repair full text then extract ────────────────────────────
    var repaired = _repair(text)
    if (repaired !== text) {
      if (repaired.trim().charAt(0) === '{') {
        try { return { ok: true, data: JSON.parse(repaired.trim()), strategy: 'full_repair' } }
        catch (e) {}
      }
      var blocks3 = _findAllBlocks(repaired)
      var s4 = _tryBlocks(blocks3)
      if (s4.ok) return { ok: true, data: s4.data, strategy: 'repair_' + s4.strategy }
    }

    _warn('parseJSON failed on:', text.substring(0, 150))
    return { ok: false, error: 'No valid JSON found | got: ' + text.substring(0, 120) }
  }

  // Try a list of JSON blocks last-to-first; return first successful parse
  function _tryBlocks(blocks) {
    for (var i = blocks.length - 1; i >= 0; i--) {
      var block = blocks[i]
      // Direct parse
      try {
        var obj = JSON.parse(block)
        if (obj && typeof obj === 'object') return { ok: true, data: obj, strategy: 'block_direct' }
      } catch (e) {}
      // Repaired parse
      try {
        var obj2 = JSON.parse(_repair(block))
        if (obj2 && typeof obj2 === 'object') return { ok: true, data: obj2, strategy: 'block_repaired' }
      } catch (e) {}
    }
    // Truncation detection: if only one block and it has no closing brace at depth 0
    if (blocks.length === 0) {
      var start = arguments[0] ? arguments[0][0] : ''
      _warn('JSON truncated — no complete block found. Increase maxOutputTokens.')
    }
    return { ok: false }
  }

  // Find all top-level {...} blocks in text using brace counting
  function _findAllBlocks(text) {
    var blocks = [], depth = 0, start = -1
    for (var i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (depth === 0) start = i
        depth++
      } else if (text[i] === '}') {
        depth--
        if (depth === 0 && start >= 0) {
          blocks.push(text.substring(start, i + 1))
          start = -1
        }
      }
    }
    if (depth > 0) _warn('JSON truncated — no closing brace found. Increase maxOutputTokens.')
    return blocks
  }

  // ── Convenience combinators ───────────────────────────────────────────────────
  async function _callAndParse(prompt, opts) {
    var result = await _call(prompt, opts)
    if (!result.ok) return result
    var parsed = _parseJSON(result.text)
    if (!parsed.ok) {
      return { ok: false, error: parsed.error,
               tokens: result.tokens, model: result.model, raw: result.text.substring(0, 200) }
    }
    return { ok: true, data: parsed.data, strategy: parsed.strategy,
             tokens: result.tokens, model: result.model, truncated: result.truncated }
  }

  async function _searchAndParse(prompt, opts) {
    var result = await _search(prompt, opts)
    if (!result.ok) return result
    var parsed = _parseJSON(result.text)
    if (!parsed.ok) {
      return { ok: false, error: parsed.error,
               tokens: result.tokens, model: result.model, raw: result.text.substring(0, 200) }
    }
    return { ok: true, data: parsed.data, strategy: parsed.strategy,
             tokens: result.tokens, model: result.model }
  }

  // ── Recommended token limits per section type ────────────────────────────────
  // Tools should call this instead of hardcoding limits
  function _sectionMaxTokens(sectionName) {
    var map = {
      opportunities: 4096, geography: 3000, programmes: 3000,
      policy:        3000,  energy:    3000, land:       2000,
      workers:       2000,  digital:   2000, water:      1500,
      macroeconomics:1500,  s2:        8192, s4:         8192, s5: 8192
    }
    return map[sectionName] || _cfg.default_max_tokens
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  global.atlasAI = {
    get config()    { return Object.assign({}, _cfg) },
    get ready()     { return _ready },
    getGeminiKey:   _getGeminiKey,
    init:           _init,
    call:           _call,
    search:         _search,
    parseJSON:      _parseJSON,
    repair:         _repair,
    callAndParse:   _callAndParse,
    searchAndParse: _searchAndParse,
    sectionMaxTokens: _sectionMaxTokens,
    buildModelList: function (primary, fallbacks) {
      primary   = primary   || _cfg.primary_model
      fallbacks = fallbacks || _cfg.fallback_models
      return [primary].concat(
        (Array.isArray(fallbacks) ? fallbacks : []).filter(function (m) { return m !== primary })
      )
    }
  }

}(typeof window !== 'undefined' ? window : global))
