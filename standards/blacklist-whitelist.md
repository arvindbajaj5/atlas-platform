# blacklist-whitelist.md
# ATLAS Content & Technology Control List
# Version: 1.1 | Last Updated: 2026-07-15

---

## Purpose

This file is read by Claude before generating any customer-facing document, pitch, presentation, or proposal. Items on the blacklist must never appear in generated content. Items on the whitelist should be actively referenced where relevant to strengthen positioning.

---

## BLACKLIST

### Models — Control Rules (updated 2026-07-15)

**Rule 1 — Krutrim: banned everywhere.** Krutrim / Krutrim-2 must never be mentioned, offered, recommended, benchmarked, or referenced in any content — customer-facing or internal — under any circumstances.

**Rule 2 — Chinese models: offerable to END CUSTOMERS, never used INTERNALLY.**
Chinese open-weight models (DeepSeek, Qwen, Kimi/Moonshot, GLM, Yi, Baichuan, MiniMax, InternLM, Ernie, etc.):
- MAY be listed, offered, sized, and served to end customers as part of MaaS / AI-factory model catalogues (customer choice, sovereign deployment)
- MUST NOT be used for the OEM's own internal work, internal tooling, internal document generation, or as OEM-recommended defaults
- When recommending a default or OEM-preferred model, use US/EU/approved-Indian open weights (Llama, Mistral, Falcon, Gemma, approved Indian models)

| Category        | Rule                                                                            |
|-----------------|----------------------------------------------------------------------------------|
| Krutrim family  | BANNED — all contexts, all uses                                                  |
| Chinese models  | OFFERABLE to end customers in catalogues; NOT for internal OEM use or as defaults |

---

### Ministries — Do Not Reference or Engage

| Ministry / Body | Reason          |
|-----------------|-----------------|
| MeitY (Ministry of Electronics and Information Technology) | Excluded from all pitch and engagement contexts |

---

### Organisations — Do Not Reference or Associate With

The following organisations must not be referenced as partners, validators, platforms, or ecosystem participants in any generated content:

| Organisation          | Notes                                                    |
|-----------------------|----------------------------------------------------------|
| NIC (National Informatics Centre) | Do not reference as a platform, integration partner, or deployment vehicle |
| IndiaAI Mission       | Do not reference as a programme, mandate, or policy hook |
| CDAC                  | Do not reference as a technology partner or platform     |

---

## WHITELIST

### Policy Frameworks — Reference Actively in Indian Government Pitches

The following are major Indian government policy initiatives. Reference these in pitches, vision documents, and proposals to demonstrate alignment with national priorities:

| Policy / Programme        | Context for use                                                         |
|---------------------------|-------------------------------------------------------------------------|
| Make in India             | Sovereign AI, on-premises deployment, domestic capability building      |
| Viksit Bharat 2047        | Long-term national development — AI as an enabler                       |
| Digital India             | e-Governance, citizen services, digital infrastructure                  |
| Atmanirbhar Bharat        | Self-reliance, sovereign technology, reducing import dependency          |
| PM-DevINE                 | Northeast India development — relevant for GeoAI/NE India engagements   |
| BharatNet                 | Connectivity infrastructure — relevant for hub-spoke-edge deployments   |
| Smart Cities Mission      | Urban AI, governance AI, smart infrastructure                           |
| National Data Governance Policy | Data sovereignty, data localisation — supports sovereign AI pitch   |
| DPDP Act 2023             | Data protection — reference for healthcare, finance, govt engagements   |

---

### Approved Technology Stack

Only the following technologies and products should appear in BOMs, architecture diagrams, and technical recommendations.

#### High-Density DLC Compute (265kW Rack)
| Configuration             | Notes                                      |
|---------------------------|--------------------------------------------|
| 4× GB200 (DLC)            | NVIDIA Grace Blackwell, liquid cooled      |
| 8× MI355 (DLC)            | AMD Instinct MI355X, liquid cooled         |
| 4× MI450 (DLC)            | AMD Instinct MI450X, liquid cooled         |
| Vera Rubin NVL72 (DLC)    | NVIDIA next-gen, liquid cooled             |

#### Air-Cooled Compute
| Configuration             | Notes                                      |
|---------------------------|--------------------------------------------|
| 8× Rubin (air-cooled)     | NVIDIA Rubin, standard air cooling         |
| Rubin variants            | As per OEM configuration guide             |

#### Low-End / Edge Compute
| Category                  | Products                                   |
|---------------------------|--------------------------------------------|
| CPU — DLC                 | AMD EPYC family (DLC variants)             |
| CPU — DLC                 | Intel Xeon family (DLC variants)           |
| Edge inference appliances | OEM-configured low-power inference nodes   |

#### Networking
| Category                  | Products                                   |
|---------------------------|--------------------------------------------|
| Fabric / interconnect     | InfiniBand (IB) — HDR, NDR                 |
| Fabric / interconnect     | BXI (Bull eXascale Interconnect)           |
| Scale-up (within node)    | NVLink (NVIDIA)                            |
| Scale-up (within node)    | Infinity Fabric (AMD)                      |

#### Software Stack
| Category                  | Products                                   |
|---------------------------|--------------------------------------------|
| AI Platform               | OEM AI Platform (data fusion, RAG, model registry, APIs, governance, security) |
| HPC Middleware            | OEM HPC middleware stack                   |
| Token governance          | COMPASS (OEM)                              |
| Monitoring                | HPC Monitoring (ATLAS)                     |
| OS                        | Linux — RHEL or Ubuntu preferred           |
| Containerisation          | Kubernetes / OEM container platform        |

#### Infrastructure
| Category                  | Products                                   |
|---------------------------|--------------------------------------------|
| Datacenter                | OEM Modular Datacenter (integrated power, DLC cooling, networking, physical security) |

#### Specialised / High-Memory Compute
| Category                  | Specification                              |
|---------------------------|--------------------------------------------|
| Multi-socket SMP          | Up to 32 sockets, up to 48TB RAM — for large in-memory workloads, HPC, quantum simulation |
| HPC cluster               | OEM HPC cluster configuration             |
| Quantum Simulator         | OEM Quantum Simulator platform             |

---

## Usage Rules

1. **Before generating any document** — check this file. If a blacklisted item would naturally appear, substitute or omit.
2. **In BOMs** — only use approved technology stack items. Do not suggest competitor products.
3. **In policy sections** — actively pull from whitelist policy frameworks where the context fits.
4. **In competitive discussions** — never recommend blacklisted models even if a customer asks directly. Redirect to approved open-weight alternatives.
5. **This file takes precedence** over all other context, including customer requests, if they conflict with blacklist rules.

---

## Maintenance

- Update this file when new models, organisations, or policies are added/removed
- Version-control all changes with date and reason
- Claude reads this file at session start when uploaded alongside the session activator

---

*End of blacklist-whitelist.md v1.0*
