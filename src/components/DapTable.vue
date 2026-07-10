<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronsUpDown, Info } from 'lucide-vue-next';
import type { Dap, SortKey, SortState } from '../types/dap';
import { formatBattery, formatPrice, formatValue } from '../utils/formatters';
import { getStatusBadgeMeta, getVerificationBadgeMeta } from '../utils/dapDisplay';
import DapPhoto from './DapPhoto.vue';
import SpecChip from './SpecChip.vue';

defineProps<{
  daps: Dap[];
  sortState: SortState;
}>();

const emit = defineEmits<{
  sort: [key: SortKey];
  details: [dap: Dap];
}>();

const sortableColumns: Array<{ key: SortKey; label: string; align?: 'right' }> = [
  { key: 'brand', label: 'Brand' },
  { key: 'model', label: 'Model' },
  { key: 'releaseYear', label: 'Year', align: 'right' },
  { key: 'msrpUsd', label: 'MSRP', align: 'right' },
  { key: 'batteryMah', label: 'Battery', align: 'right' },
];

function sortLabel(key: SortKey, sortState: SortState): string {
  if (sortState.key !== key) return 'Sort';
  return sortState.direction === 'asc' ? 'Sorted ascending' : 'Sorted descending';
}
</script>

<template>
  <div class="table-wrap">
    <table class="dap-table">
      <colgroup>
        <col class="col-photo" />
        <col class="col-brand" />
        <col class="col-model" />
        <col class="col-year" />
        <col class="col-msrp" />
        <col class="col-battery" />
        <col class="col-balanced" />
        <col class="col-os" />
        <col class="col-dac" />
        <col class="col-status" />
        <col class="col-verification" />
        <col class="col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th class="photo-col"><span class="compact-th">Image</span></th>
          <th
            v-for="column in sortableColumns"
            :key="column.key"
            :class="{ 'is-numeric': column.align === 'right' }"
          >
            <button
              type="button"
              class="sort-button"
              :class="{ 'is-active': sortState.key === column.key }"
              :aria-label="`${sortLabel(column.key, sortState)} by ${column.label}`"
              @click="emit('sort', column.key)"
            >
              <span>{{ column.label }}</span>
              <span class="sort-glyph">
                <ArrowUp v-if="sortState.key === column.key && sortState.direction === 'asc'" :size="14" aria-hidden="true" />
                <ArrowDown v-else-if="sortState.key === column.key" :size="14" aria-hidden="true" />
                <ChevronsUpDown v-else :size="14" aria-hidden="true" />
              </span>
            </button>
          </th>
          <th class="is-centered">4.4mm</th>
          <th>OS</th>
          <th>DAC</th>
          <th>
            <button
              type="button"
              class="sort-button"
              :class="{ 'is-active': sortState.key === 'status' }"
              :aria-label="`${sortLabel('status', sortState)} by Status`"
              @click="emit('sort', 'status')"
            >
              <span>Status</span>
              <span class="sort-glyph">
                <ArrowUp v-if="sortState.key === 'status' && sortState.direction === 'asc'" :size="14" aria-hidden="true" />
                <ArrowDown v-else-if="sortState.key === 'status'" :size="14" aria-hidden="true" />
                <ChevronsUpDown v-else :size="14" aria-hidden="true" />
              </span>
            </button>
          </th>
          <th>
            <button
              type="button"
              class="sort-button"
              :class="{ 'is-active': sortState.key === 'verificationStatus' }"
              :aria-label="`${sortLabel('verificationStatus', sortState)} by Verification`"
              @click="emit('sort', 'verificationStatus')"
            >
              <span>Source</span>
              <span class="sort-glyph">
                <ArrowUp v-if="sortState.key === 'verificationStatus' && sortState.direction === 'asc'" :size="14" aria-hidden="true" />
                <ArrowDown v-else-if="sortState.key === 'verificationStatus'" :size="14" aria-hidden="true" />
                <ChevronsUpDown v-else :size="14" aria-hidden="true" />
              </span>
            </button>
          </th>
          <th class="actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="dap in daps" :key="dap.id">
          <td class="photo-col">
            <button class="photo-button" type="button" @click="emit('details', dap)">
              <DapPhoto :dap="dap" size="thumb" />
            </button>
          </td>
          <td>{{ dap.brand }}</td>
          <td>
            <button class="link-button" type="button" @click="emit('details', dap)">{{ dap.model }}</button>
            <span v-if="dap.variant" class="muted-block">{{ dap.variant }}</span>
          </td>
          <td class="is-numeric">{{ formatValue(dap.releaseYear) }}</td>
          <td class="is-numeric">{{ formatPrice(dap.msrpUsd) }}</td>
          <td class="is-numeric">{{ formatBattery(dap.batteryMah) }}</td>
          <td class="is-centered"><SpecChip :label="dap.has44mm ? 'Yes' : 'No'" :tone="dap.has44mm ? 'blue' : 'muted'" /></td>
          <td><span class="table-ellipsis table-os" :title="formatValue(dap.os)">{{ formatValue(dap.os) }}</span></td>
          <td><span class="table-ellipsis table-dac" :title="formatValue(dap.dac)">{{ formatValue(dap.dac) }}</span></td>
          <td>
            <SpecChip
              :label="getStatusBadgeMeta(dap.status).label"
              :badge-class="getStatusBadgeMeta(dap.status).className"
              :title="getStatusBadgeMeta(dap.status).title"
            />
          </td>
          <td>
            <SpecChip
              :label="getVerificationBadgeMeta(dap.verificationStatus).label"
              :badge-class="getVerificationBadgeMeta(dap.verificationStatus).className"
              :title="getVerificationBadgeMeta(dap.verificationStatus).title"
            />
          </td>
          <td class="actions-col">
            <button
              class="btn btn-primary-soft btn-sm btn-icon details-row-button"
              type="button"
              :aria-label="`Open details for ${dap.brand} ${dap.model}`"
              :title="`Open details for ${dap.brand} ${dap.model}`"
              @click="emit('details', dap)"
            >
              <Info :size="16" aria-hidden="true" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
