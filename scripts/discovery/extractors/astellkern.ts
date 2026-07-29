import { anchorMatches, resolveUrl, stripTags, uniqueByName } from '../html';
import type { DiscoveredProduct, DiscoverySource } from '../types';

const playerPattern =
  /\b(?:SP\d{4}(?:T)?|SP\d{4}M|SE\d{3}|SR\d{2,3}(?:\s+MKII)?|KANN(?:\s+(?:ALPHA|MAX|ULTRA))?|SA700|PD\d{2})\b/i;
const rejectPattern = /\b(?:ACRO|CA1000|HC\d+|PA10|AK\s*HB|CRADLE|STELLA|LUNA|XIO|VIRTUOSO|IEM|EARPHONE|HEADPHONE|DAC|AMP)\b/i;
const rejectHrefPattern = /(?:case|cradle|accessor)/i;

export function extractAstellKern(html: string, source: DiscoverySource): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];

  for (const anchor of anchorMatches(html)) {
    const text = stripTags(anchor.inner);
    if (rejectHrefPattern.test(anchor.href)) continue;
    if (!playerPattern.test(text) || rejectPattern.test(text)) continue;
    const model = modelFromText(text);
    if (!model) continue;

    products.push({
      brand: source.brand,
      detectedName: `${source.brand} ${model}`,
      productUrl: resolveUrl(anchor.href, source.url),
      sourceUrl: source.url,
      sourceType: source.type,
    });
  }

  return uniqueByName(products);
}

function modelFromText(value: string): string | null {
  const match = value.match(playerPattern);
  if (!match?.[0]) return null;
  return match[0].replace(/\s+/g, ' ').trim().toUpperCase().replace(' MKII', ' MKII');
}
