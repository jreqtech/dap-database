<script setup lang="ts">
import { ExternalLink, X } from 'lucide-vue-next';
import type { Dap } from '../types/dap';
import { formatBattery, formatBoolean, formatPower, formatPrice, formatValue } from '../utils/formatters';
import { verificationLabel } from '../utils/dapDisplay';
import DapPhoto from './DapPhoto.vue';

defineProps<{
  daps: Dap[];
}>();

defineEmits<{
  close: [];
}>();

const rows: Array<{ label: string; value: (dap: Dap) => string }> = [
  { label: 'MSRP', value: (dap) => formatPrice(dap.msrpUsd) },
  { label: 'Year', value: (dap) => formatValue(dap.releaseYear) },
  { label: 'Battery', value: (dap) => formatBattery(dap.batteryMah) },
  { label: 'DAC', value: (dap) => formatValue(dap.dac) },
  { label: 'OS', value: (dap) => formatValue(dap.os) },
  { label: '3.5mm', value: (dap) => formatBoolean(dap.has35mm) },
  { label: '4.4mm', value: (dap) => formatBoolean(dap.has44mm) },
  { label: 'SE Power', value: (dap) => formatPower(dap.sePowerMw) },
  { label: 'BAL Power', value: (dap) => formatPower(dap.balPowerMw) },
  { label: 'RAM', value: (dap) => formatValue(dap.ramGb) },
  { label: 'Storage', value: (dap) => formatValue(dap.storageGb) },
  { label: 'microSD', value: (dap) => formatBoolean(dap.microSd) },
  { label: 'Status', value: (dap) => formatValue(dap.status) },
  { label: 'Verification', value: (dap) => verificationLabel(dap.verificationStatus) },
];
</script>

<template>
  <section v-if="daps.length" class="comparison-panel" aria-label="DAP comparison">
    <div class="comparison-panel__header">
      <div>
        <p class="section-kicker">Comparison</p>
        <h2>{{ daps.length }} selected DAPs</h2>
      </div>
      <button class="btn btn-ghost btn-icon details-icon-button" type="button" aria-label="Close comparison" @click="$emit('close')">
        <X :size="18" aria-hidden="true" />
      </button>
    </div>

    <div class="comparison-scroll">
      <table class="spec-compare-table">
        <thead>
          <tr>
            <th>Spec</th>
            <th v-for="dap in daps" :key="dap.id">
              <div class="compare-heading">
                <DapPhoto :dap="dap" size="thumb" />
                <span>{{ dap.brand }} {{ dap.model }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.label">
            <th>{{ row.label }}</th>
            <td v-for="dap in daps" :key="dap.id">{{ row.value(dap) }}</td>
          </tr>
          <tr>
            <th>Source</th>
            <td v-for="dap in daps" :key="dap.id">
              <a v-if="dap.sourceUrl" class="source-link" :href="dap.sourceUrl" target="_blank" rel="noopener noreferrer">
                <ExternalLink :size="14" aria-hidden="true" />
                <span>Open source</span>
              </a>
              <span v-else>Unknown</span>
            </td>
          </tr>
          <tr>
            <th>Notes</th>
            <td v-for="dap in daps" :key="dap.id">{{ formatValue(dap.notes) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
