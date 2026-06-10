// ATLAS Intelligence Scraper v2.1 -- GitHub Actions Script
// REAL WEB SEARCH ONLY -- Hybrid: RSS Feeds + Gemini Search Grounding
// Multi-geography, Sarvam for Indic languages, full traceability
// Version: 2.1 | 2026-05-30

import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js'

//    Config                                                                     
const GEMINI_KEY    = process.env.GEMINI_API_KEY
const SB_URL        = process.env.SUPABASE_URL
const SB_KEY        = process.env.SUPABASE_KEY
const SARVAM_KEY    = process.env.SARVAM_API_KEY || ''
const DOMAINS_OVERRIDE = process.env.DOMAINS_OVERRIDE || ''
const ITEMS_PER_DOMAIN = parseInt(process.env.ITEMS_PER_DOMAIN || '2')
const RUN_RSS       = process.env.RUN_RSS === 'true'  // off by default - govt sites block cloud IPs
const RUN_SEARCH    = process.env.RUN_SEARCH !== 'false'
const GEOGRAPHIES   = (process.env.GEOGRAPHIES || 'India').split(',').map(s => s.trim())
const GLOBAL_DOMAINS = ['TEC-GEN','MKT-HPC','MKT-COM','MKT-SOV','MKT-DEF','MKT-TND']

// Extra global-only topics for international UC and tech intelligence
const GLOBAL_TOPICS = [
  { code:'TEC-GLB', name:'Global AI Infrastructure News',
    focus:'GPU cluster HPC AI data centre supercomputer large language model deployment cloud AI 2025 2026' },
  { code:'OEM-GLB', name:'AI HPC OEM and Market News',
    focus:'NVIDIA AMD HPE Dell Supermicro Intel AI server HPC GPU contract announcement partnership 2025 2026' },
  { code:'POL-GLB', name:'Global AI Policy and Regulation',
    focus:'AI regulation policy national AI strategy government AI governance EU US China 2025 2026' },
]
const GROUNDING_MODEL = 'gemini-2.0-flash'   // 2.0-flash cheaper, supports grounding
const EXTRACT_MODEL   = 'gemini-3.1-flash-lite' // cheap for RSS extraction
const DELAY_MS      = 1000

var RUN_ID = Date.now().toString(36)

var PRICING_TABLE = {
  'gemini-2.0-flash':          { input: 0.10,  output: 0.40  },
  'gemini-3.1-flash-lite':     { input: 0.075, output: 0.30  },
  'gemini-3.1-flash-lite-001': { input: 0.075, output: 0.30  },
  'gemini-3.5-flash':          { input: 0.15,  output: 0.60  },
}

var USAGE_BUFFER = []

function calcCostUSD(model, inputTok, outputTok) {
  var p = PRICING_TABLE[model] || { input: 0.10, output: 0.40 }
  return (inputTok * p.input + outputTok * p.output) / 1e6
}

function bufferUsage(tool, callType, model, inputTok, outputTok, latencyMs, status, topicCode) {
  USAGE_BUFFER.push({
    tool:          tool,
    call_type:     callType,
    provider:      'google',
    model:         model || GROUNDING_MODEL,
    input_tokens:  inputTok  || 0,
    output_tokens: outputTok || 0,
    cost_usd:      calcCostUSD(model || GROUNDING_MODEL, inputTok||0, outputTok||0),
    latency_ms:    latencyMs || 0,
    status:        status || 'success',
    topic_code:    topicCode || null,
    session_id:    'gh-' + RUN_ID
  })
}

async function flushUsageLog() {
  if (!USAGE_BUFFER.length) return
  var sb = getSB()
  if (!sb.url || !sb.key) { console.log('  Usage log skipped (no SB config)'); return }
  try {
    var r = await fetch(sb.url + '/rest/v1/api_usage_log', {
      method: 'POST',
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(USAGE_BUFFER)
    })
    var totalCost = USAGE_BUFFER.reduce(function(s, row) { return s + row.cost_usd }, 0)
    var totalTok  = USAGE_BUFFER.reduce(function(s, row) { return s + row.input_tokens + row.output_tokens }, 0)
    console.log('  Usage logged: ' + USAGE_BUFFER.length + ' calls | ' + totalTok + ' tokens | $' + totalCost.toFixed(5))
    USAGE_BUFFER = []
  } catch(e) { console.log('  WARN: usage log failed:', e.message) }
}


//    TTL constants                                                              
const TTL_DOMAIN_DAYS   = 7
const TTL_NEWS_DAYS     = 7
const TTL_GLOBAL_DAYS   = 7
const TTL_EXTEND_DAYS   = 14   // extended TTL when last run added 0 items
const TTL_EXTEND_EMPTY  = 21   // further extended if 2+ consecutive empty runs

//    Content fingerprint (no API call needed)                                   
function contentFingerprint(title, summary) {
  var combined = (title + ' ' + (summary||'')).toLowerCase()
    .replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 30).join(' ')
  var h = 0
  for (var i = 0; i < combined.length; i++) {
    h = ((h << 5) - h) + combined.charCodeAt(i)
    h = h & h
  }
  return Math.abs(h).toString(36)
}

//    Scrape run TTL helpers                                                     
async function getRunRecord(runType, topicCode, geography) {
  var id = runType + '-' + topicCode + '-' + (geography||'India')
  var rows = await sbFetch('scrape_runs', 'id=eq.' + encodeURIComponent(id), 1)
  return rows && rows[0] ? rows[0] : null
}

async function isDue(runType, topicCode, geography) {
  var rec = await getRunRecord(runType, topicCode, geography)
  if (!rec || !rec.last_run_at) return { due: true, publishedAfter: null }
  var daysSince = (Date.now() - new Date(rec.last_run_at).getTime()) / 86400000
  var ttl = rec.ttl_days || (runType === 'domain' ? TTL_CFG.domain : runType === 'news' ? TTL_CFG.news : runType === 'rss' ? TTL_CFG.rss : TTL_CFG.global)
  if (daysSince < ttl) {
    console.log('    SKIP ' + topicCode + ' (scraped ' + daysSince.toFixed(1) + 'd ago, TTL ' + ttl + 'd)')
    return { due: false, publishedAfter: null }
  }
  // Due   return publishedAfter date from last run
  var publishedAfter = rec.published_after_date || rec.last_run_at
  return { due: true, publishedAfter: publishedAfter }
}

async function updateRunRecord(runType, topicCode, geography, itemsAdded) {
  var id = runType + '-' + topicCode + '-' + (geography||'India')
  var existing = await getRunRecord(runType, topicCode, geography)
  var baseTTL = runType === 'domain' ? TTL_CFG.domain : runType === 'news' ? TTL_CFG.news : runType === 'rss' ? TTL_CFG.rss : TTL_CFG.global
  // Extend TTL if empty run
  var newTTL = baseTTL
  if (itemsAdded === 0) {
    newTTL = (existing && existing.items_added === 0) ? TTL_CFG.extend_empty2 : TTL_CFG.extend_empty
    console.log('    Empty run   extending TTL to ' + newTTL + 'd for ' + topicCode)
  }
  var payload = {
    id:                   id,
    run_type:             runType,
    topic_code:           topicCode,
    geography:            geography || 'India',
    last_run_at:          new Date().toISOString(),
    items_added:          itemsAdded,
    runs_total:           ((existing && existing.runs_total) || 0) + 1,
    ttl_days:             newTTL,
    published_after_date: new Date().toISOString().slice(0,10)
  }
  try {
    var sb = getSB()
    await fetch(sb.url + '/rest/v1/scrape_runs', {
      method: 'POST',
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload)
    })
  } catch(e) { console.log('    WARN: could not update scrape_runs:', e.message) }
}

//    Content hash dedup                                                         
var KNOWN_HASHES = new Set()   // loaded once at start of run

async function loadKnownHashes() {
  // Load recent content hashes from Supabase to prevent syndication re-ingestion
  try {
    var sb = getSB()
    var r = await fetch(sb.url + '/rest/v1/intelligence_items?select=content_hash&content_hash=not.is.null&order=scraped_at.desc&limit=2000', {
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key }
    })
    if (r.ok) {
      var rows = await r.json()
      rows.forEach(function(row) { if (row.content_hash) KNOWN_HASHES.add(row.content_hash) })
      console.log('  Loaded ' + KNOWN_HASHES.size + ' known content hashes (syndication dedup)')
    }
  } catch(e) { console.log('  WARN: could not load content hashes:', e.message) }
}

function isKnownContent(title, summary) {
  var hash = contentFingerprint(title, summary)
  if (KNOWN_HASHES.has(hash)) return true
  KNOWN_HASHES.add(hash)   // add to in-memory set for within-run dedup too
  return false
}


if (!GEMINI_KEY || !SB_URL || !SB_KEY) { console.error('Missing GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY'); process.exit(1) }

console.log(`=== ATLAS Intelligence Scraper v2.1 ===`)
console.log(`Grounding: ${GROUNDING_MODEL} | Extract: ${EXTRACT_MODEL}`)
console.log(`Geographies: ${GEOGRAPHIES.join(', ')} | RSS: ${RUN_RSS} | Search: ${RUN_SEARCH}`)
console.log(`Sarvam (Indic): ${SARVAM_KEY ? 'enabled' : 'disabled'}`)

//    Domain taxonomy                                                            
const DOMAINS = [
  { code:'GOV-GOV', name:'Government -- Digital & AI',         focus:'Indian central/state government AI, data centre, digital transformation, e-governance, smart city procurement 2025 2026' },
  { code:'DEF-MIL', name:'Defence -- Armed Forces',            focus:'Indian Army, Navy, Air Force, DPSUs, DRDO combat AI, autonomous weapons, military AI India 2025 2026' },
  { code:'DEF-SPC', name:'Defence -- Space & Satellite',       focus:'ISRO, IN-SPACe, Defence Space Agency, military satellite, launch vehicles India 2025 2026' },
  { code:'GEO-SPA', name:'Geospatial & Earth Observation',     focus:'Satellite imagery AI, EO processing, geospatial analytics, ISRO, Survey of India, GIS India 2025 2026' },
  { code:'INF-CIV', name:'Infrastructure -- Civilian AI',      focus:'Smart city, urban AI, transport AI, logistics AI, public infrastructure digital India 2025 2026' },
  { code:'TEC-GEN', name:'Technology -- General AI',           focus:'AI deployment, GPU, HPC, data centre, LLM, sovereign AI India enterprise government 2025 2026' },
  { code:'REG-AIP', name:'Regulation -- AI Policy',            focus:'AI regulation, data localisation, DPDP, AI governance, MeitY policy India 2025 2026' },
  { code:'HLT-LIF', name:'Health & Life Sciences AI',          focus:'Healthcare AI, clinical AI, drug discovery, health informatics, telemedicine AI India 2025 2026' },
]

const NEWS_TOPICS = [
  { code:'MKT-HPC', name:'AI & HPC Market India',       focus:'AI and HPC market investments, deployments, vendor activity India 2025 2026' },
  { code:'MKT-COM', name:'Competitor & Vendor Activity', focus:'NVIDIA AMD Intel HPE Dell Lenovo AI HPC India wins contracts announcements 2025 2026' },
  { code:'MKT-TND', name:'Government AI Tenders',        focus:'India government AI RFP GeM tenders procurement HPC contracts 2025 2026' },
  { code:'MKT-DEF', name:'Defence Technology News',      focus:'India military AI DRDO DPSUs defence tech autonomous systems MoD 2025 2026' },
  { code:'MKT-SOV', name:'Sovereign AI & Policy',        focus:'data localisation sovereign AI DPDP Act on-premise India policy 2025 2026' },
]

//    RSS Feeds                                                                  
const RSS_FEEDS = []  // populated dynamically from feed_library table

async function loadActiveFeeds() {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/feed_library?status=eq.active&order=relevance_score.desc,yield_rate.desc&limit=100`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    )
    if (!r.ok) { console.log('WARN: Could not load feed_library, using empty feed list'); return [] }
    const feeds = await r.json()
    console.log(`  Loaded ${feeds.length} active feeds from feed_library`)
    return feeds.map(f => ({
      url: f.url,
      name: f.name,
      codes: f.domain_codes || [],
      lang: f.language || 'en'
    }))
  } catch(e) {
    console.log(`WARN: feed_library load error: ${e.message}`)
    return []
  }
}

//    Helpers                                                                    
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function normaliseTitle(t) {
  return t.toLowerCase()
    .replace(/phase\s+ii\b/g, 'phase 2').replace(/phase\s+iii\b/g, 'phase 3').replace(/phase\s+iv\b/g, 'phase 4')
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
}

function extractJSON(raw) {
  if (!raw) return null
  let text = raw.trim()
  const fence = String.fromCharCode(96,96,96)
  if (text.includes(fence)) {
    const parts = text.split(fence)
    for (const p of parts) {
      const t = p.startsWith('json') ? p.slice(4).trim() : p.trim()
      if (t.startsWith('{')) { text = t; break }
    }
  }
  const first = text.indexOf('{')
  if (first < 0) return null
  text = text.slice(first)
  try { return JSON.parse(text) } catch {}
  let depth = 0, start = -1
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{') { if (!depth) start = i; depth++ }
    else if (raw[i] === '}') { depth--; if (!depth && start >= 0) { try { return JSON.parse(raw.slice(start, i+1)) } catch {} } }
  }
  return null
}

//    Sarvam translation                                                         
async function translateWithSarvam(text, sourceLang) {
  if (!SARVAM_KEY || sourceLang === 'en') return { text, translated: false }
  const langMap = { hi:'hi-IN', te:'te-IN', ml:'ml-IN', ta:'ta-IN', kn:'kn-IN', mr:'mr-IN', gu:'gu-IN', bn:'bn-IN', pa:'pa-IN', or:'or-IN' }
  const sourceLangCode = langMap[sourceLang] || sourceLang+'-IN'
  try {
    const r = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': SARVAM_KEY },
      body: JSON.stringify({ input: text.slice(0, 1000), source_language_code: sourceLangCode, target_language_code: 'en-IN', speaker_gender: 'Male', mode: 'formal', enable_preprocessing: true })
    })
    if (!r.ok) return { text, translated: false }
    const d = await r.json()
    return { text: d.translated_text || text, translated: true }
  } catch { return { text, translated: false } }
}

//    Gemini Search Grounding                                                    
async function callGeminiGrounded(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GROUNDING_MODEL}:generateContent?key=${GEMINI_KEY}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }  // no thinkingBudget -- required for search grounding
  }
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`Gemini grounded ${r.status}: ${(await r.text()).slice(0, 100)}`)
  const data = await r.json()
  const candidate = data.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text || ''
  const chunks = candidate?.groundingMetadata?.groundingChunks || []
  const sources = chunks.filter(c => c.web?.uri).map(c => ({ url: c.web.uri, title: c.web.title || '' }))
  callGeminiGrounded._lastInputTok  = (data.usageMetadata && data.usageMetadata.promptTokenCount)     || 0
  callGeminiGrounded._lastOutputTok = (data.usageMetadata && data.usageMetadata.candidatesTokenCount) || 0
  return { text, sources }
}

//    Gemini plain (for RSS extraction)                                         
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EXTRACT_MODEL}:generateContent?key=${GEMINI_KEY}`
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } }
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`Gemini ${r.status}`)
  const data = await r.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  callGemini._lastInputTok  = (data.usageMetadata && data.usageMetadata.promptTokenCount)     || 0
  callGemini._lastOutputTok = (data.usageMetadata && data.usageMetadata.candidatesTokenCount) || 0
  return text
}

//    Supabase                                                                   
async function getExisting() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
  const dedupParams = 'select=title,source_url&limit=2000'
  const dedupUrl = SB_URL + '/rest/v1/intelligence_items?scraped_at=gte.' + cutoff.toISOString() + '&' + dedupParams
  const r = await fetch(dedupUrl, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } })
  if (!r.ok) return { titles: new Set(), urls: new Set() }
  const rows = await r.json()
  const titles = new Set()
  const urls = new Set()
  rows.forEach(row => {
    const t = (row.title || '').toLowerCase().trim()
    titles.add(t); titles.add(normaliseTitle(t))
    if (row.source_url) urls.add(row.source_url.toLowerCase().trim())
  })
  return { titles, urls }
}

// Semantic Context Tree
let SEMANTIC_CONTEXTS = null

async function loadSemanticContexts() {
  if (SEMANTIC_CONTEXTS) return SEMANTIC_CONTEXTS
  try {
    const r = await fetch(
      SB_URL + '/rest/v1/semantic_contexts?active=eq.true&order=tier.asc',
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }
    )
    if (!r.ok) { SEMANTIC_CONTEXTS = []; return [] }
    SEMANTIC_CONTEXTS = await r.json()
    console.log('  Loaded ' + SEMANTIC_CONTEXTS.length + ' semantic contexts')
    return SEMANTIC_CONTEXTS
  } catch(e) { SEMANTIC_CONTEXTS = []; return [] }
}

function phase1KeywordFilter(title, description) {
  const text = (title + ' ' + description).toLowerCase()
  const hardExcludes = ['appointed as','promoted to','retirement of','farewell to',
    'passing out parade','republic day parade','sensex','nifty','mutual fund',
    'share price','stock market','cricket','ipl','bollywood','celebrity',
    'movie review','weather forecast','obituary','passed away']
  for (const exc of hardExcludes) { if (text.includes(exc)) return false }
  const passKeywords = ['artificial intelligence',' ai ','machine learning','deep learning',
    'llm','language model','generative ai','gpu ','hpc ','supercomput','data cent',
    'cloud comput','surveillance','autonomous','drone','satellite','geospatial',
    'remote sensing','cybersecurity','digital transform','e-governance','fintech',
    'healthtech','agritech','semiconductor','5g','6g','smart city','rfp','rfi',
    'tender','procurement','contract award','mou ','budget alloc','crore',
    'investment','funding','startup','inference','training']
  for (const kw of passKeywords) { if (text.includes(kw)) return true }
  return false
}

async function phase2SemanticMatch(title, description, contexts) {
  const excludeContexts = contexts.filter(function(c) { return c.tier === 'exclude' })
  const matchContexts   = contexts.filter(function(c) { return c.tier !== 'exclude' })
  const contextList = matchContexts.map(function(c, i) {
    return (i+1) + '. [' + c.tier.toUpperCase() + '] ' + c.name + ': ' + (c.short_description || c.context_string)
  }).join('\n')
  const excludeList = excludeContexts.map(function(c) {
    return '- ' + c.name + ': ' + (c.short_description || c.context_string)
  }).join('\n')
  const prompt = 'You are an intelligence analyst for an AI and HPC hardware OEM selling to Indian government and enterprise clients.\n'
    + 'ARTICLE TITLE: ' + title.slice(0, 150) + '\n'
    + 'ARTICLE CONTENT: ' + description.slice(0, 400) + '\n\n'
    + 'Match this article to the BEST context, or return 0 if none match or if it matches an EXCLUDE context.\n\n'
    + 'CONTEXTS:\n' + contextList + '\n\n'
    + 'HARD EXCLUDE:\n' + excludeList + '\n\n'
    + 'Return JSON only: {matched_context_num, matched_tier, intelligence_stream, intelligence_value, summary(80 words), organisations(array), tags(array max 5), opportunity(1 sentence), uc_suggest(or empty), confidence}\n'
    + 'Start { end }. No markdown.'
  const extracted = extractJSON(await callGemini(prompt))
  if (!extracted || !extracted.matched_context_num || extracted.matched_context_num === 0) return null
  const matchedCtx = matchContexts[extracted.matched_context_num - 1]
  if (!matchedCtx) return null
  return Object.assign({}, extracted, {
    matched_context: matchedCtx.name,
    matched_tier: matchedCtx.tier,
    portfolio_codes: matchedCtx.portfolio_codes || [],
    relevant: true
  })
}

async function sbInsert(row) {
  const r = await fetch(`${SB_URL}/rest/v1/intelligence_items`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(row)
  })
  if (!r.ok) { const e = await r.text(); console.error(`  SB error ${r.status}: ${e.slice(0, 150)}`); return false }
  return true
}

function buildRow(id, domainCode, domainName, item, extra = {}) {
  return {
    id,
    domain_code: domainCode,
    domain_name: domainName,
    topic_code: extra.topicCode || null,
    topic_name: extra.topicName || null,
    source_type: extra.scrapeMethod || 'search_grounded',
    intelligence_stream: item.intelligence_stream || 'market_pulse',
    title: (item.title || '').slice(0, 500),
    summary: (item.summary || '').slice(0, 1000),
    type: item.type || '',
    intelligence_value: item.intelligence_value || 'medium',
    organisations: Array.isArray(item.organisations) ? item.organisations : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    opportunity: (item.opportunity || '').slice(0, 500),
    competitor_signals: (item.competitor_signals || '').slice(0, 500),
    uc_suggest: (item.uc_suggest || '').slice(0, 200),
    confidence: item.confidence || 'medium',
    scraped_at: new Date().toISOString(),
    scraped_by: 'github-actions-v2.1',
    source_url: extra.sourceUrl || null,
    source_name: extra.sourceName || null,
    source_language: extra.language || 'en',
    model_used: extra.modelUsed || GROUNDING_MODEL,
    scrape_method: extra.scrapeMethod || 'search_grounded',
    published_date: extra.publishedDate || null,
    published_year: item.published_year ? parseInt(item.published_year) : (extra.publishedDate ? new Date(extra.publishedDate).getFullYear() : null),
    geography: extra.geography || 'India',
    is_real: true,
  }
}

//    RSS Scraping                                                               

// Phase 2 batch: classify up to PHASE2_BATCH_SIZE items in one Gemini call
const PHASE2_BATCH_SIZE = 5

async function phase2SemanticMatchBatch(items, contexts) {
  if (!items || !items.length) return []
  var excludeContexts = contexts.filter(function(c) { return c.tier === 'exclude' })
  var matchContexts   = contexts.filter(function(c) { return c.tier !== 'exclude' })

  var contextList = matchContexts.map(function(c, i) {
    return (i+1) + '. [' + c.tier.toUpperCase() + '] ' + c.name + ': ' + (c.short_description || c.context_string)
  }).join('\n')
  var excludeList = excludeContexts.map(function(c) {
    return '- ' + c.name + ': ' + (c.short_description || c.context_string)
  }).join('\n')
  var articlesText = items.map(function(item, idx) {
    return 'ARTICLE ' + (idx+1) + ':\nTitle: ' + item.title.slice(0, 100) + '\nContent: ' + item.description.slice(0, 200)
  }).join('\n\n')

  var prompt = 'Intelligence analyst for AI/HPC OEM selling to Indian govt and enterprise.\n'
    + 'Classify each article. Return 0 if none match or matches EXCLUDE.\n\n'
    + 'CONTEXTS:\n' + contextList + '\n\n'
    + 'EXCLUDE:\n' + excludeList + '\n\n'
    + articlesText + '\n\n'
    + 'Return JSON array only, one per article: [{matched_context_num,matched_tier,intelligence_stream,intelligence_value,summary(50 words),organisations,tags(max 3),opportunity,uc_suggest,confidence},...]\n'
    + 'Start [ end ]. No markdown.'

  var raw = await callGemini(prompt)
  bufferUsage('scraper_gh', 'phase2_batch', EXTRACT_MODEL, callGemini._lastInputTok||0, callGemini._lastOutputTok||0, 0, raw ? 'success' : 'error', null)
  var parsed = extractJSON(raw)
  if (!Array.isArray(parsed)) return items.map(function() { return null })

  return parsed.map(function(extracted, i) {
    if (!extracted || !extracted.matched_context_num || extracted.matched_context_num === 0) return null
    var matchedCtx = matchContexts[extracted.matched_context_num - 1]
    if (!matchedCtx) return null
    return Object.assign({}, extracted, {
      matched_context: matchedCtx.name,
      matched_tier:    matchedCtx.tier,
      portfolio_codes: matchedCtx.portfolio_codes || [],
      relevant:        true
    })
  })
}

async function scrapeRSS(feed, existing) {
  console.log('  [RSS] ' + feed.name + ' (' + feed.lang + ')')
  let added = 0
  try {
    const r = await fetch(feed.url, { headers: { 'User-Agent': 'ATLAS-Bot/2.1' }, signal: AbortSignal.timeout(12000) })
    if (!r.ok) { console.log('    WARN HTTP ' + r.status); return 0 }
    const xml = await r.text()
    const parsed = await parseStringPromise(xml, { explicitArray: false })
    const channel = parsed && parsed.rss && parsed.rss.channel || parsed && parsed.feed
    const rawItems = (channel && channel.item) || (channel && channel.entry) || []
    const items = Array.isArray(rawItems) ? rawItems : [rawItems]
    const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30)
    const domainCode = (feed.codes && feed.codes[0]) || 'TEC-GEN'

    // Phase 1: collect items passing keyword filter
    const phase1Passed = []
    for (const rssItem of items.slice(0, 20)) {
      const rawTitle = ((rssItem.title && (rssItem.title._ || rssItem.title)) || '').trim()
      const link     = ((rssItem.link && (rssItem.link._ || rssItem.link)) || rssItem.id || '').trim()
      const desc     = ((rssItem.description && (rssItem.description._ || rssItem.description)) || (rssItem.summary && (rssItem.summary._ || rssItem.summary)) || '').replace(/<[^>]+>/g, '').trim()
      const pubDate  = rssItem.pubDate || rssItem.published || rssItem.updated || ''

      if (!rawTitle || !link) continue
      if (pubDate && new Date(pubDate) < cutoff30) continue

      let title = rawTitle, description = desc, translated = false
      const language = feed.lang
      if (feed.lang !== 'en' && SARVAM_KEY) {
        const tr = await translateWithSarvam(rawTitle + '. ' + desc.slice(0, 300), feed.lang)
        if (tr.translated) { title = tr.text.split('.')[0]; description = tr.text; translated = true }
        await sleep(1000)
      }

      const titleKey  = title.toLowerCase().trim()
      const titleNorm = normaliseTitle(title)
      const urlKey    = link.toLowerCase()
      if (existing.titles.has(titleKey) || existing.titles.has(titleNorm) || existing.urls.has(urlKey)) continue
      if (!phase1KeywordFilter(title, description)) continue

      phase1Passed.push({ title, description, link, pubDate, language, translated, titleKey, titleNorm, urlKey })
    }

    if (!phase1Passed.length) return 0

    // Phase 2: batch semantic matching
    const contexts = await loadSemanticContexts()
    for (let b = 0; b < phase1Passed.length; b += PHASE2_BATCH_SIZE) {
      const batch = phase1Passed.slice(b, b + PHASE2_BATCH_SIZE)
      const matchResults = await phase2SemanticMatchBatch(batch, contexts)

      for (let i = 0; i < batch.length; i++) {
        const item = batch[i]
        const matched = matchResults[i]
        if (!matched) continue

        const id = 'rss-' + domainCode.replace(/-/g, '') + '-' + Date.now() + '-' + Math.floor(Math.random() * 9999)
        const row = buildRow(id, domainCode, feed.name, matched, {
          sourceUrl:     item.link,
          sourceName:    feed.name,
          language:      item.language,
          modelUsed:     EXTRACT_MODEL,
          scrapeMethod:  item.translated ? 'rss_sarvam' : 'rss',
          publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          geography:     'India',
        })
        row.title           = item.title.slice(0, 500)
        row.summary         = (matched.summary || item.description.slice(0, 300)).slice(0, 1000)
        row.matched_context = matched.matched_context || ''
        row.matched_tier    = matched.matched_tier || ''
        row.content_hash    = contentFingerprint(item.title, matched.summary || item.description)
        // Skip syndicated content
        if (isKnownContent(item.title, matched.summary || item.description)) {
          console.log('    DEDUP (hash/RSS) ' + item.title.slice(0, 55))
          continue
        }

        const ok = await sbInsert(row)
        if (ok) {
          console.log('    OK [' + item.language + (item.translated ? '/Sarvam' : '') + '] ' + item.title.slice(0, 55))
          existing.titles.add(item.titleKey)
          existing.titles.add(item.titleNorm)
          existing.urls.add(item.urlKey)
          added++
        }
      }
      if (b + PHASE2_BATCH_SIZE < phase1Passed.length) await sleep(DELAY_MS)
    }
  } catch (e) { console.log('    WARN ' + e.message.slice(0, 80)) }
  return added
}

//    Search Grounding                                                           
async function scrapeGrounded(domain, geography, existing, isNews = false, publishedAfter = null) {
  const prompt = `You are an intelligence analyst for an AI and HPC hardware OEM.
Use your web search tool to find ONE real recent news item about: ${domain.name}${geography === 'Global' ? ' (international examples outside India, from US/EU/Middle East/Asia Pacific)' : ' in ' + geography}.
Focus on: ${domain.focus || domain.name}${publishedAfter ? '\nReturn ONLY items published after ' + new Date(publishedAfter).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}) + '. Exclude anything published before this date   we already have those.' : ''} events from 2025 or 2026. Older events = {"relevant":false}.
TOPIC GATE: Include anything about AI, ML, data, technology, government, defence, infrastructure, health, agriculture, industry, investment, policy. Exclude ONLY: celebrity gossip, sports scores, entertainment reviews, personal lifestyle. Off-topic = {"relevant":false}.
JSON only: relevant(true), title(exact real headline), summary(factual 80 words from real article), intelligence_stream(market_pulse|domain_intel|tech_watch), intelligence_value(high|medium|low), organisations(array of real names), tags(array max 5), opportunity(1 sentence), competitor_signals(empty string if none), uc_suggest(use case name or empty string), confidence(high|medium|low), source_title(exact publication name e.g. Economic Times), published_year(integer 2025 or 2026).
Start { end }. No markdown.`

  await sleep(DELAY_MS)
  let text, sources
  try {
    const result = await callGeminiGrounded(prompt)
    text = result.text; sources = result.sources
    bufferUsage('scraper_gh', isNews ? 'scrape_news' : 'scrape_domain', GROUNDING_MODEL, callGeminiGrounded._lastInputTok||0, callGeminiGrounded._lastOutputTok||0, 0, text ? 'success' : 'error', domain.code)
  } catch (e) { console.log(`    WARN Grounding [${domain.code}/${geography}]: ${e.message.slice(0,60)}`); return 0 }

  const item = extractJSON(text)
  if (!item || item.relevant === false) return 0
  if (!item.title) return 0
  if (!phase1KeywordFilter(item.title, item.summary || '')) return 0
  if (item.published_year && parseInt(item.published_year) < 2025) { console.log(`    WARN Rejected (${item.published_year}): ${item.title.slice(0,40)}`); return 0 }
  if (/\b(201[0-9]|202[0-4])\b/.test(item.title)) { console.log(`    WARN Rejected (old year in title): ${item.title.slice(0,40)}`); return 0 }

  const titleKey = item.title.toLowerCase().trim()
  const titleNorm = normaliseTitle(item.title)
  const sourceUrl = sources[0]?.url || ''
  const urlKey = sourceUrl.toLowerCase()

  if (existing.titles.has(titleKey) || existing.titles.has(titleNorm)) { console.log(`    dup: ${item.title.slice(0,40)}`); return 0 }
  if (urlKey && existing.urls.has(urlKey)) { console.log(`    dup url`); return 0 }

  const prefix = isNews ? 'gs-news' : 'gs'
  const id = `${prefix}-${domain.code.replace(/-/g,'')}-${geography.replace(/[^a-zA-Z]/g,'')}-${Date.now()}-${Math.floor(Math.random()*9999)}`

  const row = buildRow(id, domain.code, domain.name, item, {
    topicCode: isNews ? domain.code : null,
    topicName: isNews ? domain.name : null,
    sourceUrl: sourceUrl || null,
    sourceName: sources[0]?.title || item.source_title || 'Web Search',
    language: 'en',
    modelUsed: GROUNDING_MODEL,
    scrapeMethod: 'search_grounded',
    geography,
  })

  row.matched_context = ''
  row.matched_tier = ''
  // Skip syndicated content (hash dedup)
  if (isKnownContent(item.title, item.summary || '')) {
    console.log('    DEDUP ' + (item.title||'').slice(0, 55))
    return 0
  }
  row.content_hash = contentFingerprint(item.title, item.summary || '')
      const ok = await sbInsert(row)
  if (ok) {
    console.log(`    OK [${geography}] ${item.title.slice(0, 55)}`)
    existing.titles.add(titleKey); existing.titles.add(titleNorm)
    if (urlKey) existing.urls.add(urlKey)
    return 1
  }
  return 0
}

//    Main                                                                       
async function main() {
  const start = Date.now()
  let total = 0

  console.log('\nLoading existing items for dedup...')
  const existing = await getExisting()
  console.log('  ' + existing.titles.size + ' titles, ' + existing.urls.size + ' URLs in dedup set')

  // Load TTL config from app_config table
  await loadTTLConfig()

  // Load content hashes for syndication dedup (across runs)
  await loadKnownHashes()

  let domainsToRun = DOMAINS
  let newsToRun = NEWS_TOPICS
  let feedsToRun = await loadActiveFeeds()
  if (DOMAINS_OVERRIDE) {
    const codes = DOMAINS_OVERRIDE.split(',').map(function(s) { return s.trim().toUpperCase() })
    domainsToRun = DOMAINS.filter(function(d) { return codes.includes(d.code) })
    newsToRun = NEWS_TOPICS.filter(function(t) { return codes.includes(t.code) })
    feedsToRun = feedsToRun.filter(function(f) { return f.codes.some(function(c) { return codes.includes(c) }) })
    console.log('Filtered to: ' + codes.join(', '))
  }

  // Phase 1: RSS Feeds
  if (RUN_RSS) {
    console.log('\n=== Phase 1: RSS Feeds ===')
    for (const feed of feedsToRun) {
      const feedCode = (feed.codes && feed.codes[0]) || 'RSS'
      const ttlCheck = await isDue('rss', feedCode, 'India')
      if (!ttlCheck.due) continue
      const added = await scrapeRSS(feed, existing)
      await updateRunRecord('rss', feedCode, 'India', added)
      total += added
      await sleep(2000)
    }
  }

  // Phase 2: Search Grounding
  if (RUN_SEARCH) {
    console.log('\n=== Phase 2: Search Grounding ===')

    // Domains
    for (const domain of domainsToRun) {
      const geos = GLOBAL_DOMAINS.includes(domain.code) ? [...GEOGRAPHIES, 'Global'] : GEOGRAPHIES
      for (const geo of geos) {
        const ttlCheck = await isDue('domain', domain.code, geo)
        if (!ttlCheck.due) continue
        console.log('\n  [SEARCH] ' + domain.code + ' / ' + geo)
        // Add "published after" constraint to prompt if available
        const publishedAfter = ttlCheck.publishedAfter
        let domainAdded = 0
        for (let i = 0; i < ITEMS_PER_DOMAIN; i++) {
          domainAdded += await scrapeGrounded(domain, geo, existing, false, publishedAfter)
          await sleep(DELAY_MS)
        }
        await updateRunRecord('domain', domain.code, geo, domainAdded)
        total += domainAdded
      }
      await sleep(3000)
    }

    // Global intelligence topics
    for (const topic of GLOBAL_TOPICS) {
      const ttlCheck = await isDue('global', topic.code, 'Global')
      if (!ttlCheck.due) continue
      console.log('\n  [GLOBAL] ' + topic.code)
      const publishedAfter = ttlCheck.publishedAfter
      const globalAdded = await scrapeGrounded(topic, 'Global', existing, true, publishedAfter)
      await updateRunRecord('global', topic.code, 'Global', globalAdded)
      total += globalAdded
      await sleep(DELAY_MS)
    }

    // News topics
    for (const topic of newsToRun) {
      const newsGeos = GLOBAL_DOMAINS.includes(topic.code) ? [...GEOGRAPHIES, 'Global'] : GEOGRAPHIES
      for (const geo of newsGeos) {
        const ttlCheck = await isDue('news', topic.code, geo)
        if (!ttlCheck.due) continue
        console.log('\n  [NEWS] ' + topic.code + ' / ' + geo)
        const publishedAfter = ttlCheck.publishedAfter
        let newsAdded = 0
        for (let i = 0; i < Math.min(ITEMS_PER_DOMAIN, 2); i++) {
          newsAdded += await scrapeGrounded(topic, geo, existing, true, publishedAfter)
          await sleep(DELAY_MS)
        }
        await updateRunRecord('news', topic.code, geo, newsAdded)
        total += newsAdded
      }
    }
  }

  const elapsed = ((Date.now() - start) / 60000).toFixed(1)
  console.log('\n=== COMPLETE: ' + total + ' real items in ' + elapsed + ' min ===')
  await flushUsageLog()
}


main().catch(err => { console.error('Fatal:', err); process.exit(1) })
