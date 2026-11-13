#!/usr/bin/env python3
"""Add conservative source-to-English word alignments for headline translations."""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "world-news.json"


def is_han(char: str) -> bool:
    code = ord(char)
    return 0x3400 <= code <= 0x9FFF or 0xF900 <= code <= 0xFAFF


def is_word_char(char: str) -> bool:
    category = unicodedata.category(char)
    return category[0] in {"L", "N"} or category.startswith("M")


def tokenize(text: str) -> list[str]:
    """Mirror the renderer's word-level units closely enough for alignment."""
    chars = list(str(text or ""))
    tokens: list[str] = []
    index = 0
    while index < len(chars):
        char = chars[index]
        if is_han(char):
            tokens.append(char)
            index += 1
            continue
        if not is_word_char(char):
            index += 1
            continue
        start = index
        index += 1
        while index < len(chars):
            if is_word_char(chars[index]):
                index += 1
                continue
            if chars[index] in {"'", "’", "-"} and index + 1 < len(chars) and is_word_char(chars[index + 1]):
                index += 1
                continue
            if chars[index] in {".", ","} and index > start and chars[index - 1].isdigit() and index + 1 < len(chars) and chars[index + 1].isdigit():
                index += 1
                continue
            break
        tokens.append("".join(chars[start:index]))
    return tokens


def normalize_token(token: str) -> str:
    return re.sub(r"[^\w]+", "", str(token or "").casefold(), flags=re.UNICODE)


def align_row(aligner, row: dict) -> tuple[list[int] | None, float]:
    source = tokenize(row.get("headline") or "")
    target = tokenize(row.get("englishHeadline") or "")
    if not source or not target:
        return None, 0.0
    alignments = aligner.get_word_aligns(source, target)
    pairs = alignments.get("mwmf") or alignments.get("itermax") or alignments.get("inter") or set()
    by_target: dict[int, list[int]] = defaultdict(list)
    for source_index, target_index in pairs:
        if 0 <= source_index < len(source) and 0 <= target_index < len(target):
            by_target[int(target_index)].append(int(source_index))
    mapping: list[int | None] = [None] * len(target)
    for target_index, candidates in by_target.items():
        mapping[target_index] = min(candidates)
    for target_index, target_token in enumerate(target):
        if mapping[target_index] is not None:
            continue
        normalized = normalize_token(target_token)
        if not normalized:
            continue
        exact = [index for index, source_token in enumerate(source) if normalize_token(source_token) == normalized]
        if exact:
            mapping[target_index] = exact[0]
    aligned = sum(value is not None for value in mapping)
    coverage = aligned / len(target)
    if coverage < 0.60:
        return None, coverage
    known = [index for index, value in enumerate(mapping) if value is not None]
    for target_index, value in enumerate(mapping):
        if value is not None:
            continue
        nearest = min(known, key=lambda candidate: abs(candidate - target_index))
        mapping[target_index] = mapping[nearest]
    return [int(value) for value in mapping], coverage


def main() -> int:
    try:
        from simalign import SentenceAligner
    except ImportError:
        print("SimAlign is not installed; leaving translations without alignment", file=sys.stderr)
        return 0
    rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    aligner = SentenceAligner(model="bert", token_type="bpe", matching_methods="mai")
    changed = 0
    skipped = 0
    for row in rows:
        if not row.get("headline") or not row.get("englishHeadline") or row.get("englishHeadline") == "English translation unavailable":
            continue
        if isinstance(row.get("headlineTranslationWordIndices"), list):
            continue
        mapping, coverage = align_row(aligner, row)
        if mapping is None:
            skipped += 1
            continue
        row["headlineTranslationWordIndices"] = mapping
        row["headlineTranslationAlignmentNote"] = f"offline SimAlign alignment ({coverage:.0%} direct coverage)"
        changed += 1
    DATA_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Offline alignment added {changed} mappings; {skipped} translations left uncolored")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
