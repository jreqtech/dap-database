<script setup lang="ts">
import { BarChart3, X } from 'lucide-vue-next';
import type { Dap } from '../types/dap';

defineProps<{
  daps: Dap[];
}>();

defineEmits<{
  compare: [];
  clear: [];
  remove: [id: string];
}>();
</script>

<template>
  <aside v-if="daps.length" class="comparison-tray" aria-label="Selected DAPs for comparison">
    <p class="comparison-tray__summary">
      <strong>Compare:</strong>
      {{ daps.map((dap) => `${dap.brand} ${dap.model}`).join(', ') }}
    </p>
    <div class="comparison-tray__chips">
      <span v-for="dap in daps" :key="dap.id" class="compare-chip">
        {{ dap.brand }} {{ dap.model }}
        <button type="button" :aria-label="`Remove ${dap.brand} ${dap.model}`" @click="$emit('remove', dap.id)">
          <X :size="14" aria-hidden="true" />
        </button>
      </span>
    </div>
    <div class="comparison-tray__actions">
      <button class="btn btn-primary" type="button" @click="$emit('compare')">
        <BarChart3 :size="16" aria-hidden="true" />
        <span>Compare selected</span>
      </button>
      <button class="btn btn-danger" type="button" @click="$emit('clear')">
        <X :size="16" aria-hidden="true" />
        <span>Clear</span>
      </button>
    </div>
  </aside>
</template>
