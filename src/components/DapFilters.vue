<script setup lang="ts">
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-vue-next';
import type { DapFilters } from '../types/dap';
import MultiSelectFilter from './MultiSelectFilter.vue';

defineProps<{
  filters: DapFilters;
  brands: string[];
  statuses: string[];
  verificationStatuses: string[];
}>();

const emit = defineEmits<{
  'update:filters': [filters: DapFilters];
}>();

function update(filters: DapFilters, patch: Partial<DapFilters>) {
  emit('update:filters', { ...filters, ...patch });
}

function advancedCount(filters: DapFilters): number {
  return [
    filters.status.length,
    filters.verificationStatus.length,
    filters.outputPorts.length,
    filters.platform.length,
    filters.connectivity.length,
    filters.yearMin || filters.yearMax ? 1 : 0,
    filters.has44mmOnly ? 1 : 0,
    filters.androidOnly ? 1 : 0,
  ].reduce((total, value) => total + (typeof value === 'number' ? value : Number(Boolean(value))), 0);
}
</script>

<template>
  <section class="filters" aria-label="DAP filters">
    <div class="filters__primary">
      <label class="field field--search">
        <span class="sr-only">Search</span>
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

      <div class="field">
        <span class="sr-only">Brand</span>
        <MultiSelectFilter
          label="Brand"
          all-label="All brands"
          :values="filters.brand"
          :options="brands.map((brand) => ({ value: brand, label: brand }))"
          @change="update(filters, { brand: $event })"
        />
      </div>

      <fieldset class="price-filter">
        <legend class="sr-only">Price range</legend>
        <label class="field">
          <span class="sr-only">Minimum price</span>
          <input
            :value="filters.priceMin"
            type="number"
            min="0"
            inputmode="numeric"
            placeholder="Min $"
            @input="update(filters, { priceMin: ($event.target as HTMLInputElement).value })"
          />
        </label>
        <label class="field">
          <span class="sr-only">Maximum price</span>
          <input
            :value="filters.priceMax"
            type="number"
            min="0"
            inputmode="numeric"
            placeholder="Max $"
            @input="update(filters, { priceMax: ($event.target as HTMLInputElement).value })"
          />
        </label>
      </fieldset>
    </div>

    <details class="advanced-filters">
      <summary class="advanced-filters__summary">
        <span>
          <SlidersHorizontal :size="16" aria-hidden="true" />
          Advanced filters
          <strong v-if="advancedCount(filters)">{{ advancedCount(filters) }}</strong>
        </span>
        <ChevronDown :size="17" aria-hidden="true" />
      </summary>

      <div class="advanced-filters__grid">
        <div class="field">
          <span class="sr-only">Status</span>
          <MultiSelectFilter
            label="Status"
            all-label="All statuses"
            :values="filters.status"
            :options="statuses.map((status) => ({ value: status, label: status }))"
            @change="update(filters, { status: $event })"
          />
        </div>

        <div class="field">
          <span class="sr-only">Verification</span>
          <MultiSelectFilter
            label="Verification"
            all-label="All verification"
            :values="filters.verificationStatus"
            :options="verificationStatuses.map((status) => ({ value: status, label: status }))"
            @change="update(filters, { verificationStatus: $event })"
          />
        </div>

        <div class="field">
          <span class="sr-only">Output ports</span>
          <MultiSelectFilter
            label="Output ports"
            all-label="Any ports"
            :values="filters.outputPorts"
            :options="[
              { value: '2.5mm', label: '2.5mm' },
              { value: '3.5mm', label: '3.5mm' },
              { value: '4.4mm', label: '4.4mm' },
              { value: '6.35mm', label: '6.35mm' },
            ]"
            @change="update(filters, { outputPorts: $event })"
          />
        </div>

        <div class="field">
          <span class="sr-only">Platform</span>
          <MultiSelectFilter
            label="Platform"
            all-label="Any platform"
            :values="filters.platform"
            :options="[
              { value: 'Android', label: 'Android' },
              { value: 'Non-Android', label: 'Non-Android' },
            ]"
            @change="update(filters, { platform: $event })"
          />
        </div>

        <div class="field">
          <span class="sr-only">Connectivity</span>
          <MultiSelectFilter
            label="Connectivity"
            all-label="Any connectivity"
            :values="filters.connectivity"
            :options="[
              { value: 'Bluetooth', label: 'Bluetooth' },
              { value: 'Wi-Fi', label: 'Wi-Fi' },
              { value: 'Cellular', label: 'Cellular' },
              { value: '4G', label: '4G' },
              { value: '5G', label: '5G' },
            ]"
            @change="update(filters, { connectivity: $event })"
          />
        </div>

        <fieldset class="price-filter">
          <legend class="sr-only">Release year range</legend>
          <label class="field">
            <span class="sr-only">Minimum release year</span>
            <input
              :value="filters.yearMin"
              type="number"
              min="2000"
              inputmode="numeric"
              placeholder="Year from"
              @input="update(filters, { yearMin: ($event.target as HTMLInputElement).value })"
            />
          </label>
          <label class="field">
            <span class="sr-only">Maximum release year</span>
            <input
              :value="filters.yearMax"
              type="number"
              min="2000"
              inputmode="numeric"
              placeholder="Year to"
              @input="update(filters, { yearMax: ($event.target as HTMLInputElement).value })"
            />
          </label>
        </fieldset>
      </div>
    </details>
  </section>
</template>
