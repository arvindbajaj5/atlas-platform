#!/usr/bin/env python3
"""
ATLAS Intelligence Engine — Local Processing Script
Runs on your MacBook using Ollama + Qwen 3.5 4B.
Converts raw scraped JSON into structured, tagged intelligence items.
Incremental — only processes items not already in intelligence database.

Usage:
  python3 process_intelligence.py                    # Process all domains
  python3 process_intelligence.py --domain DEF       # Process one domain
  python3 process_intelligence.py --news             # Process market news
"""

import os
import json
import datetime
import argparse
import requests
import sys

# ── Config ────────────────────────────────────────────────────────────────────
OLLAMA_URL       = "http://localhost:11434/api/generate"
OLLAMA_MODEL     = "qwen3.5:4b"
RAW_DOMAIN_DIR   = "data/raw/domain_intelligence"
RAW_NEWS_DIR     = "data/raw/market_news"
INTEL_DIR        = "data/intelligence"
PROCESSED_LOG    = "data/intelligence/processed_ids.json"

DOMAIN_CODES = ["DEF","GEO","GOV","HLT","ENR","TEL","FIN","MFG","TER","HLS"]
NEWS_TOPICS  = ["ai_hpc_india","competitor_moves","govt_tenders","defence_tech","sovereign_ai"]

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_processed_ids():
    if os.path.exists(PROCESSED_LOG):
        with open(PROCESSED_LOG) as f:
            return set(json.load(f))
    return set()

def save_processed_ids(ids):
    os.makedirs(INTEL_DIR, exist_ok=True)
    with open(PROCESSED_LOG, "w") as f:
        json.dump(list(ids), f, indent=2)

def load_intelligence(filename):
    path = os.path.join(INTEL_DIR, filename)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []

def save_intelligence(filename, items):
    os.makedirs(INTEL_DIR, exist_ok=True)
    path = os.path.join(INTEL_DIR, filename)
    with open(path, "w") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)

def call_ollama(prompt):
    body = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 2048}
    }
    resp = requests.post(OLLAMA_URL, json=body, timeout=120)
    resp.raise_for_status()
    return resp.json()["response"]

def parse_json(text):
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

def check_ollama():
    try:
        resp = requests.get("http://localhost:11434/api/tags", timeout=5)
        models = [m["name"] for m in resp.json().get("models", [])]
        if not any(OLLAMA_MODEL in m for m in models):
            print(f"ERROR: Model {OLLAMA_MODEL} not found in Ollama.")
            print(f"Run: ollama pull {OLLAMA_MODEL}")
            sys.exit(1)
        print(f"Ollama OK — {OLLAMA_MODEL} ready.")
    except Exception as e:
        print(f"ERROR: Cannot connect to Ollama at localhost:11434. Is it running?")
        print(f"Start it with: ollama serve")
        sys.exit(1)

# ── Processing ────────────────────────────────────────────────────────────────
def process_item(raw_item, item_type="domain"):
    prompt = f"""You are an intelligence analyst for an AI and HPC hardware company. Process the following raw intelligence item and extract structured insights.

RAW ITEM:
{json.dumps(raw_item, indent=2)}

Analyse this item and respond ONLY with a valid JSON object. No preamble, no backticks:

{{
  "title": "Clean, descriptive title",
  "summary": "Concise 2-3 sentence summary of the key facts",
  "type": "deployment|tender|announcement|regulation|programme|vendor_win|research|contract|partnership",
  "intelligence_value": "high|medium|low",
  "key_signals": ["signal1", "signal2", "signal3"],
  "organisations_involved": ["org1", "org2"],
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "related_sectors": ["DEF", "GEO", "GOV", "HLT", "ENR", "TEL", "FIN", "MFG", "TER", "HLS"],
  "related_use_cases": [],
  "cross_refs": [],
  "opportunity_signals": "Any signals relevant to selling AI/HPC solutions — be specific",
  "competitor_signals": "Any mentions of competitors or incumbent vendors",
  "uc_recommendation": {{
    "suggest": true,
    "uc_name": "Suggested use case name if this item implies a new or emerging use case",
    "cluster": "Which UC cluster this belongs to",
    "rationale": "Why this use case is worth adding to the library"
  }},
  "expires_days": 90,
  "confidence": "high|medium|low",
  "processed_at": "{datetime.datetime.utcnow().isoformat()}"
}}

For related_sectors, only include the codes that are genuinely relevant.
For uc_recommendation, set suggest to false if this item does not imply a new use case."""

    try:
        raw_response = call_ollama(prompt)
        processed = parse_json(raw_response)
        # Carry over original ID and source metadata
        processed["source_id"] = raw_item.get("id", "")
        processed["source_type"] = item_type
        processed["scraped_at"] = raw_item.get("scraped_at", "")
        processed["id"] = "intel-" + raw_item.get("id", datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S"))
        return processed
    except Exception as e:
        print(f"  Warning: Could not process item '{raw_item.get('title', 'unknown')}': {e}")
        return None

def process_domain(domain_code, processed_ids):
    raw_path = os.path.join(RAW_DOMAIN_DIR, f"{domain_code}.json")
    if not os.path.exists(raw_path):
        print(f"[{domain_code}] No raw data found at {raw_path} — skipping.")
        return 0

    with open(raw_path) as f:
        raw_items = json.load(f)

    unprocessed = [item for item in raw_items if item.get("id") not in processed_ids]
    if not unprocessed:
        print(f"[{domain_code}] All {len(raw_items)} items already processed — skipping.")
        return 0

    print(f"[{domain_code}] Processing {len(unprocessed)} new items...")
    existing_intel = load_intelligence(f"{domain_code}.json")
    added = 0

    for i, raw_item in enumerate(unprocessed):
        print(f"  [{i+1}/{len(unprocessed)}] {raw_item.get('title', '')[:60]}...")
        processed = process_item(raw_item, "domain")
        if processed:
            existing_intel.append(processed)
            processed_ids.add(raw_item.get("id"))
            added += 1

    save_intelligence(f"{domain_code}.json", existing_intel)
    print(f"[{domain_code}] Done — {added} items processed, {len(existing_intel)} total in database.")
    return added

def process_news(topic_id, processed_ids):
    raw_path = os.path.join(RAW_NEWS_DIR, f"{topic_id}.json")
    if not os.path.exists(raw_path):
        print(f"[news/{topic_id}] No raw data found — skipping.")
        return 0

    with open(raw_path) as f:
        raw_items = json.load(f)

    unprocessed = [item for item in raw_items if item.get("id") not in processed_ids]
    if not unprocessed:
        print(f"[news/{topic_id}] All items already processed — skipping.")
        return 0

    print(f"[news/{topic_id}] Processing {len(unprocessed)} new items...")
    existing_intel = load_intelligence(f"news_{topic_id}.json")
    added = 0

    for i, raw_item in enumerate(unprocessed):
        print(f"  [{i+1}/{len(unprocessed)}] {raw_item.get('title', '')[:60]}...")
        processed = process_item(raw_item, "news")
        if processed:
            existing_intel.append(processed)
            processed_ids.add(raw_item.get("id"))
            added += 1

    save_intelligence(f"news_{topic_id}.json", existing_intel)
    print(f"[news/{topic_id}] Done — {added} items processed.")
    return added

def extract_uc_recommendations():
    """After processing, collect all UC recommendations into a queue file."""
    recommendations = []
    for fname in os.listdir(INTEL_DIR):
        if not fname.endswith(".json") or fname in ["processed_ids.json", "uc_queue.json"]:
            continue
        with open(os.path.join(INTEL_DIR, fname)) as f:
            items = json.load(f)
        for item in items:
            uc = item.get("uc_recommendation", {})
            if uc.get("suggest") and uc.get("uc_name"):
                recommendations.append({
                    "uc_name": uc.get("uc_name"),
                    "cluster": uc.get("cluster"),
                    "rationale": uc.get("rationale"),
                    "source_intel_id": item.get("id"),
                    "source_title": item.get("title"),
                    "suggested_at": datetime.datetime.utcnow().isoformat(),
                    "status": "pending"
                })

    existing_queue = load_intelligence("uc_queue.json")
    existing_names = {item["uc_name"].lower() for item in existing_queue}
    new_recs = [r for r in recommendations if r["uc_name"].lower() not in existing_names]
    all_queue = existing_queue + new_recs
    save_intelligence("uc_queue.json", all_queue)
    print(f"\nUC queue updated — {len(new_recs)} new recommendations added, {len(all_queue)} total pending.")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="ATLAS Intelligence Processor")
    parser.add_argument("--domain", help="Process single domain code e.g. DEF")
    parser.add_argument("--news", action="store_true", help="Process market news only")
    parser.add_argument("--all", action="store_true", help="Process everything (default)")
    args = parser.parse_args()

    check_ollama()
    processed_ids = load_processed_ids()
    total_added = 0

    if args.domain:
        code = args.domain.upper()
        if code not in DOMAIN_CODES:
            print(f"ERROR: Unknown domain code {code}. Valid: {', '.join(DOMAIN_CODES)}")
            sys.exit(1)
        total_added += process_domain(code, processed_ids)

    elif args.news:
        for topic_id in NEWS_TOPICS:
            total_added += process_news(topic_id, processed_ids)

    else:
        # Process everything
        print("=== Processing Domain Intelligence ===")
        for code in DOMAIN_CODES:
            total_added += process_domain(code, processed_ids)

        print("\n=== Processing Market News ===")
        for topic_id in NEWS_TOPICS:
            total_added += process_news(topic_id, processed_ids)

    save_processed_ids(processed_ids)
    extract_uc_recommendations()
    print(f"\nProcessing complete. {total_added} new intelligence items added.")

if __name__ == "__main__":
    main()
