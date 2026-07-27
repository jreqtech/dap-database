import type { Dap, MixedSpecValue } from '../types/dap';
import { formatBattery, formatColors, formatCompactPrice, formatPower, formatValue, hasValue } from './formatters';
import { getVerificationBadgeMeta } from './dapDisplay';
import { formatStorageExpansion } from './storageDisplay';

export interface DetailRow {
  label: string;
  value: string;
  wide?: boolean;
}

export interface SpecRowDefinition {
  key: string;
  label: string;
  value: (dap: Dap) => string;
}

export interface SpecGroupDefinition {
  key: string;
  label: string;
  rows: SpecRowDefinition[];
}

export function dapDisplayName(dap: Dap): string {
  return [dap.brand, dap.model, dap.variant].filter(Boolean).join(' ');
}

export function listedOr(value: string, missing = ''): string {
  return value.trim() ? value : missing;
}

export function textValue(value: MixedSpecValue | boolean | undefined): string {
  if (!hasValue(value)) return '';
  return formatValue(value);
}

export function listValue(values: string[] | null | undefined): string {
  return values?.length ? formatColors(values) : '';
}

export function gbValue(value: MixedSpecValue | undefined): string {
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

export function hoursValue(value: MixedSpecValue | undefined): string {
  if (!hasValue(value)) return '';
  const raw = String(value).trim();
  if (/hours?|hrs?/i.test(raw)) return raw;
  return `${raw} hours`;
}

export function displaySizeValue(value: MixedSpecValue | undefined): string {
  const raw = textValue(value);
  return raw.replace(/\b(\d+(?:\.\d+)?)\s*in\b/i, '$1 inches');
}

export function weightValue(value: MixedSpecValue | undefined): string {
  const raw = textValue(value);
  if (/^\d+(?:\.\d+)?$/.test(raw)) return `${raw} g`;
  return raw.replace(/\b(\d+(?:\.\d+)?)\s*g\b/i, '$1 g');
}

function ohmValue(value: string): string {
  return value
    .trim()
    .replace(/\s*\u03a9/giu, ' ohms')
    .replace(/\bohms?\b/giu, 'ohms')
    .replace(/\s+/g, ' ');
}

export function powerValue(power: MixedSpecValue | undefined, load: string): string {
  if (!hasValue(power)) return '';
  if (!hasValue(load)) return '';
  return `${formatPower(power)} @ ${ohmValue(load)}`;
}

export function impedanceValue(value: string): string {
  if (!hasValue(value)) return '';
  const raw = ohmValue(value);
  if (/(?:ohms)$/i.test(raw)) return raw;
  return `${raw} ohms`;
  return /(?:ohm|Ω)$/i.test(raw) ? raw : `${raw} ohm`;
}

export function outputSummary(dap: Dap): string {
  const balancedType = dap.balancedOutputType.toLowerCase();
  const outputs: string[] = [];
  if (dap.has35mm) outputs.push('3.5 mm');
  if (dap.has25mm) outputs.push(balancedType.includes('2.5') ? '2.5 mm balanced' : '2.5 mm');
  if (dap.has44mm) outputs.push(balancedType.includes('4.4') ? '4.4 mm balanced' : '4.4 mm');
  if (dap.has635mm) outputs.push('6.35 mm');
  if (dap.lineOut) outputs.push('line out');
  if (dap.coaxOut) outputs.push('coax');
  if (dap.opticalOut) outputs.push('optical');
  return outputs.join(', ');
}

function formatsValue(dap: Dap): string {
  const formats = [];
  if (hasValue(dap.pcmMax)) formats.push(`PCM ${dap.pcmMax}`);
  if (hasValue(dap.dsdMax)) formats.push(String(dap.dsdMax));
  return formats.join(', ');
}

function usbValue(dap: Dap): string {
  const usbParts = [textValue(dap.usbPort)];
  if (dap.usbDac === true) usbParts.push('USB DAC');
  return usbParts.filter(Boolean).join(', ');
}

function addRow(rows: DetailRow[], label: string, value: string, wide = false) {
  if (value) rows.push({ label, value, wide });
}

export function getSummaryRows(dap: Dap): DetailRow[] {
  const rows: DetailRow[] = [];
  addRow(rows, 'Year', textValue(dap.releaseYear));
  addRow(rows, 'MSRP', hasValue(dap.msrpUsd) ? formatCompactPrice(dap.msrpUsd) : '');
  addRow(rows, 'Source status', hasValue(dap.verificationStatus) ? getVerificationBadgeMeta(dap.verificationStatus).label : '');
  return rows;
}

export function getAudioRows(dap: Dap): DetailRow[] {
  const rows: DetailRow[] = [];
  addRow(rows, 'DAC', textValue(dap.dac), true);
  addRow(rows, 'Amplifier', textValue(dap.amp), true);
  addRow(rows, 'Outputs', outputSummary(dap), true);
  addRow(rows, 'Balanced output', textValue(dap.balancedOutputType));
  addRow(rows, 'SE Power', powerValue(dap.sePowerMw, dap.sePowerLoad));
  addRow(rows, 'Balanced power', powerValue(dap.balPowerMw, dap.balPowerLoad));
  addRow(rows, 'SE output impedance', impedanceValue(dap.seOutputImpedanceOhm));
  addRow(rows, 'Balanced output impedance', impedanceValue(dap.balOutputImpedanceOhm));
  return rows;
}

export function getHardwareRows(dap: Dap): DetailRow[] {
  const rows: DetailRow[] = [];
  addRow(rows, 'SoC', textValue(dap.soc));
  addRow(rows, 'RAM', gbValue(dap.ramGb));
  addRow(rows, 'OS', textValue(dap.os));
  addRow(rows, 'Battery', hasValue(dap.batteryMah) ? formatBattery(dap.batteryMah) : '');
  addRow(rows, 'Battery life', hoursValue(dap.batteryLifeHours));
  addRow(rows, 'Display', displaySizeValue(dap.displaySize));
  addRow(rows, 'Weight', weightValue(dap.weight));
  addRow(rows, 'Dimensions', textValue(dap.dimensions), true);
  addRow(rows, 'Storage', gbValue(dap.storageGb));
  addRow(rows, 'Storage expansion', formatStorageExpansion(dap, { showNone: true, showUnknown: true }));
  addRow(rows, 'Colors', listValue(dap.colors), true);
  return rows;
}

export function getConnectivityRows(dap: Dap): DetailRow[] {
  const rows: DetailRow[] = [];
  if (dap.bluetooth === true) addRow(rows, 'Bluetooth', textValue(dap.bluetoothVersion) || 'Yes');
  addRow(rows, 'Codecs', listValue(dap.bluetoothCodecs), true);
  if (dap.wifi === true) addRow(rows, 'Wi-Fi', textValue(dap.wifiBands) || 'Yes');
  if (dap.cellular === true) addRow(rows, 'Cellular', 'Yes');
  if (dap.has4g === true) addRow(rows, '4G', 'Yes');
  if (dap.has5g === true) addRow(rows, '5G', 'Yes');
  addRow(rows, 'USB', usbValue(dap), true);
  addRow(rows, 'Formats', formatsValue(dap));
  if (dap.mqa === true) addRow(rows, 'MQA', 'Yes');
  addRow(rows, 'Streaming', listValue(dap.streamingServices), true);
  return rows;
}

export const comparisonSpecGroups: SpecGroupDefinition[] = [
  {
    key: 'overview',
    label: 'Overview',
    rows: [
      { key: 'status', label: 'Status', value: (dap) => textValue(dap.status) },
      { key: 'year', label: 'Release year', value: (dap) => textValue(dap.releaseYear) },
      { key: 'msrp', label: 'MSRP', value: (dap) => (hasValue(dap.msrpUsd) ? formatCompactPrice(dap.msrpUsd) : '') },
    ],
  },
  {
    key: 'system-storage',
    label: 'System and Storage',
    rows: [
      { key: 'os', label: 'OS', value: (dap) => textValue(dap.os) },
      { key: 'soc', label: 'SoC', value: (dap) => textValue(dap.soc) },
      { key: 'ram', label: 'RAM', value: (dap) => gbValue(dap.ramGb) },
      { key: 'storage', label: 'Storage', value: (dap) => gbValue(dap.storageGb) },
      { key: 'storage-expansion', label: 'Storage expansion', value: (dap) => formatStorageExpansion(dap, { showNone: true, showUnknown: true }) },
    ],
  },
  {
    key: 'audio-hardware',
    label: 'Audio Hardware',
    rows: [
      { key: 'dac', label: 'DAC', value: (dap) => textValue(dap.dac) },
      { key: 'amp', label: 'Amplifier', value: (dap) => textValue(dap.amp) },
    ],
  },
  {
    key: 'outputs-power',
    label: 'Outputs and Power',
    rows: [
      { key: 'outputs', label: 'Outputs', value: outputSummary },
      { key: 'se-power', label: 'SE Power', value: (dap) => powerValue(dap.sePowerMw, dap.sePowerLoad) },
      { key: 'bal-power', label: 'Balanced power', value: (dap) => powerValue(dap.balPowerMw, dap.balPowerLoad) },
      { key: 'se-impedance', label: 'SE output impedance', value: (dap) => impedanceValue(dap.seOutputImpedanceOhm) },
      { key: 'bal-impedance', label: 'Balanced output impedance', value: (dap) => impedanceValue(dap.balOutputImpedanceOhm) },
    ],
  },
  {
    key: 'wireless-connectivity',
    label: 'Wireless and Connectivity',
    rows: [
      { key: 'bluetooth', label: 'Bluetooth', value: (dap) => (dap.bluetooth === true ? textValue(dap.bluetoothVersion) || 'Yes' : dap.bluetooth === false ? 'No' : '') },
      { key: 'codecs', label: 'Codecs', value: (dap) => listValue(dap.bluetoothCodecs) },
      { key: 'wifi', label: 'Wi-Fi', value: (dap) => (dap.wifi === true ? textValue(dap.wifiBands) || 'Yes' : dap.wifi === false ? 'No' : '') },
      { key: 'cellular', label: 'Cellular', value: (dap) => (dap.cellular === true ? 'Yes' : dap.cellular === false ? 'No' : '') },
      { key: 'usb', label: 'USB', value: usbValue },
    ],
  },
  {
    key: 'formats-streaming',
    label: 'Formats and Streaming',
    rows: [
      { key: 'formats', label: 'Formats', value: formatsValue },
      { key: 'mqa', label: 'MQA', value: (dap) => (dap.mqa === true ? 'Yes' : dap.mqa === false ? 'No' : '') },
      { key: 'streaming', label: 'Streaming', value: (dap) => listValue(dap.streamingServices) },
    ],
  },
  {
    key: 'battery',
    label: 'Battery',
    rows: [
      { key: 'battery-mah', label: 'Battery', value: (dap) => (hasValue(dap.batteryMah) ? formatBattery(dap.batteryMah) : '') },
      { key: 'battery-life', label: 'Battery life', value: (dap) => hoursValue(dap.batteryLifeHours) },
    ],
  },
  {
    key: 'display-physical',
    label: 'Physical',
    rows: [
      { key: 'display', label: 'Display', value: (dap) => displaySizeValue(dap.displaySize) },
      { key: 'weight', label: 'Weight', value: (dap) => weightValue(dap.weight) },
      { key: 'dimensions', label: 'Dimensions', value: (dap) => textValue(dap.dimensions) },
      { key: 'colors', label: 'Colors', value: (dap) => listValue(dap.colors) },
    ],
  },
];
