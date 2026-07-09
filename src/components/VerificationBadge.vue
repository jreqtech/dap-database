<script setup lang="ts">
import { computed } from 'vue';
import { getVerificationBadgeMeta } from '../utils/dapDisplay';

const props = defineProps<{
  status: string;
}>();

const meta = computed(() => getVerificationBadgeMeta(props.status || ''));
</script>

<template>
  <span class="badge verification-badge" :class="meta.className" :title="meta.title">{{ meta.label }}</span>
</template>
