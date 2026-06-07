// ATLAS Intelligence Scraper v2.1 -- GitHub Actions Script
// REAL WEB SEARCH ONLY -- Hybrid: RSS Feeds + Gemini Search Grounding
// Multi-geography, Sarvam for Indic languages, full traceability
// Version: 2.1 | 2026-05-30

import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js'

// ── Config ────────────────────────────────────────────────────────────────────
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
  { code:'UC-GLB',  name:'Global AI Use Cases',
    focus:'AI use case deployment production government defence health agriculture smart city 2025 2026' },
  { code:'TEC-GLB', name:'Global AI Infrastructure News',
    focus:'GPU cluster HPC AI data centre supercomputer large language model deployment cloud AI 2025 2026' },
  { code:'OEM-GLB', name:'AI HPC OEM & Market News',
    focus:'NVIDIA AMD HPE Dell Supermicro Intel AI server HPC GPU contract announcement partnership 2025 2026' },
  { code:'POL-GLB', name:'Global AI Policy & Regulation',
    focus:'AI regulation policy national AI strategy government AI governance EU US China 2025 2026' },
  { code:'INV-GLB', name:'Global AI Investment & Funding',
    focus:'AI startup funding investment data centre GPU infrastructure deal billion 2025 2026' },
]
const GROUNDING_MODEL = 'gemini-3.5-flash'   // 3.5-flash more reliable for search grounding
const EXTRACT_MODEL   = 'gemini-3.1-flash-lite' // cheap for RSS extraction
const DELAY_MS      = 1000

if (!GEMINI_KEY || !SB_URL || !SB_KEY) { console.error('Missing GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY'); process.exit(1) }

console.log(`=== ATLAS Intelligence Scraper v2.1 ===`)
console.log(`Grounding: ${GROUNDING_MODEL} | Extract: ${EXTRACT_MODEL}`)
console.log(`Geographies: ${GEOGRAPHIES.join(', ')} | RSS: ${RUN_RSS} | Search: ${RUN_SEARCH}`)
console.log(`Sarvam (Indic): ${SARVAM_KEY ? 'enabled' : 'disabled'}`)

// ── Domain taxonomy ───────────────────────────────────────────────────────────
const DOMAINS = [
  { code:'GOV-GOV', name:'Government & Governance',         focus:'Indian central and state government AI adoption, e-governance, digital India, citizen services, smart cities' },
  { code:'DEF-MIL', name:'Defence -- Armed Forces',          focus:'Indian Army, Navy, Air Force, DPSUs, DRDO combat systems, autonomous weapons, military AI India' },
  { code:'DEF-SPC', name:'Defence -- Space & Satellite',     focus:'ISRO, IN-SPACe, Defence Space Agency, military satellite, launch vehicles, space situational awareness India' },
  { code:'DEF-HLS', name:'Defence -- Homeland Security',     focus:'BSF, CRPF, paramilitary, border security, surveillance, critical infrastructure protection India' },
  { code:'DEF-INT', name:'Defence -- Intelligence & Signals',focus:'SIGINT, IMINT, intelligence agencies, cyber intelligence, signal processing AI India' },
  { code:'GEO-SPA', name:'Geospatial & Earth Observation',  focus:'NRSC, Survey of India, Pixxel, MapMyIndia, civilian EO platforms, GIS, Bhuvan India' },
  { code:'INF-CIV', name:'Critical Infrastructure',         focus:'Indian Railways, airports, ports, civil aviation, DGCA, AAI, metro systems AI India' },
  { code:'TEL-NET', name:'Telecom & Networks',              focus:'Jio, Airtel, BSNL, 5G AI, network optimisation, telecom AI India, DoT, C-DOT' },
  { code:'TEC-GEN', name:'Technology',                      focus:'IT services, AI platforms, cloud, TCS, Infosys, Wipro, HCL AI India 2025 2026' },
  { code:'FIN-BFS', name:'Banking & Financial Services',    focus:'RBI, SEBI, PSU banks, fintech, payments, fraud detection, credit AI India 2025 2026' },
  { code:'REG-AIP', name:'Regional AI Programmes',          focus:'IndiaAI Mission, state AI CoE, AI cities, regional compute hub India 2025 2026' },
  { code:'LAB-AIR', name:'AI Labs & Research',              focus:'IIT, DRDO labs, AI startups India, research publications, benchmarks 2025 2026' },
  { code:'HLT-LIF', name:'Healthcare & Life Sciences',      focus:'AIIMS, diagnostic AI, pharma, hospital AI, health data India 2025 2026' },
]

const NEWS_TOPICS = [
  { code:'MKT-HPC', name:'AI & HPC Market India',       focus:'AI and HPC market investments, deployments, vendor activity India 2025 2026' },
  { code:'MKT-COM', name:'Competitor & Vendor Activity', focus:'NVIDIA AMD Intel HPE Dell Lenovo AI HPC India wins contracts announcements 2025 2026' },
  { code:'MKT-TND', name:'Government AI Tenders',        focus:'India government AI RFP GeM tenders procurement HPC contracts 2025 2026' },
  { code:'MKT-DEF', name:'Defence Technology News',      focus:'India military AI DRDO DPSUs defence tech autonomous systems MoD 2025 2026' },
  { code:'MKT-SOV', name:'Sovereign AI & Policy',        focus:'data localisation sovereign AI DPDP Act on-premise India policy 2025 2026' },
]

// ── RSS Feeds ─────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function normaliseTitle(t) {
  return t.toLowerCase()
    .replace(/phase\s+ii\b/g, 'phase 2').replace(/phase\s+iii\b/g, 'phase 3').replace(/phase\s+iv\b/g, 'phase 4')
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
}

function extractJSON(raw) {
  if (!raw) return null
  let text = raw.trim()
  const fence = '```'
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

// ── Sarvam translation ────────────────────────────────────────────────────────
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

// ── Gemini Search Grounding ───────────────────────────────────────────────────
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
  return { text, sources }
}

// ── Gemini plain (for RSS extraction) ────────────────────────────────────────
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EXTRACT_MODEL}:generateContent?key=${GEMINI_KEY}`
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } }
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`Gemini ${r.status}`)
  const data = await r.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ── Supabase ──────────────────────────────────────────────────────────────────
async function getExisting() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
  const r = await fetch(`${SB_URL}/rest/v1/intelligence_items?scraped_at=gte.${cutoff.toISOString()}&select=title,source_url&limit=2000`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })
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
// loadSemanticContexts — loads from Supabase, cached after first call
let SEMANTIC_CONTEXTS = null

async function loadSemanticContexts() {
  if (SEMANTIC_CONTEXTS) return SEMANTIC_CONTEXTS
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/semantic_contexts?active=eq.true&order=tier.asc`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    )
    if (!r.ok) { console.log('WARN: Could not load semantic_contexts'); SEMANTIC_CONTEXTS = []; return [] }
    SEMANTIC_CONTEXTS = await r.json()
    console.log(`  Loaded ${SEMANTIC_CONTEXTS.length} semantic contexts`)
    return SEMANTIC_CONTEXTS
  } catch(e) {
    console.log(`WARN: semantic_contexts error: ${e.message}`)
    SEMANTIC_CONTEXTS = []
    return []
  }
}

// Phase 1: cheap keyword pre-filter — no API call needed
function phase1KeywordFilter(title, description) {
  const text = (title + ' ' + description).toLowerCase()
  // Hard excludes first
  const hardExcludes = [
    'appointed as','promoted to','retirement of','farewell to','passing out parade',
    'republic day parade','independence day ceremony','sensex','nifty','mutual fund',
    'share price','stock market','commodity price','crude oil price','gold price',
    'cricket','ipl','fifa','bollywood','celebrity','movie review','film review',
    'recipe','travel guide','weather forecast','obituary','passed away','death of'
  ]
  for (const exc of hardExcludes) {
    if (text.includes(exc)) return false
  }
  // Must contain at least one AI-adjacent keyword
  const passKeywords = [
    'artificial intelligence',' ai ','machine learning','deep learning','llm',
    'language model','generative ai','gpu ','hpc ','supercomput','data cent',
    'cloud comput','surveillance','autonomous','drone','satellite','geospatial',
    'remote sensing','cybersecurity','digital transform','e-governance',
    'fintech','healthtech','agritech','semiconductor','5g','6g','smart city',
    'rfp','rfi','tender','procurement','contract award','mou ','budget alloc',
    'crore','investment','funding','startup','data lake','inference','training'
  ]
  for (const kw of passKeywords) {
    if (text.includes(kw)) return true
  }
  return false
}

// Phase 2: semantic context tree matching via Gemini
async function phase2SemanticMatch(title, description, contexts) {
  const excludeContexts = contexts.filter(c => c.tier === 'exclude')
  const matchContexts   = contexts.filter(c => c.tier !== 'exclude')

  const contextList = matchContexts.map((c, i) =>
    `${i+1}. [${c.tier.toUpperCase()}] ${c.name}: ${c.context_string}`
  ).join('\n')

  const excludeList = excludeContexts.map(c =>
    `- ${c.name}: ${c.context_string}`
  ).join('\n')

  const prompt = `You are an intelligence analyst for an AI and HPC hardware OEM selling to Indian government and enterprise clients.
ARTICLE TITLE: ${title.slice(0, 150)}
ARTICLE CONTENT: ${description.slice(0, 400)}

Match this article to the BEST context below, or return 0 if none match or if it matches an EXCLUDE context.

CONTEXTS:
${contextList}

HARD EXCLUDE (return matched_context_num:0 if article matches any):
${excludeList}

Return JSON only: {matched_context_num, matched_tier, intelligence_stream, intelligence_value, summary(80 words), organisations(array), tags(array max 5), opportunity(1 sentence), uc_suggest(or empty), confidence}
Start { end }. No markdown.`

  const extracted = extractJSON(await callGemini(prompt))
  if (!extracted || !extracted.matched_context_num || extracted.matched_context_num === 0) return null

  const matchedCtx = matchContexts[extracted.matched_context_num - 1]
  if (!matchedCtx) return null

  return {
    ...extracted,
    matched_context: matchedCtx.name,
    matched_tier: matchedCtx.tier,
    portfolio_codes: matchedCtx.portfolio_codes || [],
    relevant: true
  }
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

// ── RSS Scraping ──────────────────────────────────────────────────────────────
async function scrapeRSS(feed, existing) {
  console.log(`  [RSS] ${feed.name} (${feed.lang})`)
  let added = 0
  try {
    const r = await fetch(feed.url, { headers: { 'User-Agent': 'ATLAS-Bot/2.1' }, signal: AbortSignal.timeout(12000) })
    if (!r.ok) { console.log(`    WARN HTTP ${r.status}`); return 0 }
    const xml = await r.text()
    const parsed = await parseStringPromise(xml, { explicitArray: false })
    const channel = parsed?.rss?.channel || parsed?.feed
    const rawItems = channel?.item || channel?.entry || []
    const items = Array.isArray(rawItems) ? rawItems : [rawItems]
    const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30)

    for (const rssItem of items.slice(0, 20)) {
      const rawTitle = (rssItem.title?._ || rssItem.title || '').trim()
      const link = (rssItem.link?._ || rssItem.link || rssItem.id || '').trim()
      const desc = (rssItem.description?._ || rssItem.description || rssItem.summary?._ || rssItem.summary || '').replace(/<[^>]+>/g, '').trim()
      const pubDate = rssItem.pubDate || rssItem.published || rssItem.updated || ''

      if (!rawTitle || !link) continue
      if (pubDate && new Date(pubDate) < cutoff30) continue

      // Translate if Indic
      let title = rawTitle
      let description = desc
      let translated = false
      let language = feed.lang
      if (feed.lang !== 'en' && SARVAM_KEY) {
        const tr = await translateWithSarvam(rawTitle + '. ' + desc.slice(0, 300), feed.lang)
        if (tr.translated) { title = tr.text.split('.')[0]; description = tr.text; translated = true }
        await sleep(1000)
      }

      // Dedup
      const titleKey = title.toLowerCase().trim()
      const titleNorm = normaliseTitle(title)
      const urlKey = link.toLowerCase()
      if (existing.titles.has(titleKey) || existing.titles.has(titleNorm) || existing.urls.has(urlKey)) continue

      // Phase 1: keyword pre-filter (free, no API call)
      if (!phase1KeywordFilter(title, description)) continue

      // Phase 2: semantic context tree matching
      const contexts = await loadSemanticContexts()
      const matched = await phase2SemanticMatch(title, description, contexts)
      if (!matched) continue

  const extracted = extractJSON(await callGemini(prompt))
  if (!extracted || !extracted.matched_context_num || extracted.matched_context_num === 0) return null

  const matchedCtx = matchContexts[extracted.matched_context_num - 1]
  if (!matchedCtx) return null

  return {
    ...extracted,
    matched_context: matchedCtx.name,
    matched_tier: matchedCtx.tier,
    portfolio_codes: matchedCtx.portfolio_codes || [],
    relevant: true
  }
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

// ── RSS Scraping ──────────────────────────────────────────────────────────────
async function scrapeRSS(feed, existing) {
  console.log(`  [RSS] ${feed.name} (${feed.lang})`)
  let added = 0
  try {
    const r = await fetch(feed.url, { headers: { 'User-Agent': 'ATLAS-Bot/2.1' }, signal: AbortSignal.timeout(12000) })
    if (!r.ok) { console.log(`    WARN HTTP ${r.status}`); return 0 }
    const xml = await r.text()
    const parsed = await parseStringPromise(xml, { explicitArray: false })
    const channel = parsed?.rss?.channel || parsed?.feed
    const rawItems = channel?.item || channel?.entry || []
    const items = Array.isArray(rawItems) ? rawItems : [rawItems]
    const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30)

    for (const rssItem of items.slice(0, 20)) {
      const rawTitle = (rssItem.title?._ || rssItem.title || '').trim()
      const link = (rssItem.link?._ || rssItem.link || rssItem.id || '').trim()
      const desc = (rssItem.description?._ || rssItem.description || rssItem.summary?._ || rssItem.summary || '').replace(/<[^>]+>/g, '').trim()
      const pubDate = rssItem.pubDate || rssItem.published || rssItem.updated || ''

      if (!rawTitle || !link) continue
      if (pubDate && new Date(pubDate) < cutoff30) continue

      // Translate if Indic
      let title = rawTitle
      let description = desc
      let translated = false
      let language = feed.lang
      if (feed.lang !== 'en' && SARVAM_KEY) {
        const tr = await translateWithSarvam(rawTitle + '. ' + desc.slice(0, 300), feed.lang)
        if (tr.translated) { title = tr.text.split('.')[0]; description = tr.text; translated = true }
        await sleep(1000)
      }

      // Dedup
      const titleKey = title.toLowerCase().trim()
      const titleNorm = normaliseTitle(title)
      const urlKey = link.toLowerCase()
      if (existing.titles.has(titleKey) || existing.titles.has(titleNorm) || existing.urls.has(urlKey)) continue

      // Extract signals with Gemini
            const domainCode = feed.codes[0]
const prompt = `You are an intelligence analyst for an AI and HPC hardware/software OEM selling to Indian government and enterprise clients.
TITLE: ${title.slice(0, 150)}
CONTENT: ${description.slice(0, 400)}
SOURCE: ${feed.name}
STRICT RELEVANCE TEST - article must pass AT LEAST ONE of these tests:
TEST 1 (AI/Tech): mentions AI, ML, machine learning, deep learning, LLM, generative AI, GPU, HPC, supercomputer, data centre, cloud computing, computer vision, autonomous systems, surveillance technology, drone technology, cybersecurity technology, digital transformation, smart systems, IoT, satellite data analytics
TEST 2 (Government Digital): mentions government digitisation, e-governance, digital public infrastructure, national programme for technology, ministry technology initiative, defence modernisation with digital/sensor/software angle
TEST 3 (Market Signal): major technology contract/tender worth >100 crore, technology company funding/IPO/acquisition, semiconductor/chip manufacturing, fibre/5G/6G infrastructure
HARD EXCLUDE regardless of source: personnel appointments/retirements/promotions, command handovers, military ceremonies, stock prices, mutual funds, commodity prices, loan rates, personal finance, agriculture without tech angle, sports, entertainment, celebrity, weather, obituaries
If passes any test: JSON with relevant(true), intelligence_stream(market_pulse|domain_intel|tech_watch|competitor_intel), summary(max 80 words factual), intelligence_value(high|medium|low), organisations(array), tags(array max 5), opportunity(1 sentence AI opportunity for our team), competitor_signals(string or empty), uc_suggest(AI use case or empty), confidence(high|medium|low).
If fails all tests: {"relevant":false}
Start { end }. No markdown.`

      await sleep(DELAY_MS)
      const extracted = extractJSON(await callGemini(prompt))
      if (!extracted || extracted.relevant === false) continue

      const id = `rss-${domainCode.replace(/-/g,'')}-${Date.now()}-${Math.floor(Math.random()*9999)}`
      const row = buildRow(id, domainCode, feed.name, matched, {
        sourceUrl: link,
        sourceName: feed.name,
        language: language,
        modelUsed: EXTRACT_MODEL,
        scrapeMethod: translated ? 'rss_sarvam' : 'rss',
        publishedDate: pubDate ? new Date(pubDate).toISOString() : null,
        geography: 'India',
      })
      row.title = title.slice(0, 500)
      row.summary = (matched.summary || description.slice(0, 300)).slice(0, 1000)
      row.matched_context = matched.matched_context || ''
      row.matched_tier = matched.matched_tier || ''

      const ok = await sbInsert(row)
      if (ok) {
        console.log(`    OK [${feed.lang}${translated?'/Sarvam':''}] ${title.slice(0, 55)}`)
        existing.titles.add(titleKey); existing.titles.add(titleNorm); existing.urls.add(urlKey)
        added++
      }
    }
  } catch (e) { console.log(`    WARN ${e.message.slice(0, 80)}`) }
  return added
}

// ── Search Grounding ──────────────────────────────────────────────────────────
async function scrapeGrounded(domain, geography, existing, isNews = false) {
  const prompt = `You are an intelligence analyst for an AI and HPC hardware OEM.
Use your web search tool to find ONE real recent news item about: ${domain.name}${geography === 'Global' ? ' (international examples outside India, from US/EU/Middle East/Asia Pacific)' : ' in ' + geography}.
Focus on: ${domain.focus}
CRITICAL: ONLY events from 2025 or 2026. Older events = {"relevant":false}.
TOPIC GATE: Include anything about AI, ML, data, technology, government, defence, infrastructure, health, agriculture, industry, investment, policy. Exclude ONLY: celebrity gossip, sports scores, entertainment reviews, personal lifestyle. Off-topic = {"relevant":false}.
JSON only: relevant(true), title(exact real headline), summary(factual 80 words from real article), intelligence_stream(market_pulse|domain_intel|tech_watch), intelligence_value(high|medium|low), organisations(array of real names), tags(array max 5), opportunity(1 sentence), competitor_signals(empty string if none), uc_suggest(use case name or empty string), confidence(high|medium|low), source_title(exact publication name e.g. Economic Times), published_year(integer 2025 or 2026).
Start { end }. No markdown.`

  await sleep(DELAY_MS)
  let text, sources
  try {
    const result = await callGeminiGrounded(prompt)
    text = result.text; sources = result.sources
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
  const ok = await sbInsert(row)
  if (ok) {
    console.log(`    OK [${geography}] ${item.title.slice(0, 55)}`)
    existing.titles.add(titleKey); existing.titles.add(titleNorm)
    if (urlKey) existing.urls.add(urlKey)
    return 1
  }
  return 0
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now()
  let total = 0

  console.log('\nLoading existing items for dedup...')
  const existing = await getExisting()
  console.log(`  ${existing.titles.size} titles, ${existing.urls.size} URLs in dedup set`)

  let domainsToRun = DOMAINS
  let newsToRun = NEWS_TOPICS
  let feedsToRun = await loadActiveFeeds()
  if (DOMAINS_OVERRIDE) {
    const codes = DOMAINS_OVERRIDE.split(',').map(s => s.trim().toUpperCase())
    domainsToRun = DOMAINS.filter(d => codes.includes(d.code))
    newsToRun = NEWS_TOPICS.filter(t => codes.includes(t.code))
    feedsToRun = feedsToRun.filter(f => f.codes.some(c => codes.includes(c)))
    console.log(`Filtered to: ${codes.join(', ')}`)
  }

  // Phase 1: RSS
  if (RUN_RSS) {
    console.log('\n=== Phase 1: RSS Feeds ===')
    for (const feed of feedsToRun) {
      total += await scrapeRSS(feed, existing)
      await sleep(2000)
    }
  }

  // Phase 2: Search Grounding
  if (RUN_SEARCH) {
    console.log('\n=== Phase 2: Search Grounding ===')
    for (const domain of domainsToRun) {
      console.log(`\n  [SEARCH] ${domain.code}`)
      const geos = GLOBAL_DOMAINS.includes(domain.code) ? [...GEOGRAPHIES, 'Global'] : GEOGRAPHIES
      for (const geo of geos) {
        for (let i = 0; i < ITEMS_PER_DOMAIN; i++) {
          total += await scrapeGrounded(domain, geo, existing, false)
          await sleep(DELAY_MS)
        }
      }
      await sleep(3000)
    }
    // Global intelligence topics
    for (const topic of GLOBAL_TOPICS) {
      console.log(`\n  [GLOBAL] ${topic.code}`)
      for (let i = 0; i < 3; i++) {
        total += await scrapeGrounded(topic, 'Global', existing, true)
        await sleep(DELAY_MS)
      }
    }
    for (const topic of newsToRun) {
      console.log(`\n  [NEWS] ${topic.code}`)
      const newsGeos = GLOBAL_DOMAINS.includes(topic.code) ? [...GEOGRAPHIES, 'Global'] : GEOGRAPHIES
      for (const geo of newsGeos) {
        for (let i = 0; i < Math.min(ITEMS_PER_DOMAIN, 2); i++) {
          total += await scrapeGrounded(topic, geo, existing, true)
          await sleep(DELAY_MS)
        }
      }
    }
  }

  const elapsed = ((Date.now() - start) / 60000).toFixed(1)
  console.log(`\n=== COMPLETE: ${total} real items in ${elapsed} min ===`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
