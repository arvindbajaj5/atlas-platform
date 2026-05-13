# architecture-tiers.md
# ATLAS Architecture Tiers
# Version: 1.0 | Last Updated: 2026-05-13

---

## Overview

ATLAS uses a four-tier architecture model to classify customer deployments by scale, topology, and sovereign requirements. Every opportunity, sizing output, and BOM maps to one of these tiers. Tiers are not rigid — hybrid and transitional configurations exist — but the classification drives hardware selection, software stack, and commercial sizing.

---

## Tier Definitions

### Tier 1 — Edge Inference Node
**Profile:** Single-site, lightweight, air-gapped or bandwidth-constrained  
**Topology:** Standalone appliance or 1–2 server nodes  
**Use Cases:** Border surveillance, mobile command posts, remote sensing stations, field deployments  
**GPU Count:** 1–4 GPUs  
**Storage:** Local NVMe, no shared fabric  
**Networking:** Standalone or limited LAN  
**Software Stack:** Inference runtime only; no full AI platform  
**Typical Deal Size:** S–M  
**Sovereign Fit:** Very High (air-gapped by design)

---

### Tier 2 — Departmental AI Cluster
**Profile:** Single organisation, single site, moderate workload  
**Topology:** 4–16 server nodes, shared storage, basic networking  
**Use Cases:** Departmental RAG, model fine-tuning, pilot-scale inferencing, PoC labs  
**GPU Count:** 8–64 GPUs  
**Storage:** Shared NVMe-oF or SAN, 100TB–500TB usable  
**Networking:** 100GbE, single switch tier  
**Software Stack:** AI platform (RAG, model registry, basic governance), HPC middleware  
**Typical Deal Size:** M–L  
**Sovereign Fit:** High (on-prem, single tenant)

---

### Tier 3 — Enterprise AI Factory
**Profile:** Multi-department or multi-site, production-grade, high availability  
**Topology:** 16–64 nodes, DLC cooling, full fabric networking, modular datacenter optional  
**Use Cases:** Enterprise inferencing factory, geospatial AI platform, C3 systems, national analytics  
**GPU Count:** 64–512 GPUs  
**Storage:** All-flash, tiered storage, 500TB–5PB usable  
**Networking:** 400GbE / InfiniBand HDR, spine-leaf fabric  
**Software Stack:** Full AI platform (data fusion, RAG, model registry, APIs, governance, security), HPC middleware, COMPASS governance  
**Cooling:** DLC (Direct Liquid Cooling) with proprietary cooling stack  
**Typical Deal Size:** L–XL  
**Sovereign Fit:** High (on-prem, HA, national control)

---

### Tier 4 — Sovereign AI Hub (Hub-Spoke-Edge)
**Profile:** National or strategic programme, multi-site, hub-spoke-edge topology  
**Topology:** Central hub (Tier 3+), regional spoke nodes (Tier 2), edge nodes (Tier 1)  
**Use Cases:** National AI infrastructure, Ministry-level platforms, defence C4ISR, geospatial CoE, sovereign cloud  
**GPU Count:** 512+ GPUs at hub; spokes and edges additive  
**Storage:** Distributed, federated, geo-redundant; multi-PB at hub  
**Networking:** Dark fibre / MPLS inter-site; 400GbE+ at hub  
**Software Stack:** Full platform + COMPASS token governance + AI Sovereignty Index monitoring + federated RAG + multi-domain security  
**Cooling:** Modular datacenter with DLC, proprietary networking stack  
**Typical Deal Size:** XL  
**Sovereign Fit:** Maximum (designed for sovereign, classified, national-scale)

---

## Topology Reference

```
TIER 4 — HUB-SPOKE-EDGE

        ┌─────────────────────────────┐
        │     SOVEREIGN AI HUB        │  Tier 3+ hardware
        │  Full platform + COMPASS    │  DLC, high-density
        │  Federated RAG + Governance │  400GbE / IB fabric
        └──────────┬──────────────────┘
                   │ Dark fibre / MPLS
        ┌──────────┼──────────┐
        │          │          │
   ┌────┴───┐ ┌────┴───┐ ┌────┴───┐
   │ SPOKE  │ │ SPOKE  │ │ SPOKE  │  Tier 2 clusters
   │Regional│ │Regional│ │Regional│  Local inference
   └────┬───┘ └────────┘ └────┬───┘  + data aggregation
        │                     │
   ┌────┴───┐            ┌────┴───┐
   │  EDGE  │            │  EDGE  │  Tier 1 nodes
   │ Remote │            │ Remote │  Air-gapped optional
   └────────┘            └────────┘
```

---

## Deployment Preferences

| Preference         | Rule                                                                 |
|--------------------|----------------------------------------------------------------------|
| On-premises first  | Always default to on-prem; do not propose cloud unless explicitly required |
| No public cloud    | Avoid AWS/Azure/GCP as primary; private cloud / on-prem hyperscale only |
| DLC default        | Recommend DLC cooling for Tier 3 and above                          |
| Proprietary stack  | Use OEM proprietary cooling and networking stacks where available    |
| Modular DC         | Offer modular datacenter for greenfield or space-constrained sites   |

---

## Tier-to-Tool Mapping

| Tool                    | Relevant Tiers     |
|-------------------------|--------------------|
| AI Inferencing Factory  | All tiers          |
| Domain Configurator     | All tiers          |
| Deal Analysis Tool      | All tiers          |
| COMPASS                 | Tier 3, Tier 4     |
| AI Sovereignty Index    | Tier 3, Tier 4     |
| GeoAI Civilian          | Tier 2, 3, 4       |
| GeoAI Military          | Tier 1, 3, 4       |
| HPC Monitoring          | Tier 2, 3, 4       |

---

## AMC / Service Tiers

| Tier        | AMC Coverage                                         |
|-------------|------------------------------------------------------|
| Standard    | 8×5 support, next business day parts, remote assist  |
| Enhanced    | 24×7 support, 4-hour response, on-site engineers     |
| Mission Critical | 24×7 NOC, <2hr response, dedicated TAM, SLA penalties |

AMC phase follows delivery; typical AMC duration 3–5 years. AMC revenue recognised on a straight-line basis per IFRS 15.
