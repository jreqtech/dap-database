import { anchorMatches, resolveUrl, stripTags, uniqueByNameAndUrl } from '../html';
import type { DiscoveredProduct, DiscoverySource } from '../types';

const modelPattern = /\bNW-(?:A\d{2,3}|ZX\d{3}|WM1[AZ]M2)\b/i;

export function extractSony(html: string, source: DiscoverySource): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];

  for (const anchor of anchorMatches(html)) {
    const text = stripTags(anchor.inner);
    const match = text.match(modelPattern);
    if (!match?.[0]) continue;

    products.push({
      brand: source.brand,
      detectedName: `Sony ${match[0].toUpperCase()}`,
      productUrl: resolveUrl(anchor.href, source.url),
      sourceUrl: source.url,
      sourceType: source.type,
    });
  }

  return uniqueByNameAndUrl(products);
}
