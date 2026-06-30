/**
 * atlas-db.js — ATLAS Shared Database Utility Module v1.0
 * =========================================================
 * Single source for ALL Supabase interactions across ATLAS tools.
 * No tool ever builds its own fetch() to Supabase.
 * No tool ever defines its own getSB() or status translation.
 *
 * Usage:
 *   <script src="https://arvindbajaj5.github.io/atlas-platform/shared/atlas-db.js"></script>
 *   atlasDB.init()                            // call once on startup (reads localStorage)
 *   var rows = await atlasDB.get('docket_items', 'docket_id=eq.123&order=created_at.desc')
 *   var ok   = await atlasDB.post('docket_items', { id: 'x', ... })
 *   var ok   = await atlasDB.patch('docket_items', 'id=eq.x', { title: 'new' })
 *   var ok   = await atlasDB.delete('docket_items', 'id=eq.x')
 *   var ok   = await atlasDB.upsert('docket_items', { id: 'x', ... }, 'id')
 *
 * Public API (window.atlasDB):
 *   .init()                       reads SB credentials from localStorage
 *   .get(table, params, limit)    SELECT — returns array (empty on error)
 *   .getOne(table, params)        SELECT single row — returns object or null
 *   .post(table, data, prefer)    INSERT — returns {ok, status, error}
 *   .patch(table, match, data)    UPDATE — returns {ok, status, error}
 *   .delete(table, match)         DELETE — returns {ok, status, error}
 *   .upsert(table, data, onConflict) UPSERT — returns {ok, status, error}
 *   .deleteAndInsert(table, match, data) DELETE then INSERT — returns {ok}
 *   .toDbStatus(uiStatus)         translate UI label → DB value
 *   .fromDbStatus(section, dbStatus) translate DB value → UI label
 *   .normalizeItems(items)        apply fromDbStatus to all items in array
 *   .parseContent(item)           parse item.content if stored as string
 *   .genId(prefix)                generate a unique ID string
 *   .esc(str)                     HTML-escape a string for safe rendering
 *   .isConfigured()               true if SB URL and key are set
 *   .ready                        true after init() has run
 *
 * Error handling:
 *   - get/getOne always return empty value on error (never throw)
 *   - post/patch/delete/upsert return {ok: false, status, error} on failure
 *   - All errors logged to console with [atlasDB] prefix
 *   - Never swallows errors silently — always logs
 *
 * Blueprint reference: Section 15 (Development Conventions), Section 25 (Database)
 */

;(function (global) {
  'use strict'

  // ── Internal state ───────────────────────────────────────────────────────────
  var _url   = ''
  var _key   = ''
  var _ready = false

  // ── Status translation tables ────────────────────────────────────────────────
  // Canonical mapping between UI display labels and Supabase DB values.
  // docket_items.status CHECK constraint: pending|in_progress|done|closed
  // These are the ONLY valid DB values — never write other values.

  var _UI_TO_DB = {
    // Generic
    proposed:    'pending',
    agreed:      'done',
    scratched:   'closed',
    active:      'pending',
    open:        'pending',
    wip:         'in_progress',
    blocked:     'closed',
    // Pass-through (already DB values)
    pending:     'pending',
    in_progress: 'in_progress',
    done:        'done',
    closed:      'closed'
  }

  var _DB_TO_UI = {
    uc: {
      pending:     'proposed',
      in_progress: 'proposed',
      done:        'agreed',
      closed:      'scratched'
    },
    action: {
      pending:     'open',
      in_progress: 'wip',
      done:        'done',
      closed:      'blocked'
    },
    strategy: {
      pending:     'active',
      in_progress: 'active',
      done:        'active',
      closed:      'active'
    },
    requirement: {
      pending:     'active',
      in_progress: 'active',
      done:        'accepted',
      closed:      'dropped'
    }
  }

  // ── Credential helpers ────────────────────────────────────────────────────────

  function _loadCredentials() {
    try {
      // Support multiple localStorage key formats used across tools
      var g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}')
      _url = g.sbUrl || g.sb_url || ''
      _key = g.sbKey || g.sb_key || ''
    } catch (e) {
      console.warn('[atlasDB] Could not read credentials from localStorage:', e.message)
      _url = ''
      _key = ''
    }
  }

  /**
   * Supabase key format detection.
   * Legacy JWT keys (anon/service_role) start with 'eyJ' and must be sent
   * in BOTH apikey and Authorization: Bearer headers.
   * New-format keys (sb_publishable_..., sb_secret_...) are NOT JWTs —
   * Supabase rejects them if sent in Authorization: Bearer. They must be
   * sent in the apikey header ONLY.
   * Reference: https://supabase.com/docs/guides/api/api-keys
   */
  function _isLegacyJwtKey(key) {
    return /^eyJ/.test(key || '')
  }

  function _headers(extra) {
    var h = {
      'apikey':       _key,
      'Content-Type': 'application/json'
    }
    if (_isLegacyJwtKey(_key)) {
      // Legacy anon/service_role JWT — required in Authorization header too
      h['Authorization'] = 'Bearer ' + _key
    }
    // New-format sb_publishable_/sb_secret_ keys: apikey header only.
    // Sending them in Authorization: Bearer causes HTTP 401 (not a valid JWT).
    if (extra) Object.assign(h, extra)
    return h
  }

  function _baseUrl(table) {
    return _url + '/rest/v1/' + table
  }

  // ── Logging ──────────────────────────────────────────────────────────────────

  function _log(msg) {
    console.log('[atlasDB]', msg)
  }

  function _warn(msg, err) {
    if (err) {
      console.warn('[atlasDB]', msg, err)
    } else {
      console.warn('[atlasDB]', msg)
    }
  }

  function _error(msg, status, body) {
    console.error('[atlasDB]', msg, 'status=' + status, body ? body.slice(0, 200) : '')
  }

  // ── Core request helper ──────────────────────────────────────────────────────

  async function _request(method, url, body, headers) {
    if (!_url || !_key) {
      _warn('Supabase not configured — skipping ' + method + ' ' + url.split('/rest/v1/')[1])
      return { ok: false, status: 0, error: 'not_configured', data: null }
    }
    try {
      var opts = { method: method, headers: _headers(headers) }
      if (body !== undefined) opts.body = JSON.stringify(body)
      var r = await fetch(url, opts)
      var text = ''
      try { text = await r.text() } catch (e) { text = '' }
      if (!r.ok) {
        _error(method + ' ' + url.split('/rest/v1/')[1], r.status, text)
        return { ok: false, status: r.status, error: text, data: null }
      }
      var data = null
      if (text) {
        try { data = JSON.parse(text) } catch (e) { data = text }
      }
      return { ok: true, status: r.status, error: null, data: data }
    } catch (e) {
      _warn(method + ' ' + url.split('/rest/v1/')[1] + ' exception', e.message)
      return { ok: false, status: 0, error: e.message, data: null }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  var atlasDB = {}

  /**
   * init() — load credentials from localStorage. Call once on page load.
   */
  atlasDB.init = function () {
    _loadCredentials()
    _ready = true
    if (_url) {
      _log('Initialised — ' + _url.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co')
    } else {
      _warn('No Supabase URL found — configure in Settings')
    }
    return atlasDB
  }

  /**
   * isConfigured() — true if credentials are set
   */
  atlasDB.isConfigured = function () {
    return !!((_url || '') && (_key || ''))
  }

  Object.defineProperty(atlasDB, 'ready', { get: function () { return _ready } })

  /**
   * get(table, params, limit) — SELECT rows
   * Returns: array of rows (empty array on error — never throws)
   * params: Supabase filter string e.g. 'docket_id=eq.123&order=created_at.desc'
   * limit: max rows (default 200)
   */
  atlasDB.get = async function (table, params, limit) {
    if (!_url || !_key) return []
    try {
      var url = _baseUrl(table) + '?' + (params || '')
      url += '&limit=' + (limit || 200)
      var r = await fetch(url, { headers: _headers() })
      if (!r.ok) {
        var txt = await r.text().catch(function () { return '' })
        _error('GET ' + table, r.status, txt)
        return []
      }
      return await r.json()
    } catch (e) {
      _warn('GET ' + table + ' exception', e.message)
      return []
    }
  }

  /**
   * getOne(table, params) — SELECT single row
   * Returns: first matching row object, or null
   */
  atlasDB.getOne = async function (table, params) {
    var rows = await atlasDB.get(table, params, 1)
    return (rows && rows.length > 0) ? rows[0] : null
  }

  /**
   * post(table, data, prefer) — INSERT row(s)
   * prefer: 'return=minimal' (default) | 'return=representation' | 'resolution=merge-duplicates'
   * Returns: {ok, status, error, data}
   */
  atlasDB.post = async function (table, data, prefer) {
    var url = _baseUrl(table)
    return await _request('POST', url, data, {
      'Prefer': prefer || 'return=minimal'
    })
  }

  /**
   * patch(table, match, data) — UPDATE matching rows
   * match: Supabase filter string e.g. 'id=eq.xyz'
   * Returns: {ok, status, error}
   */
  atlasDB.patch = async function (table, match, data) {
    var url = _baseUrl(table) + '?' + match
    return await _request('PATCH', url, data, {
      'Prefer': 'return=minimal'
    })
  }

  /**
   * delete(table, match) — DELETE matching rows
   * match: Supabase filter string e.g. 'id=eq.xyz'
   * Returns: {ok, status, error}
   */
  atlasDB.delete = async function (table, match) {
    var url = _baseUrl(table) + '?' + match
    return await _request('DELETE', url, undefined, undefined)
  }

  /**
   * upsert(table, data, onConflict) — INSERT or UPDATE on conflict
   * onConflict: column name for conflict resolution e.g. 'id'
   * Returns: {ok, status, error, data}
   */
  atlasDB.upsert = async function (table, data, onConflict) {
    var url = _baseUrl(table)
    if (onConflict) url += '?on_conflict=' + onConflict
    return await _request('POST', url, data, {
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    })
  }

  /**
   * deleteAndInsert(table, match, data) — DELETE then INSERT (clean replace)
   * Used for items that are fully replaced on save (e.g. maas_config, portfolio_selection)
   * Returns: {ok, deleteStatus, insertStatus, error}
   */
  atlasDB.deleteAndInsert = async function (table, match, data) {
    var delResult = await atlasDB.delete(table, match)
    // 404 on delete is acceptable — item may not have existed yet
    if (!delResult.ok && delResult.status !== 0 && delResult.status !== 404) {
      return { ok: false, error: 'delete failed: ' + delResult.error, deleteStatus: delResult.status }
    }
    var insResult = await atlasDB.post(table, data)
    return {
      ok:           insResult.ok,
      deleteStatus: delResult.status,
      insertStatus: insResult.status,
      error:        insResult.error
    }
  }

  /**
   * rpc(fnName, params) — call a Supabase RPC function (e.g. pgvector similarity search)
   * Returns: {ok, data, error}
   */
  atlasDB.rpc = async function (fnName, params) {
    var url = _url + '/rest/v1/rpc/' + fnName
    return await _request('POST', url, params || {}, undefined)
  }

  // ── Status translation ────────────────────────────────────────────────────────

  /**
   * toDbStatus(uiStatus) — translate UI display label to DB-valid value
   * e.g. 'proposed' → 'pending', 'agreed' → 'done'
   */
  atlasDB.toDbStatus = function (s) {
    return _UI_TO_DB[s] || s
  }

  /**
   * fromDbStatus(section, dbStatus) — translate DB value to UI display label
   * section: 'uc' | 'action' | 'strategy' | 'requirement'
   * e.g. fromDbStatus('uc', 'pending') → 'proposed'
   */
  atlasDB.fromDbStatus = function (section, s) {
    return (_DB_TO_UI[section] && _DB_TO_UI[section][s]) || s
  }

  /**
   * normalizeItems(items) — apply fromDbStatus to an array of docket_items
   * Call after every get() from the docket_items table
   */
  atlasDB.normalizeItems = function (items) {
    return (items || []).map(function (i) {
      i.status = atlasDB.fromDbStatus(i.section, i.status)
      return i
    })
  }

  /**
   * parseContent(item) — safely parse item.content if stored as JSON string
   * Supabase returns jsonb as object, but some tools stored it as string.
   * Always call this before accessing item.content fields.
   */
  atlasDB.parseContent = function (item) {
    if (!item) return item
    if (typeof item.content === 'string') {
      try { item.content = JSON.parse(item.content) } catch (e) { /* leave as string */ }
    }
    return item
  }

  /**
   * parseContentAll(items) — parseContent for an array of items
   */
  atlasDB.parseContentAll = function (items) {
    return (items || []).map(atlasDB.parseContent)
  }

  // ── Utility helpers ───────────────────────────────────────────────────────────

  /**
   * genId(prefix) — generate a unique string ID
   * e.g. genId('req') → 'req-1719484800000-abc123'
   */
  atlasDB.genId = function (prefix) {
    var ts    = Date.now().toString(36)
    var rand  = Math.random().toString(36).slice(2, 8)
    return (prefix ? prefix + '-' : '') + ts + '-' + rand
  }

  /**
   * esc(str) — HTML-escape a string for safe rendering
   * Use on ALL user-supplied content before inserting into innerHTML
   */
  atlasDB.esc = function (s) {
    return String(s || '')
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;')
  }

  /**
   * buildQuery(filters) — build a Supabase filter query string from object
   * e.g. buildQuery({docket_id: '123', status: 'pending', _order: 'created_at.desc'})
   *   → 'docket_id=eq.123&status=eq.pending&order=created_at.desc'
   */
  atlasDB.buildQuery = function (filters) {
    var parts = []
    Object.keys(filters || {}).forEach(function (k) {
      var v = filters[k]
      if (v === null || v === undefined) return
      if (k === '_order') { parts.push('order=' + v); return }
      if (k === '_limit') { parts.push('limit=' + v); return }
      if (k === '_select') { parts.push('select=' + v); return }
      parts.push(k + '=eq.' + encodeURIComponent(v))
    })
    return parts.join('&')
  }

  // ── Docket-specific helpers ───────────────────────────────────────────────────
  // These wrap common multi-step operations used across Docket and SASC.

  /**
   * getDocketItems(docketId) — fetch all items for a docket, normalized
   * Returns: array of normalized docket_items (empty on error)
   */
  atlasDB.getDocketItems = async function (docketId) {
    if (!docketId) return []
    var items = await atlasDB.get(
      'docket_items',
      'docket_id=eq.' + docketId + '&order=sort_order.asc,created_at.asc'
    )
    return atlasDB.normalizeItems(atlasDB.parseContentAll(items))
  }

  /**
   * saveDocketItem(item) — upsert a single docket_item
   * Translates UI status to DB status before writing.
   * Returns: {ok, status, error}
   */
  atlasDB.saveDocketItem = async function (item) {
    if (!item || !item.id) {
      _warn('saveDocketItem: item must have an id')
      return { ok: false, error: 'missing_id' }
    }
    var toSave = Object.assign({}, item)
    // Translate status from UI label to DB value
    if (toSave.status) toSave.status = atlasDB.toDbStatus(toSave.status)
    // Ensure content is stored as object (Supabase jsonb)
    if (typeof toSave.content === 'string') {
      try { toSave.content = JSON.parse(toSave.content) } catch (e) { /* keep as string */ }
    }
    return await atlasDB.upsert('docket_items', toSave, 'id')
  }

  /**
   * savePortfolioSelection(docketId, docketItemId, portfolioCodes) — save portfolio selection
   * Uses deleteAndInsert pattern (clean replace).
   * portfolioCodes: array of code strings e.g. ['B1A', 'B4A', 'B5E']
   * Returns: {ok, error}
   */
  atlasDB.savePortfolioSelection = async function (docketId, docketItemId, portfolioCodes, engagementId) {
    if (!docketId || !docketItemId) return { ok: false, error: 'missing_ids' }
    var row = {
      id:           docketItemId,
      docket_id:    docketId,
      engagement_id: engagementId || null,
      item_type:    'solution',
      item_subtype: 'portfolio_selection',
      section:      'output',
      status:       'done',
      content:      { items: portfolioCodes || [] },
      created_at:   new Date().toISOString()
    }
    return await atlasDB.deleteAndInsert(
      'docket_items',
      'id=eq.' + docketItemId,
      row
    )
  }

  /**
   * getMaasConfig(docketId) — fetch MaaS config from docket_items
   * Returns: parsed content object or null
   */
  atlasDB.getMaasConfig = async function (docketId) {
    var items = await atlasDB.get(
      'docket_items',
      'docket_id=eq.' + docketId + '&item_subtype=eq.maas_config&limit=1'
    )
    if (!items || !items.length) return null
    var item = atlasDB.parseContent(items[0])
    return item.content || null
  }

  /**
   * getSascConfig(docketId) — fetch SASC/Solution Builder config
   * Returns: parsed content object or null
   */
  atlasDB.getSascConfig = async function (docketId) {
    if (!docketId) return null
    var items = await atlasDB.get(
      'docket_items',
      'docket_id=eq.' + docketId + '&item_subtype=eq.sasc_config&limit=1'
    )
    if (!items || !items.length) return null
    var item = atlasDB.parseContent(items[0])
    return item.content || null
  }

  /**
   * saveSascConfig(docketId, itemId, configData) — save SASC/Solution Builder config
   * Returns: {ok, error}
   */
  atlasDB.saveSascConfig = async function (docketId, itemId, configData) {
    if (!docketId || !itemId) return { ok: false, error: 'missing_ids' }
    var row = {
      id:           itemId,
      docket_id:    docketId,
      item_type:    'solution',
      item_subtype: 'sasc_config',
      section:      'output',
      status:       'done',
      content:      configData,
      created_at:   new Date().toISOString()
    }
    return await atlasDB.deleteAndInsert('docket_items', 'id=eq.' + itemId, row)
  }

  // ── App config helpers ────────────────────────────────────────────────────────

  /**
   * getAppConfig(key) — read a single app_config value
   * Returns: parsed value or null
   */
  atlasDB.getAppConfig = async function (key) {
    var rows = await atlasDB.get('app_config', 'key=eq.' + encodeURIComponent(key), 1)
    if (!rows || !rows.length) return null
    var val = rows[0].value
    try { return JSON.parse(val) } catch (e) { return val }
  }

  /**
   * getAppConfigs(keys) — read multiple app_config values at once
   * Returns: object keyed by config key
   */
  atlasDB.getAppConfigs = async function (keys) {
    var filter = 'key=in.(' + keys.map(function(k){ return encodeURIComponent(k) }).join(',') + ')'
    var rows = await atlasDB.get('app_config', filter, keys.length)
    var result = {}
    ;(rows || []).forEach(function (row) {
      try { result[row.key] = JSON.parse(row.value) } catch (e) { result[row.key] = row.value }
    })
    return result
  }

  /**
   * setAppConfig(key, value) — write a single app_config value
   * Returns: {ok, error}
   */
  atlasDB.setAppConfig = async function (key, value) {
    var strVal = typeof value === 'string' ? value : JSON.stringify(value)
    return await atlasDB.upsert('app_config', { key: key, value: strVal }, 'key')
  }

  // ── Version info ──────────────────────────────────────────────────────────────

  atlasDB.VERSION = '1.0.0'
  atlasDB.DATE    = '2026-06-28'

  // ── Export ────────────────────────────────────────────────────────────────────

  global.atlasDB = atlasDB

  // Auto-init if DOM is ready (page load scenario)
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { atlasDB.init() })
    } else {
      atlasDB.init()
    }
  }

})(typeof window !== 'undefined' ? window : global)
