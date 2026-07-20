<template>
  <section class="category-manager-grid">
    <header class="category-manager-grid__toolbar">
      <RInput :model-value="query" placeholder="搜索分类名称" @update:model-value="$emit('update:query', $event)" />
      <div v-if="statusOptions.length" class="category-manager-grid__status" aria-label="分类状态">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          :class="{ active: status === option.value }"
          @click="$emit('update:status', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="category-manager-grid__filters"><slot name="filters" /></div>
      <div class="category-manager-grid__actions">
        <slot name="actions" />
        <RButton v-if="createLabel" @click="$emit('create')">{{ createLabel }}</RButton>
      </div>
    </header>

    <div class="category-manager-grid__cards">
      <slot v-for="category in items" name="card" :key="category.id" :category="category" />
    </div>

    <p v-if="!items.length" class="category-manager-grid__empty">{{ emptyText }}</p>
  </section>
</template>

<script setup lang="ts">
import type { CategoryRecord } from "@/domain/models";
import RButton from "@/components/ui/RButton.vue";
import RInput from "@/components/ui/RInput.vue";

const props = withDefaults(defineProps<{
  items: CategoryRecord[];
  query: string;
  status: string;
  statusOptions?: Array<{ label: string; value: string }>;
  createLabel?: string;
  emptyText?: string;
}>(), {
  statusOptions: () => [],
  createLabel: "",
  emptyText: "暂无符合条件的分类。",
});

const emit = defineEmits<{
  "update:query": [value: string];
  "update:status": [value: string];
  create: [];
}>();
</script>

<style scoped>
.category-manager-grid { display: grid; gap: 18px; }
.category-manager-grid__toolbar { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #fff; border: 1px solid var(--color-border); border-radius: 16px; }
.category-manager-grid__toolbar > :first-child { flex: 1 1 220px; }
.category-manager-grid__status { display: flex; overflow: hidden; background: var(--color-bg-hover); border: 1px solid var(--color-border); border-radius: 10px; }
.category-manager-grid__status button { min-width: 58px; height: 34px; padding: 0 12px; color: var(--color-text-secondary); background: transparent; border: 0; cursor: pointer; font-size: 13px; }
.category-manager-grid__status button.active { color: var(--color-primary); background: #fff; box-shadow: 0 2px 6px rgba(15, 23, 42, .08); font-weight: 800; }
.category-manager-grid__filters { flex: 0 0 168px; min-width: 0; }
.category-manager-grid__filters :deep(.r-select) { width: 168px; }
.category-manager-grid__actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.category-manager-grid__cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
.category-manager-grid__empty { margin: 0; padding: 42px 18px; color: var(--color-text-tertiary); text-align: center; background: #fff; border: 1px dashed var(--color-border); border-radius: 16px; }
@media (max-width: 860px) { .category-manager-grid__toolbar { flex-wrap: wrap; } .category-manager-grid__actions { width: 100%; margin-left: 0; justify-content: flex-end; } }
</style>
