import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL("../japanese-ipa.js", import.meta.url), "utf8"), context);
const convert = context.window.toJapaneseIpa;
assert.equal(typeof convert, "function");

const cases = [
  ["こんにちは", "koɴ"],
  ["じゅうたくからげんきん2500まんえん", "dʑ"],
  ["がっこう", "kː"],
  ["カタカナ", "katakana"],
];
for (const [input, expected] of cases) {
  const output = convert(input);
  assert.ok(output, "empty IPA for " + input);
  assert.doesNotMatch(output, /[ぁ-ゖァ-ヺ一-龯]/u, "source script leaked for " + input + ": " + output);
  assert.ok(output.includes(expected), "expected " + expected + " in " + input + ": " + output);
}
console.log("Japanese IPA checks passed");
