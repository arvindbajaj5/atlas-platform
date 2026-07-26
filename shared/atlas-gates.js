/**
 * atlas-gates.js — Gate Registry
 *
 * Fixes a recurring bug pattern: features that were BUILT but silently
 * didn't show up because a visibility/enablement condition was missed or
 * wired inconsistently (Entry Mode card assembled from a stale fetch that
 * never connected computeEntryAnchor; Serving Engine/Quant dropdowns hidden
 * behind M.mode==='deep'; AIC tab visibility checks scattered inline per-tab).
 *
 * Instead of scattered bespoke `if` checks, each tool DECLARES its gates as
 * data once (at boot), and every visibility/enablement check routes through
 * ONE function: AtlasGates.canShow(name, ctx). A missing gate is structurally
 * harder to forget (declared once, not re-typed per call site), and a failed
 * gate returns an honest reason instead of silently rendering nothing.
 *
 * Fail-open by design: an unregistered gate name always shows (ok:true) —
 * this mechanism should never be the reason something that used to work
 * stops working; it only adds friction where a tool explicitly opts in.
 *
 * Usage:
 *   AtlasGates.registerGates({
 *     'aic.portfolio': { requires: [
 *       { key:'SE_READY', check: function(ctx){ return ctx.SE_READY===true },
 *         reason:'Sizing engine still loading' }
 *     ]}
 *   })
 *   var gate = AtlasGates.canShow('aic.portfolio', { SE_READY: SE_READY })
 *   if (!gate.ok) { el.innerHTML = AtlasGates.renderGateBanner(gate.reason) }
 */
;(function (global) {
  'use strict'

  var _gates = {}

  function registerGate(name, def) {
    if (!name || typeof name !== 'string') throw new Error('[AtlasGates] registerGate requires a string name')
    def = def || {}
    def.requires = def.requires || []
    _gates[name] = def
  }

  function registerGates(defs) {
    Object.keys(defs || {}).forEach(function (name) { registerGate(name, defs[name]) })
  }

  // Fail-open on unregistered names — this mechanism only adds friction
  // where a tool explicitly opts in, never removes access silently.
  function canShow(name, ctx) {
    var gate = _gates[name]
    if (!gate) return { ok: true, reason: null, gate: null }
    ctx = ctx || {}
    var failed = null
    for (var i = 0; i < gate.requires.length; i++) {
      var req = gate.requires[i]
      var passed
      try {
        passed = !!req.check(ctx)
      } catch (e) {
        // A throwing check is treated as failed, not a crash — surfaces as
        // an honest "not ready" rather than breaking the page.
        passed = false
      }
      if (!passed) { failed = req; break }
    }
    if (!failed) return { ok: true, reason: null, gate: name }
    return { ok: false, reason: failed.reason || ('Requirement not met: ' + (failed.key || '?')), gate: name, failedKey: failed.key }
  }

  function getGate(name) { return _gates[name] || null }
  function listGates() { return Object.keys(_gates) }
  function clearGates() { _gates = {} } // test/reset helper only

  // Consistent "why is this locked" UI across every tool — same visual
  // language everywhere, not reinvented per tool.
  function renderGateBanner(reason) {
    return '<div style="padding:14px 16px;background:#FFF8E7;border:1px solid #FFB600;border-radius:8px;'
      + 'font-size:12px;color:#7A5B00;display:flex;align-items:center;gap:8px">'
      + '<span style="font-size:16px">&#128274;</span><span>' + escGate(reason || 'Not available yet') + '</span>'
      + '</div>'
  }
  function escGate(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  global.AtlasGates = {
    registerGate: registerGate,
    registerGates: registerGates,
    canShow: canShow,
    getGate: getGate,
    listGates: listGates,
    clearGates: clearGates,
    renderGateBanner: renderGateBanner
  }

})(typeof window !== 'undefined' ? window : global)
