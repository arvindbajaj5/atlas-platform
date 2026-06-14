# architecture-tiers.md
# ATLAS Architecture Tiers & Deployment Patterns
# Version: 2.0 | Last Updated: 2026-06-14

---

## Overview

ATLAS uses a four-tier architecture model for infrastructure classification, plus a separate engagement type model that drives tool behaviour. Every BOM, SASC configuration, and proposal maps to one of these tiers.

---

## Infrastructure Tiers

### Tier 1 — Edge Inference Node
**Profile:** Single-site, lightweight, air-gapped or bandwidth-constrained
**Topology:** Standalone appliance or 1–4 server nodes
**GPU Count:** 1–8 GPUs (L40S class)
**Use Cases:** Border surveillance, mobile command posts, remote sensing stations, airport/field units
**Storage:** Local NVMe only
**Networking:** Standalone or limited LAN; no fabric
**Software Stack:** Inference runtime only (Triton); no full AI platform
**Cooling:** Air-cooled
**Typical deal size:** S
**Sovereign fit:** Very High (air-gapped by design)
**MDC option:** No (too small; rack-mount appliance only)

---

### Tier 2 — Departmental AI Cluster
**Profile:** Single organisation, single site, moderate workload
**Topology:** 4–16 server nodes, shared NVMe storage, OEM networking
**GPU Count:** 16–64 GPUs (B200 SXM or A100)
**Use Cases:** Departmental RAG, document AI, analytics, moderate inference
**Storage:** Shared NVMe flash; object storage for datasets
**Networking:** OEM NKC; single spine-leaf
**Software Stack:** Full AI platform (RAG, model registry, APIs, guardrails)
**Cooling:** DLC preferred; air-cooled acceptable at lower density
**Typical deal size:** M
**Sovereign fit:** High (single site, network-isolated)
**MDC option:** Yes — single MDC module

---

### Tier 3 — Multi-Purpose AI Factory (Spoke)
**Profile:** State or regional AI hub; multi-department; moderate-to-high workload
**Topology:** 2–8 racks, OEM fabric, DLC, shared storage cluster
**GPU Count:** 200–800 GPUs (GB200 NVL72 or B200)
**Use Cases:** Multi-domain inference, training (fine-tuning), analytics, satellite imagery processing
**Storage:** NVMe flash + object storage + backup
**Networking:** OEM NKC + switch; MPLS/dark fibre to hub
**Software Stack:** Full AI platform + HPC middleware
**Cooling:** DLC (OEM proprietary stack, no external CDU)
**Typical deal size:** L–XL
**Sovereign fit:** High
**MDC option:** Yes — 1–2 MDC units recommended for speed

---

### Tier 4 — Purpose-Built Hub (National / Territory AI Centre)
**Profile:** National or territory-level sovereign AI centre; flagship; multi-site programme anchor
**Topology:** 10–100+ racks; hub-spoke-edge architecture; DR site required
**GPU Count:** 1,000–10,000+ GPUs (GB200 NVL72/VR at hub)
**Use Cases:** All use cases; training hub for national models; federated learning aggregator
**Storage:** Petabyte-scale object + NVMe; geo-replicated to DR
**Networking:** OEM fabric; dedicated dark fibre / MPLS; private network only (no NKN, no public internet)
**Software Stack:** Full AI platform + HPC middleware + Data Science team
**Cooling:** DLC + free cooling where available (glacial water, ambient air)
**Typical deal size:** XL–XXL
**Sovereign fit:** Maximum (private network, on-prem, sovereign data)
**MDC option:** Yes — MDC strongly preferred for speed (14mo vs 30mo B&M)

---

## Hub-Spoke-Edge Pattern

For TSAP and large sector deployments, the standard reference architecture is:

```
                    ┌─────────────────────┐
                    │   National Hub       │  ← Tier 4
                    │   (Primary DC)       │     GB200 NVL72
                    │   + DR Site          │     Full AI Platform
                    └──────────┬──────────┘
                               │  MPLS / Dark Fibre
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
        │  Spoke 1  │   │  Spoke 2  │   │  Spoke N  │  ← Tier 3
        │ (State/   │   │ (Regional │   │           │     B200 SXM
        │  Region)  │   │  Centre)  │   │           │
        └─────┬─────┘   └───────────┘   └───────────┘
              │  LAN / dedicated link
         ┌────┴────┐
         │ Edge 1  │  ← Tier 1
         │(Field / │     L40S or
         │Airport) │     appliance
         └─────────┘
```

### TSAP reference: NE India GeoAI
- Hub: National Geospatial AI Centre (primary + DR)
- Spokes: 8 state capitals across NE India
- Edges: District disaster management units, forest ranger stations

### TSAP reference: HAICE (Himachal Pradesh)
- Hub: Single site (Bilaspur / Kangra / Kullu — site TBD)
- Spokes: District HQ sites (5–7)
- Edges: PHC health units, mountain rescue posts
- Differentiator: Glacial river cooling + hydel power

### Sector reference: DGCA Aviation Safety
- Hub: National C3 in Delhi (primary); DR in Hyderabad
- Spokes: ~20 airports / regional centres (MPLS/dark fibre)
- Edges: Airport-level units (L40S class, air-gapped)
- Network: Private MPLS/dark fibre only (no NKN, no public internet)

---

## Engagement Types → Architecture Mapping

| Engagement Type | Architecture | Hub tier | Spoke tier | Edge |
|---|---|---|---|---|
| TSAP | Hub-Spoke-Edge | Tier 4 | Tier 3 | Tier 1 |
| Domain Vertical (e.g. DGCA) | Hub-Spoke | Tier 4 | Tier 3 | Tier 1 (airport) |
| CSP / Inferencing Provider | Single-site or Hub-Spoke | Tier 4 | Optional | No |
| Enterprise AI | Single-site | Tier 2–3 | No | No |
| AI Lab / Research | Single-site | Tier 3–4 | No | No |
| Generic | Single-site | Tier 2–3 | No | No |

---

## Site Selection Criteria (TSAP)

Evaluated using a weighted matrix across 5 factors:

| Factor | Weight | Notes |
|---|---|---|
| Connectivity (fibre, MPLS) | 25% | Must have or be buildable |
| Power (hydel, solar, grid) | 25% | Renewable preferred; cost matters |
| Cooling potential | 20% | Natural cooling = major advantage |
| Land and civil cost | 15% | Government land preferred |
| Seismic / disaster risk | 15% | Zone IV/V = additional cost |

HAICE site matrix: Kangra, Bilaspur, Kullu, Chamba, Una evaluated on these 5 factors.

---

## Sovereign Requirements Checklist

For all TSAP and sector sovereign deployments:

```
Infrastructure:
  ☐ On-premises hardware only (no cloud dependency)
  ☐ Private network (MPLS/dark fibre, no public internet path)
  ☐ Data residency within India
  ☐ No NKN dependency for classified/sensitive data
  ☐ DR site geographically separated (≥500km)

Software:
  ☐ Air-gapped inference capability (no internet required at runtime)
  ☐ Sarvam-2B or equivalent Indian sovereign model
  ☐ On-prem vector DB (pgvector or equivalent)
  ☐ Full audit trail for all AI decisions

Operations:
  ☐ 24x7 support SLA from OEM India team
  ☐ Trained in-country ops team
  ☐ Local spares holding (critical components)
  ☐ Technology transfer component (for government programmes)
```

---

## DC Infrastructure Quick Reference

| Parameter | MDC (Modular) | B&M |
|---|---|---|
| Deployment time | 14 months | 30 months |
| Power density | Up to 265kW/rack | Up to 265kW/rack |
| Civil requirement | Minimal (pad + utilities) | Full building |
| Relocatable | Yes | No |
| Cooling | OEM DLC (no external CDU) | DLC or air |
| Cost | Lower (civil savings) | Higher civil cost |
| Recommended for | Greenfield, speed-sensitive, pilot | Flagship, permanent, >10yr |
