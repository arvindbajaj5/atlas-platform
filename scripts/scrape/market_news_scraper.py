#!/usr/bin/env python3
"""
ATLAS Intelligence Engine — Market News Scraper
Runs on GitHub Actions weekly.
Scrapes AI/HPC market news relevant to India, defence, government sectors.
Incremental — only runs if last scrape was more than 6 days ago.
"""

import os
import json
import datetime
import requests
import sys

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OUTPUT_DIR     = "data/raw/market_news"
METADATA_FILE  = "data/raw/market_news/metadata.json"
MODEL          = "gemini-3.5-flash"
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}"
MIN_DAYS_BETWEEN_RUNS = 6

NEWS_TOPICS = [
    {
        "id": "ai_hpc_india",
        "label": "AI & HPC in India",
        "query": "AI HPC supercomputer India government enterprise news this week"
    },
    {
        "id": "competitor_moves",
        "label": "Competitor & Vendor Activity",
        "query": "NVIDIA AMD Intel HPE Dell AI HPC India win contract announcement 2026"
    },
    {
        "id": "govt_tenders",
        "label": "Government AI Tenders & Programmes",
        "query": "India government AI tender RFP procurement supercomputer 2026"
    },
    {
        "id": "defence_tech",
        "label": "Defence Technology News",
        "query": "India defence AI military technology DRDO armed forces digital 2026"
    },
    {
        "id": "sovereign_ai",
        "label": "Sovereign AI & Data Localisation",
        "query": "sovereign AI data localisation India on-premise government cloud policy 2026"
    },
]

def load_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE) as f:
            return json.load(f)
    return {}

def save_metadata(meta):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(METADATA_FILE, "w") as f:
        json.dump(meta, f, indent=2)

def should_run(meta, topic_id):
    if topic_id not in meta:
        return True
    last = meta[topic_id].get("last_scraped")
    if not last:
        return True
    days_since = (datetime.datetime.utcnow() - datetime.datetime.fromisoformat(last)).days
    return days_since >= MIN_DAYS_BETWEEN_RUNS

def call_gemini(prompt):
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"google_search": {}}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 4096}
    }
    resp = requests.post(GEMINI_URL, json=body, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]

def parse_json_response(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    for i, c in enumerate(text):
        if c in ("[", "{"):
            text = text[i:]
            break
    for i in range(len(text)-1, -1, -1):
        if text[i] in ("]", "}"):
            text = text[:i+1]
            break
    return json.loads(text)

def scrape_topic(topic):
    prompt = f"""Search the web for the latest news on the following topic. Focus on developments from the last 7-14 days.

TOPIC: {topic['label']}
SEARCH FOCUS: {topic['query']}

Find: news articles, press releases, tender announcements, contract awards, product launches, policy announcements, and significant business developments.

Respond ONLY with a valid JSON array. No preamble, no markdown backticks:

[
  {{
    "title": "News headline or short title",
    "summary": "2-3 sentence factual summary",
    "type": "contract_award|tender|product_launch|policy|partnership|investment|other",
    "organisations": ["org1", "org2"],
    "relevance_to_atlas": "Why this matters — competitor activity, customer signal, market shift, or opportunity",
    "tags": ["tag1", "tag2"],
    "related_sectors": ["sector_code1"],
    "source_hint": "Publication name if identifiable",
    "date_approximate": "YYYY-MM or recent",
    "urgency": "high|medium|low",
    "confidence": "high|medium|low"
  }}
]

Return between 5 and 10 items. Only include items found from web search."""

    raw = call_gemini(prompt)
    items = parse_json_response(raw)

    now = datetime.datetime.utcnow().isoformat()
    for i, item in enumerate(items):
        item["topic_id"] = topic["id"]
        item["topic_label"] = topic["label"]
        item["scraped_at"] = now
        item["id"] = f"news-{topic['id']}-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{i:03d}"

    return items

def load_existing(topic_id):
    path = os.path.join(OUTPUT_DIR, f"{topic_id}.json")
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

def save_raw(topic_id, items):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, f"{topic_id}.json")
    with open(path, "w") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)

def main():
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY environment variable not set.")
        sys.exit(1)

    meta = load_metadata()
    total_added = 0

    for topic in NEWS_TOPICS:
        tid = topic["id"]
        if not should_run(meta, tid):
            print(f"[{tid}] Skipping — scraped recently.")
            continue

        print(f"[{tid}] Scraping: {topic['label']}...")
        try:
            new_items = scrape_topic(topic)
            existing = load_existing(tid)
            added = deduplicate(existing, new_items)
            all_items = existing + added
            save_raw(tid, all_items)

            meta[tid] = {
                "last_scraped": datetime.datetime.utcnow().isoformat(),
                "total_items": len(all_items),
                "added_this_run": len(added)
            }
            save_metadata(meta)
            total_added += len(added)
            print(f"[{tid}] Done — {len(added)} new items, {len(all_items)} total.")

        except Exception as e:
            print(f"[{tid}] ERROR: {e}")
            continue

    print(f"\nMarket news scraping complete. {total_added} new items added.")

if __name__ == "__main__":
    main()
