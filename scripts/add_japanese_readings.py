#!/usr/bin/env python3
"""Add offline kana readings so Japanese TTS does not need a hosted audio API."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "world-news.json"

try:
    from pykakasi import kakasi
except ImportError as error:
    raise SystemExit("pykakasi is required for Japanese speech readings") from error

converter = kakasi()
rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
changed = 0
for row in rows:
    if str(row.get("language") or row.get("nativeLanguage") or "").lower().split("-", 1)[0] != "ja":
        continue
    headline = str(row.get("headline") or "").strip()
    if not headline:
        continue
    reading = "".join(part["hira"] for part in converter.convert(headline)).strip()
    if reading and (row.get("speechText") != reading or row.get("speechWords") != []):
        row["speechText"] = reading
        row["speechWords"] = []
        row.pop("speechIpaWords", None)
        row.pop("speechIpaGroups", None)
        changed += 1

DATA_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Japanese speech readings updated for {changed} headlines")
