# ATLAS Feature Backlog
**Last updated:** 28 June 2026  
**Purpose:** Every new idea, function, or feature that is not in the current build phase goes here. Reviewed at the start of each new build phase. Nothing gets built mid-phase just because it's a good idea.

**Review protocol:** At the start of each phase, read this file. For each item ask: (1) Does this belong in the current phase? (2) Is it a prerequisite for something in scope? (3) Can it wait? Gate ruthlessly.

---

## HOW TO USE THIS FILE
- Add new ideas here immediately — do not build them
- Format: `[Date] — [Item] — [Why deferred] — [Suggested phase]`
- Review at phase start, not mid-build
- Items promoted to a phase get moved to the build plan, not deleted here
- Items completed get marked ✅ with date

---

## PHASE 0 — DEFERRED (fix bugs, shared foundation)
*Items that were considered during Phase 0 planning but deferred*

**[2026-06-28] — RAC Tool Supabase integration**
Connect RAC Tool to pipeline_deals + solution_versions tables.
Why deferred: RAC works standalone today. Not blocking any customer-facing work.
Suggested phase: Phase 5 (Pipeline Integration) or later.

**[2026-06-28] — Deal Analysis BOM pre-population**
Pre-populate Deal Analysis from Solution Builder BOM when opened from Docket.
Why deferred: Deal Analysis works standalone. Not blocking.
Suggested phase: Phase 5 or later.

**[2026-06-28] — AI Sovereignty Index update**
Add atlas.css link only. No logic changes.
Why deferred: Minor cosmetic. Not blocking.
Suggested phase: Do during Phase 1 foundation (30 min job, no risk).

**[2026-06-28] — HPC Monitoring update**
Add atlas.css link only.
Why deferred: Post-delivery ops tool. Not pre-sales critical.
Suggested phase: After Phase 6, or whenever convenient.

---

## PHASE 1 — DEFERRED (shared foundation)
*Items considered during shared foundation build but deferred*

**[2026-06-28] — atlas-components.js creation**
Shared UI component library — card(), badge(), btn(), table(), derivedPanel(), bomLine() etc.
Why deferred: Fast path keeps render functions in tool files with REFACTOR-MARKER.
             Extract when patterns are clear after Phase 2-3.
Suggested phase: Maintainability phase (after Phase 6).

**[2026-06-28] — atlas-validators.js creation**
Shared input validation and logical consistency checker.
Why deferred: Inline validators per tool for now. Extract when multiple tools need same logic.
Suggested phase: Maintainability phase.

**[2026-06-28] — atlas-intel.js creation (partial)**
Intel collection agent, synthesis, engagement brief generation.
Why deferred: Needed for Phase 2 (Docket intel tab). This is NOT fully deferred — the
             collection and synthesis logic must be built in Phase 2. Only the extraction
             from intelligence-scraper into a shared file is the deferred part.
Suggested phase: Phase 2 (Docket redesign) — build alongside Docket intel tab.

---

## PHASE 2 — DEFERRED (Docket redesign)
*Items that came up during Docket design but are not Phase 2 scope*

**[2026-06-28] — Multilingual requirement capture**
Requirements in Hindi and other Indic languages.
Why deferred: Sales team captures in English currently. Multilingual embedding model
             swap is architecture-compatible when needed (one config change).
Suggested phase: Phase 4+ or when a specific engagement demands it.

**[2026-06-28] — Mobile-optimised Docket**
Docket on phone for field sales.
Why deferred: Desktop-first for now. Requirements capture is the critical flow.
Suggested phase: After Phase 6 when platform is stable.

**[2026-06-28] — Cross-engagement pattern learning UI**
Show the sales person "In 3 similar engagements, the customer also asked for X."
The vector infrastructure supports this from Day 1. The UI surfacing it is deferred.
Why deferred: The matching happens automatically via pgvector. Building the UI to
             surface it elegantly takes design time we don't have in Phase 2.
Suggested phase: Phase 3 or maintainability phase.

**[2026-06-28] — Gap analysis scheduled automation**
Auto-run gap analysis weekly without user trigger.
Why deferred: User-triggered first. Understand usage patterns before automating.
Suggested phase: After Phase 2 is stable and usage data exists.

**[2026-06-28] — UC suggestion approval workflow**
Formal approval workflow for UC suggestions before they enter UC library.
Why deferred: Simple accept/reject UI in Phase 2 is sufficient to start.
             Multi-step approval (review → enrich → approve) is backlog.
Suggested phase: Phase 3 or later.

---

## PHASE 3 — DEFERRED (Solution Builder)
*Items that came up during Solution Builder design but are not Phase 3 scope*

**[2026-06-28] — Yield-adjusted sizing (yield_pct parameter)**
Production yield integration into sizeUC() and sizeMaaS().
IMPORTANT: Placeholder MUST exist in sizing screens — "Yield adjustment — coming soon."
yield_pct default = 100 (no adjustment, preserves existing behaviour).
No division-by-zero risk with this default.
Why deferred: Yield benchmark data not yet in model_catalogue. Build the data first.
Suggested phase: Phase 3 extension — after core sizing works, add yield as parameter.
Reference: Blueprint Section 30 (Production Yield).

**[2026-06-28] — Yield Factory tool**
Post-delivery tool to measure actual production yield on deployed platforms.
Requires: deployed platform with telemetry, live inference logs.
Why deferred: Pre-sales tool first. Yield Factory is a post-delivery product.
Suggested phase: Future — Phase 3+ after core platform is deployed at a customer.
Reference: Blueprint Section 30.

**[2026-06-28] — Startup Incubator configuration**
B7C portfolio item configuration and BOM lines.
Why deferred: Commercial model not yet defined. No current engagement needs this.
Suggested phase: When first incubator engagement is in pipeline.

**[2026-06-28] — CoE/Skills Academy detailed BOM**
Full curriculum, lab infra sizing, trainer headcount model for B7A/B7B.
Why deferred: High-level BOM line exists. Detailed model needs a reference engagement.
Suggested phase: When first CoE engagement reaches L2 detailed stage.

**[2026-06-28] — PTaaS detailed configuration**
Three tiers (MFT/DMF/SMP) with pricing, duration, GPU requirements per project.
Why deferred: Broad concept defined. Detailed commercial model needs product team input.
Suggested phase: Phase 3 extension — after core Solution Builder works.

**[2026-06-28] — Multi-site topology designer**
Visual topology for B1F multi-site deployments (primary + DR, hub-spoke).
Why deferred: Text-based multi-site config is sufficient for ROM/BOM.
             Visual designer is a UX enhancement.
Suggested phase: Maintainability phase.

**[2026-06-28] — Base Model + Multi-LoRA MaaS architecture**
Serving multiple fine-tuned LoRA adapters on a single base model resident in VRAM.
Sizing and commercial model implications.
Why deferred: Standard dedicated model provisioning is simpler and sufficient for now.
             Multi-LoRA is a cost optimisation for mature MaaS operations.
Suggested phase: Phase 3 extension or post Phase 6.

**[2026-06-28] — Shared VRAM vLLM model packing**
Multiple smaller models packed onto single GPUs using vLLM sleep/hibernate.
Why deferred: Dedicated provisioning per model type is the safe default for first build.
Suggested phase: Phase 3 extension — after MaaS is live and utilisation data exists.

---

## PHASE 4 — DEFERRED (Simulations)
*Items that came up during simulation design but are not Phase 4 scope*

**[2026-06-28] — Financing options simulation**
Sensitivity analysis on capex structure — impact of VGF %, debt rate, phase timing
on annual cost and break-even month.
Why deferred: Financing Model itself is Phase 3 scope. Simulation of financing options
             is a layer on top — Phase 4 extension.
Suggested phase: Phase 4 extension after core 6 simulations are working.

**[2026-06-28] — CPST simulation view in Sim 2 (Tokenomics)**
Show Cost per Successful Task alongside raw token cost.
Requires: yield_pct data in model_catalogue.
Why deferred: Yield data not yet seeded. Sim 2 shows raw token cost first.
Suggested phase: Phase 4 — add CPST view when yield_pct is populated.

**[2026-06-28] — Competitive pricing live data**
Live API pricing from Groq, Together AI, Fireworks AI as simulation inputs.
Why deferred: Manual entry or periodic update is sufficient for ROM stage.
             Live data requires API integrations.
Suggested phase: Phase 4 extension or later.

---

## PHASE 5 — DEFERRED (Pipeline Integration)
*Items deferred to pipeline integration phase*

**[2026-06-28] — RAC Tool full Supabase integration**
Replace localStorage deal store. Stage gate automation. TCV from solution_versions.
Why deferred: RAC works standalone. Not blocking customer-facing work.
Suggested phase: Phase 5.

**[2026-06-28] — Deal Analysis BOM pre-population**
Pre-populate from Solution Builder BOM when opened from Docket.
Suggested phase: Phase 5.

**[2026-06-28] — Win/loss reason taxonomy**
Standard win/loss reason tags feeding into Intel Ops competitive brief.
Why deferred: Need a few deal cycles to define the right taxonomy.
Suggested phase: Phase 5.

---

## FUTURE / UNPHASED
*Good ideas with no current phase assigned*

**[2026-06-28] — Extractable Factory Tool**
Customer-facing operational control plane for TSAP/CSP fleet management.
Configure UCs per tenant, set token allocations, manage MaaS pricing for end-users,
chargeout/billing exports, fleet utilisation monitoring.
Why deferred: This is a DELIVERABLE product built for the customer, not an internal
             ATLAS tool. Requires a specific customer engagement to build against.
             Cannot be built generically without a reference customer.
Reference: Blueprint Section 31.
Suggested phase: Build as part of first TSAP delivery engagement (post-sale, not pre-sales).

**[2026-06-28] — Pipeline parallelism (PP) in sizing**
Relevant only for 100B+ models on small GPU count. Very edge case.
Why deferred: TP (tensor parallelism) covers all current use cases.
Suggested phase: Add to SizingEngine if a specific engagement needs it.

**[2026-06-28] — HHEM leaderboard integration**
Auto-populate model_catalogue yield data from HHEM leaderboard API.
Why deferred: Manual seeding of yield_pct is sufficient for now.
Suggested phase: When yield_pct is actively used in sizing.

**[2026-06-28] — Agentic UC type — multi-step yield compounding**
num_agentic_steps field in uc_interaction_types.
compound_yield = per_step_yield ^ num_steps applied to sizing.
Why deferred: Standard UC types are not agentic today. Add when first agentic UC
             appears in the UC library.
Suggested phase: Phase 3 extension when agentic UCs are configured.

**[2026-06-28] — Semantic router configuration in MaaS**
Route simple requests to smaller cheaper model, complex to premium model.
Circuit breaker on failure → fallback to premium.
Why deferred: Single model per usage type is simpler and correct for first build.
             Semantic routing is a cost optimisation for mature MaaS.
Suggested phase: Post Phase 6 when first MaaS is live.

**[2026-06-28] — Day/night batch repurposing configuration**
Load balancer rules to switch Tier 1/2 hardware to Tier 3 batch workloads at night.
Why deferred: Ops decision post-delivery. Not a pre-sales ATLAS function.
Reference: Blueprint Section 9 (Sizing Engine, Step 4).
Suggested phase: Extractable Factory Tool or HPC Monitoring extension.

**[2026-06-28] — GeoAI Configurator assessment**
tools/geoai-configurator — determine if content should fold into Solution Builder L5
or remain as a standalone domain-specific tool.
Why deferred: Needs content review before decision.
Suggested phase: Assess during Phase 2 Docket redesign (low effort assessment).

**[2026-06-28] — BOM Validator assessment**
tools/bom-validator — determine if validation logic belongs in Solution Builder BOM
assembly step (atlas-validators.js) or remains standalone.
Why deferred: Needs content review.
Suggested phase: Assess during Phase 3 Solution Builder build.

**[2026-06-28] — Engagement Management tool assessment**
tools/engagement-management — determine overlap with Docket redesign.
Why deferred: Needs content review.
Suggested phase: Assess before Phase 2 Docket redesign starts.

**[2026-06-28] — Portfolio Portal assessment**
tools/portfolio-portal — may predate current 4-block portfolio design.
Why deferred: Needs content review before retire/merge decision.
Suggested phase: Assess before Phase 2 Docket redesign starts.

**[2026-06-28] — data/ folder assessment**
benchmarks.json, boms.json, opportunities.json, projects.json.
Determine if these are actively used or superseded by Supabase tables.
Why deferred: Low risk, can wait.
Suggested phase: Assess during Phase 0 foundation week.

---

## COMPLETED ITEMS
*Nothing completed yet — this file was created 28 June 2026*

---

## REVIEW LOG
| Date | Phase | Items reviewed | Items promoted | Items dropped | Reviewer |
|------|-------|---------------|----------------|---------------|----------|
| 2026-06-28 | Pre-Phase 0 | 0 | 0 | 0 | AB |

