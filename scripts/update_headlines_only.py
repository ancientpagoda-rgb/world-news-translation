#!/usr/bin/env python3
"""Refresh country headlines from approved direct publisher feeds.

Unregistered countries are left unchanged; there is no aggregator or provider
fallback.
"""
from __future__ import annotations

import argparse
import copy
import email.utils
import html
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "world-news.json"
SOURCE_REGISTRY_PATH = ROOT / "data" / "approved-sources.json"
FEED_TIMEOUT = float(os.environ.get("FEED_TIMEOUT", "20"))
HEADERS = {"User-Agent": "WorldNewsTranslation-feed-refresh/1.0", "Accept": "application/rss+xml, application/xml, text/xml"}

BLOCKED_DOMAIN_MARKERS = {
    "facebook.com", "instagram.com", "tiktok.com", "youtube.com", "x.com", "twitter.com",
    "telegram.org", "reddit.com", "whatsapp.com", "news.google.com", "google.com",
}
BAD_TITLE_PATTERNS = re.compile(r"\b(?:live score|live stream|travel guide|best hotels|head[- ]to[- ]head|friendly|friendlies)\b", re.I)
SPORTS_TITLE_PATTERNS = re.compile(r"\b(?:cricket|football|soccer|baseball|basketball|hockey|tennis|rugby|golf|boxing|match|score|semifinal|final|league|tournament|championship)\b|क्रिकेट|फुटबॉल|मैच|टीम|सेमीफाइनल|फाइनल|गोल|विकेट|खेल", re.I)

def normalize(value):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(value or "").casefold())).strip()


def clean_title(value):
    text = html.unescape(str(value or "")).strip()
    if text.startswith("<![CDATA[") and text.endswith("]]>"):
        text = text[9:-3].strip()
    return re.sub(r"\s+", " ", text)


def blocked_domain(domain):
    return any(domain == marker or domain.endswith("." + marker) for marker in BLOCKED_DOMAIN_MARKERS)


def feed_text(element, names):
    wanted = set(names)
    for child in list(element):
        if child.tag.rsplit("}", 1)[-1] in wanted:
            return (child.text or "").strip()
    return ""


def parse_feed_date(value):
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return email.utils.parsedate_to_datetime(text).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OverflowError):
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            return None


def direct_feed_candidate(row):
    registry = json.loads(SOURCE_REGISTRY_PATH.read_text(encoding="utf-8"))
    config = registry.get("countries", {}).get(str(row.get("iso2") or "").upper())
    if not config:
        return None, False
    for source in config.get("publishers", []):
        feed_url = str(source.get("feed") or "").strip()
        domain = str(source.get("domain") or "").strip().lower().removeprefix("www.")
        if not feed_url or not domain:
            continue
        request = urllib.request.Request(feed_url, headers=HEADERS)
        with urllib.request.urlopen(request, timeout=FEED_TIMEOUT) as response:
            root = ET.fromstring(response.read())
        items = root.findall(".//item") + root.findall(".//{*}item")
        seen = set()
        for item in items:
            if id(item) in seen:
                continue
            seen.add(id(item))
            title = clean_title(feed_text(item, {"title"}))
            url = feed_text(item, {"link"})
            host = (urlparse(url).hostname or "").lower().removeprefix("www.")
            if len(title) < 12 or not url.startswith("http") or (host != domain and not host.endswith("." + domain)):
                continue
            if blocked_domain(host) or BAD_TITLE_PATTERNS.search(title) or SPORTS_TITLE_PATTERNS.search(title):
                continue
            published = feed_text(item, {"pubDate", "published", "updated", "date"})
            timestamp = parse_feed_date(published)
            if not timestamp:
                continue
            return {"headline": title, "headlineUrl": url, "headlinePublishedAt": timestamp, "headlineSource": host}, True
    return None, True


def fetch_headline(row):
    direct, registered = direct_feed_candidate(row)
    return direct, registered


def apply_candidate(row, candidate):
    previous = row.get("headline")
    previous_english = row.get("englishHeadline")
    previous_mapping = row.get("headlineTranslationWordIndices")
    if candidate is None:
        row.update({"headline": None, "headlineUrl": None, "headlinePublishedAt": None, "headlineSource": None, "englishHeadline": None})
        row.pop("headlineTranslationWordIndices", None)
        row.pop("headlineTranslationNote", None)
        return
    row.update(candidate)
    if candidate["headline"] == previous and previous_english:
        row["englishHeadline"] = previous_english
        if previous_mapping is not None:
            row["headlineTranslationWordIndices"] = previous_mapping
    else:
        row["englishHeadline"] = "English translation unavailable"
        row.pop("headlineTranslationWordIndices", None)
        row.pop("headlineTranslationNote", None)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--allow-partial", action="store_true", help="write successful rows while retaining failed rows")
    parser.add_argument("--limit", type=int, default=0, help="test only the first N rows; requires --dry-run")
    parser.add_argument("--start", type=int, default=0, help="zero-based row index to begin with")
    parser.add_argument("--count", type=int, default=0, help="number of rows to process from --start")
    parser.add_argument("--country", action="append", dest="countries", help="ISO2 country to refresh; may be repeated")
    args = parser.parse_args()
    if args.limit and not args.dry_run:
        raise SystemExit("--limit requires --dry-run")
    if args.start < 0 or args.count < 0:
        raise SystemExit("--start and --count must be non-negative")
    if args.countries and (args.start or args.count):
        raise SystemExit("--country cannot be combined with --start or --count")

    rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    candidate_rows = copy.deepcopy(rows)
    baseline = sum(bool(row.get("headline")) for row in rows)
    if args.countries:
        wanted = {str(value).upper() for value in args.countries}
        targets = [row for row in candidate_rows if str(row.get("iso2") or "").upper() in wanted]
        if len(targets) != len(wanted):
            missing = sorted(wanted - {str(row.get("iso2") or "").upper() for row in targets})
            raise SystemExit("unknown --country value(s): " + ", ".join(missing))
    else:
        end = args.start + args.count if args.count else len(candidate_rows)
        if args.start >= len(candidate_rows):
            raise SystemExit("--start is outside the dataset")
        targets = candidate_rows[args.start:end]
    if args.limit:
        targets = targets[:args.limit]
    failures = []
    for index, row in enumerate(targets, start=1):
        try:
            candidate, registered = fetch_headline(row)
            if not registered:
                print(f"{index:03d}/{len(targets)} {row.get('name')} no approved direct source; unchanged", flush=True)
                continue
            apply_candidate(row, candidate)
            print(f"{index:03d}/{len(targets)} {row.get('name')} {'headline' if candidate else 'no feed match'}", flush=True)
        except Exception as error:
            failures.append(f"{row.get('name')}: {error}")
            print(f"{index:03d}/{len(targets)} {row.get('name')} ERROR {error}", flush=True)

    if args.limit:
        print("Dry-run only; dataset was not changed")
        return 0 if not failures else 1
    if failures and not args.allow_partial:
        raise SystemExit("Direct-feed refresh aborted; feed failures:\\n" + "\\n".join(failures[:20]))

    coverage = sum(bool(row.get("headline")) for row in candidate_rows)
    floor = max(1, int(baseline * 0.9)) if baseline else 1
    if coverage < floor and not args.allow_partial:
        raise SystemExit(f"Direct-feed refresh aborted: headline coverage {coverage} is below safety floor {floor}")
    if not args.dry_run:
        DATA_PATH.write_text(json.dumps(candidate_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Direct-feed refresh accepted: {coverage}/{len(candidate_rows)} headlines; safety floor {floor}")


if __name__ == "__main__":
    main()
