<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import type { Dap } from '../../types/dap';
import { formatCompactPrice, formatValue, hasValue } from '../../utils/formatters';
import { dapDisplayName } from '../../utils/dapSpecs';
import DapPhoto from '../DapPhoto.vue';

const props = defineProps<{
  daps: Dap[];
  selectedIds: string[];
  columnIndex: number;
  selectedDap?: Dap | null;
}>();

const emit = defineEmits<{
  select: [dap: Dap];
}>();

const query = ref('');
const isOpen = ref(false);
const activeIndex = ref(0);
const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);

const inputId = computed(() => `compare-search-${props.columnIndex}`);
const selectedIdSet = computed(() => new Set(props.selectedIds.filter((id) => id !== props.selectedDap?.id)));
const resultLimit = 10;

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function compact(value: string): string {
  return normalize(value).replace(/\s+/g, '');
}

function releaseYearText(dap: Dap): string {
  return hasValue(dap.releaseYear) ? formatValue(dap.releaseYear) : 'Release year not listed';
}

function msrpText(dap: Dap): string {
  return hasValue(dap.msrpUsd) ? formatCompactPrice(dap.msrpUsd) : 'MSRP not listed';
}

function scoreDap(dap: Dap, normalizedQuery: string, compactQuery: string): number {
  const name = normalize(dapDisplayName(dap));
  const model = normalize(dap.model);
  const brand = normalize(dap.brand);
  const variant = normalize(dap.variant);
  const searchable = normalize([dap.brand, dap.model, dap.variant, dapDisplayName(dap)].join(' '));
  const compactSearchable = compact(searchable);

  if (name === normalizedQuery || model === normalizedQuery) return 0;
  if (name.startsWith(normalizedQuery) || model.startsWith(normalizedQuery)) return 1;
  if ([brand, model, variant].some((value) => value.includes(normalizedQuery))) return 2;
  if (searchable.includes(normalizedQuery) || compactSearchable.includes(compactQuery)) return 3;
  return 99;
}

const rankedResults = computed(() => {
  const normalizedQuery = normalize(query.value);
  const compactQuery = compact(query.value);
  if (!normalizedQuery) return [];

  return props.daps
    .filter((dap) => !selectedIdSet.value.has(dap.id))
    .map((dap) => ({ dap, score: scoreDap(dap, normalizedQuery, compactQuery) }))
    .filter((item) => item.score < 99)
    .sort((a, b) => a.score - b.score || dapDisplayName(a.dap).localeCompare(dapDisplayName(b.dap)));
});

const totalResultCount = computed(() => rankedResults.value.length);
const results = computed(() => rankedResults.value.slice(0, resultLimit).map((item) => item.dap));
const resultCountLabel = computed(() => {
  if (!totalResultCount.value) return '';
  return totalResultCount.value > resultLimit
    ? `More than ${resultLimit} DAPs found`
    : `${totalResultCount.value} ${totalResultCount.value === 1 ? 'DAP' : 'DAPs'} found`;
});

function openResults() {
  isOpen.value = Boolean(query.value.trim());
}

function closeResults() {
  isOpen.value = false;
  activeIndex.value = 0;
}

function selectDap(dap: Dap) {
  emit('select', dap);
  query.value = '';
  closeResults();
  nextTick(() => input.value?.focus());
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    isOpen.value = true;
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(results.value.length - 1, 0));
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    isOpen.value = true;
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === 'Enter' && isOpen.value && results.value[activeIndex.value]) {
    event.preventDefault();
    selectDap(results.value[activeIndex.value]);
  } else if (event.key === 'Escape') {
    closeResults();
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) closeResults();
}

watch(query, () => {
  activeIndex.value = 0;
  openResults();
});

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
});
</script>

<template>
  <div ref="root" class="compare-search">
    <label class="compare-search__label" :for="inputId">Compare with</label>
    <div class="compare-search__control">
      <Search :size="15" aria-hidden="true" />
      <input
        :id="inputId"
        ref="input"
        v-model="query"
        type="search"
        :placeholder="selectedDap ? 'Search or replace DAP' : 'Search brand, model, or variant'"
        autocomplete="off"
        :aria-controls="`${inputId}-results`"
        :aria-expanded="isOpen && results.length > 0"
        @focus="openResults"
        @keydown="handleKeydown"
      />
    </div>

    <div v-if="isOpen && query.trim()" :id="`${inputId}-results`" class="compare-search__results" role="listbox">
      <p v-if="resultCountLabel" class="compare-search__count">{{ resultCountLabel }}</p>
      <button
        v-for="(dap, index) in results"
        :key="dap.id"
        class="compare-search__result"
        :class="{ 'is-active': index === activeIndex }"
        type="button"
        role="option"
        :aria-selected="index === activeIndex"
        @mouseenter="activeIndex = index"
        @click="selectDap(dap)"
      >
        <DapPhoto :dap="dap" size="thumb" />
        <span>
          <strong>{{ dapDisplayName(dap) }}</strong>
          <small>{{ releaseYearText(dap) }} · {{ msrpText(dap) }}</small>
        </span>
      </button>
      <p v-if="!results.length" class="compare-search__empty">No matching DAPs.</p>
    </div>
  </div>
</template>
