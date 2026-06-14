# hardware-preferences.md
# ATLAS Hardware Preferences & Selection Rules
# Version: 2.0 | Last Updated: 2026-06-14

---

## Core Principles

1. **On-premises first** — never default to cloud; on-prem or private cloud only
2. **OEM hardware first** — always lead with OEM-branded compute, storage, and networking
3. **DLC default at scale** — Direct Liquid Cooling for ≥Tier 3; proprietary cooling stack, no external CDU required
4. **265kW racks** — standard high-density rack spec; no external CDU dependency
5. **Proprietary networking** — OEM NKC and switch stack preferred over third-party
6. **Modular datacenter** — offer MDC for greenfield, space-constrained, or speed-to-deploy requirements (14 months vs 30 months B&M)
7. **Right-size, don't over-spec** — match GPU count and memory to actual workload

---

## Compute — GPU Preferences

### By use case

| Use Case | Preferred GPU | Notes |
|---|---|---|
| Large-scale LLM inference (hub) | NVIDIA GB200 NVL72 / VR | 100 GPUs per 265kW rack; primary for TSAP hub |
| Training + inference (mixed) | NVIDIA B200 SXM | Spoke-level; balanced |
| Edge / field inference | NVIDIA L40S | Air-cooled; compact |
| Cost-sensitive inference | AMD MI325X | ~25-30% lower cost than GB200; secondary option |
| Sovereign / air-gapped | NVIDIA A100 80GB | Proven, available, manageable |

### CPU preferences (mandatory)

| Tier | CPU | Notes |
|---|---|---|
| Hub | AMD EPYC Genoa 9654P | Primary hub CPU |
| Spoke | AMD EPYC Turin 9565 | Spoke-level deployment |
| Edge | AMD EPYC Bergamo 9734 | Edge nodes |

**Rule:** CPUs are exclusively AMD EPYC. Do not spec Intel Xeon in any new ATLAS proposal without explicit customer requirement.

---

## Cooling

### DLC (Direct Liquid Cooling)
- Standard for all deployments with GB200 or B200
- OEM proprietary cooling stack — no external CDU required
- Closed-loop framing for sovereign / environmentally sensitive deployments
- Natural cooling opportunity: glacial river water (e.g. HAICE, Himachal Pradesh)
- For edge deployments: air-cooled acceptable (L40S class)

### Free cooling opportunity
Where ambient conditions allow (high altitude, cold climate, glacial water):
- State in proposals: "free cooling via [source], reducing PUE to 1.05-1.10"
- HAICE benchmark: glacial river water + hydel power = lowest TCO in Indian context

---

## Storage

| Tier | Storage Type | Notes |
|---|---|---|
| Hub | NVMe flash + object storage | High-speed for model weights; object for training data |
| Spoke | NVMe flash | Inference weight storage; local |
| Edge | Local NVMe | Minimal; model weights only |

---

## Networking

- **OEM NKC:** preferred for all intra-cluster networking
- **OEM switch:** preferred for rack-to-rack and spine-leaf fabric
- **MPLS/dark fibre:** for hub-spoke-edge connectivity in government deployments
- **No public internet:** sovereign deployments must be private network only
- **NKN:** do not use for hub-to-spoke in sovereign proposals (use MPLS/dark fibre)

---

## AI Models — Preferred Stack

| Layer | Preferred Model | Notes |
|---|---|---|
| Sovereign LLM (Indic) | Sarvam-2B | Indian sovereign model; Indic language support |
| Audio / ASR | Sarvam Whisper / ASR | For ATC, cockpit, Indian-language audio |
| Vision / Satellite | Prithvi-300M | IBM/NASA geospatial foundation model |
| SAR / Flood | Flood-SAR-FM 3B | Specialised SAR processing |
| Change detection | ChangeFormer-L | Multitemporal change detection |
| Object detection | YOLOv8 | Real-time detection; edge-capable |
| Document AI | Sarvam-2B + pgvector | RAG for AMM, regulatory docs |
| General LLM (non-sovereign) | gemini-3.5-flash / claude-sonnet-4-6 | For internal tool use only |

---

## Platform Software Stack (OEM)

- **AI Platform:** Data Fusion, RAG, model registry, APIs, gateways, guardrails, security, governance
- **HPC Middleware:** Job scheduler, cluster management, monitoring
- **Inference serving:** Triton Inference Server
- **Vector DB:** pgvector (in Supabase for ATLAS tools); Weaviate/Pinecone for production deployments

---

## BOM Sizing Rules

### TSAP / Hub-Spoke-Edge deployments
- GPU count: derived from RPS × avg_tokens_per_request ÷ benchmark_rps_at_1s (from `benchmark_results` table)
- Minimum hub: 4 racks (1,060 GPUs GB200 NVL72)
- Spoke: 1-2 racks per major site
- Edge: 1 node per field deployment

### DGCA / Sector-specific deployments
- Hub: National C3 (primary + DR site)
- Spoke: ~20 regional sites
- Edge: Airport/field units where applicable
- Primary GPU: GB200 NVL72/VR; alternative: AMD MI325X (25-30% lower cost)

### MDC vs B&M
- Default recommendation: MDC (faster deployment, lower civil cost, modular)
- B&M only if: >100MW, permanent flagship facility, customer preference
- MDC speed advantage: 14 months vs 30 months B&M — lead with this in proposals

---

## Pricing Reference (approximate, for ROM)

| Component | Unit | Approx cost |
|---|---|---|
| GB200 NVL72 rack (100 GPUs) | Per rack | Confidential — from tsap_unit_costs |
| AMD MI325X rack equivalent | Per rack | ~25-30% less than GB200 |
| MDC unit (265kW, 10 racks) | Per unit | Confidential — from tsap_unit_costs |
| OEM NKC switch | Per unit | Confidential — from tsap_unit_costs |

**All unit costs stored in `tsap_unit_costs` Supabase table (50 rows). Editable via Settings → TSAP Unit Costs. Never hardcode in proposals.**
