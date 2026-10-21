import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { classifyProduct } from './compare';
import { candidateIdentity, checkDiscoveryIssueDedupe } from './dedupe-issues';
import { parseCsv } from './csv';
import { extractAstellKern } from './extractors/astellkern';
import { extractCowon } from './extractors/cowon';
import { extractFiio } from './extractors/fiio';
import { extractHiby } from './extractors/hiby';
import { extractHidizs } from './extractors/hidizs';
import { extractQls } from './extractors/qls';
import { extractRetailer } from './extractors/retailer';
import { extractShanling } from './extractors/shanling';
import { extractLotoo } from './extractors/lotoo';
import { extractSony } from './extractors/sony';
import { resolveUrl } from './html';
import { fingerprint, normalizeBaseModel, normalizeBrand, normalizeModelForComparison } from './normalize';
import { renderReport } from './report';
import type { DatabaseProduct, DiscoveryResult, DiscoverySource } from './types';

const fixtureRoot = resolve('scripts/discovery/__fixtures__');

test('name normalization handles case, whitespace, hyphen spacing, unicode, and repeated brand', () => {
  assert.equal(normalizeModelForComparison('Cayin', 'Cayin N3-Pro'), 'n3pro');
  assert.equal(normalizeModelForComparison('Hidizs', 'HIDIZS   AP80 Pro MAX'), 'ap80 pro max');
});

test('CSV parser handles quoted commas', () => {
  const rows = parseCsv('Brand,Model,Variant,Notes\nFiiO,M27,,"one, two"\n');
  assert.equal(rows[0]?.Notes, 'one, two');
});

test('exact CSV match is classified as possible duplicate', () => {
  const candidate = classifyProduct(product('FiiO M27'), [db('FiiO', 'M27')]);
  assert.equal(candidate.classification, 'possible-duplicate');
});

test('obvious normalized duplicate compares closely', () => {
  const candidate = classifyProduct(product('Cayin N3-Pro'), [db('Cayin', 'N3Pro')]);
  assert.equal(candidate.classification, 'possible-duplicate');
});

test('official spacing differences like MAX and MK2 compare as duplicates', () => {
  assert.equal(classifyProduct(product('iBasso DX300MAX'), [db('iBasso', 'DX300 MAX')]).classification, 'possible-duplicate');
  assert.equal(classifyProduct(product('iBasso DX260MK2'), [db('iBasso', 'DX260 MK2')]).classification, 'possible-duplicate');
  assert.equal(classifyProduct(product('Shanling M7T-MASTER'), [db('Shanling', 'M7T', 'Master')]).classification, 'possible-duplicate');
});

test('Astell&Kern and Cowon catalog names compare as duplicates of existing rows', () => {
  assert.equal(
    classifyProduct({ ...product('Astell&Kern SR35'), brand: 'Astell&Kern' }, [db('Astell&Kern', 'SR35')]).classification,
    'possible-duplicate',
  );
  assert.equal(classifyProduct(product('Cowon PLENUE 2 MK II'), [db('Cowon', 'Plenue 2 MKII')]).classification, 'possible-duplicate');
});

test('possible variant is detected when base model is close but variant text differs', () => {
  const candidate = classifyProduct(product('HiBy R5 Saber 2022'), [db('HiBy', 'R5')]);
  assert.equal(candidate.classification, 'possible-variant');
});

test('documented edition text is classified as duplicate instead of actionable variant', () => {
  const candidate = classifyProduct(product('Cayin N8 Brass Black'), [db('Cayin', 'N8', '', 'stainless steel brass black')]);
  assert.equal(candidate.classification, 'possible-duplicate');
  assert.equal(candidate.isActionable, false);
});

test('documented edition text can match the shortest base row instead of a longer similar model', () => {
  const candidate = classifyProduct(product('Hidizs AP80 Stainless Steel'), [
    db('Hidizs', 'AP80 Pro Max'),
    db('Hidizs', 'AP80', '', 'stainless steel'),
  ]);
  assert.equal(candidate.classification, 'possible-duplicate');
  assert.equal(candidate.closestMatch, 'Hidizs AP80');
  assert.equal(candidate.isActionable, false);
});

test('collaboration edition text is treated as a variant of the base player', () => {
  const candidate = classifyProduct(product('HiBy M500 X Hatsune Miku'), [db('HiBy', 'M500', 'WiFi')]);
  assert.equal(candidate.classification, 'possible-variant');
});

test('source names that omit existing row variant context are duplicates', () => {
  const candidate = classifyProduct(product('Hidizs AP30'), [db('Hidizs', 'AP30', 'Kickstarter')]);
  assert.equal(candidate.classification, 'possible-duplicate');
});

test('likely new product is detected when no close match exists', () => {
  const candidate = classifyProduct(product('FiiO M99'), [db('FiiO', 'M23')]);
  assert.equal(candidate.classification, 'likely-new');
});

test('retailer-only unmatched products are retail sightings', () => {
  const candidate = classifyProduct(
    {
      ...product('Muse HiFi MUSE 300'),
      brand: 'Muse HiFi',
      sourceType: 'retailer',
      sourceUrl: 'https://hifigo.com/collections/portable-music-player',
    },
    [db('FiiO', 'M23')],
  );
  assert.equal(candidate.classification, 'retail-sighting');
  assert.equal(candidate.isActionable, true);
});

test('retailer marketing suffixes are trimmed before duplicate comparison', () => {
  assert.equal(
    classifyProduct(
      { ...product('FiiO M15S 5 Inch'), brand: 'FiiO', sourceType: 'retailer' },
      [db('FiiO', 'M15S')],
    ).classification,
    'possible-duplicate',
  );
  assert.equal(
    classifyProduct(
      { ...product('FiiO M15S 5'), brand: 'FiiO', sourceType: 'retailer' },
      [db('FiiO', 'M15S')],
    ).classification,
    'possible-duplicate',
  );
  assert.equal(
    classifyProduct(
      { ...product('Cayin N7 Pure 1-Bit'), brand: 'Cayin', sourceType: 'retailer' },
      [db('Cayin', 'N7')],
    ).classification,
    'possible-duplicate',
  );
});

test('retailer extractor prefers ONIX identity in Shanling ONIX co-branded listings', () => {
  const source = sourceFor('HiFiGo', 'https://hifigo.com/collections/portable-music-player', 'retailer');
  const html = `
    <a href="/products/shanling-onix-waltz-xm10-ltd">Shanling ONIX Waltz XM10 LTD Digital Audio Player</a>
  `;
  const products = extractRetailer(html, source);

  assert.deepEqual(products.map((item) => item.detectedName), ['ONIX Waltz XM10 LTD']);
  assert.deepEqual(products.map((item) => item.brand), ['ONIX']);
});

test('FiiO extractor deduplicates repeated products and skips DAC amps', () => {
  const source = sourceFor('FiiO', 'https://www.fiio.com/category', 'fiio');
  const products = extractFiio(readFileSync(resolve(fixtureRoot, 'fiio.html'), 'utf8'), source);
  assert.deepEqual(products.map((item) => item.detectedName), ['FiiO M27', 'FiiO M23']);
});

test('relative URL resolution uses the source URL', () => {
  assert.equal(resolveUrl('/product/481', 'https://en.shanling.com/category/237'), 'https://en.shanling.com/product/481');
});

test('Shanling extractor removes generic Portable Player suffix', () => {
  const source = sourceFor('Shanling', 'https://en.shanling.com/category/237', 'shanling');
  const products = extractShanling(readFileSync(resolve(fixtureRoot, 'shanling.html'), 'utf8'), source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Shanling M7T', 'Shanling M7']);
});

test('Shanling extractor removes full portable hi-res marketing suffix', () => {
  const source = sourceFor('Shanling', 'https://en.shanling.com/category/237', 'shanling');
  const html = '<div class="product-ani"><a href="/product/244"><h3>M6 Portable Hi-Res Music Player</h3></a></div>';
  const products = extractShanling(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Shanling M6']);
});

test('Shanling extractor removes short hi-fi marketing suffix', () => {
  const source = sourceFor('Shanling', 'https://en.shanling.com/category/237', 'shanling');
  const html = '<div class="product-ani"><a href="/product/500"><h3>Q2 Hi-Fi</h3></a></div>';
  const products = extractShanling(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Shanling Q2']);
});

test('Shanling extractor skips base M30 desktop player', () => {
  const source = sourceFor('Shanling', 'https://en.shanling.com/category/237', 'shanling');
  const html = `
    <div class="product-ani"><a href="/product/393"><h3>M30</h3></a></div>
    <div class="product-ani"><a href="/product/493"><h3>M0 Pura</h3></a></div>
  `;
  const products = extractShanling(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Shanling M0 Pura']);
});

test('HiBy extractor keeps music players and skips set/case entries', () => {
  const source = sourceFor('HiBy', 'https://store.hiby.com/collections/music-player', 'hiby');
  const html = `
    <a href="/products/hiby-r3pro-ii">R3Pro II</a>
    <a href="/products/hiby-r8ii-aluminum-alloy-ver">R8 II AL</a>
    <a href="/products/hiby-digital-m300">M300(3+32GB)</a>
    <a href="/products/hiby-golden-10th-anniversary-set">Golden 10th Anniv. Set</a>
    <a href="/products/m300-silicone-case">M300 Silicone Case</a>
  `;
  const products = extractHiby(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), [
    'HiBy R3 Pro II',
    'HiBy R8 II Aluminum Alloy',
    'HiBy M300 3GB/32GB',
  ]);
});

test('Hidizs extractor keeps DAPs and skips bundles/accessories', () => {
  const source = sourceFor('Hidizs', 'https://www.hidizs.net/collections/portable-music-player', 'hidizs');
  const html = `
    <a href="/products/hidizs-ap80-pro-max-all-in-one-hi-res-streaming-music-player">HIDIZS AP80 PRO MAX All-in-One Hi-Res Streaming Music Player</a>
    <a href="/products/ap80-pro-portable-lossless-music-player-special-edition">AP80 PRO Special Edition</a>
    <a href="/products/ap80-pro-max-leather-case">AP80 PRO MAX Leather Case</a>
    <a href="/products/ms3-ap80-pro-x-bundle">MS3 + AP80 PRO-X Bundle</a>
  `;
  const products = extractHidizs(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Hidizs AP80 Pro Max', 'Hidizs AP80 Pro Special Edition']);
});

test('QLS extractor skips digital transports and desktop players', () => {
  const source = sourceFor('QLS', 'https://www.qlshifi.com/en/?cate=2', 'qls');
  const html = `
    <a href="/en/wzcapi/qa361.htm">QA361 Portable Lossless Music Player</a>
    <a href="/en/wzcapi/qa662.htm">QA662 HiFi Player & Digital Turntable</a>
    <a href="/en/wzcapi/qa390.htm">Quloos QA390 Movable Desktop Player</a>
    <a href="/en/wzcapi/qa390le.htm">QA390LE/MOD(QA390V2) Movable Desktop Player</a>
    <a href="/en/wzcapi/qa890.htm">QA890 24Bit 192Khz PCM & DSD(DoP) HiFi DAC</a>
  `;
  const products = extractQls(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['QLS QA361']);
});

test('QLS extractor only keeps portable DAP models', () => {
  const source = sourceFor('QLS', 'https://www.qlshifi.com/en/?cate=2', 'qls');
  const html = `
    <a href="/en/wzcapi/qa360.htm">QA360 Portable HiFi Lossless Music Player</a>
    <a href="/en/wzcapi/qa361.htm">QA361 Portable Lossless Music Player</a>
    <a href="/en/wzcapi/qa661.htm">QA661 Hi-Fi Digital Audio Player & USB Bridge to Computer</a>
    <a href="/en/wzcapi/qa860.htm">QA860 Digital Lossless HiFi Music Player</a>
  `;
  const products = extractQls(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['QLS QA360', 'QLS QA361']);
});

test('Astell&Kern extractor keeps portable players and skips desktop, DAC, and IEM products', () => {
  const source = sourceFor('Astell&Kern', 'https://astellnkern.co.uk/pages/media-players', 'astellkern');
  const html = `
    <a href="/products/sp4000">SP4000 Built on Legacy</a>
    <a href="/products/pd10">PD10 Breaking Away From The Normal</a>
    <a href="/products/acro-ca1000t">ACRO CA1000T All-In-One Head-Fi Audio System</a>
    <a href="/products/ak-hc5">AK HC5 USB DAC</a>
    <a href="/products/stella">STELLA In-Ear Monitors</a>
  `;
  const products = extractAstellKern(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Astell&Kern SP4000', 'Astell&Kern PD10']);
});

test('Astell&Kern extractor skips case URLs and deduplicates repeated product links', () => {
  const source = sourceFor('Astell&Kern', 'https://astellnkern.co.uk/pages/media-players', 'astellkern');
  const html = `
    <a href="/products/pd20">PD20</a>
    <a href="/products/pd20-case">PD20 Leather Case</a>
    <a href="/products/a-ultima-sp4000t">SP4000T</a>
    <a href="/products/SP4000T">SP4000T</a>
  `;
  const products = extractAstellKern(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Astell&Kern PD20', 'Astell&Kern SP4000T']);
});

test('Sony extractor keeps hi-fi Walkman models and skips wearable players', () => {
  const source = sourceFor('Sony', 'https://electronics.sony.com/audio/walkman-digital-recorders/c/walkman-mp3-players', 'sony');
  const html = `
    <a href="/audio/walkman/p/nwzx707-b">NW-ZX707 Digital Media Player</a>
    <a href="/audio/walkman/p/nwa306-b">NW-A306 Digital Media Player</a>
    <a href="/audio/walkman/p/nwws413-b">NW-WS413 Waterproof Sports Wearable MP3 Player</a>
    <a href="/audio/walkman/p/nwwm1zm2">NW-WM1ZM2</a>
  `;
  const products = extractSony(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Sony NW-ZX707', 'Sony NW-A306', 'Sony NW-WM1ZM2']);
});

test('Lotoo extractor keeps PAW players and skips dongles, recorders, and accessories', () => {
  const source = sourceFor('Lotoo', 'https://www.lotoo.cn/', 'lotoo');
  const html = `
    <a href="/product/paw-gold-touch">PAW Gold Touch</a>
    <a href="/product/paw-6000">PAW 6000</a>
    <a href="/product/paw-s2">PAW S2</a>
    <a href="/product/paw-d3">PAW D3</a>
    <a href="/product/mixmic">MIXMIC Recorder</a>
  `;
  const products = extractLotoo(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Lotoo PAW Gold Touch', 'Lotoo PAW 6000']);
});

test('Cowon extractor keeps PLENUE DAPs and skips accessories/refurbished bundles', () => {
  const source = sourceFor('Cowon', 'https://www.cowon.com/goods/goods_list.php?cateCd=001', 'cowon');
  const html = `
    <a href="/goods/plenue-d3">PLENUE D3</a>
    <a href="/goods/plenue-2-mkii">PLENUE 2 MK II</a>
    <a href="/goods/refurb-plenue-v">[리퍼비시] PLENUE V 64GB DAP + leather case</a>
    <a href="https://cowonshop.com/plenue/product/PLENUEX30/product_page_1.php?from_category=iem">PLENUE X30</a>
    <a href="https://cowonshop.com/plenue/product/PLENUEX40/product_page_1.php?from_category=iem">PLENUE X40</a>
    <a href="/goods/base-station">Base Station</a>
  `;
  const products = extractCowon(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Cowon Plenue D3', 'Cowon Plenue 2 MKII']);
});

test('Cowon extractor deduplicates duplicate catalog and shop links by model name', () => {
  const source = sourceFor('Cowon', 'https://www.cowon.com/goods/goods_list.php?cateCd=001', 'cowon');
  const html = `
    <a href="https://cowonshop.com/plenue/product/PLENUED3/product_page_1.php">PLENUE D3</a>
    <a href="/goods/goods_view.php?goodsNo=1000000290">PLENUE D3</a>
  `;
  const products = extractCowon(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['Cowon Plenue D3']);
});

test('retailer extractor keeps DAP listings and skips accessories or bundles', () => {
  const source = sourceFor('HiFiGo', 'https://hifigo.com/collections/portable-music-player', 'retailer');
  const html = `
    <a href="/products/ibasso-dx260mk2">iBasso DX260MK2 CS43198*8 Digital Audio Player</a>
    <a href="/products/hiby-r3-pro-ii">HiBy R3 Pro II / Pro 2 CS43198*2 Music Player</a>
    <a href="/products/fiio-m23">FiiO M23 AK4191EQ+AK4499EX High-Resolution Music Player</a>
    <a href="/products/xduoo-x10t-ii">xDuoo X10T II Digital Transport Music Player</a>
    <a href="/products/fiio-m21-case">FiiO M21 Blue Leather Case</a>
    <a href="/products/ms3-ap80-pro-x-bundle">MS3 + AP80 PRO-X Bundle</a>
  `;
  const products = extractRetailer(html, source);
  assert.deepEqual(products.map((item) => item.detectedName), ['iBasso DX260 MK2', 'HiBy R3 Pro II', 'FiiO M23']);
  assert.deepEqual(products.map((item) => item.sourceType), ['retailer', 'retailer', 'retailer']);
});

test('report generation includes source failures and fingerprints', () => {
  const candidate = classifyProduct(product('FiiO M99'), [db('FiiO', 'M23')]);
  const report = renderReport({
    generatedAt: '2026-07-13T00:00:00.000Z',
    sourcesConfigured: 1,
    sourcesChecked: 0,
    sourceFailures: [{ source: sourceFor('FiiO', 'https://www.fiio.com/category', 'fiio'), error: 'HTTP 500' }],
    discoveredProducts: [candidate],
    candidates: [candidate],
    actionableCandidates: [candidate],
    reportPath: 'tmp/dap-discovery-report.md',
  } satisfies DiscoveryResult);

  assert.match(report, /Source failures/);
  assert.match(report, /dap-discovery-fingerprint:/);
});

test('candidate fingerprint is stable', () => {
  assert.equal(
    fingerprint(['FiiO', 'M27', 'likely-new', 'https://www.fiio.com/M27']),
    fingerprint(['fiio', 'm27', 'LIKELY-NEW', 'https://www.fiio.com/M27']),
  );
});

test('discovery issue dedupe suppresses exact fingerprint matches', () => {
  const candidate = classifyProduct(product('FiiO M99'), [db('FiiO', 'M23')]);
  const dedupe = checkDiscoveryIssueDedupe(
    { actionableCandidates: [candidate] },
    [{ body: `<!-- dap-discovery-fingerprint:${candidate.fingerprint} -->` }],
  );

  assert.equal(dedupe.shouldCreateIssue, false);
  assert.equal(dedupe.newFingerprintCount, 0);
});

test('discovery issue dedupe suppresses same product identity with changed fingerprint', () => {
  const candidate = classifyProduct(product('FiiO M99'), [db('FiiO', 'M23')]);
  const dedupe = checkDiscoveryIssueDedupe(
    { actionableCandidates: [{ ...candidate, fingerprint: 'ffffffffffffffff' }] },
    [{ body: `<!-- dap-discovery-identity:${candidateIdentity(candidate)} -->` }],
  );

  assert.equal(dedupe.shouldCreateIssue, false);
});

test('discovery issue dedupe suppresses legacy report sections without identity markers', () => {
  const candidate = classifyProduct(product('HiBy R5 Saber 2022'), [db('HiBy', 'R5')]);
  const dedupe = checkDiscoveryIssueDedupe(
    { actionableCandidates: [{ ...candidate, fingerprint: 'ffffffffffffffff' }] },
    [{ body: `### HiBy R5 Saber 2022\n\n- Brand: HiBy\n- Detected name: HiBy R5 Saber 2022\n` }],
  );

  assert.equal(dedupe.shouldCreateIssue, false);
});

function product(detectedName: string) {
  return {
    brand: detectedName.split(' ')[0] ?? '',
    detectedName,
    productUrl: `https://example.test/${encodeURIComponent(detectedName)}`,
    sourceUrl: 'https://example.test/catalog',
    sourceType: 'catalog' as const,
  };
}

function db(brand: string, model: string, variant = '', corpus = ''): DatabaseProduct {
  return {
    brand,
    model,
    variant,
    displayName: [brand, model, variant].filter(Boolean).join(' '),
    normalizedBrand: normalizeBrand(brand),
    normalizedModel: normalizeModelForComparison(brand, model),
    normalizedIdentity: normalizeModelForComparison(brand, model, variant),
    normalizedBase: normalizeBaseModel(brand, model),
    normalizedCorpus: [normalizeModelForComparison(brand, model, variant), corpus].filter(Boolean).join(' '),
  };
}

function sourceFor(brand: string, url: string, extractor: DiscoverySource['extractor']): DiscoverySource {
  return { brand, url, extractor, enabled: true, type: extractor === 'retailer' ? 'retailer' : 'catalog' };
}
