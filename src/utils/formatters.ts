import type { MixedSpecValue } from '../types/dap';

const missingValues = new Set(['', '-', 'n/a', 'na', 'unknown', 'tbd']);

export function hasValue(value: MixedSpecValue | boolean | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return true;
  return !missingValues.has(String(value).trim().toLowerCase());
}

export function formatValue(value: MixedSpecValue | boolean | undefined): string {
  if (value === null || value === undefined || value === '') return 'Unknown';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return 'Unknown';
  return value ? 'Yes' : 'No';
}

export function formatPrice(value: MixedSpecValue | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return `$${value.toLocaleString('en-US')}`;
  return String(value);
}

export function formatPower(value: MixedSpecValue | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return `${value.toLocaleString('en-US')} mW`;
  return String(value);
}

export function formatBattery(value: MixedSpecValue | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return `${value.toLocaleString('en-US')} mAh`;
  return String(value);
}

export function formatColors(colors: string[] | null | undefined): string {
  if (!colors?.length) return '-';
  return colors.join(', ');
}
