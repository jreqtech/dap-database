import { resolveUrl, stripTags, uniqueByNameAndUrl } from '../html';
import type { DiscoveredProduct, DiscoverySource } from '../types';

export function extractShanling(html: string, source: DiscoverySource): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];
  const productBlocks = html.matchAll(/<div class=["']product-ani["'][\s\S]*?<a href=["']([^"']+)["'][\s\S]*?<h3>([\s\S]*?)<\/h3>/gi);

  for (const match of productBlocks) {
    const href = match[1] ?? '';
    const rawName = stripTags(match[2] ?? '');
    const name = rawName
      .replace(/\bPortable\s+Hi-?Res\s+Music\s+Player\b/gi, '')
      .replace(/\bHi-?Fi\b/gi, '')
      .replace(/\bPortable Player\b/gi, '')
      .replace(/^MO Pura$/i, 'M0 Pura')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name) continue;
    if (/^M30$/i.test(name)) continue;

    products.push({
      brand: source.brand,
      detectedName: `Shanling ${name}`,
      productUrl: resolveUrl(href, source.url),
      sourceUrl: source.url,
      sourceType: source.type,
    });
  }

  return uniqueByNameAndUrl(products);
}
