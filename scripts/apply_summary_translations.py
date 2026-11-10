#!/usr/bin/env python3
"""Apply reviewed machine translations for the licensed article summaries."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "world-news.json"
TRANSLATIONS_PATH = ROOT / "scripts" / "summary-translations.json"


def main():
    rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    translations = json.loads(TRANSLATIONS_PATH.read_text(encoding="utf-8"))
    applied = 0
    missing = 0
    for row in rows:
        row["articleSummaryOriginal"] = None
        row["articleSummaryTranslationNote"] = None
        summary = row.get("articleSummary")
        if not summary:
            continue
        entry = translations.get(row.get("iso2"), {})
        current_first = summary.split("\n\n", 1)[0].strip()
        translated_source = str(entry.get("sourceSummary") or "").split("\n\n", 1)[0].strip()
        if current_first != translated_source or not entry.get("translatedSummary"):
            missing += 1
            continue
        row["articleSummaryOriginal"] = entry["translatedSummary"]
        row["articleSummaryTranslationNote"] = entry.get("note") or "machine translation"
        applied += 1

    DATA_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Applied {applied} native-language summaries; {missing} unavailable or stale")


if __name__ == "__main__":
    main()
