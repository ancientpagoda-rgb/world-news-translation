# World News Translation

Headline-focused companion to World (https://github.com/ancientpagoda-rgb/world). It shows country headlines, original text, pronunciation, English translations, and source links while excluding the globe, imagery, weather layers, geometry, star data, and other visualizations.

## Includes

- Country-source headline in its original language
- IPA pronunciation for the headline
- English headline translation when available
- Position-matched word colors across original text, IPA, and translations
- Explicit phrase alignment where one source word expands into multiple English words
- A searchable, filterable text-only browser
- GitHub Actions refreshes headlines from GDELT only; partial successful runs are allowed and never use another provider

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
