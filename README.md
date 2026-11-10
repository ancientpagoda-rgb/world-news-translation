# World News Translation

Text-only companion to World (https://github.com/ancientpagoda-rgb/world). It keeps the country news and translation pipeline while intentionally excluding the globe, imagery, weather layers, geometry, star data, and other visualizations.

## Included

- Country identity and source-language metadata
- Current headline text and source URL
- Offline English headline translations
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

The refresh workflow uses the source project's headline selection rules and offline NLLB/Argos translation stages. Translation output is labeled as unavailable rather than silently inventing text when a source cannot be translated.
