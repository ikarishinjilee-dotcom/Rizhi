<template>
  <div class="empty-state" :class="{ 'empty-state--compact': compact }">
    <div class="empty-state__icon">{{ icon }}</div>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  description?: string;
  icon?: string;
  compact?: boolean;
}>(), {
  icon: "□",
  compact: false,
});
</script>

<style scoped>
.empty-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  gap: var(--space-2);
  color: var(--color-text-tertiary);
  text-align: center;
}

.empty-state__icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-lg);
}

.empty-state h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-card-title);
}

.empty-state p {
  margin: 0;
  font-size: var(--font-caption);
}

.empty-state--compact {
  min-height: 128px;
  padding: var(--space-4);
}
</style>
