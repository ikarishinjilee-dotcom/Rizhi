<template>
  <div class="settings-overview">
    <RouterLink
      v-for="item in items"
      :key="item.path"
      :to="item.path"
      class="overview-card"
    >
      <span class="overview-card__icon"><component :is="item.icon" :size="20" /></span>
      <div>
        <h2>{{ item.label }}</h2>
        <p>{{ item.description }}</p>
      </div>
      <span class="overview-card__meta">{{ item.meta }}</span>
      <ChevronRight :size="18" />
    </RouterLink>
  </div>
</template>

<style scoped>
.settings-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.overview-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto 18px;
  gap: var(--space-3);
  align-items: center;
  min-height: 116px;
  padding: var(--space-5);
  color: var(--color-text-primary);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.overview-card:hover {
  border-color: #a9c9ff;
  box-shadow: 0 12px 28px rgba(22, 119, 255, 0.1);
  transform: translateY(-2px);
}

.overview-card__icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-lg);
}

.overview-card h2,
.overview-card p {
  margin: 0;
}

.overview-card h2 {
  font-size: 15px;
}

.overview-card p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.overview-card__meta {
  color: var(--color-text-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .settings-overview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .overview-card {
    grid-template-columns: 44px minmax(0, 1fr) 18px;
  }

  .overview-card__meta {
    display: none;
  }
}
</style>

<script setup lang="ts">
import type { Component } from "vue";
import { RouterLink } from "vue-router";
import { ChevronRight } from "@lucide/vue";

type SettingsOverviewItem = {
  label: string;
  path: string;
  icon: Component;
  description: string;
  meta: string;
};

defineProps<{
  items: SettingsOverviewItem[];
}>();
</script>
