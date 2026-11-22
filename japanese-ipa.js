(() => {
  "use strict";

  const MORA = {
    "あ":"a", "い":"i", "う":"ɯ", "え":"e", "お":"o",
    "か":"ka", "き":"kʲi", "く":"kɯ", "け":"ke", "こ":"ko",
    "が":"ga", "ぎ":"gʲi", "ぐ":"gɯ", "げ":"ge", "ご":"go",
    "さ":"sa", "し":"ɕi", "す":"sɯ", "せ":"se", "そ":"so",
    "ざ":"za", "じ":"dʑi", "ず":"zɯ", "ぜ":"ze", "ぞ":"zo",
    "た":"ta", "ち":"tɕi", "つ":"tsɯ", "て":"te", "と":"to",
    "だ":"da", "ぢ":"dʑi", "づ":"dzɯ", "で":"de", "ど":"do",
    "な":"na", "に":"ɲi", "ぬ":"nɯ", "ね":"ne", "の":"no",
    "は":"ha", "ひ":"çi", "ふ":"ɸɯ", "へ":"he", "ほ":"ho",
    "ば":"ba", "び":"bʲi", "ぶ":"bɯ", "べ":"be", "ぼ":"bo",
    "ぱ":"pa", "ぴ":"pʲi", "ぷ":"pɯ", "ぺ":"pe", "ぽ":"po",
    "ま":"ma", "み":"mʲi", "む":"mɯ", "め":"me", "も":"mo",
    "や":"ja", "ゆ":"jɯ", "よ":"jo",
    "ら":"ɾa", "り":"ɾʲi", "る":"ɾɯ", "れ":"ɾe", "ろ":"ɾo",
    "わ":"wa", "を":"o", "ん":"ɴ", "ゔ":"vɯ",
    "ぁ":"a", "ぃ":"i", "ぅ":"ɯ", "ぇ":"e", "ぉ":"o",
  };

  const DIGRAPHS = {
    "きゃ":"kʲa", "きゅ":"kʲɯ", "きょ":"kʲo", "ぎゃ":"gʲa", "ぎゅ":"gʲɯ", "ぎょ":"gʲo",
    "しゃ":"ɕa", "しゅ":"ɕɯ", "しょ":"ɕo", "じゃ":"dʑa", "じゅ":"dʑɯ", "じょ":"dʑo",
    "ちゃ":"tɕa", "ちゅ":"tɕɯ", "ちょ":"tɕo", "ぢゃ":"dʑa", "ぢゅ":"dʑɯ", "ぢょ":"dʑo",
    "にゃ":"ɲa", "にゅ":"ɲɯ", "にょ":"ɲo", "ひゃ":"ça", "ひゅ":"çɯ", "ひょ":"ço",
    "びゃ":"bʲa", "びゅ":"bʲɯ", "びょ":"bʲo", "ぴゃ":"pʲa", "ぴゅ":"pʲɯ", "ぴょ":"pʲo",
    "みゃ":"mʲa", "みゅ":"mʲɯ", "みょ":"mʲo", "りゃ":"ɾʲa", "りゅ":"ɾʲɯ", "りょ":"ɾʲo",
    "ふぁ":"ɸa", "ふぃ":"ɸi", "ふぇ":"ɸe", "ふぉ":"ɸo", "ふゅ":"ɸjɯ",
    "うぃ":"wi", "うぇ":"we", "うぉ":"wo", "てぃ":"ti", "でぃ":"di", "とぅ":"tɯ", "どぅ":"dɯ",
    "つぁ":"tsa", "つぃ":"tsi", "つぇ":"tse", "つぉ":"tso", "ゔぁ":"va", "ゔぃ":"vi", "ゔぇ":"ve", "ゔぉ":"vo",
  };

  const DIGRAPH_KEYS = Object.keys(DIGRAPHS).sort((a, b) => b.length - a.length);
  const KATAKANA_START = 0x30a1;
  const KATAKANA_END = 0x30f6;

  function toHiragana(value) {
    return String(value || "").replace(/[\u30a1-\u30f6]/g, (char) => {
      const code = char.charCodeAt(0);
      return String.fromCharCode(code >= KATAKANA_START && code <= KATAKANA_END ? code - 0x60 : code);
    });
  }

  function nextPhonetic(units, index) {
    for (let i = index + 1; i < units.length; i += 1) {
      if (units[i].ipa) return units[i].ipa;
      if (/\s|[、。,.!?！？]/u.test(units[i].raw || "")) return "";
    }
    return "";
  }

  function nasalFor(next) {
    if (/^[mbp]/u.test(next)) return "m";
    if (/^[kg]/u.test(next)) return "ŋ";
    if (/^[tdnɾ]/u.test(next)) return "n";
    if (/^(?:tɕ|dʑ|ɕ)/u.test(next)) return "ɲ";
    return "ɴ";
  }

  function geminate(next) {
    if (!next) return "ʔ";
    const prefixes = ["tɕ", "dʑ", "ts", "ɸ", "ɕ", "ç", "k", "g", "s", "z", "t", "d", "n", "h", "b", "p", "m", "ɾ"];
    const prefix = prefixes.find((value) => next.startsWith(value));
    return prefix ? prefix + "ː" + next.slice(prefix.length) : "ː" + next;
  }

  function japaneseIpa(input) {
    const text = toHiragana(input).normalize("NFC");
    const units = [];
    for (let index = 0; index < text.length;) {
      const char = text[index];
      const pair = text.slice(index, index + 2);
      if (DIGRAPHS[pair]) { units.push({ raw: pair, ipa: DIGRAPHS[pair] }); index += 2; continue; }
      if (char === "っ") { units.push({ raw: char, geminate: true }); index += 1; continue; }
      if (char === "ー") { units.push({ raw: char, long: true }); index += 1; continue; }
      if (char === "ん") { units.push({ raw: char, nasal: true }); index += 1; continue; }
      if (MORA[char]) { units.push({ raw: char, ipa: MORA[char] }); index += 1; continue; }
      units.push({ raw: char, ipa: /[\p{L}\p{N}]/u.test(char) ? char : "" }); index += 1;
    }

    return units.map((unit, index) => {
      if (unit.nasal) return nasalFor(nextPhonetic(units, index));
      if (unit.geminate) return geminate(nextPhonetic(units, index));
      if (unit.long) return "ː";
      return unit.ipa || unit.raw;
    }).join("").replace(/\s+/g, " ").trim();
  }

  window.toJapaneseIpa = japaneseIpa;
})();
