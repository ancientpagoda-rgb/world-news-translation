# World News Translation

Licensed-text companion to World (https://github.com/ancientpagoda-rgb/world). It uses Global Voices' CC-BY story feeds and shows a concise one- or two-paragraph summary with attribution, translation, and source links while excluding the globe, imagery, weather layers, geometry, star data, and other visualizations.

## Included

- Country identity and source-language metadata
- Current Global Voices headline text, concise article summary, author, and source URL
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

The refresh workflow reads Global Voices' general feed plus the India country feed, strips images and embedded media, stores the licensed article text, and derives a one- or two-paragraph summary for display. It records the author, source link, and reuse-policy link.

## Source and license

Global Voices content is reused under its Creative Commons Attribution policy. Each displayed summary includes the author, original source link, and attribution-policy link. Images, video, and audio are intentionally excluded because they may have separate rights.
