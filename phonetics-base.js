(() => {
  "use strict";

  function splitSourceSuffix(text) {
    const input = String(text || "").trim();
    for (const separator of [" - ", " — ", " | "]) {
      const index = input.lastIndexOf(separator);
      if (index > 20 && input.slice(index + separator.length).length <= 80) {
        return { body: input.slice(0, index).trim(), suffix: separator + input.slice(index + separator.length).trim() };
      }
    }
    return { body: input, suffix: "" };
  }

  const COMMON = new Map([
    ["the", "ðə"], ["a", "ə"], ["an", "æn"], ["and", "ænd"], ["of", "əv"], ["to", "tə"],
    ["for", "fɔːr"], ["from", "frʌm"], ["in", "ɪn"], ["on", "ɒn"], ["at", "æt"], ["by", "baɪ"],
    ["is", "ɪz"], ["are", "ɑːr"], ["was", "wɒz"], ["were", "wɜːr"], ["be", "biː"],
    ["new", "njuː"], ["news", "njuːz"], ["world", "wɜːrld"], ["war", "wɔːr"],
  ]);

  const REPLACEMENTS = [
    [/eigh/g, "eɪ"], [/igh/g, "aɪ"], [/tion/g, "ʃən"], [/sion/g, "ʒən"], [/ture\\b/g, "tʃər"],
    [/ph/g, "f"], [/kn/g, "n"], [/wr/g, "r"], [/wh/g, "w"], [/qu/g, "kw"], [/ck/g, "k"],
    [/ee/g, "iː"], [/ea/g, "iː"], [/ie\\b/g, "aɪ"], [/ai/g, "eɪ"], [/ay\\b/g, "eɪ"],
    [/oa/g, "əʊ"], [/ow\\b/g, "əʊ"], [/ou/g, "aʊ"], [/oi/g, "ɔɪ"], [/oy\\b/g, "ɔɪ"],
    [/au/g, "ɔː"], [/aw/g, "ɔː"], [/er\\b/g, "ɜːr"], [/ir/g, "ɜːr"], [/ur/g, "ɜːr"],
    [/ar/g, "aːr"], [/or/g, "ɔːr"], [/oo/g, "uː"],
  ];

  function englishIpa(text) {
    return (String(text || "").match(/\\s+|[^\\s]+/g) || []).map(part => {
      if (/^\\s+$/.test(part)) return part;
      const match = part.match(/^([^A-Za-z]*)(.*?)([^A-Za-z]*)$/);
      const prefix = match?.[1] || "", core = match?.[2] || part, suffix = match?.[3] || "";
      const lower = core.toLowerCase().replace(/[’']/g, "");
      if (!lower) return part;
      if (COMMON.has(lower)) return prefix + COMMON.get(lower) + suffix;
      let word = lower;
      for (const [pattern, replacement] of REPLACEMENTS) word = word.replace(pattern, replacement);
      word = word.replace(/c(?=[eiy])/g, "s").replace(/g(?=[eiy])/g, "dʒ").replace(/x/g, "ks");
      word = word.replace(/a/g, "æ").replace(/e/g, "ɛ").replace(/i/g, "ɪ").replace(/o/g, "ɒ").replace(/u/g, "ʌ").replace(/y/g, "j");
      word = word.replace(/ɛ\\b/g, "");
      return prefix + word + suffix;
    }).join("");
  }

  function isProbablyEnglishText(text) {
    const value = String(text || "").trim();
    if (!value || /[^\\p{Script=Latin}\\p{P}\\p{N}\\s]/u.test(value)) return false;
    return (value.match(/[A-Za-z]{2,}/g) || []).length >= 2;
  }

  async function loadPinyinPro() {
    const module = await import("./vendor/pinyin-pro-3.26.0.mjs");
    return module;
  }

  window.splitSourceSuffix = splitSourceSuffix;
  window.isProbablyEnglishText = isProbablyEnglishText;
  window.loadPinyinPro = loadPinyinPro;
  window.toEnglishDisplay = async (input) => String(input || "");
  window.toIpaDisplay = async (input, language = "") => {
    const text = String(input || "");
    const body = splitSourceSuffix(text).body;
    return (String(language).toLowerCase().startsWith("en") || isProbablyEnglishText(body)) ? englishIpa(body) : body;
  };
  window.hydrateNewsItem = async () => {};
})();
