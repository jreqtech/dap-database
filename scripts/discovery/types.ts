export type SourceType = 'catalog' | 'news' | 'retailer';

export type DiscoverySource = {
  brand: string;
  type: SourceType;
  url: string;
  extractor:
    | 'astellkern'
    | 'cowon'
    | 'fiio'
    | 'shanling'
    | 'ibasso'
    | 'cayin'
    | 'hiby'
    | 'hidizs'
    | 'lotoo'
    | 'qls'
    | 'retailer'
    | 'sony';
  enabled: boolean;
};

export type DiscoveredProduct = {
  brand: string;
  detectedName: string;
  productUrl: string;
  sourceUrl: string;
  sourceType: SourceType;
};

export type DatabaseProduct = {
  brand: string;
  model: string;
  variant: string;
  displayName: string;
  normalizedBrand: string;
  normalizedModel: string;
  normalizedIdentity: string;
  normalizedBase: string;
  normalizedCorpus: string;
};

export type CandidateClassification =
  | 'likely-new'
  | 'possible-variant'
  | 'possible-duplicate'
  | 'retail-sighting'
  | 'needs-classification';

export type Candidate = DiscoveredProduct & {
  classification: CandidateClassification;
  closestMatch: string | null;
  score: number | null;
  reason: string;
  fingerprint: string;
  isActionable: boolean;
};

export type SourceFailure = {
  source: DiscoverySource;
  error: string;
};

export type DiscoveryResult = {
  generatedAt: string;
  sourcesConfigured: number;
  sourcesChecked: number;
  sourceFailures: SourceFailure[];
  discoveredProducts: DiscoveredProduct[];
  candidates: Candidate[];
  actionableCandidates: Candidate[];
  reportPath: string;
};
