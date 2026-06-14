# project-definition-schema.md
# ATLAS Engagement & Docket Data Schema
# Version: 2.0 | Last Updated: 2026-06-14

---

## Overview

This file defines the canonical data schema for ATLAS engagements and dockets. As of v2.0, ATLAS has moved from a JSON-file-based Project Definition File (PDF) to a fully Supabase-backed engagement model. This schema is the source of truth for all tools.

---

## Core Tables

### `customers`
The organisation entity — one row per customer.

| Column | Type | Notes |
|---|---|---|
| id | text PK | e.g. `CUST-1234567890` |
| name | text | Full organisation name |
| type | text | `state_govt`, `central_govt`, `defence`, `enterprise`, `csp`, `ai_lab`, `other` |
| location | text | e.g. "Shimla, India" |
| primary_contact | text | Name/role of primary contact |
| created_at | timestamptz | |

---

### `engagements`
One row per customer engagement. Merges old `engagement_dockets` concept.

| Column | Type | Notes |
|---|---|---|
| id | text PK | e.g. `ENG-2026-GEN-1995` |
| name | text | Engagement name |
| customer_id | text FK | → customers.id |
| type | text | `tsap`, `vertical`, `enterprise`, `csp`, `generic` |
| status | text | `active`, `paused`, `won`, `lost` |
| stage | text | `intelligence`, `engagement`, `presales_hl`, `presales_dl`, `sales`, `ops` |
| owner | text | Person name or role |
| opened_at | timestamptz | |
| updated_at | timestamptz | |
| docket_id | text | Direct pointer to engagement_dockets.id (added June 2026) |
| cover_note | text | One-para summary of engagement objective |
| version | int | Incremented on significant updates |
| last_reviewed_at | timestamptz | Last time docket was reviewed |

**Engagement type drives downstream tool behaviour:**
- `tsap` → SASC full flow, TSAP FM, Territory Profiler
- `csp`/`enterprise`/`vertical` → SASC with different UC filter and BOM framing
- Engagement type set at creation, can be updated

---

### `engagement_dockets`
Bridge table (kept for backward compatibility). New records use `engagements.docket_id` directly.

| Column | Type | Notes |
|---|---|---|
| id | text PK | e.g. `DOC-1780485370268` |
| engagement_id | text FK | → engagements.id |
| created_at | timestamptz | |

---

### `docket_items`
Everything inside a docket — all sections, all item types. **Pointer-based: stores refs, not data.**

| Column | Type | Notes |
|---|---|---|
| id | text PK | e.g. `DI-20260603-5822` |
| docket_id | text FK | → engagement_dockets.id |
| section | text | `profile`, `strategy`, `uc`, `action`, `output`, `note`, `agreement` |
| item_type | text | Fine-grained type (see below) |
| title | text | Display label |
| content | jsonb | Lightweight metadata only (not the source data) |
| ref_table | text | Pointer: source table name (nullable) |
| ref_id | text | Pointer: source row id (nullable) |
| status | text | Section-specific status (see below) |
| assigned_to | text | Owner name/role (for action items) |
| due_date | date | (for action items) |
| notes | text | Additional context or strategy text |
| created_by | text | |
| created_at | timestamptz | |
| sort_order | int | Display ordering within section |

**Section × item_type mapping:**

| section | item_type | ref_table | ref_id | status values |
|---|---|---|---|---|
| uc | use_case | uc_library | uc_library.id | proposed, agreed, scratched |
| action | action | null | null | open, done, blocked |
| output | solution | null | null | pending, done |
| output | pei | pei_cache | pei_cache.id | pending, done |
| output | tsap_fm | null | null | pending, done |
| output | exec_doc | null | null | pending, done |
| output | intel | intelligence_items | intelligence_items.id | pending |
| strategy | position | null | null | active |
| strategy | pitch | null | null | active |
| strategy | watch | null | null | active |
| note | note | null | null | active |
| agreement | agreement | null | null | active |

**Key principle:** `docket_items` stores a pointer (`ref_table` + `ref_id`) to the source data. It never duplicates the source data. The actual UC description lives in `uc_library`. The actual PEI brief lives in `pei_cache`. The docket item just says "this engagement references this row in that table."

---

## UC Library Schema

### `uc_library`
Master catalogue of all use cases. 69 active rows as of June 2026.

| Column | Type | Notes |
|---|---|---|
| id | text PK | e.g. `geo-uc-001`, `avi-ac-01`, `avi-cr-01` |
| uc_name | text | Display name |
| cluster | text | Domain grouping (Agriculture, Water, Aircraft Safety, etc.) |
| domain_codes | jsonb | Array: `["GEO-SPA","GOV-GOV"]` etc. |
| market_codes | jsonb | Array: `["state_govt","central_govt"]` etc. |
| portfolio_codes | jsonb | OEM products needed |
| source | text | `manual`, `imported`, `intel_suggestion` |
| source_engagement | text | `NE_INDIA_GEOAI`, `DGCA_2026`, etc. |
| status | text | `suggested`, `pending`, `active`, `rejected`, `deprecated` |
| description | text | Technical description / notes |
| problem_statement | text | |
| benefit | text | |
| process_steps | jsonb | |
| key_actors | jsonb | |
| regulatory | text | |
| data_requirements | text | |
| technical_requirements | text | |
| model_type | text | `nlp`, `computer_vision`, `risk_scoring`, etc. |
| ai_model | text | e.g. `Prithvi-300M`, `Sarvam-2B`, `YOLOv8` |
| hardware_profile | text | e.g. `Hub GPU — GB200 NVL72` |
| deployment_tier | text | `hub`, `spoke`, `edge`, `hub_spoke`, `all` |
| maturity | text | `concept`, `piloted`, `proven`, `production` |
| complexity | text | `simple`, `medium`, `complex`, `research` |
| priority | int | 1–5 |
| processing_type | text | `batch`, `realtime`, `hybrid`, `rag` |
| tags | jsonb | |
| suggested_by | text | `second_brain`, `intel_scraper`, `manual` |
| suggested_from | text | → intelligence_items.id (if auto-suggested) |
| approved_by | text | Who approved |
| approved_at | timestamptz | |
| rejection_reason | text | |
| created_at | timestamptz | |
| created_by | text | |
| updated_at | timestamptz | |

**Status flow:**
```
intel signal → suggested → (user reviews) → active | rejected
manual entry → active (directly)
```

**Only `status='active'` UCs appear in:**
- SASC UC selector
- Engagement docket UC section
- UC modals across all tools

**UC counts by cluster (June 2026):**
- Agriculture & Food Security: 8
- Water Resources & Hydrology: 8
- Emergency Management & Disaster Response: 9
- Natural Resources & Environment: 7
- Climate & Carbon Intelligence: 1
- Renewable Energy Site Assessment: 1
- Urban Planning & Smart Cities: 6
- Aircraft Safety (DGCA): 15
- Crew Safety (DGCA): 15
- **Total: 69**

---

## Exchange Rate Schema

### `app_config` (FX entries)

| key | value | notes |
|---|---|---|
| fx_usd_inr | 95.76 | USD to INR (updated June 2026) |
| fx_usd_eur | 0.865 | USD to EUR |
| fx_eur_inr | 110.70 | EUR to INR |
| fx_updated_at | 2026-06-12 | Date rates were last updated |
| currency_primary | INR | Customer-facing currency |
| currency_procurement | USD | Cost side |
| currency_reporting | EUR | Internal P&L |

### `exchange_rate_history`

| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| currency_pair | text | `USD_INR`, `USD_EUR`, `EUR_INR` |
| rate | numeric(12,6) | |
| effective_date | date | UNIQUE per currency_pair |
| source | text | `manual`, `frankfurter_api`, `rbi`, `ecb` |
| notes | text | |
| created_at | timestamptz | |

**UNIQUE constraint:** `(currency_pair, effective_date)` — one rate per pair per day.
**Live fetch:** SASC and TSAP FM try `frankfurter.app` on load. On success, saves to `app_config` and appends to `exchange_rate_history`.

---

## Intelligence Schema (summary)

### `intelligence_items` — 38 columns, 299 rows (as of May 2026)

Key fields for docket and Second Brain integration:

| Column | Notes |
|---|---|
| id | text PK |
| domain_code | `GOV-GOV`, `DEF-MIL`, `GEO-SPA`, etc. |
| title | Article title |
| summary | AI-generated summary |
| intelligence_value | `high`, `medium`, `low` |
| opportunity | Opportunity text (pre-fills UC suggestion) |
| organisations | jsonb array |
| tags | jsonb array |
| source_type | `scraped`, `rss`, `manual`, `test` |
| is_real | boolean (false for test data) |
| scraped_by | `background_scraper`, `portal_scraper`, `test-master-v1` |
| content_hash | Deduplication fingerprint |

**Test data markers:** `source_type='test'`, `is_real=false`, `scraped_by LIKE 'test-%'`. Safe to wipe with single DELETE.

---

## Session Activation Checklist

At the start of any ATLAS session, confirm:

```
1. Which engagement is being worked on? → Load customer + engagement from Supabase
2. What stage is the engagement at? → Drives which tools to use
3. Any pending docket items? → Load docket_items for context
4. FX rates current? → Check fx_updated_at in app_config
5. Supabase connected? → Check atlas_global_cfg in localStorage
```

**Files to check on GitHub for current state:**
- `standards/claude-session-activator.md` — session history + decisions log
- `standards/tool-features.md` (this file's companion) — tool status
- `standards/test-data/intelligence_items_master.json` — test dataset
