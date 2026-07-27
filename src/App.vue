<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Grid2X2,
  Headphones,
  ListFilter,
  Menu,
  Search,
  Table2,
  X,
} from 'lucide-vue-next';
import { siBlogger, siFacebook, siGithub, siReddit, siTiktok, siYoutube } from 'simple-icons';
import rawDaps from './data/daps.json';
import rawDapsCsv from './data/daps.csv?raw';
import DapCard from './components/DapCard.vue';
import DapDetailsModal from './components/DapDetailsModal.vue';
import DapFilters from './components/DapFilters.vue';
import DapTable from './components/DapTable.vue';
import SpreadsheetView from './components/SpreadsheetView.vue';
import CompareView from './views/CompareView.vue';
import jreqTechLogo from './assets/images/jreq-tech-logo.png';
import SortControl from './components/SortControl.vue';
import type { Dap, DapFilters as DapFiltersType, SortKey, SortState } from './types/dap';
import { isAndroidBased } from './utils/dapDisplay';
import { filterDaps, numberFromMixed, sortDaps, uniqueSorted } from './utils/filters';
import { storageExpansionState } from './utils/storageDisplay';
import { dapSlug } from './utils/slugs';
import { dapDisplayName } from './utils/dapSpecs';

type ViewMode = 'cards' | 'table';
type ActiveFilterChip = { key: keyof DapFiltersType; label: string; value?: string };

const daps = rawDaps as Dap[];
const viewStorageKey = 'dap-database-view-mode-v2';
const detailHashPrefix = '#/dap/';
const sheetHash = '#/sheet';
const compareHashPrefix = '#/compare';
const defaultDocumentTitle = 'DAP Database - Digital Audio Player Specs and Sources';
const defaultMetaDescription = 'A searchable database of digital audio players with specs, source links, verification status, and filters.';
const fallbackGridColumns = 4;
const fallbackInitialRows = 4;
const bufferRows = 1;
const batchRows = 3;
const socialIcons = {
  github: siGithub.path,
  blogger: siBlogger.path,
  facebook: siFacebook.path,
  reddit: siReddit.path,
  youtube: siYoutube.path,
  tiktok: siTiktok.path,
};

const filters = ref<DapFiltersType>({
  search: '',
  brand: [],
  status: [],
  verificationStatus: [],
  priceMin: '',
  priceMax: '',
  yearMin: '',
  yearMax: '',
  ramMin: '',
  ramMax: '',
  storageMin: '',
  storageMax: '',
  storageExpansion: [],
  outputPorts: [],
  platform: [],
  connectivity: [],
  has44mmOnly: false,
  androidOnly: false,
});

const defaultSortState: SortState = { key: 'releaseYear', direction: 'desc' };
const sortState = ref<SortState>({ ...defaultSortState });
const viewMode = ref<ViewMode>('cards');
const currentHash = ref(window.location.hash);
const selectedDap = ref<Dap | null>(null);
const showMobileFilters = ref(false);
const filterGestureStart = ref<{ x: number; y: number } | null>(null);
const cardGrid = ref<HTMLElement | null>(null);
const cardLoadSentinel = ref<HTMLElement | null>(null);
const cardLimit = ref(fallbackGridColumns * fallbackInitialRows);
const gridColumnCount = ref(fallbackGridColumns);
let cardLoadObserver: IntersectionObserver | null = null;
let cardResizeObserver: ResizeObserver | null = null;
let gridMeasureFrame = 0;

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

const brands = computed(() => uniqueSorted(daps.map((dap) => dap.brand)));
const statuses = computed(() => uniqueSorted(daps.map((dap) => dap.status)));
const verificationStatuses = computed(() => uniqueSorted(daps.map((dap) => dap.verificationStatus)));
function countValues(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    if (!value) return counts;
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

const brandCounts = computed(() => countValues(daps.map((dap) => dap.brand)));
const statusCounts = computed(() => countValues(daps.map((dap) => dap.status)));
const verificationCounts = computed(() => countValues(daps.map((dap) => dap.verificationStatus)));
const outputPortCounts = computed(() => ({
  '2.5mm': daps.filter((dap) => dap.has25mm).length,
  '3.5mm': daps.filter((dap) => dap.has35mm).length,
  '4.4mm': daps.filter((dap) => dap.has44mm).length,
  '6.35mm': daps.filter((dap) => dap.has635mm).length,
}));
const platformCounts = computed(() => ({
  Android: daps.filter(isAndroidBased).length,
  'Non-Android': daps.filter((dap) => !isAndroidBased(dap)).length,
}));
const connectivityCounts = computed(() => ({
  Bluetooth: daps.filter((dap) => dap.bluetooth).length,
  'Wi-Fi': daps.filter((dap) => dap.wifi).length,
  Cellular: daps.filter((dap) => dap.cellular).length,
  '4G': daps.filter((dap) => dap.has4g).length,
  '5G': daps.filter((dap) => dap.has5g).length,
}));
const storageExpansionCounts = computed(() => ({
  expandable: daps.filter((dap) => storageExpansionState(dap) === 'expandable').length,
  none: daps.filter((dap) => storageExpansionState(dap) === 'none').length,
  unknown: daps.filter((dap) => storageExpansionState(dap) === 'unknown').length,
}));
const quickFilterCounts = computed(() => ({
  has44mmOnly: daps.filter((dap) => dap.has44mm).length,
  androidOnly: daps.filter(isAndroidBased).length,
}));
const priceBounds = computed(() => {
  const prices = daps.map((dap) => numberFromMixed(dap.msrpUsd)).filter((price): price is number => price !== null);
  const max = Math.max(...prices, 0);
  return { min: 0, max: Math.ceil(max / 100) * 100 };
});
const yearBounds = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = daps
    .map((dap) => numberFromMixed(dap.releaseYear))
    .filter((year): year is number => year !== null && year <= currentYear);
  return { min: Math.min(...years, currentYear), max: currentYear };
});
const ramBounds = computed(() => {
  const ramValues = daps.map((dap) => numberFromMixed(dap.ramGb)).filter((ram): ram is number => ram !== null);
  return { min: 0, max: Math.max(...ramValues, 0) };
});
const storageBounds = computed(() => {
  const storageValues = daps.map((dap) => numberFromMixed(dap.storageGb)).filter((storage): storage is number => storage !== null);
  return { min: 0, max: Math.max(...storageValues, 0) };
});
const visibleDaps = computed(() => sortDaps(filterDaps(daps, filters.value), sortState.value));
const isSheetRoute = computed(() => currentHash.value === sheetHash);
const isCompareRoute = computed(() => currentHash.value.startsWith(compareHashPrefix));
const rawCsvRows = computed(() => parseCsv(rawDapsCsv.trimEnd()));
const rawCsvHeaders = computed(() => rawCsvRows.value[0] ?? []);
const selectedRawFields = computed(() => {
  if (!isSheetRoute.value || !selectedDap.value) return [];
  const dapIndex = daps.findIndex((dap) => dap.id === selectedDap.value?.id);
  const cells = rawCsvRows.value[dapIndex + 1] ?? [];
  return rawCsvHeaders.value.map((label, index) => ({ label, value: cells[index] ?? '' }));
});
const visibleCardDaps = computed(() => visibleDaps.value.slice(0, cardLimit.value));
const hasMoreCardDaps = computed(() => visibleCardDaps.value.length < visibleDaps.value.length);
const remainingCardDaps = computed(() => Math.max(visibleDaps.value.length - visibleCardDaps.value.length, 0));
const loadMoreLabel = computed(() => {
  const step = Math.max(gridColumnCount.value * batchRows, gridColumnCount.value);
  if (remainingCardDaps.value <= step) {
    return remainingCardDaps.value === 1 ? 'Load remaining' : `Load ${remainingCardDaps.value} more`;
  }

  return `Load ${step} more`;
});
const dapBySlug = computed(() => new Map(daps.map((dap) => [dapSlug(dap), dap])));
const selectedDapIndex = computed(() => {
  if (!selectedDap.value) return -1;
  return visibleDaps.value.findIndex((dap) => dap.id === selectedDap.value?.id);
});
const previousDap = computed(() => {
  const index = selectedDapIndex.value;
  if (index <= 0) return null;
  return visibleDaps.value[index - 1] ?? null;
});
const nextDap = computed(() => {
  const index = selectedDapIndex.value;
  if (index < 0 || index >= visibleDaps.value.length - 1) return null;
  return visibleDaps.value[index + 1] ?? null;
});
const sourcedCount = computed(() => daps.filter((dap) => !dap.verificationStatus.toLowerCase().includes('needs source')).length);
const androidCount = computed(() => daps.filter(isAndroidBased).length);
const balancedCount = computed(() => daps.filter((dap) => dap.has44mm).length);
const activeFilterChips = computed(() => {
  const chips: ActiveFilterChip[] = [];
  const addValueChips = (key: keyof DapFiltersType, prefix: string, values: string[], labelForValue = (value: string) => value) => {
    values.forEach((value) => chips.push({ key, value, label: `${prefix}: ${labelForValue(value)}` }));
  };

  if (filters.value.search) chips.push({ key: 'search', label: `Search: ${filters.value.search}` });
  addValueChips('brand', 'Brand', filters.value.brand);
  addValueChips('status', 'Status', filters.value.status);
  addValueChips('verificationStatus', 'Verification', filters.value.verificationStatus);
  if (filters.value.priceMin || filters.value.priceMax) {
    chips.push({ key: 'priceMin', label: `Price: ${filters.value.priceMin || '0'}-${filters.value.priceMax || 'any'}` });
  }
  if (filters.value.yearMin || filters.value.yearMax) {
    chips.push({ key: 'yearMin', label: `Year: ${filters.value.yearMin || 'oldest'}-${filters.value.yearMax || 'latest'}` });
  }
  if (filters.value.storageMin || filters.value.storageMax) {
    chips.push({ key: 'storageMin', label: `Storage: ${filters.value.storageMin || '0'}-${filters.value.storageMax || 'any'}GB` });
  }
  if (filters.value.storageExpansion.length) {
    addValueChips('storageExpansion', 'Expansion', filters.value.storageExpansion, (value) => ({
      expandable: 'Expandable',
      none: 'No expansion',
      unknown: 'Unknown',
    }[value] ?? value));
  }
  if (filters.value.ramMin || filters.value.ramMax) {
    chips.push({ key: 'ramMin', label: `RAM: ${filters.value.ramMin || '0'}-${filters.value.ramMax || 'any'}GB` });
  }
  addValueChips('outputPorts', 'Port', filters.value.outputPorts);
  addValueChips('platform', 'Platform', filters.value.platform);
  addValueChips('connectivity', 'Connectivity', filters.value.connectivity);
  if (filters.value.has44mmOnly) chips.push({ key: 'has44mmOnly', label: '4.4mm only' });
  if (filters.value.androidOnly) chips.push({ key: 'androidOnly', label: 'Android-based' });
  return chips;
});

function cycleSort(key: SortKey) {
  if (sortState.value.key !== key) {
    sortState.value = { key, direction: 'asc' };
    return;
  }

  if (sortState.value.direction === 'asc') {
    sortState.value = { key, direction: 'desc' };
    return;
  }

  sortState.value = { ...defaultSortState };
}

function clearFilters() {
  filters.value = {
    search: '',
    brand: [],
    status: [],
    verificationStatus: [],
    priceMin: '',
    priceMax: '',
    yearMin: '',
    yearMax: '',
    ramMin: '',
    ramMax: '',
    storageMin: '',
    storageMax: '',
    storageExpansion: [],
    outputPorts: [],
    platform: [],
    connectivity: [],
    has44mmOnly: false,
    androidOnly: false,
  };
}

function removeFilter(key: keyof DapFiltersType, value?: string) {
  if (key === 'priceMin') {
    filters.value = { ...filters.value, priceMin: '', priceMax: '' };
    return;
  }

  if (key === 'yearMin') {
    filters.value = { ...filters.value, yearMin: '', yearMax: '' };
    return;
  }

  if (key === 'ramMin') {
    filters.value = { ...filters.value, ramMin: '', ramMax: '' };
    return;
  }

  if (key === 'storageMin') {
    filters.value = { ...filters.value, storageMin: '', storageMax: '' };
    return;
  }

  const currentValue = filters.value[key];
  if (Array.isArray(currentValue) && value !== undefined) {
    filters.value = {
      ...filters.value,
      [key]: currentValue.filter((item) => item !== value),
    };
    return;
  }

  filters.value = {
    ...filters.value,
    [key]: Array.isArray(currentValue) ? [] : typeof currentValue === 'boolean' ? false : '',
  };
}

function completeRowsCount(count: number, columns = gridColumnCount.value): number {
  return Math.max(columns, Math.ceil(count / columns) * columns);
}

function getGridColumnCount(): number {
  const grid = cardGrid.value;
  if (!grid) return fallbackGridColumns;

  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
  return Math.max(columns || fallbackGridColumns, 1);
}

function calculateInitialCardLimit(): number {
  const grid = cardGrid.value;
  const columns = getGridColumnCount();
  gridColumnCount.value = columns;

  if (!grid) return completeRowsCount(columns * fallbackInitialRows, columns);

  const firstCard = grid.querySelector<HTMLElement>('.dap-card');
  if (!firstCard) return completeRowsCount(columns * fallbackInitialRows, columns);

  const gridStyles = getComputedStyle(grid);
  const rowGap = Number.parseFloat(gridStyles.rowGap || gridStyles.gap || '0') || 0;
  const cardHeight = firstCard.getBoundingClientRect().height;
  if (!cardHeight) return completeRowsCount(columns * fallbackInitialRows, columns);

  const gridTop = grid.getBoundingClientRect().top;
  const availableHeight = Math.max(window.innerHeight - gridTop, cardHeight);
  const visibleRows = Math.max(Math.ceil((availableHeight + rowGap) / (cardHeight + rowGap)), 1);
  return completeRowsCount((visibleRows + bufferRows) * columns, columns);
}

function setInitialCardLimit() {
  cardLimit.value = Math.min(calculateInitialCardLimit(), visibleDaps.value.length);
}

function scheduleGridLimitIncrease() {
  if (gridMeasureFrame) window.cancelAnimationFrame(gridMeasureFrame);
  gridMeasureFrame = window.requestAnimationFrame(() => {
    gridMeasureFrame = 0;
    const nextLimit = calculateInitialCardLimit();
    if (nextLimit > cardLimit.value) {
      cardLimit.value = Math.min(nextLimit, visibleDaps.value.length);
    }
  });
}

function loadMoreCards() {
  const columns = getGridColumnCount();
  gridColumnCount.value = columns;
  const nextLimit = completeRowsCount(cardLimit.value + columns * batchRows, columns);
  cardLimit.value = Math.min(nextLimit, visibleDaps.value.length);
}

function loadAllCards() {
  cardLimit.value = visibleDaps.value.length;
}

async function resetCardLimit() {
  await nextTick();
  setInitialCardLimit();
}

function setupCardLoadObserver() {
  cardLoadObserver?.disconnect();
  if (!cardLoadSentinel.value) return;

  cardLoadObserver = new IntersectionObserver(
    (entries) => {
      if (viewMode.value !== 'cards' || !hasMoreCardDaps.value) return;
      if (entries.some((entry) => entry.isIntersecting)) loadMoreCards();
    },
    { root: null, rootMargin: '900px 0px 1200px', threshold: 0 },
  );
  cardLoadObserver.observe(cardLoadSentinel.value);
}

function setupCardResizeObserver() {
  cardResizeObserver?.disconnect();
  if (!cardGrid.value) return;

  cardResizeObserver = new ResizeObserver(() => {
    if (viewMode.value === 'cards') scheduleGridLimitIncrease();
  });
  cardResizeObserver.observe(cardGrid.value);
}

function syncSelectedDapWithHash() {
  currentHash.value = window.location.hash;
  if (!window.location.hash.startsWith(detailHashPrefix)) {
    selectedDap.value = null;
    return;
  }

  const slug = decodeURIComponent(window.location.hash.slice(detailHashPrefix.length));
  selectedDap.value = dapBySlug.value.get(slug) ?? null;
}

function handleHashChange() {
  currentHash.value = window.location.hash;
  syncSelectedDapWithHash();
}

function closeDapDetails() {
  selectedDap.value = null;
  if (window.location.hash.startsWith(detailHashPrefix)) {
    window.history.pushState('', document.title, `${window.location.pathname}${window.location.search}`);
  }
}

function openDapDetails(dap: Dap) {
  selectedDap.value = dap;
  window.history.pushState('', document.title, `${window.location.pathname}${window.location.search}#/dap/${encodeURIComponent(dapSlug(dap))}`);
}

function openSheetDapDetails(dap: Dap) {
  selectedDap.value = dap;
}

function updatePageMeta(dap: Dap | null) {
  document.title = dap ? `${dapDisplayName(dap)} Specs - DAP Database` : defaultDocumentTitle;
  const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!metaDescription) return;

  metaDescription.content = dap
    ? `${dapDisplayName(dap)} digital audio player specs, source link, verification status, and filters in DAP Database.`
    : defaultMetaDescription;
}

function toggleMobileFilters() {
  showMobileFilters.value = !showMobileFilters.value;
}

function closeMobileFilters() {
  showMobileFilters.value = false;
}

function handleFilterPointerStart(event: PointerEvent) {
  if (event.pointerType === 'mouse') return;
  filterGestureStart.value = { x: event.clientX, y: event.clientY };
}

function handleFilterPointerEnd(event: PointerEvent) {
  if (event.pointerType === 'mouse') return;
  const start = filterGestureStart.value;
  filterGestureStart.value = null;
  if (!start) return;

  const deltaX = event.clientX - start.x;
  const deltaY = event.clientY - start.y;
  if (Math.abs(deltaY) > 80 || Math.abs(deltaX) < 70) return;

  if (deltaX > 0) {
    showMobileFilters.value = true;
    return;
  }

  showMobileFilters.value = false;
}

function handleFilterPointerCancel() {
  filterGestureStart.value = null;
}

onMounted(() => {
  const savedView = localStorage.getItem(viewStorageKey);
  if (savedView === 'cards' || savedView === 'table') {
    viewMode.value = savedView;
  } else if (window.matchMedia('(max-width: 540px)').matches) {
    viewMode.value = 'cards';
  }

  syncSelectedDapWithHash();
  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('resize', scheduleGridLimitIncrease);
  nextTick(() => {
    setInitialCardLimit();
    setupCardLoadObserver();
    setupCardResizeObserver();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', handleHashChange);
  window.removeEventListener('resize', scheduleGridLimitIncrease);
  if (gridMeasureFrame) window.cancelAnimationFrame(gridMeasureFrame);
  cardLoadObserver?.disconnect();
  cardResizeObserver?.disconnect();
});

watch(viewMode, (mode) => {
  localStorage.setItem(viewStorageKey, mode);
  if (mode === 'cards') {
    nextTick(() => {
      setInitialCardLimit();
      setupCardLoadObserver();
      setupCardResizeObserver();
    });
  } else {
    cardLoadObserver?.disconnect();
    cardResizeObserver?.disconnect();
  }
});

watch(selectedDap, (dap) => {
  updatePageMeta(dap);
});

watch([filters, sortState], resetCardLimit, { deep: true });

watch(visibleDaps, () => {
  if (cardLimit.value > visibleDaps.value.length) {
    cardLimit.value = visibleDaps.value.length;
  }
});

watch(hasMoreCardDaps, (hasMore) => {
  if (!hasMore || viewMode.value !== 'cards') return;
  nextTick(setupCardLoadObserver);
});

</script>

<template>
  <CompareView
    v-if="isCompareRoute"
    :daps="daps"
  />

  <SpreadsheetView
    v-else-if="isSheetRoute"
    :csv="rawDapsCsv"
    :daps="daps"
    @open-dap="openSheetDapDetails"
  />

  <main v-else class="app-shell">
    <div class="catalog-layout">
      <button
        v-if="!selectedDap"
        class="mobile-filter-swipe-zone"
        type="button"
        aria-label="Swipe or tap to show filters"
        @click="showMobileFilters = true"
        @pointerdown.passive="handleFilterPointerStart"
        @pointerup.passive="handleFilterPointerEnd"
        @pointercancel.passive="handleFilterPointerCancel"
      />
      <button
        v-if="!showMobileFilters && !selectedDap"
        class="mobile-filter-fab"
        type="button"
        aria-label="Show filters"
        :aria-expanded="showMobileFilters"
        @click="showMobileFilters = true"
      >
        <Menu :size="22" aria-hidden="true" />
        <strong v-if="activeFilterChips.length">{{ activeFilterChips.length }}</strong>
      </button>
      <button
        v-if="showMobileFilters"
        class="mobile-filter-backdrop"
        type="button"
        aria-label="Hide filters"
        @click="closeMobileFilters"
        @pointerdown.passive="handleFilterPointerStart"
        @pointerup.passive="handleFilterPointerEnd"
        @pointercancel.passive="handleFilterPointerCancel"
      />
      <aside
        class="catalog-sidebar"
        :class="{ 'is-open': showMobileFilters }"
        @pointerdown.passive="handleFilterPointerStart"
        @pointerup.passive="handleFilterPointerEnd"
        @pointercancel.passive="handleFilterPointerCancel"
      >
        <button
          class="mobile-filter-close"
          type="button"
          aria-label="Hide filters"
          :aria-expanded="showMobileFilters"
          @click="closeMobileFilters"
        >
          <X :size="22" aria-hidden="true" />
        </button>
        <DapFilters
          :filters="filters"
          :brands="brands"
          :statuses="statuses"
          :verification-statuses="verificationStatuses"
          :brand-counts="brandCounts"
          :status-counts="statusCounts"
          :verification-counts="verificationCounts"
          :output-port-counts="outputPortCounts"
          :platform-counts="platformCounts"
          :connectivity-counts="connectivityCounts"
          :storage-expansion-counts="storageExpansionCounts"
          :quick-filter-counts="quickFilterCounts"
          :price-bounds="priceBounds"
          :year-bounds="yearBounds"
          :ram-bounds="ramBounds"
          :storage-bounds="storageBounds"
          @update:filters="filters = $event"
          @clear-filters="clearFilters"
        />
      </aside>

      <section class="catalog-results" aria-label="DAP catalog results">
        <header class="catalog-hero">
          <div>
            <h1>DAP Database</h1>
            <p class="intro">Specs, sources, and verification for digital audio players.</p>
            <nav class="header-actions" aria-label="Contribution links">
              <a
                class="btn btn-primary"
                href="https://github.com/jreqtech/dap-database/issues/new?template=missing-dap.yml"
                target="_blank"
                rel="noreferrer"
              >
                Request a missing DAP
              </a>
              <a
                class="btn btn-primary-soft"
                href="https://github.com/jreqtech/dap-database/issues/new?template=correction.yml"
                target="_blank"
                rel="noreferrer"
              >
                Report a correction
              </a>
              <a class="btn btn-secondary" href="#/compare">Compare</a>
            </nav>
          </div>
            <dl class="stats-grid">
              <div><dt>Total DAPs</dt><dd>{{ daps.length }}</dd></div>
              <div><dt>Rows with Sources</dt><dd>{{ sourcedCount }}</dd></div>
              <div><dt>Android DAPs</dt><dd>{{ androidCount }}</dd></div>
              <div><dt>With 4.4mm</dt><dd>{{ balancedCount }}</dd></div>
            </dl>
        </header>

        <div class="toolbar-row">
          <div>
            <label class="toolbar-search">
              <Search :size="16" aria-hidden="true" />
              <span class="sr-only">Search DAP database</span>
              <input
                v-model="filters.search"
                type="search"
                placeholder="Search brand, model, DAC, SoC, OS, colors"
              />
            </label>
          </div>

          <div class="toolbar-actions">
            <SortControl v-model="sortState" />
            <div class="segmented-control view-toggle" aria-label="View mode">
              <button
                class="segmented-button"
                :class="{ 'is-active': viewMode === 'cards' }"
                type="button"
                aria-label="Cards view"
                title="Cards view"
                @click="viewMode = 'cards'"
              >
                <Grid2X2 :size="16" aria-hidden="true" />
              </button>
              <button
                class="segmented-button"
                :class="{ 'is-active': viewMode === 'table' }"
                type="button"
                aria-label="Table view"
                title="Table view"
                @click="viewMode = 'table'"
              >
                <Table2 :size="16" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeFilterChips.length" class="active-filters" aria-label="Active filters">
          <button
            v-for="chip in activeFilterChips"
            :key="`${chip.key}:${chip.value ?? chip.label}`"
            class="filter-chip filter-chip--button"
            type="button"
            :aria-label="`Remove ${chip.label} filter`"
            @click="removeFilter(chip.key, chip.value)"
          >
            <span>{{ chip.label }}</span>
            <span aria-hidden="true">x</span>
          </button>
        </div>

        <DapTable
          v-if="viewMode === 'table'"
          :daps="visibleDaps"
          :sort-state="sortState"
          @sort="cycleSort"
        />

        <section v-else ref="cardGrid" class="card-grid" aria-label="DAP cards">
          <DapCard
            v-for="dap in visibleCardDaps"
            :key="dap.id"
            :dap="dap"
          />
        </section>

        <div v-if="viewMode === 'cards' && hasMoreCardDaps" class="load-more-row">
          <span ref="cardLoadSentinel" class="load-more-sentinel" aria-hidden="true"></span>
          <span>Showing {{ visibleCardDaps.length }} of {{ visibleDaps.length }} DAPs</span>
          <div class="load-more-actions">
            <button class="btn btn-secondary" type="button" @click="loadMoreCards">
              {{ loadMoreLabel }}
            </button>
            <button class="btn btn-ghost" type="button" @click="loadAllCards">
              Show all
            </button>
          </div>
        </div>

        <p v-if="visibleDaps.length === 0" class="empty-state">
          <ListFilter :size="18" aria-hidden="true" />
          <span>No DAPs match the current filters.</span>
        </p>

      </section>
    </div>
  </main>

  <DapDetailsModal
    :dap="selectedDap"
    :previous-dap="previousDap"
    :next-dap="nextDap"
    :sheet-mode="isSheetRoute"
    :raw-fields="selectedRawFields"
    @close="closeDapDetails"
    @navigate="openDapDetails"
  />

  <footer v-if="!isSheetRoute && !isCompareRoute" class="site-footer">
    <div class="footer-copy">
      <p class="footer-disclaimer">
        Specs are best-effort and source-backed where possible. Values may vary by region, firmware, revision, gain
        setting, output mode, or measurement method.
      </p>
      <nav class="footer-actions" aria-label="Project links">
        <a href="https://github.com/jreqtech/dap-database" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a
          href="https://github.com/jreqtech/dap-database/issues/new?template=missing-dap.yml"
          target="_blank"
          rel="noopener noreferrer"
        >
          Request a missing DAP
        </a>
        <a
          href="https://github.com/jreqtech/dap-database/issues/new?template=correction.yml"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report a correction
        </a>
        <a href="https://github.com/jreqtech/dap-database/issues/new" target="_blank" rel="noopener noreferrer">
          Request a feature
        </a>
        <a href="https://github.com/jreqtech/dap-database/blob/main/ROADMAP.md" target="_blank" rel="noopener noreferrer">
          Roadmap
        </a>
      </nav>
    </div>

    <section class="footer-follow" aria-label="JReqTech links">
      <img :src="jreqTechLogo" alt="JReqTech" class="footer-logo" loading="lazy" decoding="async" />
      <nav class="footer-social" aria-label="JReqTech social links">
        <a
          href="https://github.com/jreqtech/dap-database"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          title="GitHub"
        >
          <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="socialIcons.github" />
          </svg>
        </a>
        <a
          href="https://jreqtech.blogspot.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Blog"
          title="Blog"
        >
          <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="socialIcons.blogger" />
          </svg>
        </a>
        <a
          href="https://www.facebook.com/jreqtech"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          title="Facebook"
        >
          <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="socialIcons.facebook" />
          </svg>
        </a>
        <a
          href="https://www.head-fi.org/showcase/authors/jreqtech.584807/reviews"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Head-Fi reviews"
          title="Head-Fi reviews"
        >
          <Headphones :size="20" aria-hidden="true" />
        </a>
        <a
          href="https://www.reddit.com/user/jreqtech/submitted/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Reddit"
          title="Reddit"
        >
          <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="socialIcons.reddit" />
          </svg>
        </a>
        <a
          href="https://www.youtube.com/@jreq_tech"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
          title="YouTube"
        >
          <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="socialIcons.youtube" />
          </svg>
        </a>
        <a
          href="https://www.tiktok.com/@jreq_tech"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok"
          title="TikTok"
        >
          <svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="socialIcons.tiktok" />
          </svg>
        </a>
      </nav>
    </section>
  </footer>
</template>

