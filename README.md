# World News Translation

Licensed-text companion to World (https://github.com/ancientpagoda-rgb/world). It uses Global Voices' CC-BY story feed and keeps the country articles, attribution, translations, and source links while excluding the globe, imagery, weather layers, geometry, star data, and other visualizations.

## Included

- Country identity and source-language metadata
- Current Global Voices headline text, full article text, author, and source URL
- Offline English headline translations
- Language-aware IPA phonetics for source headlines
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

The refresh workflow reads Global Voices' full-story RSS feed, strips images and embedded media, stores text-only article bodies, and records the author, source link, and reuse-policy link. Global Voices permits reuse and translation under its attribution policy unless an article says otherwise.

## Source and license

Global Voices content is reused under its Creative Commons Attribution policy. Each article includes the author, original source link, and attribution-policy link. Images, video, and audio are intentionally excluded because they may have separate rights.
