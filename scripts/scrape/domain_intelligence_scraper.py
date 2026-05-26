#!/usr/bin/env python3
"""
ATLAS Intelligence Engine — Domain Intelligence Scraper
Runs on GitHub Actions weekly.
Scrapes domain intelligence for all 10 sectors using Gemini 3.5 Flash with grounding.
Incremental — only runs if last scrape was more than 6 days ago.
"""

import os
import json
import datetime
import requests
import sys

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OUTPUT_DIR     = "data/raw/domain_intelligence"
METADATA_FILE  = "data/raw/domain_intelligence/metadata.json"
MODEL          = "gemini-3.5-flash"
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}"
MIN_DAYS_BETWEEN_RUNS = 6

DOMAINS = [
    {"code": "DEF", "name": "Defence & Armed Forces",        "focus": "Indian defence AI, military technology, DRDO, DPSUs, defence procurement"},
    {"code": "GEO", "name": "Geospatial & Earth Observation","focus": "satellite imagery AI, ISRO, remote sensing, GIS platforms, geospatial analytics India"},
    {"code": "GOV", "name": "Governance & e-Governance",     "focus": "Indian government AI adoption, digital India, e-governance, citizen services AI"},
    {"code": "HLT", "name": "Health & Life Sciences",        "focus": "healthcare AI India, diagnostic AI, hospital tech, pharma AI"},
    {"code": "ENR", "name": "Energy & Utilities",            "focus": "energy sector AI India, smart grid, renewable energy tech, oil & gas AI"},
    {"code": "TEL", "name": "Telecom & Networks",            "focus": "telecom AI India, 5G AI, network optimisation, BSNL BSNL Airtel Jio AI"},
    {"code": "FIN", "name": "BFSI & Financial Services",     "focus": "banking AI India, fintech AI, RBI regulation AI, fraud detection"},
    {"code": "MFG", "name": "Manufacturing & Industry",      "focus": "manufacturing AI India, Industry 4.0, predictive maintenance, MSME AI"},
    {"code": "TER", "name": "Territory / State CoE",         "focus": "state government AI centres India, sovereign AI platforms, AI CoE programmes"},
    {"code": "HLS", "name": "Homeland Security",             "focus": "border security AI India, surveillance technology, paramilitary AI, critical infrastructure"},
]

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE) as f:
            return json.load(f)
    return {}

def save_metadata(meta):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(METADATA_FILE, "w") as f:
        json.dump(meta, f, indent=2)

def should_run(meta, domain_code):
    if domain_code not in meta:
        return True
    last = meta[domain_code].get("last_scraped")
    if not last:
        return True
    days_since = (datetime.datetime.utcnow() - datetime.datetime.fromisoformat(last)).days
    return days_since >= MIN_DAYS_BETWEEN_RUNS

def call_gemini(prompt, retries=3, backoff=60):
    import time
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"google_search": {}}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 4096}
    }
    for attempt in range(retries):
        try:
            resp = requests.post(GEMINI_URL, json=body, timeout=60)
            if resp.status_code == 429:
                wait = backoff * (attempt + 1)
                print(f"  Rate limited. Waiting {wait}s before retry {attempt+1}/{retries}...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except requests.exceptions.HTTPError as e:
            if attempt < retries - 1:
                print(f"  HTTP error: {e}. Retrying in {backoff}s...")
                time.sleep(backoff)
            else:
                raise
    raise Exception(f"Failed after {retries} retries")

def parse_json_response(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    # Find first [ or {
    for i, c in enumerate(text):
        if c in ("[", "{"):
            text = text[i:]
            break
    for i in range(len(text)-1, -1, -1):
        if text[i] in ("]", "}"):
            text = text[:i+1]
            break
    return json.loads(text)

def scrape_domain(domain):
    prompt = f"""Search the web for the latest developments in the following domain. Focus on India and the Asia-Pacific region. Find news and developments from the last 7-14 days only.

DOMAIN: {domain['name']}
FOCUS AREAS: {domain['focus']}

Search for: new AI deployments, government programmes, vendor wins, technology announcements, procurement tenders, regulatory changes, and significant use cases in this domain.

Respond ONLY with a valid JSON array. No preamble, no markdown backticks. Each item in the array should follow this exact schema:

[
  {{
    "title": "Short descriptive title of the development",
    "summary": "2-3 sentence factual summary of what happened",
    "type": "deployment|tender|announcement|regulation|programme|vendor_win|research",
    "organisation": "Organisation or company involved",
    "relevance": "Why this matters for AI/HPC solution providers",
    "tags": ["tag1", "tag2", "tag3"],
    "related_sectors": ["{domain['code']}"],
    "source_hint": "Publication or source name if identifiable",
    "date_approximate": "YYYY-MM or recent",
    "confidence": "high|medium|low"
  }}
]

Return between 5 and 10 items. Only include items you found from web search, not from prior knowledge."""

    raw = call_gemini(prompt)
    items = parse_json_response(raw)

    # Add metadata to each item
    now = datetime.datetime.utcnow().isoformat()
    for item in items:
        item["domain_code"] = domain["code"]
        item["domain_name"] = domain["name"]
        item["scraped_at"] = now
        item["id"] = f"raw-{domain['code']}-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{items.index(item):03d}"
        # Ensure related_sectors always includes this domain
        if domain["code"] not in item.get("related_sectors", []):
            item.setdefault("related_sectors", []).append(domain["code"])

    return items

def load_existing_raw(domain_code):
    path = os.path.join(OUTPUT_DIR, f"{domain_code}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []

def deduplicate(existing, new_items):
    existing_titles = {item["title"].lower().strip() for item in existing}
    added = []
    for item in new_items:
        if item["title"].lower().strip() not in existing_titles:
            added.append(item)
            existing_titles.add(item["title"].lower().strip())
    return added

def save_raw(domain_code, items):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, f"{domain_code}.json")
    with open(path, "w") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY environment variable not set.")
        sys.exit(1)

    meta = load_metadata()
    total_added = 0

    for domain in DOMAINS:
        code = domain["code"]
        if not should_run(meta, code):
            last = meta[code]["last_scraped"]
            print(f"[{code}] Skipping — last scraped {last}, not yet {MIN_DAYS_BETWEEN_RUNS} days ago.")
            continue

        print(f"[{code}] Scraping {domain['name']}...")
        import time
        time.sleep(8)  # Rate limit: max 15 req/min on free tier
        try:
            new_items = scrape_domain(domain)
            existing = load_existing_raw(code)
            added = deduplicate(existing, new_items)
            all_items = existing + added
            save_raw(code, all_items)

            meta[code] = {
                "last_scraped": datetime.datetime.utcnow().isoformat(),
                "total_items": len(all_items),
                "added_this_run": len(added)
            }
            save_metadata(meta)
            total_added += len(added)
            print(f"[{code}] Done — {len(added)} new items added, {len(all_items)} total.")

        except Exception as e:
            print(f"[{code}] ERROR: {e}")
            continue

    print(f"\nScraping complete. {total_added} new items added across all domains.")

if __name__ == "__main__":
    main()
