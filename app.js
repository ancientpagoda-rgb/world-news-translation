const DATA_URL = './data/world-news.json?rev=' + Date.now();
const state = { rows: [], query: '', language: 'all', showAllCountries: false };
const list = document.querySelector('#news-list');
const status = document.querySelector('#status');
const search = document.querySelector('#search');
const language = document.querySelector('#language');
const showAll = document.querySelector('#show-all');
let renderVersion = 0;

function coordinatedTokens(card, index) {
  return [...card.querySelectorAll('.word-token[data-word-index], .coordinated-word[data-word-index]')]
    .filter(token => {
      const indices = String(token.dataset.wordIndices || token.dataset.wordIndex).split(',');
      return indices.includes(index);
    });
}

list.addEventListener('pointerover', event => {
  const token = event.target.closest?.('[data-word-index]');
  if (!token || !list.contains(token)) return;
  const card = token.closest('.news-card');
  if (!card) return;
  card.querySelectorAll('.is-coordinated-hover').forEach(item => item.classList.remove('is-coordinated-hover'));
  coordinatedTokens(card, token.dataset.wordIndex).forEach(item => item.classList.add('is-coordinated-hover'));
});

list.addEventListener('pointerout', event => {
  const token = event.target.closest?.('[data-word-index]');
  if (!token || !list.contains(token)) return;
  if (event.relatedTarget && token.contains(event.relatedTarget)) return;
  const card = token.closest('.news-card');
  if (card) card.querySelectorAll('.is-coordinated-hover').forEach(item => item.classList.remove('is-coordinated-hover'));
});

list.addEventListener('click', event => {
  const token = event.target.closest?.('.word-token[data-word-index], .coordinated-word[data-word-index]');
  const card = token?.closest('.news-card');
  if (token && card) speakToken(token, card);
});

list.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const token = event.target.closest?.('.word-token[data-word-index], .coordinated-word[data-word-index]');
  const card = token?.closest('.news-card');
  if (!token || !card) return;
  event.preventDefault();
  speakToken(token, card);
});

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

const WORD_COLORS = ['239 71 111', '17 138 178', '255 209 102', '131 56 236', '6 214 160', '247 127 0', '0 180 216', '255 112 166', '138 201 38', '67 97 238', '249 132 74', '42 157 143'];

const LANGUAGE_OVERRIDES = { zh: 'Mandarin Chinese', pa: 'Western Punjabi', fa: 'Iranian Persian', jv: 'Javanese' };
const LANGUAGE_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });

function displayLanguage(row) {
  const code = String(row.nativeLanguage || row.language || '').toLowerCase();
  return LANGUAGE_OVERRIDES[code] || LANGUAGE_NAMES.of(code) || code.toUpperCase() || 'Unknown';
}

const SPEECH_LANGUAGES = { zh: 'zh-CN', es: 'es-MX', en: 'en-US', hi: 'hi-IN', pt: 'pt-BR', ja: 'ja-JP', vi: 'vi-VN', it: 'it-IT', my: 'my-MM', pl: 'pl-PL', nl: 'nl-NL', bn: 'bn-BD', am: 'am-ET', th: 'th-TH', fr: 'fr-FR', de: 'de-DE', fa: 'fa-IR', ur: 'ur-PK', tr: 'tr-TR', id: 'id-ID', ko: 'ko-KR' };
const ESPEAK_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@spelling-creator/spellophone@0.2.1/dist/browser.js';
const ESPEAK_VOICES = { zh: 'cmn', es: 'es', en: 'en-us', hi: 'hi', pt: 'pt', ja: 'jpx/ja', vi: 'vi', it: 'it', my: 'my', pl: 'pl', nl: 'nl', bn: 'bn', am: 'am', th: 'th', fr: 'fr-fr', de: 'de', fa: 'fa', ur: 'ur', ru: 'zle/ru', tr: 'tr', id: 'id', ko: 'ko' };
let espeakEnginePromise = null;
let activeAudioContext = null;
let activeAudioSource = null;
let activeHtmlAudio = null;

function speechLanguage(code) {
  const normalized = String(code || '').toLowerCase().split('-')[0];
  return SPEECH_LANGUAGES[normalized] || normalized || 'en-US';
}

function announceSpeech(message) {
  const previous = status.textContent;
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) status.textContent = previous;
  }, 4000);
}

function speakWithBrowserVoice(text, language) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 0.9;
  const voices = synth.getVoices();
  const base = language.split('-')[0].toLowerCase();
  const voice = voices.find(item => item.lang.toLowerCase() === language.toLowerCase())
    || voices.find(item => item.lang.toLowerCase().split('-')[0] === base)
    || voices.find(item => item.default);
  if (voice) utterance.voice = voice;
  synth.resume();
  synth.speak(utterance);
}

function espeakVoice(language) {
  return ESPEAK_VOICES[String(language || '').toLowerCase().split('-')[0]] || 'en-us';
}

async function getEspeakEngine() {
  if (!espeakEnginePromise) {
    espeakEnginePromise = import(ESPEAK_MODULE_URL).then(async module => ({
      module,
      engine: await module.createEspeak({ cdn: 'jsdelivr', languages: ['en'] }),
    }));
  }
  return espeakEnginePromise;
}

function stopActiveAudio() {
  if (activeAudioSource) {
    try { activeAudioSource.stop(); } catch {}
    activeAudioSource.disconnect();
    activeAudioSource = null;
  }
  if (activeHtmlAudio) {
    activeHtmlAudio.pause();
    activeHtmlAudio.removeAttribute('src');
    activeHtmlAudio.load();
    activeHtmlAudio = null;
  }
}

function speakWithJapaneseAudio(text, fallback) {
  if (!text || text.length > 200) return false;
  stopActiveAudio();
  const audio = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q=' + encodeURIComponent(text));
  audio.preload = 'auto';
  const fail = () => {
    if (activeHtmlAudio !== audio) return;
    activeHtmlAudio = null;
    fallback();
  };
  audio.addEventListener('error', fail, { once: true });
  audio.addEventListener('ended', () => { if (activeHtmlAudio === audio) activeHtmlAudio = null; }, { once: true });
  activeHtmlAudio = audio;
  audio.play()?.catch(fail);
  return true;
}

function speakWithWasmEngine(text, language, fallback) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return false;
  if (!activeAudioContext) activeAudioContext = new AudioContextCtor();
  const context = activeAudioContext;
  context.resume().catch(() => {});
  announceSpeech('Loading speech engine…');
  getEspeakEngine().then(async ({ module, engine }) => {
    const voice = espeakVoice(language);
    await engine.loadVoice(voice);
    const result = engine.synthesize(text, { voice });
    const wav = module.encodeWav(result.samples, result.sampleRate);
    const bytes = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength);
    const buffer = await context.decodeAudioData(bytes);
    stopActiveAudio();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => { if (activeAudioSource === source) activeAudioSource = null; };
    activeAudioSource = source;
    source.start();
  }).catch(error => {
    console.warn('Client TTS failed:', error);
    fallback();
  });
  return true;
}

function speakToken(token, card) {
  const index = token.dataset.wordIndex;
  const block = token.closest('.headline-block');
  const label = block?.querySelector('.label')?.textContent || '';
  let text = token.textContent.trim();
  let language = speechLanguage(card.dataset.language);
  if (label === 'IPA PHONETICS') {
    const original = [...card.querySelectorAll('.original [data-word-index]')].find(item => item.dataset.wordIndex === index);
    text = original?.textContent.trim() || text;
  } else if (label === 'ENGLISH TRANSLATION') {
    language = 'en-US';
  }
  if (label !== 'ENGLISH TRANSLATION') {
    const readings = String(card.dataset.speechWords || '').split('|');
    text = readings[Number(index)] || text;
    if (String(language).toLowerCase().startsWith('ja')) {
      // Japanese needs the compound reading when no per-word reading is available.
      text = readings[Number(index)] || card.dataset.speechText || card.querySelector('.original')?.textContent.trim() || text;
    }
  }
  if (!text) return;
  const synth = window.speechSynthesis;
  synth?.cancel();
  const browserFallback = () => {
    if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
      announceSpeech('Speech synthesis is unavailable in this browser.');
      return;
    }
    speakWithBrowserVoice(text, language);
  };
  const baseLanguage = String(language).toLowerCase().split('-')[0];
  if (baseLanguage === 'ja') {
    const japaneseVoice = [...(synth?.getVoices?.() || [])].some(voice => voice.lang?.toLowerCase().split('-')[0] === 'ja');
    if (japaneseVoice) {
      speakWithBrowserVoice(text, language);
      return;
    }
    if ((card.dataset.speechText || card.dataset.speechWords) && speakWithWasmEngine(text, language, browserFallback)) return;
    if (speakWithJapaneseAudio(text, () => speakWithWasmEngine(text, language, browserFallback))) return;
  }
  if (speakWithWasmEngine(text, language, browserFallback)) return;
  if (synth && typeof window.SpeechSynthesisUtterance === 'function' && synth.getVoices().length) {
    speakWithBrowserVoice(text, language);
    return;
  }
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
    announceSpeech('No local speech engine is available.');
    return;
  }
  let retried = false;
  const retry = () => {
    if (retried) return;
    retried = true;
    synth.removeEventListener?.('voiceschanged', retry);
    speakWithBrowserVoice(text, language);
  };
  synth.addEventListener?.('voiceschanged', retry, { once: true });
  window.setTimeout(() => {
    if (retried) return;
    retried = true;
    synth.removeEventListener?.('voiceschanged', retry);
    if (!synth.getVoices().length) announceSpeech('No browser speech voice is available.');
    speakWithBrowserVoice(text, language);
  }, 1000);
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
    const html = '<span class="word-token" data-word-index="' + mappedIndex + '" role="button" tabindex="0" title="Click to hear" style="--word-color: ' + color + '">' + escapeHtml(part) + '</span>';
    wordIndex += 1;
    return html;
  }).join('');
}

function renderIpaGroups(groups) {
  return (Array.isArray(groups) ? groups : []).map(group => {
    const indices = Array.isArray(group.indices) ? group.indices : [];
    const index = Number.isInteger(indices[0]) ? indices[0] : 0;
    const color = WORD_COLORS[((index % WORD_COLORS.length) + WORD_COLORS.length) % WORD_COLORS.length];
    return '<span class="word-token" data-word-index="' + index + '" data-word-indices="' + indices.join(',') + '" role="button" tabindex="0" title="Click to hear" style="--word-color: ' + color + '">' + escapeHtml(group.ipa || '') + '</span>';
  }).join(' ');
}

function renderColoredArticle(text, language = '') {
  return String(text || '').split(/\n{2,}/).filter(Boolean).map(paragraph => '<p>' + renderWordTrack(paragraph, language) + '</p>').join('');
}

function renderEnglishHeadline(row) {
  const text = String(row.englishHeadline || '');
  if (Array.isArray(row.headlineTranslationWordIndices)) return renderWordTrack(text, 'en', row.headlineTranslationWordIndices);
  if (row.headlineTranslationNote === 'offline machine translation') return escapeHtml(text);
  return renderWordTrack(text, 'en');
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
    const phonetics = row.headline ? (Array.isArray(row.speechIpaWords) ? row.speechIpaWords.join(' ') : 'Generating phonetics…') : '—';
    return groupHeading + '<article class="news-card" data-row-index="' + index + '" data-language="' + escapeHtml(row.language || '') + '" data-speech-text="' + escapeHtml(row.speechText || '') + '" data-speech-words="' + escapeHtml((row.speechWords || []).join('|')) + '" data-speech-ipa-groups="' + escapeHtml(JSON.stringify(row.speechIpaGroups || [])) + '">' +
      '<div class="card-heading"><div><h2>' + escapeHtml(row.name) + '</h2><p class="meta">Country: ' + escapeHtml(row.name) + ' · Language: ' + escapeHtml(languageLabel) + ' (' + escapeHtml(code) + ')' + speakerMeta + (row.headlineSource ? ' · Source: ' + escapeHtml(row.headlineSource) : '') + '</p></div>' +
      (date ? '<time datetime="' + escapeHtml(row.headlinePublishedAt) + '">' + escapeHtml(date) + '</time>' : '') + '</div>' +
      '<div class="headline-block"><p class="label">Original</p><p class="headline original">' + (row.headline ? renderWordTrack(original, row.language) : escapeHtml(original)) + '</p></div>' +
      '<div class="headline-block"><p class="label">IPA phonetics</p><p class="headline phonetics" data-phonetics>' + (Array.isArray(row.speechIpaGroups) ? renderIpaGroups(row.speechIpaGroups) : escapeHtml(phonetics)) + '</p></div>' +
      '<div class="headline-block"><p class="label">English translation</p><p class="headline">' + (row.englishHeadline && row.englishHeadline !== 'English translation unavailable' ? renderEnglishHeadline(row) : escapeHtml(row.englishHeadline || 'English translation unavailable')) + '</p></div>' +
      source + '</article>';
  }).join('');

  rows.forEach((row, index) => {
    if (!row.headline) return;
    if (Array.isArray(row.speechIpaGroups)) return;
    Promise.resolve(Array.isArray(row.speechIpaWords)
      ? row.speechIpaWords.join(' ')
      : (window.toIpaDisplay ? window.toIpaDisplay(row.headline, row.language || '') : row.headline))
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
