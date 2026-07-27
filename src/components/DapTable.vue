<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3 } from 'lucide-vue-next';
import type { Dap, SortKey, SortState } from '../types/dap';
import { formatBattery, formatPrice, formatValue } from '../utils/formatters';
import { getStatusBadgeMeta, getVerificationBadgeMeta, isAndroidBased } from '../utils/dapDisplay';
import { dapDetailHash } from '../utils/slugs';
import { formatStorageExpansion } from '../utils/storageDisplay';
import DapPhoto from './DapPhoto.vue';
import SpecChip from './SpecChip.vue';

type ColumnId =
  | 'image'
  | 'brand'
  | 'model'
  | 'year'
  | 'msrp'
  | 'battery'
  | 'balanced'
  | 'os'
  | 'ram'
  | 'storage'
  | 'storageExpansion'
  | 'dac'
  | 'soc'
  | 'outputs'
  | 'status'
  | 'source';

interface TableColumn {
  id: ColumnId;
  label: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  sortKey?: SortKey;
  required?: boolean;
}

const props = defineProps<{
  daps: Dap[];
  sortState: SortState;
}>();

const emit = defineEmits<{
  sort: [key: SortKey];
}>();

const tablePrefsKey = 'dap-database-table-columns-v1';
const maxVisibleColumns = 10;

const columns: TableColumn[] = [
  { id: 'image', label: 'Image', width: 72, align: 'center', required: true },
  { id: 'brand', label: 'Brand', width: 132, align: 'left', sortKey: 'brand' },
  { id: 'model', label: 'Model', width: 220, align: 'left', sortKey: 'model', required: true },
  { id: 'year', label: 'Year', width: 84, align: 'right', sortKey: 'releaseYear' },
  { id: 'msrp', label: 'MSRP', width: 104, align: 'right', sortKey: 'msrpUsd' },
  { id: 'battery', label: 'Battery', width: 126, align: 'right', sortKey: 'batteryMah' },
  { id: 'balanced', label: '4.4mm', width: 92, align: 'center', sortKey: 'has44mm' },
  { id: 'os', label: 'OS', width: 150 },
  { id: 'ram', label: 'RAM', width: 92, align: 'right', sortKey: 'ramGb' },
  { id: 'storage', label: 'Storage', width: 108, align: 'right', sortKey: 'storageGb' },
  { id: 'storageExpansion', label: 'Expansion', width: 150, sortKey: 'storageExpansionMax' },
  { id: 'dac', label: 'DAC', width: 210 },
  { id: 'soc', label: 'SoC', width: 170 },
  { id: 'outputs', label: 'Outputs', width: 150 },
  { id: 'status', label: 'Status', width: 124, sortKey: 'status' },
  { id: 'source', label: 'Source', width: 150, sortKey: 'verificationStatus' },
];

const presets: Array<{ id: string; label: string; columns: ColumnId[] }> = [
  { id: 'overview', label: 'Overview', columns: ['image', 'brand', 'model', 'year', 'msrp', 'battery', 'balanced', 'os', 'ram', 'storage'] },
  { id: 'audio', label: 'Audio', columns: ['image', 'brand', 'model', 'dac', 'outputs', 'balanced', 'battery', 'source'] },
  { id: 'hardware', label: 'Hardware', columns: ['image', 'brand', 'model', 'soc', 'os', 'ram', 'storage', 'storageExpansion', 'battery', 'year'] },
  { id: 'compact', label: 'Compact', columns: ['brand', 'model', 'year', 'msrp', 'source'] },
];

const defaultColumnIds = presets[0].columns;
const selectedColumnIds = ref<ColumnId[]>([...defaultColumnIds]);
const columnOrder = ref<ColumnId[]>(columns.map((column) => column.id));
const selectedPreset = ref('overview');
const showColumnPanel = ref(false);
const hasMounted = ref(false);
const draggedColumnId = ref<ColumnId | null>(null);

const columnsById = computed(() => new Map(columns.map((column) => [column.id, column])));
const orderedColumns = computed(() => columnOrder.value.map((id) => columnsById.value.get(id)).filter((column): column is TableColumn => Boolean(column)));
const visibleColumns = computed(() => orderedColumns.value.filter((column) => selectedColumnIds.value.includes(column.id)));
const visibleColumnCount = computed(() => visibleColumns.value.length);
const tableMinWidth = computed(() => visibleColumns.value.reduce((total, column) => total + column.width, 0));

function completeColumnOrder(order: ColumnId[]): ColumnId[] {
  const remaining = columns.map((column) => column.id).filter((id) => !order.includes(id));
  const nextOrder = [...order];
  const storageExpansionIndex = remaining.indexOf('storageExpansion');

  if (storageExpansionIndex >= 0) {
    remaining.splice(storageExpansionIndex, 1);
    const storageIndex = nextOrder.indexOf('storage');
    nextOrder.splice(storageIndex >= 0 ? storageIndex + 1 : nextOrder.length, 0, 'storageExpansion');
  }

  return [...nextOrder, ...remaining];
}

function sortLabel(key: SortKey, sortState: SortState): string {
  if (sortState.key !== key) return 'Sort';
  return sortState.direction === 'asc' ? 'Sorted ascending' : 'Sorted descending';
}

function shouldShowTableStatus(status: string): boolean {
  return status.trim().toLowerCase() !== 'active';
}

function tableStatusLabel(status: string): string {
  return status.trim().toLowerCase() === 'discontinued' ? 'Discont.' : getStatusBadgeMeta(status).label;
}

function formatMemorySpec(value: Dap['ramGb'] | Dap['storageGb']): string {
  if (value === null || value === undefined || value === '') return '?';
  if (typeof value === 'number') {
    if (value > 0 && value < 1) return `${(value * 1000).toLocaleString('en-US')} MB`;
    return `${value.toLocaleString('en-US')} GB`;
  }
  const raw = String(value).trim();
  const numericValue = Number(raw);
  if (Number.isFinite(numericValue) && numericValue > 0 && numericValue < 1) {
    return `${(numericValue * 1000).toLocaleString('en-US')} MB`;
  }
  return raw;
}

function formatStorageSpec(value: Dap['storageGb']): string {
  if (value === 0) return 'None';
  return formatMemorySpec(value);
}

function formatBoolean(value: boolean | null): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '?';
}

function outputSummary(dap: Dap): string {
  const outputs: string[] = [];
  if (dap.has35mm) outputs.push('3.5mm');
  if (dap.has25mm) outputs.push('2.5mm');
  if (dap.has44mm) outputs.push('4.4mm');
  if (dap.has635mm) outputs.push('6.35mm');
  return outputs.length ? outputs.join(', ') : '-';
}

function plainCellValue(column: ColumnId, dap: Dap): string {
  switch (column) {
    case 'brand':
      return dap.brand;
    case 'year':
      return formatValue(dap.releaseYear);
    case 'msrp':
      return formatPrice(dap.msrpUsd);
    case 'battery':
      return formatBattery(dap.batteryMah);
    case 'balanced':
      return formatBoolean(dap.has44mm);
    case 'os':
      return formatValue(dap.os || (isAndroidBased(dap) ? 'Android-based' : '?'));
    case 'ram':
      return formatMemorySpec(dap.ramGb);
    case 'storage':
      return formatStorageSpec(dap.storageGb);
    case 'storageExpansion':
      return formatStorageExpansion(dap, { showNone: true, showUnknown: true });
    case 'dac':
      return formatValue(dap.dac);
    case 'soc':
      return formatValue(dap.soc);
    case 'outputs':
      return outputSummary(dap);
    case 'status':
      return getStatusBadgeMeta(dap.status).label;
    case 'source':
      return getVerificationBadgeMeta(dap.verificationStatus).label;
    case 'model':
      return [dap.model, dap.variant].filter(Boolean).join(' ');
    case 'image':
      return 'Image';
  }
}

function isColumnSelected(id: ColumnId): boolean {
  return selectedColumnIds.value.includes(id);
}

function cappedColumnIds(ids: ColumnId[]): ColumnId[] {
  const requiredIds = columns.filter((column) => column.required).map((column) => column.id);
  const uniqueIds = [...new Set([...requiredIds, ...ids])];
  return uniqueIds.slice(0, maxVisibleColumns);
}

function canSelectColumn(id: ColumnId): boolean {
  return isColumnSelected(id) || visibleColumnCount.value < maxVisibleColumns;
}

function toggleColumn(id: ColumnId) {
  const column = columnsById.value.get(id);
  if (column?.required) return;
  selectedColumnIds.value = isColumnSelected(id)
    ? selectedColumnIds.value.filter((columnId) => columnId !== id)
    : canSelectColumn(id)
      ? cappedColumnIds([...selectedColumnIds.value, id])
      : selectedColumnIds.value;
}

function moveColumn(id: ColumnId, direction: -1 | 1) {
  const nextOrder = [...columnOrder.value];
  const index = nextOrder.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= nextOrder.length) return;
  [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
  columnOrder.value = nextOrder;
}

function moveColumnBefore(sourceId: ColumnId, targetId: ColumnId) {
  if (sourceId === targetId) return;
  const nextOrder = columnOrder.value.filter((id) => id !== sourceId);
  const targetIndex = nextOrder.indexOf(targetId);
  nextOrder.splice(targetIndex >= 0 ? targetIndex : nextOrder.length, 0, sourceId);
  columnOrder.value = nextOrder;
}

function handleColumnDragStart(id: ColumnId, event: DragEvent) {
  draggedColumnId.value = id;
  event.dataTransfer?.setData('text/plain', id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function handleColumnDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

function handleColumnDrop(targetId: ColumnId, event: DragEvent) {
  event.preventDefault();
  const sourceId = draggedColumnId.value ?? event.dataTransfer?.getData('text/plain') as ColumnId | undefined;
  if (sourceId) moveColumnBefore(sourceId, targetId);
  draggedColumnId.value = null;
}

function handleColumnDragEnd() {
  draggedColumnId.value = null;
}

function applyPreset(id: string) {
  const preset = presets.find((item) => item.id === id) ?? presets[0];
  selectedPreset.value = preset.id;
  selectedColumnIds.value = cappedColumnIds([...preset.columns]);
  columnOrder.value = completeColumnOrder([...preset.columns]);
}

function resetColumns() {
  applyPreset('overview');
  localStorage.removeItem(tablePrefsKey);
}

function normalizeColumnIds(ids: unknown): ColumnId[] {
  if (!Array.isArray(ids)) return [];
  const validIds = new Set(columns.map((column) => column.id));
  const normalized: ColumnId[] = [];
  ids.forEach((id) => {
    if (id === 'memory') {
      normalized.push('ram', 'storage');
      return;
    }
    if (typeof id === 'string' && validIds.has(id as ColumnId)) {
      normalized.push(id as ColumnId);
    }
  });
  return [...new Set(normalized)];
}

function loadPreferences() {
  const raw = localStorage.getItem(tablePrefsKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as { selected?: unknown; order?: unknown; preset?: unknown };
    const selected = normalizeColumnIds(parsed.selected);
    const order = normalizeColumnIds(parsed.order);
    if (selected.length) selectedColumnIds.value = cappedColumnIds(selected);
    if (order.length) {
      columnOrder.value = completeColumnOrder(order);
    }
    if (typeof parsed.preset === 'string') selectedPreset.value = parsed.preset;
  } catch {
    localStorage.removeItem(tablePrefsKey);
  }
}

onMounted(() => {
  loadPreferences();
  hasMounted.value = true;
});

watch([selectedColumnIds, columnOrder, selectedPreset], () => {
  if (!hasMounted.value) return;
  localStorage.setItem(tablePrefsKey, JSON.stringify({
    selected: selectedColumnIds.value,
    order: columnOrder.value,
    preset: selectedPreset.value,
  }));
}, { deep: true });
</script>

<template>
  <section class="table-panel" aria-label="DAP table view">
    <header class="table-customizer">
      <div>
        <p class="table-customizer__eyebrow">Table columns</p>
        <p class="table-customizer__summary">{{ visibleColumnCount }} of {{ maxVisibleColumns }} visible columns</p>
      </div>
      <div class="table-customizer__actions">
        <label class="table-preset">
          <span class="sr-only">Table preset</span>
          <select v-model="selectedPreset" @change="applyPreset(selectedPreset)">
            <option v-for="preset in presets" :key="preset.id" :value="preset.id">{{ preset.label }}</option>
          </select>
        </label>
        <button class="btn btn-secondary btn-sm" type="button" :aria-expanded="showColumnPanel" @click="showColumnPanel = !showColumnPanel">
          <Columns3 :size="15" aria-hidden="true" />
          <span>Columns</span>
        </button>
        <button class="btn btn-ghost btn-sm" type="button" @click="resetColumns">Reset</button>
      </div>
    </header>

    <div v-if="showColumnPanel" class="column-panel-wrap">
      <p class="column-panel-help">Drag column cards to reorder them. Check up to {{ maxVisibleColumns }} columns to show in the table.</p>
      <div class="column-panel">
      <div
        v-for="column in orderedColumns"
        :key="column.id"
        class="column-option"
        :class="{ 'is-dragging': draggedColumnId === column.id }"
        draggable="true"
        @dragstart="handleColumnDragStart(column.id, $event)"
        @dragover="handleColumnDragOver"
        @drop="handleColumnDrop(column.id, $event)"
        @dragend="handleColumnDragEnd"
      >
        <span class="column-drag-handle" aria-hidden="true">::</span>
        <label>
          <input
            type="checkbox"
            :checked="isColumnSelected(column.id)"
            :disabled="column.required || !canSelectColumn(column.id)"
            @change="toggleColumn(column.id)"
          />
          <span>{{ column.label }}</span>
        </label>
        <div class="column-option__moves" aria-label="Reorder column">
          <button class="btn btn-ghost btn-sm btn-icon" type="button" :disabled="columnOrder.indexOf(column.id) === 0" :aria-label="`Move ${column.label} left`" @click="moveColumn(column.id, -1)">‹</button>
          <button class="btn btn-ghost btn-sm btn-icon" type="button" :disabled="columnOrder.indexOf(column.id) === columnOrder.length - 1" :aria-label="`Move ${column.label} right`" @click="moveColumn(column.id, 1)">›</button>
        </div>
      </div>
    </div>
    </div>

    <div class="table-wrap">
      <table class="dap-table" :style="{ minWidth: `${tableMinWidth}px` }">
        <colgroup>
          <col v-for="column in visibleColumns" :key="column.id" :style="{ width: `${column.width}px` }" />
        </colgroup>
        <thead>
          <tr>
            <th
              v-for="column in visibleColumns"
              :key="column.id"
              :class="{
                'is-numeric': column.align === 'right',
                'is-centered': column.align === 'center',
                'is-brand': column.id === 'brand',
              }"
            >
              <button
                v-if="column.sortKey"
                type="button"
                class="sort-button"
                :class="{ 'is-active': sortState.key === column.sortKey }"
                :aria-label="`${sortLabel(column.sortKey, sortState)} by ${column.label}`"
                @click="emit('sort', column.sortKey)"
              >
                <span>{{ column.label }}</span>
                <span class="sort-glyph">
                  <ArrowUp v-if="sortState.key === column.sortKey && sortState.direction === 'asc'" :size="14" aria-hidden="true" />
                  <ArrowDown v-else-if="sortState.key === column.sortKey" :size="14" aria-hidden="true" />
                  <ChevronsUpDown v-else :size="14" aria-hidden="true" />
                </span>
              </button>
              <span v-else class="compact-th">{{ column.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dap in props.daps" :key="dap.id">
            <td
              v-for="column in visibleColumns"
              :key="column.id"
              :class="{
                'photo-col': column.id === 'image',
                'is-numeric': column.align === 'right',
                'is-centered': column.align === 'center',
                'is-brand': column.id === 'brand',
              }"
            >
              <a v-if="column.id === 'image'" class="photo-button" :href="dapDetailHash(dap)">
                <DapPhoto :dap="dap" size="thumb" />
              </a>

              <span v-else-if="column.id === 'model'" class="table-model-line">
                <span>
                  <a class="link-button" :href="dapDetailHash(dap)">{{ dap.model }}</a>
                  <span v-if="dap.variant" class="muted-block">{{ dap.variant }}</span>
                </span>
                <SpecChip
                  v-if="shouldShowTableStatus(dap.status)"
                  :label="tableStatusLabel(dap.status)"
                  :badge-class="getStatusBadgeMeta(dap.status).className"
                  :title="getStatusBadgeMeta(dap.status).title"
                />
              </span>

              <span
                v-else-if="column.id === 'balanced'"
                class="table-boolean"
                :class="dap.has44mm ? 'table-boolean--yes' : 'table-boolean--no'"
                :aria-label="dap.has44mm ? 'Has 4.4mm output' : 'No 4.4mm output'"
                :title="dap.has44mm ? 'Has 4.4mm output' : 'No 4.4mm output'"
              >
                {{ dap.has44mm ? 'Yes' : 'No' }}
              </span>

              <SpecChip
                v-else-if="column.id === 'status'"
                :label="getStatusBadgeMeta(dap.status).label"
                :badge-class="getStatusBadgeMeta(dap.status).className"
                :title="getStatusBadgeMeta(dap.status).title"
              />

              <SpecChip
                v-else-if="column.id === 'source'"
                :label="getVerificationBadgeMeta(dap.verificationStatus).label"
                :badge-class="getVerificationBadgeMeta(dap.verificationStatus).className"
                :title="getVerificationBadgeMeta(dap.verificationStatus).title"
              />

              <span v-else class="table-ellipsis" :title="plainCellValue(column.id, dap)">
                {{ column.id === 'outputs' ? outputSummary(dap) : plainCellValue(column.id, dap) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
