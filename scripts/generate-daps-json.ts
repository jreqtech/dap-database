import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BuyLink, Dap, MixedSpecValue } from '../src/types/dap';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = resolve(projectRoot, 'src/data/daps.csv');
const jsonPath = resolve(projectRoot, 'src/data/daps.json');

function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);

  const [headers = [], ...dataRows] = rows;
  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), dataRow[index]?.trim() ?? ''])),
  );
}

function slugify(parts: string[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseBoolean(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return null;
}

function parseMixedNumber(value: string): MixedSpecValue {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('/') || trimmed.includes('+')) return trimmed;
  const normalized = trimmed.replace(/[$,]/g, '');
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized);
  return trimmed;
}

function splitColors(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split('/')
    .map((color) => color.trim())
    .filter(Boolean);
}

function splitList(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/[;,/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseLabeledLinks(value: string): BuyLink[] {
  if (!value.trim()) return [];

  return value
    .split(';')
    .map((item) => {
      const separatorIndex = item.indexOf('|');
      if (separatorIndex === -1) return null;

      const label = item.slice(0, separatorIndex).trim();
      const url = item.slice(separatorIndex + 1).trim();
      if (!label || !isValidHttpUrl(url)) return null;

      return { label, url };
    })
    .filter((link): link is BuyLink => Boolean(link));
}

const parseBuyLinks = parseLabeledLinks;

function valueFromAny(row: Record<string, string>, columns: string[]): string {
  for (const column of columns) {
    const value = row[column];
    if (value?.trim()) return value.trim();
  }
  return '';
}

function inferVerificationStatus(notes: string, sourceUrl: string): string {
  const lowerNotes = notes.toLowerCase();
  if (lowerNotes.includes('verified - official screenshot')) return 'Verified - Official Screenshot';
  if (lowerNotes.includes('verified - official') || lowerNotes.includes('verified against') || lowerNotes.includes('official page confirms')) {
    return 'Verified - Official';
  }
  if (lowerNotes.includes('verified - review') || lowerNotes.includes('review')) return 'Verified - Review';
  if (lowerNotes.includes('verified - retail/web') || lowerNotes.includes('retail')) return 'Verified - Retail/Web';
  if (lowerNotes.includes('verified - web')) return 'Verified - Web';
  if (lowerNotes.includes('partial - official')) return 'Partial - Official';
  if (lowerNotes.includes('partial')) return 'Partial';
  if (!sourceUrl.trim()) return 'Needs Source';
  return 'Verified - Web';
}

function inferSourceType(verificationStatus: string, sourceUrl: string): string {
  if (!sourceUrl.trim()) return 'None';
  if (verificationStatus.includes('Official Screenshot')) return 'Official Screenshot';
  if (verificationStatus.includes('Official')) return 'Official';
  if (verificationStatus.includes('Review')) return 'Review';
  if (verificationStatus.includes('Retail/Web')) return 'Retail/Web';
  if (verificationStatus.includes('Web')) return 'Web';
  if (verificationStatus.includes('Partial')) return 'Partial';
  return 'Web';
}

function isOfficialSource(url: string, verificationStatus: string): boolean {
  if (!url.trim() || !verificationStatus.includes('Official')) return false;
  const lowerUrl = url.toLowerCase();
  return ![
    'wikipedia.',
    'head-fi.',
    'headfonia.',
    'what hi-fi',
    'whathifi.',
    'androidcentral.',
    'amazon.',
    'aliexpress.',
    'audiophonics.',
  ].some((blocked) => lowerUrl.includes(blocked));
}

function inferImageType(imageType: string, imageSourceUrl: string, sourceUrl: string): string {
  if (imageType.trim()) return imageType.trim();
  if (imageSourceUrl.trim() && imageSourceUrl.trim() === sourceUrl.trim()) return 'official';
  return '';
}

function toDap(row: Record<string, string>): Dap {
  const brand = row.Brand ?? '';
  const model = row.Model ?? '';
  const variant = row.Variant ?? '';
  const sourceUrl = row['Source URL'] ?? '';
  const notes = row.Notes ?? '';
  const verificationStatus = inferVerificationStatus(notes, sourceUrl);
  const imageUrl = row['Image URL'] ?? '';
  const imageSourceUrl = row['Image Source URL'] ?? '';
  const imageFilename = valueFromAny(row, ['image_filename', 'Image Filename']);
  const fallbackImageUrl = imageUrl || valueFromAny(row, ['image_url']);
  const fallbackImageSourceUrl = imageSourceUrl || valueFromAny(row, ['image_source_url']);
  const imageAlt = valueFromAny(row, ['image_alt']) || [brand, model, variant, 'digital audio player'].filter(Boolean).join(' ');
  const imageCredit = row['Image Credit'] || valueFromAny(row, ['image_credit']);
  const colors = splitColors(row.Colors || valueFromAny(row, ['color_variants']));

  return {
    id: slugify([brand, model, variant]),
    brand,
    model,
    variant,
    releaseYear: parseMixedNumber(row['Release Year'] ?? ''),
    status: row.Status ?? '',
    msrpUsd: parseMixedNumber(row['MSRP USD'] ?? ''),
    soc: row.SoC ?? '',
    os: row.OS ?? '',
    ramGb: parseMixedNumber(row['RAM GB'] ?? ''),
    storageGb: parseMixedNumber(row['Storage GB'] ?? ''),
    microSd: parseBoolean(row.microSD ?? ''),
    batteryMah: parseMixedNumber(row['Battery mAh'] ?? ''),
    dac: row.DAC ?? '',
    amp: row.Amp ?? '',
    has25mm: parseBoolean(row['2.5mm'] ?? ''),
    has35mm: parseBoolean(row['3.5mm'] ?? ''),
    has44mm: parseBoolean(row['4.4mm'] ?? ''),
    has635mm: parseBoolean(row['6.35mm'] ?? ''),
    sePowerMw: parseMixedNumber(row['SE Power mW'] ?? ''),
    balPowerMw: parseMixedNumber(row['BAL Power mW'] ?? ''),
    bluetooth: parseBoolean(row.Bluetooth ?? ''),
    wifi: parseBoolean(row['Wi-Fi'] ?? ''),
    cellular: parseBoolean(row.Cellular ?? ''),
    has4g: parseBoolean(row['4G'] ?? ''),
    has5g: parseBoolean(row['5G'] ?? ''),
    bluetoothVersion: row['Bluetooth Version'] ?? '',
    bluetoothCodecs: splitList(row['Bluetooth Codecs'] ?? ''),
    usbDac: parseBoolean(row['USB DAC'] ?? ''),
    lineOut: parseBoolean(row['Line Out'] ?? ''),
    coaxOut: parseBoolean(row['Coax Out'] ?? ''),
    opticalOut: parseBoolean(row['Optical Out'] ?? ''),
    balancedOutputType: row['Balanced Output Type'] ?? '',
    sePowerLoad: row['SE Power Load'] ?? '',
    balPowerLoad: row['BAL Power Load'] ?? '',
    displaySize: row['Display Size'] ?? '',
    weight: row.Weight ?? '',
    dimensions: row.Dimensions ?? '',
    pcmMax: row['PCM Max'] ?? '',
    dsdMax: row['DSD Max'] ?? '',
    mqa: parseBoolean(row.MQA ?? ''),
    streamingServices: splitList(row['Streaming Services'] ?? ''),
    wifiBands: row['Wi-Fi Bands'] ?? '',
    usbPort: row['USB Port'] ?? '',
    batteryLifeHours: row['Battery Life Hours'] ?? '',
    storageExpansionMax: row['Storage Expansion Max'] ?? '',
    officialUrl: isOfficialSource(sourceUrl, verificationStatus) ? sourceUrl : '',
    officialStoreUrl: isValidHttpUrl(row.official_store_url ?? '') ? row.official_store_url : '',
    buyLinks: parseBuyLinks(row.buy_links ?? ''),
    affiliateLinks: [],
    buyNotes: row.buy_notes ?? '',
    reviewLinks: parseLabeledLinks(row.review_links ?? ''),
    reviewNotes: row.review_notes ?? '',
    sourceUrl,
    sourceType: inferSourceType(verificationStatus, sourceUrl),
    verificationStatus,
    notes,
    colors,
    images: imageFilename || fallbackImageUrl.trim()
      ? [
          {
            url: fallbackImageUrl,
            filename: imageFilename || undefined,
            alt: imageAlt,
            credit: imageCredit,
            sourceUrl: '',
            type: inferImageType(row['Image Type'] ?? '', fallbackImageSourceUrl, sourceUrl),
          },
        ]
      : [],
  };
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const daps = rows.map(toDap);
writeFileSync(jsonPath, `${JSON.stringify(daps, null, 2)}\n`);

const countBy = (key: keyof Dap) =>
  daps.reduce<Record<string, number>>((counts, dap) => {
    const value = String(dap[key] || 'Unknown');
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});

console.log(`Generated ${daps.length} DAP entries`);
console.log('Verification status counts:', countBy('verificationStatus'));
console.log('Source type counts:', countBy('sourceType'));
console.log(`officialUrl count: ${daps.filter((dap) => dap.officialUrl).length}`);
console.log(`rows with colors: ${daps.filter((dap) => dap.colors.length > 0).length}`);
console.log(`rows with images: ${daps.filter((dap) => dap.images.length > 0).length}`);
