#!/usr/bin/env python3
import json
from pathlib import Path

rows = json.loads((Path(__file__).resolve().parents[1] / 'data/world-news.json').read_text(encoding='utf-8'))
active = [row for row in rows if row.get('headline')]
if not active:
    raise SystemExit('no Global Voices articles found')
for row in active:
    for field in ('articleText', 'articleSummary', 'articleAuthor', 'articleSource', 'articleLicense', 'articleLicenseUrl', 'headlineUrl'):
        if not row.get(field):
            raise SystemExit(f"{row.get('name')} missing {field}")
    if row['articleSource'] != 'Global Voices':
        raise SystemExit(f"unexpected source for {row.get('name')}: {row['articleSource']}")
india = next((row for row in active if row.get('name') == 'India'), None)
if not india:
    raise SystemExit('India has no Global Voices article')
print(f'Global Voices checks passed: {len(active)} concise licensed summaries; India present')
