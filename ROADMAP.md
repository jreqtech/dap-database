# DAP Database Roadmap

This roadmap tracks source-backed DAP model additions planned for the public DAP Database. It is intentionally prioritized instead of being a complete wish list.

The database source of truth is `src/data/daps.csv`; `src/data/daps.json` is generated from it. Do not use this roadmap as a list of existing rows. Before adding any model, check the CSV first to avoid duplicates.

The project is already suitable for public beta. More rows are useful, but completeness should be driven by major historical gaps and user requests rather than chasing every obscure model before launch.

## Scope

Include standalone digital audio players that can play local music files or streaming audio without requiring a phone, computer, or separate host device.

Do not add rows for:

- USB dongle DAC/amps
- desktop DACs or amps
- Bluetooth receivers without standalone playback
- accessories, docks, cables, or modules by themselves
- color-only, bundle-only, or storage-only variants unless the model identity depends on that variant

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
- major chassis/material design
- decoding support
- modular amp/DAC configuration

Do not add a separate row just for:

- color variants
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
- Astell&Kern A&futura SE300 Titan

Variant note:

Astell&Kern often has limited material/color editions. Do not add those unless specs, chassis material, or major hardware meaningfully differ.

### iBasso MAX and Sony ZX

These are historically important or commonly searched models that should be handled carefully.

- iBasso DX220 MAX
- iBasso DX300 MAX
- iBasso DX320 MAX Ti
- Sony NW-ZX300
- Sony NW-ZX500 / NW-ZX505

Variant note:

Sony model numbers often represent region/storage variants. Avoid duplicate rows unless specs differ. For iBasso MAX models, do not merge specs into the non-MAX rows.

### FiiO X-Series and Early M-Series

FiiO legacy coverage is important because these models are common used-market references.

- FiiO M3
- FiiO M3K
- FiiO M5
- FiiO X1
- FiiO X1 II
- FiiO X3
- FiiO X3 II
- FiiO X3 III
- FiiO X5
- FiiO X5 II
- FiiO X7

Variant note:

Skip Stainless Steel, color, and bundle editions unless specs differ.

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

### Onkyo / Pioneer

- Onkyo DP-S1
- Onkyo DP-S1A
- Onkyo DP-X1
- Pioneer XDP-30R
- Pioneer XDP-100R

Variant note:

Watch for regional naming and storage variants.

### Older Shanling

- Shanling M1
- Shanling M2
- Shanling M2s
- Shanling M5
- Shanling M5s
- Shanling Q1
- Shanling M6 21
- Shanling M6 Pro 21
- Shanling M9 Plus
- Shanling M7T

Naming note:

Confirm whether `M6 Pro 21` and `M6 Pro 2021` refer to the same model before adding. Do not duplicate.

## Priority 3: Add by Request or When Sources Are Easy

These fit the broader DAP scope, but they should not block launch or higher-priority historical gaps.

### Other Modern / Relevant DAPs

- ONIX Overture XM5
- HIFIMAN HM901R
- HIFIMAN HM1000
- HIFIMAN R2R2000
- HiFiMAN SuperMini
- HiFiMAN MegaMini
- xDuoo X2S
- xDuoo X3
- xDuoo X3 II
- xDuoo X10
- xDuoo X20
- Colorfly C4
- Colorfly U8
- Colorfly U6
- Phinistec S7

Scope note:

Some HIFIMAN and Colorfly models may need extra source checking because older product categories blur the line between pocket DAPs and transportable source devices.

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

## Launch Guidance

For public beta, prioritize:

1. Correct existing rows over adding more rows.
2. Major Astell&Kern, iBasso MAX, Sony ZX, and FiiO historical gaps.
3. User-requested missing models.
4. Long-tail budget or obscure models only when sources are clear.

Avoid implying the database is complete. Use language such as "public beta", "source-backed where possible", and "missing model requests welcome."
