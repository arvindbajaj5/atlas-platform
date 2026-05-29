# ATLAS Domain Taxonomy v1.1
# Locked: 2026-05-29

## Coding Convention
Format: `CLS-DMN` (3-letter cluster + 3-letter domain)
- Defence sub-domains share `DEF` cluster prefix
- Geospatial is a standalone civilian domain `GEO-SPA`
- News/Market topics use `MKT` cluster prefix

---

## Intelligence Domains (17 total)

| Code | Domain | Notes |
|---|---|---|
| GOV-GOV | Government & Governance | Central/state govt AI, e-governance, citizen services, digital India |
| DEF-MIL | Defence — Armed Forces | Indian Army, Navy, Air Force, DPSUs, DRDO combat systems |
| DEF-SPC | Defence — Space & Satellite | ISRO, IN-SPACe, DSA, military satellite building and ops |
| DEF-HLS | Defence — Homeland Security | BSF, CRPF, paramilitary, border security, critical infrastructure protection |
| DEF-INT | Defence — Intelligence & Signals | SIGINT, IMINT, cryptanalysis, intelligence agencies |
| GEO-SPA | Geospatial & Earth Observation | NRSC, Survey of India, Pixxel, civilian EO, GIS platforms, Bhuvan |
| INF-CIV | Critical Infrastructure | Ports, airports, railways, civil aviation, DGCA, AAI |
| RES-NAT | Natural Resources | Oil & gas, mines, water resources, ONGC, Coal India, forestry |
| TEL-NET | Telecom & Networks | Jio, Airtel, BSNL, C-DOT, DoT, 5G AI, network optimisation |
| TEC-GEN | Technology | IT services, cloud, tech companies, AI platforms, SaaS |
| MED-BRD | Media & Broadcast | OTT, news, broadcast, content AI, Prasar Bharati, NDTV |
| FIN-BFS | Banking & Financial Services | PSBs, private banks, RBI, SEBI, insurance, fintech, payments |
| MFG-IND | Manufacturing & Industry | Industry 4.0, MSME, automotive, aerospace, SAMARTH Udyog |
| ENR-UTL | Energy & Utilities | Power grids, renewables, NTPC, PGCIL, smart grid, solar |
| REG-AIP | Regional AI Programmes | State CoEs, IndiaAI Mission, AI Cities, regional compute hubs |
| LAB-AIR | AI Labs & Research | IITs, DRDO labs, private AI research, IISER, startups |
| HLT-LIF | Healthcare & Life Sciences | AIIMS, diagnostic AI, pharma, hospital tech, genomics |

### Defence Umbrella
`DEF` is a display grouping — 4 sub-domains scraped individually.
Second Brain shows sub-domain items individually + aggregated view under DEF.

### Geospatial Note
`GEO-SPA` = civilian geospatial platform market (NRSC, Survey of India, commercial EO).
Defence geospatial use cases tagged to `DEF-MIL`, `DEF-INT`, `DEF-HLS` as appropriate.
Governance geospatial tagged to `GOV-GOV` or `INF-CIV`.

---

## Market News Topic Codes (5 topics)

| Code | Topic | Focus |
|---|---|---|
| MKT-HPC | AI & HPC in India | Market developments, investments, deployments |
| MKT-COM | Competitor & Vendor Activity | NVIDIA, AMD, HPE, Dell, Atos — India wins |
| MKT-TND | Government AI Tenders | RFPs, GeM tenders, procurement signals |
| MKT-DEF | Defence Technology News | Military AI, DRDO, DPSUs, defence tech |
| MKT-SOV | Sovereign AI & Policy | Data localisation, on-premise mandates, DPDP, policy |

---

## Intelligence Streams (per item)

| Stream | Description |
|---|---|
| market_pulse | India/APAC market — tenders, contracts, vendor wins, budget signals |
| domain_intel | Global use cases, AI architectures, proven deployments, patterns |
| tech_watch | Emerging capabilities, new model types, infrastructure shifts |

---

## Total Scraping Targets
- 17 domain codes (DEF counts as 4 separate scrapes)
- 5 MKT news codes
- 22 total targets per scraping run

*End of Domain Taxonomy v1.1*
