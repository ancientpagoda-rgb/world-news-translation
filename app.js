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
    const source = /^https?:\/\//i.test(row.headlineUrl || '')
      ? '<a class="source" href="' + escapeHtml(row.headlineUrl) + '" target="_blank" rel="noopener noreferrer nofollow">Open source</a>' : '';
    const date = formatDate(row.headlinePublishedAt);
    const original = row.headline || 'No headline available.';
    const phonetics = row.headline ? 'Generating phonetics…' : '—';
    return '<article class="news-card" data-row-index="' + index + '">' +
      '<div class="card-heading"><div><h2>' + escapeHtml(row.name) + '</h2><p class="meta">' + escapeHtml(row.iso3 || row.iso2) + ' · ' + escapeHtml(row.language || row.nativeLanguage || 'Unknown language') + '</p></div>' +
      (date ? '<time datetime="' + escapeHtml(row.headlinePublishedAt) + '">' + escapeHtml(date) + '</time>' : '') + '</div>' +
      '<div class="headline-block"><p class="label">Original</p><p class="headline original">' + escapeHtml(original) + '</p></div>' +
      '<div class="headline-block"><p class="label">IPA phonetics</p><p class="headline phonetics" data-phonetics>' + escapeHtml(phonetics) + '</p></div>' +
      '<div class="headline-block"><p class="label">English translation</p><p class="headline">' + escapeHtml(row.englishHeadline || 'English translation unavailable') + '</p></div>' +
      (row.articleSummary ? '<section class="article-details"><p class="label">Summary</p><div class="article-body">' + renderArticle(row.articleSummary) + '</div><p class="attribution">' + escapeHtml(row.articleAttribution || row.articleSource || '') + ' · <a href="' + escapeHtml(row.articleLicenseUrl || '') + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(row.articleLicense || 'Reuse policy') + '</a></p></section>' : '') +
      source + '</article>';
  }).join('');

  rows.forEach((row, index) => {
    if (!row.headline) return;
    Promise.resolve(window.toIpaDisplay ? window.toIpaDisplay(row.headline, row.language || '') : row.headline)
      .then(value => {
        if (version !== renderVersion) return;
        const card = list.querySelector('[data-row-index="' + index + '"]');
        const target = card && card.querySelector('[data-phonetics]');
        if (target) target.textContent = value || row.headline;
      })
      .catch(error => {
        console.warn('Phonetic rendering failed:', error);
        const card = list.querySelector('[data-row-index="' + index + '"]');
        const target = card && card.querySelector('[data-phonetics]');
        if (target) target.textContent = row.headline;
      });
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
