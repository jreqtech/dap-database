<script setup lang="ts">
defineProps<{
  label: string;
  tone?: 'green' | 'blue' | 'amber' | 'red' | 'muted' | 'neutral';
  badgeClass?: string;
  title?: string;
}>();
</script>

<template>
  <span
    class="badge spec-chip"
    :class="badgeClass ?? `badge-${tone ?? 'neutral'} chip--${tone ?? 'neutral'}`"
    :title="title"
  >
    {{ label }}
  </span>
</template>
