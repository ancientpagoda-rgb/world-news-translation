const DATA_URL = './data/world-news.json';
const state = { rows: [], query: '', language: 'all' };
const list = document.querySelector('#news-list');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
const language = document.querySelector('#language');
let renderVersion = 0;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function formatDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function renderArticle(text) {
  return String(text || '').split(/\n{2,}/).filter(Boolean).map(paragraph => '<p>' + escapeHtml(paragraph) + '</p>').join('');
}

const WORD_COLORS = ['52 211 153', '248 113 113', '250 204 21', '96 165 250', '192 132 252', '34 211 238', '251 146 60'];

function renderWordTrack(text, language = '') {
  const value = String(text || '');
  const hasHan = /\p{Script=Han}/u.test(value);
  const tokenPattern = hasHan
    ? /\p{Script=Han}|(?:(?!\p{Script=Han})[\p{L}\p{M}\p{N}])+(?:[’'-](?:(?!\p{Script=Han})[\p{L}\p{M}\p{N}])+)*|[^\p{L}\p{M}\p{N}]+/gu
    : /[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*|[^\p{L}\p{M}\p{N}]+/gu;
  const parts = value.match(tokenPattern) || [];
  let wordIndex = 0;
  return parts.map(part => {
    if (!/[\p{L}\p{M}\p{N}]/u.test(part)) return escapeHtml(part);
    const color = WORD_COLORS[wordIndex % WORD_COLORS.length];
    const html = '<span class="word-token" data-word-index="' + wordIndex + '" style="--word-color: ' + color + '">' + escapeHtml(part) + '</span>';
    wordIndex += 1;
    return html;
  }).join('');
}

function renderColoredArticle(text, language = '') {
  return String(text || '').split(/\n{2,}/).filter(Boolean).map(paragraph => '<p>' + renderWordTrack(paragraph, language) + '</p>').join('');
}

function matches(row) {
  const haystack = [row.name, row.iso2, row.nativeLanguage, row.language, row.headline, row.englishHeadline, row.articleText]
    .filter(Boolean).join(' ').toLowerCase();
  return (state.language === 'all' || row.language === state.language) && haystack.includes(state.query);
}

function render() {
  const rows = state.rows.filter(matches);
  const version = ++renderVersion;
  status.textContent = rows.length + ' of ' + state.rows.length + ' countries';
  if (!rows.length) {
    list.innerHTML = '<p class="empty">No matching countries or headlines.</p>';
    return;
  }
  list.innerHTML = rows.map((row, index) => {
    const sourceUrl = row.articleUrl || row.headlineUrl || '';
    const source = /^https?:\/\//i.test(sourceUrl)
      ? '<a class="source" href="' + escapeHtml(sourceUrl) + '" target="_blank" rel="noopener noreferrer nofollow">Open source</a>' : '';
    const date = formatDate(row.headlinePublishedAt);
    const original = row.headline || 'No headline available.';
    const phonetics = row.headline ? 'Generating phonetics…' : '—';
    return '<article class="news-card" data-row-index="' + index + '">' +
      '<div class="card-heading"><div><h2>' + escapeHtml(row.name) + '</h2><p class="meta">' + escapeHtml(row.iso3 || row.iso2) + ' · ' + escapeHtml(row.language || row.nativeLanguage || 'Unknown language') + '</p></div>' +
      (date ? '<time datetime="' + escapeHtml(row.headlinePublishedAt) + '">' + escapeHtml(date) + '</time>' : '') + '</div>' +
      '<div class="headline-block"><p class="label">Original</p><p class="headline original">' + (row.headline ? renderWordTrack(original, row.language) : escapeHtml(original)) + '</p></div>' +
      '<div class="headline-block"><p class="label">IPA phonetics</p><p class="headline phonetics" data-phonetics>' + escapeHtml(phonetics) + '</p></div>' +
      '<div class="headline-block"><p class="label">English translation</p><p class="headline">' + (row.englishHeadline && row.englishHeadline !== 'English translation unavailable' ? renderWordTrack(row.englishHeadline, 'en') : escapeHtml(row.englishHeadline || 'English translation unavailable')) + '</p></div>' +
      (row.articleSummary ? '<section class="article-details"><p class="label">Original-language summary</p><div class="article-body">' + (row.articleSummaryOriginal ? renderColoredArticle(row.articleSummaryOriginal, row.language) : '<p>Native-language summary unavailable</p>') + '</div><p class="label">IPA phonetics</p><p class="headline phonetics summary-phonetics" data-summary-phonetics>' + escapeHtml(row.articleSummaryOriginal ? 'Generating phonetics…' : '—') + '</p><p class="label">English translation</p><div class="article-body">' + renderColoredArticle(row.articleSummary, 'en') + '</div><p class="attribution">' + escapeHtml(row.articleAttribution || row.articleSource || '') + ' · ' + escapeHtml(row.articleSummaryTranslationNote || 'Source summary') + ' · <a href="' + escapeHtml(row.articleLicenseUrl || '') + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(row.articleLicense || 'Reuse policy') + '</a></p></section>' : '') +
      source + '</article>';
  }).join('');

  rows.forEach((row, index) => {
    if (!row.headline) return;
    Promise.resolve(window.toIpaDisplay ? window.toIpaDisplay(row.headline, row.language || '') : row.headline)
      .then(value => {
        if (version !== renderVersion) return;
        const card = list.querySelector('[data-row-index="' + index + '"]');
        const target = card && card.querySelector('[data-phonetics]');
        if (target) target.innerHTML = renderWordTrack(value || row.headline, row.language);
      })
      .catch(error => {
        console.warn('Phonetic rendering failed:', error);
        const card = list.querySelector('[data-row-index="' + index + '"]');
        const target = card && card.querySelector('[data-phonetics]');
        if (target) target.innerHTML = renderWordTrack(row.headline, row.language);
      });
    if (row.articleSummaryOriginal) {
      Promise.resolve(window.toIpaDisplay ? window.toIpaDisplay(row.articleSummaryOriginal, row.language || '') : row.articleSummaryOriginal)
        .then(value => {
          if (version !== renderVersion) return;
          const card = list.querySelector('[data-row-index="' + index + '"]');
          const target = card && card.querySelector('[data-summary-phonetics]');
          if (target) target.innerHTML = renderWordTrack(value || row.articleSummaryOriginal, row.language);
        })
        .catch(error => {
          console.warn('Summary phonetic rendering failed:', error);
          const card = list.querySelector('[data-row-index="' + index + '"]');
          const target = card && card.querySelector('[data-summary-phonetics]');
          if (target) target.innerHTML = renderWordTrack(row.articleSummaryOriginal, row.language);
        });
    }
  });
}

function populateLanguages() {
  const languages = [...new Set(state.rows.map(row => row.language).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  language.insertAdjacentHTML('beforeend', languages.map(value => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>').join(''));
}

search.addEventListener('input', () => { state.query = search.value.trim().toLowerCase(); render(); });
language.addEventListener('change', () => { state.language = language.value; render(); });

try {
  state.rows = await (await fetch(DATA_URL)).json();
  populateLanguages();
  render();
} catch (error) {
  console.error(error);
  status.textContent = 'Could not load news data.';
  list.innerHTML = '<p class="empty">The data file could not be loaded.</p>';
}
