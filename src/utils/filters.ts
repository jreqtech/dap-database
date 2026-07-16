import type { Dap, DapFilters, MixedSpecValue, SortState } from '../types/dap';
import { verificationGroup } from './dapDisplay';
import { storageExpansionSortValue, storageExpansionState } from './storageDisplay';

function searchable(value: unknown): string {
  if (Array.isArray(value)) return value.join(' ').toLowerCase();
  return String(value ?? '').toLowerCase();
}

function featureText(dap: Dap): string {
  return [
    dap.brand,
    dap.model,
    dap.variant,
    dap.soc,
    dap.os,
    dap.dac,
    dap.amp,
    dap.bluetoothVersion,
    searchable(dap.bluetoothCodecs),
    dap.balancedOutputType,
    dap.displaySize,
    dap.weight,
    dap.dimensions,
    dap.pcmMax,
    dap.dsdMax,
    searchable(dap.streamingServices),
    dap.wifiBands,
    dap.usbPort,
    dap.batteryLifeHours,
    dap.storageExpansionMax,
    dap.notes,
    dap.sourceType,
    searchable(dap.colors),
  ].join(' ').toLowerCase();
}

function searchTokens(term: string): string[] {
  return term
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function numberFromFilter(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function numberFromMixed(value: MixedSpecValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('+')) return null;
  const normalized = trimmed.replace(/[$,]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

function compareMixed(a: MixedSpecValue, b: MixedSpecValue, direction: 'asc' | 'desc'): number {
  const aNumber = numberFromMixed(a);
  const bNumber = numberFromMixed(b);

  if (aNumber !== null && bNumber !== null) {
    return direction === 'asc' ? aNumber - bNumber : bNumber - aNumber;
  }

  if (aNumber !== null) return -1;
  if (bNumber !== null) return 1;

  const textResult = compareText(String(a ?? ''), String(b ?? ''));
  return direction === 'asc' ? textResult : -textResult;
}

function booleanRank(value: boolean | null): number {
  if (value === true) return 1;
  if (value === false) return 0;
  return -1;
}

function compareBoolean(a: boolean | null, b: boolean | null, direction: 'asc' | 'desc'): number {
  const result = booleanRank(a) - booleanRank(b);
  return direction === 'asc' ? result : -result;
}

function compareDefaultOrder(a: Dap, b: Dap): number {
  const yearResult = compareMixed(a.releaseYear, b.releaseYear, 'desc');
  if (yearResult) return yearResult;

  const brandResult = compareText(a.brand, b.brand);
  if (brandResult) return brandResult;

  const modelResult = compareText(a.model, b.model);
  if (modelResult) return modelResult;

  return compareText(a.variant, b.variant);
}

export function filterDaps(daps: Dap[], filters: DapFilters): Dap[] {
  const term = filters.search.trim().toLowerCase();
  const terms = searchTokens(term);
  const priceMin = numberFromFilter(filters.priceMin);
  const priceMax = numberFromFilter(filters.priceMax);
  const yearMin = numberFromFilter(filters.yearMin);
  const yearMax = numberFromFilter(filters.yearMax);
  const ramMin = numberFromFilter(filters.ramMin);
  const ramMax = numberFromFilter(filters.ramMax);
  const storageMin = numberFromFilter(filters.storageMin);
  const storageMax = numberFromFilter(filters.storageMax);

  return daps.filter((dap) => {
    if (filters.brand.length && !filters.brand.includes(dap.brand)) return false;
    if (filters.status.length && !filters.status.includes(dap.status)) return false;
    if (filters.verificationStatus.length && !filters.verificationStatus.includes(dap.verificationStatus)) return false;
    if (filters.has44mmOnly && dap.has44mm !== true) return false;
    if (filters.androidOnly && !dap.os.toLowerCase().includes('android')) return false;
    if (filters.outputPorts.includes('2.5mm') && dap.has25mm !== true) return false;
    if (filters.outputPorts.includes('3.5mm') && dap.has35mm !== true) return false;
    if (filters.outputPorts.includes('4.4mm') && dap.has44mm !== true) return false;
    if (filters.outputPorts.includes('6.35mm') && dap.has635mm !== true) return false;
    if (filters.platform.includes('Android') && !dap.os.toLowerCase().includes('android')) return false;
    if (filters.platform.includes('Non-Android') && dap.os.toLowerCase().includes('android')) return false;
    if (filters.connectivity.includes('Bluetooth') && dap.bluetooth !== true) return false;
    if (filters.connectivity.includes('Wi-Fi') && dap.wifi !== true) return false;
    if (filters.connectivity.includes('Cellular') && dap.cellular !== true) return false;
    if (filters.connectivity.includes('4G') && dap.has4g !== true) return false;
    if (filters.connectivity.includes('5G') && dap.has5g !== true) return false;
    if (filters.storageExpansion.length && !filters.storageExpansion.includes(storageExpansionState(dap))) return false;

    if (priceMin !== null || priceMax !== null) {
      const price = numberFromMixed(dap.msrpUsd);
      if (price === null) return false;
      if (priceMin !== null && price < priceMin) return false;
      if (priceMax !== null && price > priceMax) return false;
    }

    if (yearMin !== null || yearMax !== null) {
      const year = numberFromMixed(dap.releaseYear);
      if (year === null) return false;
      if (yearMin !== null && year < yearMin) return false;
      if (yearMax !== null && year > yearMax) return false;
    }

    if (ramMin !== null || ramMax !== null) {
      const ram = numberFromMixed(dap.ramGb);
      if (ram === null) return false;
      if (ramMin !== null && ram < ramMin) return false;
      if (ramMax !== null && ram > ramMax) return false;
    }

    if (storageMin !== null || storageMax !== null) {
      const storage = numberFromMixed(dap.storageGb);
      if (storage === null) return false;
      if (storageMin !== null && storage < storageMin) return false;
      if (storageMax !== null && storage > storageMax) return false;
    }

    if (!terms.length) return true;
    const text = featureText(dap);
    return terms.every((token) => text.includes(token));
  });
}

export function sortDaps(daps: Dap[], sortState: SortState): Dap[] {
  if (!sortState.key) return [...daps];

  const sorted = [...daps];

  sorted.sort((a, b) => {
    switch (sortState.key) {
      case 'default':
        return compareDefaultOrder(a, b);
      case 'brand':
        return sortState.direction === 'asc'
          ? compareText(`${a.brand} ${a.model}`, `${b.brand} ${b.model}`)
          : compareText(`${b.brand} ${b.model}`, `${a.brand} ${a.model}`);
      case 'model':
        return sortState.direction === 'asc'
          ? compareText(`${a.model} ${a.brand}`, `${b.model} ${b.brand}`)
          : compareText(`${b.model} ${b.brand}`, `${a.model} ${a.brand}`);
      case 'releaseYear':
        return compareMixed(a.releaseYear, b.releaseYear, sortState.direction);
      case 'msrpUsd':
        return compareMixed(a.msrpUsd, b.msrpUsd, sortState.direction);
      case 'batteryMah':
        return compareMixed(a.batteryMah, b.batteryMah, sortState.direction);
      case 'has44mm':
        return compareBoolean(a.has44mm, b.has44mm, sortState.direction);
      case 'ramGb':
        return compareMixed(a.ramGb, b.ramGb, sortState.direction);
      case 'storageGb':
        return compareMixed(a.storageGb, b.storageGb, sortState.direction);
      case 'storageExpansionMax': {
        const aNumber = storageExpansionSortValue(a.storageExpansionMax);
        const bNumber = storageExpansionSortValue(b.storageExpansionMax);
        if (aNumber !== null && bNumber !== null) {
          return sortState.direction === 'asc' ? aNumber - bNumber : bNumber - aNumber;
        }
        if (aNumber !== null) return -1;
        if (bNumber !== null) return 1;
        return sortState.direction === 'asc'
          ? compareText(a.storageExpansionMax, b.storageExpansionMax)
          : compareText(b.storageExpansionMax, a.storageExpansionMax);
      }
      case 'sePowerMw':
        return compareMixed(a.sePowerMw, b.sePowerMw, sortState.direction);
      case 'balPowerMw':
        return compareMixed(a.balPowerMw, b.balPowerMw, sortState.direction);
      case 'status':
        return sortState.direction === 'asc'
          ? compareText(a.status, b.status)
          : compareText(b.status, a.status);
      case 'verificationStatus':
        return sortState.direction === 'asc'
          ? compareText(a.verificationStatus, b.verificationStatus)
          : compareText(b.verificationStatus, a.verificationStatus);
      case 'officialFirst': {
        const rank = (dap: Dap) => {
          const group = verificationGroup(dap.verificationStatus);
          if (group === 'official') return 0;
          if (group === 'community') return 1;
          return 2;
        };
        const rankResult = rank(a) - rank(b);
        return rankResult || compareText(`${a.brand} ${a.model}`, `${b.brand} ${b.model}`);
      }
      default:
        return 0;
    }
  });

  return sorted;
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => compareText(a, b));
}
