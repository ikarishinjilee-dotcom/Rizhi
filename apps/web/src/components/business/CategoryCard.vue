<template>
  <article class="category-card" :class="{ active }">
    <div class="category-card__tools">
      <slot name="tools">
        <template v-if="managementActions">
          <button type="button" aria-label="编辑分类" title="编辑" @click="$emit('edit', category)"><Pencil :size="14" /></button>
          <button type="button" :aria-label="category.enabled === false ? '恢复分类' : '停用分类'" :title="category.enabled === false ? '恢复' : '停用'" @click="$emit('toggle', category)"><Power :size="14" /></button>
          <button type="button" class="danger" aria-label="删除分类" title="删除" @click="$emit('remove', category)"><Trash2 :size="14" /></button>
        </template>
        <template v-else>
          <button v-if="!sortOnly" type="button" class="category-card__more" aria-label="编辑分类" title="编辑" @click="$emit('edit', category)">...</button>
        </template>
      </slot>
    </div>

    <button type="button" class="category-card__main" @click="$emit('edit', category)">
      <span class="item-icon" :style="{ backgroundColor: '#eef4ff' }">
        <img v-if="category.iconUrl" :src="category.iconUrl" alt="" />
        <b v-else>{{ category.icon || category.name.slice(0, 1) }}</b>
      </span>
      <span>
        <strong>{{ category.name }}</strong>
        <small v-if="showSort">排序 {{ category.sort }}</small>
        <small v-if="category.note" class="category-card__note">{{ category.note }}</small>
      </span>
    </button>

    <div v-if="showScopes || category.enabled === false" class="category-card__badges">
      <em v-for="scope in scopesOf(category)" :key="scope" :class="`scope-${scope}`">{{ scopeLabel(scope) }}</em>
      <em v-if="category.enabled === false" class="disabled">已停用</em>
    </div>

    <div v-if="showChildActions" class="category-card__actions">
      <button type="button" @click="$emit('view-children', category)">{{ childActionLabel }}</button>
      <button type="button" @click="$emit('add-child', category)">添加子分类</button>
    </div>

    <div v-if="expanded" class="category-card__children">
      <slot name="children"><p>暂无子分类</p></slot>
    </div>
  </article>
</template>

<script setup lang="ts">
import { Pencil, Power, Trash2 } from "@lucide/vue";
import { categoryScopes } from "@/domain/categoryScopes";
import type { CategoryRecord, CategoryScope } from "@/domain/models";

withDefaults(defineProps<{
  category: CategoryRecord;
  active?: boolean;
  showScopes?: boolean;
  showSort?: boolean;
  showChildActions?: boolean;
  managementActions?: boolean;
  sortOnly?: boolean;
  expanded?: boolean;
  childActionLabel?: string;
}>(), {
  active: false,
  showScopes: true,
  showSort: true,
  showChildActions: false,
  managementActions: false,
  sortOnly: false,
  expanded: false,
  childActionLabel: "查看子分类",
});

defineEmits<{
  edit: [category: CategoryRecord];
  toggle: [category: CategoryRecord];
  remove: [category: CategoryRecord];
  "view-children": [category: CategoryRecord];
  "add-child": [category: CategoryRecord];
}>();

function scopesOf(category: CategoryRecord) {
  return categoryScopes(category);
}

function scopeLabel(scope: CategoryScope) {
  return scope === "asset" ? "资产" : scope === "expense" ? "支出" : "收入";
}
</script>

<style scoped>
.category-card { position: relative; display: grid; min-height: 148px; overflow: hidden; align-content: space-between; background: #fff; border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 14px 34px rgba(15, 23, 42, .055); transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
.category-card:hover, .category-card.active { transform: translateY(-2px); border-color: #9ec5ff; box-shadow: 0 20px 48px rgba(22, 119, 255, .12); }
.category-card__tools { position: absolute; z-index: 1; top: 14px; right: 16px; display: flex; gap: 6px; }
.category-card__tools > button:not(.category-card__more) { width: 28px; height: 28px; display: grid; place-items: center; color: var(--color-primary); background: var(--color-primary-light); border: 1px solid #bbd5ff; border-radius: 8px; cursor: pointer; }
.category-card__tools > button.danger { color: var(--color-danger); background: #fff1f0; border-color: #ffccc7; }
.category-card__main { display: grid; width: 100%; grid-template-columns: 56px minmax(0, 1fr); align-items: center; gap: 16px; padding: 22px 72px 12px 18px; color: var(--color-text-primary); text-align: left; background: transparent; border: 0; cursor: pointer; }
.category-card__main strong { display: block; overflow: hidden; color: var(--color-text-primary); font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
.category-card__main small { display: block; margin-top: 6px; color: var(--color-text-muted); font-size: 12px; }
.category-card__main .category-card__note { margin-top: 3px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.category-card__more { position: absolute; top: 2px; right: 0; color: var(--color-text-secondary); background: transparent; border: 0; cursor: pointer; font-size: 18px; font-weight: 800; }
.item-icon { display: grid; width: 52px; height: 52px; place-items: center; overflow: hidden; color: #fff; border-radius: 12px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18); }
.item-icon img { width: 100%; height: 100%; object-fit: cover; }
.category-card__badges { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 18px 12px 86px; }
.category-card__badges em { padding: 3px 8px; border-radius: 999px; font-size: 12px; font-style: normal; font-weight: 800; }
.scope-asset { color: var(--color-primary); background: var(--color-primary-light); }
.scope-expense { color: #d92d20; background: #fff1f0; }
.scope-income { color: #039855; background: #ecfdf3; }
.category-card__badges .disabled { color: #667085; background: #f2f4f7; }
.category-card__actions { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--color-border); }
.category-card__actions button { height: 42px; color: var(--color-primary); background: #fff; border: 0; cursor: pointer; font-weight: 800; }
.category-card__actions button + button { border-left: 1px solid var(--color-border); }
.category-card__actions button:hover { background: var(--color-primary-light); }
.category-card__children { display: grid; gap: 8px; padding: 12px; background: var(--color-bg-hover); border-top: 1px solid var(--color-border); }
.category-card__children :deep(p) { margin: 0; padding: 8px; color: var(--color-text-tertiary); font-size: 13px; text-align: center; }
</style>
