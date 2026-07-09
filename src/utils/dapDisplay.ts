import type { Dap, DapImage } from '../types/dap';

export interface BadgeMeta {
  label: string;
  className: string;
  title: string;
}

export function isUnknown(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export function isAndroidBased(dap: Dap): boolean {
  return dap.os.toLowerCase().includes('android');
}

export function initialsForDap(dap: Dap): string {
  const brandInitial = dap.brand.trim()[0] ?? 'D';
  const modelInitial = dap.model.trim()[0] ?? 'A';
  return `${brandInitial}${modelInitial}`.toUpperCase();
}

export function imageAltForDap(dap: Dap, image?: DapImage): string {
  return image?.alt || `${dap.brand} ${dap.model} digital audio player`;
}

export function imageUrlForDap(dap: Dap): string {
  const image = dap.images.find((item) => item.url || item.filename);
  if (!image) return '';
  if (image.filename) return `${import.meta.env.BASE_URL}assets/images/daps/${image.filename}`;
  if (image.url.startsWith('assets/images/')) return `${import.meta.env.BASE_URL}${image.url}`;
  return image.url;
}

export function verificationGroup(status: string): 'official' | 'community' | 'unverified' {
  const normalized = status.toLowerCase();
  if (!normalized.trim()) return 'unverified';
  if (normalized.includes('official')) return 'official';
  if (normalized.includes('needs source')) return 'unverified';
  return 'community';
}

export function verificationLabel(status: string): string {
  if (!status.trim()) return 'Unknown';
  const group = verificationGroup(status);
  if (group === 'official') return 'Official';
  if (group === 'community') return 'Community';
  return 'Unverified';
}

export function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('active')) return 'chip--green';
  if (normalized.includes('upcoming')) return 'chip--blue';
  if (normalized.includes('discontinued')) return 'chip--muted';
  return 'chip--neutral';
}

export function getStatusBadgeMeta(status: string): BadgeMeta {
  const normalized = status.trim().toLowerCase();
  const label = status.trim() || 'Unknown';

  if (normalized === 'active') {
    return {
      label,
      className: 'badge-status-active',
      title: 'Product is currently available or still listed as current.',
    };
  }

  if (normalized === 'discontinued') {
    return {
      label,
      className: 'badge-status-discontinued',
      title: 'Product is no longer actively sold by the brand.',
    };
  }

  if (normalized === 'upcoming') {
    return {
      label,
      className: 'badge-status-upcoming',
      title: 'Product has been announced but is not fully released yet.',
    };
  }

  return {
    label,
    className: 'badge-status-discontinued',
    title: 'Product status is not categorized yet.',
  };
}

export function getVerificationBadgeMeta(verification: string): BadgeMeta {
  const normalized = verification.trim().toLowerCase();
  const rawLabel = verification.trim();

  if (normalized === 'official' || normalized === 'verified' || normalized === 'verified - official' || normalized === 'verified - official screenshot') {
    return {
      label: 'Official',
      className: 'badge-verify-official',
      title: 'Specs are verified from an official brand or product page.',
    };
  }

  if (normalized === 'verified - review') {
    return {
      label: 'Review',
      className: 'badge-verify-review',
      title: 'Specs are verified from a third-party review.',
    };
  }

  if (normalized === 'verified - web') {
    return {
      label: 'Web',
      className: 'badge-verify-web',
      title: 'Specs are verified from a public web or spec-table source.',
    };
  }

  if (normalized === 'verified - retail/web') {
    return {
      label: 'Retail/Web',
      className: 'badge-verify-web',
      title: 'Specs are verified from a retailer or public web source.',
    };
  }

  if (normalized === 'verified - news/web') {
    return {
      label: 'News/Web',
      className: 'badge-verify-web',
      title: 'Specs are verified from news coverage or a public web source.',
    };
  }

  if (normalized === 'partial' || normalized === 'partial - official') {
    return {
      label: 'Partial',
      className: 'badge-verify-partial',
      title: 'Some information is verified, but important fields still need better sources.',
    };
  }

  if (normalized === 'needs source') {
    return {
      label: rawLabel,
      className: 'badge-verify-needs-source',
      title: 'This row needs a reliable source before it should be trusted.',
    };
  }

  if (normalized === 'community') {
    return {
      label: 'Community',
      className: 'badge-verify-community',
      title: 'Information comes from community-maintained or non-official sources.',
    };
  }

  if (normalized.includes('review')) {
    return {
      label: 'Review',
      className: 'badge-verify-review',
      title: 'Specs are verified from a third-party review.',
    };
  }

  if (normalized.includes('retail') || normalized.includes('news') || normalized.includes('web')) {
    return {
      label: normalized.includes('retail') ? 'Retail/Web' : normalized.includes('news') ? 'News/Web' : 'Web',
      className: 'badge-verify-web',
      title: 'Specs are verified from a public web or spec-table source.',
    };
  }

  if (normalized.includes('partial')) {
    return {
      label: 'Partial',
      className: 'badge-verify-partial',
      title: 'Some information is verified, but important fields still need better sources.',
    };
  }

  if (normalized.includes('official')) {
    return {
      label: 'Official',
      className: 'badge-verify-official',
      title: 'Specs are verified from an official brand or product page.',
    };
  }

  return {
    label: rawLabel || 'Unknown',
    className: 'badge-verify-community',
    title: 'Information comes from community-maintained or non-official sources.',
  };
}
