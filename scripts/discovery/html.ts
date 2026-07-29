import { decodeHtml } from './normalize';

export function resolveUrl(href: string, baseUrl: string): string {
  const url = new URL(decodeHtml(href).trim(), baseUrl).toString();
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function uniqueByNameAndUrl<T extends { detectedName: string; productUrl: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = `${item.detectedName.trim().toLowerCase()}|${item.productUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function uniqueByName<T extends { detectedName: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = item.detectedName.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function anchorMatches(html: string): Array<{ href: string; inner: string }> {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: match[1] ?? '',
    inner: match[2] ?? '',
  }));
}
