<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  Grid2X2,
  Headphones,
  ListFilter,
  RotateCcw,
  Table2,
} from 'lucide-vue-next';
import { siBlogger, siFacebook, siGithub, siReddit, siTiktok, siYoutube } from 'simple-icons';
import rawDaps from './data/daps.json';
import ComparisonPanel from './components/ComparisonPanel.vue';
import ComparisonTray from './components/ComparisonTray.vue';
import DapCard from './components/DapCard.vue';
import DapDetailsModal from './components/DapDetailsModal.vue';
import DapFilters from './components/DapFilters.vue';
import DapTable from './components/DapTable.vue';
import SortControl from './components/SortControl.vue';
import type { Dap, DapFilters as DapFiltersType, SortKey, SortState } from './types/dap';
import { isAndroidBased } from './utils/dapDisplay';
import { filterDaps, sortDaps, uniqueSorted } from './utils/filters';

type ViewMode = 'cards' | 'table';

const daps = rawDaps as Dap[];
const viewStorageKey = 'dap-database-view-mode-v2';
const pinsStorageKey = 'dap-database-pinned-ids';
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
  outputPorts: [],
  platform: [],
  connectivity: [],
  has44mmOnly: false,
  androidOnly: false,
});

const defaultSortState: SortState = { key: 'default', direction: 'asc' };
const sortState = ref<SortState>({ ...defaultSortState });
const pinnedIds = ref(new Set<string>());
const viewMode = ref<ViewMode>('table');
const selectedDap = ref<Dap | null>(null);
const showComparison = ref(false);

const brands = computed(() => uniqueSorted(daps.map((dap) => dap.brand)));
const statuses = computed(() => uniqueSorted(daps.map((dap) => dap.status)));
const verificationStatuses = computed(() => uniqueSorted(daps.map((dap) => dap.verificationStatus)));
const visibleDaps = computed(() => sortDaps(filterDaps(daps, filters.value), sortState.value));
const pinnedDaps = computed(() => daps.filter((dap) => pinnedIds.value.has(dap.id)));
const verifiedCount = computed(() => daps.filter((dap) => !dap.verificationStatus.toLowerCase().includes('needs source')).length);
const androidCount = computed(() => daps.filter(isAndroidBased).length);
const balancedCount = computed(() => daps.filter((dap) => dap.has44mm).length);
const activeFilterChips = computed(() => {
  const chips: string[] = [];
  if (filters.value.search) chips.push(`Search: ${filters.value.search}`);
  if (filters.value.brand.length) chips.push(`Brand: ${filters.value.brand.join(', ')}`);
  if (filters.value.status.length) chips.push(`Status: ${filters.value.status.join(', ')}`);
  if (filters.value.verificationStatus.length) {
    chips.push(`Verification: ${filters.value.verificationStatus.join(', ')}`);
  }
  if (filters.value.priceMin || filters.value.priceMax) {
    chips.push(`Price: ${filters.value.priceMin || '0'}-${filters.value.priceMax || 'any'}`);
  }
  if (filters.value.yearMin || filters.value.yearMax) {
    chips.push(`Year: ${filters.value.yearMin || 'oldest'}-${filters.value.yearMax || 'latest'}`);
  }
  if (filters.value.outputPorts.length) chips.push(`Ports: ${filters.value.outputPorts.join(', ')}`);
  if (filters.value.platform.length) chips.push(`Platform: ${filters.value.platform.join(', ')}`);
  if (filters.value.connectivity.length) chips.push(`Connectivity: ${filters.value.connectivity.join(', ')}`);
  if (filters.value.has44mmOnly) chips.push('4.4mm only');
  if (filters.value.androidOnly) chips.push('Android-based');
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

function togglePinned(id: string) {
  const nextPinnedIds = new Set(pinnedIds.value);
  if (nextPinnedIds.has(id)) nextPinnedIds.delete(id);
  else nextPinnedIds.add(id);
  pinnedIds.value = nextPinnedIds;
  if (nextPinnedIds.size === 0) showComparison.value = false;
}

function clearPinnedRows() {
  pinnedIds.value = new Set();
  showComparison.value = false;
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
    outputPorts: [],
    platform: [],
    connectivity: [],
    has44mmOnly: false,
    androidOnly: false,
  };
}

onMounted(() => {
  const savedView = localStorage.getItem(viewStorageKey);
  if (savedView === 'cards' || savedView === 'table') {
    viewMode.value = savedView;
  } else if (window.matchMedia('(max-width: 760px)').matches) {
    viewMode.value = 'cards';
  }

  const savedPins = localStorage.getItem(pinsStorageKey);
  if (savedPins) {
    try {
      const ids = JSON.parse(savedPins) as string[];
      pinnedIds.value = new Set(ids.filter((id) => daps.some((dap) => dap.id === id)));
    } catch {
      pinnedIds.value = new Set();
    }
  }
});

watch(viewMode, (mode) => {
  localStorage.setItem(viewStorageKey, mode);
});

watch(
  pinnedIds,
  (ids) => {
    localStorage.setItem(pinsStorageKey, JSON.stringify([...ids]));
  },
  { deep: true },
);
</script>

<template>
  <header class="site-header">
    <div class="site-header__content">
      <div>
        <h1>DAP Database</h1>
        <p class="intro">Specs, sources, verification, and comparison for digital audio players.</p>
        <nav class="header-actions" aria-label="Contribution links">
          <a
            class="btn btn-primary"
            href="https://github.com/jrequiroso/dap-database/issues/new?template=missing-dap.yml"
            target="_blank"
            rel="noreferrer"
          >
            Request a missing DAP
          </a>
          <a
            class="btn btn-primary-soft"
            href="https://github.com/jrequiroso/dap-database/issues/new?template=correction.yml"
            target="_blank"
            rel="noreferrer"
          >
            Report a correction
          </a>
        </nav>
      </div>
      <dl class="stats-grid">
        <div><dt>Total DAPs</dt><dd>{{ daps.length }}</dd></div>
        <div><dt>Verified rows</dt><dd>{{ verifiedCount }}</dd></div>
        <div><dt>Android DAPs</dt><dd>{{ androidCount }}</dd></div>
        <div><dt>With 4.4mm</dt><dd>{{ balancedCount }}</dd></div>
      </dl>
    </div>
  </header>

  <main class="app-shell">
    <DapFilters
      :filters="filters"
      :brands="brands"
      :statuses="statuses"
      :verification-statuses="verificationStatuses"
      @update:filters="filters = $event"
    />

    <div class="toolbar-row">
      <div>
        <p class="result-count">{{ visibleDaps.length }} of {{ daps.length }} DAPs</p>
        <div v-if="activeFilterChips.length" class="active-filters" aria-label="Active filters">
          <span v-for="chip in activeFilterChips" :key="chip" class="filter-chip">{{ chip }}</span>
        </div>
      </div>

      <div class="toolbar-actions">
        <SortControl v-if="viewMode === 'cards'" v-model="sortState" />
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
        <button class="btn btn-secondary" type="button" @click="clearFilters">
          <RotateCcw :size="16" aria-hidden="true" />
          <span>Reset filters</span>
        </button>
      </div>
    </div>

    <ComparisonPanel v-if="showComparison" :daps="pinnedDaps" @close="showComparison = false" />

    <DapTable
      v-if="viewMode === 'table'"
      :daps="visibleDaps"
      :pinned-ids="pinnedIds"
      :sort-state="sortState"
      @sort="cycleSort"
      @pin="togglePinned"
      @details="selectedDap = $event"
    />

    <section v-else class="card-grid" aria-label="DAP cards">
      <DapCard
        v-for="dap in visibleDaps"
        :key="dap.id"
        :dap="dap"
        :is-pinned="pinnedIds.has(dap.id)"
        @pin="togglePinned"
        @details="selectedDap = $event"
      />
    </section>

    <p v-if="visibleDaps.length === 0" class="empty-state">
      <ListFilter :size="18" aria-hidden="true" />
      <span>No DAPs match the current filters.</span>
    </p>

    <aside class="mvp-note">
      Specs are best-effort and source-backed where possible. Corrections and missing DAP suggestions are welcome through
      GitHub issues.
    </aside>
  </main>

  <ComparisonTray
    :daps="pinnedDaps"
    @compare="showComparison = true"
    @clear="clearPinnedRows"
    @remove="togglePinned"
  />

  <DapDetailsModal :dap="selectedDap" @close="selectedDap = null" />

  <footer class="site-footer">
    <span>Curated by JReqTech.</span>
    <nav class="footer-links" aria-label="JReqTech links">
      <a
        href="https://github.com/jrequiroso/dap-database"
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
        <Headphones :size="17" aria-hidden="true" />
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
  </footer>
</template>
