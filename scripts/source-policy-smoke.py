#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_headlines_only import BLOCKED_DOMAIN_MARKERS, blocked_domain, direct_feed_candidate

ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / 'data/world-news.json').read_text(encoding='utf-8'))
registry = json.loads((ROOT / 'data/approved-sources.json').read_text(encoding='utf-8'))
by_iso2 = {str(row.get('iso2')).upper(): row for row in rows}

for domain in ['facebook.com', 'news.google.com']:
    assert blocked_domain(domain), domain
approved_domains = {str(source.get('domain') or '').lower().removeprefix('www.') for config in registry.get('countries', {}).values() for source in config.get('publishers', [])}
assert 'unknown.example' not in approved_domains
for domain in ['bhaskar.com', 'cnbcindonesia.com']:
    assert not blocked_domain(domain), domain

checked = 0
for iso2, config in registry.get('countries', {}).items():
    row = by_iso2.get(str(iso2).upper())
    assert row, iso2
    assert config.get('language') == row.get('nativeLanguage') or config.get('language') == row.get('language'), iso2
    publishers = config.get('publishers') or []
    assert publishers, iso2
    for source in publishers:
        domain = str(source.get('domain') or '').lower().removeprefix('www.')
        feed = str(source.get('feed') or '')
        assert source.get('status') == 'approved', (iso2, source)
        assert domain and not blocked_domain(domain), (iso2, domain)
        assert feed.startswith('https://'), (iso2, feed)
        candidate, registered = direct_feed_candidate(row)
        assert registered and candidate, (iso2, source)
        host = (urlparse(candidate['headlineUrl']).hostname or '').lower().removeprefix('www.')
        assert host == domain or host.endswith('.' + domain), (iso2, host, domain)
        assert candidate['headline'] and candidate['headlinePublishedAt'], iso2
        checked += 1

print(f'Direct source checks passed for {checked} approved feeds; blocked-domain checks passed')
