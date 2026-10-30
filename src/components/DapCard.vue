<script setup lang="ts">
import type { Dap } from '../types/dap';
import { formatCompactPrice, formatValue, hasValue } from '../utils/formatters';
import { getStatusBadgeMeta, isAndroidBased } from '../utils/dapDisplay';
import { dapDetailHash } from '../utils/slugs';
import { formatStorageSummary } from '../utils/storageDisplay';
import DapPhoto from './DapPhoto.vue';

defineProps<{
  dap: Dap;
}>();

const shouldShowStatus = (status: string) => status.trim().toLowerCase() !== 'active';
</script>

<template>
  <article class="dap-card">
    <a
      class="dap-card__button"
      :href="dapDetailHash(dap)"
    >
      <span class="dap-card__media">
        <DapPhoto :dap="dap" size="card" />
        <span v-if="hasValue(dap.releaseYear) || shouldShowStatus(dap.status)" class="dap-card__media-meta">
          <span v-if="hasValue(dap.releaseYear)" class="media-pill">{{ formatValue(dap.releaseYear) }}</span>
          <span
            v-if="shouldShowStatus(dap.status)"
            class="media-pill media-pill--status"
            :class="getStatusBadgeMeta(dap.status).className"
            :title="getStatusBadgeMeta(dap.status).title"
          >
            {{ getStatusBadgeMeta(dap.status).label }}
          </span>
        </span>
      </span>

      <span class="dap-card__body">
        <span class="dap-card__title-line">
          <span class="brand" :title="dap.brand">{{ dap.brand }}</span>
          <span class="dap-card__title">{{ dap.model }}</span>
          <span class="variant-text">{{ hasValue(dap.variant) ? dap.variant : '' }}</span>
          <span v-if="hasValue(dap.msrpUsd)" class="catalog-price">{{ formatCompactPrice(dap.msrpUsd) }}</span>
        </span>

        <span class="dap-card__storage">
          <span class="badge badge-neutral">{{ isAndroidBased(dap) ? 'Android' : 'Non-Android' }}</span>
          <span v-if="formatStorageSummary(dap)" class="dap-card__storage-text">{{ formatStorageSummary(dap) }}</span>
        </span>
      </span>
    </a>
  </article>
</template>
