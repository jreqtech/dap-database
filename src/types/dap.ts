export type DapStatus = 'Active' | 'Discontinued' | 'Upcoming' | string;

export type VerificationStatus =
  | 'Verified - Official'
  | 'Verified - Official Screenshot'
  | 'Verified - Review'
  | 'Verified - Retail/Web'
  | 'Verified - Web'
  | 'Partial'
  | 'Partial - Official'
  | 'Needs Source'
  | string;

export type MixedSpecValue = number | string | null;

export interface DapImage {
  url: string;
  filename?: string;
  alt: string;
  credit: string;
  sourceUrl: string;
  type: 'official' | 'user-owned' | 'press' | 'permission-granted' | 'placeholder' | string;
}

export interface BuyLink {
  label: string;
  url: string;
}

export type ReviewLink = BuyLink;

export interface Dap {
  id: string;
  brand: string;
  model: string;
  variant: string;
  releaseYear: MixedSpecValue;
  status: DapStatus;
  msrpUsd: MixedSpecValue;
  soc: string;
  os: string;
  ramGb: MixedSpecValue;
  storageGb: MixedSpecValue;
  microSd: boolean | null;
  batteryMah: MixedSpecValue;
  dac: string;
  amp: string;
  has25mm: boolean | null;
  has35mm: boolean | null;
  has44mm: boolean | null;
  has635mm: boolean | null;
  sePowerMw: MixedSpecValue;
  balPowerMw: MixedSpecValue;
  bluetooth: boolean | null;
  wifi: boolean | null;
  cellular: boolean | null;
  has4g: boolean | null;
  has5g: boolean | null;
  bluetoothVersion: string;
  bluetoothCodecs: string[];
  usbDac: boolean | null;
  lineOut: boolean | null;
  coaxOut: boolean | null;
  opticalOut: boolean | null;
  balancedOutputType: string;
  sePowerLoad: string;
  balPowerLoad: string;
  displaySize: string;
  weight: string;
  dimensions: string;
  pcmMax: string;
  dsdMax: string;
  mqa: boolean | null;
  streamingServices: string[];
  wifiBands: string;
  usbPort: string;
  batteryLifeHours: string;
  storageExpansionMax: string;
  officialUrl: string;
  officialStoreUrl: string;
  buyLinks: BuyLink[];
  lastUpdated: string;
  lastUpdatedCommit: string;
  buyNotes: string;
  reviewLinks: ReviewLink[];
  reviewNotes: string;
  sourceUrl: string;
  sourceType: string;
  verificationStatus: VerificationStatus;
  notes: string;
  colors: string[];
  images: DapImage[];
}

export interface DapFilters {
  search: string;
  brand: string[];
  status: string[];
  verificationStatus: string[];
  priceMin: string;
  priceMax: string;
  yearMin: string;
  yearMax: string;
  ramMin: string;
  ramMax: string;
  storageMin: string;
  storageMax: string;
  storageExpansion: string[];
  outputPorts: string[];
  platform: string[];
  connectivity: string[];
  has44mmOnly: boolean;
  androidOnly: boolean;
}

export type SortKey =
  | 'default'
  | 'brand'
  | 'model'
  | 'releaseYear'
  | 'msrpUsd'
  | 'batteryMah'
  | 'has44mm'
  | 'ramGb'
  | 'storageGb'
  | 'storageExpansionMax'
  | 'sePowerMw'
  | 'balPowerMw'
  | 'status'
  | 'verificationStatus'
  | 'officialFirst';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey | null;
  direction: SortDirection;
}
