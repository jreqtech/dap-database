<script setup lang="ts">
import { Info, Pin, PinOff } from 'lucide-vue-next';
import type { Dap } from '../types/dap';
import { formatPrice, formatValue, hasValue } from '../utils/formatters';
import { getStatusBadgeMeta } from '../utils/dapDisplay';
import DapPhoto from './DapPhoto.vue';

defineProps<{
  dap: Dap;
  isPinned: boolean;
}>();

defineEmits<{
  details: [dap: Dap];
  pin: [id: string];
}>();

const isDiscontinued = (status: string) => status.toLowerCase().includes('discontinued');
</script>

<template>
  <article class="dap-card" :class="{ 'is-selected': isPinned }">
    <button class="dap-card__media" type="button" @click="$emit('details', dap)">
      <DapPhoto :dap="dap" size="card" />
      <span
        v-if="hasValue(dap.releaseYear) || hasValue(dap.msrpUsd) || isDiscontinued(dap.status)"
        class="dap-card__media-meta"
      >
        <span v-if="hasValue(dap.releaseYear)" class="media-pill">{{ formatValue(dap.releaseYear) }}</span>
        <span v-if="hasValue(dap.msrpUsd)" class="media-pill">{{ formatPrice(dap.msrpUsd) }}</span>
        <span
          v-if="isDiscontinued(dap.status)"
          class="media-pill media-pill--status"
          :class="getStatusBadgeMeta(dap.status).className"
          :title="getStatusBadgeMeta(dap.status).title"
        >
          {{ getStatusBadgeMeta(dap.status).label }}
        </span>
      </span>
    </button>

    <div class="dap-card__body">
      <div class="dap-card__heading">
        <div class="dap-card__title-line">
          <p class="brand">{{ dap.brand }}</p>
          <h2>{{ dap.model }}</h2>
          <p v-if="hasValue(dap.variant)" class="variant-text">{{ dap.variant }}</p>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn btn-primary details-button" type="button" @click="$emit('details', dap)">
          <Info :size="16" aria-hidden="true" />
          <span>Details</span>
        </button>
        <button
          class="btn btn-secondary compare-card-button"
          :class="{ 'is-selected': isPinned }"
          type="button"
          :aria-label="`${isPinned ? 'Remove from comparison' : 'Add to comparison'} ${dap.brand} ${dap.model}`"
          :title="`${isPinned ? 'Remove from comparison' : 'Add to comparison'} ${dap.brand} ${dap.model}`"
          @click="$emit('pin', dap.id)"
        >
          <PinOff v-if="isPinned" :size="15" aria-hidden="true" />
          <Pin v-else :size="15" aria-hidden="true" />
          <span>{{ isPinned ? 'Selected' : 'Compare' }}</span>
        </button>
      </div>
    </div>
  </article>
</template>
