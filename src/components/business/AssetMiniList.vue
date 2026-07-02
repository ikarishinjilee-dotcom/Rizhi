<template>
  <RCard>
    <section class="mini-list">
      <header class="mini-list__head">
        <h3>{{ title }}</h3>
      </header>
      <div class="mini-list__rows">
        <button v-for="item in items" :key="item.id ?? item.name" class="mini-list__row" type="button" @click="emit('select', item)">
          <div class="mini-list__icon">{{ item.icon ?? "□" }}</div>
          <div class="mini-list__main">
            <div class="mini-list__name">{{ item.name }}</div>
            <div class="mini-list__meta">{{ item.meta }}</div>
          </div>
          <div class="mini-list__value" :class="item.tone">{{ item.value }}</div>
        </button>
        <div v-if="!items.length" class="mini-list__empty">暂无数据</div>
      </div>
    </section>
  </RCard>
</template>

<script setup lang="ts">
import RCard from "@/components/ui/RCard.vue";

type MiniListItem = {
  id?: string;
  name: string;
  meta: string;
  value: string;
  tone?: "success" | "danger";
  icon?: string;
};

defineProps<{
  title: string;
  items: MiniListItem[];
}>();

const emit = defineEmits<{
  select: [item: MiniListItem];
}>();
</script>

<style scoped>
.mini-list {
  height: 100%;
  padding: var(--space-4);
}

.mini-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.mini-list__head h3 {
  margin: 0;
  font-size: var(--font-card-title);
  font-weight: 700;
}

.mini-list__rows {
  display: grid;
  gap: var(--space-3);
}

.mini-list__row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: 0;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background .16s ease, transform .16s ease;
}

.mini-list__row:hover {
  background: var(--color-bg-hover);
  transform: translateX(2px);
}

.mini-list__icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  font-size: 12px;
}

.mini-list__name {
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: var(--font-caption);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-list__meta {
  margin-top: 2px;
  color: var(--color-text-tertiary);
  font-size: 11px;
}

.mini-list__value {
  color: var(--color-text-primary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.mini-list__value.success {
  color: var(--color-success);
}

.mini-list__value.danger {
  color: var(--color-danger);
}

.mini-list__empty {
  display: grid;
  min-height: 112px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-caption);
}
</style>
