import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { candidateIdentity } from './dedupe-issues';
import type { Candidate, CandidateClassification, DiscoveryResult } from './types';

const sections: Array<[CandidateClassification, string]> = [
  ['likely-new', 'Likely new DAPs'],
  ['possible-variant', 'Possible variants'],
  ['retail-sighting', 'Retail sightings'],
  ['needs-classification', 'Needs classification'],
];

export function writeReport(result: DiscoveryResult, reportPath: string): void {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, renderReport(result), 'utf8');
}

export function renderReport(result: DiscoveryResult): string {
  const lines: string[] = [
    '# DAP Discovery Report',
    '',
    `Run timestamp: ${result.generatedAt}`,
    '',
    `- Sources configured: ${result.sourcesConfigured}`,
    `- Sources successfully checked: ${result.sourcesChecked}`,
    `- Source failures: ${result.sourceFailures.length}`,
    `- Discovered products: ${result.discoveredProducts.length}`,
    `- Actionable candidates: ${result.actionableCandidates.length}`,
    '',
  ];

  if (result.sourceFailures.length > 0) {
    lines.push('## Source failures', '');
    for (const failure of result.sourceFailures) {
      lines.push(`- ${failure.source.brand} (${failure.source.url}): ${failure.error}`);
    }
    lines.push('');
  }

  for (const [classification, heading] of sections) {
    lines.push(`## ${heading}`, '');
    const candidates = result.candidates.filter((candidate) => candidate.classification === classification);
    if (candidates.length === 0) {
      lines.push('None.', '');
      continue;
    }

    for (const candidate of candidates) {
      lines.push(renderCandidate(candidate), '');
    }
  }

  const duplicateCount = result.candidates.filter((candidate) => candidate.classification === 'possible-duplicate').length;
  const trackedCount = result.candidates.filter((candidate) => candidate.classification === 'tracked-roadmap').length;
  lines.push('## Known duplicates', '', `${duplicateCount} existing catalog matches hidden from this report.`, '');
  lines.push('## Already tracked', '', `${trackedCount} roadmap candidates hidden from actionable sections.`, '');

  return `${lines.join('\n').trim()}\n`;
}

function renderCandidate(candidate: Candidate): string {
  return [
    `### ${candidate.detectedName}`,
    '',
    `<!-- dap-discovery-fingerprint:${candidate.fingerprint} -->`,
    `<!-- dap-discovery-identity:${candidateIdentity(candidate)} -->`,
    '',
    `- Brand: ${candidate.brand}`,
    `- Detected name: ${candidate.detectedName}`,
    `- ${candidate.sourceType === 'retailer' ? 'Retail listing' : 'Official product'}: ${candidate.productUrl}`,
    `- Found on: ${candidate.sourceUrl}`,
    `- Source type: ${candidate.sourceType}`,
    `- Closest database match: ${candidate.closestMatch ?? 'None'}`,
    `- Comparison score: ${candidate.score ?? 'N/A'}`,
    `- Classification: ${candidate.classification}`,
    `- Fingerprint: ${candidate.fingerprint}`,
    '',
    `Reason: ${candidate.reason}`,
  ].join('\n');
}
