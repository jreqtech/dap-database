<script setup lang="ts">
import { X } from 'lucide-vue-next';
import type { Dap } from '../../types/dap';
import { dapDisplayName } from '../../utils/dapSpecs';
import CompareSearch from './CompareSearch.vue';
import DapPhoto from '../DapPhoto.vue';

defineProps<{
  daps: Dap[];
  selectedIds: string[];
  dap: Dap | null;
  columnIndex: number;
  removableColumn?: boolean;
}>();

const emit = defineEmits<{
  select: [dap: Dap];
  remove: [];
  removeColumn: [];
}>();
</script>

<template>
  <section class="compare-column-card" :aria-label="dap ? `${dapDisplayName(dap)} comparison column` : `Empty comparison column ${columnIndex + 1}`">
    <button
      v-if="removableColumn"
      class="icon-button compare-column-card__remove"
      type="button"
      aria-label="Remove third comparison column"
      @click="$emit('removeColumn')"
    >
      <X :size="16" aria-hidden="true" />
    </button>

    <CompareSearch
      :daps="daps"
      :selected-ids="selectedIds"
      :selected-dap="dap"
      :column-index="columnIndex"
      @select="$emit('select', $event)"
    />

    <div v-if="dap" class="compare-product">
      <button
        class="compare-product__remove"
        type="button"
        :aria-label="`Remove ${dapDisplayName(dap)} from comparison`"
        @click="$emit('remove')"
      >
        <X :size="15" aria-hidden="true" />
      </button>
      <DapPhoto :dap="dap" size="card" />
      <h2>{{ dapDisplayName(dap) }}</h2>
    </div>

    <div v-else class="compare-empty-slot">
      <span>Select a DAP to fill this comparison column.</span>
    </div>
  </section>
</template>
