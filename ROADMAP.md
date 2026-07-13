# DAP Database Roadmap

This roadmap tracks source-backed DAP model additions planned for the public DAP Database. It is intentionally prioritized instead of being a complete wish list.

The database source of truth is `src/data/daps.csv`; `src/data/daps.json` is generated from it. Do not use this roadmap as a list of existing rows. Before adding any model, check the CSV first to avoid duplicates.

Only keep model names here when there is a reasonable public-source trail that the model exists as a standalone digital audio player. If a candidate cannot be verified, leave it out until a source is found.

## Scope

Include standalone digital audio players that can play local music files or streaming audio without requiring a phone, computer, or separate host device.

Do not add rows for:

- USB dongle DAC/amps
- desktop DACs or amps
- Bluetooth receivers without standalone playback
- accessories, docks, cables, or modules by themselves
- smartphones or audio-focused phones
- general consumer MP3 players such as iPod, Zune, Sansa, Creative Zen, and older mass-market flash/HDD players
- color-only, bundle-only, or storage-only variants unless the model identity depends on that variant

Scope note:

The database focuses on dedicated audiophile and hi-res digital audio players.

Audio-focused phones such as the Moondrop MIAD 01 and general consumer MP3 players such as iPod, Zune, Sansa, and Creative Zen are currently out of scope. They may be reconsidered only if the project later adds separate audio-phone or classic media-player categories.

## Current Data Status

As of 2026-07-13, `src/data/daps.csv` contains 164 source-backed DAP rows, and every row has a local optimized image referenced through `image_filename`.

Latest local checks:

- `npm run generate:data`
- `npm run build`

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

## Review Link Rules

Review links are optional and separate from spec sources.

Currently accepted review-link sources:

- Headfonics
- Headfonia
- Twister6

Rules:

- Use exact model or exact variant matches only.
- Do not use review links as proof for unrelated specs unless the review is also named in Notes as a secondary source.
- Keep review links out of source, buy, and affiliate fields.
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

## Priority 1: Major Historical Gaps

These should be filled before spending time on obscure long-tail models.

### Astell&Kern Core History

This is the most visible remaining gap. The database has good modern Astell&Kern coverage, but several important historical models are still missing.

- Astell&Kern AK100
- Astell&Kern AK120
- Astell&Kern AK100 II
- Astell&Kern AK120 II
- Astell&Kern AK240
- Astell&Kern AK300
- Astell&Kern AK320
- Astell&Kern AK380
- Astell&Kern A&norma SR15
- Astell&Kern A&norma SR25
- Astell&Kern A&norma SR25 MKII
- Astell&Kern A&futura SE100
- Astell&Kern A&futura SE200
- Astell&Kern A&ultima SP1000
- Astell&Kern A&ultima SP1000M
- Astell&Kern A&ultima SP2000
- Astell&Kern A&ultima SP2000T
- Astell&Kern KANN
- Astell&Kern KANN Cube
- Astell&Kern KANN Alpha
- Astell&Kern SA700
- Astell&Kern AK70
- Astell&Kern AK70 MKII
- Astell&Kern AK Jr

Later Astell&Kern pass:

- Astell&Kern A&futura SE180
- Astell&Kern A&futura SE300

Variant note:

Astell&Kern often has limited material/color editions. Do not add those unless core hardware or specifications meaningfully differ. Skip AK CD rippers, amps, desktop servers, and IEM/headphone collaborations.

### FiiO X-Series and Early M-Series

FiiO legacy coverage is important because these models are common used-market references.

- FiiO M33 R2R
- FiiO M3
- FiiO M3K
- FiiO M3 Pro
- FiiO M5
- FiiO Snowsky ECHO
- FiiO X1
- FiiO X1 II
- FiiO X3
- FiiO X3 II
- FiiO X3 III
- FiiO X5
- FiiO X5 II
- FiiO X7

Variant note:

Skip Stainless Steel, color, material-only, and bundle editions unless core hardware or specifications differ. Snowsky ECHO is distinct from Snowsky Echo Mini.

## Priority 2: Useful Historical Coverage

These are valid additions, but they should come after the major-brand gaps above.

### Cowon / Plenue

- Cowon Plenue J
- Cowon Plenue R
- Cowon Plenue R2
- Cowon Plenue M
- Cowon Plenue M2
- Cowon Plenue 1
- Cowon Plenue 2
- Cowon Plenue 2 MKII
- Cowon Plenue S
- Cowon Plenue L
- Cowon Plenue V

Variant note:

Cowon variants are usually distinct enough when marked D2, R2, M2, MKII, etc. Color-only variants should be skipped.

### Shanling Missing Models

- Shanling M1
- Shanling M2
- Shanling M2s
- Shanling M5
- Shanling M5s
- Shanling Q1
- Shanling M6 21
- Shanling M6 Pro 21
- Shanling M7T
- Shanling M9 Plus
- Shanling M30 Pro

Naming note:

`M6 Pro 21`, `M6 Pro (21)`, and `M6 Pro 2021` refer to the same model. Add one row only.

`M6 21` had 32GB and later 64GB internal-storage configurations with otherwise unchanged specifications. Do not create separate storage-only rows.

M7T and M30 Pro are verified standalone player models.

## Priority 3: Add by Request or When Sources Are Easy

These fit the broader DAP scope, but they should not block launch or higher-priority historical gaps.

### HiFiMAN

- HIFIMAN HM-801
- HIFIMAN HM-802
- HIFIMAN HM-901
- HIFIMAN HM901R
- HIFIMAN HM1000
- HIFIMAN HM-700
- HIFIMAN R2R2000
- HiFiMAN SuperMini
- HiFiMAN MegaMini

Naming note:

Confirm whether hyphenated and non-hyphenated names are aliases before adding. Do not create separate duplicate rows for `HM901` and `HM-901` unless sources prove different products.

### xDuoo

- xDuoo X2
- xDuoo X2S
- xDuoo X3
- xDuoo X3 II
- xDuoo X5
- xDuoo X10
- xDuoo X20
- xDuoo Nano D3

### Other Modern / Relevant DAPs

- Colorfly C4
- Colorfly U8
- Colorfly U6
- ONIX Overture XM5
- ONIX Waltz XM10 LTD
- Oriolus DPS-L2
- YinLvMei W1s
- F.AUDIO FA4

Scope note:

Some Colorfly, ONIX, Oriolus, YinLvMei, and F.AUDIO models may need extra source checking because product categories can blur the line between standalone DAPs, transports, and desktop/portable source devices.

### Budget / AliExpress-Style DAPs

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
