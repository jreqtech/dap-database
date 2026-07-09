<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ChevronDown, X } from 'lucide-vue-next';

const props = defineProps<{
  label: string;
  allLabel: string;
  values: string[];
  options: Array<{ value: string; label: string }>;
}>();

const emit = defineEmits<{
  change: [values: string[]];
}>();

const detailsRef = ref<HTMLDetailsElement | null>(null);

function toggle(value: string) {
  const nextValues = props.values.includes(value)
    ? props.values.filter((item) => item !== value)
    : [...props.values, value];
  emit('change', nextValues);
}

function clear() {
  emit('change', []);
}

function closeDropdown() {
  if (detailsRef.value) detailsRef.value.open = false;
}

function handlePointerDown(event: PointerEvent) {
  if (!detailsRef.value?.open) return;
  if (event.target instanceof Node && detailsRef.value.contains(event.target)) return;
  closeDropdown();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeDropdown();
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <details ref="detailsRef" class="multi-select">
    <summary class="multi-select__summary" :aria-label="label" :title="label">
      <span>{{ values.length ? `${values.length} selected` : allLabel }}</span>
      <ChevronDown :size="16" aria-hidden="true" />
    </summary>

    <div class="multi-select__panel">
      <div class="multi-select__header">
        <span>{{ label }}</span>
        <button class="icon-button" type="button" :disabled="values.length === 0" aria-label="Clear selection" @click="clear">
          <X :size="14" aria-hidden="true" />
        </button>
      </div>

      <label v-for="option in options" :key="option.value" class="multi-select__option">
        <input
          type="checkbox"
          :checked="values.includes(option.value)"
          @change="toggle(option.value)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </details>
</template>
