import { anchorMatches, resolveUrl, stripTags, uniqueByNameAndUrl } from '../html';
import type { DiscoveredProduct, DiscoverySource } from '../types';

const playerPattern = /\b(?:PAW\s+(?:Gold(?:\s+Touch(?:\s+Titanium)?|\s+10th)?|GT2|6000|Pico)|Mjolnir|Mjölnir)\b/i;
const rejectPattern = /\b(?:PAW\s+S\d|PAW\s+D\d|LTTP|WT-2|MIC|RECORDER|ACCESSORY|CABLE|CASE)\b/i;

export function extractLotoo(html: string, source: DiscoverySource): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];

  for (const anchor of anchorMatches(html)) {
    const text = stripTags(anchor.inner);
    if (rejectPattern.test(text)) continue;
    const match = text.match(playerPattern);
    if (!match?.[0]) continue;

    products.push({
      brand: source.brand,
      detectedName: `Lotoo ${normalizeModel(match[0])}`,
      productUrl: resolveUrl(anchor.href, source.url),
      sourceUrl: source.url,
      sourceType: source.type,
    });
  }

  return uniqueByNameAndUrl(products);
}

function normalizeModel(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/^paw/i, 'PAW').replace(/^mjolnir$/i, 'Mjolnir');
}
