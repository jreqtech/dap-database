import { anchorMatches, resolveUrl, stripTags, uniqueByNameAndUrl } from '../html';
import type { DiscoveredProduct, DiscoverySource } from '../types';

const knownBrands = [
  ['Astell&Kern', /\bAstell\s*&\s*Kern\b/i],
  ['ACTIVO', /\bACTIVO\b/i],
  ['Cayin', /\bCayin\b/i],
  ['Cowon', /\bCowon\b/i],
  ['FiiO', /\bFiiO\b/i],
  ['F.Audio', /\bF\.?\s*Audio\b/i],
  ['HiBy', /\bHiBy\b/i],
  ['Hidizs', /\bHidizs\b/i],
  ['iBasso', /\biBasso\b/i],
  ['Lotoo', /\bLotoo\b/i],
  ['Luxury & Precision', /\bLuxury\s*&\s*Precision\b/i],
  ['Moondrop', /\bMoondrop\b/i],
  ['Muse HiFi', /\bMuse\s+HiFi\b/i],
  ['ONIX', /\bONIX\b/i],
  ['Oriolus', /\bOriolus\b/i],
  ['QLS', /\b(?:QLS|Quloos)\b/i],
  ['Questyle', /\bQuestyle\b/i],
  ['Shanling', /\bShanling\b/i],
  ['Sony', /\bSony\b/i],
  ['TempoTec', /\bTempoTec\b/i],
  ['xDuoo', /\bxDuoo\b/i],
  ['YinLvMei', /\bYinLvMei\b/i],
] as const;

const productKeywords = /\b(?:dap|digital audio player|audio player|music player|mp3 player|portable player|lossless player)\b/i;
const rejectKeywords =
  /\b(?:adapter|amplifier|amp\b|dac\b|dongle|earbud|earphone|headphone|iem\b|cable|case|cover|screen protector|bundle|stack|eartips?|tips?|open box|digital\s+transport|digital\s+turntable|desktop\s+player|movable\s+desktop)\b/i;
const modelStopWords =
  /\b(?:cs\d{4,}|ak\d{4,}|es\d{4,}|dual|quad|octa|android|bluetooth|portable|digital|audio|music|mp3|lossless|hifi|hi-fi|player|dap|dac|amp|amplifier|balanced|streaming|mqa|dsd|pcm|snapdragon|class|way|master|quality|high[- ]?resolution|pre[- ]?order|sale|new)\b/i;

export function extractRetailer(html: string, source: DiscoverySource): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];

  for (const anchor of anchorMatches(html)) {
    if (!/\/products\//i.test(anchor.href)) continue;

    const title = cleanTitle(stripTags(anchor.inner));
    if (!title || !productKeywords.test(title) || rejectKeywords.test(title)) continue;

    const parsed = parseRetailTitle(title);
    if (!parsed) continue;

    products.push({
      brand: parsed.brand,
      detectedName: `${parsed.brand} ${parsed.model}`,
      productUrl: resolveUrl(anchor.href, source.url),
      sourceUrl: source.url,
      sourceType: source.type,
    });
  }

  return uniqueByNameAndUrl(products);
}

function parseRetailTitle(title: string): { brand: string; model: string } | null {
  const brandMatch = knownBrands.find(([, pattern]) => pattern.test(title));
  if (!brandMatch) return null;

  const [brand, pattern] = brandMatch;
  const match = title.match(pattern);
  if (!match?.[0]) return null;

  const afterBrand = title.slice((match.index ?? 0) + match[0].length).trim();
  const model = normalizeModelText(afterBrand);
  if (!model || model.length < 2) return null;

  return { brand, model };
}

function normalizeModelText(value: string): string {
  const words = value
    .replace(/[|()[\]{}]/g, ' ')
    .replace(/\s+\/\s+.*$/, '')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
  const modelWords: string[] = [];

  for (const word of words) {
    const cleaned = word.replace(/^[^A-Za-z0-9+.-]+|[^A-Za-z0-9+.-]+$/g, '');
    if (!cleaned) continue;
    if (/^(?:ak|cs|es)\d/i.test(cleaned)) break;
    if (modelStopWords.test(cleaned)) break;
    if (/^\d+(?:gb|tb|mah|pcs)$/i.test(cleaned)) break;
    modelWords.push(cleaned);
    if (modelWords.length >= 5) break;
  }

  return modelWords
    .join(' ')
    .replace(/\bDX(\d+)MAX\b/i, 'DX$1 MAX')
    .replace(/\bDX(\d+)MK2\b/i, 'DX$1 MK2')
    .replace(/\bR6Pro\b/i, 'R6 Pro')
    .replace(/\bR3II\b/i, 'R3 II')
    .replace(/\bR3\s+Pro\s+2\b/i, 'R3 Pro II')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(value: string): string {
  return value
    .replace(/^\s*(?:pre[- ]?order|new|sale)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
