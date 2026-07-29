import { anchorMatches, resolveUrl, stripTags, uniqueByName } from '../html';
import type { DiscoveredProduct, DiscoverySource } from '../types';

const plenuePattern = /\bPLENUE\s+(?:D3|R2|D2|L|V|2\s+MK\s*II|J|R|2|M2|S|D|M|1)\b/i;
const rejectPattern = /\b(?:BASE\s+STATION|REFURBISH|CASE|ACCESSORY|BLUETOOTH|EARPHONE|IEM)\b/i;
const rejectHrefPattern = /(?:from_category=iem|\/iem\/)/i;

export function extractCowon(html: string, source: DiscoverySource): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];

  for (const anchor of anchorMatches(html)) {
    if (rejectHrefPattern.test(anchor.href)) continue;
    const text = stripTags(anchor.inner);
    if (rejectPattern.test(text)) continue;
    const match = text.match(plenuePattern);
    if (!match?.[0]) continue;

    products.push({
      brand: source.brand,
      detectedName: `Cowon ${normalizeModel(match[0])}`,
      productUrl: resolveUrl(anchor.href, source.url),
      sourceUrl: source.url,
      sourceType: source.type,
    });
  }

  return uniqueByName(products);
}

function normalizeModel(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/^plenue/i, 'Plenue').replace(/MK\s*II/i, 'MKII');
}
