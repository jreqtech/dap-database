import type { PlayerFeature } from '../types/dap';

export const PLAYER_FEATURES = [
  'Gapless Playback',
  'ReplayGain',
  'M3U Playlists',
  'CUE Sheets',
  'Folder Browsing',
  'Resume Playback',
  'Sleep Timer',
  'Lyrics Support',
];

export interface PlayerFeatureParseResult {
  features: PlayerFeature[];
  warnings: string[];
}

function closestFeatureLabel(label: string): string {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return PLAYER_FEATURES.find((feature) => feature.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized)) ?? '';
}

export function parsePlayerFeatures(value: string): PlayerFeatureParseResult {
  if (!value.trim()) return { features: [], warnings: [] };

  const parsed = new Map<string, boolean>();
  const warnings: string[] = [];

  value.split(';').forEach((rawEntry) => {
    const entry = rawEntry.trim();
    if (!entry) {
      warnings.push('Empty Player Features entry.');
      return;
    }

    const parts = entry.split('|');
    if (parts.length !== 2) {
      warnings.push(`Malformed Player Features entry: ${entry}`);
      return;
    }

    const label = parts[0].trim();
    const supportValue = parts[1].trim();
    if (!label) {
      warnings.push(`Missing Player Features label: ${entry}`);
      return;
    }
    if (!supportValue) {
      warnings.push(`Missing Player Features value for ${label}.`);
      return;
    }

    const approvedLabel = PLAYER_FEATURES.find((feature) => feature === label);
    if (!approvedLabel) {
      const suggestion = closestFeatureLabel(label);
      warnings.push(`Unknown Player Feature: ${label}${suggestion ? `; did you mean ${suggestion}?` : ''}`);
      return;
    }

    if (supportValue !== 'TRUE' && supportValue !== 'FALSE') {
      warnings.push(`Invalid Player Features value for ${label}: ${supportValue}`);
      return;
    }

    if (parsed.has(approvedLabel)) {
      warnings.push(`Duplicate Player Feature: ${approvedLabel}`);
      return;
    }

    parsed.set(approvedLabel, supportValue === 'TRUE');
  });

  return {
    features: PLAYER_FEATURES
      .filter((label) => parsed.has(label))
      .map((label) => ({ label, supported: parsed.get(label) === true })),
    warnings,
  };
}
