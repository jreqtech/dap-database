<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Dap } from '../../types/dap';
import { comparisonSpecGroups, dapDisplayName } from '../../utils/dapSpecs';

interface LinkItem {
  label: string;
  url: string;
}

interface LinkRow {
  key: string;
  label: string;
  links: (dap: Dap) => LinkItem[];
}

const props = defineProps<{
  daps: Array<Dap | null>;
  showMobileStickyNames?: boolean;
}>();

const expandedNotes = ref(new Set<number>());
const expandedLinkCells = ref(new Set<string>());
const isCompactCompare = ref(false);
let compactMediaQuery: MediaQueryList | null = null;

const selectedDaps = computed(() => props.daps.filter((dap): dap is Dap => Boolean(dap)));
const tableDaps = computed(() => (isCompactCompare.value ? props.daps.slice(0, 2) : props.daps));

const linkRowDefinitions: LinkRow[] = [
  {
    key: 'official-source',
    label: 'Official source',
    links: (dap) => {
      const url = dap.officialUrl || dap.sourceUrl;
      return url ? [{ label: 'View source', url }] : [];
    },
  },
  {
    key: 'official-store',
    label: 'Official store',
    links: (dap) => (dap.officialStoreUrl ? [{ label: 'Official store', url: dap.officialStoreUrl }] : []),
  },
  {
    key: 'buy-links',
    label: 'Buy links',
    links: (dap) => dap.buyLinks.map((link) => ({ label: link.label, url: link.url })),
  },
  {
    key: 'reviews',
    label: 'Reviews',
    links: (dap) => dap.reviewLinks.map((link) => ({ label: link.label, url: link.url })),
  },
];

const visibleLinkRows = computed(() => linkRowDefinitions.filter((row) => selectedDaps.value.some((dap) => row.links(dap).length)));

function displayValue(value: string): string {
  const normalized = value
    .trim()
    .replace(/\b(\d+(?:\.\d+)?)\s*mm\b/giu, '$1 mm')
    .replace(/\b(\d+(?:\.\d+)?)\s*GHz\b/giu, '$1 GHz')
    .replace(/\b(\d+(?:\.\d+)?)\s*mW\b/giu, '$1 mW')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*@\s*/g, ' @ ')
    .replace(/\s+/g, ' ');
  return normalized ? normalized : 'Not listed';
}

function noteValue(dap: Dap | null): string {
  if (!dap?.notes.trim()) return 'Not listed';
  return dap.notes
    .split('|')
    .map((part) => part.trim().replace(/^Verified\s*-\s*[^:]+:\s*/i, ''))
    .filter(Boolean)
    .join(' ');
}

function isLongNote(dap: Dap | null): boolean {
  return noteValue(dap).length > 240;
}

function isNoteExpanded(index: number): boolean {
  return expandedNotes.value.has(index);
}

function toggleNote(index: number) {
  const next = new Set(expandedNotes.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  expandedNotes.value = next;
}

function linkCellKey(rowKey: string, index: number): string {
  return `${rowKey}-${index}`;
}

function visibleLinks(row: LinkRow, dap: Dap, index: number): LinkItem[] {
  const links = row.links(dap);
  if (row.key !== 'reviews' || links.length <= 2 || expandedLinkCells.value.has(linkCellKey(row.key, index))) return links;
  return links.slice(0, 2);
}

function hiddenLinkCount(row: LinkRow, dap: Dap, index: number): number {
  const links = row.links(dap);
  if (row.key !== 'reviews' || links.length <= 2 || expandedLinkCells.value.has(linkCellKey(row.key, index))) return 0;
  return links.length - 2;
}

function expandLinks(rowKey: string, index: number) {
  expandedLinkCells.value = new Set(expandedLinkCells.value).add(linkCellKey(rowKey, index));
}

function syncCompactCompare(event?: MediaQueryListEvent) {
  isCompactCompare.value = event?.matches ?? Boolean(compactMediaQuery?.matches);
}

onMounted(() => {
  compactMediaQuery = window.matchMedia('(max-width: 760px)');
  syncCompactCompare();
  compactMediaQuery.addEventListener('change', syncCompactCompare);
});

onBeforeUnmount(() => {
  compactMediaQuery?.removeEventListener('change', syncCompactCompare);
});
</script>

<template>
  <section class="compare-table-panel" aria-label="DAP specification comparison">
    <div class="compare-table-scroll">
      <table class="compare-table">
        <colgroup>
          <col v-if="!isCompactCompare" class="compare-table__group-col" />
          <col class="compare-table__spec-col" />
          <col v-for="(_, index) in tableDaps" :key="`dap-col-${index}`" class="compare-table__dap-col" />
        </colgroup>
        <thead v-if="isCompactCompare && props.showMobileStickyNames" class="compare-table__mobile-sticky-head">
          <tr>
            <th scope="col" aria-label="Specification"></th>
            <th v-for="(dap, index) in tableDaps" :key="`mobile-head-${index}`" scope="col">
              {{ dap ? dapDisplayName(dap) : 'Select DAP' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in comparisonSpecGroups" :key="group.key">
            <tr v-if="isCompactCompare" class="compare-table__mobile-section">
              <th :colspan="tableDaps.length + 1" scope="colgroup">{{ group.label }}</th>
            </tr>
            <tr v-for="(row, rowIndex) in group.rows" :key="`${group.key}-${row.key}`">
              <th
                v-if="!isCompactCompare && rowIndex === 0"
                class="compare-table__group-cell"
                :rowspan="group.rows.length"
                scope="rowgroup"
              >
                {{ group.label }}
              </th>
              <th scope="row">{{ row.label }}</th>
              <td v-for="(dap, index) in tableDaps" :key="`${row.key}-${index}`">
                <span :class="{ 'compare-muted-value': !dap || !row.value(dap).trim() }">
                  {{ dap ? displayValue(row.value(dap)) : '' }}
                </span>
              </td>
            </tr>
          </template>
          <tr v-if="isCompactCompare" class="compare-table__mobile-section">
            <th :colspan="tableDaps.length + 1" scope="colgroup">Notes</th>
          </tr>
          <tr class="compare-table__section-start">
            <th v-if="!isCompactCompare" class="compare-table__group-cell" scope="rowgroup">Notes</th>
            <th scope="row">Notes</th>
            <td v-for="(dap, index) in tableDaps" :key="`notes-${index}`">
              <div class="compare-note" :class="{ 'is-collapsed': isLongNote(dap) && !isNoteExpanded(index) }">
                {{ noteValue(dap) }}
              </div>
              <button
                v-if="isLongNote(dap)"
                class="compare-note-toggle"
                type="button"
                @click="toggleNote(index)"
              >
                {{ isNoteExpanded(index) ? 'Show less' : 'Show more' }}
              </button>
            </td>
          </tr>
          <template v-if="visibleLinkRows.length">
            <tr v-if="isCompactCompare" class="compare-table__mobile-section">
              <th :colspan="tableDaps.length + 1" scope="colgroup">Links</th>
            </tr>
            <tr
              v-for="(row, rowIndex) in visibleLinkRows"
              :key="`links-${row.key}`"
              :class="{ 'compare-table__section-start': rowIndex === 0 }"
            >
              <th
                v-if="!isCompactCompare && rowIndex === 0"
                class="compare-table__group-cell"
                :rowspan="visibleLinkRows.length"
                scope="rowgroup"
              >
                Links
              </th>
              <th scope="row">{{ row.label }}</th>
              <td v-for="(dap, index) in tableDaps" :key="`${row.key}-${index}`">
                <div v-if="dap && row.links(dap).length" class="compare-link-list">
                  <a
                    v-for="link in visibleLinks(row, dap, index)"
                    :key="link.url"
                    class="compare-link-chip"
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    :aria-label="`Open ${link.label} for ${dapDisplayName(dap)} in a new tab`"
                  >
                    {{ link.label }}
                  </a>
                  <button
                    v-if="hiddenLinkCount(row, dap, index)"
                    class="compare-link-more"
                    type="button"
                    :aria-label="`Show ${hiddenLinkCount(row, dap, index)} more review links for ${dapDisplayName(dap)}`"
                    @click="expandLinks(row.key, index)"
                  >
                    +{{ hiddenLinkCount(row, dap, index) }} more
                  </button>
                </div>
                <span v-else class="compare-muted-value">Not listed</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
