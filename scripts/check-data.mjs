import fs from 'node:fs';

const path = new URL('../data/world-news.json', import.meta.url);
const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
const required = ['iso2', 'name', 'headline', 'englishHeadline', 'articleText', 'articleSummary', 'articleSummaryOriginal', 'articleSummaryTranslationNote', 'articleHeadline', 'articleUrl', 'articleSource', 'articleLicenseUrl'];
if (!Array.isArray(rows) || rows.length < 200) {
  throw new Error('expected at least 200 country rows, found ' + rows.length);
}
for (const row of rows) {
  for (const field of required) {
    if (!(field in row)) throw new Error((row.name || '<unknown>') + ' is missing ' + field);
  }
}
const headlines = rows.filter(row => row.headline).length;
const translations = rows.filter(row => row.englishHeadline && row.englishHeadline !== 'English translation unavailable').length;
const summaries = rows.filter(row => row.articleSummary).length;
const nativeSummaries = rows.filter(row => row.articleSummaryOriginal).length;
if (summaries !== nativeSummaries) {
  throw new Error('native summary coverage mismatch: ' + nativeSummaries + ' of ' + summaries);
}
console.log('Validated ' + rows.length + ' country rows, ' + headlines + ' headlines, ' + translations + ' English headline translations, and ' + nativeSummaries + ' native summaries');
