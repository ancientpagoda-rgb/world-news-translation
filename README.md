# World News Translation

Licensed-text companion to World (https://github.com/ancientpagoda-rgb/world). It uses Global Voices' CC-BY story feeds and shows a concise one- or two-paragraph summary with attribution, translation, and source links while excluding the globe, imagery, weather layers, geometry, star data, and other visualizations.

## Included

- Country identity and source-language metadata
- Country-source headline in its original language, IPA phonetics, and English translation
- Concise Global Voices summary in the country language, IPA phonetics, English translation, author, and licensed source URL
- Offline English headline translations
- Language-aware IPA phonetics for source headlines and summaries
- CMUdict-backed English pronunciation lookup with a rule-based fallback
- Position-matched word colors across original text, IPA, and translations
- Explicit phrase alignment for translations where one source word expands into multiple English words
- A searchable, filterable text-only browser
- GitHub Actions refreshes every six hours

## Excluded

- Earth imagery and globe rendering
- Weather grids and raster maps
- Star catalogs and 3D or animated visualizations
- Country geometry and visualization-only runtime code

## Local development

Run python -m http.server 8000, then open http://localhost:8000.

## Checks

Run npm run check:syntax and npm run check:data.

The refresh workflow preserves the country-source headline and language fields separately from Global Voices. Global Voices supplies the licensed article summary, including a dedicated India country feed, while images and embedded media are stripped. The display provides the summary in the country language, its IPA phonetics, and the English source text. Machine-translated summaries are applied only when their source text matches the current article snapshot.

## Source and license

Global Voices content is reused under its Creative Commons Attribution policy. Each displayed summary includes the author, original source link, and attribution-policy link. Images, video, and audio are intentionally excluded because they may have separate rights. English IPA uses a vendored subset of CMUdict under its BSD-3-Clause license.
