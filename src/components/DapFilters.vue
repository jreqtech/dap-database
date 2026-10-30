<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DapFilters } from '../types/dap';

const props = defineProps<{
  filters: DapFilters;
  brands: string[];
  statuses: string[];
  verificationStatuses: string[];
  brandCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  verificationCounts: Record<string, number>;
  outputPortCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  connectivityCounts: Record<string, number>;
  storageExpansionCounts: Record<string, number>;
  quickFilterCounts: Record<string, number>;
  priceBounds: { min: number; max: number };
  yearBounds: { min: number; max: number };
  ramBounds: { min: number; max: number };
  storageBounds: { min: number; max: number };
}>();

const showAllBrands = ref(false);
const visibleBrands = computed(() => showAllBrands.value
  ? props.brands
  : props.brands.filter((brand, index) => index < 8 || props.filters.brand.includes(brand)));

const emit = defineEmits<{
  'update:filters': [filters: DapFilters];
  clearFilters: [];
}>();

function update(filters: DapFilters, patch: Partial<DapFilters>) {
  emit('update:filters', { ...filters, ...patch });
}

function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function numberOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function updatePriceMin(filters: DapFilters, value: string, bounds: { min: number; max: number }) {
  const nextMin = clamp(numberOr(value, bounds.min), bounds.min, bounds.max);
  const currentMax = clamp(numberOr(filters.priceMax, bounds.max), bounds.min, bounds.max);
  update(filters, {
    priceMin: String(nextMin),
    priceMax: String(Math.max(currentMax, nextMin)),
  });
}

function updatePriceMax(filters: DapFilters, value: string, bounds: { min: number; max: number }) {
  const nextMax = clamp(numberOr(value, bounds.max), bounds.min, bounds.max);
  const currentMin = clamp(numberOr(filters.priceMin, bounds.min), bounds.min, bounds.max);
  update(filters, {
    priceMin: String(Math.min(currentMin, nextMax)),
    priceMax: String(nextMax),
  });
}

function updateYearMin(filters: DapFilters, value: string, bounds: { min: number; max: number }) {
  const nextMin = clamp(numberOr(value, bounds.min), bounds.min, bounds.max);
  const currentMax = clamp(numberOr(filters.yearMax, bounds.max), bounds.min, bounds.max);
  update(filters, {
    yearMin: String(nextMin),
    yearMax: String(Math.max(currentMax, nextMin)),
  });
}

function updateYearMax(filters: DapFilters, value: string, bounds: { min: number; max: number }) {
  const nextMax = clamp(numberOr(value, bounds.max), bounds.min, bounds.max);
  const currentMin = clamp(numberOr(filters.yearMin, bounds.min), bounds.min, bounds.max);
  update(filters, {
    yearMin: String(Math.min(currentMin, nextMax)),
    yearMax: String(nextMax),
  });
}

function updateRamMin(filters: DapFilters, value: string, bounds: { min: number; max: number }) {
  const nextMin = clamp(numberOr(value, bounds.min), bounds.min, bounds.max);
  const currentMax = clamp(numberOr(filters.ramMax, bounds.max), bounds.min, bounds.max);
  update(filters, {
    ramMin: String(nextMin),
    ramMax: String(Math.max(currentMax, nextMin)),
  });
}

function updateRamMax(filters: DapFilters, value: string, bounds: { min: number; max: number }) {
  const nextMax = clamp(numberOr(value, bounds.max), bounds.min, bounds.max);
  const currentMin = clamp(numberOr(filters.ramMin, bounds.min), bounds.min, bounds.max);
  update(filters, {
    ramMin: String(Math.min(currentMin, nextMax)),
    ramMax: String(nextMax),
  });
}

function updateStorageMin(filters: DapFilters, value: string, bounds: { min: number; max: number }) {
  const nextMin = clamp(numberOr(value, bounds.min), bounds.min, bounds.max);
  const currentMax = clamp(numberOr(filters.storageMax, bounds.max), bounds.min, bounds.max);
  update(filters, {
    storageMin: String(nextMin),
    storageMax: String(Math.max(currentMax, nextMin)),
  });
}

function updateStorageMax(filters: DapFilters, value: string, bounds: { min: number; max: number }) {
  const nextMax = clamp(numberOr(value, bounds.max), bounds.min, bounds.max);
  const currentMin = clamp(numberOr(filters.storageMin, bounds.min), bounds.min, bounds.max);
  update(filters, {
    storageMin: String(Math.min(currentMin, nextMax)),
    storageMax: String(nextMax),
  });
}

const outputPorts = ['2.5mm', '3.5mm', '4.4mm', '6.35mm'];
const platforms = ['Android', 'Non-Android'];
const connectivityOptions = ['Bluetooth', 'Wi-Fi', 'Cellular', '4G', '5G'];
const storageExpansionOptions = [
  { value: 'expandable', label: 'Expandable' },
  { value: 'none', label: 'No expansion' },
  { value: 'unknown', label: 'Unknown' },
];
</script>

<template>
  <section class="filters" aria-label="DAP filters">
    <header class="filters-header">
      <h2>Filters</h2>
      <button class="btn btn-secondary btn-sm" type="button" @click="emit('clearFilters')">Reset filters</button>
    </header>

    <details class="filter-section" open>
      <summary><h3>Brand</h3></summary>
      <div class="checkbox-group checkbox-group--scroll" aria-label="Brand">
        <label v-for="brand in visibleBrands" :key="brand" class="filter-checkbox">
          <input
            type="checkbox"
            :checked="filters.brand.includes(brand)"
            @change="update(filters, { brand: toggleFilterValue(filters.brand, brand) })"
          />
          <span class="filter-label">{{ brand }}</span>
          <span class="filter-count">({{ brandCounts[brand] ?? 0 }})</span>
        </label>
        <button v-if="brands.length > 8" class="filter-show-all" type="button" :aria-expanded="showAllBrands" @click="showAllBrands = !showAllBrands">
          {{ showAllBrands ? 'Show fewer' : `Show all ${brands.length} brands` }}
        </button>
      </div>
    </details>

    <details class="filter-section" open>
      <summary><h3>Price</h3></summary>
      <fieldset class="range-filter">
        <legend class="sr-only">Price range</legend>
        <div class="range-inputs">
        <label class="field range-field">
          <span class="sr-only">Minimum price</span>
          <input
            :value="filters.priceMin || priceBounds.min"
            type="number"
            :min="priceBounds.min"
            :max="priceBounds.max"
            inputmode="numeric"
            placeholder="Min $"
            @input="updatePriceMin(filters, ($event.target as HTMLInputElement).value, priceBounds)"
          />
        </label>
        <span class="range-separator">-</span>
        <label class="field range-field">
          <span class="sr-only">Maximum price</span>
          <input
            :value="filters.priceMax || priceBounds.max"
            type="number"
            :min="priceBounds.min"
            :max="priceBounds.max"
            inputmode="numeric"
            placeholder="Max $"
            @input="updatePriceMax(filters, ($event.target as HTMLInputElement).value, priceBounds)"
          />
        </label>
        </div>
        <div class="range-slider">
          <input
            :value="filters.priceMin || priceBounds.min"
            type="range"
            :min="priceBounds.min"
            :max="priceBounds.max"
            step="50"
            aria-label="Minimum price"
            @input="updatePriceMin(filters, ($event.target as HTMLInputElement).value, priceBounds)"
          />
          <input
            :value="filters.priceMax || priceBounds.max"
            type="range"
            :min="priceBounds.min"
            :max="priceBounds.max"
            step="50"
            aria-label="Maximum price"
            @input="updatePriceMax(filters, ($event.target as HTMLInputElement).value, priceBounds)"
          />
        </div>
      </fieldset>
    </details>

    <details class="filter-section" open>
      <summary><h3>Status</h3></summary>
      <div class="checkbox-group" aria-label="Status">
        <label v-for="status in statuses" :key="status" class="filter-checkbox">
          <input
            type="checkbox"
            :checked="filters.status.includes(status)"
            @change="update(filters, { status: toggleFilterValue(filters.status, status) })"
          />
          <span class="filter-label">{{ status }}</span>
          <span class="filter-count">({{ statusCounts[status] ?? 0 }})</span>
        </label>
      </div>
    </details>

    <details class="filter-section" open>
      <summary><h3>Year</h3></summary>
      <fieldset class="range-filter">
        <legend class="sr-only">Release year range</legend>
        <div class="range-inputs">
        <label class="field range-field">
          <span class="sr-only">Minimum release year</span>
          <input
            :value="filters.yearMin || yearBounds.min"
            type="number"
            :min="yearBounds.min"
            :max="yearBounds.max"
            inputmode="numeric"
            placeholder="Year from"
            @input="updateYearMin(filters, ($event.target as HTMLInputElement).value, yearBounds)"
          />
        </label>
        <span class="range-separator">-</span>
        <label class="field range-field">
          <span class="sr-only">Maximum release year</span>
          <input
            :value="filters.yearMax || yearBounds.max"
            type="number"
            :min="yearBounds.min"
            :max="yearBounds.max"
            inputmode="numeric"
            placeholder="Year to"
            @input="updateYearMax(filters, ($event.target as HTMLInputElement).value, yearBounds)"
          />
        </label>
        </div>
        <div class="range-slider">
          <input
            :value="filters.yearMin || yearBounds.min"
            type="range"
            :min="yearBounds.min"
            :max="yearBounds.max"
            step="1"
            aria-label="Minimum release year"
            @input="updateYearMin(filters, ($event.target as HTMLInputElement).value, yearBounds)"
          />
          <input
            :value="filters.yearMax || yearBounds.max"
            type="range"
            :min="yearBounds.min"
            :max="yearBounds.max"
            step="1"
            aria-label="Maximum release year"
            @input="updateYearMax(filters, ($event.target as HTMLInputElement).value, yearBounds)"
          />
        </div>
      </fieldset>
    </details>

    <details class="filter-section" open>
      <summary><h3>Storage</h3></summary>
      <div class="storage-filter-grid">
        <fieldset class="range-filter">
          <legend class="sr-only">Storage range</legend>
          <div class="range-inputs">
          <label class="field range-field">
            <span class="sr-only">Minimum storage in GB</span>
            <input
              :value="filters.storageMin || storageBounds.min"
              type="number"
              :min="storageBounds.min"
              :max="storageBounds.max"
              inputmode="decimal"
              placeholder="Min GB"
              @input="updateStorageMin(filters, ($event.target as HTMLInputElement).value, storageBounds)"
            />
          </label>
          <span class="range-separator">-</span>
          <label class="field range-field">
            <span class="sr-only">Maximum storage in GB</span>
            <input
              :value="filters.storageMax || storageBounds.max"
              type="number"
              :min="storageBounds.min"
              :max="storageBounds.max"
              inputmode="decimal"
              placeholder="Max GB"
              @input="updateStorageMax(filters, ($event.target as HTMLInputElement).value, storageBounds)"
            />
          </label>
          </div>
          <div class="range-slider">
            <input
              :value="filters.storageMin || storageBounds.min"
              type="range"
              :min="storageBounds.min"
              :max="storageBounds.max"
              step="1"
              aria-label="Minimum storage in GB"
              @input="updateStorageMin(filters, ($event.target as HTMLInputElement).value, storageBounds)"
            />
            <input
              :value="filters.storageMax || storageBounds.max"
              type="range"
              :min="storageBounds.min"
              :max="storageBounds.max"
              step="1"
              aria-label="Maximum storage in GB"
              @input="updateStorageMax(filters, ($event.target as HTMLInputElement).value, storageBounds)"
            />
          </div>
        </fieldset>
        <div class="storage-expansion-filter">
          <h4>Expansion</h4>
          <div class="checkbox-group" aria-label="Storage expansion">
            <label v-for="option in storageExpansionOptions" :key="option.value" class="filter-checkbox">
              <input
                type="checkbox"
                :checked="filters.storageExpansion.includes(option.value)"
                @change="update(filters, { storageExpansion: toggleFilterValue(filters.storageExpansion, option.value) })"
              />
              <span class="filter-label">{{ option.label }}</span>
              <span class="filter-count">({{ storageExpansionCounts[option.value] ?? 0 }})</span>
            </label>
          </div>
        </div>
      </div>
    </details>

    <details class="filter-section" open>
      <summary><h3>RAM</h3></summary>
      <fieldset class="range-filter">
        <legend class="sr-only">RAM range</legend>
        <div class="range-inputs">
        <label class="field range-field">
          <span class="sr-only">Minimum RAM in GB</span>
          <input
            :value="filters.ramMin || ramBounds.min"
            type="number"
            :min="ramBounds.min"
            :max="ramBounds.max"
            step="0.5"
            inputmode="decimal"
            placeholder="Min GB"
            @input="updateRamMin(filters, ($event.target as HTMLInputElement).value, ramBounds)"
          />
        </label>
        <span class="range-separator">-</span>
        <label class="field range-field">
          <span class="sr-only">Maximum RAM in GB</span>
          <input
            :value="filters.ramMax || ramBounds.max"
            type="number"
            :min="ramBounds.min"
            :max="ramBounds.max"
            step="0.5"
            inputmode="decimal"
            placeholder="Max GB"
            @input="updateRamMax(filters, ($event.target as HTMLInputElement).value, ramBounds)"
          />
        </label>
        </div>
        <div class="range-slider">
          <input
            :value="filters.ramMin || ramBounds.min"
            type="range"
            :min="ramBounds.min"
            :max="ramBounds.max"
            step="0.5"
            aria-label="Minimum RAM in GB"
            @input="updateRamMin(filters, ($event.target as HTMLInputElement).value, ramBounds)"
          />
          <input
            :value="filters.ramMax || ramBounds.max"
            type="range"
            :min="ramBounds.min"
            :max="ramBounds.max"
            step="0.5"
            aria-label="Maximum RAM in GB"
            @input="updateRamMax(filters, ($event.target as HTMLInputElement).value, ramBounds)"
          />
        </div>
      </fieldset>
    </details>

    <details class="filter-section" open>
      <summary><h3>Audio</h3></summary>
      <div class="checkbox-group" aria-label="Output ports">
        <label v-for="port in outputPorts" :key="port" class="filter-checkbox">
          <input
            type="checkbox"
            :checked="filters.outputPorts.includes(port)"
            @change="update(filters, { outputPorts: toggleFilterValue(filters.outputPorts, port) })"
          />
          <span class="filter-label">{{ port }}</span>
          <span class="filter-count">({{ outputPortCounts[port] ?? 0 }})</span>
        </label>

        <label class="filter-checkbox">
          <input
            :checked="filters.has44mmOnly"
            type="checkbox"
            @change="update(filters, { has44mmOnly: ($event.target as HTMLInputElement).checked })"
          />
          <span class="filter-label">4.4mm only</span>
          <span class="filter-count">({{ quickFilterCounts.has44mmOnly ?? 0 }})</span>
        </label>
      </div>
    </details>

    <details class="filter-section" open>
      <summary><h3>Platform</h3></summary>
      <div class="checkbox-group" aria-label="Platform">
        <label v-for="platform in platforms" :key="platform" class="filter-checkbox">
          <input
            type="checkbox"
            :checked="filters.platform.includes(platform)"
            @change="update(filters, { platform: toggleFilterValue(filters.platform, platform) })"
          />
          <span class="filter-label">{{ platform }}</span>
          <span class="filter-count">({{ platformCounts[platform] ?? 0 }})</span>
        </label>

        <label class="filter-checkbox">
          <input
            :checked="filters.androidOnly"
            type="checkbox"
            @change="update(filters, { androidOnly: ($event.target as HTMLInputElement).checked })"
          />
          <span class="filter-label">Android-based</span>
          <span class="filter-count">({{ quickFilterCounts.androidOnly ?? 0 }})</span>
        </label>
      </div>
    </details>

    <details class="filter-section" open>
      <summary><h3>Connectivity</h3></summary>
      <div class="checkbox-group" aria-label="Connectivity">
        <label
          v-for="connectivity in connectivityOptions"
          :key="connectivity"
          class="filter-checkbox"
        >
          <input
            type="checkbox"
            :checked="filters.connectivity.includes(connectivity)"
            @change="update(filters, { connectivity: toggleFilterValue(filters.connectivity, connectivity) })"
          />
          <span class="filter-label">{{ connectivity }}</span>
          <span class="filter-count">({{ connectivityCounts[connectivity] ?? 0 }})</span>
        </label>
      </div>
    </details>

    <details class="filter-section" open>
      <summary><h3>Source quality</h3></summary>
      <div class="checkbox-group checkbox-group--scroll" aria-label="Verification">
        <label v-for="status in verificationStatuses" :key="status" class="filter-checkbox">
          <input
            type="checkbox"
            :checked="filters.verificationStatus.includes(status)"
            @change="update(filters, { verificationStatus: toggleFilterValue(filters.verificationStatus, status) })"
          />
          <span class="filter-label">{{ status }}</span>
          <span class="filter-count">({{ verificationCounts[status] ?? 0 }})</span>
        </label>
      </div>
    </details>
  </section>
</template>
