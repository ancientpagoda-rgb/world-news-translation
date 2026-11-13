import fs from 'node:fs';

const path = new URL('../data/world-news.json', import.meta.url);
const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
const required = ['iso2', 'name', 'headline', 'headlineUrl', 'englishHeadline'];
if (!Array.isArray(rows) || rows.length < 200) {
  throw new Error('expected at least 200 country rows, found ' + rows.length);
}
for (const row of rows) {
  for (const field of required) {
    if (!(field in row)) throw new Error((row.name || '<unknown>') + ' is missing ' + field);
  }
}
const headlines = rows.filter(row => row.headline).length;
function alignmentTokens(value) {
  const text = String(value || '');
  const hasHan = /\p{Script=Han}/u.test(text);
  const pattern = hasHan
    ? /\p{Script=Han}|\p{N}+(?:[.,]\p{N}+)*|(?:(?!\p{Script=Han})[\p{L}\p{M}\p{N}])+(?:[’'-](?:(?!\p{Script=Han})[\p{L}\p{M}\p{N}])+)*|[^\p{L}\p{M}\p{N}]+/gu
    : /\p{N}+(?:[.,]\p{N}+)*|[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*|[^\p{L}\p{M}\p{N}]+/gu;
  return (text.match(pattern) || []).filter(part => /[\p{L}\p{M}\p{N}]/u.test(part));
}

for (const row of rows) {
  const mapping = row.headlineTranslationWordIndices;
  if (!Array.isArray(mapping)) continue;
  const sourceTokens = alignmentTokens(row.headline);
  const targetTokens = alignmentTokens(row.englishHeadline);
  if (mapping.length !== targetTokens.length) throw new Error((row.iso2 || row.name) + ' translation alignment length mismatch');
  if (mapping.some(index => !Number.isInteger(index) || index < 0 || index >= sourceTokens.length)) {
    throw new Error((row.iso2 || row.name) + ' translation alignment index out of range');
  }
}

const translations = rows.filter(row => row.englishHeadline && row.englishHeadline !== 'English translation unavailable').length;
console.log('Validated ' + rows.length + ' country rows, ' + headlines + ' headlines, and ' + translations + ' English headline translations');
