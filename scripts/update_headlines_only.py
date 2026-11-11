#!/usr/bin/env python3
"""Refresh country headlines from GDELT DOC API only.

There is deliberately no secondary news provider. A failed or lower-coverage
GDELT refresh is rejected so the last-known-good dataset remains intact.
"""
from __future__ import annotations

import argparse
import copy
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "world-news.json"
GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
GDELT_MIN_INTERVAL = 5.2
HEADERS = {"User-Agent": "WorldNewsTranslation-GDELT/1.0", "Accept": "application/json"}

LANGUAGE_NAMES = {
    "af": ("Afrikaans", "afr"), "am": ("Amharic", "amh"), "ar": ("Arabic", "ara"),
    "az": ("Azerbaijani", "aze"), "be": ("Belarusian", "bel"), "bg": ("Bulgarian", "bul"),
    "bn": ("Bengali", "ben"), "bs": ("Bosnian", "bos"), "ca": ("Catalan", "cat"),
    "cs": ("Czech", "ces"), "da": ("Danish", "dan"), "de": ("German", "deu"),
    "el": ("Greek", "ell"), "en": ("English", "eng"), "es": ("Spanish", "spa"),
    "et": ("Estonian", "est"), "fa": ("Persian", "fas"), "fi": ("Finnish", "fin"),
    "fr": ("French", "fra"), "ga": ("Irish", "gle"), "gn": ("Guarani", "grn"),
    "he": ("Hebrew", "heb"), "hi": ("Hindi", "hin"), "hr": ("Croatian", "hrv"),
    "hu": ("Hungarian", "hun"), "hy": ("Armenian", "hye"), "id": ("Indonesian", "ind"),
    "is": ("Icelandic", "isl"), "it": ("Italian", "ita"), "ja": ("Japanese", "jpn"),
    "ka": ("Georgian", "kat"), "kk": ("Kazakh", "kaz"), "km": ("Khmer", "khm"),
    "ko": ("Korean", "kor"), "ky": ("Kyrgyz", "kir"), "lo": ("Lao", "lao"),
    "lt": ("Lithuanian", "lit"), "lv": ("Latvian", "lav"), "mk": ("Macedonian", "mkd"),
    "mn": ("Mongolian", "mon"), "ms": ("Malay", "msa"), "my": ("Burmese", "mya"),
    "ne": ("Nepali", "nep"), "nl": ("Dutch", "nld"), "no": ("Norwegian", "nor"),
    "pl": ("Polish", "pol"), "pt": ("Portuguese", "por"), "ro": ("Romanian", "ron"),
    "ru": ("Russian", "rus"), "si": ("Sinhala", "sin"), "sk": ("Slovak", "slk"),
    "sl": ("Slovenian", "slv"), "sq": ("Albanian", "sqi"), "sr": ("Serbian", "srp"),
    "st": ("Southern Sotho", "sot"), "sv": ("Swedish", "swe"), "sw": ("Swahili", "swa"),
    "ta": ("Tamil", "tam"), "th": ("Thai", "tha"), "tr": ("Turkish", "tur"),
    "uk": ("Ukrainian", "ukr"), "ur": ("Urdu", "urd"), "uz": ("Uzbek", "uzb"),
    "vi": ("Vietnamese", "vie"), "zh": ("Chinese", "zho"),
}

BLOCKED_DOMAIN_MARKERS = {
    "facebook.com", "instagram.com", "tiktok.com", "youtube.com", "x.com", "twitter.com",
    "telegram.org", "reddit.com", "whatsapp.com", "news.google.com", "google.com",
}
BAD_TITLE_PATTERNS = re.compile(r"\\b(?:live score|live stream|travel guide|best hotels|head[- ]to[- ]head|friendly|friendlies)\\b", re.I)
SPORTS_TITLE_PATTERNS = re.compile(r"\\b(?:cricket|football|soccer|baseball|basketball|hockey|tennis|rugby|golf|boxing|match|score|semifinal|final|league|tournament|championship)\\b|क्रिकेट|फुटबॉल|मैच|टीम|सेमीफाइनल|फाइनल|गोल|विकेट|खेल", re.I)
_last_request = 0.0


def normalize(value):
    return re.sub(r"\\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(value or "").casefold())).strip()


def clean_title(value):
    return re.sub(r"\\s+", " ", html.unescape(str(value or "")).strip())


def parse_gdelt_date(value):
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.strptime(text[:15], "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
        return parsed.isoformat().replace("+00:00", "Z")
    except ValueError:
        return None


def domain_from(article):
    domain = str(article.get("domain") or "").strip().lower()
    if domain:
        return domain.removeprefix("www.")
    try:
        return (urlparse(str(article.get("url") or "")).hostname or "").lower().removeprefix("www.")
    except ValueError:
        return ""


def blocked_domain(domain):
    return any(domain == marker or domain.endswith("." + marker) for marker in BLOCKED_DOMAIN_MARKERS)


def language_matches(value, language):
    expected = LANGUAGE_NAMES.get(str(language or "").lower())
    if not expected:
        return False
    actual = normalize(value)
    return actual in {normalize(expected[0]), normalize(expected[1]), normalize(language)}


def article_is_usable(article, row):
    title = clean_title(article.get("title"))
    url = str(article.get("url") or "").strip()
    domain = domain_from(article)
    if len(title) < 12 or not url.startswith("http") or not domain:
        return False
    if blocked_domain(domain) or BAD_TITLE_PATTERNS.search(title) or SPORTS_TITLE_PATTERNS.search(title):
        return False
    if str(article.get("sourcecountry") or "").upper() != str(row.get("iso2") or "").upper():
        return False
    return language_matches(article.get("language"), row.get("nativeLanguage") or row.get("language"))


def request_json(params):
    global _last_request
    delay = GDELT_MIN_INTERVAL - (time.monotonic() - _last_request)
    if delay > 0:
        time.sleep(delay)
    url = GDELT_URL + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        _last_request = time.monotonic()
        request = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 2:
                raise
            retry_after = error.headers.get("Retry-After")
            try:
                wait = max(float(retry_after or 0), GDELT_MIN_INTERVAL * (attempt + 2))
            except ValueError:
                wait = GDELT_MIN_INTERVAL * (attempt + 2)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def fetch_headline(row):
    language = row.get("nativeLanguage") or row.get("language") or ""
    if str(language).lower() not in LANGUAGE_NAMES:
        return None
    payload = request_json({
        "query": "sourcecountry:" + str(row.get("iso2") or "").upper(),
        "mode": "artlist",
        "maxrecords": "250",
        "format": "json",
        "sort": "datedesc",
        "timespan": "72h",
    })
    candidates = []
    for article in payload.get("articles", []):
        if not article_is_usable(article, row):
            continue
        published = parse_gdelt_date(article.get("seendate"))
        if not published:
            continue
        candidates.append({
            "headline": clean_title(article.get("title")),
            "headlineUrl": str(article.get("url")).strip(),
            "headlinePublishedAt": published,
            "headlineSource": domain_from(article),
        })
    return candidates[0] if candidates else None


def apply_candidate(row, candidate):
    previous = row.get("headline")
    previous_english = row.get("englishHeadline")
    previous_mapping = row.get("headlineTranslationWordIndices")
    if candidate is None:
        row.update({"headline": None, "headlineUrl": None, "headlinePublishedAt": None, "headlineSource": None, "englishHeadline": None})
        row.pop("headlineTranslationWordIndices", None)
        return
    row.update(candidate)
    if candidate["headline"] == previous and previous_english:
        row["englishHeadline"] = previous_english
        if previous_mapping is not None:
            row["headlineTranslationWordIndices"] = previous_mapping
    else:
        row["englishHeadline"] = "English translation unavailable"
        row.pop("headlineTranslationWordIndices", None)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--allow-partial", action="store_true", help="write successful rows even when some GDELT requests fail")
    parser.add_argument("--limit", type=int, default=0, help="test only the first N rows; requires --dry-run")
    args = parser.parse_args()
    if args.limit and not args.dry_run:
        raise SystemExit("--limit requires --dry-run")

    rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    candidate_rows = copy.deepcopy(rows)
    baseline = sum(bool(row.get("headline")) for row in rows)
    targets = candidate_rows[:args.limit] if args.limit else candidate_rows
    failures = []
    for index, row in enumerate(targets, start=1):
        try:
            candidate = fetch_headline(row)
            apply_candidate(row, candidate)
            print(f"{index:03d}/{len(targets)} {row.get('name')} {'headline' if candidate else 'no GDELT match'}", flush=True)
        except Exception as error:
            failures.append(f"{row.get('name')}: {error}")
            print(f"{index:03d}/{len(targets)} {row.get('name')} ERROR {error}", flush=True)

    if args.limit:
        print("Dry-run only; dataset was not changed")
        return 0 if not failures else 1
    if failures and not args.allow_partial:
        raise SystemExit("GDELT refresh aborted; API failures:\\n" + "\\n".join(failures[:20]))

    coverage = sum(bool(row.get("headline")) for row in candidate_rows)
    floor = max(1, int(baseline * 0.9)) if baseline else 1
    if coverage < floor and not args.allow_partial:
        raise SystemExit(f"GDELT refresh aborted: headline coverage {coverage} is below safety floor {floor}")
    if not args.dry_run:
        DATA_PATH.write_text(json.dumps(candidate_rows, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")
    print(f"GDELT refresh accepted: {coverage}/{len(candidate_rows)} headlines; safety floor {floor}")


if __name__ == "__main__":
    main()
