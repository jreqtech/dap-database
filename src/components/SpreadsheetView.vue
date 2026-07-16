<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowDown, ArrowUp, RotateCcw, Search } from 'lucide-vue-next';
import type { Dap } from '../types/dap';

const props = defineProps<{
  csv: string;
  daps: Dap[];
}>();

const emit = defineEmits<{
  openDap: [dap: Dap];
}>();

type Density = 'compact' | 'comfortable';
type SheetSort = { columnIndex: number | null; direction: 'asc' | 'desc' };
type SheetRow = { cells: string[]; csvIndex: number };
type Priority = 'High' | 'Medium' | 'Low' | 'OK';
type Triage = { priority: Priority; missingCount: number; score: number };

const searchTerm = ref('');
const density = ref<Density>('compact');
const sortState = ref<SheetSort>({ columnIndex: null, direction: 'asc' });
const columnWidths = ref<Record<number, number>>({});
const resizingColumn = ref<{ index: number; startX: number; startWidth: number } | null>(null);
const sheetScrollTop = ref(0);
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
  'affiliate_links',
  'buy_notes',
  'review_links',
  'review_notes',
]);
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
const dataRows = computed<SheetRow[]>(() => csvRows.value.slice(1).map((cells, index) => ({ cells, csvIndex: index })));
const normalizedSearch = computed(() => searchTerm.value.trim().toLowerCase());
const isSorted = computed(() => sortState.value.columnIndex !== -1);

const filteredRows = computed(() => {
  if (!normalizedSearch.value) return dataRows.value;
  return dataRows.value.filter((row) => row.cells.some((cell, columnIndex) => displayCell(cell, columnIndex, row.cells).toLowerCase().includes(normalizedSearch.value)));
});

const displayedRows = computed(() => {
  const columnIndex = sortState.value.columnIndex;
  const rows = [...filteredRows.value];
  if (columnIndex === null) return rows.sort(compareTriageRows);
  if (columnIndex === -1) return rows;

  return rows.sort((a, b) => {
    const valueA = a.cells[columnIndex] ?? '';
    const valueB = b.cells[columnIndex] ?? '';
    const numericA = Number(valueA.replace(/[$,]/g, ''));
    const numericB = Number(valueB.replace(/[$,]/g, ''));
    const bothNumeric = valueA.trim() !== '' && valueB.trim() !== '' && !Number.isNaN(numericA) && !Number.isNaN(numericB);
    const result = bothNumeric
      ? numericA - numericB
      : valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: 'base' });
    return sortState.value.direction === 'asc' ? result : -result;
  });
});

const pinnedColumnCount = 3;
const pinnedHeaders = computed(() => headers.value.slice(0, pinnedColumnCount));
const scrollHeaders = computed(() => headers.value.slice(pinnedColumnCount));

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

function restoreCsvOrder() {
  sortState.value = { columnIndex: -1, direction: 'asc' };
}

function openRow(csvIndex: number) {
  const dap = props.daps[csvIndex];
  if (dap) emit('openDap', dap);
}

function focusCell(rowIndex: number, columnIndex: number) {
  const row = Math.min(Math.max(rowIndex, 0), displayedRows.value.length - 1);
  const column = Math.min(Math.max(columnIndex, 0), headers.value.length - 1);
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
    focusCell(rowIndex, columnIndex - 1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    focusCell(rowIndex, columnIndex + 1);
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

function numberByHeader(cells: string[], header: string): number | null {
  const value = cellByHeader(cells, header).replace(/[$,]/g, '').trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function blankCellMeansNone(cells: string[], header: string): boolean {
  if (header === 'RAM GB') {
    const os = cellByHeader(cells, 'OS').toLowerCase();
    return os.includes('snowsky') || os.includes('linux') || os.includes('hibyos') || os.includes('mtouch');
  }

  if (header === 'Storage GB') {
    return cellByHeader(cells, 'microSD').toUpperCase() === 'TRUE' || cellByHeader(cells, 'Storage Expansion Max') !== '';
  }

  return optionalBlankColumns.has(header) && !requiredAuditColumns.has(header);
}

function displayCell(value: string | undefined, columnIndex: number, cells: string[]): string {
  const raw = value ?? '';
  const header = headers.value[columnIndex] ?? '';
  if (raw === '') return blankCellMeansNone(cells, header) ? 'None' : '?';
  if (raw.trim() === '0') return 'None';
  if (raw.trim().toUpperCase() === 'FALSE') return 'None';
  return raw;
}

function cellState(value: string | undefined, columnIndex: number, cells: string[]): 'empty' | 'none' | 'value' {
  const raw = value ?? '';
  const header = headers.value[columnIndex] ?? '';
  if (raw === '') return blankCellMeansNone(cells, header) ? 'none' : 'empty';
  if (raw.trim() === '0') return 'none';
  if (raw.trim().toUpperCase() === 'FALSE') return 'none';
  return 'value';
}

function isActionableMissing(columnIndex: number, cells: string[]): boolean {
  return cellState(cells[columnIndex], columnIndex, cells) === 'empty';
}

function triageForCells(cells: string[]): Triage {
  const year = numberByHeader(cells, 'Release Year') ?? 0;
  const status = cellByHeader(cells, 'Status').toLowerCase();
  const missingHeaders = headers.value.filter((_, columnIndex) => isActionableMissing(columnIndex, cells));
  const highMissing = missingHeaders.filter((header) => highValueAuditColumns.has(header)).length;
  const recentWeight = year >= 2026 ? 18 : year === 2025 ? 12 : year === 2024 ? 7 : 0;
  const activeWeight = status === 'active' || status === 'upcoming' ? 6 : 0;
  const score = recentWeight + activeWeight + highMissing * 3 + missingHeaders.length;
  const priority: Priority =
    score >= 44 || (year >= 2025 && highMissing >= 5)
      ? 'High'
      : score >= 28 || (year >= 2024 && highMissing >= 3)
        ? 'Medium'
        : missingHeaders.length > 0
          ? 'Low'
          : 'OK';

  return { priority, missingCount: missingHeaders.length, score };
}

function compareTriageRows(a: SheetRow, b: SheetRow): number {
  const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2, OK: 3 };
  const triageA = triageForCells(a.cells);
  const triageB = triageForCells(b.cells);
  const priorityResult = priorityRank[triageA.priority] - priorityRank[triageB.priority];
  if (priorityResult) return priorityResult;

  const yearResult = (numberByHeader(b.cells, 'Release Year') ?? 0) - (numberByHeader(a.cells, 'Release Year') ?? 0);
  if (yearResult) return yearResult;

  const missingResult = triageB.missingCount - triageA.missingCount;
  if (missingResult) return missingResult;

  return a.csvIndex - b.csvIndex;
}

function rowClass(cells: string[]) {
  const triage = triageForCells(cells);
  return {
    'is-complete-row': triage.priority === 'OK',
    'is-priority-high': triage.priority === 'High',
    'is-priority-medium': triage.priority === 'Medium',
  };
}

function columnStyle(columnIndex: number) {
  const width = columnWidths.value[columnIndex];
  const defaultStickyWidths = [150, 170, 150];
  const resolvedWidth = width ?? (columnIndex < 3 ? defaultStickyWidths[columnIndex] : null);
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
  sheetScrollTop.value = (event.currentTarget as HTMLElement).scrollTop;
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

    <section class="sheet-frame" aria-label="Raw CSV spreadsheet">
      <div class="sheet-pinned-pane" aria-hidden="false">
        <table class="sheet-table sheet-table--pinned" :class="`sheet-table--${density}`">
          <thead>
            <tr>
              <th class="sheet-meta-column sheet-meta-column--priority" scope="col">Priority</th>
              <th class="sheet-meta-column sheet-meta-column--missing" scope="col">Missing</th>
              <th
                v-for="(header, columnIndex) in pinnedHeaders"
                :key="header"
                :class="[
                  `sheet-sticky--${columnIndex}`,
                  columnIndex === 2 ? 'sheet-sticky--last' : '',
                ]"
                :style="columnStyle(columnIndex)"
                scope="col"
              >
                <button class="sheet-sort-button" type="button" @click="sortColumn(columnIndex)">
                  <span>{{ header }}</span>
                  <ArrowUp v-if="sortState.columnIndex === columnIndex && sortState.direction === 'asc'" :size="13" aria-hidden="true" />
                  <ArrowDown v-else-if="sortState.columnIndex === columnIndex" :size="13" aria-hidden="true" />
                </button>
                <span class="sheet-resize-handle" aria-hidden="true" @pointerdown="startResize($event, columnIndex)"></span>
              </th>
            </tr>
          </thead>
          <tbody :style="{ transform: `translateY(-${sheetScrollTop}px)` }">
            <tr
              v-for="(row, rowIndex) in displayedRows"
              :key="row.csvIndex"
              :class="rowClass(row.cells)"
            >
              <td class="sheet-meta-cell sheet-meta-cell--priority" :class="`sheet-priority--${triageForCells(row.cells).priority.toLowerCase()}`">
                <span>{{ triageForCells(row.cells).priority }}</span>
              </td>
              <td class="sheet-meta-cell sheet-meta-cell--missing">
                <span>{{ triageForCells(row.cells).missingCount || '' }}</span>
              </td>
              <td
                v-for="(header, columnIndex) in pinnedHeaders"
                :key="`${row.csvIndex}-${header}`"
                :class="[
                  `sheet-sticky--${columnIndex}`,
                  columnIndex === 2 ? 'sheet-sticky--last' : '',
                  'sheet-copy-cell',
                  cellState(row.cells[columnIndex], columnIndex, row.cells) === 'empty' ? 'is-empty' : '',
                  cellState(row.cells[columnIndex], columnIndex, row.cells) === 'none' ? 'is-none' : '',
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
                  {{ displayCell(row.cells[columnIndex], columnIndex, row.cells) }}
                </button>
                <span v-else>{{ displayCell(row.cells[columnIndex], columnIndex, row.cells) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sheet-scroll-pane" @scroll.passive="handleSheetScroll">
        <table class="sheet-table" :class="`sheet-table--${density}`">
          <thead>
            <tr>
              <th
                v-for="(header, relativeColumnIndex) in scrollHeaders"
                :key="header"
                :style="columnStyle(relativeColumnIndex + pinnedColumnCount)"
                scope="col"
              >
                <button class="sheet-sort-button" type="button" @click="sortColumn(relativeColumnIndex + pinnedColumnCount)">
                  <span>{{ header }}</span>
                  <ArrowUp v-if="sortState.columnIndex === relativeColumnIndex + pinnedColumnCount && sortState.direction === 'asc'" :size="13" aria-hidden="true" />
                  <ArrowDown v-else-if="sortState.columnIndex === relativeColumnIndex + pinnedColumnCount" :size="13" aria-hidden="true" />
                </button>
                <span class="sheet-resize-handle" aria-hidden="true" @pointerdown="startResize($event, relativeColumnIndex + pinnedColumnCount)"></span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in displayedRows"
              :key="row.csvIndex"
              :class="rowClass(row.cells)"
            >
              <td
                v-for="(header, relativeColumnIndex) in scrollHeaders"
                :key="`${row.csvIndex}-${header}`"
                :class="[
                  cellState(row.cells[relativeColumnIndex + pinnedColumnCount], relativeColumnIndex + pinnedColumnCount, row.cells) === 'empty' ? 'is-empty' : '',
                  cellState(row.cells[relativeColumnIndex + pinnedColumnCount], relativeColumnIndex + pinnedColumnCount, row.cells) === 'none' ? 'is-none' : '',
                ]"
                :style="columnStyle(relativeColumnIndex + pinnedColumnCount)"
                :data-sheet-row="rowIndex"
                :data-sheet-column="relativeColumnIndex + pinnedColumnCount"
                tabindex="0"
                @keydown="handleCellKeydown($event, rowIndex, relativeColumnIndex + pinnedColumnCount)"
              >
                <span>{{ displayCell(row.cells[relativeColumnIndex + pinnedColumnCount], relativeColumnIndex + pinnedColumnCount, row.cells) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
