/**
 * atlas-tokens.js — ATLAS Naming Constants & Design Tokens v1.0
 * ==============================================================
 * Single source of truth for ALL field names, design token values,
 * task constants, and portfolio codes used across ATLAS tools.
 *
 * Usage:
 *   <script src="https://arvindbajaj5.github.io/atlas-platform/shared/atlas-tokens.js"></script>
 *   var dau = ATLAS.FIELDS.DAU            // 'dau'
 *   var col = ATLAS.COLORS.NAVY           // '#002870'
 *   var task = ATLAS.TASKS.INTEL_COLLECT  // 'intel_collection'
 *
 * RULE: If a name, colour, constant, or code exists here — use it.
 *       Never hardcode the same value in a tool file.
 *       Adding a new constant = add it here first, then use it.
 *
 * Blueprint reference: Sections 15, 19, 21, 22
 */

;(function (global) {
  'use strict'

  var ATLAS = global.ATLAS || {}

  // ── FIELD NAMES ─────────────────────────────────────────────────────────────
  // These are the canonical names for all data fields across ATLAS.
  // Any deviation from these names in any tool is a bug.
  // DB column names, JS variables, and HTML data attributes all use these.

  ATLAS.FIELDS = {
    // Traffic / Demand
    DAU:                      'dau',
    REQUESTS_PER_USER_PER_DAY:'requests_per_user_per_day',
    PEAK_MULTIPLIER:          'peak_multiplier',

    // Tokens
    TYPICAL_CONTEXT_TOKENS:   'typical_context_tokens',   // P50 input context
    MAX_CONTEXT_TOKENS:       'max_context_tokens',        // P95 input context
    AVG_OUTPUT_TOKENS:        'avg_output_tokens',

    // Latency
    TTFT_MS:                  'ttft_ms',                  // time to first token, ms
    TPOT_MS:                  'tpot_ms',                  // time per output token, ms

    // Model
    MODEL_ID:                 'model_id',                  // FK to model_catalogue.id
    PARAMS_B:                 'params_b',                  // model size in billions
    PRECISION:                'precision',                 // FP16|BF16|FP8|INT8|INT4|FP4

    // GPU
    GPU_CONFIG_ID:            'gpu_config_id',             // FK to gpu_configs.id
    BASE_GPUS:                'base_gpus',                 // before buffers
    TOTAL_GPUS:               'total_gpus',                // after all buffers
    RACK_COUNT:               'rack_count',
    POWER_KW:                 'power_kw',

    // SLA
    AVAILABILITY_SLA:         'availability_sla',          // '99.5'|'99.9'|'99.99'
    PERF_TIER:                'perf_tier',                 // 'tier1'|'tier2'|'tier3'

    // BOM
    BOM_STATUS:               'bom_status',                // 'E'|'S'|'C'|'M'

    // Yield
    YIELD_PCT:                'yield_pct',                 // production yield 0-100, default=100

    // Engagement
    ENGAGEMENT_ID:            'engagement_id',
    DOCKET_ID:                'docket_id',
    SOLUTION_VERSION_ID:      'solution_version_id',

    // Requirement items
    REQUIREMENT_TEXT:         'text',
    REQUIREMENT_SOURCE:       'source',                    // 'explicit'|'implicit'|'suggested'
    REQUIREMENT_STATUS:       'status',                    // 'active'|'accepted'|'dropped'|'deferred'
  }

  // ── FIELD VALUE ENUMS ───────────────────────────────────────────────────────

  ATLAS.PRECISION = {
    FP16: 'FP16', BF16: 'BF16', FP8: 'FP8',
    INT8: 'INT8', INT4: 'INT4', FP4: 'FP4'
  }

  ATLAS.PERF_TIER = {
    TIER1: 'tier1',  // Interactive <200ms TTFT, B_max=8
    TIER2: 'tier2',  // Analytical <5s, B_max=32
    TIER3: 'tier3'   // Async batch, B_max=unlimited
  }

  ATLAS.SLA = {
    S995:  '99.5',
    S999:  '99.9',
    S9999: '99.99'
  }

  ATLAS.BOM_STATUS = {
    ESTIMATED:  'E',  // Level 1 rule-of-thumb
    SIZED:      'S',  // Level 2 from workload profiling
    CONFIRMED:  'C',  // Customer-agreed or quoted
    MANUAL:     'M'   // User-entered override
  }

  ATLAS.SOLUTION_LEVEL = {
    L1_ROM:      'L1-rom',
    L2_DETAILED: 'L2-detailed',
    L2_PRICED:   'L2-priced'
  }

  ATLAS.SOLUTION_STATUS = {
    DRAFT:            'draft',
    SENT_TO_CUSTOMER: 'sent-to-customer',
    SUPERSEDED:       'superseded',
    ACCEPTED:         'accepted',
    REJECTED:         'rejected'
  }

  ATLAS.REQUIREMENT_SOURCE = {
    EXPLICIT:  'explicit',   // customer stated directly
    IMPLICIT:  'implicit',   // consultant/sales addition
    SUGGESTED: 'suggested'   // our proposition to customer
  }

  ATLAS.REQUIREMENT_STATUS = {
    ACTIVE:   'active',
    ACCEPTED: 'accepted',
    DROPPED:  'dropped',
    DEFERRED: 'deferred'
  }

  ATLAS.PIPELINE_STAGE = {
    IDENTIFIED:  'identified',
    QUALIFIED:   'qualified',
    PROPOSED:    'proposed',
    NEGOTIATION: 'negotiation',
    WON:         'won',
    LOST:        'lost'
  }

  ATLAS.ARCHETYPE = {
    TSAP:       'sovereign-ai-platform',
    CSP:        'ai-infra-provider',
    DEPLOYER:   'ai-application-deployer',
    RESEARCH:   'ai-research-platform',
    CONSUMER:   'ai-services-consumer',
    DEFENCE:    'defence-classified-ai'
  }

  ATLAS.SECURITY_TIER = {
    S1: 'S1',  // Standard — K8s namespaces, VLAN, shared GPU
    S2: 'S2',  // Enhanced — VM isolation, VRF, MIG GPU, HSM
    S3: 'S3',  // Sovereign — bare metal, physical switch, dedicated GPU (non-poolable)
    S4: 'S4'   // Classified — separate cage, air-gap, TEMPEST
  }

  ATLAS.ISOLATION = {
    LOGICAL:  'logical',   // K8s namespaces
    VIRTUAL:  'virtual',   // VM-based hypervisor
    PHYSICAL: 'physical',  // Bare metal
    CAGE:     'cage'       // Separate physical cage (S4)
  }

  ATLAS.ORCHESTRATION = {
    KUBERNETES:  'kubernetes',
    VM:          'vm',
    BARE_METAL:  'bare_metal',
    HYBRID:      'hybrid'
  }

  ATLAS.TENANT_TYPE = {
    INTERNAL:            'internal',
    EXTERNAL_COMMERCIAL: 'external_commercial',
    RESEARCH:            'research',
    PUBLIC:              'public',
    DEVELOPER:           'developer',
    ANCHOR:              'anchor'
  }

  ATLAS.CHARGEOUT = {
    COMMERCIAL:    'commercial',
    COST_RECOVERY: 'cost_recovery',
    SUBSIDISED:    'subsidised',
    ZERO:          'zero'
  }

  // ── AI TASK CONSTANTS ───────────────────────────────────────────────────────
  // Used by atlas-ai.js for task-based model routing.
  // Model for each task configured in Settings → app_config.
  // Adding a new AI task = add constant here + configure model in Settings.

  ATLAS.TASKS = {
    INTEL_COLLECTION:   'intel_collection',    // weekly domain scraping
    INTEL_SYNTHESIS:    'intel_synthesis',     // domain/platform/competitive synthesis
    INTEL_BRIEF:        'intel_brief',         // engagement meeting brief
    UC_MATCHING:        'uc_matching',         // UC ranking from vector candidates
    TAG_SUGGEST:        'tag_suggest',         // tag + portfolio suggestion on req save
    GAP_ANALYSIS:       'gap_analysis',        // missing requirements detection
    VISION_DOCUMENT:    'vision_document',     // vision document generation
    SIZING_RATIONALE:   'sizing_rationale',    // explain GPU count in plain English
    ROM_NARRATIVE:      'rom_narrative',       // ROM document narrative generation
    EMBED:              'embed'                // text embedding (always text-embedding-3-small)
  }

  // ── PORTFOLIO CODES ─────────────────────────────────────────────────────────
  // Internal codes used in DB and Solution Builder.
  // NEVER shown to users — they see human-readable labels only.
  // Reference: Blueprint Section 19.

  ATLAS.PORTFOLIO = {
    // PREPARE
    P01: 'P01',  // AI Readiness Assessment
    P02: 'P02',  // Strategy & Governance
    P03: 'P03',  // Data Estate Planning
    P04: 'P04',  // Use Case Discovery
    P05: 'P05',  // Procurement Advisory
    P06: 'P06',  // AI Literacy Programme
    P07: 'P07',  // Organisational Change Management
    P08: 'P08',  // Regulatory Compliance Advisory

    // BUILD L1 — DC / Facility
    B1A: 'B1A',  // MDC — full turn-key
    B1B: 'B1B',  // B&M DC — existing building, no civil
    B1C: 'B1C',  // Customer DC — hardware + platform only
    B1D: 'B1D',  // GPU cluster — no facility
    B1E: 'B1E',  // Edge / container
    B1F: 'B1F',  // Multi-site

    // BUILD L2 — Hardware Platform
    B2A: 'B2A',  // GPU compute — inference
    B2B: 'B2B',  // GPU compute — training
    B2C: 'B2C',  // CPU + storage + network (auto-included with B2A/B2B)
    B2D: 'B2D',  // HPC Middleware
    B2E: 'B2E',  // Rack-scale systems (NVL72)
    B2F: 'B2F',  // Heterogeneous GPU architecture

    // BUILD L3 — Virtualisation & Orchestration
    B3A: 'B3A',  // Kubernetes / OpenShift
    B3B: 'B3B',  // VM-based (hypervisor)
    B3C: 'B3C',  // Bare metal
    B3D: 'B3D',  // Hybrid orchestration
    B3E: 'B3E',  // Identity & Access Management (optional)
    B3F: 'B3F',  // Zero-trust Network Access (optional)
    B3G: 'B3G',  // Multi-tenancy Isolation Layer (optional)

    // BUILD L4 — AI Platform
    B4A: 'B4A',  // AI Platform Core (Registry, RAG, API GW, Obs, Vector DB)
    B4B: 'B4B',  // AI Platform Pro (Data Fusion, MLOps)
    B4C: 'B4C',  // Model Fine-tuning Platform

    // BUILD L5 — Use Cases & aaS Services
    B5A: 'B5A',  // Domain Use Cases
    B5B: 'B5B',  // AI Agents
    B5C: 'B5C',  // Public-facing services
    B5D: 'B5D',  // Analytics & dashboards
    B5E: 'B5E',  // MaaS — Model as a Service
    B5F: 'B5F',  // GPUaaS — GPU as a Service
    B5G: 'B5G',  // BMaaS — Bare Metal as a Service
    B5H: 'B5H',  // PTaaS — Post-Training as a Service
    B5I: 'B5I',  // AI API Marketplace

    // BUILD L6 — Governance & Compliance
    B6A: 'B6A',  // AI Governance framework + model cards
    B6B: 'B6B',  // Regulatory compliance (DPDP, sectoral)
    B6C: 'B6C',  // Security posture management (SIEM)
    B6D: 'B6D',  // Data sovereignty controls

    // BUILD L7 — Capability Building
    B7A: 'B7A',  // AI Centre of Excellence
    B7B: 'B7B',  // AI Skills Academy
    B7C: 'B7C',  // Startup Incubator

    // OPERATE
    O01: 'O01',  // Fully managed runtime (always bundled — our team)

    // SUSTAIN
    S01: 'S01',  // Model Refresh & Retraining
    S02: 'S02',  // UC Enhancements
    S03: 'S03',  // Hardware Refresh (end of life)
    S04: 'S04',  // Capacity Expansion
    S05: 'S05',  // Security Compliance Audits
  }

  // ── SIZING CONSTANTS ─────────────────────────────────────────────────────────

  ATLAS.SIZING = {
    // Tier batch caps
    TIER1_BMAX:          8,
    TIER2_BMAX:          32,
    TIER3_BMAX:          Infinity,

    // Bytes per parameter by precision
    BYTES_PER_PARAM: {
      'FP16': 2, 'BF16': 2, 'FP8': 1,
      'INT8': 1, 'INT4': 0.5, 'FP4': 0.5
    },

    // Coherent memory usability factors
    COHERENT_USABILITY: {
      'nvlink-c2c':      0.30,   // GB200, GB300 NVL72
      'nvlink-c2c-gen2': 0.35,   // Vera Rubin NVL72
      'infinity-fabric':  0.25   // Instinct Helios
    },

    // Framework overhead multiplier
    FRAMEWORK_OVERHEAD:  1.20,

    // GPU utilisation cap
    UC_DERATING_PCT:     80,    // UC inference
    MAAS_DERATING_PCT:   75,    // MaaS — lower for LB micro-burst buffer

    // Default yield (100 = no adjustment, preserves existing behaviour)
    DEFAULT_YIELD_PCT:   100,

    // P95 multiplier
    P95_MULT:            1.5,   // P95_RPS = avg_RPS × peak_multiplier × 1.5

    // Buffer percentages
    BUFFERS: {
      PEAK_STANDARD:       0.25,
      PEAK_ENTERPRISE:     0.30,
      FAILOVER_STANDARD:   0.15,
      FAILOVER_ENTERPRISE: 0.30,
      MULTI_TENANCY:       0.12,
      HA_995:              0.10,
      HA_999:              0.20,
      HA_9999:             1.00,  // active-active
      GROWTH:              0.20,
      ISOLATION_TIER1:     0.10
    },

    // KV cache field rules (MB per token) when model arch not available
    KV_FIELD_RULES: {
      SMALL:   0.15,   // 7-14B
      MEDIUM:  0.25,   // 14-35B
      LARGE:   0.35,   // 70-80B
      XLARGE:  0.50    // 100B+
    }
  }

  // ── DESIGN TOKENS ───────────────────────────────────────────────────────────
  // Mirror of CSS custom properties in atlas.css.
  // Use these in JS when you need colour values (e.g. chart colours).
  // For CSS: always use var(--navy) etc. Never hardcode hex in CSS.

  ATLAS.COLORS = {
    NAVY:   '#002870',
    ORANGE: '#FF5539',
    TEAL:   '#00B290',
    AMBER:  '#FFB600',
    BLUE:   '#1C38F5',
    DARK:   '#111827',
    MID:    '#6B7280',
    LIGHT:  '#F8F9FA',
    BORDER: '#E5E7EB',
    WHITE:  '#FFFFFF',

    // BOM status colours
    BOM_E:  '#6B7280',   // Estimated — grey
    BOM_S:  '#1C38F5',   // Sized — blue
    BOM_C:  '#00B290',   // Confirmed — teal
    BOM_M:  '#FFB600',   // Manual — amber
  }

  ATLAS.FONT = 'Roboto, sans-serif'   // brand.md authoritative — NOT Inter

  // ── DOCKET ITEM TYPES ───────────────────────────────────────────────────────
  // Supabase check constraint values for docket_items.item_type
  // Do NOT use values outside this list — will fail DB constraint

  ATLAS.ITEM_TYPE = {
    ACTION:      'action',
    INTEL:       'intel',
    PEI:         'pei',
    UC:          'uc',
    RFP:         'rfp',
    PITCH:       'pitch',
    SOLUTION:    'solution',
    BOM:         'bom',
    PROPOSAL:    'proposal',
    PRICING:     'pricing',
    EXEC_DOC:    'exec_doc',
    REQUIREMENT: 'requirement'   // NEW — added in redesign
  }

  ATLAS.ITEM_SECTION = {
    PROFILE:     'profile',
    STRATEGY:    'strategy',
    UC:          'uc',
    ACTION:      'action',
    OUTPUT:      'output',
    NOTE:        'note',
    AGREEMENT:   'agreement',
    REQUIREMENT: 'requirement'   // NEW — added in redesign
  }

  // DB status values (UI labels are translated via toDbStatus/fromDbStatus in atlas-db.js)
  ATLAS.ITEM_STATUS_DB = {
    PENDING:     'pending',
    IN_PROGRESS: 'in_progress',
    DONE:        'done',
    CLOSED:      'closed'
  }

  // ── VERSION INFO ─────────────────────────────────────────────────────────────

  ATLAS.TOKENS_VERSION = '1.0.0'
  ATLAS.TOKENS_DATE    = '2026-06-28'

  // ── EXPORT ───────────────────────────────────────────────────────────────────

  global.ATLAS = ATLAS

})(typeof window !== 'undefined' ? window : global)
