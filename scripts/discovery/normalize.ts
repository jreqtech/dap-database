import { createHash } from 'node:crypto';

const romanNumerals = new Set(['ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix']);

export function normalizeBrand(value: string): string {
  return normalizeText(value)
    .replace(/^astell\s*&\s*kern$/, 'astell kern')
    .replace(/^fiio$/, 'fiio')
    .replace(/^hifiman$/, 'hifiman')
    .replace(/^ibasso$/, 'ibasso');
}

export function normalizeText(value: string): string {
  return decodeHtml(value)
    .normalize('NFKC')
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeModelForComparison(brand: string, model: string, variant = ''): string {
  const normalizedBrand = normalizeBrand(brand);
  let value = normalizeText([model, variant].filter(Boolean).join(' '));
  value = value.replace(/&/g, ' ');
  value = value.replace(/\bmo pura\b/g, 'm0 pura');
  value = value.replace(new RegExp(`^${escapeRegExp(normalizedBrand)}\\s+`, 'i'), '');
  value = value.replace(/\bportable\s+hi-?res\s+music\s+player\b/g, '');
  value = value.replace(/\b\d+(?:\.\d+)?\s*inch\b/g, '');
  value = value.replace(/\bm15s\s+5\b/g, 'm15s');
  value = value.replace(/\bpure\s+1-bit\b/g, '');
  value = value.replace(/([a-z]\d+)\((\d+)\)/g, '$1 $2');
  value = value.replace(/\b(dx\d+)(max|mk2)\b/g, '$1 $2');
  value = value.replace(/\bmk\s+ii\b/g, 'mkii');
  value = value.replace(/\bmkii\b/g, 'mkii');
  value = value.replace(/\((\d+)\)/g, ' $1 ');
  value = value.replace(/\s*-\s*/g, '-');
  value = value.replace(/(\d)-(?=pro\b)/g, '$1');
  value = value.replace(/-(?=(master|ti|titanium|brass|black|aluminum|alloy|stainless|steel)\b)/g, ' ');
  value = value.replace(/\s+/g, ' ').trim();
  return value;
}

export function normalizeBaseModel(brand: string, model: string): string {
  const tokens = tokenize(normalizeModelForComparison(brand, model));
  const base: string[] = [];

  for (const token of tokens) {
    if (base.length > 0 && isVariantToken(token)) break;
    base.push(token);
  }

  return base.join(' ');
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}+]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return Number((1 - distance / Math.max(a.length, b.length)).toFixed(3));
}

export function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.map(normalizeText).join('|')).digest('hex').slice(0, 16);
}

export function decodeHtml(value: string): string {
  return value
    .replace(/ï¼ˆ/g, '(')
    .replace(/ï¼‰/g, ')')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function isVariantToken(token: string): boolean {
  if (romanNumerals.has(token)) return false;
  return [
    '+',
    'pro',
    'plus',
    'ultra',
    'max',
    'mini',
    'saber',
    'ltd',
    'limited',
    'titanium',
    'aluminum',
    'alloy',
    'brass',
    'black',
    'amber',
    'pearl',
    'hatsune',
    'miku',
    'x',
    'ti',
    'c201',
    'stainless',
    'steel',
    'mk2',
    'mkii',
    '21',
    'gen',
    'refresh',
    '2020',
    '2021',
    '2022',
    '2023',
    '2024',
    '2025',
    '2026',
  ].includes(token);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length] ?? 0;
}
