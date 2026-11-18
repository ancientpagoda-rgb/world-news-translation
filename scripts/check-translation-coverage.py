#!/usr/bin/env python3
"""Fail refresh validation when a required language has an untranslated headline."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "world-news.json"
UNAVAILABLE = "English translation unavailable"

parser = argparse.ArgumentParser()
parser.add_argument("--language", required=True)
args = parser.parse_args()
language = args.language.strip().lower()
rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
missing = [
    row for row in rows
    if str(row.get("language") or row.get("nativeLanguage") or "").lower().split("-", 1)[0] == language
    and row.get("headline")
    and str(row.get("englishHeadline") or "").strip() in ("", UNAVAILABLE)
]
if missing:
    for row in missing:
        print(f"{row.get('iso2', '?')} {row.get('name', '?')}: {row.get('headline', '')}")
    raise SystemExit(f"{len(missing)} {language} headline translation(s) unavailable")
print(f"All {language} headline translations are present")
