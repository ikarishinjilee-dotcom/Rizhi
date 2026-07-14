<template>
  <div class="empty-state" :class="{ 'empty-state--compact': compact }">
    <div class="empty-state__icon">
      <CircleDashed v-if="!icon" :size="22" :stroke-width="1.8" aria-hidden="true" />
      <span v-else>{{ icon }}</span>
    </div>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { CircleDashed } from "@lucide/vue";

withDefaults(defineProps<{
  title: string;
  description?: string;
  icon?: string;
  compact?: boolean;
}>(), {
  icon: "",
  compact: false,
});
</script>

<style scoped>
.empty-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  gap: var(--space-3);
  color: var(--color-text-tertiary);
  text-align: center;
}

.empty-state__icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  color: var(--color-primary);
  background: linear-gradient(135deg, #eef5ff, #ffffff);
  border: 1px solid rgba(38, 116, 255, 0.16);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 20px rgba(38, 116, 255, 0.08);
  font-weight: 700;
}

.empty-state h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-card-title);
  line-height: var(--line-card-title);
}

.empty-state p {
  margin: 0;
  font-size: var(--font-caption);
  line-height: var(--line-caption);
}

.empty-state--compact {
  min-height: 128px;
  padding: var(--space-4);
}
</style>
