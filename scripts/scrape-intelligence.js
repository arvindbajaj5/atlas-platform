// ATLAS Intelligence Scraper — GitHub Actions Script
// Version: 1.3
// Runs on Node.js 20, writes directly to Supabase
// Mirrors the browser scraper architecture exactly

import fetch from 'node-fetch'

// ── Config ───────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SUPABASE_URL   = process.env.SUPABASE_URL
const SUPABASE_KEY   = process.env.SUPABASE_KEY
const ITEMS_PER_DOMAIN = parseInt(process.env.ITEMS_PER_DOMAIN || '5')
const RUN_ENRICHMENT   = process.env.RUN_ENRICHMENT !== 'false'
const DOMAINS_OVERRIDE = process.env.DOMAINS_OVERRIDE || ''
const MODEL = process.env.SCRAPE_MODEL || 'gemini-3.1-flash-lite'  // Set via GitHub secret SCRAPE_MODEL or defaults to lite
const DELAY_MS = 2000  // delay between API calls

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required env vars: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY')
  process.exit(1)
}

// ── Domain taxonomy ──────────────────────────────────────────────────────────
const DOMAINS = [
  { code: 'GOV-GOV', name: 'Government & Governance',          focus: 'Indian central and state government AI adoption, e-governance, digital India, citizen services, smart cities' },
  { code: 'DEF-MIL', name: 'Defence — Armed Forces',           focus: 'Indian Army, Navy, Air Force, DPSUs, DRDO combat systems, autonomous weapons, military AI' },
  { code: 'DEF-SPC', name: 'Defence — Space & Satellite',      focus: 'ISRO, IN-SPACe, Defence Space Agency, military satellite building, launch vehicles, space situational awareness' },
  { code: 'DEF-HLS', name: 'Defence — Homeland Security',      focus: 'BSF, CRPF, paramilitary forces, border security, surveillance networks, critical infrastructure protection' },
  { code: 'DEF-INT', name: 'Defence — Intelligence & Signals', focus: 'SIGINT, IMINT, cryptanalysis, intelligence agencies, cyber intelligence, signal processing AI' },
  { code: 'GEO-SPA', name: 'Geospatial & Earth Observation',   focus: 'NRSC, Survey of India, Pixxel, MapMyIndia, civilian EO platforms, GIS, Bhuvan, commercial satellite data' },
  { code: 'INF-CIV', name: 'Critical Infrastructure',          focus: 'Ports, airports, railways, civil aviation, DGCA, AAI, Indian Railways, metro systems, road infrastructure AI' },
  { code: 'RES-NAT', name: 'Natural Resources',                focus: 'Oil and gas, mines, water resources, ONGC, Coal India, forestry, MOEF, geological survey AI' },
  { code: 'TEL-NET', name: 'Telecom & Networks',               focus: 'Reliance Jio, Airtel, BSNL, C-DOT, DoT, 5G AI, network optimisation, telecom AI India' },
  { code: 'TEC-GEN', name: 'Technology',                       focus: 'IT services, cloud providers, tech companies, AI platforms, SaaS, TCS, Infosys, Wipro AI' },
  { code: 'MED-BRD', name: 'Media & Broadcast',               focus: 'OTT platforms, news media, broadcast, content AI, Prasar Bharati, NDTV, Zee, Sony AI' },
  { code: 'FIN-BFS', name: 'Banking & Financial Services',     focus: 'PSBs, private banks, RBI, SEBI, insurance, fintech, payments, fraud detection, credit AI India' },
  { code: 'MFG-IND', name: 'Manufacturing & Industry',         focus: 'Industry 4.0, MSME, automotive, aerospace, SAMARTH Udyog Bharat, predictive maintenance India' },
  { code: 'ENR-UTL', name: 'Energy & Utilities',               focus: 'Power grids, renewables, NTPC, PGCIL, smart grid, solar energy AI, oil refining automation India' },
  { code: 'REG-AIP', name: 'Regional AI Programmes',           focus: 'State CoEs, IndiaAI Mission, AI Cities, Maharashtra AI Mission, Tamil Nadu AI, regional compute hubs' },
  { code: 'LAB-AIR', name: 'AI Labs & Research',               focus: 'IITs, DRDO labs, IISER, private AI research, AI startups India, research publications, benchmarks' },
  { code: 'HLT-LIF', name: 'Healthcare & Life Sciences',       focus: 'AIIMS, diagnostic AI, pharma, hospital technology, genomics, medical imaging, health data AI India' },
]

const NEWS_TOPICS = [
  { code: 'MKT-HPC', name: 'AI & HPC in India',           focus: 'AI and HPC market developments, investments, deployments, vendor activity India 2026' },
  { code: 'MKT-COM', name: 'Competitor & Vendor Activity', focus: 'NVIDIA, AMD, Intel, HPE, Dell, Atos, Lenovo wins and announcements India HPC AI 2026' },
  { code: 'MKT-TND', name: 'Government AI Tenders',        focus: 'India government AI RFPs, GeM tenders, procurement signals, budget allocations 2026' },
  { code: 'MKT-DEF', name: 'Defence Technology News',      focus: 'India military AI, DRDO, DPSUs, defence tech, autonomous systems, MoD programmes 2026' },
  { code: 'MKT-SOV', name: 'Sovereign AI & Policy',        focus: 'Data localisation, on-premise mandates, DPDP Act, sovereign AI policy India 2026' },
]

const STREAM_TYPES = [
  {
    stream: 'market_pulse',
    label: 'Market Pulse',
    angle: 'Indian and APAC market developments — tenders, contracts, vendor wins, government procurement, budget allocations',
    scope: 'India and Asia-Pacific only. Recent and specific. Name actual organisations, tender numbers, contract values where known.'
  },
  {
    stream: 'domain_intel',
    label: 'Domain Intelligence',
    angle: 'global use cases, AI architectures, deployment patterns, proven solutions, and emerging applications',
    scope: 'Global — US, Europe, Middle East, and India. What specific problems are being solved. What AI approaches are working. What infrastructure is needed.'
  },
  {
    stream: 'tech_watch',
    label: 'Technology Watch',
    angle: 'emerging technology capabilities, new AI model types, infrastructure patterns, and hardware trends relevant to this domain',
    scope: 'Global technology developments. New capabilities from research labs and vendors. Infrastructure shifts. What is becoming possible that was not before.'
  }
]

// ── Gemini API ───────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
  }
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Gemini error ${r.status}: ${err.slice(0, 200)}`)
  }
  const data = await r.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const usage = data.usageMetadata || {}
  return { text, inTokens: usage.promptTokenCount || 0, outTokens: usage.candidatesTokenCount || 0 }
}

// ── JSON extraction ──────────────────────────────────────────────────────────
function extractJSON(raw) {
  let text = raw.trim().replace(/^[\s\uFEFF\u200B]+/, '')
  // Strip markdown fences
  const fence = '```'
  if (text.includes(fence)) {
    const parts = text.split(fence)
    for (const p of parts) {
      const t = p.startsWith('json') ? p.slice(4).trim() : p.trim()
      if (t.startsWith('{') || t.startsWith('[')) { text = t; break }
    }
  }
  // Find first {
  const first = text.indexOf('{')
  if (first < 0) return null
  text = text.slice(first)

  // Method 1: direct parse
  try { return JSON.parse(text) } catch {}
  try { return JSON.parse('[' + text + ']')[0] } catch {}

  // Method 2: brace matching
  let depth = 0, start = -1
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{') { if (depth === 0) start = i; depth++ }
    else if (raw[i] === '}') { depth--; if (depth === 0 && start >= 0) { try { return JSON.parse(raw.slice(start, i+1)) } catch {} } }
  }

  // Method 3: truncation recovery
  let partial = text
  let open = 0, close = 0
  for (const c of partial) { if (c === '{') open++; else if (c === '}') close++ }
  const trailing = partial.slice(-50)
  const quotes = (trailing.match(/(?<!\\)"/g) || []).length
  if (quotes % 2 !== 0) partial += '"'
  const openArr = (partial.match(/\[/g) || []).length
  const closeArr = (partial.match(/\]/g) || []).length
  for (let i = 0; i < openArr - closeArr; i++) partial += ']'
  for (let i = 0; i < open - close; i++) partial += '}'
  try { const r = JSON.parse(partial); if (r.title) return r } catch {}

  return null
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function sbUpsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=ignore-duplicates,return=minimal'
    },
    body: JSON.stringify(data)
  })
  if (!r.ok) {
    const err = await r.text()
    console.error(`  SB error ${r.status} [${table}]: ${err.slice(0, 150)}`)
    return false
  }
  return true
}

async function sbPatch(table, filter, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  })
  return r.ok
}

async function getExistingTitles(domainCode) {
  // Only dedup against last 18 months — older intel is stale, allow re-scraping
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 18)
  const cutoffStr = cutoff.toISOString()
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/intelligence_items?domain_code=eq.${domainCode}&scraped_at=gte.${cutoffStr}&select=title&limit=500`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  )
  if (!r.ok) return new Set()
  const rows = await r.json()
  return new Set(rows.map(r => (r.title || '').toLowerCase().trim()))
}

// ── Scrape one domain ────────────────────────────────────────────────────────
async function scrapeDomain(domain) {
  console.log(`\n  Scraping ${domain.code} — ${domain.name}`)
  const existing = await getExistingTitles(domain.code)
  const usedTitles = []
  let added = 0
  let totalIn = 0, totalOut = 0

  for (let i = 0; i < ITEMS_PER_DOMAIN; i++) {
    const st = STREAM_TYPES[i % STREAM_TYPES.length]
    const avoidStr = usedTitles.length > 0 ? ` Do NOT cover: ${usedTitles.slice(-3).join('; ')}.` : ''

    const prompt = `You are a senior intelligence analyst for an AI and HPC hardware OEM.`
      + ` Generate ONE intelligence item about ${st.angle} for the following sector.`
      + ` SECTOR: ${domain.name}. FOCUS: ${domain.focus}.`
      + ` Geographic scope: ${st.scope}${avoidStr}`
      + ` Keep summary under 80 words. All string values concise.`
      + ` Use ONLY these exact field names: title, summary, type, intelligence_value, organisations, tags, opportunity, competitor_signals, uc_suggest, confidence.`
      + ` Respond with a SINGLE JSON object only. Start with { end with }. No markdown. No backticks.`

    try {
      await sleep(DELAY_MS)
      const { text, inTokens, outTokens } = await callGemini(prompt)
      totalIn += inTokens; totalOut += outTokens

      const item = extractJSON(text)
      if (!item || !item.title) {
        console.log(`  [${domain.code}] ${st.label} ${i+1}/${ITEMS_PER_DOMAIN}: no item extracted`)
        continue
      }

      // Dedup check
      if (existing.has(item.title.toLowerCase().trim())) {
        console.log(`  [${domain.code}] duplicate skipped: ${item.title.slice(0, 40)}`)
        continue
      }

      const id = `intel-${domain.code.replace(/-/g,'')}-${Date.now()}-${i}-${Math.floor(Math.random()*9999)}`
      const row = {
        id,
        domain_code: domain.code,
        domain_name: domain.name,
        source_type: 'domain',
        intelligence_stream: st.stream,
        title: (item.title || '').slice(0, 500),
        summary: (item.summary || '').slice(0, 1000),
        type: item.type || '',
        intelligence_value: item.intelligence_value || item.urgency || 'medium',
        organisations: Array.isArray(item.organisations) ? item.organisations : (item.organisations ? [item.organisations] : []),
        tags: Array.isArray(item.tags) ? item.tags : [],
        opportunity: (item.opportunity || '').slice(0, 500),
        competitor_signals: (item.competitor_signals || '').slice(0, 500),
        uc_suggest: (item.uc_suggest || '').slice(0, 200),
        confidence: item.confidence || 'medium',
        scraped_at: new Date().toISOString(),
        scraped_by: 'github-actions'
      }

      const ok = await sbUpsert('intelligence_items', row)
      if (ok) {
        console.log(`  [${domain.code}] ${st.label} ${i+1}: ${item.title.slice(0, 50)}`)
        usedTitles.push(item.title)
        existing.add(item.title.toLowerCase().trim())
        added++

        // UC queue
        if (item.uc_suggest) {
          await sbUpsert('uc_queue', {
            id: `uc-${id}`,
            uc_name: item.uc_suggest,
            cluster: '',
            rationale: `From ${domain.name} scrape (${st.label})`,
            source_intel_id: id,
            source_title: item.title,
            domain_code: domain.code,
            status: 'pending',
            suggested_at: new Date().toISOString()
          })
        }

        // Enrichment
        if (RUN_ENRICHMENT) {
          await sleep(1500)
          await enrichItem(row)
        }
      }
    } catch (err) {
      console.error(`  [${domain.code}] item ${i+1} error: ${err.message.slice(0, 80)}`)
    }
  }

  console.log(`  ${domain.code}: ${added} items added | tokens: in=${totalIn} out=${totalOut}`)
  return added
}

// ── Scrape news topics ───────────────────────────────────────────────────────
async function scrapeNews(topic) {
  console.log(`\n  Scraping news: ${topic.code} — ${topic.name}`)
  const existing = await getExistingTitles(topic.code)
  const usedTitles = []
  let added = 0

  const newsAngles = [
    'contract awards and vendor wins',
    'government tenders and RFPs',
    'policy and regulatory developments',
    'technology partnerships and MoUs',
    'market investments and funding',
    'product launches and announcements',
    'competitive moves and market shifts',
    'procurement patterns and budget signals',
  ]

  for (let j = 0; j < ITEMS_PER_DOMAIN; j++) {
    const angle = newsAngles[j % newsAngles.length]
    const avoidStr = usedTitles.length > 0 ? ` Do NOT repeat: ${usedTitles.slice(-3).join('; ')}.` : ''

    const prompt = `You are a market intelligence analyst for an AI and HPC hardware OEM.`
      + ` Generate ONE market intelligence item about ${angle} related to: ${topic.name}. FOCUS: ${topic.focus}.`
      + ` Be specific — name real organisations and deals. Keep summary under 80 words.${avoidStr}`
      + ` Use ONLY these field names: title, summary, type, intelligence_value, organisations, tags, opportunity, competitor_signals, uc_suggest, confidence.`
      + ` Respond with a SINGLE JSON object only. Start with { end with }. No markdown. No backticks.`

    try {
      await sleep(DELAY_MS)
      const { text, inTokens, outTokens } = await callGemini(prompt)
      const item = extractJSON(text)
      if (!item || !item.title) continue
      if (existing.has(item.title.toLowerCase().trim())) continue

      const id = `news-${topic.code.replace(/-/g,'')}-${Date.now()}-${j}-${Math.floor(Math.random()*9999)}`
      const ok = await sbUpsert('intelligence_items', {
        id,
        domain_code: topic.code,
        topic_code: topic.code,
        topic_name: topic.name,
        source_type: 'news',
        intelligence_stream: 'market_pulse',
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
        scraped_by: 'github-actions'
      })

      if (ok) {
        console.log(`  [${topic.code}] ${j+1}: ${item.title.slice(0, 50)}`)
        usedTitles.push(item.title)
        existing.add(item.title.toLowerCase().trim())
        added++
      }
    } catch (err) {
      console.error(`  [${topic.code}] item ${j+1} error: ${err.message.slice(0, 80)}`)
    }
  }

  console.log(`  ${topic.code}: ${added} items added`)
  return added
}

// ── Enrichment ───────────────────────────────────────────────────────────────
async function enrichItem(item) {
  const prompt = `You are a senior intelligence analyst. Enrich the following intelligence item.`
    + ` INPUT: title="${(item.title||'').slice(0,80)}" summary="${(item.summary||'').slice(0,200)}" domain=${item.domain_code} stream=${item.intelligence_stream}.`
    + ` Respond with a SINGLE JSON object using ONLY these fields:`
    + ` problem_statement (1-2 sentences), technical_context (AI architecture and infrastructure),`
    + ` infrastructure_signals (array of 3-5 strings like edge/central/air-gapped/gpu/cpu),`
    + ` uc_name (specific use case name or empty string), uc_cluster (cluster name or empty),`
    + ` uc_hardware (hardware needed or empty), depth_score (integer 1-10).`
    + ` Start with { end with }. No markdown.`

  try {
    const { text } = await callGemini(prompt)
    const enriched = extractJSON(text)
    if (!enriched) return

    await sbPatch('intelligence_items', `id=eq.${item.id}`, {
      problem_statement: enriched.problem_statement || '',
      technical_context: enriched.technical_context || '',
      infrastructure_signals: Array.isArray(enriched.infrastructure_signals) ? enriched.infrastructure_signals : [],
      uc_extracted: {
        uc_name: enriched.uc_name || '',
        uc_cluster: enriched.uc_cluster || '',
        uc_hardware: enriched.uc_hardware || ''
      },
      depth_score: parseInt(enriched.depth_score) || 5,
      enriched_at: new Date().toISOString()
    })

    if (enriched.uc_name) {
      await sbUpsert('uc_queue', {
        id: `uc-enrich-${item.id}`,
        uc_name: enriched.uc_name,
        cluster: enriched.uc_cluster || '',
        rationale: `Enrichment: ${enriched.uc_hardware || ''}`,
        source_intel_id: item.id,
        source_title: item.title,
        domain_code: item.domain_code,
        status: 'pending',
        suggested_at: new Date().toISOString()
      })
    }
    console.log(`    Enriched: ${(item.title||'').slice(0,40)} (depth=${enriched.depth_score||'?'})`)
  } catch (err) {
    console.error(`    Enrich failed: ${err.message.slice(0, 60)}`)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== ATLAS Intelligence Scraper v1.3 (GitHub Actions) ===')
  console.log(`Model: ${MODEL}`)
  console.log(`Items per domain: ${ITEMS_PER_DOMAIN}`)
  console.log(`Enrichment: ${RUN_ENRICHMENT}`)

  // Determine which domains to scrape
  let domainsToScrape = DOMAINS
  let newsToScrape = NEWS_TOPICS
  if (DOMAINS_OVERRIDE) {
    const codes = DOMAINS_OVERRIDE.split(',').map(s => s.trim().toUpperCase())
    domainsToScrape = DOMAINS.filter(d => codes.includes(d.code))
    newsToScrape = NEWS_TOPICS.filter(t => codes.includes(t.code))
    console.log(`Running for: ${codes.join(', ')}`)
  } else {
    console.log(`Running all ${domainsToScrape.length} domains + ${newsToScrape.length} news topics`)
  }

  let totalAdded = 0
  const start = Date.now()

  // Scrape domains
  for (const domain of domainsToScrape) {
    const added = await scrapeDomain(domain)
    totalAdded += added
    await sleep(3000)  // pause between domains
  }

  // Scrape news topics
  for (const topic of newsToScrape) {
    const added = await scrapeNews(topic)
    totalAdded += added
    await sleep(3000)
  }

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1)
  console.log(`\n=== COMPLETE: ${totalAdded} items added in ${elapsed} minutes ===`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
