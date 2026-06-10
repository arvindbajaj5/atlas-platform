// ── ATLAS Usage Logger ────────────────────────────────────────────────────────
// Shared function — include in any tool that makes AI API calls
// Fire-and-forget: non-blocking, never throws, never slows the UI

var PRICING_CACHE = {}   // loaded from app_config on first call

async function loadPricingConfig() {
  if (Object.keys(PRICING_CACHE).length > 0) return  // already loaded
  try {
    var g = atlasGetGlobal()
    var sbUrl = g.sbUrl || g.sb_url || ''
    var sbKey = g.sbKey || g.sb_key || ''
    if (!sbUrl || !sbKey) return
    var r = await fetch(sbUrl + '/rest/v1/app_config?key=like.price_%&limit=50', {
      headers: { apikey: sbKey, Authorization: 'Bearer ' + sbKey }
    })
    if (!r.ok) return
    var rows = await r.json()
    rows.forEach(function(row) { PRICING_CACHE[row.key] = parseFloat(row.value) || 0 })
  } catch(e) {}
}

function calcCost(model, inputTokens, outputTokens) {
  // Normalise model name to price key prefix
  var keyMap = {
    'gemini-2.0-flash':          'gemini_2_0_flash',
    'gemini-2.0-flash-exp':      'gemini_2_0_flash',
    'gemini-3.1-flash-lite':     'gemini_3_1_flash_lite',
    'gemini-3.1-flash-lite-001': 'gemini_3_1_flash_lite',
    'gemini-3.5-flash':          'gemini_3_5_flash',
    'gemini-3.5-flash-preview':  'gemini_3_5_flash',
    'claude-haiku-4-5':          'claude_haiku_4_5',
    'claude-haiku-4-5-20251001': 'claude_haiku_4_5',
    'claude-sonnet-4-6':         'claude_sonnet_4_6',
    'mistral-small':             'mistral_small',
    'sarvam-m':                  'sarvam_m',
    'sarvam-2b':                 'sarvam_m',
  }
  var prefix = keyMap[model] || keyMap[model.toLowerCase()]
  if (!prefix) return 0
  var inRate  = PRICING_CACHE['price_' + prefix + '_input']  || 0
  var outRate = PRICING_CACHE['price_' + prefix + '_output'] || 0
  return (inputTokens * inRate + outputTokens * outRate) / 1e6
}

function getProvider(model) {
  if (!model) return 'unknown'
  var m = model.toLowerCase()
  if (m.startsWith('gemini')) return 'google'
  if (m.startsWith('claude')) return 'anthropic'
  if (m.startsWith('mistral')) return 'mistral'
  if (m.startsWith('sarvam') || m.startsWith('maya')) return 'sarvam'
  if (m.startsWith('gpt') || m.startsWith('o1') || m.startsWith('o3')) return 'openai'
  return 'unknown'
}

// Generate a session ID for the current page load
var ATLAS_SESSION_ID = 'sess-' + Date.now() + '-' + Math.floor(Math.random()*9999)

async function atlasLogUsage(params) {
  // params: { tool, call_type, model, input_tokens, output_tokens, latency_ms, status, engagement_id, topic_code, notes }
  try {
    await loadPricingConfig()
    var g = atlasGetGlobal()
    var sbUrl = g.sbUrl || g.sb_url || ''
    var sbKey = g.sbKey || g.sb_key || ''
    if (!sbUrl || !sbKey) return  // silent fail if no Supabase config

    var inputTok  = params.input_tokens  || 0
    var outputTok = params.output_tokens || 0
    var model     = params.model || 'unknown'

    var payload = {
      tool:          params.tool || 'unknown',
      call_type:     params.call_type || 'unknown',
      provider:      getProvider(model),
      model:         model,
      input_tokens:  inputTok,
      output_tokens: outputTok,
      cost_usd:      calcCost(model, inputTok, outputTok),
      latency_ms:    params.latency_ms || 0,
      status:        params.status || 'success',
      engagement_id: params.engagement_id || null,
      topic_code:    params.topic_code || null,
      session_id:    ATLAS_SESSION_ID,
      notes:         params.notes || null
    }

    // Fire and forget — don't await, don't block
    fetch(sbUrl + '/rest/v1/api_usage_log', {
      method: 'POST',
      headers: { apikey: sbKey, Authorization: 'Bearer ' + sbKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(payload)
    }).catch(function() {})  // swallow errors silently
  } catch(e) {}  // never throw
}

// ── Wrapper for Gemini API calls ──────────────────────────────────────────────
// Wraps a Gemini fetch call and auto-logs usage
async function callGeminiTracked(prompt, model, tool, callType, extraParams) {
  var t0 = Date.now()
  var status = 'success'
  var inputTok = 0, outputTok = 0
  var result = null

  try {
    var apiKey = atlasGetGlobal().geminiKey || atlasGetGlobal().gemini_key || ''
    var body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: Object.assign({ maxOutputTokens: 2048, temperature: 0.2 }, extraParams || {})
    }
    var r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    var data = await r.json()
    if (data.usageMetadata) {
      inputTok  = data.usageMetadata.promptTokenCount     || 0
      outputTok = data.usageMetadata.candidatesTokenCount || 0
    }
    result = data.candidates && data.candidates[0] && data.candidates[0].content &&
             data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
             data.candidates[0].content.parts[0].text || ''
    if (!r.ok) status = 'error'
  } catch(e) { status = 'error' }

  // Log usage (fire and forget)
  atlasLogUsage({
    tool:          tool,
    call_type:     callType,
    model:         model,
    input_tokens:  inputTok,
    output_tokens: outputTok,
    latency_ms:    Date.now() - t0,
    status:        status
  })

  return result
}
