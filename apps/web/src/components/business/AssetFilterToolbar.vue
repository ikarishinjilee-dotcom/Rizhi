<template>
  <div class="asset-toolbar">
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.value" type="button" :class="{ active: activeTab === tab.value }" @click="$emit('select-tab', tab.value)">
        {{ tab.label }}
      </button>
    </div>
    <div class="asset-toolbar__right">
      <RSelect :model-value="sortBy" :options="sortOptions" placeholder="默认排序" @update:model-value="$emit('update:sort-by', $event)" />
      <div class="view-switch">
        <button :class="{ active: viewMode === 'card' }" type="button" aria-label="卡片视图" @click="$emit('update:view-mode', 'card')"><Grid2X2 :size="17" /></button>
        <button :class="{ active: viewMode === 'table' }" type="button" aria-label="列表视图" @click="$emit('update:view-mode', 'table')"><List :size="18" /></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Grid2X2, List } from "@lucide/vue";
import RSelect from "@/components/ui/RSelect.vue";

defineProps<{
  tabs: Array<{ label: string; value: string | number }>;
  activeTab: string | number;
  sortBy: string | number | null;
  sortOptions: Array<{ label: string; value: string | number }>;
  viewMode: "card" | "table";
}>();

defineEmits<{
  "select-tab": [value: string | number];
  "update:sort-by": [value: string | number | null];
  "update:view-mode": [value: "card" | "table"];
}>();
</script>

<style>
.asset-toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: center; }
.tabs, .view-switch, .asset-toolbar__right { display: flex; align-items: center; gap: 10px; }
.tabs { flex-wrap: wrap; }
.tabs button { min-height: 38px; padding: 0 16px; color: var(--color-text-secondary); background: rgba(255, 255, 255, 0.82); border: 1px solid var(--color-border-soft); border-radius: var(--radius-pill); cursor: pointer; font-weight: 700; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04); }
.tabs button.active { color: #fff; background: var(--gradient-primary); border-color: transparent; box-shadow: 0 12px 26px rgba(38, 116, 255, 0.22); }
.asset-toolbar__right { justify-self: end; }
.asset-toolbar__right .r-select { width: 144px; }
.view-switch { gap: 4px; padding: 4px; background: rgba(255, 255, 255, 0.82); border: 1px solid var(--color-border-soft); border-radius: 14px; }
.view-switch button { display: grid; width: 32px; height: 32px; place-items: center; color: var(--color-text-secondary); background: transparent; border: 0; border-radius: 10px; cursor: pointer; }
.view-switch button.active { color: var(--color-primary); background: var(--color-primary-light); }
</style>
