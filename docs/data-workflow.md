# Data Workflow

This document covers the operational workflow for maintaining DAP Database data.

## Source Files

The editable source is:

- `src/data/daps.csv`

Generated application data is:

- `src/data/daps.json`

The app reads `src/data/daps.json`, but the CSV is the maintained source of truth.

## Basic Update Flow

1. Edit `src/data/daps.csv`.
2. Keep source links and notes visible and specific.
3. Run `npm run generate:data`.
4. Check the generated summary for verification and source counts.
5. Commit both `src/data/daps.csv` and `src/data/daps.json`.

## Local Commands

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

## Optional Review Links

Review-link CSV fields:

- `review_links`
- `review_notes`

Review links use labeled-link format:

```text
Label|URL; Label|URL
```

Review links are for further reading and subjective impressions. They are separate from source links used to verify specs unless a row explicitly uses a review as its `Source URL`.

## Optional Buying Links

Buying-link CSV fields are supported but intentionally blank unless populated manually:

- `official_store_url`
- `buy_links`
- `buy_notes`

Buying links use labeled-link format:

```text
Label|URL; Label|URL
```

Do not use buy links as spec sources.

## Media and Image Usage

Image fields are optional.

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
3. If neither exists, the app shows a placeholder.

## Safe Image Workflow

Do not scrape Google Images or random websites. Use official product photos from brand pages, press kits, official stores, user-owned photos, or images with clear permission.

Product images remain owned by their respective brands, manufacturers, retailers, reviewers, or original sources.

Local image rules:

- Store original downloaded files in `public/assets/images/daps-original/`.
- Store optimized WebP files in `public/assets/images/daps/`.
- Use lowercase kebab-case filenames for optimized output.
- Use `.webp` for optimized output.
- Recommended filename format: `brand-model-variant-color.webp`.

Manual workflow:

1. Find an official product photo from a brand page, press kit, or official store.
2. Save the source URL in `image_source_url`.
3. Save the credit in `image_credit`.
4. Download the image manually into `public/assets/images/daps-original/`.
5. Run `npm run process:images`.
6. Put the generated `.webp` filename in `image_filename`.
7. Run `npm run generate:data`.
8. Check the image in card view, table view, and details view.

Image optimizer:

```bash
npm run process:images
```

The script reads from `public/assets/images/daps-original/`, writes optimized `.webp` files to `public/assets/images/daps/`, resizes to fit within 800px by 800px, preserves aspect ratio, avoids cropping, and uses WebP quality around 82. It does not overwrite existing files unless you pass:

```bash
npm run process:images -- --overwrite
```
