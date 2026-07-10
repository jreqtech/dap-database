<script setup lang="ts">
import type { Dap } from '../types/dap';
import { formatPrice, formatValue, hasValue } from '../utils/formatters';
import { getStatusBadgeMeta, getVerificationBadgeMeta, isAndroidBased } from '../utils/dapDisplay';
import DapPhoto from './DapPhoto.vue';

defineProps<{
  dap: Dap;
}>();

defineEmits<{
  details: [dap: Dap];
}>();

const isDiscontinued = (status: string) => status.toLowerCase().includes('discontinued');
</script>

<template>
  <article class="dap-card">
    <button
      class="dap-card__button"
      type="button"
      :aria-label="`Open details for ${dap.brand} ${dap.model}`"
      @click="$emit('details', dap)"
    >
      <span class="dap-card__media">
        <DapPhoto :dap="dap" size="card" />
        <span v-if="hasValue(dap.releaseYear) || isDiscontinued(dap.status)" class="dap-card__media-meta">
          <span v-if="hasValue(dap.releaseYear)" class="media-pill">{{ formatValue(dap.releaseYear) }}</span>
          <span
            v-if="isDiscontinued(dap.status)"
            class="media-pill media-pill--status"
            :class="getStatusBadgeMeta(dap.status).className"
            :title="getStatusBadgeMeta(dap.status).title"
          >
            {{ getStatusBadgeMeta(dap.status).label }}
          </span>
        </span>
      </span>

      <span class="dap-card__body">
        <span class="dap-card__heading">
          <span class="dap-card__title-line">
            <span class="brand">{{ dap.brand }}</span>
            <span class="dap-card__title">{{ dap.model }}</span>
            <span v-if="hasValue(dap.variant)" class="variant-text">{{ dap.variant }}</span>
          </span>
          <span v-if="hasValue(dap.msrpUsd)" class="catalog-price">{{ formatPrice(dap.msrpUsd) }}</span>
        </span>

        <span class="chip-row catalog-badges">
          <span class="badge badge-neutral">{{ isAndroidBased(dap) ? 'Android' : 'Non-Android' }}</span>
          <span v-if="dap.has44mm" class="badge badge-neutral">4.4mm</span>
          <span
            class="badge"
            :class="getStatusBadgeMeta(dap.status).className"
            :title="getStatusBadgeMeta(dap.status).title"
          >
            {{ getStatusBadgeMeta(dap.status).label }}
          </span>
          <span
            class="badge"
            :class="getVerificationBadgeMeta(dap.verificationStatus).className"
            :title="getVerificationBadgeMeta(dap.verificationStatus).title"
          >
            {{ getVerificationBadgeMeta(dap.verificationStatus).label }}
          </span>
        </span>
      </span>
    </button>
  </article>
</template>
