import type { Dap, MixedSpecValue } from '../types/dap';
import { hasValue } from './formatters';

export type StorageExpansionState = 'expandable' | 'none' | 'unknown';

function gbValue(value: MixedSpecValue | undefined): string {
  if (!hasValue(value)) return '';
  if (typeof value === 'number') {
    if (value > 0 && value < 1) return `${(value * 1000).toLocaleString('en-US')} MB`;
    return `${value.toLocaleString('en-US')} GB`;
  }
  const raw = String(value).trim();
  const numericValue = Number(raw);
  if (Number.isFinite(numericValue) && numericValue > 0 && numericValue < 1) {
    return `${(numericValue * 1000).toLocaleString('en-US')} MB`;
  }
  const spaced = raw.replace(/(\d)\s*(GB|TB)\b/gi, '$1 $2');
  return /(?:gb|tb)$/i.test(spaced) ? spaced : `${spaced} GB`;
}

function expansionMedium(dap: Dap): string {
  if (dap.microSd === true) return 'microSD';
  if (dap.storageExpansionMax) return 'card';
  return '';
}

export function storageExpansionState(dap: Dap): StorageExpansionState {
  if (dap.microSd === false) return 'none';
  if (dap.microSd === true || dap.storageExpansionMax.trim()) return 'expandable';
  return 'unknown';
}

export function formatStorageExpansion(dap: Dap, options: { showUnknown?: boolean; showNone?: boolean } = {}): string {
  const state = storageExpansionState(dap);
  if (state === 'none') return options.showNone ? 'None' : '';
  if (state === 'unknown') return options.showUnknown ? '?' : '';

  const medium = expansionMedium(dap);
  if (!medium) return '';
  const max = dap.storageExpansionMax.trim();
  if (!max) return medium;
  if (/^(under|less than|below)\b/i.test(max)) return `${medium} ${max}`;
  return `${medium} up to ${max}`;
}

export function formatStorageSummary(dap: Dap): string {
  const parts = [];
  const internal = gbValue(dap.storageGb);
  const expansion = formatStorageExpansion(dap);

  if (internal && internal !== '0 GB') parts.push(`${internal} internal`);
  if (expansion) parts.push(expansion);

  return parts.join(' • ');
}

export function storageExpansionSortValue(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const pairMatch = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(tb|gb)/);
  if (pairMatch) {
    const count = Number(pairMatch[1]);
    const amount = Number(pairMatch[2]);
    const unit = pairMatch[3];
    return count * amount * (unit === 'tb' ? 1000 : 1);
  }

  const totals = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(tb|gb)/g)];
  if (!totals.length) return null;

  const values = totals.map((match) => {
    const amount = Number(match[1]);
    const unit = match[2];
    return amount * (unit === 'tb' ? 1000 : 1);
  });

  if (normalized.includes('total')) return Math.max(...values);
  return values[0];
}
