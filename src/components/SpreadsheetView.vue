<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ArrowDown, ArrowUp, RotateCcw, Search } from 'lucide-vue-next';
import type { Dap } from '../types/dap';
import {
  buildRows,
  calculateCoverage,
  coreFieldDefinitions,
  displayForState,
  resolveFieldState,
  rowCoverage,
  technicalFieldDefinitions,
  type CsvRow,
  type FieldState,
  type Priority,
} from '../utils/coverage';

const props = defineProps<{
  csv: string;
  daps: Dap[];
}>();

const emit = defineEmits<{
  openDap: [dap: Dap];
}>();

type Density = 'compact' | 'comfortable';
type SheetSortKey = number | 'priority' | 'missing' | 'review' | null;
type SheetSort = { columnIndex: SheetSortKey; direction: 'asc' | 'desc' };
type SheetRow = { cells: string[]; csvIndex: number };
type Triage = { priority: Priority; missingCount: number; score: number };
type SheetMetric = { label: string; value: string | number; detail: string };
type SecondaryMetric = { label: string; value: string | number };

const searchTerm = ref('');
const density = ref<Density>('comfortable');
const sortState = ref<SheetSort>({ columnIndex: 'missing', direction: 'desc' });
const columnWidths = ref<Record<number, number>>({});
const resizingColumn = ref<{ index: number; startX: number; startWidth: number } | null>(null);
const sheetScrollPane = ref<HTMLElement | null>(null);
const sheetPinnedPane = ref<HTMLElement | null>(null);
const missingPopover = ref<HTMLElement | null>(null);
const expandedMissingCsvIndex = ref<number | null>(null);
const missingPopoverPosition = ref({ top: 0, left: 0 });
const requiredAuditColumns = new Set([
  'Brand',
  'Model',
  'Release Year',
  'Status',
  'Source URL',
  'Notes',
  'image_filename',
]);
const optionalBlankColumns = new Set([
  'Variant',
  'MSRP USD',
  'SoC',
  'Amp',
  'Image URL',
  'Image Source URL',
  'Image Credit',
  'Image Type',
  'image_url',
  'image_source_url',
  'image_credit',
  'color_variants',
  '2.5mm',
  '6.35mm',
  'Cellular',
  '4G',
  '5G',
  'Bluetooth Version',
  'Bluetooth Codecs',
  'Line Out',
  'Coax Out',
  'Optical Out',
  'SE Power Load',
  'BAL Power Load',
  'Streaming Services',
  'Wi-Fi Bands',
  'official_store_url',
  'buy_links',
  'last_updated',
  'last_updated_commit',
  'buy_notes',
  'review_links',
  'review_notes',
]);
const hiddenSheetColumns = new Set(['Variant', 'last_updated_commit']);
const highValueAuditColumns = new Set([
  'Release Year',
  'Status',
  'Source URL',
  'SoC',
  'OS',
  'RAM GB',
  'Storage GB',
  'Battery mAh',
  'DAC',
  'Amp',
  'Colors',
  'image_filename',
  'Display Size',
  'Weight',
  'Dimensions',
  'PCM Max',
  'DSD Max',
  'USB Port',
  'Battery Life Hours',
  'Storage Expansion Max',
]);

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

const csvRows = computed(() => parseCsv(props.csv.trimEnd()));
const headers = computed(() => csvRows.value[0] ?? []);
const visibleColumnIndices = computed(() => {
  const columns = headers.value
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => !hiddenSheetColumns.has(header));
  const lastUpdated = columns.find((column) => column.header === 'last_updated');
  if (!lastUpdated) return columns.map(({ index }) => index);

  const ordered = columns.filter((column) => column.header !== 'last_updated');
  const msrpIndex = ordered.findIndex((column) => column.header === 'MSRP USD');
  ordered.splice(msrpIndex === -1 ? ordered.length : msrpIndex + 1, 0, lastUpdated);
  return ordered.map(({ index }) => index);
});
const dataRows = computed<SheetRow[]>(() => csvRows.value.slice(1).map((cells, index) => ({ cells, csvIndex: index })));
const csvDataObjects = computed<CsvRow[]>(() => buildRows(headers.value, csvRows.value.slice(1)));
const normalizedSearch = computed(() => searchTerm.value.trim().toLowerCase());
const isSorted = computed(() => sortState.value.columnIndex !== -1);

const filteredRows = computed(() => {
  if (!normalizedSearch.value) return dataRows.value;
  return dataRows.value.filter((row) => row.cells.some((cell) => cell.toLowerCase().includes(normalizedSearch.value)));
});

const displayedRows = computed(() => {
  const columnIndex = sortState.value.columnIndex;
  const rows = [...filteredRows.value];
  if (columnIndex === null) return rows.sort(compareTriageRows);
  if (columnIndex === -1) return rows;
  if (columnIndex === 'priority') return rows.sort(comparePriorityRows);
  if (columnIndex === 'missing') return rows.sort(compareMissingRows);
  if (columnIndex === 'review') return rows.sort(compareReviewRows);

  return rows.sort((a, b) => {
    const header = headers.value[columnIndex] ?? '';
    const valueA = a.cells[columnIndex] ?? '';
    const valueB = b.cells[columnIndex] ?? '';
    if (header === 'last_updated') {
      const timeA = timestampValue(valueA);
      const timeB = timestampValue(valueB);
      const result = timeA - timeB;
      return sortState.value.direction === 'asc' ? result : -result;
    }
    const numericA = Number(valueA.replace(/[$,]/g, ''));
    const numericB = Number(valueB.replace(/[$,]/g, ''));
    const bothNumeric = valueA.trim() !== '' && valueB.trim() !== '' && !Number.isNaN(numericA) && !Number.isNaN(numericB);
    const result = bothNumeric
      ? numericA - numericB
      : valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: 'base' });
    return sortState.value.direction === 'asc' ? result : -result;
  });
});
const selectedMissingRow = computed(() => {
  if (expandedMissingCsvIndex.value === null) return null;
  return displayedRows.value.find((row) => row.csvIndex === expandedMissingCsvIndex.value) ?? null;
});
const selectedMissingHeaders = computed(() => (selectedMissingRow.value ? missingHeadersForCells(selectedMissingRow.value.cells, selectedMissingRow.value.csvIndex) : []));
const filteredCoverage = computed(() =>
  calculateCoverage(
    filteredRows.value.map((row) => rowObject(row.cells, row.csvIndex)),
    needsManualReviewObject,
  ),
);

const sheetMetrics = computed<SheetMetric[]>(() => {
  const rows = filteredRows.value;
  const totalRows = rows.length || 1;
  const coverage = filteredCoverage.value;

  return [
    { label: 'Total rows', value: coverage.totalRows, detail: `${coverage.totalRows} CSV rows shown` },
    { label: 'Core complete', value: coverage.coreCompleteRows, detail: `${Math.round((coverage.coreCompleteRows / totalRows) * 100)}% of current rows` },
    { label: 'Core incomplete', value: coverage.coreIncompleteRows, detail: `${Math.round((coverage.coreIncompleteRows / totalRows) * 100)}% with actionable gaps` },
    { label: 'Actionable missing', value: coverage.actionableMissingFields, detail: 'Applicable blank core fields' },
    { label: 'Current models incomplete', value: coverage.currentModelsIncomplete, detail: 'Active or upcoming with core gaps' },
    { label: 'Needs review', value: coverage.needsReviewRows, detail: 'Source or note flags' },
    { label: 'Top actionable missing', value: coverage.topActionableMissing.field, detail: coverage.topActionableMissing.count ? `${coverage.topActionableMissing.count} rows` : 'No actionable blanks' },
  ];
});

const secondaryMetrics = computed<SecondaryMetric[]>(() => [
  { label: 'Applicable field coverage', value: `${filteredCoverage.value.applicableCoveragePct}%` },
  { label: 'Undisclosed fields', value: filteredCoverage.value.undisclosedFields },
  { label: 'Not applicable fields', value: filteredCoverage.value.notApplicableFields },
  { label: 'Needs verification fields', value: filteredCoverage.value.needsVerificationFields },
]);

const pinnedColumnCount = 2;
const pinnedColumnIndices = computed(() => visibleColumnIndices.value.slice(0, pinnedColumnCount));
const scrollColumnIndices = computed(() => visibleColumnIndices.value.slice(pinnedColumnCount));

function sortColumn(columnIndex: number) {
  if (sortState.value.columnIndex !== columnIndex) {
    sortState.value = { columnIndex, direction: 'asc' };
    return;
  }

  sortState.value = {
    columnIndex,
    direction: sortState.value.direction === 'asc' ? 'desc' : 'asc',
  };
}

function sortMetaColumn(columnIndex: 'priority' | 'missing' | 'review') {
  if (sortState.value.columnIndex !== columnIndex) {
    sortState.value = { columnIndex, direction: columnIndex === 'priority' ? 'asc' : 'desc' };
    return;
  }

  sortState.value = {
    columnIndex,
    direction: sortState.value.direction === 'asc' ? 'desc' : 'asc',
  };
}

function restoreCsvOrder() {
  sortState.value = { columnIndex: -1, direction: 'asc' };
  expandedMissingCsvIndex.value = null;
}

function openRow(csvIndex: number) {
  const dap = props.daps[csvIndex];
  if (dap) emit('openDap', dap);
}

function focusCell(rowIndex: number, columnIndex: number) {
  const row = Math.min(Math.max(rowIndex, 0), displayedRows.value.length - 1);
  const visibleIndex = visibleColumnIndices.value.indexOf(columnIndex);
  const fallbackIndex = visibleIndex === -1 ? 0 : visibleIndex;
  const nextVisibleIndex = Math.min(Math.max(fallbackIndex, 0), visibleColumnIndices.value.length - 1);
  const column = visibleColumnIndices.value[nextVisibleIndex] ?? 0;
  const selector = `[data-sheet-row="${row}"][data-sheet-column="${column}"]`;
  const nextCell = document.querySelector<HTMLElement>(selector);
  nextCell?.focus();
  nextCell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function handleCellKeydown(event: KeyboardEvent, rowIndex: number, columnIndex: number) {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusCell(rowIndex - 1, columnIndex);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusCell(rowIndex + 1, columnIndex);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    const visibleIndex = visibleColumnIndices.value.indexOf(columnIndex);
    focusCell(rowIndex, visibleColumnIndices.value[Math.max(visibleIndex - 1, 0)] ?? columnIndex);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    const visibleIndex = visibleColumnIndices.value.indexOf(columnIndex);
    focusCell(rowIndex, visibleColumnIndices.value[Math.min(visibleIndex + 1, visibleColumnIndices.value.length - 1)] ?? columnIndex);
  } else if ((event.key === 'Enter' || event.key === ' ') && columnIndex === 1) {
    event.preventDefault();
    const row = displayedRows.value[rowIndex];
    if (row) openRow(row.csvIndex);
  }
}

function cellByHeader(cells: string[], header: string): string {
  const index = headers.value.indexOf(header);
  return index === -1 ? '' : cells[index] ?? '';
}

function rowObject(cells: string[], csvIndex: number): CsvRow {
  return csvDataObjects.value[csvIndex] ?? Object.fromEntries(headers.value.map((header, index) => [header, cells[index] ?? '']));
}

function numberByHeader(cells: string[], header: string): number | null {
  const value = cellByHeader(cells, header).replace(/[$,]/g, '').trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedCell(cells: string[], header: string): string {
  return cellByHeader(cells, header).trim().toLowerCase();
}

function timestampValue(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRelativeTime(value: string): string {
  const timestamp = timestampValue(value);
  if (!timestamp) return value;

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: 'year', seconds: 31_536_000 },
    { unit: 'month', seconds: 2_592_000 },
    { unit: 'week', seconds: 604_800 },
    { unit: 'day', seconds: 86_400 },
    { unit: 'hour', seconds: 3_600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];
  const match = units.find((candidate) => absSeconds >= candidate.seconds) ?? units[units.length - 1];
  const amount = Math.round(diffSeconds / match.seconds);
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(amount, match.unit);
}

function commitUrlForCells(cells: string[]): string {
  const commit = cellByHeader(cells, 'last_updated_commit').trim();
  if (!/^[a-f0-9]{40}$/i.test(commit)) return '';
  return `https://github.com/jreqtech/dap-database/commit/${commit}`;
}

function cellTitle(value: string | undefined, columnIndex: number, cells: string[]): string {
  const raw = value ?? '';
  const header = headers.value[columnIndex] ?? '';
  if (header === 'last_updated') {
    const commit = cellByHeader(cells, 'last_updated_commit').trim();
    return commit ? `${raw} (${commit.slice(0, 7)})` : `${raw} (not committed yet)`;
  }
  return raw;
}

function isTrueCell(cells: string[], header: string): boolean {
  return normalizedCell(cells, header) === 'true';
}

function isFalseCell(cells: string[], header: string): boolean {
  return normalizedCell(cells, header) === 'false';
}

function hasAnyCell(cells: string[], headersToCheck: string[]): boolean {
  return headersToCheck.some((header) => cellByHeader(cells, header).trim() !== '');
}

function notesContainAny(notes: string, terms: string[]): boolean {
  return terms.some((term) => notes.includes(term));
}

function hasLightweightOrClosedOs(os: string, notes: string): boolean {
  return (
    os.includes('proprietary') ||
    os.includes('snowsky') ||
    os.includes('linux') ||
    os.includes('hibyos') ||
    os.includes('mtouch') ||
    os.includes('rtos') ||
    notes.includes('proprietary os') ||
    notes.includes('custom os') ||
    notes.includes('non-android') ||
    notes.includes('linux-based') ||
    notes.includes('mtouch platform') ||
    notes.includes('firmware upgrade') ||
    notes.includes('firmware download') ||
    notes.includes('rtos')
  );
}

function blankCellMeansNone(cells: string[], header: string): boolean {
  const os = cellByHeader(cells, 'OS').toLowerCase();
  const notes = cellByHeader(cells, 'Notes').toLowerCase();
  const has3_5mm = isTrueCell(cells, '3.5mm');
  const has2_5mm = isTrueCell(cells, '2.5mm');
  const has4_4mm = isTrueCell(cells, '4.4mm');
  const has6_35mm = isTrueCell(cells, '6.35mm');
  const hasBluetooth = isTrueCell(cells, 'Bluetooth');
  const hasWifi = isTrueCell(cells, 'Wi-Fi');
  const hasMicrosd = isTrueCell(cells, 'microSD');
  const hasBalancedOutput =
    has2_5mm ||
    has4_4mm ||
    cellByHeader(cells, 'Balanced Output Type').trim() !== '';
  const noBalancedEvidence =
    isFalseCell(cells, '2.5mm') &&
    isFalseCell(cells, '4.4mm') &&
    !cellByHeader(cells, 'Balanced Output Type').trim();

  if (header === 'RAM GB') {
    return hasLightweightOrClosedOs(os, notes);
  }

  if (header === 'Storage GB') {
    return hasMicrosd || cellByHeader(cells, 'Storage Expansion Max') !== '' || notes.includes('no internal storage');
  }

  if (header === 'Storage Expansion Max') {
    return !hasMicrosd || notesContainAny(notes, ['no microsd', 'no micro sd', 'no tf', 'built-in flash', 'built-in 32gb flash']);
  }

  if (header === 'SE Power mW') {
    if (!has3_5mm && (isFalseCell(cells, '3.5mm') || hasBalancedOutput)) return true;
    return notesContainAny(notes, ['vrms', 'output level', 'mw power fields remain blank', 'not converted to mw']);
  }

  if (header === 'BAL Power mW') {
    if (!hasBalancedOutput || noBalancedEvidence) return true;
    return notesContainAny(notes, ['vrms', 'output level', 'mw power fields remain blank', 'not converted to mw']);
  }

  if (header === 'Balanced Output Type') {
    return !hasBalancedOutput || noBalancedEvidence;
  }

  if (header === '4.4mm') {
    return noBalancedEvidence || (has2_5mm && !has4_4mm);
  }

  if (header === '2.5mm') {
    return (has4_4mm && !has2_5mm) || noBalancedEvidence;
  }

  if (header === '6.35mm') {
    return !has6_35mm && (has3_5mm || hasBalancedOutput || notes.includes('headphone output'));
  }

  if (header === 'Bluetooth') {
    return isFalseCell(cells, 'Bluetooth') || notesContainAny(notes, ['no bluetooth', 'bluetooth false']);
  }

  if (header === 'Bluetooth Version' || header === 'Bluetooth Codecs') {
    return !hasBluetooth || isFalseCell(cells, 'Bluetooth') || notesContainAny(notes, ['no bluetooth', 'bluetooth false']);
  }

  if (header === 'Wi-Fi') {
    return isFalseCell(cells, 'Wi-Fi') || notesContainAny(notes, ['no wi-fi', 'no wifi', 'wi-fi false', 'wifi false', 'ble wireless']);
  }

  if (header === 'Wi-Fi Bands') {
    return !hasWifi || isFalseCell(cells, 'Wi-Fi') || notesContainAny(notes, ['no wi-fi', 'no wifi', 'wi-fi false', 'wifi false']);
  }

  if (header === 'Cellular' || header === '4G' || header === '5G') {
    return isFalseCell(cells, header) || notesContainAny(notes, ['no cellular', 'non-cellular', 'wifi row represents the non-cellular']);
  }

  if (header === 'USB DAC') {
    return isFalseCell(cells, 'USB DAC') || notesContainAny(notes, ['no usb dac', 'usb dac false', 'usb dac not supported']);
  }

  if (header === 'Line Out') {
    return isFalseCell(cells, 'Line Out') || notesContainAny(notes, ['no line out', 'line out false']);
  }

  if (header === 'Coax Out') {
    return isFalseCell(cells, 'Coax Out') || notesContainAny(notes, ['no coax', 'coax out false']);
  }

  if (header === 'Optical Out') {
    return isFalseCell(cells, 'Optical Out') || notesContainAny(notes, ['no optical', 'optical out false']);
  }

  if (header === 'MQA') {
    return (
      isFalseCell(cells, 'MQA') ||
      notesContainAny(notes, ['no mqa', 'mqa false']) ||
      (!notes.includes('mqa') && (hasLightweightOrClosedOs(os, notes) || notes.includes('pcm') || notes.includes('dsd')))
    );
  }

  if (header === 'OS') {
    return hasLightweightOrClosedOs(os, notes) || notesContainAny(notes, ['no os', 'os not listed', 'no operating system listed', 'firmware-based', 'simple player']);
  }

  if (header === 'SoC') {
    return notesContainAny(notes, ['soc not listed', 'cpu not listed', 'processor not listed', 'no soc listed']);
  }

  if (header === 'DAC') {
    return notesContainAny(notes, ['dac not listed', 'dac unspecified', 'no dac listed']);
  }

  if (header === 'Amp') {
    return optionalBlankColumns.has(header) || notesContainAny(notes, ['amp not listed', 'amplifier not listed']);
  }

  if (header === 'Display Size') {
    return notesContainAny(notes, ['no display', 'display not listed', 'screen not listed']);
  }

  if (header === 'Colors') {
    return cellByHeader(cells, 'color_variants').trim() !== '' || notesContainAny(notes, ['colors not listed', 'color not listed', 'finish not listed', 'finishes not listed']);
  }

  if (header === 'Battery mAh') {
    return notesContainAny(notes, ['battery capacity not listed', 'battery mah not listed']);
  }

  if (header === 'Battery Life Hours') {
    return notesContainAny(notes, ['battery life not listed', 'runtime not listed', 'mode-specific figures remain in notes']);
  }

  if (header === 'Weight') {
    return notesContainAny(notes, ['weight not listed']);
  }

  if (header === 'Dimensions') {
    return notesContainAny(notes, ['dimensions not listed']);
  }

  if (header === 'PCM Max') {
    return notesContainAny(notes, ['pcm max not listed', 'pcm not listed']) || (cellByHeader(cells, 'DSD Max') !== '' && notes.includes('dsd'));
  }

  if (header === 'DSD Max') {
    return notesContainAny(notes, ['no dsd', 'dsd not supported', 'dsd max not listed']);
  }

  if (header === 'USB Port') {
    return notesContainAny(notes, ['usb port not listed', 'usb not listed']);
  }

  if (header === 'Streaming Services') {
    return hasLightweightOrClosedOs(os, notes) || notesContainAny(notes, ['no streaming', 'streaming not supported']);
  }

  if (header === 'official_store_url') {
    return true;
  }

  if (header === 'buy_links') {
    const status = cellByHeader(cells, 'Status').toLowerCase();
    return status === 'discontinued' || status === 'prototype' || status === 'cancelled';
  }

  if (hasAnyCell(cells, ['Source URL', 'Notes']) && optionalBlankColumns.has(header)) return true;

  return optionalBlankColumns.has(header) && !requiredAuditColumns.has(header);
}

function stateForColumn(columnIndex: number, cells: string[], csvIndex: number): FieldState {
  const header = headers.value[columnIndex] ?? '';
  const row = rowObject(cells, csvIndex);
  const definition = [...coreFieldDefinitions, ...technicalFieldDefinitions].find((field) => field.field === header);
  if (definition) return resolveFieldState(row, definition).state;

  if ((cells[columnIndex] ?? '') !== '') return 'known';
  return blankCellMeansNone(cells, header) ? 'not_applicable' : 'missing';
}

function displayCell(value: string | undefined, columnIndex: number, cells: string[], csvIndex: number): string {
  const raw = value ?? '';
  const header = headers.value[columnIndex] ?? '';
  if (header === 'Model') {
    return [raw, cellByHeader(cells, 'Variant')].filter(Boolean).join(' ');
  }
  if (header === 'last_updated') return formatRelativeTime(raw);
  if (raw === '') return displayForState(stateForColumn(columnIndex, cells, csvIndex));
  if (raw.trim() === '0') return 'None';
  if (raw.trim().toUpperCase() === 'FALSE') return 'None';
  return raw;
}

function cellState(value: string | undefined, columnIndex: number, cells: string[], csvIndex: number): FieldState {
  const raw = value ?? '';
  if (raw === '') return stateForColumn(columnIndex, cells, csvIndex);
  if (raw.trim() === '0') return 'not_applicable';
  if (raw.trim().toUpperCase() === 'FALSE') return 'not_applicable';
  return 'known';
}

function missingHeadersForCells(cells: string[], csvIndex: number): string[] {
  return rowCoverage(rowObject(cells, csvIndex)).actionableMissing;
}

function triageForCells(cells: string[], csvIndex: number): Triage {
  const year = numberByHeader(cells, 'Release Year') ?? 0;
  const coverage = rowCoverage(rowObject(cells, csvIndex));
  const missingHeaders = coverage.actionableMissing;
  const score = missingHeaders.length * 10 + (year >= 2020 ? 5 : 0);

  return { priority: coverage.priority, missingCount: missingHeaders.length, score };
}

function manualReviewReasons(cells: string[]): string[] {
  const reasons: string[] = [];
  const notes = cellByHeader(cells, 'Notes').toLowerCase();
  const reviewNotes = cellByHeader(cells, 'review_notes').toLowerCase();
  const sourceUrl = cellByHeader(cells, 'Source URL').trim();

  if (notes.startsWith('partial')) reasons.push('Partial verification');
  if (!sourceUrl) reasons.push('Missing primary source');
  if (
    reviewNotes.includes('needs review') ||
    reviewNotes.includes('unclear') ||
    reviewNotes.includes('rejected') ||
    reviewNotes.includes('not added') ||
    reviewNotes.includes('not kept') ||
    reviewNotes.includes('no exact')
  ) {
    reasons.push('Review/source note');
  }
  if (notes.includes('needs review') || notes.includes('pending') || notes.includes('re-verification')) reasons.push('Needs re-check');

  return [...new Set(reasons)];
}

function needsManualReview(cells: string[]): boolean {
  return manualReviewReasons(cells).length > 0;
}

function needsManualReviewObject(row: CsvRow): boolean {
  return manualReviewReasons(headers.value.map((header) => row[header] ?? '')).length > 0;
}

function rowLabel(cells: string[]): string {
  return [cellByHeader(cells, 'Brand'), cellByHeader(cells, 'Model'), cellByHeader(cells, 'Variant')].filter(Boolean).join(' ');
}

const missingPopoverStyle = computed(() => ({
  top: `${missingPopoverPosition.value.top}px`,
  left: `${missingPopoverPosition.value.left}px`,
}));

function toggleMissingRow(row: SheetRow, event: MouseEvent) {
  const missingCount = triageForCells(row.cells, row.csvIndex).missingCount;
  if (!missingCount) return;
  if (expandedMissingCsvIndex.value === row.csvIndex) {
    expandedMissingCsvIndex.value = null;
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const popoverWidth = 340;
  const left = Math.min(Math.max(rect.right + 8, 12), window.innerWidth - popoverWidth - 12);
  missingPopoverPosition.value = {
    top: Math.max(12, Math.min(rect.top, window.innerHeight - 320)),
    left,
  };
  expandedMissingCsvIndex.value = row.csvIndex;
}

function closeMissingPopover() {
  expandedMissingCsvIndex.value = null;
}

function handleMissingPopoverPointerDown(event: PointerEvent) {
  if (expandedMissingCsvIndex.value === null) return;

  const target = event.target;
  if (!(target instanceof Element)) return;
  if (missingPopover.value?.contains(target)) return;
  if (target.closest('.sheet-missing-button')) return;

  closeMissingPopover();
}

onMounted(() => {
  document.addEventListener('pointerdown', handleMissingPopoverPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleMissingPopoverPointerDown);
});

function compareTriageRows(a: SheetRow, b: SheetRow): number {
  const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2, Complete: 3 };
  const triageA = triageForCells(a.cells, a.csvIndex);
  const triageB = triageForCells(b.cells, b.csvIndex);
  const priorityResult = priorityRank[triageA.priority] - priorityRank[triageB.priority];
  if (priorityResult) return priorityResult;

  const yearResult = (numberByHeader(b.cells, 'Release Year') ?? 0) - (numberByHeader(a.cells, 'Release Year') ?? 0);
  if (yearResult) return yearResult;

  const missingResult = triageB.missingCount - triageA.missingCount;
  if (missingResult) return missingResult;

  return a.csvIndex - b.csvIndex;
}

function comparePriorityRows(a: SheetRow, b: SheetRow): number {
  const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2, Complete: 3 };
  const triageA = triageForCells(a.cells, a.csvIndex);
  const triageB = triageForCells(b.cells, b.csvIndex);
  const baseResult = priorityRank[triageA.priority] - priorityRank[triageB.priority];
  const result = sortState.value.direction === 'asc' ? baseResult : -baseResult;
  if (result) return result;

  const yearResult = (numberByHeader(b.cells, 'Release Year') ?? 0) - (numberByHeader(a.cells, 'Release Year') ?? 0);
  if (yearResult) return yearResult;

  return a.csvIndex - b.csvIndex;
}

function compareMissingRows(a: SheetRow, b: SheetRow): number {
  const missingResult = triageForCells(a.cells, a.csvIndex).missingCount - triageForCells(b.cells, b.csvIndex).missingCount;
  const result = sortState.value.direction === 'asc' ? missingResult : -missingResult;
  if (result) return result;

  const yearResult = (numberByHeader(b.cells, 'Release Year') ?? 0) - (numberByHeader(a.cells, 'Release Year') ?? 0);
  if (yearResult) return yearResult;

  return a.csvIndex - b.csvIndex;
}

function compareReviewRows(a: SheetRow, b: SheetRow): number {
  const reviewResult = Number(needsManualReview(a.cells)) - Number(needsManualReview(b.cells));
  const result = sortState.value.direction === 'asc' ? reviewResult : -reviewResult;
  if (result) return result;

  const missingResult = triageForCells(b.cells, b.csvIndex).missingCount - triageForCells(a.cells, a.csvIndex).missingCount;
  if (missingResult) return missingResult;

  return a.csvIndex - b.csvIndex;
}

function rowClass(row: SheetRow) {
  const triage = triageForCells(row.cells, row.csvIndex);
  return {
    'is-complete-row': triage.priority === 'Complete',
    'is-priority-high': triage.priority === 'High',
    'is-priority-medium': triage.priority === 'Medium',
  };
}

function columnStyle(columnIndex: number) {
  const width = columnWidths.value[columnIndex];
  const defaultStickyWidths = [170, 260];
  const resolvedWidth = width ?? (columnIndex < 2 ? defaultStickyWidths[columnIndex] : null);
  const style: Record<string, string> = {};

  if (resolvedWidth) {
    style.width = `${resolvedWidth}px`;
    style.minWidth = `${resolvedWidth}px`;
  }

  return style;
}

function startResize(event: PointerEvent, columnIndex: number) {
  const header = (event.currentTarget as HTMLElement).closest('th');
  if (!header) return;
  event.preventDefault();
  resizingColumn.value = {
    index: columnIndex,
    startX: event.clientX,
    startWidth: header.getBoundingClientRect().width,
  };
  window.addEventListener('pointermove', handleResize);
  window.addEventListener('pointerup', stopResize, { once: true });
}

function handleResize(event: PointerEvent) {
  const activeResize = resizingColumn.value;
  if (!activeResize) return;
  const nextWidth = Math.max(90, activeResize.startWidth + event.clientX - activeResize.startX);
  columnWidths.value = { ...columnWidths.value, [activeResize.index]: Math.round(nextWidth) };
}

function stopResize() {
  resizingColumn.value = null;
  window.removeEventListener('pointermove', handleResize);
}

function handleSheetScroll(event: Event) {
  const scrollTop = (event.currentTarget as HTMLElement).scrollTop;
  if (sheetPinnedPane.value && sheetPinnedPane.value.scrollTop !== scrollTop) {
    sheetPinnedPane.value.scrollTop = scrollTop;
  }
}

function handlePinnedWheel(event: WheelEvent) {
  if (!sheetScrollPane.value || event.deltaY === 0) return;
  event.preventDefault();
  sheetScrollPane.value.scrollTop += event.deltaY;
}
</script>

<template>
  <main class="sheet-page">
    <header class="sheet-header">
      <div>
        <a class="sheet-back-link" href="#/">Back to database</a>
        <h1>Spreadsheet view</h1>
        <p>{{ displayedRows.length }} of {{ dataRows.length }} CSV rows. Read-only audit view.</p>
      </div>

      <div class="sheet-actions">
        <label class="sheet-search">
          <Search :size="16" aria-hidden="true" />
          <span class="sr-only">Search spreadsheet</span>
          <input v-model="searchTerm" type="search" placeholder="Search all CSV cells" />
        </label>
        <div class="segmented-control" aria-label="Row density">
          <button class="segmented-button sheet-density-button" :class="{ 'is-active': density === 'compact' }" type="button" @click="density = 'compact'">
            Compact
          </button>
          <button class="segmented-button sheet-density-button" :class="{ 'is-active': density === 'comfortable' }" type="button" @click="density = 'comfortable'">
            Comfortable
          </button>
        </div>
        <button class="btn btn-secondary" type="button" :disabled="!isSorted" @click="restoreCsvOrder">
          <RotateCcw :size="16" aria-hidden="true" />
          Restore CSV order
        </button>
      </div>
    </header>

    <section class="sheet-metrics" aria-label="Spreadsheet audit metrics">
      <article v-for="metric in sheetMetrics" :key="metric.label" class="sheet-metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.detail }}</small>
      </article>
    </section>

    <section class="sheet-coverage-summary" aria-label="Coverage state summary">
      <span v-for="metric in secondaryMetrics" :key="metric.label" :title="metric.label">
        <strong>{{ metric.value }}</strong>
        {{ metric.label }}
      </span>
    </section>

    <section class="sheet-frame" aria-label="Raw CSV spreadsheet">
      <div ref="sheetPinnedPane" class="sheet-pinned-pane" aria-hidden="false" @wheel="handlePinnedWheel">
        <table class="sheet-table sheet-table--pinned" :class="`sheet-table--${density}`">
          <thead>
            <tr>
              <th class="sheet-meta-column sheet-meta-column--priority" scope="col">
                <button class="sheet-sort-button" type="button" @click="sortMetaColumn('priority')">
                  <span>Priority</span>
                  <ArrowUp v-if="sortState.columnIndex === 'priority' && sortState.direction === 'asc'" :size="13" aria-hidden="true" />
                  <ArrowDown v-else-if="sortState.columnIndex === 'priority'" :size="13" aria-hidden="true" />
                </button>
              </th>
              <th class="sheet-meta-column sheet-meta-column--missing" scope="col">
                <button class="sheet-sort-button" type="button" @click="sortMetaColumn('missing')">
                  <span>Missing</span>
                  <ArrowUp v-if="sortState.columnIndex === 'missing' && sortState.direction === 'asc'" :size="13" aria-hidden="true" />
                  <ArrowDown v-else-if="sortState.columnIndex === 'missing'" :size="13" aria-hidden="true" />
                </button>
              </th>
              <th class="sheet-meta-column sheet-meta-column--review" scope="col">
                <button class="sheet-sort-button" type="button" @click="sortMetaColumn('review')">
                  <span>Review</span>
                  <ArrowUp v-if="sortState.columnIndex === 'review' && sortState.direction === 'asc'" :size="13" aria-hidden="true" />
                  <ArrowDown v-else-if="sortState.columnIndex === 'review'" :size="13" aria-hidden="true" />
                </button>
              </th>
              <th
                v-for="columnIndex in pinnedColumnIndices"
                :key="headers[columnIndex]"
                :class="[
                  `sheet-sticky--${columnIndex}`,
                  columnIndex === 2 ? 'sheet-sticky--last' : '',
                ]"
                :style="columnStyle(columnIndex)"
                scope="col"
              >
                <button class="sheet-sort-button" type="button" @click="sortColumn(columnIndex)">
                  <span>{{ headers[columnIndex] }}</span>
                  <ArrowUp v-if="sortState.columnIndex === columnIndex && sortState.direction === 'asc'" :size="13" aria-hidden="true" />
                  <ArrowDown v-else-if="sortState.columnIndex === columnIndex" :size="13" aria-hidden="true" />
                </button>
                <span class="sheet-resize-handle" aria-hidden="true" @pointerdown="startResize($event, columnIndex)"></span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in displayedRows"
              :key="row.csvIndex"
              :class="rowClass(row)"
            >
              <td class="sheet-meta-cell sheet-meta-cell--priority" :class="`sheet-priority--${triageForCells(row.cells, row.csvIndex).priority.toLowerCase()}`">
                <span>{{ triageForCells(row.cells, row.csvIndex).priority }}</span>
              </td>
              <td class="sheet-meta-cell sheet-meta-cell--missing">
                <button
                  v-if="triageForCells(row.cells, row.csvIndex).missingCount"
                  class="sheet-missing-button"
                  type="button"
                  :aria-expanded="expandedMissingCsvIndex === row.csvIndex"
                  :aria-label="`Show missing columns for ${rowLabel(row.cells)}`"
                  @click="toggleMissingRow(row, $event)"
                >
                  {{ triageForCells(row.cells, row.csvIndex).missingCount }}
                </button>
                <span v-else></span>
              </td>
              <td class="sheet-meta-cell sheet-meta-cell--review" :title="manualReviewReasons(row.cells).join(', ')">
                <span v-if="needsManualReview(row.cells)">Yes</span>
              </td>
              <td
                v-for="columnIndex in pinnedColumnIndices"
                :key="`${row.csvIndex}-${headers[columnIndex]}`"
                :class="[
                  `sheet-sticky--${columnIndex}`,
                  columnIndex === 2 ? 'sheet-sticky--last' : '',
                  'sheet-copy-cell',
                  cellState(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) === 'missing' ? 'is-empty' : '',
                  cellState(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) === 'undisclosed' ? 'is-undisclosed' : '',
                  cellState(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) === 'not_applicable' ? 'is-none' : '',
                  cellState(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) === 'needs_verification' ? 'is-verification' : '',
                ]"
                :style="columnStyle(columnIndex)"
                :data-sheet-row="rowIndex"
                :data-sheet-column="columnIndex"
                tabindex="0"
                @keydown="handleCellKeydown($event, rowIndex, columnIndex)"
              >
                <button
                  v-if="columnIndex === 1"
                  class="sheet-model-button"
                  type="button"
                  tabindex="-1"
                  @click="openRow(row.csvIndex)"
                >
                  {{ displayCell(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) }}
                </button>
                <a
                  v-else-if="headers[columnIndex] === 'last_updated' && commitUrlForCells(row.cells)"
                  class="sheet-cell-link"
                  :href="commitUrlForCells(row.cells)"
                  :title="cellTitle(row.cells[columnIndex], columnIndex, row.cells)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ displayCell(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) }}
                </a>
                <span v-else :title="cellTitle(row.cells[columnIndex], columnIndex, row.cells)">
                  {{ displayCell(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div ref="sheetScrollPane" class="sheet-scroll-pane" @scroll.passive="handleSheetScroll">
        <table class="sheet-table" :class="`sheet-table--${density}`">
          <thead>
            <tr>
              <th
                v-for="columnIndex in scrollColumnIndices"
                :key="headers[columnIndex]"
                :style="columnStyle(columnIndex)"
                scope="col"
              >
                <button class="sheet-sort-button" type="button" @click="sortColumn(columnIndex)">
                  <span>{{ headers[columnIndex] }}</span>
                  <ArrowUp v-if="sortState.columnIndex === columnIndex && sortState.direction === 'asc'" :size="13" aria-hidden="true" />
                  <ArrowDown v-else-if="sortState.columnIndex === columnIndex" :size="13" aria-hidden="true" />
                </button>
                <span class="sheet-resize-handle" aria-hidden="true" @pointerdown="startResize($event, columnIndex)"></span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in displayedRows"
              :key="row.csvIndex"
              :class="rowClass(row)"
            >
              <td
                v-for="columnIndex in scrollColumnIndices"
                :key="`${row.csvIndex}-${headers[columnIndex]}`"
                :class="[
                  cellState(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) === 'missing' ? 'is-empty' : '',
                  cellState(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) === 'undisclosed' ? 'is-undisclosed' : '',
                  cellState(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) === 'not_applicable' ? 'is-none' : '',
                  cellState(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) === 'needs_verification' ? 'is-verification' : '',
                ]"
                :style="columnStyle(columnIndex)"
                :data-sheet-row="rowIndex"
                :data-sheet-column="columnIndex"
                tabindex="0"
                @keydown="handleCellKeydown($event, rowIndex, columnIndex)"
              >
                <span>{{ displayCell(row.cells[columnIndex], columnIndex, row.cells, row.csvIndex) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <aside v-if="selectedMissingRow" ref="missingPopover" class="sheet-missing-popover" :style="missingPopoverStyle" aria-live="polite">
      <div class="sheet-missing-panel__header">
        <div>
          <p>Missing columns</p>
          <strong>{{ rowLabel(selectedMissingRow.cells) }}</strong>
        </div>
        <button type="button" aria-label="Close missing columns" @click="closeMissingPopover">×</button>
      </div>
      <ul>
        <li v-for="header in selectedMissingHeaders" :key="header">{{ header }}</li>
      </ul>
    </aside>
  </main>
</template>
