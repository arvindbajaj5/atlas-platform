// ════════════════════════════════════════════════════════════════════════════
// PRAXIS ENGINE — AI Inferencing Factory functions ported with Supabase adapter
// Adapter maps PRAXIS M state (Supabase data) → IF format, then runs IF logic
// ════════════════════════════════════════════════════════════════════════════
'use strict';

// ── Chart registry (destroy before redraw) ───────────────────────────────
var charts = {}
function dc(id){ if(charts[id]){ charts[id].destroy(); delete charts[id]; } }

// ── IF constants ─────────────────────────────────────────────────────────
const MIG_PROFILES={
  "full":{n:"Full GPU (7/7)",frac:1,inst:1},
  "4g":{n:"4/7 (~109GB B200)",frac:0.571,inst:1},
  "3g":{n:"3/7 (~82GB B200)",frac:0.428,inst:2},
  "2g":{n:"2/7 (~54GB B200)",frac:0.285,inst:3},
  "1g":{n:"1/7 (~27GB B200)",frac:0.142,inst:7},
}; var HA_TIERS={mission_critical:{n:"Mission Critical",gpu_mult:1.5,n_plus:2},business:{n:"Business Critical",gpu_mult:1.2,n_plus:1},best_effort:{n:"Best Effort",gpu_mult:1,n_plus:0}}; var SEC_TIERS={standard:{n:"Standard",cost_mult:1},enhanced:{n:"Enhanced",cost_mult:1.08},regulated:{n:"Regulated",cost_mult:1.15}}; var NET={
  ib_ndr:{n:"IB NDR 400G",cpp:2500,bw:400},
  ib_xdr:{n:"IB XDR 800G",cpp:4500,bw:800},
  eth_800g:{n:"Eth 800GbE",cpp:3000,bw:800},
  bxi3:{n:"BXI v3 (Bull)",cpp:3200,bw:400},
  eth_100g:{n:"Eth 100GbE (Edge)",cpp:500,bw:100},
}; var ENGINES={vllm:"vLLM",trt_llm:"TensorRT-LLM",sglang:"SGLang",triton:"Triton",lorax:"LoRAX"}; var WP={
  chatbot:{n:"Chatbot",ic:"💬",ai:256,ao:512,ttft:200,tbt:30,e2e:2000,dau:10000,rpud:5,pk:3,sla:99.9,batch:8},
  summarization:{n:"Doc Summary",ic:"📄",ai:4000,ao:800,ttft:2000,tbt:20,e2e:10000,dau:2000,rpud:10,pk:2,sla:99.5,batch:32},
  code_assist:{n:"Code Assist",ic:"💻",ai:1000,ao:2000,ttft:500,tbt:25,e2e:5000,dau:5000,rpud:8,pk:2.5,sla:99.9,batch:16},
  rag_qa:{n:"RAG Q&A",ic:"🔍",ai:2000,ao:400,ttft:300,tbt:25,e2e:3000,dau:8000,rpud:6,pk:2.5,sla:99.9,batch:12},
  audio_bot:{n:"Audio Bot",ic:"🎙️",ai:100,ao:200,ttft:100,tbt:12,e2e:800,dau:15000,rpud:3,pk:4,sla:99.95,batch:4},
  visual_qa:{n:"Visual Q&A / Doc AI",ic:"👁️",ai:500,ao:300,ttft:800,tbt:30,e2e:4000,dau:3000,rpud:6,pk:2,sla:99.5,batch:8},
  image_gen:{n:"Image Gen",ic:"🖼️",ai:77,ao:0,ttft:5000,tbt:0,e2e:8000,dau:3000,rpud:4,pk:2,sla:99,batch:4},
  video_gen:{n:"Video Gen",ic:"🎬",ai:77,ao:0,ttft:30000,tbt:0,e2e:60000,dau:500,rpud:2,pk:1.5,sla:99,batch:1},
  classification:{n:"Classification",ic:"🏷️",ai:200,ao:10,ttft:100,tbt:5,e2e:200,dau:50000,rpud:20,pk:3,sla:99.99,batch:64},
  embedding_gen:{n:"Embedding Gen",ic:"🧮",ai:300,ao:0,ttft:50,tbt:0,e2e:100,dau:100000,rpud:50,pk:3,sla:99.99,batch:128},
  reasoning:{n:"Reasoning/Agents",ic:"🧠",ai:2000,ao:4000,ttft:1000,tbt:40,e2e:15000,dau:2000,rpud:4,pk:2,sla:99.5,batch:4},
  agentic:{n:"Agentic Assistant",ic:"🤖",ai:1000,ao:1500,ttft:500,tbt:30,e2e:30000,dau:3000,rpud:6,pk:2.5,sla:99.5,batch:4,isAgentic:true,steps:15,toolWait:1000,gpuUtil:0.4},
  autonomous:{n:"Autonomous Agent",ic:"🔄",ai:2000,ao:3000,ttft:1000,tbt:40,e2e:120000,dau:500,rpud:3,pk:1.5,sla:99,batch:2,isAgentic:true,steps:40,toolWait:2000,gpuUtil:0.3},
  satellite:{n:"Satellite Analysis",ic:"🛰️",ai:512,ao:100,ttft:500,tbt:0,e2e:2000,dau:100,rpud:50,pk:2,sla:99.5,batch:64,isGeo:true},
  predictive_mx:{n:"Predictive Maintenance",ic:"🔧",ai:50,ao:10,ttft:10,tbt:2,e2e:20,dau:100000,rpud:100,pk:4,sla:99.99,batch:128},
  tts_bot:{n:"Text-to-Speech",ic:"🔊",ai:200,ao:0,ttft:200,tbt:0,e2e:1000,dau:10000,rpud:5,pk:3,sla:99.9,batch:8},
}; var STORAGE_VENDORS={
  ddn:{n:'DDN',full:'DDN AI400X2 / EXAScaler',arch:'parallel_fs',desc:'High-performance parallel filesystem. GPU-direct storage via GPUDirect Storage (GDS). Optimized for AI/HPC workloads with NVMe-oF fabric.',
    nvme_price:280,hdd_price:40,obj_price:0,nvme_pct:70,hdd_pct:30,obj_pct:0,appliance_cost:120000,repl:2,
    features:['GPUDirect Storage (GDS)','NVMe-oF fabric','EXAScaler Lustre','AI-optimized caching','Multi-tier auto-tiering']},
  ibm:{n:'IBM',full:'IBM Storage Scale (Spectrum Scale / GPFS)',arch:'parallel_fs',desc:'Enterprise-grade parallel filesystem with decades of HPC heritage. Strong data management, encryption, compression, and multi-site replication.',
    nvme_price:320,hdd_price:35,obj_price:20,nvme_pct:50,hdd_pct:30,obj_pct:20,appliance_cost:150000,repl:2,
    features:['GPFS/Spectrum Scale','AFM (Active File Management)','Transparent cloud tiering','Built-in encryption','Multi-site replication']},
  vast:{n:'VAST Data',full:'VAST Data Platform',arch:'parallel_fs',desc:'Disaggregated shared everything (DASE) architecture. All-flash NVMe with erasure coding — no HDD tier. Universal storage for AI pipelines.',
    nvme_price:180,hdd_price:0,obj_price:0,nvme_pct:100,hdd_pct:0,obj_pct:0,appliance_cost:80000,repl:1,
    features:['All-NVMe (no HDD)','DASE architecture','S3 + NFS + SMB unified','Erasure coding (no replication needed)','Inline dedup + compression']},
  weka:{n:'WEKA',full:'WEKA Data Platform',arch:'parallel_fs',desc:'Software-defined parallel filesystem optimized for GPU workloads. Highest IOPS/throughput density for AI training and inference. Runs on commodity NVMe servers.',
    nvme_price:200,hdd_price:25,obj_price:12,nvme_pct:50,hdd_pct:30,obj_pct:20,appliance_cost:50000,repl:2,
    features:['POSIX + S3 unified','GPUDirect Storage','Tiered to object storage','Software-defined (commodity HW)','Snap-to-object backup']},
  scality:{n:'Scality',full:'Scality ARTESCA / RING',arch:'object_only',desc:'Object storage at scale. S3-compatible with strong consistency. Ideal for geospatial archive, data lakes, and cold storage tiers. Geo-distributed replication.',
    nvme_price:0,hdd_price:25,obj_price:10,nvme_pct:0,hdd_pct:40,obj_pct:60,appliance_cost:30000,repl:3,
    features:['S3-native (ARTESCA)','Geo-distributed (RING)','Erasure coding','Metadata search','100PB+ proven scale']},
  generic:{n:'Generic',full:'Custom / Open Source (MinIO, Ceph, Lustre)',arch:'parallel_fs',desc:'Build-your-own storage layer. Use open-source components with commodity hardware. Maximum flexibility, requires more integration effort.',
    nvme_price:200,hdd_price:30,obj_price:15,nvme_pct:40,hdd_pct:40,obj_pct:20,appliance_cost:50000,repl:2,
    features:['Open source','Commodity hardware','Full customization','Community support','No vendor lock-in']},
};
var storageConfig = { vendor:'ddn', replication_factor:2, nvme_pct:70, hdd_pct:30, obj_pct:0, nvme_price_per_tb:280, hdd_price_per_tb:40, obj_price_per_tb:0, appliance_cost:120000 };
var priceOverrides = {};
var benchmarks = {};


// ── PRAXIS ADAPTER LAYER ─────────────────────────────────────────────────
// Maps PRAXIS M state (Supabase UUIDs) → IF format (PROC/MDL objects)

// getPROC: UUID → IF PROC format
function getPROC(gpuId) {
  if (!gpuId || !M.gpuMap) return null;
  var g = M.gpuMap[gpuId];
  if (!g) return null;
  return {
    n:   g.name,
    v:   g.gpu_vendor || 'NVIDIA',
    t:   g.processor_type || 'GPU',
    hbm: g.vram_per_gpu_gb || 80,
    bw:  g.hbm_bw_tbps || 3.35,
    fp8: g.fp8_tflops || 1979,
    fp16:g.bf16_tflops || 1000,
    tdp: (g.tdp_kw || 0.7) * 1000,
    usd: g.price_usd || 30000,
    mx:  g.gpus_in_unit || 8,
    mig: g.mig_supported || false,
    cool:g.cooling_type || 'dlc',
    tier:g.tier || 'high',
    ic:  g.interconnect || 'NVLink5',
    tbt_factor: g.tbt_factor || 1.0,
    cores: g.cpu_cores || 0
  };
}

// getMDL: model_id slug or UUID → IF MDL format
function getMDL(modelId) {
  if (!modelId || !M.modelMap) return null;
  var m = M.modelMap[modelId] || (M.modelById && M.modelById[modelId]);
  if (!m) return { n: modelId, pb: 7, v16: 14, v8: 7, tps: 8000, family: 'Unknown' };
  var pb = m.params_b || 7;
  return {
    n:    m.name,
    pb:   pb,
    v16:  Math.round(pb * 2.1),    // fp16 VRAM ~ 2.1 GB per B params
    v8:   Math.round(pb * 1.1),    // int8 VRAM
    tps:  Math.round(800000 / Math.max(pb, 0.5)),  // rough tok/s baseline
    family: m.family || 'Unknown',
    ai:   m.price_input_per_1m  || 1.0,
    ao:   m.price_output_per_1m || 3.0,
    tp:   'open'
  };
}

// toIFWorkload: PRAXIS workload → IF wl format
function toIFWorkload(wl, type) {
  var gpuConf = M.gpuMap[wl.gpu] || {};
  var netChoice = 'ib_ndr';
  if (gpuConf.interconnect) {
    if (gpuConf.interconnect.includes('PCIe')) netChoice = 'eth_100g';
    else if (gpuConf.interconnect.includes('800')) netChoice = 'ib_xdr';
  }
  return {
    id: wl.id,   tp: type,   name: wl.name,
    md: wl.model,  proc: wl.gpu,
    qt: wl.precision || 'int4',
    dau: wl.dau || 10000,
    rpud: wl.reqPerDay || 20,
    ai:   wl.avgInputTokens || 512,
    ao:   wl.avgOutputTokens || 256,
    batch: wl.batch || 8,
    eng: wl.engine || 'vllm',
    pk:  wl.peakMult || 3,
    gpuUtil: (wl.gpuUtilTarget || 75) / 100,
    migProfile: wl.migProfile || 'full',
    disaggAccepted: !!wl.disaggAccepted,
    decodeProc: wl.decodeProc || null,
    cascadeModel: wl.cascadeModel || null,
    cascadeSplit: 0, hybridSplit: 70,
    isAgentic: !!wl.isAgentic,
    steps: wl.agentSteps || 5,
    toolWait: wl.toolWait || 500,
    inputModality: wl.isMultimodal ? 'image_text' : 'text',
    avgImgPerReq: wl.avgImgPerReq || 1,
    imgRes: wl.imgRes || '512',
    criticality: wl.securityTier === 'sovereign' ? 'mission_critical'
               : wl.securityTier === 'confidential' ? 'business' : 'best_effort',
    securityTier: wl.securityTier || 'standard',
    src: wl.src || 'onprem',
    wt: 100,
    gpuCfg: gpuConf.gpus_in_unit || 8,
    ttft: wl.ttft || 500,
    tbt:  wl.tbt  || 30,
    e2e:  wl.e2e  || 2000,
    netChoice: netChoice,
    scaleUp: true,
    isGeo: false,
    commercialSla: wl.commercialSla || 'bronze',
    provisionedGpus: wl.provisionedGpus || null
  };
}

// Collect all workloads as IF format
function getIFWorkloads() {
  var wls = [];
  (M.workloads.uc    ||[]).forEach(function(w){ wls.push(toIFWorkload(w,'uc')); });
  (M.workloads.maas  ||[]).forEach(function(w){ wls.push(toIFWorkload(w,'maas')); });
  (M.workloads.gpuaas||[]).forEach(function(w){ wls.push(toIFWorkload(w,'gpuaas')); });
  (M.workloads.bmaas ||[]).forEach(function(w){ wls.push(toIFWorkload(w,'bmaas')); });
  return wls;
}

// ── fmt$ / fmtN / price shims ─────────────────────────────────────────────
function fmt$(v) {
  if (v === undefined || v === null) return '$—';
  return v >= 1e6 ? '$' + (v/1e6).toFixed(2) + 'M'
       : v >= 1000 ? '$' + Math.round(v/1000) + 'K'
       : '$' + Math.round(v);
}
function fmtN(v) {
  return v >= 1e9 ? (v/1e9).toFixed(1)+'B'
       : v >= 1e6 ? (v/1e6).toFixed(1)+'M'
       : v >= 1e3 ? (v/1e3).toFixed(1)+'K'
       : Math.round(v).toString();
}
function price(key) {
  var p = getPROC(key);
  return (priceOverrides[key] || (p && p.usd) || 30000);
}
function currSym() { return '$'; }


// ── Benchmark lookup ─────────────────────────────────────────────────────
function praxisBenchLookup(gpu,model,engine,quant,batch){
  // Try exact match first
  var exact=`${gpu}|${model}|${engine}|${quant}|${batch}`;
  if((M.benchmarkMap||{})[exact])return{...(M.benchmarkMap||{})[exact],source:'exact'};
  // Try without batch (use closest)
  var noBatch=`${gpu}|${model}|${engine}|${quant}`;
  var batchKeys=Object.keys(benchmarks).filter(k=>k.startsWith(noBatch+'|'));
  if(batchKeys.length>0){
    // Find closest batch size
    var closest=null,minDist=Infinity;
    batchKeys.forEach(k=>{ var b=parseInt(k.split('|')[4]); var d=Math.abs(b-batch);if(d<minDist){minDist=d;closest=k;}});
    if(closest){ var bm=benchmarks[closest]; var closestBatch=parseInt(closest.split('|')[4]);
      // Scale TPS linearly by batch ratio (rough), latency by sqrt
      var batchRatio=batch/closestBatch;
      return{tps:Math.round(bm.tps*Math.min(batchRatio,Math.sqrt(batchRatio)*1.5)),ttft_ms:Math.round(bm.ttft_ms*Math.sqrt(batchRatio)),tbt_ms:Math.round(bm.tbt_ms*Math.pow(batchRatio,0.3)),source:'interpolated (batch '+closestBatch+'→'+batch+')'};}
  }
  // Try without engine (engine-agnostic benchmark)
  var noEng=`${gpu}|${model}|*|${quant}|${batch}`;
  if(benchmarks[noEng])return{...benchmarks[noEng],source:'engine-agnostic'};
  // No benchmark found
  return null;
}

// ── Core sizing engine (ported from IF estimate()) ───────────────────────
function estimate(w){
  var m=getMDL(w.md),p=getPROC(w.proc);
  if(!m||!p||(!p.hbm&&p.t!=='CPU'))return{gpus:0,kv:0,tpsG:0,peakConc:0,dailyReqs:0,dailyTok:0,moTok:0,memG:0,perfG:0,decGPUs:0};
  
  var vram=w.qt==='fp16'?m.v16:(m.v8||m.v16/2);
  var prec=w.qt==='fp16'?2:1;
  var migFrac=((MIG_PROFILES[w.migProfile]||{}).frac)||1;
  var effHBM=(p.hbm||80)*migFrac;
  
  // Multimodal: visual tokens
  var effAI=w.ai;
  if(w.inputModality==='image_text'&&w.avgImgPerReq>0){
    var vtokPerImg=w.imgRes==='512'?576:w.imgRes==='1024'?1024:2048;
    effAI+=w.avgImgPerReq*vtokPerImg;
  }
  
  // Agentic: multiply by steps
  var effTokensPerTask=w.isAgentic?(effAI+w.ao)*w.steps:(effAI+w.ao);
  var gpuUtilFactor=w.isAgentic?w.gpuUtil:0.85;
  
  // KV cache
  var layers=Math.max(Math.ceil(m.pb*1.2),1),hdim=Math.ceil(Math.sqrt(Math.max(m.pb,0.01)*1e9/layers/4)/128)*128;
  var heads=Math.max(1,Math.floor(hdim/128));
  var bSz=w.batch||8;
  var ctxForKV=w.isAgentic?Math.min(effAI*w.steps,32768):Math.min(effAI,8192);
  var kv=(2*layers*heads*128*ctxForKV*bSz*prec)/1e9;
  var tot=vram+kv;
  var memG=Math.ceil(tot/(effHBM*0.85));
  
  // TPS per GPU — benchmark lookup first, then estimation fallback
  var bm=praxisBenchLookup(w.proc,w.md,w.eng,w.qt,bSz);
  var tpsG_raw,estTTFT_bm=0,estTBT_bm=0,bmSource='estimated';
  if(bm){
    tpsG_raw=bm.tps*migFrac;
    estTTFT_bm=bm.ttft_ms||0;
    estTBT_bm=bm.tbt_ms||0;
    bmSource=bm.source;
  }else{
    // Estimation fallback: scale base TPS by GPU compute ratio and quantization
    tpsG_raw=(m.tps||100)*((p.fp8||p.fp16||1000)/4500)*(w.qt==='fp16'?0.5:w.qt==='int4'?1.3:1)*migFrac;
    // Engine efficiency factor
    var engFactor=w.eng==='trt_llm'&&p.v==='NVIDIA'?1.3:w.eng==='sglang'?1.1:1.0;
    tpsG_raw*=engFactor;
  }
  var tpsG=tpsG_raw*gpuUtilFactor;
  
  // Traffic
  var dailyReqs=w.dau*w.rpud,avgRPS=dailyReqs/86400,peakRPS=avgRPS*w.pk;
  var reqDur=w.isAgentic?(w.ao*w.steps/Math.max(tpsG_raw,1)+w.steps*w.toolWait/1000):(w.ao>0?w.ao/Math.max(tpsG_raw,1):0.5);
  var peakConc=Math.max(1,Math.ceil(peakRPS*Math.max(reqDur,0.05)));
  var perfG=Math.ceil(peakConc*Math.max(reqDur,0.05)/bSz/gpuUtilFactor);
  
  // HA multiplier
  var ha=HA_TIERS[w.criticality]||HA_TIERS.best_effort;
  var raw=Math.max(memG,perfG,1);
  var need=Math.ceil(raw*ha.gpu_mult)+ha.n_plus;
  
  // Cascade: split load
  var cascadeGPUs=0;
  if(w.cascadeModel&&w.cascadeSplit>0){
    var cm=getMDL(w.cascadeModel);
    if(cm){ var cvram=w.qt==='fp16'?cm.v16:(cm.v8||cm.v16/2);cascadeGPUs=Math.max(1,Math.ceil(need*w.cascadeSplit/100*0.5));}
  }
  
  // Disaggregated decode
  var decGPUs=0,decCost=0,decPow=0,tbtPenalty=1;
  if(w.disaggAccepted&&w.decodeProc){
    var dp=getPROC(w.decodeProc);
    if(dp){
      decGPUs=Math.max(1,Math.ceil(need*0.6));
      decCost=decGPUs*price(w.decodeProc)*1.8;
      decPow=decGPUs*(dp.tdp||300)*1.1/1000;
      tbtPenalty=dp.tbt_factor||1;
    }
  }
  
  // Hybrid: reduce on-prem by split
  var onPremFrac=1;
  if(w.src==='hybrid')onPremFrac=w.hybridSplit/100;
  if(w.src==='api')onPremFrac=0;
  var adjustedGPUs=Math.ceil((need+cascadeGPUs)*onPremFrac);
  
  var dailyTok=dailyReqs*effTokensPerTask;
  var moTok=dailyTok*30;
  
  return{gpus:adjustedGPUs,kv,tpsG,peakConc,dailyReqs,avgRPS:avgRPS.toFixed(1),peakRPS:peakRPS.toFixed(1),
    dailyTok,moTok,memG,perfG,vramTot:tot,decGPUs,decCost,decPow,cascadeGPUs,tbtPenalty,
    need:need+cascadeGPUs,effAI,effTokensPerTask,reqDur,onPremFrac,bSz,
    bmTTFT:estTTFT_bm,bmTBT:estTBT_bm,bmSource};
}


// ── Fleet sizing (ported from IF sizing()) ───────────────────────────────
function praxisSizing(){
  var wls = getIFWorkloads();
  var tGPU=0,gCost=0,tPow=0,slaAll=true;
  var cpuK='Turin_9965',rackK='dlc_260kw';
  var det=[];
  wls.forEach(w=>{
    var est=estimate(w),p=getPROC(w.proc),m=getMDL(w.md);
    if(!p)return;
    var gpusPer=Math.min(w.gpuCfg||8,p.mx||8);
    var gpus=est.gpus;
    if(false){
      var share=budget*(w.wt/100);
      var maxBdg=Math.floor(share/(price(w.proc)*1.8));
      gpus=Math.min(gpus,Math.max(maxBdg,w.src==='api'?0:1));
    }
    var servers=gpus>0?Math.ceil(gpus/gpusPer):0,actual=servers*gpusPer;
    var cpuP=getPROC(cpuK),pw=actual>0?(actual*(p.tdp||700)+servers*2*((cpuP||{}).tdp||350)+actual*50)*1.1/1000:0;
    var cost=actual*price(w.proc)*1.8;
    var tpsG=est.tpsG||1,totalTPS=tpsG*Math.max(actual,1);
    // Use benchmark latency if available, otherwise estimate
    var estTTFT=est.bmTTFT>0?est.bmTTFT:(tpsG>0?Math.round((est.effAI/(tpsG*0.8))*1000):9999);
    var estTBT=est.bmTBT>0?est.bmTBT:(tpsG>0?Math.round(1000/tpsG*est.tbtPenalty):9999);
    var estE2E=estTTFT+(w.ao||0)*estTBT;
    var ttftOk=estTTFT<=w.ttft,tbtOk=estTBT<=w.tbt||(w.tbt===0),e2eOk=estE2E<=w.e2e;
    var bmSource=est.bmSource||'estimated';
    if((!ttftOk||!tbtOk||!e2eOk)&&w.src!=='api')slaAll=false;
    
    // API cost
    var apiMoCost=0;
    if(w.src==='api'&&(m||{}).tp==='closed')apiMoCost=est.moTok*0.5*((m.ai||1)+(m.ao||1))/1e6;
    else if(w.src==='hybrid'&&w.apiProvider){ var ap=getMDL(w.apiProvider);if((ap||{}).tp==='closed')apiMoCost=est.moTok*(1-est.onPremFrac)*0.5*((ap.ai||1)+(ap.ao||1))/1e6;}
    
    // Security cost multiplier
    var secMult=((SEC_TIERS[w.securityTier]||{}).cost_mult)||1;
    
    tGPU+=actual+est.decGPUs;gCost+=(cost+est.decCost)*secMult;tPow+=pw+est.decPow;
    det.push({...w,gpus:actual,gpusPer,servers,cost:cost*secMult,pw,totalTPS,estTTFT,estTBT,estE2E,
      ttftOk,tbtOk,e2eOk,kvGB:est.kv,peakConc:est.peakConc,dailyReqs:est.dailyReqs,
      dailyTok:est.dailyTok,moTok:est.moTok,avgRPS:est.avgRPS,peakRPS:est.peakRPS,
      need:est.need,decGPUs:est.decGPUs,decCost:est.decCost*secMult,decPow:est.decPow,
      apiMoCost,cascadeGPUs:est.cascadeGPUs,batchUsed:est.bSz,bmSource,
      recDisagg:shouldDisagg(w),recLight:shouldLightGPU(w)});
  });
  
  // Common infra
  var commonSrv=12; // router(3)+LB(2)+k8s(5)+monitoring(2)
  var commonCost=commonSrv*15000;
  var commonPow=commonSrv*0.5; // kW
  
  // Agentic orchestrator CPU sizing
  // Agentic workloads need CPU servers for: agent runtime (LangChain/LangGraph/CrewAI),
  // tool execution (API calls, code exec, DB queries), result parsing, state management.
  // Sizing: 1 orchestrator CPU server per ~50 concurrent agentic tasks. Each server needs
  // high core count (64+ cores) and 256GB+ DRAM for agent state/context caching.
  var agenticWLs=det.filter(d=>d.isAgentic&&d.src!=='api');
  var agentOrcSrv=0,agentOrcCost=0,agentOrcPow=0;
  if(agenticWLs.length>0){
    var totalAgentConc=agenticWLs.reduce((s,d)=>s+d.peakConc,0);
    agentOrcSrv=Math.max(2,Math.ceil(totalAgentConc/50)); // 50 concurrent tasks per server, min 2 for HA
    agentOrcCost=agentOrcSrv*18000; // CPU server with 256GB DRAM
    agentOrcPow=agentOrcSrv*0.6; // kW per server
  }
  
  // Aggregation
  var rackPow=260,rackPowAC=90;
  var dlcPow=tPow*0.8,acPow=tPow*0.2+commonPow+agentOrcPow;
  var dlcRacks=Math.ceil(dlcPow/rackPow),acRacks=Math.ceil(acPow/rackPowAC);
  var totalRacks=dlcRacks+acRacks;
  var srvTotal=det.reduce((s,d)=>s+d.servers+(d.decGPUs?Math.ceil(d.decGPUs/(d.gpusPer||8)):0),0)+commonSrv+agentOrcSrv;
  var cpuCnt=srvTotal*2,cpuCost=price('Turin_9965')*cpuCnt;
  var netPorts=Math.ceil(tGPU/2);
  var netCost=det.reduce((s,d)=>{var n=(NET[d.netChoice]||{cpp:3000});return s+Math.ceil(d.gpus/2)*((n||{}).cpp||3000);},0);
  var swCost=Math.ceil(netPorts/64)*45000;
  
  // Model-aware storage (raw TB needed)
  var stoTB=50;
  det.filter(d=>d.src!=='api').forEach(d=>{var m=getMDL(d.md);if(m){ var modelGB=d.qt==='fp16'?m.v16:m.v8||m.v16/2;stoTB+=Math.ceil(modelGB/1000*3+d.gpus*2);}});
  // Geo storage
  var geoWLs=det.filter(d=>d.isGeo);
  if(geoWLs.length>0){ var g=geoWLs[0];stoTB+=(g.scenesPerDay||50)*2.8*(g.retentionMo||36)*30/1000+(g.histSizeTB||50);}
  
  // Replicated storage
  var stoTBRaw=stoTB;
  stoTB=Math.ceil(stoTBRaw*(storageConfig.replication_factor||2));
  
  // Tiered storage cost
  var nvmeTB=Math.ceil(stoTB*(storageConfig.nvme_pct||70)/100);
  var hddTB=Math.ceil(stoTB*(storageConfig.hdd_pct||30)/100);
  var objTB=Math.ceil(stoTB*(storageConfig.obj_pct||0)/100);
  var stoCost=nvmeTB*(storageConfig.nvme_price_per_tb||280)+hddTB*(storageConfig.hdd_price_per_tb||40)+objTB*(storageConfig.obj_price_per_tb||0)+(storageConfig.appliance_cost||120000);
  
  var rackDLCCost=85000+0+3500;
  var rackACCost=35000+3500;
  var rackCost=dlcRacks*rackDLCCost+acRacks*rackACCost+0;
  var dramCost=srvTotal*8*(priceOverridesverrides._dimm||300),chassisCost=srvTotal*(priceOverridesverrides._chassis||12000);
  
  // Software stack cost (annual)
  var enabledSW=softwareStack.filter(s=>s.enabled);
  var swLicenseCost=0;
  var swDetail=enabledSW.map(s=>{
    var qty=0;
    if(s.license==='per_server')qty=srvTotal;
    else if(s.license==='per_gpu')qty=tGPU;
    else if(s.license==='per_node')qty=srvTotal;
    else if(s.license==='per_switch')qty=Math.ceil(netPorts/64)+Math.max(1,Math.ceil(srvTotal/48));
    else if(s.license==='site')qty=1+(edgeCfg.enabled?edgeCfg.sites:0);
    else qty=1; // flat
    var cost=qty*s.unitCost;
    swLicenseCost+=cost;
    return{...s,qty,cost};
  });
  
  // Geo infra
  var geoCost=0;
  if(geoWLs.length>0)geoCost=250000; // baseline geo infra
  
  var sparePct=det.some(d=>d.criticality==='mission_critical')?10:det.some(d=>d.criticality==='business')?5:0;
  var spareCost=gCost*sparePct/100;
  
  // Edge
  var edgeTotalCost=0,edgeTotalPow=0,edgeTotalGPUs=0;
  if(edgeCfg.enabled){
    var ep=getPROC(edgeCfg.gpuModel);
    var perSiteGPUCost=edgeCfg.gpusPerSite*price(edgeCfg.gpuModel)*1.8;
    var perSiteCPU=15000; var perSiteDRAM=1200; var perSiteSSD=1600; var perSiteNIC=1000; var perSiteRack=5000; var perSiteLB=500;
    var perSiteCost=perSiteGPUCost+perSiteCPU+perSiteDRAM+perSiteSSD+perSiteNIC+perSiteRack+perSiteLB;
    var perSitePow=(edgeCfg.gpusPerSite*((ep||{}).tdp||350)+500)*edgeCfg.pue/1000;
    edgeTotalCost=perSiteCost*edgeCfg.sites;
    edgeTotalPow=perSitePow*edgeCfg.sites;
    edgeTotalGPUs=edgeCfg.gpusPerSite*edgeCfg.sites;
    if(edgeCfg.globalRouter)edgeTotalCost+=20000; // central router
  }
  
  var total=gCost+cpuCost+netCost+swCost+stoCost+rackCost+dramCost+chassisCost+commonCost+geoCost+spareCost+edgeTotalCost+agentOrcCost+swLicenseCost;
  
  return{det,tGPU:tGPU+edgeTotalGPUs,gCost,tPow:tPow+commonPow+edgeTotalPow+agentOrcPow,dlcRacks,acRacks,totalRacks,srvTotal,cpuCnt,cpuCost,netPorts,netCost,swCost,stoTB,stoTBRaw,nvmeTB,hddTB,objTB,stoCost,rackCost,dramCost,chassisCost,commonCost,geoCost,spareCost,edgeTotalCost,edgeTotalPow,edgeTotalGPUs,agentOrcSrv,agentOrcCost,agentOrcPow,swLicenseCost,swDetail,total,slaAll};
}


// ── Helper shims ─────────────────────────────────────────────────────────
function praxisShouldDisagg(w) {
  var m = getMDL(w.md);
  return m && m.pb >= 70 && w.ai >= 500 && w.ao >= 200 && w.src !== 'api';
}
function praxisShouldLightGPU(w) {
  var m = getMDL(w.md);
  return m && m.pb <= 13 && m.pb > 0 && w.src !== 'api';
}
function praxisSelectStorageVendor(k) {
  storageConfig.vendor = k;
  if (M.activeTab === 'arch') V.renderArchTab();
}


// ── renderArch (ported from IF) ──────────────────────────────────────────
V.renderArchTab = function(){
  var el=document.getElementById("tab-arch");
  if(!el)return;
  var sz=praxisSizing();
  var showP=true;
  if(!sz||!sz.det||!sz.det.length){el.innerHTML='<div class="coming-soon-tab"><h3>No workloads sized yet</h3><p>Add workloads in the Workloads tab first.</p></div>';return;}


  var onPremWLs=sz.det.filter(d=>d.src!=='api');
  
  // Derive actual serving engines used
  var enginesUsed={};onPremWLs.forEach(d=>{enginesUsed[d.eng]=(enginesUsed[d.eng]||0)+1;});
  // Derive GPU types used
  var gpusUsed={};onPremWLs.forEach(d=>{var p=getPROC(d.proc);if(p)gpusUsed[d.proc]={n:p.n,count:d.gpus,cool:p.cool,tier:p.tier};});
  // Derive networks used
  var netsUsed={};onPremWLs.forEach(d=>{var n=(NET[d.netChoice]||{n:"IB NDR",cpp:3000});if(n)netsUsed[d.netChoice]=(netsUsed[d.netChoice]||0)+d.gpus;});
  // Disagg workloads
  var disaggWLs=onPremWLs.filter(d=>d.disaggAccepted);
  // HA tiers
  var haTiers={mission_critical:0,business:0,best_effort:0};
  onPremWLs.forEach(d=>{haTiers[d.criticality]=(haTiers[d.criticality]||0)+1;});
  
  var sv=STORAGE_VENDORS[storageConfig.vendor]||STORAGE_VENDORS.ddn||STORAGE_VENDORS.ddn;
  
  el.innerHTML=`
    <!-- STORAGE VENDOR SELECTION -->
    <div class="card" style="border-left:4px solid var(--s1)">
      <h3>💾 Storage Architecture — Select Vendor for This Project</h3>
      <p style="font-size:10px;color:var(--txM);margin-bottom:8px">Choose the storage platform based on workload profile, budget, and customer preference. Vendor selection adjusts tier pricing, architecture, and BOM automatically.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${Object.keys(STORAGE_VENDORS).map(function(k){return [k,STORAGE_VENDORS[k]]}).map(([k,v])=>`<button class="mode-btn${storageConfig.vendor===k?' active':''}" style="font-size:10px;padding:5px 14px" onclick="praxisSelectStorageVendor('${k}')">${v.n}</button>`).join('')}
      </div>
      <div class="g2" style="gap:12px">
        <div class="ib i">
          <b style="color:var(--p2)">${sv.full}</b><br>
          <span style="font-size:10px">${sv.desc}</span><br>
          <span style="font-size:9px;color:var(--s2)">${sv.features.map(f=>'✓ '+f).join(' · ')}</span>
        </div>
        <div>
          <table style="font-size:10px"><tbody>
            <tr><td><b>Architecture</b></td><td>${{parallel_fs:'Parallel Filesystem',nas:'NAS',san:'SAN',object_only:'Object Storage'}[sv.arch]}</td></tr>
            <tr><td><b>NVMe / HDD / Object</b></td><td>${sv.nvme_pct}% / ${sv.hdd_pct}% / ${sv.obj_pct}%</td></tr>
            <tr><td><b>Replication</b></td><td>${sv.repl}× ${sv.repl===1?'(erasure coded)':'(replica)'}</td></tr>
            <tr><td><b>Raw Capacity Needed</b></td><td>${sz.stoTBRaw} TB → ${sz.stoTB} TB (after ${storageConfig.replication_factor}× repl)</td></tr>
            ${showP?`<tr><td><b>Appliance Cost</b></td><td>${fmt$(sv.appliance_cost)}</td></tr>
            <tr><td><b>Total Storage Cost</b></td><td><b>${fmt$(sz.stoCost)}</b></td></tr>`:``}
          </tbody></table>
        </div>
      </div>
    </div>

    <!-- YOUR SERVING STACK -->
    <div class="g2" style="margin-top:12px">
      <div class="card">
        <h3>🔧 Your Serving Stack</h3>
        <p style="font-size:9px;color:var(--txM);margin-bottom:6px">Derived from your workload configurations — not static reference data.</p>
        <div style="font-size:11px;font-weight:700;color:var(--p2);margin-bottom:4px">Serving Engines in Use</div>
        <table style="font-size:10px;margin-bottom:10px"><thead><tr><th>Engine</th><th>Workloads</th><th>Disagg</th><th>MIG</th><th>Best For</th></tr></thead><tbody>
          ${Object.entries(enginesUsed).map(([k,cnt])=>`<tr style="background:var(--sbg)">
            <td><b style="color:var(--p2)">${ENGINES[k]||k}</b></td><td>${cnt} workload(s)</td>
            <td>${k==='vllm'||k==='sglang'?'✅':'❌'}</td>
            <td>${k!=='sglang'?'✅':'⚠️'}</td>
            <td style="font-size:9px">${{vllm:'General, high throughput',trt_llm:'NVIDIA, lowest latency',sglang:'Structured, agents',triton:'Multi-model, MIG',lorax:'LoRA serving'}[k]||''}</td>
          </tr>`).join('')}
        </tbody></table>
        
        <div style="font-size:11px;font-weight:700;color:var(--p2);margin-bottom:4px">GPU Types Deployed</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${Object.entries(gpusUsed).map(([k,v])=>`<div style="padding:4px 8px;border-radius:5px;background:${v.cool==='dlc'?'var(--ibg)':'var(--bg)'};border:1px solid var(--bdr);font-size:9px">
            <b>${v.n}</b> ×${v.count} · ${v.cool==='dlc'?'🧊 DLC':'💨 AC'} · ${v.tier}
          </div>`).join('')}
        </div>
        
        ${disaggWLs.length>0?`
        <div style="font-size:11px;font-weight:700;color:var(--p2);margin:10px 0 4px">Disaggregated Inference</div>
        <table style="font-size:10px"><thead><tr><th>Workload</th><th>Prefill GPU</th><th>Decode Processor</th><th>TBT Factor</th></tr></thead><tbody>
          ${disaggWLs.map(d=>`<tr><td>${(WP[d.tp]||{n:d.name||d.tp,ic:"📋"})?.n||''}</td><td>${getPROC(d.proc)?.n||''}</td><td>${getPROC(d.decodeProc)?.n||''}</td><td>${getPROC(d.decodeProc)?.tbt_factor||1}×</td></tr>`).join('')}
        </tbody></table>`:'<div class="ib w" style="margin-top:8px;font-size:9px">No disaggregated inference configured. Consider enabling for 70B+ models to improve GPU utilization.</div>'}
      </div>

      <div class="card">
        <h3>🌐 Network & HA Architecture</h3>
        <div style="font-size:11px;font-weight:700;color:var(--p2);margin-bottom:4px">Scale-Out Fabrics</div>
        <table style="font-size:10px;margin-bottom:10px"><thead><tr><th>Fabric</th><th>GPUs</th><th>Bandwidth</th></tr></thead><tbody>
          ${Object.entries(netsUsed).map(([k,cnt])=>{var n=NET[k];return`<tr><td><b>${(n||{}).n||k}</b></td><td>${cnt} GPU ports</td><td>${(n||{}).bw||'?'}Gb/s</td></tr>`;}).join('')}
        </tbody></table>
        
        <div style="font-size:11px;font-weight:700;color:var(--p2);margin-bottom:4px">HA Distribution</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          ${haTiers.mission_critical?`<div class="ib d" style="flex:1;text-align:center"><b style="font-size:14px">${haTiers.mission_critical}</b><br><span style="font-size:9px">🔴 Mission Critical (N+2)</span></div>`:''}
          ${haTiers.business?`<div class="ib w" style="flex:1;text-align:center"><b style="font-size:14px">${haTiers.business}</b><br><span style="font-size:9px">🟡 Business (N+1)</span></div>`:''}
          ${haTiers.best_effort?`<div class="ib i" style="flex:1;text-align:center"><b style="font-size:14px">${haTiers.best_effort}</b><br><span style="font-size:9px">⚪ Best Effort</span></div>`:''}
        </div>
        
        <div style="font-size:11px;font-weight:700;color:var(--p2);margin-bottom:4px">Security Tiers</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          ${[...new Set(onPremWLs.map(d=>d.securityTier))].map(t=>`<span class="badge" style="background:${t==='regulated'?'rgba(255,85,57,.1);color:var(--p1)':t==='enhanced'?'rgba(255,182,0,.15);color:#B8860B':'rgba(136,146,176,.1);color:var(--txL)'};padding:4px 10px;font-size:10px">${SEC_TIERS[t]?.n||t}</span>`).join('')}
        </div>

        <div style="font-size:11px;font-weight:700;color:var(--p2);margin-bottom:4px">Cooling Layout</div>
        <div class="g2" style="gap:6px">
          <div class="ib i" style="text-align:center"><b style="font-size:14px">🧊 ${sz.dlcRacks}</b><br><span style="font-size:9px">DLC Racks (${priceOverrides._rackDLCkw||260}kW, PUE <1.1)</span></div>
          <div class="ib w" style="text-align:center"><b style="font-size:14px">💨 ${sz.acRacks}</b><br><span style="font-size:9px">AC Racks (${priceOverrides._rackACkw||90}kW, PUE 1.3)</span></div>
        </div>
      </div>
    </div>

    <!-- PROCESSOR ROADMAP (reference, collapsible) -->
    <div class="sec" style="margin-top:12px">
      <button class="sec-t" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span>📋 Processor Roadmap (Reference)</span><span>▼</span>
      </button>
      <div style="display:none;padding:12px" id="roadmapSec"><div id="roadmap"></div></div>
    </div>`;
  
  // Roadmap
  var groups={NVIDIA:[],AMD:[],ASIC:[],Custom:[]};
  Object.values(PROC).forEach(v=>{if(v._custom)groups.Custom.push(v);else if(v.t==='ASIC')groups.ASIC.push(v);else if(v.v==='NVIDIA'&&v.t!=='CPU')groups.NVIDIA.push(v);else if(v.v==='AMD'&&v.t!=='CPU')groups.AMD.push(v);});
  document.getElementById('roadmap').innerHTML=Object.entries(groups).filter(([,ps])=>ps.length>0).map(([vn,ps])=>`<div style="margin-bottom:8px"><b style="font-size:11px;color:${vn==='NVIDIA'?'var(--s2)':vn==='AMD'?'var(--p1)':vn==='Custom'?'var(--s3)':'var(--s1)'}">${vn}</b><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">${ps.map(v=>`<div style="padding:3px 6px;border-radius:4px;background:var(--bg);border:1px solid var(--bdr);font-size:9px"><b>${v.n}</b> ${v.hbm?v.hbm+'GB':''} ${v.av?'<span class="badge" style="background:rgba(255,182,0,.15);color:#B8860B">'+v.av+'</span>':''}</div>`).join('')}</div></div>`).join('');
}

// ── renderPerf (ported from IF) ──────────────────────────────────────────
V.renderPerfTab = function(){
  var el=document.getElementById("tab-perf");
  if(!el)return;
  var sz=praxisSizing();
  var showP=true;
  if(!sz||!sz.det||!sz.det.length){el.innerHTML='<div class="coming-soon-tab"><h3>No workloads sized yet</h3><p>Add workloads in the Workloads tab first.</p></div>';return;}
  var totalTPS=sz.det.reduce((s,d)=>s+d.totalTPS,0);
  var avgLatency=sz.det.length>0?Math.round(sz.det.reduce((s,d)=>s+d.estE2E,0)/sz.det.length):0;
  var onPremWLs=sz.det.filter(d=>d.src!=='api');

  
  el.innerHTML=`
    <div class="card" style="border-left:4px solid var(--p2)">
      <h3>📊 Performance Overview — Is Your Configuration Optimal?</h3>
      <p style="font-size:11px;color:var(--txM);margin-bottom:12px">This tab answers three questions: <b>(1)</b> Are you getting good value for money? <b>(2)</b> Where does your config sit on the latency/throughput trade-off? <b>(3)</b> Which GPU gives the best performance per dollar?</p>
      
      <table style="font-size:10px;margin-bottom:8px"><thead><tr>
        <th>Workload</th><th>Model</th><th>GPU</th><th>Count</th><th>TPS</th>
        <th>TTFT</th><th>TBT</th><th>E2E</th><th>SLA</th>
        ${showP?'<th>$/M Tok</th>':''}
        <th>Source</th>
      </tr></thead><tbody>
        ${onPremWLs.map((d,i)=>{
          var wp=(WP[d.tp]||{n:d.name||d.tp,ic:"📋"}),m=getMDL(d.md),p=getPROC(d.proc);
          var gpuMo=(d.gpus*price(d.proc)*1.8)/36,pwMo=d.pw*0.12*24*30;
          var cpm=d.moTok>0?((gpuMo+pwMo)/(d.moTok/1e6)).toFixed(2):'—';
          var slaOk=d.ttftOk&&d.tbtOk&&d.e2eOk;
          return`<tr style="background:${slaOk?'':'var(--dbg)'}">
            <td><b>${(wp||{}).ic||''} ${(wp||{}).n||''}</b></td>
            <td>${(m||{}).n||''}</td>
            <td>${(p||{}).n||''}</td>
            <td>${d.gpus}</td>
            <td style="font-weight:700;color:var(--s1)">${fmtN(d.totalTPS)}</td>
            <td style="color:${d.ttftOk?'var(--s2)':'var(--p1)'}">${d.estTTFT}ms</td>
            <td style="color:${d.tbtOk?'var(--s2)':'var(--p1)'}">${d.estTBT}ms</td>
            <td style="color:${d.e2eOk?'var(--s2)':'var(--p1)'}">${fmtN(d.estE2E)}ms</td>
            <td>${slaOk?'✅':'❌'}</td>
            ${showP?`<td style="font-weight:600">${currSym()}${cpm}</td>`:''}
            <td style="font-size:8px;color:${d.bmSource==='estimated'?'var(--txL)':'var(--s2)'}">${d.bmSource==='exact'?'✅BM':d.bmSource==='estimated'?'Est.':'~BM'}</td>
          </tr>`;
        }).join('')}
        <tr style="font-weight:700;background:var(--bg)">
          <td colspan="4">TOTAL</td><td style="color:var(--s1)">${fmtN(totalTPS)} tok/s</td>
          <td colspan="3" style="text-align:center">${avgLatency}ms avg E2E</td>
          <td>${sz.slaAll?'✅':'⚠️'}</td>${showP?'<td></td>':''}<td></td>
        </tr>
      </tbody></table>
    </div>

    <div class="g2" style="margin-top:12px">
      <div class="card">
        <h3>💰 Cost vs Throughput — Are You Getting Good Value?</h3>
        <p style="font-size:9px;color:var(--txM);margin-bottom:6px">⭐ = your workloads · ● = GPU reference points (single GPU, 70B FP8). Top-left = best value (high throughput, low cost).</p>
        <div class="cc t"><canvas id="cPareto"></canvas></div>
      </div>
      <div class="card">
        <h3>⚡ Latency vs Throughput — Where's Your Operating Point?</h3>
        <p style="font-size:9px;color:var(--txM);margin-bottom:6px">⭐ = your workloads · Dashed lines = SLA targets · Green zone = sweet spot. Bottom-right = ideal.</p>
        <div class="cc t"><canvas id="cLatTput"></canvas></div>
      </div>
    </div>
    
    <div class="g2" style="margin-top:12px">
      <div class="card">
        <h3>📊 GPU Price/Performance Ranking</h3>
        <p style="font-size:9px;color:var(--txM);margin-bottom:6px">TFLOPS per $1K — higher = more compute per dollar. Use for GPU selection decisions.</p>
        <div class="cc"><canvas id="cRank"></canvas></div>
      </div>
      <div class="card">
        <h3>🏆 Configuration Recommendations</h3>
        <div class="ib s" style="padding:14px"><b style="font-size:13px;color:var(--s2)">Optimizations for your workload mix</b>
        <div style="margin-top:8px;font-size:11px;line-height:1.8">
          ${sz.det.some(d=>(getMDL(d.md)?.pb||0)>=70)?'<div>● <b>B200/B300 FP8</b> recommended for your 70B+ models — best throughput per dollar in this class.</div>':''}
          ${sz.det.some(d=>d.recLight)?'<div>● <b>L40S or L4</b> can handle your ≤13B models at 60-80% lower cost than B200. Check the Pareto chart.</div>':''}
          ${sz.det.some(d=>d.recDisagg)?'<div>● <b>Enable disaggregated inference</b> for large models — separate prefill (compute-bound) from decode (bandwidth-bound) for 2-4× better GPU utilization.</div>':''}
          ${sz.det.some(d=>d.migProfile!=='full')?'<div>● <b>MIG active</b> — you\'re already consolidating small models. Verify isolation requirements are met.</div>':''}
          ${sz.det.some(d=>d.isAgentic)?'<div>● <b>Agentic workloads detected</b> — GPU utilization will be ~30-40% due to tool-calling gaps. Continuous batching essential.</div>':''}
          ${sz.det.some(d=>d.isGeo)?'<div>● <b>Geospatial workloads</b> — tile-based batching (batch 64-256) is optimal. Consider L40S for cost-effective tile inference.</div>':''}
          ${!sz.slaAll?'<div style="color:var(--p1)">● <b>⚠️ SLA gaps detected</b> — check the Workload Configurator\'s Latency SLA sections for specific remediation steps.</div>':''}
          <div>● <b>IB NDR 400G</b> for E-W GPU scale-out fabric. <b>DLC cooling</b> for TDP>500W GPUs, <b>AC</b> for lightweight.</div>
        </div></div>
      </div>
    </div>`;
}

// ── renderTok (ported from IF) ──────────────────────────────────────────
V.renderTokTab = function(){
  var el=document.getElementById("tab-tok");
  if(!el)return;
  var sz=praxisSizing();
  var showP=true;
  if(!sz||!sz.det||!sz.det.length){el.innerHTML='<div class="coming-soon-tab"><h3>No workloads sized yet</h3><p>Add workloads in the Workloads tab first.</p></div>';return;}

  var rows=sz.det.map(d=>{var m=getMDL(d.md),p=getPROC(d.proc);var gpuMo=(d.gpus*price(d.proc)*1.8)/36,pwMo=d.pw*0.12*24*30,onPrem=gpuMo+pwMo;
    var cpm=d.moTok>0?(onPrem/(d.moTok/1e6)).toFixed(2):'—';var inp=d.ai/(d.ai+d.ao+1),out=1-inp;
    var apiEq=d.moTok>0?((d.moTok*inp*2.5+d.moTok*out*10)/1e6).toFixed(0):'—';
    var sv=apiEq!=='—'&&onPrem>0?Math.round((1-onPrem/apiEq)*100):'—';
    return{n:(WP[d.tp]||{n:d.name||d.tp,ic:"📋"})?.n||'',mdl:(m||{}).n||'',moTok:d.moTok,onPrem,cpm,apiEq,src:d.src,sv};
  });
  el.innerHTML=`<div class="card"><h3>Per-Workload Tokenomics</h3><table><thead><tr><th>Workload</th><th>Model</th><th>Src</th><th>Mo Tokens</th>${showP?'<th>On-Prem $/mo</th><th>$/1M Tok</th><th>API Equiv</th><th>Savings</th>':''}</tr></thead><tbody>
    ${rows.map(r=>`<tr><td><b>${r.n}</b></td><td>${r.mdl}</td><td>${r.src==='api'?'☁️':r.src==='hybrid'?'🔀':'🏢'}</td><td>${fmtN(r.moTok)}</td>${showP?`<td>${r.src==='api'?'—':fmt$(r.onPrem)}</td><td>${r.src==='api'?'—':'$'+r.cpm}</td><td>$${r.apiEq}</td><td style="color:${r.sv>0?'var(--s2)':'var(--p1)'};font-weight:600">${r.sv}%</td>`:''}</tr>`).join('')}
  </tbody></table></div>
  <div class="g2"><div class="card"><h3>API vs On-Prem Crossover</h3><div class="cc"><canvas id="cTok"></canvas></div></div>
  <div class="card"><h3>Batch vs Latency vs Throughput</h3><div class="cc"><canvas id="cBatch"></canvas></div></div></div>`;
}

// ── renderBOM (ported from IF) ──────────────────────────────────────────
V.renderBOMTab = function(){
  var el=document.getElementById("tab-bom");
  if(!el)return;
  var sz=praxisSizing();
  var showP=true;
  if(!sz||!sz.det||!sz.det.length){el.innerHTML='<div class="coming-soon-tab"><h3>No workloads sized yet</h3><p>Add workloads in the Workloads tab first.</p></div>';return;}
var showP=true;
  var h=`<div class="card" style="background:linear-gradient(135deg,rgba(0,40,112,.02),rgba(28,56,245,.02))"><h3>BOM — Per-Workload Configs & Aggregation</h3>
    <div class="g5" style="margin-bottom:16px">
      <div class="st"><div class="v" style="color:var(--p1)">${sz.tGPU}</div><div class="l">GPUs</div></div>
      <div class="st"><div class="v" style="color:var(--p2)">${sz.srvTotal}</div><div class="l">Servers</div></div>
      <div class="st"><div class="v" style="color:var(--s1)">${sz.dlcRacks}+${sz.acRacks}</div><div class="l">DLC+AC Racks</div></div>
      <div class="st"><div class="v" style="color:var(--s2)">${sz.stoTB}TB</div><div class="l">Storage</div></div>
      <div class="st"><div class="v" style="color:var(--s3)">${sz.tPow.toFixed(0)}kW</div><div class="l">Power</div></div>
    </div>`;
  
  // Per-workload detail
  sz.det.forEach((d,i)=>{
    var p=getPROC(d.proc),wp=(WP[d.tp]||{n:d.name||d.tp,ic:"📋"}),m=getMDL(d.md),n=(NET[d.netChoice]||{n:"IB NDR",cpp:3000});
    if(d.src==='api'){h+=`<div style="margin-bottom:10px;padding:8px;background:var(--wbg);border-radius:6px;border-left:3px solid var(--s3);font-size:10px"><b>WL${i+1}: ${(wp||{}).n||''}</b> — ☁️ API · ${(m||{}).n||''} · ~${showP?fmt$(d.apiMoCost):'—'}/mo</div>`;return;}
    var nicPer=Math.ceil(d.gpusPer/2),diskPer=d.gpusPer*2;
    h+=`<div style="margin-bottom:10px;padding:10px;background:var(--bg);border-radius:6px;border-left:3px solid ${['var(--p1)','var(--s1)','var(--s2)','var(--s3)','var(--p2)'][i%5]}">
      <div style="font-weight:700;font-size:11px;color:var(--p2);display:flex;justify-content:space-between"><span>${(wp||{}).ic||''} WL${i+1}: ${(wp||{}).n||''}</span><span style="font-size:10px;color:var(--txM)">${d.servers}srv × ${d.gpusPer}GPU${d.scaleUp?' + NVLink':''} · ${HA_TIERS[d.criticality]?.n} · ${SEC_TIERS[d.securityTier]?.n}</span></div>
      <table style="font-size:10px;margin-top:4px"><thead><tr><th>Component</th><th>Spec</th><th>/Srv</th><th>Total</th>${showP?'<th>Cost</th>':''}</tr></thead><tbody>
        <tr><td><b>GPU${d.disaggAccepted?' (Prefill)':''}</b></td><td>${(p||{}).n||''} ${d.qt.toUpperCase()} ${d.migProfile!=='full'?'MIG:'+d.migProfile:''}</td><td>${d.gpusPer}</td><td>${d.gpus}</td>${showP?`<td>${fmt$(d.gpus*price(d.proc))}</td>`:''}</tr>
        ${d.decGPUs?`<tr style="background:var(--ibg)"><td><b>GPU (Decode)</b></td><td>${getPROC(d.decodeProc)?.n||''}</td><td>${d.gpusPer}</td><td>${d.decGPUs}</td>${showP?`<td>${fmt$(d.decCost)}</td>`:''}</tr>`:''}
        <tr><td><b>CPU</b></td><td>EPYC 9965 Turin</td><td>2</td><td>${d.servers*2}</td>${showP?`<td>${fmt$(d.servers*2*price('Turin_9965'))}</td>`:''}</tr>
        <tr><td><b>DRAM</b></td><td>DDR5 128GB DIMMs</td><td>8 (1TB)</td><td>${d.servers*8} DIMMs</td>${showP?`<td>${fmt$(d.servers*2400)}</td>`:''}</tr>
        <tr><td><b>NIC</b></td><td>${(n||{}).n||''}</td><td>${nicPer}</td><td>${d.servers*nicPer}</td>${showP?`<td>${fmt$(d.servers*nicPer*((n||{}).cpp||3000))}</td>`:''}</tr>
        <tr><td><b>SSD</b></td><td>3.84TB NVMe</td><td>${diskPer}</td><td>${d.servers*diskPer}</td>${showP?`<td>${fmt$(d.servers*diskPer*800)}</td>`:''}</tr>
        <tr><td><b>Cables</b></td><td>Net DAC + Power C19</td><td>${nicPer+2}</td><td>${d.servers*(nicPer+2)}</td>${showP?`<td>${fmt$(d.servers*(nicPer+2)*50)}</td>`:''}</tr>
      </tbody></table></div>`;
  });

  // Common infra
  h+=`<div style="margin-bottom:10px;padding:10px;background:var(--ibg);border-radius:6px;border-left:3px solid var(--s1)">
    <div style="font-weight:700;font-size:11px;color:var(--p2)">🏗️ Common Infrastructure</div>
    <table style="font-size:10px;margin-top:4px"><tbody>
      <tr><td><b>API Gateway/Router</b></td><td>LiteLLM HA cluster</td><td>3 CPU servers</td>${showP?`<td>${fmt$(45000)}</td>`:''}</tr>
      <tr><td><b>Load Balancer</b></td><td>NGINX/Envoy</td><td>2 instances</td>${showP?`<td>${fmt$(10000)}</td>`:''}</tr>
      <tr><td><b>k8s Control Plane</b></td><td>KServe autoscaler</td><td>5 nodes</td>${showP?`<td>${fmt$(75000)}</td>`:''}</tr>
      <tr><td><b>Monitoring</b></td><td>Prometheus + Grafana</td><td>2 servers</td>${showP?`<td>${fmt$(30000)}</td>`:''}</tr>
      ${sz.agentOrcSrv>0?`<tr><td><b>Agentic Orchestrator</b></td><td>Agent runtime, tool exec, state mgmt (64-core, 256GB)</td><td>${sz.agentOrcSrv} CPU servers</td>${showP?`<td>${fmt$(sz.agentOrcCost)}</td>`:''}</tr>`:''}
      ${sz.geoCost>0?`<tr><td><b>Geospatial Platform</b></td><td>PostGIS, STAC, tiling, RAG, preprocessing, GIS fusion</td><td>~10 servers + storage</td>${showP?`<td>${fmt$(sz.geoCost)}</td>`:''}</tr>`:''}
    </tbody></table></div>`;

  // Aggregated
  var gpuTotals={};sz.det.filter(d=>d.src!=='api').forEach(d=>{gpuTotals[d.proc]=(gpuTotals[d.proc]||0)+d.gpus;if(d.decGPUs)gpuTotals[d.decodeProc]=(gpuTotals[d.decodeProc]||0)+d.decGPUs;});
  
  h+=`<h3 style="margin-top:16px;color:var(--p2)">Aggregated BOM</h3><table><thead><tr><th>Category</th><th>Spec</th><th>Qty</th>${showP?'<th>Total</th>':''}</tr></thead><tbody>`;
  Object.entries(gpuTotals).forEach(([k,c])=>{h+=`<tr><td><b>GPU</b></td><td>${((getPROC(k)||{}).n||k)}</td><td>${c}</td>${showP?`<td><b>${fmt$(c*price(k))}</b></td>`:''}</tr>`;});
  h+=`<tr><td><b>Chassis</b></td><td>DLC/AC-ready</td><td>${sz.srvTotal}</td>${showP?`<td><b>${fmt$(sz.chassisCost)}</b></td>`:''}</tr>`;
  h+=`<tr><td><b>CPUs</b></td><td>EPYC 9965</td><td>${sz.cpuCnt}</td>${showP?`<td><b>${fmt$(sz.cpuCost)}</b></td>`:''}</tr>`;
  h+=`<tr><td><b>DRAM</b></td><td>DDR5 128GB DIMMs</td><td>${sz.srvTotal*8}</td>${showP?`<td><b>${fmt$(sz.dramCost)}</b></td>`:''}</tr>`;
  h+=`<tr><td><b>NICs</b></td><td>Mixed fabrics</td><td>${sz.netPorts}</td>${showP?`<td><b>${fmt$(sz.netCost)}</b></td>`:''}</tr>`;
  h+=`<tr><td><b>Switches</b></td><td>Leaf/Spine</td><td>${Math.ceil(sz.netPorts/64)}</td>${showP?`<td><b>${fmt$(sz.swCost)}</b></td>`:''}</tr>`;
  // Tiered storage
  h+=`<tr style="background:var(--ibg)"><td colspan="${showP?4:3}" style="font-weight:700;color:var(--s1);font-size:10px;padding:4px 5px">STORAGE (${sz.stoTBRaw}TB raw × ${storageConfig.replication_factor}x repl = ${sz.stoTB}TB)</td></tr>`;
  h+=`<tr><td>&nbsp;&nbsp;NVMe SSD</td><td>Model weights, KV cache, hot data</td><td>${sz.nvmeTB}TB</td>${showP?`<td>${fmt$(sz.nvmeTB*storageConfig.nvme_price_per_tb)}</td>`:''}</tr>`;
  h+=`<tr><td>&nbsp;&nbsp;HDD / SAS</td><td>Checkpoints, logs, warm data</td><td>${sz.hddTB}TB</td>${showP?`<td>${fmt$(sz.hddTB*storageConfig.hdd_price_per_tb)}</td>`:''}</tr>`;
  h+=`<tr><td>&nbsp;&nbsp;Object Store</td><td>Archive, geospatial, cold data</td><td>${sz.objTB}TB</td>${showP?`<td>${fmt$(sz.objTB*storageConfig.obj_price_per_tb)}</td>`:''}</tr>`;
  h+=`<tr><td>&nbsp;&nbsp;Appliance</td><td>${STORAGE_VENDORS[storageConfig.vendor]||(STORAGE_VENDORS.ddn||{}).full||storageConfig.appliance}</td><td>1</td>${showP?`<td>${fmt$(storageConfig.appliance_cost)}</td>`:''}</tr>`;
  h+=`<tr><td><b>Storage Total</b></td><td><b>${STORAGE_VENDORS[storageConfig.vendor]||(STORAGE_VENDORS.ddn||{}).n||'Generic'}</b></td><td><b>${sz.stoTB}TB</b></td>${showP?`<td><b>${fmt$(sz.stoCost)}</b></td>`:''}</tr>`;
  h+=`<tr><td><b>Racks</b></td><td>DLC 260kW: ${sz.dlcRacks}, AC 90kW: ${sz.acRacks}</td><td>${sz.totalRacks}</td>${showP?`<td><b>${fmt$(sz.rackCost)}</b></td>`:''}</tr>`;
  h+=`<tr><td><b>Common Infra</b></td><td>Router, LB, k8s, monitoring</td><td>${12} srv</td>${showP?`<td><b>${fmt$(sz.commonCost)}</b></td>`:''}</tr>`;
  if(sz.agentOrcSrv>0)h+=`<tr><td><b>Agentic Orchestrator</b></td><td>Agent runtime CPU servers (64-core, 256GB)</td><td>${sz.agentOrcSrv} srv</td>${showP?`<td><b>${fmt$(sz.agentOrcCost)}</b></td>`:''}</tr>`;
  if(sz.geoCost>0)h+=`<tr><td><b>Geospatial Platform</b></td><td>PostGIS, STAC, RAG, preprocessing</td><td>—</td>${showP?`<td><b>${fmt$(sz.geoCost)}</b></td>`:''}</tr>`;
  if(sz.spareCost>0)h+=`<tr><td><b>Spare Parts</b></td><td>Hot spare GPUs (${sz.det.some(d=>d.criticality==='mission_critical')?'10':'5'}%)</td><td>—</td>${showP?`<td><b>${fmt$(sz.spareCost)}</b></td>`:''}</tr>`;
  if(sz.edgeTotalCost>0)h+=`<tr><td><b>Edge Deployment</b></td><td>${edgeCfg.sites} sites × ${edgeCfg.gpusPerSite} ${getPROC(edgeCfg.gpuModel)?.n||''}</td><td>${sz.edgeTotalGPUs} GPUs</td>${showP?`<td><b>${fmt$(sz.edgeTotalCost)}</b></td>`:''}</tr>`;
  // Software stack
  h+=`<tr style="background:var(--ibg)"><td colspan="${showP?4:3}" style="font-weight:700;color:var(--s1);font-size:10px;padding:4px 5px">SOFTWARE LICENSES (Annual)</td></tr>`;
  sz.swDetail.forEach(s=>{
    h+=`<tr><td>&nbsp;&nbsp;${s.name}</td><td>${s.cat} · ${s.license.replace('_',' ')}</td><td>${s.qty} ${s.license==='flat'?'':'units'}</td>${showP?`<td>${s.cost>0?fmt$(s.cost)+'/yr':'$0 (OSS)'}
    </td>`:''}</tr>`;
  });
  h+=`<tr><td><b>Software Total</b></td><td>(annual)</td><td></td>${showP?`<td><b>${fmt$(sz.swLicenseCost)}/yr</b></td>`:''}</tr>`;
  h+=`<tr class="bt"><td colspan="3" style="font-size:13px;padding:8px">TOTAL BOM (HW + SW Year 1${sz.edgeTotalCost>0?' + Edge':''})</td>${showP?`<td style="font-size:15px;padding:8px">${fmt$(sz.total)}</td>`:''}</tr></tbody></table>`;

  // Three-way aggregation comparison
  var hasSmall=sz.det.some(d=>d.recLight&&d.src!=='api');
  if(hasSmall){
    var smallGPUs=sz.det.filter(d=>d.recLight&&d.src!=='api').reduce((s,d)=>s+d.gpus,0);
    var smallCost=sz.det.filter(d=>d.recLight&&d.src!=='api').reduce((s,d)=>s+d.cost,0);
    var migGPUs=Math.ceil(smallGPUs/3); // MIG 3 instances per GPU
    var migCost=migGPUs*price('B200')*1.8;
    var consolGPUs=Math.ceil(smallGPUs/4);
    var consolCost=consolGPUs*price('B200')*1.8;
    
    h+=`<div style="margin-top:20px"><h3 style="color:var(--p2)">Aggregation Strategy for Lightweight Workloads (${smallGPUs} small GPUs)</h3>
      <div class="g3" style="margin-top:10px">
        <div class="agg-card${aggStrategy==='dedicated'?' sel':''}" onclick="aggStrategy='dedicated';render()">
          <h4>A: Dedicated Lightweight GPUs</h4>
          <div style="font-size:20px;font-weight:700;color:var(--p1)">${smallGPUs} GPUs</div>
          <div style="font-size:10px;color:var(--txM);margin-top:4px">${showP?fmt$(smallCost):''}</div>
          <div style="font-size:9px;margin-top:6px">✅ Full isolation<br>✅ Simple ops<br>⚠️ More servers/NICs/racks</div>
        </div>
        <div class="agg-card${aggStrategy==='mig'?' sel':''}" onclick="aggStrategy='mig';render()">
          <h4>B: MIG on High-End GPUs</h4>
          <div style="font-size:20px;font-weight:700;color:var(--s1)">${migGPUs} B200 GPUs</div>
          <div style="font-size:10px;color:var(--txM);margin-top:4px">${showP?fmt$(migCost):''}</div>
          <div style="font-size:9px;margin-top:6px">✅ HW isolation (MIG)<br>✅ Fewer servers<br>⚠️ MIG config complexity</div>
        </div>
        <div class="agg-card${aggStrategy==='consolidated'?' sel':''}" onclick="aggStrategy='consolidated';render()">
          <h4>C: Consolidated Multi-Model</h4>
          <div style="font-size:20px;font-weight:700;color:var(--s2)">${consolGPUs} B200 GPUs</div>
          <div style="font-size:10px;color:var(--txM);margin-top:4px">${showP?fmt$(consolCost):''}</div>
          <div style="font-size:9px;margin-top:6px">✅ Fewest GPUs/servers<br>⚠️ SW isolation only<br>⚠️ Multi-model complexity</div>
        </div>
      </div>
      <div class="ib i" style="margin-top:8px">Selected: <b>${aggStrategy==='dedicated'?'Dedicated Lightweight':aggStrategy==='mig'?'MIG Partitioning':'Consolidated'}</b>. ${aggStrategy==='mig'?'Requires MIG-compatible serving engine (vLLM, TRT-LLM, Triton).':aggStrategy==='consolidated'?'Requires multi-model serving (Triton or vLLM multi-model mode).':'Each small workload gets its own L40S/L4 GPU.'}</div>
    </div>`;
  }

  // Network Fabric Topology
  var totalNICPorts=sz.det.filter(d=>d.src!=='api').reduce((s,d)=>{var nicPer=Math.ceil(d.gpusPer/2);return s+d.servers*nicPer;},0);
  var ewLeafSw=Math.ceil(totalNICPorts/64);  // 64-port leaf switches
  var ewSpineSw=Math.max(2,Math.ceil(ewLeafSw/4)); // spine: 1 per 4 leaf (min 2)
  var nsLeafSw=Math.max(2,Math.ceil(sz.srvTotal/32)); // N-S: 1 per 32 servers (mgmt/API)
  var nsSpineSw=Math.max(1,Math.ceil(nsLeafSw/4));
  var totalSw=ewLeafSw+ewSpineSw+nsLeafSw+nsSpineSw;
  var mgmtSw=Math.max(1,Math.ceil(sz.srvTotal/48)); // 1GbE OOB mgmt
  var ewCablesDAC=totalNICPorts; // server→leaf
  var ewCablesISL=ewLeafSw*ewSpineSw; // leaf→spine
  var nsCables=sz.srvTotal+nsLeafSw*nsSpineSw;
  var mgmtCables=sz.srvTotal;
  var totalCables=ewCablesDAC+ewCablesISL+nsCables+mgmtCables;

  h+=`<div style="margin-top:20px"><h3 style="color:var(--p2)">🔌 Network Fabric Topology</h3>
    <div class="g2" style="gap:14px;margin-top:10px">
      <div style="padding:10px;background:var(--ibg);border-radius:6px;border-left:3px solid var(--s1)">
        <div style="font-weight:700;font-size:11px;color:var(--p2);margin-bottom:6px">East-West (GPU Scale-Out)</div>
        <table style="font-size:10px"><tbody>
          <tr><td><b>Leaf Switches</b></td><td>${ewLeafSw}× 64-port (${NET[sz.det[0]?.netChoice]?.n||'IB NDR'})</td>${showP?`<td>${fmt$(ewLeafSw*45000)}</td>`:''}</tr>
          <tr><td><b>Spine Switches</b></td><td>${ewSpineSw}× (${ewLeafSw>4?'fat-tree':'leaf-spine'})</td>${showP?`<td>${fmt$(ewSpineSw*65000)}</td>`:''}</tr>
          <tr><td><b>Server→Leaf Cables</b></td><td>${ewCablesDAC}× DAC/AOC</td>${showP?`<td>${fmt$(ewCablesDAC*80)}</td>`:''}</tr>
          <tr><td><b>Leaf→Spine ISL</b></td><td>${ewCablesISL}× AOC</td>${showP?`<td>${fmt$(ewCablesISL*120)}</td>`:''}</tr>
        </tbody></table>
      </div>
      <div style="padding:10px;background:var(--sbg);border-radius:6px;border-left:3px solid var(--s2)">
        <div style="font-weight:700;font-size:11px;color:var(--p2);margin-bottom:6px">North-South (API / Client Traffic)</div>
        <table style="font-size:10px"><tbody>
          <tr><td><b>Leaf Switches</b></td><td>${nsLeafSw}× 32-port (100GbE)</td>${showP?`<td>${fmt$(nsLeafSw*15000)}</td>`:''}</tr>
          <tr><td><b>Spine/Border</b></td><td>${nsSpineSw}× (aggregation)</td>${showP?`<td>${fmt$(nsSpineSw*25000)}</td>`:''}</tr>
          <tr><td><b>Server→Leaf Cables</b></td><td>${sz.srvTotal}× Cat6a/DAC</td>${showP?`<td>${fmt$(sz.srvTotal*30)}</td>`:''}</tr>
          <tr><td><b>Leaf→Spine ISL</b></td><td>${nsLeafSw*nsSpineSw}× DAC</td>${showP?`<td>${fmt$(nsLeafSw*nsSpineSw*50)}</td>`:''}</tr>
        </tbody></table>
      </div>
    </div>
    <div class="g3" style="gap:10px;margin-top:10px">
      <div style="padding:10px;background:var(--bg);border-radius:6px;border-left:3px solid var(--txL)">
        <div style="font-weight:700;font-size:11px;color:var(--p2);margin-bottom:4px">Management (OOB)</div>
        <div style="font-size:10px"><b>${mgmtSw}</b> × 48-port 1GbE switch · <b>${mgmtCables}</b> Cat6 cables</div>
      </div>
      <div class="st" style="background:var(--wbg);border-radius:6px;padding:10px">
        <div class="v" style="color:var(--p1)">${totalSw}+${mgmtSw}</div><div class="l">Total Switches</div>
      </div>
      <div class="st" style="background:var(--dbg);border-radius:6px;padding:10px">
        <div class="v" style="color:var(--p2)">${totalCables}</div><div class="l">Total Cables</div>
      </div>
    </div>
  </div>`;

  // Power
  var ppu=sz.totalRacks>0?(sz.tPow/sz.totalRacks).toFixed(0):0;
  h+=`<div class="ps"><div class="pc" style="background:var(--dbg)"><div class="v" style="color:var(--p1)">${sz.tPow.toFixed(0)}<span class="u">kW</span></div><div class="l">Power</div><div class="sb">≈${(sz.tPow*8.76).toFixed(0)}MWh/yr · PUE: DLC 1.1, AC 1.3</div></div>
    <div class="pc" style="background:var(--ibg)"><div class="v" style="color:var(--s1)">${sz.dlcRacks}+${sz.acRacks}</div><div class="l">DLC + AC Racks</div></div>
    <div class="pc" style="background:var(--sbg)"><div class="v" style="color:var(--s2)">${ppu}<span class="u">kW/rack</span></div><div class="l">Avg Power/Rack</div></div></div>`;
  
  h+=`</div><div class="card"><h3>Cost Breakdown</h3><div class="cc"><canvas id="cCost"></canvas></div></div>`;
  el.innerHTML=h;
}

// ── Charts (ported from IF rebuildCharts) ────────────────────────────────
function praxisRebuildCharts(){
  var sz=praxisSizing(); if(!sz||!sz.det)return;
  // Latency chart
  var lc=document.getElementById('cLat');
  if(lc){dc('lat'); var ks=Object.keys(WP).slice(0,12);
    charts.lat=new Chart(lc,{type:'bar',data:{labels:ks.map(k=>((WP[k]||{}).n||k)),datasets:[
      {label:'TTFT(ms)',data:ks.map(k=>((WP[k]||{}).ttft||500)),backgroundColor:'#FF5539',borderRadius:2,yAxisID:'y'},
      {label:'E2E(ms)',data:ks.map(k=>((WP[k]||{}).e2e||2000)),backgroundColor:'#00B290',borderRadius:2,yAxisID:'y1'},
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{family:'Roboto',size:10}}}},scales:{x:{ticks:{font:{size:8},maxRotation:25}},y:{position:'left',title:{display:true,text:'TTFT',font:{size:9}}},y1:{position:'right',title:{display:true,text:'E2E',font:{size:9}},grid:{drawOnChartArea:false}}}}});}
  // Tokenomics crossover — real API pricing (closed, hosted open-source, vs on-prem)
  var tc=document.getElementById('cTok');
  if(tc){dc('tok');
    var baseTok=sz.det.reduce((s,d)=>s+d.moTok,0)||1e7;
    var gpuMo=sz.det.filter(d=>d.src!=='api').reduce((s,d)=>s+(d.gpus*price(d.proc)*1.8)/36,0),pwMo=sz.tPow*0.12*24*30,base=gpuMo+pwMo;
    // Scale so breakeven is ~70% across x-axis
    var crossEst=base>0?base/7.5*1e6:baseTok;
    var maxT=Math.max(crossEst*3,baseTok*2);
    var pts=[0.03,0.08,0.15,0.3,0.5,0.7,1,1.5,2,3].map(m=>Math.round(maxT*m));
    // API rates: blended $/1M tok (40% input, 60% output weight)
    var apis=[
      {n:'GPT-4o (OpenAI)',b:2.5*0.4+10*0.6,c:'#FF5539',w:1.5},
      {n:'GPT-4o-mini',b:0.15*0.4+0.6*0.6,c:'#FF8A65',w:1},
      {n:'Claude Sonnet (Anthropic)',b:3*0.4+15*0.6,c:'#1C38F5',w:1.5},
      {n:'Gemini 1.5 Pro (Google)',b:1.25*0.4+5*0.6,c:'#FFB600',w:1.5},
      {n:'Mistral Large (hosted)',b:2*0.4+6*0.6,c:'#8892B0',w:1,dash:[4,3]},
      {n:'DeepSeek V3 (hosted)',b:0.27*0.4+1.1*0.6,c:'#00B290',w:1,dash:[4,3]},
      {n:'Minimax (hosted)',b:0.15*0.4+0.55*0.6,c:'#9575CD',w:1,dash:[4,3]},
    ];
    var datasets=[{label:'\u2B50 Your On-Prem',data:pts.map(t=>Math.round(base*Math.max(Math.sqrt(t/baseTok),0.3))),borderColor:'#002870',borderWidth:3,borderDash:[8,4],tension:.3,pointRadius:4,pointStyle:'rectRot'}];
    apis.forEach(a=>{datasets.push({label:a.n,data:pts.map(t=>Math.round(t*a.b/1e6)),borderColor:a.c,borderWidth:a.w,tension:.2,pointRadius:2,borderDash:a.dash||[]});});
    charts.tok=new Chart(tc,{type:'line',data:{labels:pts.map(t=>fmtN(t)),datasets},options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:8},usePointStyle:true,boxWidth:12}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fmt$(c.parsed.y)}/mo`}}},
      scales:{x:{title:{display:true,text:'Monthly Token Volume',font:{size:9}}},y:{title:{display:true,text:'Monthly Cost ($)',font:{size:9}},ticks:{callback:v=>fmt$(v)}}}}});}
  // Batch
  var bc=document.getElementById('cBatch');
  if(bc){dc('bat'); var bd=[{b:1,l:25,t:40},{b:4,l:34,t:144},{b:16,l:78,t:440},{b:64,l:260,t:1020},{b:128,l:500,t:1300}];
    charts.bat=new Chart(bc,{type:'line',data:{labels:bd.map(d=>d.b),datasets:[
      {label:'Latency(ms)',data:bd.map(d=>d.l),borderColor:'#FF5539',borderWidth:2,yAxisID:'y',tension:.3,pointRadius:2},
      {label:'Throughput',data:bd.map(d=>d.t),borderColor:'#00B290',borderWidth:2,yAxisID:'y1',fill:true,backgroundColor:'rgba(0,178,144,.06)',tension:.3,pointRadius:2},
    ]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{title:{display:true,text:'Batch',font:{size:9}}},y:{position:'left',title:{display:true,text:'Latency',font:{size:9}}},y1:{position:'right',title:{display:true,text:'Throughput',font:{size:9}},grid:{drawOnChartArea:false}}}}});}
  // Pareto — $/M tokens vs throughput (lower cost + higher throughput = top-left = best)
  var pc=document.getElementById('cPareto');
  if(pc){dc('par');
    // Plot each on-prem workload with label
    var wlPts=sz.det.filter(d=>d.src!=='api'&&d.gpus>0&&d.moTok>0).map((d,i)=>{
      var gpuMo2=(d.gpus*price(d.proc)*1.8)/36,pwMo2=d.pw*0.12*24*30;
      var cpm=(gpuMo2+pwMo2)/(d.moTok/1e6);
      return{x:+cpm.toFixed(2),y:Math.round(d.totalTPS),lbl:(WP[d.tp]?.ic||'')+' '+(WP[d.tp]?.n||'WL'+(i+1))};
    });
    // GPU reference points (single GPU, 70B FP8 baseline)
    var refPts=["H200_SXM","B200","B300","MI325X","L40S"].map(k=>{var g=getPROC(k);if(!g||!g.fp8)return null;
      var moC=g.usd*1.8/36+g.tdp*1.1/1000*0.12*24*30;var tps=(580*((g.fp8||1000)/4500));var tokMo=tps*86400*30*0.5;
      return{x:tokMo>0?+(moC/(tokMo/1e6)).toFixed(2):99,y:Math.round(tps),lbl:g.n};}).filter(Boolean);
    var datasets=[];
    if(wlPts.length>0)datasets.push({label:'\u2B50 Your Workloads',data:wlPts,backgroundColor:'#FF5539',borderColor:'#FF5539',pointRadius:10,pointStyle:'star',borderWidth:2});
    datasets.push({label:'GPU Reference (70B FP8, 1 GPU)',data:refPts,backgroundColor:'#002870AA',borderColor:'#002870',pointRadius:6,pointStyle:'circle'});
    charts.par=new Chart(pc,{type:'scatter',data:{datasets},options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:9},usePointStyle:true}},tooltip:{callbacks:{label:c=>{ var d=c.raw;return`${d.lbl||c.dataset.label}: $${c.parsed.x.toFixed(2)}/M tok, ${c.parsed.y.toLocaleString()} tok/s`;}}}},
      scales:{x:{title:{display:true,text:'Cost ($/Million Tokens) \u2190 lower = better',font:{size:10}},min:0,reverse:false},y:{title:{display:true,text:'Throughput (tok/s) \u2191 higher = better',font:{size:10}},min:0}}}});}
  // GPU rank
  var rc=document.getElementById('cRank');
  if(rc){dc('rk'); var gd=Object.values(M.gpuConfigs||[]).map(function(g){return [g.id,getPROC(g.id)]}).filter(function(e){return e[1]}).filter(([,v])=>v.t==='GPU'&&v.fp8).map(([,v])=>({n:v.n,v:+((v.fp8)/(v.usd/1000)).toFixed(1)})).sort((a,b)=>b.v-a.v);
    charts.rk=new Chart(rc,{type:'bar',data:{labels:gd.map(d=>d.n),datasets:[{data:gd.map(d=>d.v),backgroundColor:gd.map((_,i)=>['#FF5539','#1C38F5','#00B290','#FFB600','#002870','#8892B0','#FF8A65','#4DB6AC','#9575CD','#E57373','#81C784'][i%11]),borderRadius:2}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{title:{display:true,text:'TFLOPS/$1K',font:{size:9}}}}}});}
  // Cost breakdown
  var cb=document.getElementById('cCost');
  if(cb&&cb.offsetParent!==null){dc('cb'); var cats=[{n:'GPUs',v:sz.gCost},{n:'CPUs',v:sz.cpuCost},{n:'Network',v:sz.netCost+sz.swCost},{n:'Storage',v:sz.stoCost},{n:'Racks',v:sz.rackCost},{n:'Infra',v:sz.commonCost+sz.geoCost},{n:'Other',v:sz.dramCost+sz.chassisCost+sz.spareCost}];
    charts.cb=new Chart(cb,{type:'bar',data:{labels:cats.map(c=>c.n),datasets:[{data:cats.map(c=>c.v),backgroundColor:['#FF5539','#1C38F5','#00B290','#FFB600','#002870','#8892B0','#4A5078'],borderRadius:3}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt$(c.parsed.x)}}},scales:{x:{ticks:{callback:v=>fmt$(v)}}}}});}
  
  // Latency vs Throughput — per-workload scatter + trade-off curve + SLA lines
  var lt=document.getElementById('cLatTput');
  if(lt&&lt.offsetParent!==null){dc('ltput');
    var onPremWLs=sz.det.filter(d=>d.src!=='api'&&d.gpus>0);
    
    // Plot each workload as a labeled point (throughput vs latency)
    var wlPoints=onPremWLs.map((d,i)=>({x:Math.round(d.totalTPS),y:d.estE2E,lbl:(WP[d.tp]?.ic||'')+(WP[d.tp]?.n||'WL'+(i+1))}));
    
    // Trade-off curve: simulate batch size impact on aggregate system
    var baseTPS=onPremWLs.reduce((s,d)=>s+d.totalTPS,0)||500;
    var baseE2E=onPremWLs.length>0?Math.round(onPremWLs.reduce((s,d)=>s+d.estE2E,0)/onPremWLs.length):500;
    var curveData=[0.2,0.4,0.6,0.8,1.0,1.3,1.6,2.0,2.5,3.0].map(m=>({
      x:Math.round(baseTPS*m),
      y:Math.round(baseE2E*(0.5+m*0.8+Math.pow(m,1.8)*0.15))
    }));
    
    // SLA thresholds
    var slaThresholds=[...new Set(onPremWLs.map(d=>d.e2e))].sort((a,b)=>a-b).slice(0,4);
    var maxX=Math.max(...curveData.map(d=>d.x),...wlPoints.map(d=>d.x))*1.1;
    var maxY=Math.max(...curveData.map(d=>d.y),...wlPoints.map(d=>d.y),...slaThresholds)*1.2;
    
    var datasets=[
      {label:'Throughput/Latency Curve',data:curveData,borderColor:'#1C38F5',backgroundColor:'rgba(28,56,245,0.06)',borderWidth:2,tension:0.4,pointRadius:2,showLine:true,fill:true,order:3},
    ];
    // Each workload as a star
    if(wlPoints.length>0){
      datasets.push({label:'\u2B50 Your Workloads',data:wlPoints,backgroundColor:'#FF5539',borderColor:'#FF5539',pointRadius:10,pointStyle:'star',borderWidth:2,order:1});
    }
    // SLA threshold lines with labels
    var threshColors=['#FFB600','#00B290','#8892B0','#9575CD'];
    slaThresholds.forEach((th,i)=>{
      var wlName=onPremWLs.find(d=>d.e2e===th);
      datasets.push({label:`SLA: ${fmtN(th)}ms${wlName?' ('+WP[wlName.tp]?.n+')':''}`,data:[{x:0,y:th},{x:maxX,y:th}],borderColor:threshColors[i%4],borderWidth:1.5,borderDash:[6,4],pointRadius:0,showLine:true,fill:false,order:4});
    });
    // Sweet spot zone
    var minSLA=slaThresholds.length>0?Math.min(...slaThresholds):baseE2E;
    var sweetX=Math.round(maxX*0.65);
    datasets.push({label:'Sweet Spot',data:[{x:0,y:0},{x:sweetX,y:0},{x:sweetX,y:minSLA*0.85},{x:0,y:minSLA*0.85}],backgroundColor:'rgba(0,178,144,0.08)',borderColor:'rgba(0,178,144,0.25)',borderWidth:1,fill:true,showLine:true,pointRadius:0,order:5});
    
    charts.ltput=new Chart(lt,{type:'scatter',data:{datasets},options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:8},usePointStyle:true,boxWidth:10}},
        tooltip:{callbacks:{label:c=>{ var d=c.raw;return`${d.lbl||c.dataset.label}: ${c.parsed.x.toLocaleString()} tok/s, ${fmtN(c.parsed.y)}ms`;}}}},
      scales:{x:{title:{display:true,text:'Throughput (tok/s) \u2192 higher = better',font:{size:9}},min:0,max:maxX},
              y:{title:{display:true,text:'E2E Latency (ms) \u2193 lower = better',font:{size:9}},min:0,max:maxY}}
    }});
  }

  // Project Timeline Gantt chart
  var tl=document.getElementById('cTimeline');
  if(tl&&tl.offsetParent!==null){dc('tline');
    var wk=0;
    var phases=[];
    phases.push({n:'Infrastructure & Platform',s:wk,e:wk+timeline.infraWeeks,c:'#002870'});wk+=timeline.infraWeeks;
    phases.push({n:'Data Environment Setup',s:Math.max(wk-1,0),e:wk-1+timeline.dataWeeks,c:'#1C38F5'});
    var dataEnd=wk-1+timeline.dataWeeks;wk=dataEnd;
    // Per-workload dev/test (staggered, 2 at a time)
    var wlStart=wk;
    for(let i=0;i<wls.length;i++){
      var s=wlStart+Math.floor(i/2)*(timeline.perWLDevWeeks);
      phases.push({n:`WL${i+1}: ${WP[wls[i].tp]?.n||'Workload'} (Dev)`,s,e:s+timeline.perWLDevWeeks,c:'#00B290'});
      phases.push({n:`WL${i+1}: ${WP[wls[i].tp]?.n||'Workload'} (Test)`,s:s+timeline.perWLDevWeeks,e:s+timeline.perWLDevWeeks+timeline.perWLTestWeeks,c:'#FFB600'});
    }
    var lastWLEnd=wlStart+Math.ceil(wls.length/2)*(timeline.perWLDevWeeks)+timeline.perWLTestWeeks;
    phases.push({n:'Integration & UAT',s:lastWLEnd,e:lastWLEnd+timeline.integrationWeeks,c:'#FF5539'});
    phases.push({n:'Go-Live & Handover',s:lastWLEnd+timeline.integrationWeeks,e:lastWLEnd+timeline.integrationWeeks+timeline.goLiveWeeks,c:'#002870'});
    if(timeline.bufferWeeks>0)phases.push({n:'Buffer',s:lastWLEnd+timeline.integrationWeeks+timeline.goLiveWeeks,e:lastWLEnd+timeline.integrationWeeks+timeline.goLiveWeeks+timeline.bufferWeeks,c:'#8892B0'});
    
    var labels=phases.map(p=>p.n);
    var maxWk=Math.max(...phases.map(p=>p.e));
    
    charts.tline=new Chart(tl,{type:'bar',data:{
      labels,
      datasets:[
        {label:'Start (offset)',data:phases.map(p=>p.s),backgroundColor:'transparent',borderWidth:0},
        {label:'Duration',data:phases.map(p=>p.e-p.s),backgroundColor:phases.map(p=>p.c+'CC'),borderRadius:3},
      ]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{if(c.datasetIndex===0)return'';var p=phases[c.dataIndex];return`Week ${p.s} → ${p.e} (${p.e-p.s} wks)`;}}}},
        scales:{x:{stacked:true,title:{display:true,text:'Weeks',font:{size:9}},max:maxWk+1,ticks:{stepSize:1}},
                y:{stacked:true,ticks:{font:{size:8}}}}}});
  }

  // Scenario comparison bar chart
  var sc=document.getElementById('cScenComp');
  if(sc&&sc.offsetParent!==null&&scenarios.length>=2){dc('scencomp');
  
    var labels=scenarios.slice(0,3).map(s=>s.name.substring(0,20));
    var ds=[
      {label:'GPUs',data:scenarios.slice(0,3).map(s=>s.gpus),backgroundColor:'#FF5539',borderRadius:2},
      {label:'Servers',data:scenarios.slice(0,3).map(s=>s.servers),backgroundColor:'#1C38F5',borderRadius:2},
      {label:'Power(kW)',data:scenarios.slice(0,3).map(s=>+s.power),backgroundColor:'#00B290',borderRadius:2},
    ];
    charts.scencomp=new Chart(sc,{type:'bar',data:{labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10}}}},scales:{x:{ticks:{font:{size:9}}}}}});
  }}


V.renderYieldTab = function() {
  var el = document.getElementById('tab-yield');
  if (!el) return;
  var sz = praxisSizing();
  if (!sz || !sz.det || !sz.det.length) {
    el.innerHTML = '<div class="coming-soon-tab"><h3>No workloads defined</h3></div>';
    return;
  }
  var det = sz.det;
  var h = '<div class="card"><h3>Scenario 1 — SLA Performance</h3>';
  h += '<table><thead><tr><th>Workload</th><th>Model</th><th>GPU</th><th>Count</th><th>TPS</th><th>TTFT</th><th>TBT</th><th>E2E</th><th>SLA</th></tr></thead><tbody>';
  var slaPass=0;
  det.forEach(function(d){
    var p=getPROC(d.proc), m=getMDL(d.md);
    var wp = WP[d.tp]||{n:d.name||d.tp,ic:'📋'};
    var slaOk = d.ttftOk && d.tbtOk && d.e2eOk;
    if(slaOk) slaPass++;
    h += '<tr style="background:' + (slaOk?'':'var(--dbg)') + '">'
      + '<td><b>' + wp.ic + ' ' + (d.name||wp.n||d.tp) + '</b></td>'
      + '<td>' + ((m||{}).n||d.md||'—') + '</td>'
      + '<td>' + ((p||{}).n||'—') + '</td>'
      + '<td>' + d.gpus + '</td>'
      + '<td style="color:var(--s1);font-weight:700">' + fmtN(d.totalTPS||0) + '</td>'
      + '<td style="color:' + (d.ttftOk?'var(--s2)':'var(--p1)') + '">' + d.estTTFT + 'ms</td>'
      + '<td style="color:' + (d.tbtOk?'var(--s2)':'var(--p1)') + '">' + d.estTBT + 'ms</td>'
      + '<td style="color:' + (d.e2eOk?'var(--s2)':'var(--p1)') + '">' + fmtN(d.estE2E||0) + 'ms</td>'
      + '<td>' + (slaOk?'✅':'❌') + '</td></tr>';
  });
  h += '<tr style="font-weight:700;background:var(--bg)"><td colspan="4">TOTAL</td>'
    + '<td style="color:var(--s1)">' + fmtN(det.reduce(function(s,d){return s+(d.totalTPS||0)},0)) + ' tok/s</td>'
    + '<td colspan="3" style="text-align:center">' + (Math.round(det.reduce(function(s,d){return s+(d.estE2E||0)},0)/(det.length||1))) + 'ms avg E2E</td>'
    + '<td>' + (sz.slaAll?'✅':'⚠️') + '</td></tr>';
  h += '</tbody></table></div>';

  // S2: Fleet inventory stacked bar
  var ucG=0,maasG=0,gpuaasG=0,bmaasG=0;
  det.forEach(function(d){
    if(d.tp==='uc')     ucG     += d.gpus;
    else if(d.tp==='maas')   maasG   += d.gpus;
    else if(d.tp==='gpuaas') gpuaasG += d.gpus;
    else if(d.tp==='bmaas')  bmaasG  += d.gpus;
  });
  var total = sz.tGPU || 1;
  var failover = Math.round(total * 0.2);
  var segs = [
    {label:'Use Cases', gpus:ucG,     color:'var(--p2)'},
    {label:'MaaS',      gpus:maasG,   color:'var(--s2)'},
    {label:'GPUaaS',    gpus:gpuaasG, color:'var(--s1)'},
    {label:'BMaaS',     gpus:bmaasG,  color:'purple'},
    {label:'Failover',  gpus:failover,color:'var(--s3)'},
  ];
  h += '<div class="card"><h3>Scenario 2 — Fleet Inventory</h3>';
  h += '<div style="height:28px;border-radius:6px;overflow:hidden;display:flex;margin-bottom:12px">';
  segs.forEach(function(s){ if(!s.gpus)return; h += '<div style="width:'+Math.round(s.gpus/total*100)+'%;background:'+s.color+'" title="'+s.label+': '+s.gpus+' GPUs"></div>'; });
  h += '</div><div class="g5">';
  segs.forEach(function(s){
    var pct=Math.round(s.gpus/(total||1)*100);
    h += '<div style="border-left:4px solid '+s.color+';padding:8px 10px"><div style="font-size:18px;font-weight:900;color:'+s.color+'">'+s.gpus+'</div><div class="l">'+s.label+' · '+pct+'%</div></div>';
  });
  h += '</div>';
  h += '<div class="cc t"><canvas id="cYield"></canvas></div></div>';
  el.innerHTML = h;

  // Draw stacked bar chart
  var yc = document.getElementById('cYield');
  if (yc && typeof Chart !== 'undefined') {
    dc('yield');
    charts.yield = new Chart(yc, {
      type:'bar',
      data:{
        labels: segs.filter(function(s){return s.gpus>0}).map(function(s){return s.label}),
        datasets:[{
          data: segs.filter(function(s){return s.gpus>0}).map(function(s){return s.gpus}),
          backgroundColor: segs.filter(function(s){return s.gpus>0}).map(function(s){return s.color}),
          borderRadius: 4
        }]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.label+': '+c.parsed.y+' GPUs ('+Math.round(c.parsed.y/total*100)+'%)'}}}},scales:{y:{title:{display:true,text:'GPUs',font:{size:9}}}}}
    });
  }
};



// ════════════════════════════════════════════════════════════════════════════
// PROJECT SCOPE TAB — full port from IF renderScope + calcServices
// ════════════════════════════════════════════════════════════════════════════

var MODALITIES=[{k:'text',n:'Text Documents',ic:'📄'},{k:'structured',n:'Structured DB',ic:'🗃️'},{k:'images',n:'Images',ic:'🖼️'},{k:'audio',n:'Audio',ic:'🎙️'},{k:'video',n:'Video',ic:'🎬'},{k:'geospatial',n:'Geospatial',ic:'🛰️'},{k:'sensor',n:'Sensor/IoT',ic:'📡'},{k:'mixed',n:'Mixed',ic:'📦'}];

function getScopeState(){
  if(!M.scopeState)M.scopeState={
    dataSources:[
      {id:1,name:'Customer Knowledge Base',modality:'text',volumeGB:50,format:'semi',connectivity:'file_share',refresh:'daily',cleanup:'medium',labelling:'none',pii:'detect'},
      {id:2,name:'Product Database',modality:'structured',volumeGB:10,format:'clean',connectivity:'db',refresh:'realtime',cleanup:'none',labelling:'none',pii:'none'},
    ],
    globalSetup:{dataPlatform:{days:0,auto:true},governance:{days:0,auto:true},netSecurity:{days:0,auto:true},monitoring:{days:0,auto:true},teamOnboard:{days:0,auto:true}},
    envStrategy:{devPct:10,testPct:25,devDedicated:false,testDedicated:false,devTemp:true,testTemp:true},
    testingConfig:{unitTest:true,integrationTest:true,loadTest:true,accuracyEval:true,securityTest:false,uat:true,testDataPct:10},
    servicesRates:{dataEngineer:1200,mlEngineer:1400,devOps:1100,pm:1300,qa:900},
    timeline:{infraWeeks:4,dataWeeks:6,perWLDevWeeks:3,perWLTestWeeks:2,integrationWeeks:3,goLiveWeeks:1,bufferWeeks:2},
    wlOverrides:{},dsCounter:3
  };
  return M.scopeState;
}
function praxisDsUpd(id,field,val){var sc=getScopeState();var ds=sc.dataSources.find(function(d){return d.id===id;});if(ds){ds[field]=val;V.renderScopeTab();}}
function praxisDsAdd(){var sc=getScopeState();sc.dataSources.push({id:sc.dsCounter++,name:'New Source',modality:'text',volumeGB:10,format:'semi',connectivity:'file_share',refresh:'daily',cleanup:'light',labelling:'none',pii:'none'});V.renderScopeTab();}
function praxisDsDelete(id){var sc=getScopeState();sc.dataSources=sc.dataSources.filter(function(d){return d.id!==id;});V.renderScopeTab();}
function praxisWlUpdScope(wlId,field,val){['uc','maas','gpuaas','bmaas'].forEach(function(t){var w=(M.workloads[t]||[]).find(function(w){return w.id===wlId;});if(w){w[field]=val;}});V.renderScopeTab();}
function praxisWlEffortOverride(wlId,days){getScopeState().wlOverrides[wlId]=days;V.renderScopeTab();}
function praxisScopeUpd(section,key,val){
  var sc=getScopeState();
  if(section==='env'){sc.envStrategy[key]=val;}
  if(section==='test'){sc.testingConfig[key]=val;}
  if(section==='rate'){sc.servicesRates[key]=val;}
  if(section==='time'){sc.timeline[key]=val;}
  if(section==='setup'){var parts=key.split('.');if(parts[1]==='days')sc.globalSetup[parts[0]].days=val;if(parts[1]==='auto')sc.globalSetup[parts[0]].auto=val;}
  V.renderScopeTab();
}
function calcServices(sz){
  var sc=getScopeState();
  var dataSources=sc.dataSources;
  var globalSetup=sc.globalSetup;
  var testingConfig=sc.testingConfig;
  var servicesRates=sc.servicesRates;
  var timeline=sc.timeline;
  var wlOverrides=sc.wlOverrides;

  var onPrem=sz.det.filter(d=>d.src!=='api');
  var nWL=getIFWorkloads().length;
  var totalDataGB=dataSources.reduce((s,d)=>s+d.volumeGB,0);
  var heavyCleanup=dataSources.filter(d=>d.cleanup==='heavy').length;
  var medCleanup=dataSources.filter(d=>d.cleanup==='medium').length;
  var hasLabelling=dataSources.some(d=>d.labelling==='manual'||d.labelling==='active_learning');
  var hasPII=dataSources.some(d=>d.pii==='mask'||d.pii==='redact');
  var hasFineTune=wls.some(w=>w.fineTune==='lora'||w.fineTune==='full');
  var hasRAG=wls.some(w=>w.ragType!=='none');
  var hasHeavyCustom=wls.some(w=>w.customLevel==='heavy');
  var hasSecurity=onPrem.some(d=>d.securityTier==='enhanced'||d.securityTier==='regulated');
  
  // Global setup days (auto-estimated or user-overridden)
  var dataPlatformDays_auto=10+(hasRAG?5:0)+(totalDataGB>500?5:0);
  var govDays_auto=5+(hasPII?5:0)+(hasSecurity?5:0);
  var netSecDays_auto=5+(hasSecurity?5:0)+(edgeCfg.enabled?3:0);
  var monDays_auto=5;
  var trainDays_auto=3+Math.ceil(nWL*0.5);
  
  var dataPlatformDays=globalSetup.dataPlatform.auto?dataPlatformDays_auto:globalSetup.dataPlatform.days;
  var govDays=globalSetup.governance.auto?govDays_auto:globalSetup.governance.days;
  var netSecDays=globalSetup.netSecurity.auto?netSecDays_auto:globalSetup.netSecurity.days;
  var monDays=globalSetup.monitoring.auto?monDays_auto:globalSetup.monitoring.days;
  var trainDays=globalSetup.teamOnboard.auto?trainDays_auto:globalSetup.teamOnboard.days;
  var globalTotal=dataPlatformDays+govDays+netSecDays+monDays+trainDays;
  
  // Per-data-source effort
  var dsEffort=dataSources.reduce((s,d)=>{
    var days=2; // base per source
    if(d.cleanup==='heavy')days+=5;else if(d.cleanup==='medium')days+=3;else if(d.cleanup==='light')days+=1;
    if(d.labelling==='manual')days+=Math.ceil(d.volumeGB/10);
    if(d.labelling==='active_learning')days+=5;
    if(d.pii==='mask'||d.pii==='redact')days+=3;
    if(d.refresh==='realtime')days+=3;else if(d.refresh==='hourly')days+=2;
    return s+days;
  },0);
  
  // Per-workload effort (auto or overridden)
  var perWL=wls.map(w=>{
    if(w._effortOverride!==undefined)return w._effortOverride;
    var days=3; // base per workload
    if(w.ragType!=='none')days+=5;if(w.ragType==='agentic'||w.ragType==='graph')days+=5;
    if(w.fineTune==='lora')days+=8;if(w.fineTune==='full')days+=15;
    if(w.customLevel==='heavy')days+=10;else if(w.customLevel==='medium')days+=5;else if(w.customLevel==='light')days+=2;
    if(w.isAgentic)days+=5;
    if(w.isGeo)days+=8;
    return days;
  });
  var perWLTotal=perWL.reduce((s,d)=>s+d,0);
  
  // Testing effort
  var testEffort={
    unitTest:testingConfig.unitTest?Math.ceil(nWL*2):0,
    integrationTest:testingConfig.integrationTest?Math.ceil(nWL*3):0,
    loadTest:testingConfig.loadTest?5:0,
    accuracyEval:testingConfig.accuracyEval?Math.ceil(nWL*2):0,
    securityTest:testingConfig.securityTest?5:0,
    uat:testingConfig.uat?Math.ceil(nWL*2):0,
  };
  var testTotal=Object.values(testEffort).reduce((s,d)=>s+d,0);
  
  // Role allocation
  var deDay=dsEffort+dataPlatformDays+Math.ceil(perWLTotal*0.3);
  var mlDay=Math.ceil(perWLTotal*0.7)+Math.ceil(testTotal*0.3)+(hasFineTune?10:0);
  var doDay=netSecDays+monDays+Math.ceil(nWL*3)+timeline.infraWeeks*5;
  var pmDay=Math.ceil((deDay+mlDay+doDay)*0.15)+trainDays;
  var qaDay=testTotal;
  var totalDays=deDay+mlDay+doDay+pmDay+qaDay;
  
  var totalServicesCost=deDay*servicesRates.dataEngineer+mlDay*servicesRates.mlEngineer+doDay*servicesRates.devOps+pmDay*servicesRates.pm+qaDay*servicesRates.qa;
  
  // Timeline
  var wlPhaseWeeks=Math.ceil(getIFWorkloads().length*(timeline.perWLDevWeeks+timeline.perWLTestWeeks)/2); // overlapping
  var totalWeeks=timeline.infraWeeks+timeline.dataWeeks+wlPhaseWeeks+timeline.integrationWeeks+timeline.goLiveWeeks+timeline.bufferWeeks;
  
  return{dataPlatformDays,govDays,netSecDays,monDays,trainDays,globalTotal,dsEffort,perWL,perWLTotal,testEffort,testTotal,
    deDay,mlDay,doDay,pmDay,qaDay,totalDays,totalServicesCost,totalWeeks};
}

V.renderScopeTab=function(){
  var el=document.getElementById('tab-scope');
  if(!el)return;
  var sc=getScopeState();
  var dataSources=sc.dataSources;
  var globalSetup=sc.globalSetup;
  var envStrategy=sc.envStrategy;
  var testingConfig=sc.testingConfig;
  var servicesRates=sc.servicesRates;
  var timeline=sc.timeline;
  var wlOverrides=sc.wlOverrides;
  var sz=praxisSizing();
  if(!sz)sz={det:[],tGPU:0,total:0,srvTotal:0};
  var showP=true;
  var svc=calcServices(sz);
  
  var onPremWLs=sz.det.filter(function(d){return d.src!=='api';});
  
  // Calculate services effort
  
  el.innerHTML=`
    <!-- S1: DATA SOURCE REGISTRY -->
    <div class="card" style="border-left:4px solid var(--s1)">
      <h3>📂 Data Source Registry</h3>
      <p style="font-size:10px;color:var(--txM);margin-bottom:8px">Register all data sources for the project. These feed one or more workloads via RAG, fine-tuning, or direct ingestion.</p>
      <table style="font-size:10px"><thead><tr>
        <th>Name</th><th>Modality</th><th>Volume</th><th>Format</th><th>Connection</th><th>Refresh</th><th>Cleanup</th><th>Labelling</th><th>PII</th><th style="width:20px"></th>
      </tr></thead><tbody>
        ${dataSources.map(ds=>`<tr>
          <td><input type="text" value="${ds.name}" style="width:120px;font-size:9px;padding:1px 3px" onchange="praxisDsUpd(${ds.id},'name',this.value)"></td>
          <td><select style="font-size:9px;padding:1px" onchange="praxisDsUpd(${ds.id},'modality',this.value)">${MODALITIES.map(m=>`<option value="${m.k}"${ds.modality===m.k?' selected':''}>${m.ic} ${m.n}</option>`).join('')}</select></td>
          <td><input type="number" value="${ds.volumeGB}" style="width:50px;font-size:9px" onchange="praxisDsUpd(${ds.id},'volumeGB',+this.value)"> GB</td>
          <td><select style="font-size:9px;padding:1px" onchange="praxisDsUpd(${ds.id},'format',this.value)"><option value="clean"${ds.format==='clean'?' selected':''}>Clean</option><option value="semi"${ds.format==='semi'?' selected':''}>Semi</option><option value="unstructured"${ds.format==='unstructured'?' selected':''}>Unstructured</option><option value="mixed"${ds.format==='mixed'?' selected':''}>Mixed</option></select></td>
          <td><select style="font-size:9px;padding:1px" onchange="praxisDsUpd(${ds.id},'connectivity',this.value)"><option value="db"${ds.connectivity==='db'?' selected':''}>Database</option><option value="api"${ds.connectivity==='api'?' selected':''}>API</option><option value="file_share"${ds.connectivity==='file_share'?' selected':''}>File Share</option><option value="s3"${ds.connectivity==='s3'?' selected':''}>S3/Object</option><option value="kafka"${ds.connectivity==='kafka'?' selected':''}>Kafka Stream</option><option value="iot"${ds.connectivity==='iot'?' selected':''}>IoT/Sensor</option></select></td>
          <td><select style="font-size:9px;padding:1px" onchange="praxisDsUpd(${ds.id},'refresh',this.value)"><option value="onetime"${ds.refresh==='onetime'?' selected':''}>One-time</option><option value="daily"${ds.refresh==='daily'?' selected':''}>Daily</option><option value="hourly"${ds.refresh==='hourly'?' selected':''}>Hourly</option><option value="realtime"${ds.refresh==='realtime'?' selected':''}>Real-time</option></select></td>
          <td><select style="font-size:9px;padding:1px" onchange="praxisDsUpd(${ds.id},'cleanup',this.value)"><option value="none"${ds.cleanup==='none'?' selected':''}>None</option><option value="light"${ds.cleanup==='light'?' selected':''}>Light</option><option value="medium"${ds.cleanup==='medium'?' selected':''}>Medium</option><option value="heavy"${ds.cleanup==='heavy'?' selected':''}>Heavy</option></select></td>
          <td><select style="font-size:9px;padding:1px" onchange="praxisDsUpd(${ds.id},'labelling',this.value)"><option value="none"${ds.labelling==='none'?' selected':''}>None</option><option value="existing"${ds.labelling==='existing'?' selected':''}>Existing</option><option value="manual"${ds.labelling==='manual'?' selected':''}>Manual</option><option value="active_learning"${ds.labelling==='active_learning'?' selected':''}>Active Learning</option></select></td>
          <td><select style="font-size:9px;padding:1px" onchange="praxisDsUpd(${ds.id},'pii',this.value)"><option value="none"${ds.pii==='none'?' selected':''}>None</option><option value="detect"${ds.pii==='detect'?' selected':''}>Detect</option><option value="mask"${ds.pii==='mask'?' selected':''}>Mask</option><option value="redact"${ds.pii==='redact'?' selected':''}>Redact</option></select></td>
          <td><button style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--txL)" onclick="praxisDsDelete(${ds.id})">×</button></td>
        </tr>`).join('')}
      </tbody></table>
      <div style="display:flex;gap:6px;margin-top:6px;align-items:center">
        <button class="bp" style="font-size:10px;padding:4px 12px" onclick="praxisDsAdd()">+ Add Source</button>
        <span style="font-size:10px;color:var(--txM)">${dataSources.length} sources · ${dataSources.reduce((s,d)=>s+d.volumeGB,0)} GB total · ${[...new Set(dataSources.map(d=>d.modality))].length} modalities</span>
      </div>
    </div>

    <div class="g2" style="margin-top:12px;gap:14px">
      <!-- S2: GLOBAL PROJECT SETUP -->
      <div class="card">
        <h3>🏗️ Global Project Setup</h3>
        <p style="font-size:9px;color:var(--txM);margin-bottom:6px">One-time setup activities. Days are auto-estimated — override any value. Changes flow to services cost.</p>
        <table style="font-size:10px"><thead><tr><th>Activity</th><th>Scope</th><th style="min-width:80px">Days</th></tr></thead><tbody>
          ${[
            ['dataPlatform','Data Platform','Vector DB, data lake, ingestion pipeline, metadata catalog'],
            ['governance','Governance','Compliance framework, RBAC, audit trail, PII handling'],
            ['netSecurity','Network & Security','Fabric setup, firewall rules, certificates, HSM'],
            ['monitoring','Monitoring','Observability stack, alerting, dashboards, FinOps'],
            ['teamOnboard','Team Onboarding','Training on platform, tools, and processes'],
          ].map(([k,n,d])=>{
            var autoVal=svc[k+'Days']||svc[{dataPlatform:'dataPlatformDays',governance:'govDays',netSecurity:'netSecDays',monitoring:'monDays',teamOnboard:'trainDays'}[k]];
            var curVal=globalSetup[k].auto?autoVal:globalSetup[k].days;
            return`<tr>
              <td><b>${n}</b></td>
              <td style="font-size:9px;color:var(--txM)">${d}</td>
              <td><div style="display:flex;align-items:center;gap:3px">
                <input type="number" value="${curVal}" min="0" max="100" style="width:45px;font-size:10px;padding:2px 4px;${globalSetup[k].auto?'color:var(--s1)':'color:var(--p2);font-weight:700'}" onchange=\"praxisScopeUpd('setup','${k}.days',+this.value)\">
                <button style="background:none;border:1px solid var(--bdr);border-radius:3px;font-size:7px;padding:1px 4px;cursor:pointer;color:${globalSetup[k].auto?'var(--s2)':'var(--txL)'}" onclick=\"praxisScopeUpd('setup','${k}.auto',true)\">${globalSetup[k].auto?'Auto':'Manual'}</button>
              </div></td>
            </tr>`;}).join('')}
          <tr style="font-weight:700;background:var(--bg)"><td colspan="2">Total Global Setup</td><td style="color:var(--p2)">${svc.globalTotal}d</td></tr>
        </tbody></table>
      </div>

      <!-- S3: ENVIRONMENT STRATEGY -->
      <div class="card">
        <h3>🔄 Environment Strategy</h3>
        <p style="font-size:9px;color:var(--txM);margin-bottom:6px">Size Dev/Test/Prod environments. Dev/Test as % of production capacity.</p>
        <table style="font-size:10px"><thead><tr><th>Env</th><th>% of Prod</th><th>Dedicated HW</th><th>Permanent</th><th>Est. GPUs</th></tr></thead><tbody>
          <tr><td><b style="color:var(--s1)">Dev</b></td>
            <td><input type="number" value="${envStrategy.devPct}" min="5" max="50" style="width:40px;font-size:10px" onchange="praxisScopeUpd(\'env\',\'devPct\',+this.value)">%</td>
            <td><select style="font-size:9px" onchange="praxisScopeUpd(\'env\',\'devDedicated\',this.value==='1')"><option value="0"${!envStrategy.devDedicated?' selected':''}>Shared</option><option value="1"${envStrategy.devDedicated?' selected':''}>Dedicated</option></select></td>
            <td><select style="font-size:9px" onchange="praxisScopeUpd(\'env\',\'devTemp\',this.value==='1')"><option value="1"${envStrategy.devTemp?' selected':''}>Temporary</option><option value="0"${!envStrategy.devTemp?' selected':''}>Permanent</option></select></td>
            <td style="font-weight:700;color:var(--s1)">${Math.ceil(sz.tGPU*envStrategy.devPct/100)}</td></tr>
          <tr><td><b style="color:var(--s3)">Test</b></td>
            <td><input type="number" value="${envStrategy.testPct}" min="10" max="100" style="width:40px;font-size:10px" onchange="praxisScopeUpd(\'env\',\'testPct\',+this.value)">%</td>
            <td><select style="font-size:9px" onchange="praxisScopeUpd(\'env\',\'testDedicated\',this.value==='1')"><option value="0"${!envStrategy.testDedicated?' selected':''}>Shared</option><option value="1"${envStrategy.testDedicated?' selected':''}>Dedicated</option></select></td>
            <td><select style="font-size:9px" onchange="praxisScopeUpd(\'env\',\'testTemp\',this.value==='1')"><option value="1"${envStrategy.testTemp?' selected':''}>Temporary</option><option value="0"${!envStrategy.testTemp?' selected':''}>Permanent</option></select></td>
            <td style="font-weight:700;color:var(--s3)">${Math.ceil(sz.tGPU*envStrategy.testPct/100)}</td></tr>
          <tr style="background:var(--sbg)"><td><b style="color:var(--s2)">Prod</b></td><td>100%</td><td>Dedicated</td><td>Permanent</td><td style="font-weight:700;color:var(--s2)">${sz.tGPU}</td></tr>
          <tr style="font-weight:700"><td>Total</td><td colspan="3"></td><td style="color:var(--p2)">${sz.tGPU+Math.ceil(sz.tGPU*envStrategy.devPct/100)+Math.ceil(sz.tGPU*envStrategy.testPct/100)} GPUs</td></tr>
        </tbody></table>
        ${showP?`<div style="font-size:9px;color:var(--txM);margin-top:4px">Additional HW cost for Dev+Test: <b>${fmt$(sz.total*(envStrategy.devPct+envStrategy.testPct)/100)}</b></div>`:''}
      </div>
    </div>

    <div class="g2" style="margin-top:12px;gap:14px">
      <!-- S4: TESTING -->
      <div class="card">
        <h3>🧪 Testing & Validation</h3>
        <table style="font-size:10px"><tbody>
          ${[['unitTest','Unit Tests','Model output validation, edge cases'],['integrationTest','Integration Tests','End-to-end pipeline, API contracts'],['loadTest','Load / Stress Tests','Peak traffic simulation, SLA verification'],['accuracyEval','Accuracy Evaluation','Benchmark datasets, domain-specific eval'],['securityTest','Security Testing','Prompt injection, data leakage, RBAC'],['uat','User Acceptance Testing','Customer stakeholder validation']].map(([k,n,d])=>`<tr>
            <td><label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${testingConfig[k]?'checked':''} onchange=\"praxisScopeUpd('test','${k}',this.checked)\"><b>${n}</b></label></td>
            <td style="font-size:9px;color:var(--txM)">${d}</td>
            <td style="color:var(--s1);font-weight:600;font-size:10px">${testingConfig[k]?svc.testEffort[k]+'d':'—'}</td>
          </tr>`).join('')}
          <tr style="font-weight:700;background:var(--bg)"><td colspan="2">Test Data: ${testingConfig.testDataPct}% of production</td>
            <td><input type="number" value="${testingConfig.testDataPct}" min="1" max="100" style="width:40px;font-size:10px" onchange="praxisScopeUpd(\'test\',\'testDataPct\',+this.value)">%</td></tr>
        </tbody></table>
      </div>

      <!-- S5: PER-WORKLOAD DATA PROFILE (EDITABLE) -->
      <div class="card">
        <h3>⚙️ Per-Workload Data & MLOps Profile</h3>
        <p style="font-size:9px;color:var(--txM);margin-bottom:6px">Configure RAG, embeddings, fine-tuning, and customization per workload. Effort auto-calculates but is editable.</p>
        <div style="max-height:400px;overflow-y:auto">
        <table style="font-size:9px"><thead><tr><th>Workload</th><th>Data Sources</th><th>RAG Type</th><th>Embed Model</th><th>Fine-tune</th><th>Custom Level</th><th style="min-width:50px">Effort</th></tr></thead><tbody>
          ${getIFWorkloads().map(function(w,i){ var wp=(WP[w.tp]||{n:w.name||w.tp,ic:'📋'}); return `<tr>
            <td><b>${(wp||{}).ic||''} ${(wp||{}).n||''}</b></td>
            <td><select multiple style="font-size:8px;width:90px;height:40px" onchange="praxisWlUpdScope(${w.id},this)">${dataSources.map(ds=>`<option value="${ds.id}"${(w.dataSrcIds||[]).includes(ds.id)?' selected':''}>${ds.name}</option>`).join('')}</select></td>
            <td><select style="font-size:9px;padding:1px" onchange="praxisWlUpdScope(${w.id},'ragType',this.value)">
              <option value="none"${w.ragType==='none'?' selected':''}>None</option>
              <option value="simple"${w.ragType==='simple'?' selected':''}>Simple</option>
              <option value="multi_stage"${w.ragType==='multi_stage'?' selected':''}>Multi-stage</option>
              <option value="agentic"${w.ragType==='agentic'?' selected':''}>Agentic RAG</option>
              <option value="graph"${w.ragType==='graph'?' selected':''}>Graph RAG</option>
              <option value="hybrid"${w.ragType==='hybrid'?' selected':''}>Hybrid</option>
            </select></td>
            <td><select style="font-size:9px;padding:1px;width:80px" onchange="praxisWlUpdScope(${w.id},'embedModel',this.value)"${w.ragType==='none'?' disabled':''}>
              ${(M.modelCatalogue||[]).filter(function(m){return (m.family||'').toLowerCase().includes('embed');}).map(function(m){return '<option value="'+m.model_id+'"'+(w.embedModel===m.model_id?' selected':'')+'>'+m.name+'</option>';}).join('')}
            </select></td>
            <td><select style="font-size:9px;padding:1px" onchange="praxisWlUpdScope(${w.id},'fineTune',this.value)">
              <option value="none"${w.fineTune==='none'?' selected':''}>None</option>
              <option value="prompt"${w.fineTune==='prompt'?' selected':''}>Prompt Eng</option>
              <option value="few_shot"${w.fineTune==='few_shot'?' selected':''}>Few-shot</option>
              <option value="lora"${w.fineTune==='lora'?' selected':''}>LoRA FT</option>
              <option value="full"${w.fineTune==='full'?' selected':''}>Full FT</option>
            </select></td>
            <td><select style="font-size:9px;padding:1px" onchange="praxisWlUpdScope(${w.id},'customLevel',this.value)">
              <option value="oob"${w.customLevel==='oob'?' selected':''}>OOB</option>
              <option value="light"${w.customLevel==='light'?' selected':''}>Light</option>
              <option value="medium"${w.customLevel==='medium'?' selected':''}>Medium</option>
              <option value="heavy"${w.customLevel==='heavy'?' selected':''}>Heavy</option>
            </select></td>
            <td><input type="number" value="${svc.perWL[i]||0}" min="0" max="200" style="width:40px;font-size:9px;padding:1px 3px;font-weight:700;color:var(--s1)" onchange="praxisWlEffortOverride(${w.id},+this.value)">d</td>
          </tr>`;}).join('')}
          <tr style="font-weight:700;background:var(--bg)"><td colspan="6">Total Per-Workload Effort</td><td style="color:var(--p2)">${svc.perWLTotal}d</td></tr>
        </tbody></table>
        </div>
      </div>
    </div>

    <!-- S6: TIMELINE -->
    <div class="card" style="margin-top:12px">
      <h3>📅 Project Timeline</h3>
      <div class="g4" style="gap:8px;margin-bottom:12px">
        <div><span class="lb">Infra (wks)</span><input type="number" value="${timeline.infraWeeks}" min="1" max="20" style="font-size:10px" onchange="praxisScopeUpd(\'time\',\'infraWeeks\',+this.value)"></div>
        <div><span class="lb">Data Env (wks)</span><input type="number" value="${timeline.dataWeeks}" min="1" max="24" style="font-size:10px" onchange="praxisScopeUpd(\'time\',\'dataWeeks\',+this.value)"></div>
        <div><span class="lb">Dev/WL (wks)</span><input type="number" value="${timeline.perWLDevWeeks}" min="1" max="12" style="font-size:10px" onchange="praxisScopeUpd(\'time\',\'perWLDevWeeks\',+this.value)"></div>
        <div><span class="lb">Test/WL (wks)</span><input type="number" value="${timeline.perWLTestWeeks}" min="1" max="8" style="font-size:10px" onchange="praxisScopeUpd(\'time\',\'perWLTestWeeks\',+this.value)"></div>
        <div><span class="lb">Integration (wks)</span><input type="number" value="${timeline.integrationWeeks}" min="1" max="12" style="font-size:10px" onchange="praxisScopeUpd(\'time\',\'integrationWeeks\',+this.value)"></div>
        <div><span class="lb">Go-Live (wks)</span><input type="number" value="${timeline.goLiveWeeks}" min="1" max="4" style="font-size:10px" onchange="praxisScopeUpd(\'time\',\'goLiveWeeks\',+this.value)"></div>
        <div><span class="lb">Buffer (wks)</span><input type="number" value="${timeline.bufferWeeks}" min="0" max="8" style="font-size:10px" onchange="praxisScopeUpd(\'time\',\'bufferWeeks\',+this.value)"></div>
        <div class="st" style="background:var(--ibg);border-radius:6px"><div class="v" style="color:var(--p2);font-size:18px">${svc.totalWeeks}</div><div class="l">Total Weeks</div></div>
      </div>
      <div class="cc t"><canvas id="cTimeline"></canvas></div>
    </div>

    <!-- S7: SERVICES & TOTAL COST -->
    <div class="card" style="margin-top:12px;background:linear-gradient(135deg,rgba(0,40,112,.03),rgba(28,56,245,.03))">
      <h3>💼 Services Effort & Total Project Cost</h3>
      <div class="g2" style="gap:14px">
        <div>
          <table style="font-size:10px"><thead><tr><th>Role</th><th>Days</th><th>Rate</th>${showP?'<th>Cost</th>':''}</tr></thead><tbody>
            ${[['Data Engineer',svc.deDay,'dataEngineer'],['ML Engineer',svc.mlDay,'mlEngineer'],['DevOps Engineer',svc.doDay,'devOps'],['Project Manager',svc.pmDay,'pm'],['QA Engineer',svc.qaDay,'qa']].map(([role,days,rk])=>`<tr>
              <td><b>${role}</b></td><td>${days}</td>
              <td><input type="number" value="${servicesRates[rk]}" style="width:60px;font-size:9px" onchange="servicesRates['${rk}']=+this.value;render()">/d</td>
              ${showP?`<td style="font-weight:600">${fmt$(days*servicesRates[rk])}</td>`:''}
            </tr>`).join('')}
            <tr style="font-weight:700;background:var(--bg)"><td>Total</td><td>${svc.totalDays} days</td><td></td>${showP?`<td>${fmt$(svc.totalServicesCost)}</td>`:''}</tr>
          </tbody></table>
        </div>
        <div>
          <div class="ps" style="grid-template-columns:1fr 1fr">
            <div class="pc" style="background:var(--ibg)"><div class="v" style="color:var(--p2)">${fmt$(sz.total)}</div><div class="l">Hardware + SW</div></div>
            ${showP?`<div class="pc" style="background:var(--wbg)"><div class="v" style="color:#B8860B">${fmt$(svc.totalServicesCost)}</div><div class="l">Services</div></div>`:''}
            <div class="pc" style="background:var(--dbg)"><div class="v" style="color:var(--p1)">${fmt$(sz.total*(envStrategy.devPct+envStrategy.testPct)/100)}</div><div class="l">Dev+Test Env</div></div>
            <div class="pc" style="background:var(--sbg)"><div class="v" style="color:var(--s2)">${fmt$(sz.total+svc.totalServicesCost+sz.total*(envStrategy.devPct+envStrategy.testPct)/100)}</div><div class="l">GRAND TOTAL</div></div>
          </div>
        </div>
      </div>
    </div>`;
};


// ── Report tab ───────────────────────────────────────────────────────────
V.renderReportTab = function() {
  var el = document.getElementById('tab-report');
  if (!el) return;
  var sz = praxisSizing();
  var eng = M.currentEng;

  var h = '<div class="g2">';
  h += '<div class="card"><h3>💾 Save Solution Version</h3>'
    + '<p style="font-size:11px;color:var(--txM);margin-bottom:12px">'
    + (M.versionLabel ? 'Current: <b>' + M.versionLabel + '</b>' : 'No version saved yet.')
    + '</p>'
    + (eng ? '<button class="btn btn-primary" onclick="C.saveVersion()">Save as ' + M.mode + ' version</button>'
           : '<div style="color:var(--txM);font-size:11px">Select an engagement first</div>')
    + '</div>';

  h += '<div class="card"><h3>📄 ROM Export</h3>'
    + '<p style="font-size:11px;color:var(--txM);margin-bottom:12px">Copy ROM summary to clipboard for email or deck.</p>'
    + '<button class="btn btn-outline" onclick="C.exportRomText()">Copy ROM to clipboard</button>'
    + '</div></div>';

  if (sz && sz.det && sz.det.length) {
    h += '<div class="card"><h3>📊 Solution Summary</h3>';
    h += '<div class="g5" style="margin-bottom:16px">'
      + '<div class="st"><div class="v" style="color:var(--p1)">' + sz.tGPU + '</div><div class="l">Total GPUs</div></div>'
      + '<div class="st"><div class="v" style="color:var(--p2)">' + sz.srvTotal + '</div><div class="l">Servers</div></div>'
      + '<div class="st"><div class="v" style="color:var(--s1)">' + (sz.dlcRacks||0) + '+' + (sz.acRacks||0) + '</div><div class="l">DLC+AC Racks</div></div>'
      + '<div class="st"><div class="v" style="color:var(--s2)">' + fmt$(sz.gCost||0) + '</div><div class="l">GPU Capex</div></div>'
      + '<div class="st"><div class="v" style="color:var(--s3)">' + (sz.tPow||0).toFixed(0) + 'kW</div><div class="l">Total Power</div></div>'
      + '</div>';

    h += '<table><thead><tr><th>Workload</th><th>Type</th><th>Model</th><th>GPU</th><th>Count</th><th>TPS</th><th>TTFT</th><th>SLA</th><th>Cost</th></tr></thead><tbody>';
    sz.det.forEach(function(d) {
      var p=getPROC(d.proc), m=getMDL(d.md);
      var wp=WP[d.tp]||{n:d.name||d.tp,ic:'📋'};
      var slaOk=d.ttftOk&&d.tbtOk&&d.e2eOk;
      h += '<tr><td><b>' + wp.ic + ' ' + (d.name||wp.n) + '</b></td>'
        + '<td>' + d.tp.toUpperCase() + '</td>'
        + '<td>' + ((m||{}).n||'—').slice(0,20) + '</td>'
        + '<td>' + ((p||{}).n||'—').slice(0,16) + '</td>'
        + '<td>' + d.gpus + '</td>'
        + '<td>' + fmtN(d.totalTPS||0) + '</td>'
        + '<td style="color:' + (d.ttftOk?'var(--s2)':'var(--p1)') + '">' + d.estTTFT + 'ms</td>'
        + '<td>' + (slaOk?'✅':'❌') + '</td>'
        + '<td>' + fmt$(d.cost||0) + '</td></tr>';
    });
    h += '</tbody></table></div>';
  }
  el.innerHTML = h;
};

// ── Project Scope tab ─────────────────────────────────────────────────────
V.renderScopeTab = function() {
  var el = document.getElementById('tab-scope');
  if (!el) return;
  var eng = M.currentEng;
  var action = M.currentAction;
  var ctx = (action && action.content) || {};

  var h = '<div class="g2">';

  // Engagement context
  h += '<div class="card"><h3>🏢 Engagement Context</h3>';
  if (eng) {
    h += '<table><tbody>'
      + '<tr><td><b>Customer</b></td><td>' + (eng.name||'—') + '</td></tr>'
      + '<tr><td><b>Territory</b></td><td>' + (eng.territory||'—') + '</td></tr>'
      + '<tr><td><b>Type</b></td><td>' + (ctx.customer_type||eng.type||'—') + '</td></tr>'
      + '<tr><td><b>Contact</b></td><td>' + (eng.contact||'—') + '</td></tr>'
      + '<tr><td><b>Stage</b></td><td>' + (eng.stage||'—') + '</td></tr>'
      + '</tbody></table>';
  } else {
    h += '<p style="color:var(--txM)">Select an engagement from the dropdown above.</p>';
  }
  h += '</div>';

  // Action context
  h += '<div class="card"><h3>📋 Solution Brief</h3>';
  if (action) {
    h += '<div style="margin-bottom:8px"><b>' + (action.title||'Action') + '</b></div>';
    if (ctx.constraints) {
      h += '<div style="font-size:11px;margin-bottom:6px"><b>Constraints:</b></div>'
        + '<ul style="font-size:11px;margin-left:16px">';
      Object.keys(ctx.constraints).forEach(function(k){
        h += '<li>' + k + ': ' + ctx.constraints[k] + '</li>';
      });
      h += '</ul>';
    }
    if (ctx.selected_products && ctx.selected_products.length) {
      h += '<div style="font-size:11px;margin-top:8px"><b>Portfolio in scope:</b> ' + ctx.selected_products.join(', ') + '</div>';
    }
  } else {
    h += '<p style="color:var(--txM)">No action loaded. Load an engagement and select an action to see the brief.</p>';
  }
  h += '</div></div>';

  // Use case registry
  var ucWls = M.workloads.uc || [];
  var maasWls = M.workloads.maas || [];
  h += '<div class="card"><h3>📐 Workload Registry</h3>';
  if (ucWls.length + maasWls.length === 0) {
    h += '<p style="color:var(--txM)">No workloads defined yet. Add them in the Workloads tab.</p>';
  } else {
    h += '<table><thead><tr><th>Name</th><th>Category</th><th>Model</th><th>Data Source</th><th>Security</th><th>SLA</th><th>Agentic</th><th>Multimodal</th></tr></thead><tbody>';
    var allWls = ucWls.map(function(w){return {w:w,t:'UC'}})
      .concat(maasWls.map(function(w){return {w:w,t:'MaaS'}}))
      .concat((M.workloads.gpuaas||[]).map(function(w){return {w:w,t:'GPUaaS'}}))
      .concat((M.workloads.bmaas||[]).map(function(w){return {w:w,t:'BMaaS'}}));
    allWls.forEach(function(x){
      var w=x.w, type=x.t;
      var modObj = M.modelMap[w.model] || (M.modelById && M.modelById[w.model]);
      h += '<tr>'
        + '<td><b>' + w.name + '</b></td>'
        + '<td>' + type + '</td>'
        + '<td style="font-size:10px">' + ((modObj&&modObj.name)||w.model||'—').slice(0,22) + '</td>'
        + '<td>' + ({onprem:'🏢 On-Prem',api:'☁️ API',hybrid:'🔀 Hybrid'}[w.src||'onprem']||'🏢') + '</td>'
        + '<td>' + (w.securityTier||'standard') + '</td>'
        + '<td><span class="sla-' + (w.commercialSla||'bronze') + '">' + (w.commercialSla||'bronze') + '</span></td>'
        + '<td>' + (w.isAgentic?'✅ Yes':'—') + '</td>'
        + '<td>' + (w.isMultimodal?'✅ Yes':'—') + '</td>'
        + '</tr>';
    });
    h += '</tbody></table>';
  }
  h += '</div>';

  el.innerHTML = h;
};

