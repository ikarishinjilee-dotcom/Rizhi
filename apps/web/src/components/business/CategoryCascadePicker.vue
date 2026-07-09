<template>
  <div class="category-cascade">
    <div class="category-cascade__head">
      <span>{{ title }}</span>
      <strong v-if="selectedPath">{{ selectedPath }}</strong>
    </div>

    <div class="category-cascade__grid">
      <button
        v-for="category in parentCategories"
        :key="category.id"
        type="button"
        class="category-option"
        :class="{ active: selectedParentId === category.id }"
        @click="selectParent(category.id)"
      >
        <CategoryIcon :category="category" />
        <span>{{ category.name }}</span>
      </button>
    </div>

    <div v-if="childCategories.length" class="category-cascade__children">
      <span>子分类</span>
      <div class="category-cascade__grid compact">
        <button
          v-for="category in childCategories"
          :key="category.id"
          type="button"
          class="category-option child"
          :class="{ active: selectedChildId === category.id }"
          @click="selectChild(category.id)"
        >
          <CategoryIcon :category="category" />
          <span>{{ category.name }}</span>
        </button>
      </div>
    </div>

    <p v-if="!parentCategories.length" class="category-cascade__empty">暂无可用分类，请先到管理中心维护分类。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import CategoryIcon from "@/components/business/CategoryIcon.vue";
import { categoryHasScope } from "@/domain/categoryScopes";
import type { CategoryRecord, CategoryScope } from "@/domain/models";
import { useAppDataStore } from "@/stores/appDataStore";

const props = withDefaults(defineProps<{
  scope: CategoryScope;
  categoryId: string | number | null;
  subCategoryId?: string | number | null;
  title?: string;
  selectionMode?: "split" | "final";
}>(), {
  subCategoryId: null,
  title: "分类",
  selectionMode: "split",
});

const emit = defineEmits<{
  "update:categoryId": [value: string | number | null];
  "update:subCategoryId": [value: string | number | null];
}>();

const store = useAppDataStore();

const categories = computed(() => store.categories
  .filter((category) => categoryHasScope(category, props.scope) && category.enabled !== false && !category.deletedAt)
  .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, "zh-CN")));

const categoryMap = computed(() => new Map(categories.value.map((category) => [category.id, category])));
const currentCategory = computed(() => props.categoryId ? categoryMap.value.get(String(props.categoryId)) : undefined);
const selectedParentId = computed(() => {
  if (props.selectionMode === "final" && currentCategory.value?.parentId) return currentCategory.value.parentId;
  return props.categoryId ? String(props.categoryId) : parentCategories.value[0]?.id ?? "";
});
const selectedChildId = computed(() => props.selectionMode === "final"
  ? currentCategory.value?.parentId ? currentCategory.value.id : ""
  : props.subCategoryId ? String(props.subCategoryId) : "");
const parentCategories = computed(() => categories.value.filter((category) => !category.parentId));
const childCategories = computed(() => categories.value.filter((category) => category.parentId === selectedParentId.value));
const selectedPath = computed(() => {
  const parent = selectedParentId.value ? categoryMap.value.get(selectedParentId.value) : undefined;
  const child = selectedChildId.value ? categoryMap.value.get(selectedChildId.value) : undefined;
  if (parent && child) return `${parent.name} / ${child.name}`;
  return parent?.name ?? "";
});

function selectParent(id: string) {
  emit("update:categoryId", id);
  emit("update:subCategoryId", null);
}

function selectChild(id: string) {
  if (props.selectionMode === "final") {
    emit("update:categoryId", id);
    emit("update:subCategoryId", null);
    return;
  }
  emit("update:subCategoryId", id);
}
</script>

<style scoped>
.category-cascade {
  display: grid;
  gap: 12px;
}

.category-cascade__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.category-cascade__head span,
.category-cascade__children > span {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.category-cascade__head strong {
  color: var(--color-primary);
  font-size: 12px;
}

.category-cascade__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 10px;
}

.category-cascade__grid.compact {
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
}

.category-option {
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  color: var(--color-text-primary);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  text-align: left;
  transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, color .16s ease;
}

.category-option:hover {
  border-color: var(--color-primary);
}

.category-option.active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

.category-option.child {
  min-height: 40px;
}

.category-option span {
  min-width: 0;
  line-height: 1.25;
}

.category-cascade__children {
  display: grid;
  gap: 8px;
  padding-top: 2px;
}

.category-cascade__empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
