<template>
  <span class="category-icon" :style="iconStyle">
    <img v-if="imageUrl" :src="imageUrl" :alt="imageAlt" />
    <component v-else-if="iconComponent" :is="iconComponent" :size="innerSize" />
    <span v-else>{{ fallbackText }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { transactionCategoryIcon } from "@/components/business/categoryIcons";
import type { CategoryRecord } from "@/domain/models";

const props = withDefaults(defineProps<{
  category?: Pick<CategoryRecord, "name" | "icon" | "iconUrl" | "color"> | null;
  size?: number;
}>(), {
  category: null,
  size: 24,
});

const iconComponent = computed(() => props.category?.icon ? transactionCategoryIcon(props.category.icon) : null);
const innerSize = computed(() => Math.max(14, props.size - 8));
const fallbackText = computed(() => props.category?.name?.trim().slice(0, 1) || "?");
const imageUrl = computed(() => props.category?.iconUrl || "");
const imageAlt = computed(() => props.category?.name || "分类图标");
const iconStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  color: props.category?.color || "var(--color-primary)",
}));
</script>

<style scoped>
.category-icon {
  display: inline-grid;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.category-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
