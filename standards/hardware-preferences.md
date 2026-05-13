# hardware-preferences.md
# ATLAS Hardware Preferences & Selection Rules
# Version: 1.0 | Last Updated: 2026-05-13

---

## Overview

This file defines the OEM's hardware selection preferences, recommended configurations, and sizing rules used across ATLAS tools — primarily the AI Inferencing Factory, Domain Configurator, and Deal Analysis Tool. All BOM outputs should default to these preferences unless the customer has stated a specific requirement to the contrary.

---

## Core Principles

1. **On-premises first** — never default to cloud; on-prem or private cloud only
2. **OEM hardware first** — always lead with OEM-branded compute, storage, and networking before third-party alternatives
3. **DLC default at scale** — recommend Direct Liquid Cooling for Tier 3 and above
4. **Proprietary networking stack** — use OEM networking and fabric where available
5. **Modular datacenter** — offer as an option for greenfield or space-constrained deployments
6. **Right-size, don't over-spec** — match GPU count and memory to actual workload; avoid over-provisioning in proposals

---

## Compute — GPU Preferences

### Preferred GPU Tiers

| Use Case                        | Preferred GPU Class         | Notes                                              |
|---------------------------------|-----------------------------|----------------------------------------------------|
| Inference only (small models)   | Mid-range inference GPU     | Cost-optimised; e.g. L-class or equivalent         |
| Inference (large models, LLMs)  | High-memory inference GPU   | 80GB+ VRAM; e.g. H-class or equivalent             |
| Training / fine-tuning          | High-performance training GPU | NVLink / NVSwitch fabric preferred               |
| Edge / air-gapped               | Low-power inference appliance | Ruggedised option where required                 |
| Geospatial / EO processing      | High-memory GPU + CPU balance | GPU for model inference; CPU for pre/post-processing |
| C3 / Defence                    | Ruggedised or COTS-hardened  | Air-gapped; certified for classified environments |

### GPU Memory Sizing Rule
- **<7B parameter models:** 16–24GB VRAM per GPU sufficient
- **7B–13B models:** 40GB VRAM recommended
- **13B–70B models:** 80GB VRAM; multi-GPU required for larger end
- **70B+ / MoE models:** Multi-node NVLink or tensor parallel; 8×80GB minimum per node
- **Always add 20% headroom** on VRAM for KV cache and batch overhead

---

## Compute — CPU & Server Preferences

- **Preferred:** Dual-socket high-core-count server (64+ cores total)
- **Memory:** Minimum 512GB RAM per node for AI workloads; 1TB+ for large model serving
- **Storage (local):** NVMe SSDs for model weights and hot data; minimum 4TB per node
- **Form factor:** 1U/2U rackmount standard; 4U for high-GPU-density nodes
- **Modular chassis:** Preferred for Tier 3/4 density requirements

---

## Storage Preferences

| Tier       | Recommended Storage Architecture              | Capacity Guide         |
|------------|-----------------------------------------------|------------------------|
| Tier 1     | Local NVMe only                               | 4–16TB                 |
| Tier 2     | Shared NVMe-oF or entry SAN                   | 100TB–500TB usable     |
| Tier 3     | All-flash array, tiered (NVMe + SAS/SATA)     | 500TB–5PB usable       |
| Tier 4     | Distributed, federated, geo-redundant         | Multi-PB; design per programme |

- **Data lake / object storage:** Required for RAG pipelines and EO data; S3-compatible preferred
- **Backup:** Immutable backup for model registry and governance data
- **Encryption:** At-rest encryption mandatory for sovereign and defence deployments

---

## Networking Preferences

| Tier       | Recommended Fabric                            | Notes                          |
|------------|-----------------------------------------------|--------------------------------|
| Tier 1     | Standard 10/25GbE LAN or standalone           | —                              |
| Tier 2     | 100GbE, single-tier switching                 | OEM switching preferred        |
| Tier 3     | 400GbE spine-leaf or InfiniBand HDR/NDR       | OEM proprietary stack          |
| Tier 4     | 400GbE+ at hub; dark fibre / MPLS inter-site  | OEM fabric + WAN integration   |

- **GPU-to-GPU fabric:** NVLink within node; InfiniBand or RoCE between nodes for training workloads
- **Management network:** Dedicated OOB management network for all Tier 2+ deployments
- **Air-gap:** Physical network separation required for classified / sovereign deployments

---

## Cooling Preferences

| Tier       | Cooling Method                        | Notes                                      |
|------------|---------------------------------------|--------------------------------------------|
| Tier 1     | Air cooling (standard)                | Appliance form factor                      |
| Tier 2     | Air cooling or rear-door heat exchanger | Rack density dependent                   |
| Tier 3     | **DLC (Direct Liquid Cooling)**       | OEM proprietary DLC stack; default choice  |
| Tier 4     | DLC + facility chilled water loop     | Modular datacenter option available        |

- DLC reduces PUE significantly vs air; use in customer business case
- Modular datacenter with integrated DLC available for greenfield sites

---

## Modular Datacenter

- Offer as an option for: greenfield sites, space-constrained locations, rapid deployment requirements, remote / austere environments
- Includes: integrated power, cooling (DLC), networking, physical security
- Lead time: typically longer than standard server delivery — flag in project milestones
- Relevant for: Tier 3 and Tier 4 deployments; defence / border / remote sites

---

## Software Stack Preferences

| Layer                  | Preferred Component                        |
|------------------------|--------------------------------------------|
| AI Platform            | OEM AI Platform (data fusion, RAG, model registry, APIs, governance, security) |
| HPC Middleware         | OEM HPC middleware stack                   |
| Inference Runtime      | OEM-optimised runtime; TensorRT or equivalent |
| Governance             | COMPASS (token governance, workload scheduling) |
| Monitoring             | HPC Monitoring dashboard (ATLAS)           |
| OS                     | Linux (RHEL / Ubuntu preferred)            |
| Containerisation       | Kubernetes / OEM container platform        |
| Security               | OEM security stack; CERT-In compliant for India deployments |

---

## BOM Line Item Conventions

Used in AI Inferencing Factory and Deal Analysis Tool:

| Category       | Line Item Examples                                         |
|----------------|------------------------------------------------------------|
| Compute        | GPU servers, CPU-only nodes, edge appliances               |
| Storage        | All-flash array, NVMe-oF fabric, object storage nodes      |
| Networking     | Top-of-rack switches, spine switches, InfiniBand adapters  |
| Cooling        | DLC units, rear-door HEX, facility integration             |
| Modular DC     | Container/module, integrated power and cooling             |
| Software       | AI Platform licence, HPC middleware, COMPASS, monitoring   |
| Professional Services | Implementation, integration, training, commissioning |
| AMC            | Hardware AMC, software support, NOC services               |

---

## Currency & Sizing Defaults

- **Default deal currency:** USD (switchable to INR, EUR, GBP, AED, SGD in tools)
- **T-shirt sizing thresholds (USD):**
  - S: < $0.5M
  - M: $0.5M – $3M
  - L: $3M – $12M
  - XL: > $12M
- **INR equivalents:**
  - S: < ₹5Cr | M: ₹5–25Cr | L: ₹25–100Cr | XL: > ₹100Cr

---

## Key Constraints & Flags

- **No cloud default** — if a customer mentions AWS/Azure/GCP, redirect to private cloud / on-prem equivalent
- **No NVIDIA-only lock-in messaging** — refer to GPU class/tier, not brand, in customer documents unless customer has specified
- **Defence/classified** — always flag air-gap, physical security, and clearance requirements separately
- **Import/customs** — for India government deals, flag customs duty, BCD, and GeM procurement requirements in commercial model
