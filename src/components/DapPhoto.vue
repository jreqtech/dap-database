<script setup lang="ts">
import { computed } from 'vue';
import dapPlaceholder from '../assets/images/dap-placeholder.png';
import type { Dap } from '../types/dap';
import { imageAltForDap, imageUrlForDap } from '../utils/dapDisplay';

const props = defineProps<{
  dap: Dap;
  size?: 'thumb' | 'card' | 'large';
}>();

const imageUrl = computed(() => imageUrlForDap(props.dap));
const imageAlt = computed(() => imageAltForDap(props.dap, props.dap.images[0]));
const placeholderAlt = computed(() => `${props.dap.brand} ${props.dap.model} placeholder image`);
</script>

<template>
  <div class="dap-photo" :class="[`dap-photo--${size ?? 'card'}`, { 'dap-photo--missing': !imageUrl }]">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="imageAlt"
      loading="lazy"
    />
    <div v-else class="dap-photo__placeholder">
      <img class="dap-photo__placeholder-image" :src="dapPlaceholder" :alt="placeholderAlt" loading="lazy" />
    </div>
  </div>
</template>
