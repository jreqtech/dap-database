export type FieldState = 'known' | 'missing' | 'undisclosed' | 'not_applicable' | 'needs_verification';
export type Priority = 'High' | 'Medium' | 'Low' | 'Complete';
export type RowStateFilter = 'all' | 'core_incomplete' | 'current_gaps' | 'needs_review' | 'undisclosed' | 'not_applicable';
export type DashboardFilter = 'core_complete' | 'core_incomplete' | 'actionable_missing' | 'current_models_incomplete' | 'needs_review' | 'top_actionable_missing';

export type CsvRow = Record<string, string>;

export interface FieldRule {
  brand?: string;
  model?: string;
  variant?: string;
  field: string;
  blankState: FieldState;
}

export interface FieldDefinition {
  field: string;
  label?: string;
  applies?: (row: CsvRow) => boolean;
  blankState?: (row: CsvRow) => FieldState;
}

export interface FieldResolution {
  field: string;
  state: FieldState;
}

export interface RowCoverage {
  row: CsvRow;
  fields: FieldResolution[];
  actionableMissing: string[];
  undisclosed: string[];
  notApplicable: string[];
  needsVerification: string[];
  knownApplicable: number;
  applicableTotal: number;
  isCoreComplete: boolean;
  priority: Priority;
}

export interface CoverageSummary {
  totalRows: number;
  coreCompleteRows: number;
  coreIncompleteRows: number;
  actionableMissingFields: number;
  currentModelsIncomplete: number;
  needsReviewRows: number;
  topActionableMissing: { field: string; count: number };
  applicableCoveragePct: number;
  undisclosedFields: number;
  notApplicableFields: number;
  needsVerificationFields: number;
  rows: RowCoverage[];
}

export interface ClassificationAudit {
  totalKnownCoreFields: number;
  totalActionableMissingCoreFields: number;
  totalUndisclosedFields: number;
  totalNotApplicableFields: number;
  totalNeedsVerificationFields: number;
  rowsContaining: Record<FieldState, number>;
  topActionableMissingFields: { field: string; count: number }[];
  topUndisclosedFields: { field: string; count: number }[];
  topNotApplicableFields: { field: string; count: number }[];
  currentCoreCompleteRows: string[];
  currentCoreIncompleteRows: string[];
}

const knownFalse = new Set(['false', '0', 'no', 'none']);
const currentStatuses = new Set(['active', 'upcoming']);

export const coreFieldDefinitions: FieldDefinition[] = [
  { field: 'Release Year' },
  { field: 'Status' },
  { field: 'MSRP USD' },
  { field: 'DAC', blankState: blankIfUndisclosed('dac') },
  {
    field: 'SE Power mW',
    applies: (row) => hasSingleEndedOutput(row),
    blankState: (row) => notesContain(row, ['vrms', 'output level', 'mw power fields are blank', 'mw power field is blank', 'no structured mw value', 'not converted to mw']) ? 'undisclosed' : 'missing',
  },
  {
    field: 'BAL Power mW',
    applies: (row) => hasBalancedOutput(row),
    blankState: (row) => notesContain(row, ['vrms', 'output level', 'mw power fields are blank', 'mw power field is blank', 'no structured mw value', 'not converted to mw']) ? 'undisclosed' : 'missing',
  },
  { field: 'Battery Life Hours', blankState: blankIfUndisclosed('battery life', 'runtime') },
  { field: 'Weight', blankState: blankIfUndisclosed('weight') },
  { field: 'Dimensions', blankState: blankIfUndisclosed('dimensions') },
  {
    field: 'Storage GB',
    blankState: (row) => {
      if (truthyCell(row, 'microSD') || value(row, 'Storage Expansion Max') || notesContain(row, ['no internal storage'])) return 'not_applicable';
      return 'missing';
    },
  },
  { field: 'microSD' },
  {
    field: 'Storage Expansion Max',
    applies: (row) => truthyCell(row, 'microSD'),
  },
  { field: 'USB Port', blankState: blankIfUndisclosed('usb port', 'usb') },
  {
    field: 'Headphone Outputs',
    applies: (row) => hasAnyOutputField(row),
    blankState: (row) => hasAnyHeadphoneOutput(row) ? 'known' : 'missing',
  },
  {
    field: 'Balanced Output',
    applies: () => true,
    blankState: (row) => hasBalancedOutput(row) ? 'known' : 'not_applicable',
  },
  {
    field: 'Bluetooth Version',
    applies: (row) => truthyCell(row, 'Bluetooth'),
    blankState: blankIfUndisclosed('bluetooth version'),
  },
  { field: 'Wi-Fi' },
  {
    field: 'Streaming Services',
    applies: (row) => truthyCell(row, 'Wi-Fi') && !closedNonStreamingPlayer(row),
  },
];

export const technicalFieldDefinitions: FieldDefinition[] = [
  { field: 'SoC', blankState: blankIfUndisclosed('soc', 'processor', 'chipset') },
  {
    field: 'RAM GB',
    applies: (row) => androidLike(row) || value(row, 'RAM GB') !== '',
    blankState: blankIfUndisclosed('ram'),
  },
  { field: 'OS', blankState: (row) => closedFirmwareOnly(row) ? 'not_applicable' : 'missing' },
];

export const defaultFieldRules: FieldRule[] = [
  { brand: 'Sony', field: 'SoC', blankState: 'undisclosed' },
  { brand: 'Sony', field: 'Battery mAh', blankState: 'undisclosed' },
  { field: 'RAM GB', blankState: 'not_applicable' },
];

export function buildRows(headers: string[], rows: string[][]): CsvRow[] {
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

export function resolveFieldState(row: CsvRow, definition: FieldDefinition, rules = defaultFieldRules): FieldResolution {
  if (definition.field === 'Headphone Outputs') {
    return { field: definition.field, state: definition.blankState?.(row) ?? 'missing' };
  }
  if (definition.field === 'Balanced Output') {
    return { field: definition.field, state: definition.blankState?.(row) ?? 'not_applicable' };
  }

  const raw = value(row, definition.field);
  if (raw !== '') return { field: definition.field, state: reviewStateForValue(row, definition.field) ?? 'known' };
  if (definition.applies && !definition.applies(row)) return { field: definition.field, state: 'not_applicable' };

  const matchingRule = findRule(row, definition.field, rules);
  if (matchingRule) return { field: definition.field, state: matchingRule.blankState };

  return { field: definition.field, state: definition.blankState?.(row) ?? 'missing' };
}

export function rowCoverage(row: CsvRow, definitions = coreFieldDefinitions, rules = defaultFieldRules): RowCoverage {
  const fields = definitions.map((definition) => resolveFieldState(row, definition, rules));
  const actionableMissing = fields.filter((field) => field.state === 'missing').map((field) => field.field);
  const undisclosed = fields.filter((field) => field.state === 'undisclosed').map((field) => field.field);
  const notApplicable = fields.filter((field) => field.state === 'not_applicable').map((field) => field.field);
  const needsVerification = fields.filter((field) => field.state === 'needs_verification').map((field) => field.field);
  const knownApplicable = fields.filter((field) => field.state === 'known').length;
  const applicableTotal = fields.filter((field) => field.state === 'known' || field.state === 'missing' || field.state === 'needs_verification').length;
  const isCoreComplete = actionableMissing.length === 0;

  return {
    row,
    fields,
    actionableMissing,
    undisclosed,
    notApplicable,
    needsVerification,
    knownApplicable,
    applicableTotal,
    isCoreComplete,
    priority: priorityForRow(row, actionableMissing.length),
  };
}

export function calculateCoverage(rows: CsvRow[], needsReview: (row: CsvRow) => boolean): CoverageSummary {
  const rowSummaries = rows.map((row) => rowCoverage(row));
  const topMissing = new Map<string, number>();
  let knownApplicable = 0;
  let applicableTotal = 0;
  let actionableMissingFields = 0;
  let undisclosedFields = 0;
  let notApplicableFields = 0;
  let needsVerificationFields = 0;
  let needsReviewRows = 0;
  let currentModelsIncomplete = 0;

  for (const summary of rowSummaries) {
    knownApplicable += summary.knownApplicable;
    applicableTotal += summary.applicableTotal;
    actionableMissingFields += summary.actionableMissing.length;
    undisclosedFields += summary.undisclosed.length;
    notApplicableFields += summary.notApplicable.length;
    needsVerificationFields += summary.needsVerification.length;
    if (needsReview(summary.row)) needsReviewRows += 1;
    if (currentStatuses.has(value(summary.row, 'Status').toLowerCase()) && summary.actionableMissing.length) currentModelsIncomplete += 1;
    for (const field of summary.actionableMissing) topMissing.set(field, (topMissing.get(field) ?? 0) + 1);
  }

  const [field, count] = [...topMissing.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? ['None', 0];

  return {
    totalRows: rows.length,
    coreCompleteRows: rowSummaries.filter((row) => row.isCoreComplete).length,
    coreIncompleteRows: rowSummaries.filter((row) => !row.isCoreComplete).length,
    actionableMissingFields,
    currentModelsIncomplete,
    needsReviewRows,
    topActionableMissing: { field, count },
    applicableCoveragePct: applicableTotal ? Math.round((knownApplicable / applicableTotal) * 100) : 100,
    undisclosedFields,
    notApplicableFields,
    needsVerificationFields,
    rows: rowSummaries,
  };
}

export function isCurrentRow(row: CsvRow): boolean {
  return currentStatuses.has(value(row, 'Status').toLowerCase());
}

export function rowMatchesStateFilter(summary: RowCoverage, filter: RowStateFilter, needsReview: (row: CsvRow) => boolean): boolean {
  if (filter === 'all') return true;
  if (filter === 'core_incomplete') return summary.actionableMissing.length > 0;
  if (filter === 'current_gaps') return isCurrentRow(summary.row) && summary.actionableMissing.length > 0;
  if (filter === 'needs_review') return needsReview(summary.row);
  if (filter === 'undisclosed') return summary.undisclosed.length > 0;
  if (filter === 'not_applicable') return summary.notApplicable.length > 0;
  return true;
}

export function rowMatchesDashboardFilter(
  summary: RowCoverage,
  filter: DashboardFilter | null,
  needsReview: (row: CsvRow) => boolean,
  topActionableField: string,
): boolean {
  if (!filter) return true;
  if (filter === 'core_complete') return summary.actionableMissing.length === 0;
  if (filter === 'core_incomplete' || filter === 'actionable_missing') return summary.actionableMissing.length > 0;
  if (filter === 'current_models_incomplete') return isCurrentRow(summary.row) && summary.actionableMissing.length > 0;
  if (filter === 'needs_review') return needsReview(summary.row);
  if (filter === 'top_actionable_missing') return topActionableField !== 'None' && summary.actionableMissing.includes(topActionableField);
  return true;
}

export function stateTooltip(state: FieldState, field?: string): string {
  const suffix = field ? ` (${field})` : '';
  if (state === 'missing') return `Applicable core field with no documented value yet.${suffix}`;
  if (state === 'undisclosed') return `The field applies, but no defensible public value is currently available.${suffix}`;
  if (state === 'not_applicable') return `This field does not apply to this device.${suffix}`;
  if (state === 'needs_verification') return `The value or source requires manual review.${suffix}`;
  return '';
}

export function calculateClassificationAudit(rows: CsvRow[], needsReview: (row: CsvRow) => boolean): ClassificationAudit {
  const summaries = rows.map((row) => rowCoverage(row));
  const countFields = (selector: (summary: RowCoverage) => string[]) => {
    const counts = new Map<string, number>();
    for (const summary of summaries) {
      for (const field of selector(summary)) counts.set(field, (counts.get(field) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field));
  };

  const rowName = (row: CsvRow) => [value(row, 'Brand'), value(row, 'Model'), value(row, 'Variant')].filter(Boolean).join(' ');

  return {
    totalKnownCoreFields: summaries.reduce((total, summary) => total + summary.knownApplicable, 0),
    totalActionableMissingCoreFields: summaries.reduce((total, summary) => total + summary.actionableMissing.length, 0),
    totalUndisclosedFields: summaries.reduce((total, summary) => total + summary.undisclosed.length, 0),
    totalNotApplicableFields: summaries.reduce((total, summary) => total + summary.notApplicable.length, 0),
    totalNeedsVerificationFields: summaries.reduce((total, summary) => total + summary.needsVerification.length, 0),
    rowsContaining: {
      known: summaries.filter((summary) => summary.knownApplicable > 0).length,
      missing: summaries.filter((summary) => summary.actionableMissing.length > 0).length,
      undisclosed: summaries.filter((summary) => summary.undisclosed.length > 0).length,
      not_applicable: summaries.filter((summary) => summary.notApplicable.length > 0).length,
      needs_verification: summaries.filter((summary) => summary.needsVerification.length > 0 || needsReview(summary.row)).length,
    },
    topActionableMissingFields: countFields((summary) => summary.actionableMissing).slice(0, 10),
    topUndisclosedFields: countFields((summary) => summary.undisclosed).slice(0, 10),
    topNotApplicableFields: countFields((summary) => summary.notApplicable).slice(0, 10),
    currentCoreCompleteRows: summaries.filter((summary) => isCurrentRow(summary.row) && summary.isCoreComplete).map((summary) => rowName(summary.row)),
    currentCoreIncompleteRows: summaries.filter((summary) => isCurrentRow(summary.row) && !summary.isCoreComplete).map((summary) => rowName(summary.row)),
  };
}

export function priorityForRow(row: CsvRow, missingCount: number): Priority {
  if (missingCount === 0) return 'Complete';
  const status = value(row, 'Status').toLowerCase();
  const year = Number(value(row, 'Release Year')) || 0;
  if (status === 'active' || status === 'upcoming') return 'High';
  if (status === 'discontinued' && year >= 2020) return 'Medium';
  return 'Low';
}

export function displayForState(state: FieldState): string {
  if (state === 'missing') return '?';
  if (state === 'undisclosed') return 'Undisclosed';
  if (state === 'not_applicable') return 'N/A';
  if (state === 'needs_verification') return 'Verify';
  return '';
}

function findRule(row: CsvRow, field: string, rules: FieldRule[]): FieldRule | undefined {
  return rules.find((rule) =>
    rule.field === field &&
    (!rule.brand || rule.brand === value(row, 'Brand')) &&
    (!rule.model || rule.model === value(row, 'Model')) &&
    (!('variant' in rule) || rule.variant === value(row, 'Variant'))
  );
}

function value(row: CsvRow, field: string): string {
  return (row[field] ?? '').trim();
}

function truthyCell(row: CsvRow, field: string): boolean {
  return value(row, field).toLowerCase() === 'true';
}

function falseyCell(row: CsvRow, field: string): boolean {
  return knownFalse.has(value(row, field).toLowerCase());
}

function notes(row: CsvRow): string {
  return `${value(row, 'Notes')} ${value(row, 'review_notes')}`.toLowerCase();
}

function notesContain(row: CsvRow, terms: string[]): boolean {
  const text = notes(row);
  return terms.some((term) => text.includes(term));
}

function androidLike(row: CsvRow): boolean {
  const os = value(row, 'OS').toLowerCase();
  const noteText = notes(row);
  return os.includes('android') || noteText.includes('android');
}

function closedFirmwareOnly(row: CsvRow): boolean {
  const os = value(row, 'OS').toLowerCase();
  return !androidLike(row) && (os.includes('proprietary') || os.includes('hiby os') || os.includes('mtouch') || os.includes('linux'));
}

function closedNonStreamingPlayer(row: CsvRow): boolean {
  return closedFirmwareOnly(row) || notesContain(row, ['no streaming', 'no wi-fi', 'no wifi', 'no onboard streaming']);
}

function hasSingleEndedOutput(row: CsvRow): boolean {
  return truthyCell(row, '3.5mm') || truthyCell(row, '6.35mm');
}

function hasBalancedOutput(row: CsvRow): boolean {
  return truthyCell(row, '2.5mm') || truthyCell(row, '4.4mm') || value(row, 'Balanced Output Type') !== '';
}

function hasAnyHeadphoneOutput(row: CsvRow): boolean {
  return hasSingleEndedOutput(row) || hasBalancedOutput(row);
}

function hasAnyOutputField(row: CsvRow): boolean {
  return ['3.5mm', '4.4mm', '2.5mm', '6.35mm', 'Balanced Output Type'].some((field) => value(row, field) !== '');
}

function reviewStateForValue(row: CsvRow, field: string): FieldState | null {
  const text = notes(row);
  const fieldName = field.toLowerCase();
  if (
    text.includes(`${fieldName} needs verification`) ||
    text.includes(`${fieldName} source conflict`) ||
    text.includes(`${fieldName} unclear`) ||
    text.includes(`${fieldName} ambiguous`) ||
    text.includes(`needs verification: ${fieldName}`) ||
    text.includes(`source conflict: ${fieldName}`)
  ) {
    return 'needs_verification';
  }
  if (text.includes('row needs verification') || text.includes('row source conflict')) return 'needs_verification';
  return null;
}

function blankIfUndisclosed(...terms: string[]) {
  return (row: CsvRow): FieldState => {
    const text = notes(row);
    if (terms.some((term) => text.includes(`${term} remains blank`) || text.includes(`${term} does not publish`) || text.includes(`${term} not publish`) || text.includes(`${term} not listed`) || text.includes(`${term} unspecified`))) {
      return 'undisclosed';
    }
    if (text.includes('does not publish') || text.includes('not disclosed') || text.includes('no reliable teardown')) return 'undisclosed';
    return 'missing';
  };
}
