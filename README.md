# DAP Database by JReqTech

A searchable digital audio player database with specs, photos, source links, review links, and verification status.

Live site: https://jreqtech.github.io/dap-database/

## Links

- Repository: https://github.com/jreqtech/dap-database
- Request a missing DAP: https://github.com/jreqtech/dap-database/issues/new?template=missing-dap.yml
- Report a correction: https://github.com/jreqtech/dap-database/issues/new?template=correction.yml
- Source/data notes: [docs/source-data-notes.md](docs/source-data-notes.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)

## Scope

DAP Database focuses on dedicated audiophile and hi-res digital audio players. General consumer MP3 players, smartphones, and audio-focused phones are out of scope unless separate categories are added later.

## Features

- Browse DAPs in card view or table view.
- Search by brand, model, variant, DAC, SoC, OS, or colors.
- Filter by brand, status, source quality, Android-based devices, 4.4mm output, price, year, audio features, and connectivity.
- Open linkable detail views with specs, source links, review links, notes, and photos.
- Request missing DAPs or report corrections through GitHub issues.

## Data

The editable source of truth is `src/data/daps.csv`.

The app reads generated data from `src/data/daps.json`.

After editing the CSV, run:

```bash
npm run generate:data
```

Commit both `src/data/daps.csv` and `src/data/daps.json` so GitHub Pages builds predictably.

For detailed CSV fields, review-link handling, buying-link fields, and image workflow, see [docs/data-workflow.md](docs/data-workflow.md).

## Local Development

```bash
npm install
npm run generate:data
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Deployment

The Vite base path is configured as `/dap-database/`.

The included GitHub Actions workflow builds on pushes to `main`, generates JSON from CSV, and deploys `dist` using GitHub Pages Actions.

Production URL: https://jreqtech.github.io/dap-database/

## Accuracy

Specs are best-effort and source-backed where possible. Values may vary by region, firmware, revision, gain setting, output mode, or measurement method.

AI tools may assist with research, extraction, normalization, and draft notes. Entries are reviewed before being added, but mistakes can still happen. Please report corrections with a source link.

See [docs/source-data-notes.md](docs/source-data-notes.md) for verification labels, source rules, review-link separation, review-site credits, and buying-link separation.

## License And Attribution

- Application code is licensed under the [MIT License](LICENSE).
- Curated database content maintained by JReqTech is licensed under [Creative Commons Attribution-NonCommercial 4.0 International](DATA_LICENSE.md), unless otherwise stated.
- Product images, trademarks, brand names, and manufacturer-owned materials remain owned by their respective rights holders.
- If you reference, adapt, or reuse the database data for non-commercial purposes, please credit JReqTech and link back to this project.

## Credits

Curated by JReqTech.

Thanks to independent review publications such as [Headfonics](https://headfonics.com/), [Headfonia](https://www.headfonia.com/), and [Twister6](https://twister6.com/) for making detailed review archives publicly available.
