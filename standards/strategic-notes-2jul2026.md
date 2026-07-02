# ATLAS Strategic Session — 2 July 2026
## Commercial Model, Product Architecture, Competitive Intelligence

---

## 1. DEFINITIVE COMMERCIAL MODEL

### What Bull India Is
- Sovereign AI infrastructure provider (wholesale/infrastructure layer)
- NOT an operator, service provider, or consumer brand
- NEVER sells directly to end service consumers

### Two Commercial Models

**B2B — SI Delivery**
- Customer: Government / Large Enterprise
- We deliver: Full stack (PREPARE → BUILD → OPERATE → SUSTAIN)
- They get: Their own sovereign AI platform
- Revenue: Turnkey project + AMC + consumption
- Examples: HAICE, DGCA, NE India GeoAI

**B2B2B — Enabling Operators**
- Customer: TSAP / CSP / ISV / Platform Aggregator
- We deliver: Wholesale API infrastructure + capacity
- They become: The AI service provider / operator
- Their customers get: AI services (we never see them)
- Revenue: Wholesale API consumption, volume-based
- Examples: BSNL offering sovereign AI APIs, state IT corp,
  telco white-labelling our Indic Voice API, ISV building
  legal AI product on our APIs

### The Core Principle
> "We provide the AI nervous system. Our customers build the body."
> We carry the signal (tokens, embeddings, audio).
> We guarantee it stays in India, arrives fast, metered correctly.
> What customers do with that signal is entirely theirs.
> We are NOT an application builder. EVER.

### GPUaaS / BMaaS Position
- Utilisation uplifting strategy, NOT core product
- Answer when customer says "I want to run my own model" or
  "I need guaranteed capacity"
- Not the homepage hero — API is the hero

---

## 2. PRODUCT ARCHITECTURE

### Customer-Facing Products (products page)

```
SOVEREIGN AI APIs
│
├── HORIZONTAL (foundation layer)
│     Inference API      — Text, Code, Reasoning, Multimodal
│     Voice API          — Indic STT (Shuka) + TTS (Bulbul) + Translation
│     Embedding API      — Semantic search, RAG, Reranking
│     Batch API          — Async large-scale document processing
│
├── VERTICAL BUNDLES (pre-packaged per segment)
│     Sovereign Code API — Coding + Agentic, tenant IP isolation
│                          → Segment A (IT services, ISVs)
│     Indic Voice Suite  — STT + TTS + Sarvam LLM, single endpoint
│                          → Segment B (consumer, vernacular)
│     Document AI API    — High-context + batch + zero retention
│                          → Segment C (BFSI, legal, compliance)
│     GovStack API       — Air-gapped endpoints, S3/S4 isolation
│                          → Segment D (national/state government)
│     Vision AI API      — Multimodal + batch vision inference
│                          → Segment E (industrial, logistics, agri)
│
└── DEDICATED CAPACITY (utilisation strategy)
      Reserved Inference — guaranteed SLA, your model or ours
      GPUaaS             — GPU blocks, customer manages software
      BMaaS              — bare metal, full stack ownership
```

### Platform Layer (INTERNAL ONLY — NOT customer-facing)
- COMPASS, Fine-Tuning API, Model Registry
- These are how we operate the platform, not what we sell
- Stays in ATLAS as operational tooling
- Never appears on products page

### Portfolio Catalogue (B2B SI Delivery)
- PREPARE → BUILD → OPERATE → SUSTAIN (44 items)
- Separate from products page
- B5A-D (Domain UCs, Agents, Public services, Analytics) =
  what TSAP/CSP customers BUILD on our APIs, not what we deliver

### Proposed New ENABLE Block in Portfolio
```
ENABLE (new block — what operators/TSAPs offer their customers)
  E1  Sovereign Inference API
  E2  Sovereign Voice API (Indic)
  E3  Embedding & Reranking API
  E4  Batch Document API
  E5  Vertical API Bundles
  E6  GPUaaS capacity
  E7  BMaaS capacity
  E8  PTaaS (Fine-tuning)
```

---

## 3. 5-SEGMENT CUSTOMER MATRIX

### Segment A — Coding & Agentic Systems
- Profile: India's 5M+ developer ecosystem, IT services shifting
  to outcome-based software export, ISVs building coding tools
- Primary workload: Interactive + Agentic (low-latency, tool-calling)
- Models: DeepSeek Coder V2, Qwen2.5-Coder 72B, QwQ-32B
- Infra: MaaS (reserved, Gold SLA), GPUaaS (for IP isolation)
- Sensitivity: S2 (client IP, source code)
- Pricing: Reserved capacity + per-token above baseline
- Key differentiator: Multi-tenant IP containment in Indian
  jurisdiction (GitHub Copilot routes to US, we don't)

### Segment B — Vernacular & Consumer Multimodal
- Profile: B2B2B — fintechs, D2C brands, conversational commerce
  (WhatsApp/ONDC), Tier-2/3 and rural populations
- Primary workload: Interactive, Voice (STT/TTS), low-latency
- Models: Sarvam-M, Shuka STT, Bulbul TTS, Llama 3.2 small
- Infra: MaaS (open pool, Bronze/Silver), Voice AI stack
- Sensitivity: S1 (consumer data, PII under DPDP Act)
- Pricing: Per-token, per-minute (audio)
- Key differentiator: Only sovereign Indic voice stack at scale
  (Sarvam/Shuka/Bulbul not on Together/Fireworks)
- Note: Voice is primary interface for Tier 2/3, not text.
  "Sovereign Voice AI" deserves explicit product treatment.

### Segment C — BFSI / High-Context Document AI
- Profile: Banks, insurers, NBFCs, law firms — compliance-heavy
  (RBI, SEBI, IRDAI data localisation requirements)
- Primary workload: Batch (document processing), Interactive (RAG)
- Models: Qwen2.5 72B, Llama 3.1 405B, LLaVA (document vision)
- Infra: MaaS (reserved, tenant-isolated), Batch Inference
- Sensitivity: S2-S3 (financial data, regulated)
- Pricing: Reserved capacity + per-document batch pricing
- Key differentiator: RBI-compliant data residency, zero data
  retention guarantee, high-context compliance library RAG
- Note: Batch Inference is the gap vs Together/Fireworks — BFSI
  is exactly the segment that needs it most

### Segment D — Public Digital Infrastructure & GovTech
Split into two distinct sub-segments:

**D1 — National Public Stacks**
- Profile: NIC, MeitY, national platform operators
  (Bhashini, ONDC, PM-Kisan, Ayushman Bharat)
- Infra: BMaaS / dedicated within NIC/MeitY datacenters
- Sensitivity: S3-S4
- Pricing: Capacity contracts, multi-year
- Differentiator: Only viable option — no foreign provider qualifies

**D2 — State Sovereign Platforms (current deals)**
- Profile: State governments (HAICE, DGCA, NE India GeoAI)
- Infra: Full stack — DC + hardware + MaaS + GPUaaS + SI delivery
- Sensitivity: S3-S4
- Pricing: Turnkey project + AMC + consumption
- Differentiator: Full SI delivery + sovereign platform

### Segment E — Vision AI & Industrial IoT
- Profile: Tech-conscious customers — manufacturers, logistics,
  agri-tech, satellite/geospatial analytics
- Primary workload: Batch vision, async telemetry
- Models: LLaVA, InternVL, PatchCore (industrial), CogVLM2,
  GeoChat, SatMAE, Prithvi (geospatial)
- Infra: GPUaaS (central inference) + async batch API
- Sensitivity: S1-S2
- Pricing: Per-inference (batch API)
- Note: Edge is pure hardware play — NOT our product.
  Central inference API for vision is our play.
- Differentiator: Verticalised vision API + sovereign cloud +
  geospatial models (SatMAE, Clay, Prithvi) not on Together/Fireworks

---

## 4. COMPETITIVE INTELLIGENCE

### Together AI vs Fireworks vs Bull India

| Capability | Together | Fireworks | Bull India |
|---|---|---|---|
| Serverless inference | ✓ | ✓ | MaaS (build) |
| Batch inference | ✓ | Partial | Batch API (build — gap) |
| Dedicated/reserved | ✓ | ✓ | GPUaaS + BMaaS |
| Fine-tuning SFT/DPO | ✓ | ✓ | PTaaS (portfolio) |
| RL fine-tuning | ✓ | ✓ | Not yet |
| Multi-LoRA serving | Partial | ✓ | "Sovereign Variants" (opportunity) |
| Custom GPU kernels | ✓✓ | ✓✓ | vLLM (open source) |
| Data residency/sovereignty | ✗ | ✗ | ✓✓ CORE DIFFERENTIATOR |
| Indic language models | ✗ | ✗ | ✓✓ Sarvam/Shuka/Bulbul |
| Air-gapped deployment | ✗ | ✗ | ✓✓ |
| Domain models (GeoAI) | ✗ | ✗ | ✓ |
| Hardware OEM position | ✗ | ✗ | ✓✓ |
| Full-stack SI delivery | ✗ | ✗ | ✓✓ |
| OpenAI API compatible | ✓ | ✓ | Must have (migrate by URL swap) |

### Key Technical Notes
- Both Together and Fireworks: OpenAI + Anthropic API compatible
- Our must-have statement: "Migrate by changing one line of code"
- Fireworks FireAttention: 5x throughput vs competitors on DeepSeek V4 Pro
- We compete on sovereignty, not raw throughput — kernel engineering not needed
- Our API surface must match theirs: /v1/chat/completions, /v1/embeddings,
  /v1/audio/transcriptions, /v1/audio/speech, /v1/rerank, /v1/batch

### What They Cannot Do (Our Absolute Moat)
1. Legal data residency within Indian territory (DPDP Act compliance)
2. Indic language models at production quality (Sarvam, Shuka, Bulbul)
3. Air-gapped / S4 classified deployments
4. Hardware OEM + full-stack SI delivery
5. Domain-specific models (GeoAI, Biomedical, Legal — Indian context)

---

## 5. PUBLISHED RATE CARDS (July 2026 reference)

### Together AI Serverless ($/1M tokens, input/output)
| Model | Input | Output |
|---|---|---|
| Llama 3.3 70B | $1.04 | $1.04 |
| Llama 3.1 8B Lite | $0.14 | $0.14 |
| Qwen2.5 7B Turbo | $0.30 | $0.30 |
| DeepSeek V4 Pro | $1.74 ($0.20 cached) | $3.48 |
| Qwen3.5 397B | $0.60 ($0.35 cached) | $3.60 |
| gpt-oss-120B | $0.15 | $0.60 |
| MiniMax M3 | $0.30 ($0.06 cached) | $1.20 |
| Whisper Large v3 | $0.0015/min | — |
| Embeddings (e5-large) | $0.02 | — |

### Together AI GPU Clusters ($/GPU/hour)
| GPU | On-demand | 31-90 day |
|---|---|---|
| H100 | $3.99 | $3.29 |
| H200 | $5.99 | $4.15 |
| B200 | $8.19 | $7.79 |

### Fireworks AI ($/1M tokens, as of April 2026)
| Model class | Price |
|---|---|
| 8B-class models | $0.20 |
| 70B-class models | $0.90 |
| Llama 3.3 70B | $0.90 |
| DeepSeek V4 Pro | $1.74/$3.48 |

### Original AI Labs (reference ceiling)
| Provider/Model | Input $/1M | Output $/1M |
|---|---|---|
| OpenAI GPT-4o | $2.50 | $10.00 |
| OpenAI GPT-4o mini | $0.15 | $0.60 |
| Anthropic Claude Sonnet 4.6 | $3.00 | $15.00 |
| Anthropic Claude Haiku 4.5 | $0.80 | $4.00 |
| Google Gemini 2.0 Flash | $0.10 | $0.40 |
| DeepSeek (direct) | $0.27 | $1.10 |

### Our Pricing Framework
- CEILING: Together/Fireworks rates for equivalent models
- Cannot price above this without a compelling reason
- SOVEREIGN PREMIUM: 15-25% above Together/Fireworks rates
  for data residency guarantee + Indic support + SI integration
- INDIC MODELS: No comparable pricing exists (unique to us)
- BATCH API: Price as async discount (30-50% vs real-time,
  consistent with industry standard)

---

## 6. GAPS TO ADDRESS IN FUTURE BUILDS

### Product gaps vs Together/Fireworks
1. Batch Inference API — async document processing (BFSI priority)
2. Multi-LoRA / Sovereign Variants — department-specific adapters
3. Reranking API — /v1/rerank endpoint (Cohere compatible)
4. Prompt caching — 50% discount on cached input tokens
5. OpenAI-compatible migration path — must be explicitly stated

### ATLAS Platform gaps (Stage 2)
1. benchmark_results table needs real measured throughput data
2. model_catalogue.inference_type column (generation/embedding/audio/vision)
3. margin_pct / discount_pct in Settings
4. customer_segments table for Fleet Yield Scenario 2
5. ENABLE block in portfolio catalogue
6. Products page (new section to build)

