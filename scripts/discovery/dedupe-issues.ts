import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { normalizeBrand, normalizeModelForComparison } from './normalize';

type Options = {
  resultPath: string;
  issuesPath: string;
  reportPath: string;
};

type ResultFile = {
  actionableCandidates: CandidateLike[];
};

type Issue = {
  body?: string;
};

type CandidateLike = {
  brand: string;
  detectedName: string;
  fingerprint: string;
};

type DedupeResult = {
  shouldCreateIssue: boolean;
  newFingerprintCount: number;
  candidateCount: number;
  existingFingerprintCount: number;
  existingIdentityCount: number;
};

export function checkDiscoveryIssueDedupe(result: ResultFile, issues: Issue[]): DedupeResult {
  const existingFingerprints = new Set<string>();
  const existingIdentities = new Set<string>();

  for (const issue of issues) {
    const body = issue.body ?? '';
    for (const match of body.matchAll(/dap-discovery-fingerprint:([a-f0-9]+)/g)) {
      existingFingerprints.add(match[1] ?? '');
    }
    for (const match of body.matchAll(/dap-discovery-identity:([^-<]+)/g)) {
      existingIdentities.add((match[1] ?? '').trim());
    }
    for (const section of body.split(/^### /m).slice(1)) {
      const legacyIdentity = identityFromLegacyIssueSection(section);
      if (legacyIdentity) existingIdentities.add(legacyIdentity);
    }
  }

  const newCandidates = result.actionableCandidates.filter(
    (candidate) => !existingFingerprints.has(candidate.fingerprint) && !existingIdentities.has(candidateIdentity(candidate)),
  );

  return {
    shouldCreateIssue: newCandidates.length > 0,
    newFingerprintCount: newCandidates.length,
    candidateCount: result.actionableCandidates.length,
    existingFingerprintCount: existingFingerprints.size,
    existingIdentityCount: existingIdentities.size,
  };
}

export function candidateIdentity(candidate: CandidateLike): string {
  return `${normalizeBrand(candidate.brand)}|${normalizeModelForComparison(candidate.brand, candidate.detectedName)}`;
}

function identityFromLegacyIssueSection(section: string): string | null {
  const brand = section.match(/^- Brand:\s*(.+)$/m)?.[1]?.trim();
  const detectedName = section.match(/^- Detected name:\s*(.+)$/m)?.[1]?.trim();
  if (!brand || !detectedName) return null;
  return candidateIdentity({ brand, detectedName, fingerprint: '' });
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const result = JSON.parse(readFileSync(options.resultPath, 'utf8')) as ResultFile;
  const issues = JSON.parse(readFileSync(options.issuesPath, 'utf8')) as Issue[];
  const dedupe = checkDiscoveryIssueDedupe(result, issues);

  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    appendFileSync(
      outputPath,
      [
        `should_create_issue=${dedupe.shouldCreateIssue}`,
        `new_fingerprint_count=${dedupe.newFingerprintCount}`,
        `candidate_count=${dedupe.candidateCount}`,
        `report_path=${options.reportPath}`,
        '',
      ].join('\n'),
      'utf8',
    );
  }

  console.log(`Existing actionable fingerprints: ${dedupe.existingFingerprintCount}`);
  console.log(`Existing actionable identities: ${dedupe.existingIdentityCount}`);
  console.log(`Current actionable candidates: ${dedupe.candidateCount}`);
  console.log(`New actionable candidates: ${dedupe.newFingerprintCount}`);
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    resultPath: 'tmp/dap-discovery-result.json',
    issuesPath: 'tmp/dap-discovery-open-issues.json',
    reportPath: 'tmp/dap-discovery-report.md',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--result') options.resultPath = args[++index] ?? options.resultPath;
    else if (arg === '--issues') options.issuesPath = args[++index] ?? options.issuesPath;
    else if (arg === '--report') options.reportPath = args[++index] ?? options.reportPath;
  }

  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
