<template>
  <div v-if="showFilterPanel" class="ledger-filter-panel">
    <RSelect :model-value="typeFilter" :options="typeOptions" placeholder="全部类型" @update:model-value="$emit('update:type-filter', $event)" />
    <RSelect :model-value="categoryFilter" :options="categoryOptions" placeholder="全部一级分类" @update:model-value="$emit('update:category-filter', $event)" />
    <RSelect :model-value="subCategoryFilter" :options="subCategoryFilterOptions" placeholder="全部子分类" @update:model-value="$emit('update:sub-category-filter', $event)" />
    <RSelect :model-value="accountFilter" :options="accountOptions" placeholder="全部账户" @update:model-value="$emit('update:account-filter', $event)" />
    <div class="ledger-filter-panel__actions">
      <RButton variant="danger" @click="$emit('create-entry', 'expense')">支出</RButton>
      <RButton @click="$emit('create-entry', 'income')">收入</RButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import RButton from "@/components/ui/RButton.vue";
import RSelect from "@/components/ui/RSelect.vue";

type Option = { label: string; value: string | number };

defineProps<{
  showFilterPanel: boolean;
  typeFilter: string | number | null;
  categoryFilter: string | number | null;
  subCategoryFilter: string | number | null;
  accountFilter: string | number | null;
  typeOptions: Option[];
  categoryOptions: Option[];
  subCategoryFilterOptions: Option[];
  accountOptions: Option[];
}>();

defineEmits<{
  "update:type-filter": [value: string | number | null];
  "update:category-filter": [value: string | number | null];
  "update:sub-category-filter": [value: string | number | null];
  "update:account-filter": [value: string | number | null];
  "create-entry": [type: "expense" | "income"];
}>();
</script>
