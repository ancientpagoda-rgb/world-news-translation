#!/usr/bin/env python3
"""Refresh the text-only dataset from Global Voices' CC-BY story feed."""

from __future__ import annotations

import email.utils
import html
import json
import re
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from datetime import timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "world-news.json"
FEED_URLS = (
    "https://globalvoices.org/feed/?cat=-28",
    "https://globalvoices.org/-/world/south-asia/india/feed/",
)
ATTRIBUTION_URL = "https://globalvoices.org/about/global-voices-attribution-policy/"

COUNTRY_ALIASES = {
    "United States": ["U.S.A.", "USA", "United States"],
    "Russian Federation": ["Russia", "Russian Federation"],
    "Turkiye": ["Turkey", "Türkiye", "Turkiye"],
    "Iran, Islamic Rep.": ["Iran"],
    "Egypt, Arab Rep.": ["Egypt"],
    "Congo, Dem. Rep.": ["Democratic Republic of Congo", "DR Congo", "Congo-Kinshasa"],
    "Congo, Rep.": ["Republic of Congo", "Congo-Brazzaville"],
    "Korea, Rep.": ["South Korea", "Republic of Korea"],
    "Korea, Dem. People's Rep.": ["North Korea", "DPRK"],
    "Venezuela, RB": ["Venezuela"],
    "Macao": ["Macau", "Macao"],
}

class ArticleText(HTMLParser):
    BLOCKS = {"p", "div", "br", "li", "h1", "h2", "h3", "blockquote"}
    SKIP = {"script", "style", "svg", "img", "iframe", "video", "audio", "noscript"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in self.SKIP:
            self.skip_depth += 1
        elif not self.skip_depth and tag in self.BLOCKS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in self.SKIP and self.skip_depth:
            self.skip_depth -= 1
        elif not self.skip_depth and tag in self.BLOCKS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(data)


def normalize(value):
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def clean_article(encoded):
    parser = ArticleText()
    parser.feed(encoded or "")
    text = html.unescape("".join(parser.parts))
    paragraphs = []
    for paragraph in re.split(r"\n+", text):
        paragraph = re.sub(r"\s+", " ", paragraph).strip()
        if not paragraph or paragraph.lower().startswith("originally published on"):
            continue
        paragraphs.append(paragraph)
    return "\n\n".join(paragraphs)


def summarize_article(text):
    return "\n\n".join(text.split("\n\n")[:2])


def parse_date(value):
    if not value:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OverflowError):
        return None


def fetch_feed(url):
    request = urllib.request.Request(url, headers={"User-Agent": "WorldNewsTranslation/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return ET.fromstring(response.read())


def item_categories(item):
    return [str(node.text or "").strip() for node in item.findall("category") if node.text]


def row_aliases(row):
    name = row.get("name", "")
    return [name, *COUNTRY_ALIASES.get(name, [])]


def matching_rows(rows, categories, title):
    normalized_categories = {normalize(category) for category in categories}
    normalized_title = normalize(title)
    matches = []
    for index, row in enumerate(rows):
        aliases = [normalize(alias) for alias in row_aliases(row) if alias]
        category_matches = [alias for alias in aliases if alias in normalized_categories]
        title_matches = [alias for alias in aliases if len(alias) > 2 and alias in normalized_title]
        candidates = category_matches or title_matches
        if candidates:
            matches.append((index, max(map(len, candidates))))
    return [index for index, _ in sorted(matches, key=lambda pair: pair[1], reverse=True)]


def main():
    rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise SystemExit("data/world-news.json must be a list")

    for row in rows:
        row.update({
            # Keep the separately sourced headline, language, IPA input, and
            # offline English translation. Global Voices supplies the licensed
            # article summary, not a replacement for the country's headline.
            "articleHeadline": None,
            "articleUrl": None,
            "articlePublishedAt": None,
            "articleText": None,
            "articleSummary": None,
            "articleAuthor": None,
            "articleSource": None,
            "articleLicense": None,
            "articleLicenseUrl": None,
            "articleAttribution": None,
        })

    accepted = 0
    for feed_url in FEED_URLS:
        root = fetch_feed(feed_url)
        channel = root.find("channel")
        if channel is None:
            raise SystemExit(f"Global Voices feed did not contain a channel: {feed_url}")

        for item in channel.findall("item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            creator = (item.findtext("{http://purl.org/dc/elements/1.1/}creator") or "Global Voices").strip()
            published = parse_date(item.findtext("pubDate"))
            encoded = item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or ""
            article_text = clean_article(encoded)
            article_summary = summarize_article(article_text)
            if not title or not link or not article_text or not article_summary:
                continue

            categories = item_categories(item)
            for index in matching_rows(rows, categories, title):
                row = rows[index]
                if row.get("articlePublishedAt") and (row["articlePublishedAt"] >= (published or "")):
                    continue
                row.update({
                    "articleHeadline": title,
                    "articleUrl": link,
                    "articlePublishedAt": published,
                    "articleText": article_text,
                    "articleSummary": article_summary,
                    "articleAuthor": creator,
                    "articleSource": "Global Voices",
                    "articleLicense": "Creative Commons Attribution (CC BY)",
                    "articleLicenseUrl": ATTRIBUTION_URL,
                    "articleAttribution": f"{creator} / Global Voices",
                })
                accepted += 1

    DATA_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    articles = sum(1 for row in rows if row.get("articleText"))
    print(f"Accepted {accepted} country assignments with {articles} full Global Voices articles")


if __name__ == "__main__":
    main()
