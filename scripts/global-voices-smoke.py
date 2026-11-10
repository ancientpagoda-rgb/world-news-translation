#!/usr/bin/env python3
import json
import re
from pathlib import Path

rows = json.loads((Path(__file__).resolve().parents[1] / 'data/world-news.json').read_text(encoding='utf-8'))
active = [row for row in rows if row.get('headline')]
article_rows = [row for row in rows if row.get('articleText')]
if not article_rows:
    raise SystemExit('no Global Voices articles found')
for row in article_rows:
    for field in ('articleText', 'articleSummary', 'articleHeadline', 'articleUrl', 'articleAuthor', 'articleSource', 'articleLicense', 'articleLicenseUrl'):
        if not row.get(field):
            raise SystemExit(f"{row.get('name')} missing {field}")
    if row['articleSource'] != 'Global Voices':
        raise SystemExit(f"unexpected source for {row.get('name')}: {row['articleSource']}")
india = next((row for row in article_rows if row.get('name') == 'India'), None)
if not india:
    raise SystemExit('India has no Global Voices article')
if india.get('language') != 'hi' or not re.search(r'[\u0900-\u097f]', india.get('headline') or ''):
    raise SystemExit('India original headline is not preserved in Hindi')
print(f'Global Voices checks passed: {len(article_rows)} concise licensed summaries; India Hindi headline present')
