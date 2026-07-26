/**
 * atlas-finance.js — Shared Finance Engine
 *
 * All financial calculation logic lives here: cost/margin/price, cashflow,
 * NPV/IRR/FCF, multi-year inflation, multi-year forex. No tool should
 * compute these inline — call FinanceEngine instead. Fix here → fixed
 * everywhere (PRAXIS, AI Cloud Configurator, Sovereign Capacity Planner,
 * Investment Modeling & Justification all consume this).
 *
 * Architecture: module pattern, exposed as window.FinanceEngine
 */
;(function (global) {
  'use strict'

  // ── Pricing: gross-margin convention ──────────────────────────────────────
  // Sell Price = Cost / (1 - Margin%). Ported from PRAXIS computeOemPricing —
  // this is now the single source; PRAXIS/AIC should call this, not their
  // own inline copies.
  function priceFromMargin(cost, marginPct) {
    var m = Math.max(0, Math.min(0.95, marginPct || 0))
    return cost > 0 ? cost / (1 - m) : 0
  }
  function marginLines(costLines, defaultMarginPct, overrides) {
    // costLines: [{key,label,cost}]. overrides: {key: marginPct}
    var rows = (costLines || []).map(function (l) {
      var m = (overrides && overrides[l.key] != null) ? overrides[l.key] : (defaultMarginPct != null ? defaultMarginPct : 0.35)
      var price = priceFromMargin(l.cost, m)
      return { key: l.key, label: l.label, cost: l.cost, marginPct: m, price: price }
    })
    var totalCost = rows.reduce(function (s, r) { return s + r.cost }, 0)
    var totalPrice = rows.reduce(function (s, r) { return s + r.price }, 0)
    return {
      rows: rows, totalCost: totalCost, totalPrice: totalPrice,
      marginDollars: totalPrice - totalCost,
      weightedMarginPct: totalPrice > 0 ? (1 - totalCost / totalPrice) : 0
    }
  }

  // ── Cashflow / NPV / IRR / FCF ───────────────────────────────────────────
  // Ported from tools/tsap-financial-model/index.html calcIRR/NPV — proven,
  // working Newton-Raphson solver. periodsPerYear: 4=quarterly, 12=monthly, 1=annual.
  function calcIRR(cashflows, periodsPerYear) {
    var ppy = periodsPerYear || 4
    var rate = 0.02
    for (var iter = 0; iter < 100; iter++) {
      var npv = 0, dnpv = 0
      for (var i = 0; i < cashflows.length; i++) {
        npv += cashflows[i] / Math.pow(1 + rate, i)
        dnpv -= i * cashflows[i] / Math.pow(1 + rate, i + 1)
      }
      if (Math.abs(npv) < 0.01) break
      if (dnpv === 0) break
      rate -= npv / dnpv
    }
    return Math.round(rate * ppy * 10000) / 100 // annualised %, 2dp
  }

  function calcNPV(cashflows, discountRatePct, periodsPerYear) {
    var ppy = periodsPerYear || 4
    var discountPerPeriod = (discountRatePct / 100) / ppy
    return Math.round(cashflows.reduce(function (s, cf, i) {
      return s + cf / Math.pow(1 + discountPerPeriod, i)
    }, 0))
  }

  // FCF = Operating Cashflow - Capex (standard definition; confirm with
  // finance stakeholder if a working-capital adjustment is later needed).
  function calcFCF(operatingCashflow, capex) {
    return operatingCashflow - capex
  }

  // ── Multi-year inflation — category-specific (labor, power), not blended ──
  // Compound growth, same mathematical shape as revenue CAGR (proven pattern
  // from tsap-financial-model's rev_market_cagr).
  var DEFAULT_INFLATION = { labor: 0.06, power: 0.04 } // 6%/4% p.a. — ESTIMATE, override via Supabase app_config if available
  function inflateCost(baseCost, category, yearsFromNow, ratesOverride) {
    var rates = ratesOverride || DEFAULT_INFLATION
    var rate = rates[category] != null ? rates[category] : 0 // unlisted categories: no inflation applied
    return baseCost * Math.pow(1 + rate, yearsFromNow || 0)
  }
  function inflateCostSeries(baseCost, category, numYears, ratesOverride) {
    var out = []
    for (var y = 0; y < numYears; y++) out.push(Math.round(inflateCost(baseCost, category, y, ratesOverride)))
    return out
  }

  // ── Currency roles — NOT hardcoded to specific currencies ──────────────────
  // Three roles: local (territory/deal currency), procurement (currency
  // equipment/services are actually paid in), reporting (internal
  // consolidation currency). For this business today that's INR/USD/EUR, but
  // the engine never assumes that — the actual currency per role comes from
  // caller-supplied config (Supabase-sourced, e.g. per-engagement or a global
  // app_config default), so a different territory can use entirely different
  // currencies without any code change.
  var CURRENCY_ROLES = ['local', 'procurement', 'reporting']
  function resolveRoleCurrency(currencyConfig, role) {
    return (currencyConfig && currencyConfig[role]) || null
  }

  // ── Multi-year forex ─────────────────────────────────────────────────────
  // Fallback chain, no hardcoded rate table:
  //   1. Live rate — Frankfurter.app (free, no key, ECB-based)
  //   2. Supabase app_config — key pattern 'fx_<from>_<to>' lowercase, same
  //      convention already proven in tools/tsap-financial-model (fx_usd_inr)
  //   3. null — caller must prompt for a manual rate; NEVER silently guess
  async function getLiveForexRate(fromCcy, toCcy) {
    try {
      var r = await fetch('https://api.frankfurter.app/latest?from=' + fromCcy + '&to=' + toCcy)
      if (!r.ok) return null
      var data = await r.json()
      return (data.rates && data.rates[toCcy]) || null
    } catch (e) { return null }
  }
  async function getAppConfigForexRate(sbUrl, sbKey, fromCcy, toCcy) {
    if (!sbUrl || !sbKey) return null
    var key = 'fx_' + fromCcy.toLowerCase() + '_' + toCcy.toLowerCase()
    try {
      var r = await fetch(sbUrl + '/rest/v1/app_config?key=eq.' + key, { headers: { apikey: sbKey, Authorization: 'Bearer ' + sbKey } })
      if (!r.ok) return null
      var rows = await r.json()
      return (rows && rows[0] && parseFloat(rows[0].value)) || null
    } catch (e) { return null }
  }
  // sb: optional {url, key} for the app_config fallback tier.
  async function getForexRate(fromCcy, toCcy, userOverride, sb) {
    if (fromCcy === toCcy) return 1
    if (userOverride != null) return userOverride
    var live = await getLiveForexRate(fromCcy, toCcy)
    if (live != null) return live
    if (sb) {
      var stored = await getAppConfigForexRate(sb.url, sb.key, fromCcy, toCcy)
      if (stored != null) return stored
    }
    return null // no silent guess — caller must handle missing rate explicitly
  }
  // Convert between two currency ROLES (not raw currency codes) — resolves
  // each role to its actual currency via config, then converts.
  async function convertBetweenRoles(amount, fromRole, toRole, currencyConfig, userOverride, sb) {
    var fromCcy = resolveRoleCurrency(currencyConfig, fromRole)
    var toCcy = resolveRoleCurrency(currencyConfig, toRole)
    if (!fromCcy || !toCcy) return null
    var rate = await getForexRate(fromCcy, toCcy, userOverride, sb)
    return rate != null ? amount * rate : null
  }
  // Multi-year projection: flat by default (0% drift) unless an
  // appreciation/depreciation assumption is supplied — same compound-growth
  // shape as inflation, applied to a currency pair instead of a cost.
  function projectForexRate(baseRate, yearsFromNow, annualDriftPct) {
    return baseRate * Math.pow(1 + (annualDriftPct || 0), yearsFromNow || 0)
  }
  function projectForexSeries(baseRate, numYears, annualDriftPct) {
    var out = []
    for (var y = 0; y < numYears; y++) out.push(Math.round(projectForexRate(baseRate, y, annualDriftPct) * 10000) / 10000)
    return out
  }

  var FinanceEngine = {
    priceFromMargin: priceFromMargin,
    marginLines: marginLines,
    calcIRR: calcIRR,
    calcNPV: calcNPV,
    calcFCF: calcFCF,
    inflateCost: inflateCost,
    inflateCostSeries: inflateCostSeries,
    getForexRate: getForexRate,
    getLiveForexRate: getLiveForexRate,
    getAppConfigForexRate: getAppConfigForexRate,
    resolveRoleCurrency: resolveRoleCurrency,
    convertBetweenRoles: convertBetweenRoles,
    projectForexRate: projectForexRate,
    projectForexSeries: projectForexSeries,
    CURRENCY_ROLES: CURRENCY_ROLES,
    DEFAULT_INFLATION: DEFAULT_INFLATION
  }

  global.FinanceEngine = FinanceEngine

})(typeof window !== 'undefined' ? window : global)
