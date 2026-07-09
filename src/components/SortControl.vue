<script setup lang="ts">
import type { SortKey, SortState } from '../types/dap';

defineProps<{
  modelValue: SortState;
}>();

defineEmits<{
  'update:modelValue': [value: SortState];
}>();

const options: Array<{ value: string; label: string; state: SortState }> = [
  { value: 'none', label: 'Original order', state: { key: null, direction: 'asc' } },
  { value: 'brand:asc', label: 'Brand A-Z', state: { key: 'brand', direction: 'asc' } },
  { value: 'brand:desc', label: 'Brand Z-A', state: { key: 'brand', direction: 'desc' } },
  { value: 'model:asc', label: 'Model A-Z', state: { key: 'model', direction: 'asc' } },
  { value: 'releaseYear:desc', label: 'Release Year newest', state: { key: 'releaseYear', direction: 'desc' } },
  { value: 'releaseYear:asc', label: 'Release Year oldest', state: { key: 'releaseYear', direction: 'asc' } },
  { value: 'msrpUsd:asc', label: 'MSRP low-high', state: { key: 'msrpUsd', direction: 'asc' } },
  { value: 'msrpUsd:desc', label: 'MSRP high-low', state: { key: 'msrpUsd', direction: 'desc' } },
  { value: 'batteryMah:desc', label: 'Battery high-low', state: { key: 'batteryMah', direction: 'desc' } },
  { value: 'officialFirst:asc', label: 'Official first', state: { key: 'officialFirst', direction: 'asc' } },
];

function valueForState(state: SortState): string {
  return state.key ? `${state.key}:${state.direction}` : 'none';
}

function optionToState(value: string): SortState {
  return options.find((option) => option.value === value)?.state ?? { key: null, direction: 'asc' };
}
</script>

<template>
  <label class="field sort-control">
    <span class="sr-only">Sort</span>
    <select
      :value="valueForState(modelValue)"
      @change="$emit('update:modelValue', optionToState(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </label>
</template>
