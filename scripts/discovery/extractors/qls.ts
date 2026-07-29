import { anchorMatches, resolveUrl, stripTags, uniqueByNameAndUrl } from '../html';
import type { DiscoveredProduct, DiscoverySource } from '../types';

const acceptedModels = new Set(['QA360', 'QA361']);
const nonDapProductTerms = /\b(?:digital\s+turntable|transport|desktop|movable\s+desktop)\b/i;

export function extractQls(html: string, source: DiscoverySource): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];

  for (const anchor of anchorMatches(html)) {
    const text = stripTags(anchor.inner).replace(/\s+/g, ' ').trim();
    if (nonDapProductTerms.test(text)) continue;
    const model = modelFromText(text);
    if (!model) continue;

    products.push({
      brand: source.brand,
      detectedName: `QLS ${model}`,
      productUrl: resolveUrl(anchor.href, source.url),
      sourceUrl: source.url,
      sourceType: source.type,
    });
  }

  return uniqueByNameAndUrl(products);
}

function modelFromText(value: string): string | null {
  if (/QA390LE\/MOD\(QA390V2\)/i.test(value)) return 'QA390LE/MOD(QA390V2)';
  const match = value.match(/\bQA\d{3}\b/i);
  if (!match?.[0]) return null;
  const model = match[0].toUpperCase();
  return acceptedModels.has(model) ? model : null;
}
