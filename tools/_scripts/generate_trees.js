/* ═══════════════════════════════════════════════════════════════════════════
   ATLAS — 5-ENGAGEMENT TREE GENERATOR  (v2 — schema-corrected)
   Customer → Engagement → Docket → Solution Version
   Clients: NATGRID (12 UC), Army Signals (12 UC), Rajasthan (10MW),
            UP (20MW), Uttarakhand (2MW).
   Paste in PRAXIS/Engagement-Mgmt console (logged in). Re-runnable, write-only.
   ═══════════════════════════════════════════════════════════════════════════ */

(async function () {
  'use strict';

  function getSB() {
    try { var g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}');
      return { url: g.sbUrl || g.sb_url || '', key: g.sbKey || g.sb_key || '' }; }
    catch (e) { return { url: '', key: '' }; }
  }
  var SB = getSB();
  if (!SB.url || !SB.key) { console.error('[GEN] No Supabase credentials.'); return; }
  console.log('[GEN] Supabase:', SB.url.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co');

  function H(extra){ var h={apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json'};
    if(extra) for(var k in extra) h[k]=extra[k]; return h; }
  async function sbGet(t,p){ var r=await fetch(SB.url+'/rest/v1/'+t+'?'+(p||''),{headers:H()}); return r.ok?await r.json():[]; }
  // Returns {ok, status, error} — HONEST success/failure
  async function sbInsert(t,d){
    var r=await fetch(SB.url+'/rest/v1/'+t,{method:'POST',
      headers:H({Prefer:'resolution=ignore-duplicates,return=minimal'}),body:JSON.stringify(d)});
    if(r.ok) return {ok:true, status:r.status};
    var txt=await r.text();
    return {ok:false, status:r.status, error:txt.slice(0,160)};
  }
  function genId(prefix){ return prefix+'-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+Math.floor(Math.random()*9999); }

  var gpus   = await sbGet('gpu_configs','active=eq.true&order=tier.asc,name.asc');
  var models = await sbGet('model_catalogue','order=name.asc');
  if(!gpus.length){ console.error('[GEN] No gpu_configs.'); return; }
  console.log('[GEN] Catalogue:', gpus.length, 'GPUs,', models.length, 'models');

  function resolveGpu(hint){ var h=(hint||'').toLowerCase();
    var hit=gpus.find(function(g){return (g.name||'').toLowerCase().indexOf(h)>=0;});
    if(hit) return hit.id;
    if(h.indexOf('l40')>=0||h.indexOf('l4')>=0){ var lt=gpus.find(function(g){return (g.tier||'')==='light'||(g.tdp_kw||1)<=0.4;}); if(lt) return lt.id; }
    return gpus[0].id;
  }
  function resolveModel(hint){ if(!models.length) return hint; var h=(hint||'').toLowerCase();
    var hit=models.find(function(m){return (m.name||'').toLowerCase().indexOf(h)>=0||(m.model_id||'').toLowerCase().indexOf(h)>=0;});
    if(hit) return hit.model_id;
    var llm=models.find(function(m){return (m.family||'').toLowerCase().indexOf('llama')>=0;});
    return llm?llm.model_id:models[0].model_id;
  }

  function buildWorkload(tpl, idx){ var ts=Date.now()+idx;
    if(tpl.kind==='uc') return { id:'uc-'+ts, name:tpl.name, model:resolveModel(tpl.model_hint), gpu:resolveGpu(tpl.gpu_hint),
      precision:tpl.precision||'fp8', dau:tpl.dau, reqPerDay:tpl.reqPerDay, peakMult:3, peakConcPct:6, contextPct:'p95',
      commercialSla:tpl.commercialSla||'gold', engine:'vllm', securityTier:tpl.securityTier||'enhanced',
      isAgentic:!!tpl.isAgentic, agentSteps:tpl.agentSteps||5, toolWait:200, isMultimodal:!!tpl.isMultimodal,
      src:'onprem', chargeoutModel:'per_token', avgInputTokens:tpl.avgInputTokens, avgOutputTokens:tpl.avgOutputTokens,
      gpuUtilTarget:72, ttft:tpl.ttft||800, tbt:tpl.tbt||40, e2e:tpl.e2e||4000 };
    if(tpl.kind==='maas') return { id:'maas-'+ts, name:tpl.name, model:resolveModel(tpl.model_hint), gpu:resolveGpu(tpl.gpu_hint),
      precision:tpl.precision||'int4', dau:tpl.dau, reqPerDay:20, peakMult:3, peakConcPct:5, contextPct:'p95',
      commercialSla:tpl.commercialSla||'bronze', engine:'vllm', pricePerMtok:tpl.pricePerMtok, provisionedGpus:null,
      provisioningReason:'', demandSources:[], src:'onprem', chargeoutModel:'per_token',
      avgInputTokens:tpl.avgInputTokens, avgOutputTokens:tpl.avgOutputTokens, gpuUtilTarget:80, ttft:500, tbt:30, e2e:2000 };
    if(tpl.kind==='gpuaas') return { id:'gpuaas-'+ts, name:tpl.name, gpu:resolveGpu(tpl.gpu_hint),
      gpuCount:tpl.gpuCount, rateTier:tpl.rateTier||'12mo', commercialSla:tpl.commercialSla||'gold' };
    if(tpl.kind==='bmaas') return { id:'bmaas-'+ts, name:tpl.name, gpu:resolveGpu(tpl.gpu_hint),
      serverCount:tpl.serverCount, gpusPerServer:tpl.gpusPerServer||8, commercialSla:tpl.commercialSla||'gold',
      guestOs:'ubuntu', interconnect:'standalone' };
  }

  var CLIENTS = [
  {
    "customer": {
      "name": "National Intelligence Grid (NATGRID)",
      "short_name": "NATGRID",
      "tier": "strategic",
      "ownership": "GOV",
      "sector": "Intelligence / Internal Security",
      "state": "Delhi",
      "ai_maturity": "piloting",
      "notes": "MHA counter-terrorism data-integration platform. 21 databases, 11+ agencies, ~45k queries/mo. Indigenous Gandiva analytics engine. Sovereign air-gapped requirement."
    },
    "engagement": {
      "name": "NATGRID Sovereign AI Intelligence Platform",
      "archetype": "govt_sectorial",
      "type": "new",
      "phase": "presales",
      "domain": "GEN",
      "currency": "INR",
      "value": "Sovereign AI compute for Gandiva-class entity resolution & inference"
    },
    "hook": "360-degree suspect resolution across 21 siloed databases. Gandiva analytics engine (entity resolution, facial recognition, large-scale inference) needs sovereign, air-gapped GPU compute. No public internet.",
    "mw": null,
    "workloads": [
      {
        "kind": "uc",
        "name": "Cross-Database Entity Resolution",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 8000,
        "reqPerDay": 30,
        "avgInputTokens": 4096,
        "avgOutputTokens": 512,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 1000,
        "tbt": 40,
        "e2e": 5000
      },
      {
        "kind": "uc",
        "name": "Link Analysis & Network Graphing",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 5000,
        "reqPerDay": 20,
        "avgInputTokens": 8192,
        "avgOutputTokens": 1024,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": true,
        "agentSteps": 6,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Facial Recognition Matching",
        "model_hint": "clip",
        "gpu_hint": "h200",
        "dau": 12000,
        "reqPerDay": 40,
        "avgInputTokens": 1024,
        "avgOutputTokens": 256,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 500,
        "tbt": 40,
        "e2e": 2000
      },
      {
        "kind": "uc",
        "name": "Travel-Pattern Anomaly Detection",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 6000,
        "reqPerDay": 25,
        "avgInputTokens": 2048,
        "avgOutputTokens": 512,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Financial / Hawala Anomaly Detection",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 4000,
        "reqPerDay": 30,
        "avgInputTokens": 4096,
        "avgOutputTokens": 768,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Sleeper-Cell Graph Analysis",
        "model_hint": "70b",
        "gpu_hint": "mi300",
        "dau": 2000,
        "reqPerDay": 15,
        "avgInputTokens": 8192,
        "avgOutputTokens": 1536,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": true,
        "agentSteps": 8,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Multilingual Intercept & Doc Triage",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 7000,
        "reqPerDay": 35,
        "avgInputTokens": 4096,
        "avgOutputTokens": 1024,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Immigration Cross-Referencing",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 9000,
        "reqPerDay": 30,
        "avgInputTokens": 2048,
        "avgOutputTokens": 384,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Predictive Threat Scoring",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 3000,
        "reqPerDay": 20,
        "avgInputTokens": 4096,
        "avgOutputTokens": 512,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "NL Query over Structured Intel",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 15000,
        "reqPerDay": 25,
        "avgInputTokens": 2048,
        "avgOutputTokens": 768,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 3000
      },
      {
        "kind": "uc",
        "name": "OSINT Aggregation & Correlation",
        "model_hint": "70b",
        "gpu_hint": "mi300",
        "dau": 5000,
        "reqPerDay": 40,
        "avgInputTokens": 8192,
        "avgOutputTokens": 1024,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": true,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Real-Time Early-Warning Alerting",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 20000,
        "reqPerDay": 50,
        "avgInputTokens": 1024,
        "avgOutputTokens": 256,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 300,
        "tbt": 40,
        "e2e": 1500
      }
    ]
  },
  {
    "customer": {
      "name": "Indian Army \u2014 Corps of Signals",
      "short_name": "Army Signals",
      "tier": "strategic",
      "ownership": "MIL",
      "sector": "Defence & Armed Forces",
      "state": "Delhi",
      "ai_maturity": "exploring",
      "notes": "Battlefield comms, SIGINT, EW, secure tactical networks. Requires ruggedised edge AI running disconnected at forward locations."
    },
    "engagement": {
      "name": "Army Signals Tactical Edge AI",
      "archetype": "govt_sectorial",
      "type": "new",
      "phase": "presales",
      "domain": "GEN",
      "currency": "INR",
      "value": "Ruggedised tactical edge AI for SIGINT / EW / secure comms"
    },
    "hook": "Tactical edge AI for battlefield comms, SIGINT and EW \u2014 must run disconnected, ruggedised, at forward locations. Edge-heavy, air-gapped, sovereign.",
    "mw": null,
    "workloads": [
      {
        "kind": "uc",
        "name": "SIGINT Signal Classification",
        "model_hint": "8b",
        "gpu_hint": "l40",
        "dau": 3000,
        "reqPerDay": 60,
        "avgInputTokens": 2048,
        "avgOutputTokens": 256,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 400,
        "tbt": 40,
        "e2e": 1500
      },
      {
        "kind": "uc",
        "name": "EW Threat Detection",
        "model_hint": "8b",
        "gpu_hint": "l40",
        "dau": 4000,
        "reqPerDay": 80,
        "avgInputTokens": 1024,
        "avgOutputTokens": 128,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 200,
        "tbt": 40,
        "e2e": 800
      },
      {
        "kind": "uc",
        "name": "Tactical Comms Optimisation",
        "model_hint": "8b",
        "gpu_hint": "l40",
        "dau": 2000,
        "reqPerDay": 40,
        "avgInputTokens": 2048,
        "avgOutputTokens": 384,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Battlefield Spectrum Management",
        "model_hint": "8b",
        "gpu_hint": "l40",
        "dau": 1500,
        "reqPerDay": 30,
        "avgInputTokens": 1024,
        "avgOutputTokens": 256,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Enemy Comms Pattern Analysis",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 1000,
        "reqPerDay": 20,
        "avgInputTokens": 4096,
        "avgOutputTokens": 768,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": true,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Secure Voice Transcription/Translation",
        "model_hint": "whisper",
        "gpu_hint": "l40",
        "dau": 5000,
        "reqPerDay": 50,
        "avgInputTokens": 2048,
        "avgOutputTokens": 512,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 600,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Network Intrusion Detection",
        "model_hint": "8b",
        "gpu_hint": "l40",
        "dau": 6000,
        "reqPerDay": 100,
        "avgInputTokens": 1024,
        "avgOutputTokens": 128,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 200,
        "tbt": 40,
        "e2e": 600
      },
      {
        "kind": "uc",
        "name": "Autonomous Relay/Mesh Routing",
        "model_hint": "8b",
        "gpu_hint": "l40",
        "dau": 2000,
        "reqPerDay": 40,
        "avgInputTokens": 1024,
        "avgOutputTokens": 256,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": true,
        "agentSteps": 4,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Drone/ISR Imagery Analysis",
        "model_hint": "clip",
        "gpu_hint": "h200",
        "dau": 3000,
        "reqPerDay": 45,
        "avgInputTokens": 1024,
        "avgOutputTokens": 384,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Logistics & Readiness Prediction",
        "model_hint": "8b",
        "gpu_hint": "l40",
        "dau": 1500,
        "reqPerDay": 20,
        "avgInputTokens": 2048,
        "avgOutputTokens": 512,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Multilingual Field Translation",
        "model_hint": "8b",
        "gpu_hint": "l40",
        "dau": 4000,
        "reqPerDay": 60,
        "avgInputTokens": 1024,
        "avgOutputTokens": 256,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Decision-Support Fusion",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 800,
        "reqPerDay": 15,
        "avgInputTokens": 8192,
        "avgOutputTokens": 1024,
        "commercialSla": "gold",
        "securityTier": "sovereign",
        "isAgentic": true,
        "agentSteps": 6,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      }
    ]
  },
  {
    "customer": {
      "name": "Rajasthan Rajya Vidyut Prasaran Nigam (RVPNL)",
      "short_name": "Rajasthan Grid",
      "tier": "strategic",
      "ownership": "GOV",
      "sector": "Power / State Transmission Utility",
      "state": "Rajasthan",
      "ai_maturity": "exploring",
      "notes": "38GW+ solar. Curtailment hit 51.5% in Aug 2025 during 11am-2pm peak \u2014 power being wasted. Ideal for AI DC soaking curtailed daytime solar at near-zero marginal cost."
    },
    "engagement": {
      "name": "Rajasthan Solar-AI Compute Park (10MW)",
      "archetype": "territory_coe",
      "type": "new",
      "phase": "presales",
      "domain": "GEN",
      "currency": "INR",
      "value": "10MW AI DC monetising curtailed solar \u2192 cheapest GPUaaS/MaaS in India"
    },
    "hook": "STRANDED SOLAR: Rajasthan has 38GW solar but curtailment hit 51.5% during 11am-2pm peak (Aug 2025). Co-locate AI DC at Bhadla/Barmer solar parks, soak curtailed daytime power at near-zero marginal cost \u2192 cheapest GPUaaS/MaaS in India during solar hours.",
    "mw": 10,
    "workloads": [
      {
        "kind": "maas",
        "name": "Solar-Hours MaaS Pool (Discounted)",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 200000,
        "avgInputTokens": 512,
        "avgOutputTokens": 512,
        "pricePerMtok": 0.35,
        "commercialSla": "bronze",
        "precision": "int4"
      },
      {
        "kind": "maas",
        "name": "Standard MaaS Pool",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 80000,
        "avgInputTokens": 2048,
        "avgOutputTokens": 1024,
        "pricePerMtok": 0.95,
        "commercialSla": "bronze",
        "precision": "int4"
      },
      {
        "kind": "gpuaas",
        "name": "Daytime GPUaaS Block (Solar-Backed)",
        "gpu_hint": "h200",
        "gpuCount": 512,
        "rateTier": "spot",
        "commercialSla": "gold"
      },
      {
        "kind": "gpuaas",
        "name": "Reserved GPUaaS Block",
        "gpu_hint": "h200",
        "gpuCount": 256,
        "rateTier": "12mo",
        "commercialSla": "gold"
      },
      {
        "kind": "bmaas",
        "name": "Bare-Metal Training Cluster",
        "gpu_hint": "h200",
        "serverCount": 16,
        "gpusPerServer": 8,
        "commercialSla": "gold"
      },
      {
        "kind": "uc",
        "name": "Solar Generation Forecasting",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 2000,
        "reqPerDay": 24,
        "avgInputTokens": 2048,
        "avgOutputTokens": 512,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Grid Curtailment Optimisation",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 1000,
        "reqPerDay": 20,
        "avgInputTokens": 4096,
        "avgOutputTokens": 768,
        "commercialSla": "gold",
        "securityTier": "enhanced",
        "isAgentic": true,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Desert Land-Records Digitisation",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 5000,
        "reqPerDay": 15,
        "avgInputTokens": 2048,
        "avgOutputTokens": 384,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Rural Grievance Chatbot (Marwari/Hindi)",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 40000,
        "reqPerDay": 12,
        "avgInputTokens": 512,
        "avgOutputTokens": 256,
        "commercialSla": "silver",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Water & Irrigation Demand Prediction",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 3000,
        "reqPerDay": 18,
        "avgInputTokens": 2048,
        "avgOutputTokens": 512,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      }
    ]
  },
  {
    "customer": {
      "name": "Uttar Pradesh Power Corporation (UPPCL)",
      "short_name": "UP Grid",
      "tier": "strategic",
      "ownership": "GOV",
      "sector": "Power / State Utility",
      "state": "Uttar Pradesh",
      "ai_maturity": "piloting",
      "notes": "New Data Centre Policy 2026: Rs2L cr target, 2GW, GPU-specific AI Compute Booster incentives, state funds one of two power grids, stamp-duty waivers. Noida/Greater Noida demand centre."
    },
    "engagement": {
      "name": "UP AI Data Centre Park \u2014 Noida (20MW)",
      "archetype": "territory_coe",
      "type": "new",
      "phase": "presales",
      "domain": "GEN",
      "currency": "INR",
      "value": "20MW GPUaaS/MaaS anchor leveraging DC Policy 2026 capex subsidy + dual-grid"
    },
    "hook": "POLICY + DUAL-GRID: UP Data Centre Policy 2026 (Rs2L cr, 2GW, GPU AI Compute Booster incentives, state funds one of two power grids, stamp-duty waivers). Anchor GPUaaS/MaaS tenant in Noida leveraging state capex subsidy + guaranteed dual-grid power.",
    "mw": 20,
    "workloads": [
      {
        "kind": "maas",
        "name": "Enterprise MaaS Pool (General)",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 300000,
        "avgInputTokens": 1024,
        "avgOutputTokens": 1024,
        "pricePerMtok": 0.85,
        "commercialSla": "bronze",
        "precision": "int4"
      },
      {
        "kind": "maas",
        "name": "High-Volume MaaS Pool (Small Model)",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 500000,
        "avgInputTokens": 512,
        "avgOutputTokens": 512,
        "pricePerMtok": 0.3,
        "commercialSla": "bronze",
        "precision": "int4"
      },
      {
        "kind": "maas",
        "name": "Coding MaaS Pool",
        "model_hint": "qwen",
        "gpu_hint": "h200",
        "dau": 100000,
        "avgInputTokens": 4096,
        "avgOutputTokens": 2048,
        "pricePerMtok": 1.2,
        "commercialSla": "bronze",
        "precision": "int4"
      },
      {
        "kind": "gpuaas",
        "name": "Enterprise GPUaaS Block (Reserved)",
        "gpu_hint": "h200",
        "gpuCount": 768,
        "rateTier": "36mo",
        "commercialSla": "gold"
      },
      {
        "kind": "gpuaas",
        "name": "On-Demand GPUaaS Block",
        "gpu_hint": "h200",
        "gpuCount": 512,
        "rateTier": "12mo",
        "commercialSla": "gold"
      },
      {
        "kind": "bmaas",
        "name": "Hyperscale Training Cluster",
        "gpu_hint": "h200",
        "serverCount": 32,
        "gpusPerServer": 8,
        "commercialSla": "gold"
      },
      {
        "kind": "uc",
        "name": "e-Governance Citizen Services (UP)",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 100000,
        "reqPerDay": 12,
        "avgInputTokens": 1024,
        "avgOutputTokens": 384,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Land Records & Registry Analysis",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 8000,
        "reqPerDay": 18,
        "avgInputTokens": 4096,
        "avgOutputTokens": 768,
        "commercialSla": "gold",
        "securityTier": "enhanced",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Kumbh/Mega-Event Crowd Analytics",
        "model_hint": "clip",
        "gpu_hint": "h200",
        "dau": 15000,
        "reqPerDay": 30,
        "avgInputTokens": 1024,
        "avgOutputTokens": 256,
        "commercialSla": "gold",
        "securityTier": "enhanced",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Agri Advisory (Wheat/Sugarcane Belt)",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 60000,
        "reqPerDay": 15,
        "avgInputTokens": 2048,
        "avgOutputTokens": 512,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Industrial Corridor Investment Intel",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 3000,
        "reqPerDay": 20,
        "avgInputTokens": 8192,
        "avgOutputTokens": 1024,
        "commercialSla": "gold",
        "securityTier": "enhanced",
        "isAgentic": true,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      }
    ]
  },
  {
    "customer": {
      "name": "Uttarakhand Power Corporation (UPCL)",
      "short_name": "UK Grid",
      "tier": "strategic",
      "ownership": "GOV",
      "sector": "Power / State Utility",
      "state": "Uttarakhand",
      "ai_maturity": "exploring",
      "notes": "25GW hydro potential, surplus exported to other states, cool Himalayan climate \u2192 sub-1.2 PUE with free-cooling. Greenest, lowest-PUE sovereign inference in India. HAICE-lite analogue."
    },
    "engagement": {
      "name": "Uttarakhand Green Hydro-AI Node (2MW)",
      "archetype": "territory_coe",
      "type": "new",
      "phase": "presales",
      "domain": "GEN",
      "currency": "INR",
      "value": "2MW pilot \u2014 greenest sovereign inference, hydro-powered, free-cooled sub-1.2 PUE"
    },
    "hook": "HYDRO + COOL CLIMATE (HAICE-lite): 25GW hydro potential, surplus exported, cool Himalayan climate \u2192 sub-1.2 PUE with free-cooling. Greenest, lowest-PUE sovereign inference node in India. 2MW pilot / edge-inference.",
    "mw": 2,
    "workloads": [
      {
        "kind": "maas",
        "name": "Green MaaS Pool (Carbon-Zero Certified)",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 50000,
        "avgInputTokens": 512,
        "avgOutputTokens": 512,
        "pricePerMtok": 0.4,
        "commercialSla": "bronze",
        "precision": "int4"
      },
      {
        "kind": "gpuaas",
        "name": "Green GPUaaS Block (Hydro-Backed)",
        "gpu_hint": "h200",
        "gpuCount": 96,
        "rateTier": "12mo",
        "commercialSla": "gold"
      },
      {
        "kind": "bmaas",
        "name": "Edge Inference Node",
        "gpu_hint": "l40",
        "serverCount": 4,
        "gpusPerServer": 8,
        "commercialSla": "gold"
      },
      {
        "kind": "uc",
        "name": "Char Dham Pilgrimage & Tourism Assistant",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 30000,
        "reqPerDay": 15,
        "avgInputTokens": 1024,
        "avgOutputTokens": 384,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Himalayan Heritage & Manuscript Digitisation",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 3000,
        "reqPerDay": 12,
        "avgInputTokens": 4096,
        "avgOutputTokens": 1024,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Traditional Medicine (Ayurveda/Jadi-Buti) Knowledge Base",
        "model_hint": "70b",
        "gpu_hint": "h200",
        "dau": 8000,
        "reqPerDay": 20,
        "avgInputTokens": 4096,
        "avgOutputTokens": 768,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Yoga & Wellness Multilingual Advisor (Rishikesh)",
        "model_hint": "8b",
        "gpu_hint": "h200",
        "dau": 25000,
        "reqPerDay": 18,
        "avgInputTokens": 1024,
        "avgOutputTokens": 512,
        "commercialSla": "silver",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": false,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      },
      {
        "kind": "uc",
        "name": "Forest Fire & Wildlife Conservation Monitoring",
        "model_hint": "clip",
        "gpu_hint": "h200",
        "dau": 5000,
        "reqPerDay": 40,
        "avgInputTokens": 1024,
        "avgOutputTokens": 256,
        "commercialSla": "gold",
        "securityTier": "standard",
        "isAgentic": false,
        "agentSteps": 5,
        "isMultimodal": true,
        "precision": "fp8",
        "ttft": 800,
        "tbt": 40,
        "e2e": 4000
      }
    ]
  }
];

  var year=new Date().getFullYear(), summary=[];

  for(var ci=0; ci<CLIENTS.length; ci++){
    var C=CLIENTS[ci];
    console.log('%c[GEN] ═══ '+C.customer.short_name+' ═══','color:#1C38F5;font-weight:bold');

    // 1. Customer
    var custId=genId('CUST');
    var cust=Object.assign({id:custId, country:'India', contacts:[], divisions:[]}, C.customer);
    var rC=await sbInsert('customers', cust);
    if(!rC.ok){ console.error('[GEN]   ✗ Customer FAILED ('+rC.status+'): '+rC.error); console.warn('[GEN]   → skipping rest of '+C.customer.short_name+' tree (FK would cascade)'); continue; }
    console.log('[GEN]   ✓ Customer:', cust.name);

    // 2. Engagement
    var seq=String(Math.floor(Math.random()*9000)+1000);
    var engId='ENG-'+year+'-'+(C.engagement.domain||'GEN')+'-'+seq;
    var eng=Object.assign({id:engId, customer_id:custId, status:'active', owner:''}, C.engagement);
    var rE=await sbInsert('engagements', eng);
    if(!rE.ok){ console.error('[GEN]   ✗ Engagement FAILED ('+rE.status+'): '+rE.error); continue; }
    console.log('[GEN]   ✓ Engagement:', engId);

    // 3. Docket
    var docketId=genId('ENG');
    var docket={ id:docketId, type:'customer', name:cust.name+' — '+eng.name, customer_name:cust.name,
      customer_id:custId, engagement_id:engId, owner:'', status:'active', sector:eng.domain||'',
      metadata:{hook:C.hook, mw:C.mw} };
    var rD=await sbInsert('engagement_dockets', docket);
    if(!rD.ok){ console.error('[GEN]   ✗ Docket FAILED ('+rD.status+'): '+rD.error); }
    else console.log('[GEN]   ✓ Docket:', docketId);

    // 4. Solution version
    var wl={uc:[],maas:[],gpuaas:[],bmaas:[]};
    C.workloads.forEach(function(tpl,idx){ wl[tpl.kind].push(buildWorkload(tpl, ci*100+idx)); });
    var totalGpus=0;
    wl.gpuaas.forEach(function(w){ totalGpus+=w.gpuCount||0; });
    wl.bmaas.forEach(function(w){ totalGpus+=(w.serverCount||0)*(w.gpusPerServer||8); });
    totalGpus += (wl.uc.length+wl.maas.length)*8;

    var solId='sv-'+engId+'-'+Date.now();
    var sol={ id:solId, engagement_id:engId, version_number:1, version_label:'v1 Generated', status:'draft',
      bom_snapshot:{ tool:'SSP', tool_name:'Solution, Size & Price', mode:'deep', workload_configs:wl,
        price_overrides:{}, key_metrics:{ total_gpus:totalGpus, capex_usd:totalGpus*30000,
        power_kw:Math.round(totalGpus*0.7*1.1*10)/10, workloads:C.workloads.length },
        generated:true, hook:C.hook, target_mw:C.mw } };
    var rS=await sbInsert('solution_versions', sol);
    if(!rS.ok){ console.error('[GEN]   ✗ Solution FAILED ('+rS.status+'): '+rS.error); }
    else console.log('[GEN]   ✓ Solution v1:', C.workloads.length, 'workloads, ~'+totalGpus+' GPUs');

    summary.push({ client:C.customer.short_name, engagement:engId, customer:rC.ok?'ok':'FAIL',
      docket:rD.ok?'ok':'FAIL', solution:rS.ok?'ok':'FAIL', workloads:C.workloads.length, gpus:totalGpus, mw:C.mw||'UC-led' });
  }

  console.log('%c[GEN] ═══════════ COMPLETE ═══════════','color:#00B290;font-weight:bold');
  console.table(summary);
  var allOk = summary.every(function(s){ return s.customer==='ok'&&s.docket==='ok'&&s.solution==='ok'; });
  console.log(allOk ? '[GEN] ✓ All 5 trees created cleanly.' : '[GEN] ⚠ Some inserts failed — see table + errors above.');
})();
