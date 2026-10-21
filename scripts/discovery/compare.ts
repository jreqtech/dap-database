import { fingerprint, normalizeBaseModel, normalizeBrand, normalizeModelForComparison, similarity, tokenize } from './normalize';
import type { Candidate, DatabaseProduct, DiscoveredProduct } from './types';

export function classifyProducts(discovered: DiscoveredProduct[], database: DatabaseProduct[]): Candidate[] {
  return discovered.map((product) => classifyProduct(product, database));
}

export function classifyProduct(product: DiscoveredProduct, database: DatabaseProduct[]): Candidate {
  const normalizedBrand = normalizeBrand(product.brand);
  const normalizedName = normalizeModelForComparison(product.brand, product.detectedName);
  const normalizedBase = normalizeBaseModel(product.brand, product.detectedName);
  const brandRows = database.filter((row) => row.normalizedBrand === normalizedBrand);

  const matches = brandRows.map((row) => ({
    row,
    score: similarity(normalizedName, row.normalizedIdentity),
    baseScore: similarity(normalizedBase, row.normalizedBase),
  }));
  const closestByIdentity = [...matches].sort((a, b) => b.score - a.score || b.baseScore - a.baseScore)[0];
  const closestByBase = [...matches].sort((a, b) => b.baseScore - a.baseScore || b.score - a.score)[0];
  const documentedBaseMatch = [...matches]
    .filter(
      (match) =>
        match.baseScore >= 0.9 &&
        extraTokensAreDocumented(normalizedName, normalizedBase, match.row.normalizedCorpus),
    )
    .sort((a, b) => a.row.normalizedModel.length - b.row.normalizedModel.length || b.score - a.score)[0];
  let closest = closestByIdentity;

  let classification: Candidate['classification'] = 'likely-new';
  let reason =
    `Official ${product.brand} source contains this product and no sufficiently close Brand + Model + Variant match exists in src/data/daps.csv.`;

  if (!normalizedName || normalizedName.length < 2) {
    classification = 'needs-classification';
    reason = 'Extractor found a product-like entry, but the detected name is too weak for deterministic comparison.';
  } else if (closestByIdentity && closestByIdentity.score >= 0.94) {
    closest = closestByIdentity;
    classification = 'possible-duplicate';
    reason = `Very close normalized match to existing row "${closest.row.displayName}", but source naming differs.`;
  } else if (closestByBase && closestByBase.row.normalizedModel === normalizedName) {
    closest = closestByBase;
    classification = 'possible-duplicate';
    reason = `Exact model match to existing row "${closest.row.displayName}"; source omits the existing row's variant/context text.`;
  } else if (documentedBaseMatch) {
    closest = documentedBaseMatch;
    classification = 'possible-duplicate';
    reason = `Base-model match to existing row "${closest.row.displayName}", and the detected edition or bundle text is already documented in that row.`;
  } else if (closestByBase && closestByBase.baseScore >= 0.9) {
    closest = closestByBase;
    classification = 'possible-variant';
    reason = `Close base-model match to existing row "${closest.row.displayName}", but extra generation, edition, or variant text may matter.`;
  }

  if (product.sourceType === 'retailer' && classification === 'likely-new') {
    classification = 'retail-sighting';
    reason =
      `Retailer listing from ${product.sourceUrl} mentions this DAP-like product, but it still needs official or stronger source verification before becoming a database row.`;
  }

  const candidate: Candidate = {
    ...product,
    classification,
    closestMatch: closest?.row.displayName ?? null,
    score: closest ? Math.max(closest.score, closest.baseScore) : null,
    reason,
    fingerprint: fingerprint([product.brand, normalizedName, classification, product.productUrl]),
    isActionable:
      classification === 'likely-new' ||
      classification === 'possible-variant' ||
      classification === 'retail-sighting' ||
      classification === 'needs-classification',
  };

  return candidate;
}

function extraTokensAreDocumented(normalizedName: string, normalizedBase: string, rowCorpus: string): boolean {
  const baseTokens = new Set(tokenize(normalizedBase));
  const corpusTokens = new Set(tokenize(rowCorpus));
  const extraTokens = tokenize(normalizedName).filter((token) => !baseTokens.has(token) && token !== '+');
  return extraTokens.length > 0 && extraTokens.every((token) => corpusTokens.has(token));
}
