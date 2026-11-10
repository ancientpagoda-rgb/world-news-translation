const DATA_URL = './data/world-news.json';
const state = { rows: [], query: '', language: 'all' };
const list = document.querySelector('#news-list');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
const language = document.querySelector('#language');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function formatDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function matches(row) {
  const haystack = [row.name, row.iso2, row.nativeLanguage, row.language, row.headline, row.englishHeadline, row.description]
    .filter(Boolean).join(' ').toLowerCase();
  return (state.language === 'all' || row.language === state.language) && haystack.includes(state.query);
}

function render() {
  const rows = state.rows.filter(matches);
  status.textContent = rows.length + ' of ' + state.rows.length + ' countries';
  if (!rows.length) {
    list.innerHTML = '<p class="empty">No matching countries or headlines.</p>';
    return;
  }
  list.innerHTML = rows.map(row => {
    const source = /^https?:\/\//i.test(row.headlineUrl || '')
      ? '<a class="source" href="' + escapeHtml(row.headlineUrl) + '" target="_blank" rel="noopener noreferrer nofollow">Open source</a>' : '';
    const date = formatDate(row.headlinePublishedAt);
    return '<article class="news-card">' +
      '<div class="card-heading"><div><h2>' + escapeHtml(row.name) + '</h2><p class="meta">' + escapeHtml(row.iso3 || row.iso2) + ' · ' + escapeHtml(row.language || row.nativeLanguage || 'Unknown language') + '</p></div>' +
      (date ? '<time datetime="' + escapeHtml(row.headlinePublishedAt) + '">' + escapeHtml(date) + '</time>' : '') + '</div>' +
      '<div class="headline-block"><p class="label">Original</p><p class="headline original">' + escapeHtml(row.headline || 'No headline available.') + '</p></div>' +
      '<div class="headline-block"><p class="label">English translation</p><p class="headline">' + escapeHtml(row.englishHeadline || 'English translation unavailable') + '</p></div>' +
      (row.description ? '<p class="description">' + escapeHtml(row.description) + '</p>' : '') + source + '</article>';
  }).join('');
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
