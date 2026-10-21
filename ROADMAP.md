# DAP Database Roadmap

This roadmap tracks source-backed DAP model additions planned for the public DAP Database. It is intentionally prioritized instead of being a complete wish list.

The database source of truth is `src/data/daps.csv`; `src/data/daps.json` is generated from it. Do not use this roadmap as a list of existing rows. Before adding any model, check the CSV first to avoid duplicates.

Only keep model names here when there is a reasonable public-source trail that the model exists as a standalone digital audio player. If a candidate cannot be verified, leave it out until a source is found.

## Scope

Include standalone digital audio players that can play local music files or streaming audio without requiring a phone, computer, or separate host device.

Do not add rows for:

- USB dongle DAC/amps
- desktop DACs or amps
- digital transports, music servers, digital bridges, or SD-card transport players
- Bluetooth receivers without standalone playback
- accessories, docks, cables, or modules by themselves
- smartphones or audio-focused phones
- general consumer MP3 players such as iPod, Zune, Sansa, Creative Zen, and older mass-market flash/HDD players
- color-only, bundle-only, or storage-only variants unless the model identity depends on that variant

Scope note:

The database focuses on dedicated audiophile and hi-res digital audio players.

Audio-focused phones such as the Moondrop MIAD 01 and general consumer MP3 players such as iPod, Zune, Sansa, and Creative Zen are currently out of scope. They may be reconsidered only if the project later adds separate audio-phone or classic media-player categories.

## Current Data Status

As of 2026-10-21, `src/data/daps.csv` contains 261 source-backed DAP rows. Most rows have local optimized images referenced through `image_filename`.

Latest local checks:

- `npm run generate:data`
- `npm test`

Latest discovery status:

- The weekly discovery watcher is producing a clean report with no current actionable candidates.
- Sony currently returns HTTP 403 to scripted fetches, and Lotoo may fail depending on network/site behavior. These failures are reported but do not create candidates by themselves.
- Recent false-positive cleanup removed non-DAP matches such as QLS digital transports, Shanling M30 desktop player, Cowon PLENUE X30/X40 IEM-category links, and duplicate Astell&Kern/Cowon catalog names.

Recent maintenance:

- HiBy RS2 II was added from HiBy's official specification charts and launch release, with its supplied local image. The green aluminum and limited gold brass versions share one model row; their different weights and prices are recorded in its notes.
- Fosi Audio DAP Neo was added from the official product page with its supplied local image; 16GB and 64GB are included memory-card options for one model.
- Shanling Q2 was updated from the official product page with Active status, USD 259 MSRP, 1850mAh battery, 3.5mm and 4.4mm line-out support, and current official notes.
- xDuoo X2, X2S, X3, X3 II, X5, X10, X20, and Nano D3 were added in the latest xDuoo pass.
- xDuoo X5 weight and dimensions were filled from exact-model sources.
- xDuoo X10 MSRP USD was filled as 180 from exact-model review context.
- Local optimized images are linked for X2, X2S, X3, X3 II, X5, X10, X20, Nano D3, X10T, and X10T II.
- `last_updated` timestamps for the new/edited xDuoo rows and Shanling Q2 were corrected from midnight placeholders to actual edit-time stamps.

## Source Rules

Official sources are preferred.

Source priority:

1. Official product page
2. Official manual / support page
3. Official store page
4. Archived official page
5. Trusted review site
6. Reputable retailer
7. Community source

If official sources are unavailable, add the row only when at least two reliable secondary sources agree on the core specs.

If only one secondary source is available, the row may be added as Partial or Unverified, with uncertain fields left blank.

Do not guess specs from memory.

Transport-style source devices are out of scope even when they are portable or play from local storage. A roadmap candidate should be a standalone DAP with normal onboard playback and usable headphone or line-level audio output, not only a digital output path to another DAC.

## Review Link Rules

Review links are optional and separate from spec sources.

Currently accepted review-link sources:

- Headfonics
- Headfonia
- Twister6
- What Hi-Fi

Rules:

- Use exact model or exact variant matches only.
- Do not use review links as proof for unrelated specs unless the review is also named in Notes as a secondary source.
- Keep review links out of source and buy fields.
- Use `Label|URL; Label|URL` format.

## Variant Rules

Separate variant rows should be added only when the variant has meaningful hardware or spec differences.

Add a separate row when the variant changes:

- DAC
- amp section
- output ports
- operating system/platform
- battery
- RAM/storage configuration, if it affects the model identity
- wireless/cellular configuration
- decoding support
- modular amp/DAC configuration

Do not add a separate row just for:

- color variants
- chassis material, finish, or weight-only variants with the same core audio platform
- storage-only variants
- regional naming
- bundle/package differences
- limited editions with the same internals

When unsure, add the base model first and note possible variants for later review.

## Alias Notes

Some DAPs are commonly searched using shorthand, alternate spacing, generation names, or regional names.

Long term, the CSV should include a dedicated aliases column so search can match these terms without creating duplicate rows.

Until an aliases column exists, aliases may be documented in Notes, but they should not create duplicate model rows.

## Priority 1: Add by Request or When Sources Are Easy

These fit the broader DAP scope, but they should not block launch or higher-priority historical gaps.

### HiFiMAN

- HIFIMAN HM-801
- HIFIMAN HM-802
- HIFIMAN HM-901
- HIFIMAN HM650
- HIFIMAN HM901U
- HIFIMAN HM802U
- HIFIMAN HM802s
- HIFIMAN HM901s
- HIFIMAN HM-603
- HIFIMAN HM-601
- HIFIMAN HM-602 Slim
- HIFIMAN HM901R
- HIFIMAN HM1000
- HIFIMAN HM-700
- HIFIMAN R2R2000
- HiFiMAN SuperMini
- HiFiMAN MegaMini

Naming note:

Confirm whether hyphenated and non-hyphenated names are aliases before adding. Do not create separate duplicate rows for `HM901` and `HM-901` unless sources prove different products.

### xDuoo

No current xDuoo roadmap candidates.

Recent data pass added X2, X2S, X3, X3 II, X5, X10, X20, and Nano D3. Existing X10T and X10T II rows are transport-style players retained with explicit no-analog-output notes.

Image status:

All current xDuoo rows have local `image_filename` assets. Record image source URLs and credits where available.


### QLS / Quloos

No current QLS/Quloos roadmap candidates.

Scope note:

Discovery deliberately excludes QLS desktop, bridge, turntable, SD-card player, and transport-style products such as QA390, QA390LE/MOD/QA390V2, QA660, QA661, QA662, and QA860. Only add QLS rows when sources clearly identify a standalone portable DAP with local playback and onboard analog audio output, not a computer bridge, digital transport, or movable desktop player.

### Other Modern / Relevant DAPs

- Acoustic Research AR-M2
- Acoustic Research AR-M20
- Acoustic Research AR-M200
- PonoMusic PonoPlayer
- Colorfly C4
- Colorfly U8
- Colorfly U6
- ONIX Overture XM5
- Oriolus DPS-L2
- YinLvMei W1s
- F.AUDIO FA4

Scope note:

Some Colorfly, TempoTec, ONIX, Oriolus, YinLvMei, Cowon, and F.AUDIO models may need extra source checking because product categories can blur the line between standalone DAPs, transports, IEMs, and desktop/portable source devices.

TempoTec V3 Blaze appears to overlap with existing `V3` coverage unless sources prove meaningful hardware/spec differences. Do not add bundle rows such as V3 Blaze+IM01 unless the DAP itself differs.

ONIX Waltz XM10 LTD is already represented in the database; do not add duplicate rows from Shanling co-branded retailer listings.

### Budget / AliExpress-Style DAPs

- Innioasis G1
- Innioasis G3
- Innioasis G5
- Innioasis Y1
- Innioasis Y2
- Ruizu A55
- Ruizu A58
- Ruizu X02
- Ruizu X50
- Benjie S5
- Benjie K9
- AGPTEK H3
- AGPTEK H50
- AGPTEK A02
- Mechen M30
- Mechen M31
- Mechen M3

Variant note:

Budget DAPs often have inconsistent listings, relabels, and silent revisions. Add only when sources are clear enough. Avoid duplicate rows for obvious rebrands unless there is enough evidence that they are sold as meaningfully different models.

Innioasis note:

Innioasis appears to sell standalone Android and non-Android music players, but the brand overlaps heavily with general MP3/MP4 players, kid-focused players, and TIMMKOO/OEM-style listings. Treat Innioasis rows as candidates only until exact official product pages or reliable store/manual specs prove standalone local playback, storage, audio outputs, and model identity. Do not add TIMMKOO-branded devices under Innioasis unless sources clearly establish the brand relationship and the database intentionally tracks that identity.
