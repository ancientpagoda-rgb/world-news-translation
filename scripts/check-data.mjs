import fs from 'node:fs';

const path = new URL('../data/world-news.json', import.meta.url);
const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
const required = ['iso2', 'name', 'headline', 'englishHeadline', 'articleText', 'articleSummary', 'articleSource', 'articleLicenseUrl'];
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
console.log('Validated ' + rows.length + ' country rows, ' + headlines + ' headlines, and ' + translations + ' English translations');
