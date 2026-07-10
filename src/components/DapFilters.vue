<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import type { DapFilters } from '../types/dap';

defineProps<{
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
  quickFilterCounts: Record<string, number>;
  priceBounds: { min: number; max: number };
  yearBounds: { min: number; max: number };
}>();

const emit = defineEmits<{
  'update:filters': [filters: DapFilters];
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

const outputPorts = ['2.5mm', '3.5mm', '4.4mm', '6.35mm'];
const platforms = ['Android', 'Non-Android'];
const connectivityOptions = ['Bluetooth', 'Wi-Fi', 'Cellular', '4G', '5G'];
</script>

<template>
  <section class="filters" aria-label="DAP filters">
    <div class="filter-section">
      <label class="field field--search">
        <span>Search</span>
        <span class="input-with-icon">
          <Search class="control-icon" :size="16" aria-hidden="true" />
          <input
            :value="filters.search"
            type="search"
            placeholder="Brand, model, DAC, SoC, OS, colors"
            @input="update(filters, { search: ($event.target as HTMLInputElement).value })"
          />
        </span>
      </label>
    </div>

    <div class="filter-section">
      <h3>Brand</h3>
      <div class="checkbox-group checkbox-group--scroll" aria-label="Brand">
        <label v-for="brand in brands" :key="brand" class="filter-checkbox">
          <input
            type="checkbox"
            :checked="filters.brand.includes(brand)"
            @change="update(filters, { brand: toggleFilterValue(filters.brand, brand) })"
          />
          <span class="filter-label">{{ brand }}</span>
          <span class="filter-count">({{ brandCounts[brand] ?? 0 }})</span>
        </label>
      </div>
    </div>

    <div class="filter-section">
      <h3>Price</h3>
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
    </div>

    <div class="filter-section">
      <h3>Status</h3>
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
    </div>

    <div class="filter-section">
      <h3>Year</h3>
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
    </div>

    <div class="filter-section">
      <h3>Audio</h3>
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
    </div>

    <div class="filter-section">
      <h3>Platform</h3>
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
    </div>

    <div class="filter-section">
      <h3>Connectivity</h3>
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
    </div>

    <div class="filter-section">
      <h3>Source quality</h3>
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
    </div>
  </section>
</template>
