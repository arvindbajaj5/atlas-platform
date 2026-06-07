// feed-discovery.js — ATLAS Feed Discovery & Health Check
// Runs weekly to find new RSS feeds and assess health of existing ones

import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js'

const GEMINI_KEY   = process.env.GEMINI_API_KEY
const SB_URL       = process.env.SUPABASE_URL
const SB_KEY       = process.env.SUPABASE_KEY
const MODE         = process.env.MODE || 'both'
const DOMAINS_OVERRIDE = process.env.DOMAINS_OVERRIDE || ''

const GROUNDING_MODEL = 'gemini-3.5-flash'
const DELAY_MS = 2000

const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

if (!GEMINI_KEY || !SB_URL || !SB_KEY) {
  console.error('Missing required env vars: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY')
  process.exit(1)
}

// All domains we cover
const ALL_DOMAINS = [
  { code:'GOV-GOV', name:'Indian Government & Policy AI' },
  { code:'DEF-MIL', name:'Indian Defence & Military AI' },
  { code:'DEF-SPC', name:'Indian Space & ISRO AI' },
  { code:'GEO-SPA', name:'Geospatial & Earth Observation AI India' },
  { code:'TEC-GEN', name:'AI & Technology India' },
  { code:'MKT-HPC', name:'HPC & AI Infrastructure India' },
  { code:'MKT-DEF', name:'Defence Market India' },
  { code:'MKT-SOV', name:'Sovereign AI India' },
  { code:'FIN-BFS', name:'Financial Services AI India' },
  { code:'HLT-LIF', name:'Healthcare & Life Sciences AI India' },
]

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function sbFetch(table, params) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, { headers: SB_HEADERS })
  if (!r.ok) return []
  return r.json()
}

async function sbInsert(table, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal,resolution=ignore-duplicates' },
    body: JSON.stringify(data)
  })
  return r.ok
}

async function sbUpdate(table, filter, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  })
  return r.ok
}

// ── Gemini search grounding ───────────────────────────────────────────────────
async function geminiSearch(prompt) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
  }
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GROUNDING_MODEL}:generateContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!r.ok) { console.log(`    WARN HTTP ${r.status}`); return '' }
  const data = await r.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  return parts.filter(p => p.text && !p.thought).map(p => p.text).join('') || ''
}

// ── Health check existing feeds ───────────────────────────────────────────────
async function checkFeedHealth() {
  console.log('\n=== FEED HEALTH CHECK ===')
  const feeds = await sbFetch('feed_library', 'status=neq.dropped&order=last_checked.asc.nullsfirst&limit=50')
  console.log(`Checking ${feeds.length} feeds...`)

  let activated = 0, dormanted = 0

  for (const feed of feeds) {
    process.stdout.write(`  [${feed.status.toUpperCase()}] ${feed.name}: `)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const r = await fetch(feed.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ATLASBot/1.0)' }
      })
      clearTimeout(timeout)

      if (r.ok) {
        const text = await r.text()
        // Try parsing as XML
        let itemCount = 0
        try {
          const parsed = await parseStringPromise(text)
          const items = parsed?.rss?.channel?.[0]?.item || parsed?.feed?.entry || []
          itemCount = items.length
        } catch(e) { /* not valid XML */ }

        console.log(`OK (${r.status}) — ${itemCount} items`)

        // Update metrics
        const newSuccessCount = (feed.success_count || 0) + 1
        const newRunCount = (feed.run_count || 0) + 1
        const newAccessRate = newSuccessCount / newRunCount

        const updates = {
          last_checked: new Date().toISOString(),
          last_success: new Date().toISOString(),
          run_count: newRunCount,
          success_count: newSuccessCount,
          access_rate: newAccessRate,
        }

        // Re-activate dormant feeds that are now accessible
        if (feed.status === 'dormant' && newAccessRate > 0.5) {
          updates.status = 'active'
          updates.dormant_since = null
          console.log(`    -> REACTIVATED`)
          activated++
        }

        await sbUpdate('feed_library', `id=eq.${feed.id}`, updates)
      } else {
        console.log(`FAIL (${r.status})`)
        await handleFeedFailure(feed)
        if (feed.status === 'active') dormanted++
      }
    } catch(e) {
      console.log(`ERROR: ${e.message.slice(0, 50)}`)
      await handleFeedFailure(feed)
      if (feed.status === 'active') dormanted++
    }
    await new Promise(r => setTimeout(r, 500))
  }
  console.log(`\nHealth check done: ${activated} reactivated, ${dormanted} dormanted`)
}

async function handleFeedFailure(feed) {
  const newRunCount = (feed.run_count || 0) + 1
  const newAccessRate = (feed.success_count || 0) / newRunCount
  const updates = {
    last_checked: new Date().toISOString(),
    run_count: newRunCount,
    access_rate: newAccessRate,
  }
  // Dormant after 3+ failures with < 30% access rate
  if (feed.status === 'active' && newRunCount >= 3 && newAccessRate < 0.3) {
    updates.status = 'dormant'
    updates.dormant_since = new Date().toISOString()
  }
  // Drop after dormant for 4+ weeks
  if (feed.status === 'dormant' && feed.dormant_since) {
    const dormantDays = (Date.now() - new Date(feed.dormant_since).getTime()) / (1000 * 60 * 60 * 24)
    if (dormantDays > 28) {
      updates.status = 'dropped'
      console.log(`    -> DROPPED (dormant ${Math.round(dormantDays)} days)`)
    }
  }
  await sbUpdate('feed_library', `id=eq.${feed.id}`, updates)
}

// ── Discover new feeds ────────────────────────────────────────────────────────
async function discoverFeeds() {
  console.log('\n=== FEED DISCOVERY ===')

  const domains = DOMAINS_OVERRIDE
    ? ALL_DOMAINS.filter(d => DOMAINS_OVERRIDE.split(',').map(s => s.trim()).includes(d.code))
    : ALL_DOMAINS

  // Get existing URLs to avoid duplicates
  const existing = await sbFetch('feed_library', 'select=url&status=neq.dropped')
  const existingUrls = new Set(existing.map(f => f.url.toLowerCase()))

  let discovered = 0

  for (const domain of domains) {
    console.log(`\n  [DISCOVER] ${domain.code} — ${domain.name}`)
    await new Promise(r => setTimeout(r, DELAY_MS))

    const prompt = `Find 3 RSS feed URLs that publish news about "${domain.name}".
Requirements:
- Must be real, currently active RSS/Atom feeds
- Preferably Indian sources for government/defence/market domains
- The feed URL must end in .rss, .xml, /feed, /rss, or similar
- Return ONLY valid RSS feed URLs, one per line
- No commentary, no markdown, just URLs
Example format:
https://example.com/rss
https://news.example.org/feed.xml`

    const response = await geminiSearch(prompt)
    if (!response) continue

    // Extract URLs from response
    const urls = response.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('http') && (l.includes('rss') || l.includes('feed') || l.includes('.xml')))

    for (const url of urls.slice(0, 3)) {
      if (existingUrls.has(url.toLowerCase())) {
        console.log(`    dup: ${url.slice(0, 60)}`)
        continue
      }

      // Validate the feed
      process.stdout.write(`    Checking: ${url.slice(0, 55)}... `)
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const r = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ATLASBot/1.0)' }
        })
        clearTimeout(timeout)

        if (!r.ok) { console.log(`FAIL (${r.status})`); continue }
        const text = await r.text()

        // Validate XML
        let itemCount = 0
        try {
          const parsed = await parseStringPromise(text)
          const items = parsed?.rss?.channel?.[0]?.item || parsed?.feed?.entry || []
          itemCount = items.length
        } catch(e) { console.log(`INVALID XML`); continue }

        if (itemCount === 0) { console.log(`EMPTY`); continue }
        console.log(`OK (${itemCount} items)`)

        // Add to feed library
        const ok = await sbInsert('feed_library', {
          url,
          name: url.split('/')[2].replace('www.', ''),
          domain_codes: [domain.code],
          language: 'en',
          status: 'active',
          added_by: 'discovery',
          notes: `Auto-discovered for ${domain.code}`,
          access_rate: 1.0,
          run_count: 1,
          success_count: 1,
          last_checked: new Date().toISOString(),
          last_success: new Date().toISOString(),
        })

        if (ok) {
          existingUrls.add(url.toLowerCase())
          discovered++
          console.log(`    -> ADDED to feed library`)
        }
      } catch(e) {
        console.log(`ERROR: ${e.message.slice(0, 40)}`)
      }
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  console.log(`\nDiscovery done: ${discovered} new feeds added`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== ATLAS Feed Discovery & Health Check ===')
  console.log(`Mode: ${MODE}`)

  if (MODE === 'health' || MODE === 'both') {
    await checkFeedHealth()
  }
  if (MODE === 'discover' || MODE === 'both') {
    await discoverFeeds()
  }

  console.log('\n=== DONE ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
