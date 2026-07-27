<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Dap } from '../types/dap';
import { dapSlug } from '../utils/slugs';
import CompareProductHeader from '../components/comparison/CompareProductHeader.vue';
import CompareTable from '../components/comparison/CompareTable.vue';

const props = defineProps<{
  daps: Dap[];
}>();

const maxColumns = 3;
const selectedIds = ref<Array<string | null>>([null, null, null]);
const currentHash = ref(window.location.hash);
const slugByDapId = computed(() => new Map(props.daps.map((dap) => [dap.id, dapSlug(dap)])));
const dapBySlug = computed(() => new Map(props.daps.map((dap) => [dapSlug(dap), dap])));
const selectedDaps = computed(() => selectedIds.value.map((id) => props.daps.find((dap) => dap.id === id) ?? null));
const selectedDapIds = computed(() => selectedDaps.value.filter((dap): dap is Dap => Boolean(dap)).map((dap) => dap.id));
const selectedCount = computed(() => selectedDapIds.value.length);

function parseCompareSlugs(hash: string): string[] {
  const queryStart = hash.indexOf('?');
  if (!hash.startsWith('#/compare') || queryStart < 0) return [];
  const params = new URLSearchParams(hash.slice(queryStart + 1));
  return (params.get('daps') ?? '').split(',').map((item) => decodeURIComponent(item).trim()).filter(Boolean);
}

function normalizeIds(ids: Array<string | null>, preserveColumns = false): Array<string | null> {
  const seen = new Set<string>();
  if (preserveColumns) {
    const nextIds = ids.slice(0, maxColumns).map((id) => {
      if (!id || seen.has(id) || !slugByDapId.value.has(id)) return null;
      seen.add(id);
      return id;
    });
    const columnCount = Math.max(2, nextIds.length);
    return [...nextIds, ...Array.from({ length: columnCount - nextIds.length }, () => null)].slice(0, maxColumns);
  }

  const validIds = ids.filter((id): id is string => {
    if (!id || seen.has(id) || !slugByDapId.value.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, maxColumns);

  const columnCount = maxColumns;
  return [...validIds, ...Array.from({ length: columnCount - validIds.length }, () => null)].slice(0, maxColumns);
}

function syncFromHash() {
  currentHash.value = window.location.hash;
  const slugs = parseCompareSlugs(currentHash.value);
  const ids = slugs.map((slug) => dapBySlug.value.get(slug)?.id ?? null);
  selectedIds.value = normalizeIds(ids);
}

function updateUrl() {
  const slugs = selectedIds.value
    .map((id) => (id ? slugByDapId.value.get(id) : ''))
    .filter((slug): slug is string => Boolean(slug));
  const nextHash = slugs.length ? `#/compare?daps=${slugs.map(encodeURIComponent).join(',')}` : '#/compare';
  if (window.location.hash !== nextHash) {
    window.history.pushState('', document.title, `${window.location.pathname}${window.location.search}${nextHash}`);
    currentHash.value = nextHash;
  }
}

function selectDap(index: number, dap: Dap) {
  const nextIds = [...selectedIds.value];
  const duplicateIndex = nextIds.indexOf(dap.id);
  if (duplicateIndex >= 0 && duplicateIndex !== index) nextIds[duplicateIndex] = null;
  nextIds[index] = dap.id;
  selectedIds.value = normalizeIds(nextIds, true);
  updateUrl();
}

function removeDap(index: number) {
  const nextIds = [...selectedIds.value];
  nextIds[index] = null;
  selectedIds.value = normalizeIds(nextIds, true);
  updateUrl();
}

function removeThirdColumn() {
  selectedIds.value = normalizeIds(selectedIds.value.slice(0, 2));
  updateUrl();
}

function handleHashChange() {
  if (window.location.hash.startsWith('#/compare')) syncFromHash();
}

onMounted(() => {
  syncFromHash();
  window.addEventListener('hashchange', handleHashChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', handleHashChange);
});

watch(() => props.daps, syncFromHash);
</script>

<template>
  <main class="app-shell compare-page">
    <header class="compare-hero">
      <div>
        <p class="eyebrow">DAP Database</p>
        <h1>Compare DAPs</h1>
        <p class="intro">Side-by-side specs for two or three digital audio players.</p>
      </div>
      <nav class="header-actions" aria-label="Comparison navigation">
        <a class="btn btn-secondary" href="#">Back to database</a>
      </nav>
    </header>

    <div class="compare-sheet">
      <div class="compare-columns">
        <div class="compare-side-blank" aria-hidden="true"></div>
        <CompareProductHeader
          v-for="(dap, index) in selectedDaps"
          :key="index"
          :daps="daps"
          :selected-ids="selectedDapIds"
          :dap="dap"
          :column-index="index"
          :removable-column="false"
          @select="selectDap(index, $event)"
          @remove="removeDap(index)"
          @remove-column="removeThirdColumn"
        />
      </div>

      <CompareTable v-if="selectedCount >= 1" :daps="selectedDaps" />
    </div>
  </main>
</template>
