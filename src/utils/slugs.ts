import type { Dap } from '../types/dap';

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function dapSlug(dap: Dap): string {
  return [dap.brand, dap.model, dap.variant].filter(Boolean).map(slugify).filter(Boolean).join('-');
}

export function dapDetailHash(dap: Dap): string {
  return `#/dap/${dapSlug(dap)}`;
}

export function dapDetailUrl(dap: Dap): string {
  return `${import.meta.env.BASE_URL}${dapDetailHash(dap)}`;
}

