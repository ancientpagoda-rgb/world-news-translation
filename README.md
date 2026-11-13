# World News Translation

Headline-focused companion to World (https://github.com/ancientpagoda-rgb/world). It shows country headlines, original text, pronunciation, English translations, and source links while excluding the globe, imagery, weather layers, geometry, star data, and other visualizations.

## Includes

- Country-source headline in its original language
- IPA pronunciation for the headline
- English headline translation when available; new translations are generated offline with NLLB and labeled as machine translations
- Position-matched word colors across original text, IPA, and translations
- Explicit phrase alignment where one source word expands into multiple English words
- A searchable, filterable text-only browser
- Default view shows one representative country per language, ordered by estimated native-speaker count
- Optional “Show all countries” view preserves the full country dataset
- GitHub Actions refreshes only from approved direct publisher feeds every six hours (scheduled at 17 minutes past the hour in UTC), then translates new headlines offline; unregistered countries are left unchanged and no aggregator/provider fallback is used

## Excluded

- Earth imagery and globe rendering
- Weather grids and raster maps
- Star catalogs and 3D or animated visualizations
- Country geometry and visualization-only runtime code

## Local development

Run python -m http.server 8000, then open http://localhost:8000.

## Checks

Run npm run check:syntax and npm run check:data.

The refresh workflow preserves the country-source headline and language fields separately from Global Voices. Headlines are refreshed only from country-approved direct publisher feeds; unregistered countries remain unchanged. Global Voices supplies the licensed article summary, including a dedicated India country feed, while images and embedded media are stripped. The display provides the summary in the country language, its IPA phonetics, and the English source text. Machine-translated summaries are applied only when their source text matches the current article snapshot.

## Source and license

Cards are grouped by estimated native-speaker count when a sourced count is available; countries within each language group use country population rank as the tie-breaker. Languages without a defensible count appear afterward alphabetically. The ranking source is recorded in `data/language-speakers.json`.

Ground News is used only to discover candidate publishers. Displayed headline URLs point to approved original publishers, never Ground News. The approved source registry records the discovery page, publisher domain, and feed URL.

Global Voices content is reused under its Creative Commons Attribution policy. Each displayed summary includes the author, original source link, and attribution-policy link. Images, video, and audio are intentionally excluded because they may have separate rights. English IPA uses a vendored subset of CMUdict under its BSD-3-Clause license. Click-to-speak uses client-side eSpeak NG synthesis through Spellophone, loaded from jsDelivr when a word is clicked. Japanese headlines use a Japanese audio fallback because eSpeak NG cannot read kanji reliably; browser speech synthesis remains the fallback when available.
