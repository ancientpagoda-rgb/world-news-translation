#!/usr/bin/env python3
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_headlines_only import BLOCKED_DOMAIN_MARKERS, blocked_domain

rows = json.loads((Path(__file__).resolve().parents[1] / 'data/world-news.json').read_text(encoding='utf-8'))
checked = 0
for row in rows:
    if not row.get('headlineSource'):
        continue
    checked += 1
    assert row.get('headlineUrl', '').startswith('http'), row.get('name')
    assert not blocked_domain(row['headlineSource']), row['headlineSource']
    assert row.get('headline') and row.get('headlinePublishedAt'), row.get('name')
print(f'GDELT source checks passed for {checked} headlines')
