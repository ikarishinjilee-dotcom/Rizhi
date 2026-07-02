<template>
  <header class="page-header">
    <div>
      <div v-if="$slots.eyebrow || eyebrow" class="page-header__eyebrow">
        <slot name="eyebrow">{{ eyebrow }}</slot>
      </div>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="page-header__actions">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  eyebrow?: string;
}>();
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}

.page-header__eyebrow {
  margin-bottom: var(--space-1);
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
}

.page-header h1 {
  margin: 0;
  font-size: var(--font-section-title);
  line-height: 24px;
}

.page-header p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
}

.page-header__actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
</style>
