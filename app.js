const DATA_URL = './data/world-news.json';
const state = { rows: [], query: '', language: 'all', showAllCountries: false };
const list = document.querySelector('#news-list');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
const language = document.querySelector('#language');
const showAll = document.querySelector('#show-all');
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

const LANGUAGE_OVERRIDES = { zh: 'Mandarin Chinese', pa: 'Western Punjabi', fa: 'Iranian Persian', jv: 'Javanese' };
const LANGUAGE_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });

function displayLanguage(row) {
  const code = String(row.nativeLanguage || row.language || '').toLowerCase();
  return LANGUAGE_OVERRIDES[code] || LANGUAGE_NAMES.of(code) || code.toUpperCase() || 'Unknown';
}

function renderWordTrack(text, language = '', colorIndices = null) {
  const value = String(text || '');
  const hasHan = /\p{Script=Han}/u.test(value);
  const tokenPattern = hasHan
    ? /\p{Script=Han}|\p{N}+(?:[.,]\p{N}+)*|(?:(?!\p{Script=Han})[\p{L}\p{M}\p{N}])+(?:[’'-](?:(?!\p{Script=Han})[\p{L}\p{M}\p{N}])+)*|[^\p{L}\p{M}\p{N}]+/gu
    : /\p{N}+(?:[.,]\p{N}+)*|[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*|[^\p{L}\p{M}\p{N}]+/gu;
  const parts = value.match(tokenPattern) || [];
  let wordIndex = 0;
  return parts.map(part => {
    if (!/[\p{L}\p{M}\p{N}]/u.test(part)) return escapeHtml(part);
    const mappedIndex = Array.isArray(colorIndices) && Number.isInteger(colorIndices[wordIndex]) ? colorIndices[wordIndex] : wordIndex;
    const color = WORD_COLORS[((mappedIndex % WORD_COLORS.length) + WORD_COLORS.length) % WORD_COLORS.length];
    const html = '<span class="word-token" data-word-index="' + mappedIndex + '" style="--word-color: ' + color + '">' + escapeHtml(part) + '</span>';
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
  const languageGroups = new Map();
  state.rows.filter(row => (state.showAllCountries || row.isRepresentative) && matches(row)).forEach(row => {
    const key = String(row.nativeLanguage || row.language || 'unknown').toLowerCase();
    if (!languageGroups.has(key)) {
      languageGroups.set(key, {
        key,
        label: displayLanguage(row),
        speakers: Number.isFinite(Number(row.nativeSpeakerMillions)) ? Number(row.nativeSpeakerMillions) : -1,
        rows: []
      });
    }
    languageGroups.get(key).rows.push(row);
  });
  const rows = [...languageGroups.values()]
    .sort((a, b) => {
      const aRanked = a.speakers >= 0;
      const bRanked = b.speakers >= 0;
      return (aRanked === bRanked ? b.speakers - a.speakers || a.label.localeCompare(b.label) : aRanked ? -1 : 1);
    })
    .flatMap(group => group.rows.sort((a, b) => {
      const aCountryRank = Number.isFinite(Number(a.countryPopulationRank)) ? Number(a.countryPopulationRank) : Number.POSITIVE_INFINITY;
      const bCountryRank = Number.isFinite(Number(b.countryPopulationRank)) ? Number(b.countryPopulationRank) : Number.POSITIVE_INFINITY;
      return aCountryRank - bCountryRank || String(a.name || '').localeCompare(String(b.name || ''));
    }));
  const groupCounts = new Map();
  rows.forEach(row => {
    const key = String(row.nativeLanguage || row.language || 'unknown').toLowerCase();
    groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
  });
  let activeGroup = null;
  const version = ++renderVersion;
  status.textContent = groupCounts.size + ' languages · ' + rows.length + (state.showAllCountries ? ' countries shown' : ' representative countries shown') + ' · ' + state.rows.length + ' total countries';
  if (!rows.length) {
    list.innerHTML = '<p class="empty">No matching countries or headlines.</p>';
    return;
  }
  list.innerHTML = rows.map((row, index) => {
    const source = /^https?:\/\//i.test(row.headlineUrl || '')
      ? '<a class="source" href="' + escapeHtml(row.headlineUrl) + '" target="_blank" rel="noopener noreferrer nofollow">Open headline source</a>' : '';
    const date = formatDate(row.headlinePublishedAt);
    const code = String(row.nativeLanguage || row.language || '').toLowerCase();
    const languageLabel = displayLanguage(row);
    const groupKey = code || 'unknown';
    const groupCount = groupCounts.get(groupKey) || 1;
    const groupSpeakers = Number.isFinite(Number(row.nativeSpeakerMillions)) ? ' · ~' + Number(row.nativeSpeakerMillions).toLocaleString() + 'M native speakers' : ' · native-speaker count not sourced';
    const groupHeading = activeGroup === groupKey ? '' : '<div class="language-group"><h2>Language: ' + escapeHtml(languageLabel) + '</h2><p>' + escapeHtml(String(groupCount)) + ' countr' + (groupCount === 1 ? 'y' : 'ies') + groupSpeakers + '</p></div>';
    activeGroup = groupKey;
    const speakerMeta = Number.isFinite(Number(row.nativeSpeakerMillions)) ? ' · Native speakers: ~' + Number(row.nativeSpeakerMillions).toLocaleString() + 'M' : ' · Native speakers: not sourced';
    const original = row.headline || 'No headline available.';
    const phonetics = row.headline ? 'Generating phonetics…' : '—';
    return groupHeading + '<article class="news-card" data-row-index="' + index + '">' +
      '<div class="card-heading"><div><h2>' + escapeHtml(row.name) + '</h2><p class="meta">Country: ' + escapeHtml(row.name) + ' · Language: ' + escapeHtml(languageLabel) + ' (' + escapeHtml(code) + ')' + speakerMeta + (row.headlineSource ? ' · Source: ' + escapeHtml(row.headlineSource) : '') + '</p></div>' +
      (date ? '<time datetime="' + escapeHtml(row.headlinePublishedAt) + '">' + escapeHtml(date) + '</time>' : '') + '</div>' +
      '<div class="headline-block"><p class="label">Original</p><p class="headline original">' + (row.headline ? renderWordTrack(original, row.language) : escapeHtml(original)) + '</p></div>' +
      '<div class="headline-block"><p class="label">IPA phonetics</p><p class="headline phonetics" data-phonetics>' + escapeHtml(phonetics) + '</p></div>' +
      '<div class="headline-block"><p class="label">English translation</p><p class="headline">' + (row.englishHeadline && row.englishHeadline !== 'English translation unavailable' ? renderWordTrack(row.englishHeadline, 'en', row.headlineTranslationWordIndices) : escapeHtml(row.englishHeadline || 'English translation unavailable')) + '</p></div>' +
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
  });
}

function populateLanguages() {
  const languages = [...new Set(state.rows.map(row => row.language).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  language.insertAdjacentHTML('beforeend', languages.map(value => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>').join(''));
}

search.addEventListener('input', () => { state.query = search.value.trim().toLowerCase(); render(); });
language.addEventListener('change', () => { state.language = language.value; render(); });
showAll.addEventListener('change', () => { state.showAllCountries = showAll.checked; render(); });

try {
  state.rows = await (await fetch(DATA_URL)).json();
  populateLanguages();
  render();
} catch (error) {
  console.error(error);
  status.textContent = 'Could not load news data.';
  list.innerHTML = '<p class="empty">The data file could not be loaded.</p>';
}
