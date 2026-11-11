#!/usr/bin/env python3
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_headlines_only import country_aliases, headline_is_usable

assert not headline_is_usable('India headline - Facebook', ['India'])
assert not headline_is_usable('India headline - Google News', ['India'])
assert headline_is_usable('India headline - Reuters', ['India'])
assert headline_is_usable('India headline - BBC News', ['India'])

rows = json.loads((Path(__file__).resolve().parents[1] / 'data/world-news.json').read_text(encoding='utf-8'))
for row in rows:
    if row.get('headline'):
        assert headline_is_usable(row['headline'], country_aliases(row.get('name', ''), row.get('iso2', ''))), row['headline']
print('Source policy checks passed')
