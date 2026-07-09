# DAP Database by JReqTech

A community-friendly digital audio player database with specs, sources, and validation status.

## Links

- Live site: https://jrequiroso.github.io/dap-database/
- Repository: https://github.com/jrequiroso/dap-database
- Request a missing DAP: https://github.com/jrequiroso/dap-database/issues/new?template=missing-dap.yml
- Report a correction: https://github.com/jrequiroso/dap-database/issues/new?template=correction.yml

## Goals

- Make DAP specs easier to compare.
- Keep sources visible.
- Separate official, official screenshot, review, retail, and web-verified data.
- Avoid unsourced claims where possible.
- Keep the project static and easy to host on GitHub Pages.

## Current MVP Features

- Browse DAP database.
- Search by brand, model, variant, DAC, SoC, OS, or colors.
- Filter by brand, status, verification status, Android-based devices, and 4.4mm output.
- Sort by brand, model, release year, MSRP, battery, SE power, and balanced power.
- View official product links when available.
- View source links and notes.
- View color variants when available.
- Optional image support.
- Mobile card view and desktop table view.

## Verification Status Meanings

- Verified - Official: confirmed from an official brand page.
- Verified - Official Screenshot: confirmed from an official brand screenshot or official spec image.
- Verified - Review: confirmed from a reliable review.
- Verified - Retail/Web: confirmed from retailer or public spec listing.
- Verified - Web: confirmed from general web source.
- Partial: source exists, but specs are incomplete.
- Partial - Official: official page exists, but full specs are not readable.
- Needs Source: source still missing.

## Data Workflow

- Edit `src/data/daps.csv`.
- Run `npm run generate:data`.
- This creates `src/data/daps.json`.
- The app reads `src/data/daps.json`.
- Commit both CSV and JSON so GitHub Pages builds predictably.

## Data Location

The editable source is `src/data/daps.csv`. Generated application data is `src/data/daps.json`.

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

## Updating the Database

1. Edit `src/data/daps.csv`.
2. Keep source links and notes visible and specific.
3. Run `npm run generate:data`.
4. Check the generated summary for verification and source counts.
5. Commit both `src/data/daps.csv` and `src/data/daps.json`.

## Media and Image Usage

- Image fields are optional.
- Do not hotlink random review images.
- Prefer official product image URLs, user-owned photos, or images with clear permission.
- Color variants can be added using the Colors column in CSV.
- Colors should use slash-separated values like `Black / Silver / Green`.

## Safe Image Workflow

Do not scrape Google Images or random websites. Use official product photos from brand pages, press kits, official stores, user-owned photos, or images with explicit permission.

Supported optional CSV image fields:

- `image_filename`
- `image_url`
- `image_source_url`
- `image_credit`
- `color_variants`

Existing title-case image columns are also still supported for compatibility:

- `Image URL`
- `Image Source URL`
- `Image Credit`
- `Colors`

Image display priority:

1. If `image_filename` exists, the app loads `/assets/images/daps/{image_filename}`.
2. If `image_filename` is blank but `image_url` exists, the app uses `image_url` as a fallback.
3. If neither exists, the app shows a clean placeholder.

Local image rules:

- Store original downloaded files in `public/assets/images/daps-original/`.
- Store optimized WebP files in `public/assets/images/daps/`.
- Use lowercase kebab-case filenames.
- Use `.webp` for optimized output.
- Recommended filename format: `brand-model-variant-color.webp`.
- Examples:
  - `fiio-jm21-refresh-blue.webp`
  - `hiby-r4-green.webp`
  - `astell-kern-a-norma-sr35-silver.webp`
  - `shanling-m3-ultra-black.webp`

Manual workflow:

1. Find an official product photo from a brand page, press kit, or official store.
2. Save the source URL in `image_source_url`.
3. Save the credit in `image_credit`.
4. Download the image manually into `public/assets/images/daps-original/`.
5. Name it using lowercase kebab-case.
6. Run `npm run process:images`.
7. Put the generated `.webp` filename in `image_filename`.
8. Run `npm run generate:data`.
9. Check the image in card view, table view, details view, and comparison view.

Image optimizer:

```bash
npm run process:images
```

The script reads from `public/assets/images/daps-original/`, writes optimized `.webp` files to `public/assets/images/daps/`, resizes to fit within 800px by 800px, preserves aspect ratio, avoids cropping, and uses WebP quality around 82. It does not overwrite existing files unless you pass:

```bash
npm run process:images -- --overwrite
```

## GitHub Pages Deployment

The Vite base path is configured as `/dap-database/`. The included GitHub Actions workflow builds on pushes to `main`, generates JSON from CSV, and deploys `dist` using GitHub Pages Actions. Set the repository Pages source to GitHub Actions.

Production URL: https://jrequiroso.github.io/dap-database/

## Future Plans

- Compare mode for selecting 2 to 4 DAPs side by side.
- Dedicated detail page or detail modal for each DAP.
- Better mobile card layout with expandable spec groups.
- Export filtered results to CSV or JSON.
- Improved import/update workflow from Google Sheets export.
- Better image handling with local optimized thumbnails, official image source tracking, user-owned image gallery, and image permission notes.
- Advanced filters for price range, release year range, DAC chip, Android-based only, 4.4mm balanced output, color variant, verified official sources only, and active/discontinued/upcoming.
- Source quality indicators.
- Changelog page showing database updates.
- Submit correction and missing DAP request links that open GitHub issue templates.
- Optional dark mode.
- Optional shareable filter URLs later.
- Optional static generated JSON files for brands or models later.
- Optional public contribution guide for people who want to help add or verify DAPs.

## Contributions and Corrections

Corrections and missing DAP suggestions are welcome through GitHub issues. Please include a source link and notes that explain what should change.

- Request a missing DAP: https://github.com/jrequiroso/dap-database/issues/new?template=missing-dap.yml
- Report a correction: https://github.com/jrequiroso/dap-database/issues/new?template=correction.yml

## Credits

Curated by JReqTech.
