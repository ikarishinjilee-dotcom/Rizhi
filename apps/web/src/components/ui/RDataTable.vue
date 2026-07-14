<template>
  <n-data-table class="r-data-table" :columns="columns" :data="data" :bordered="false" :single-line="false" />
</template>

<script setup lang="ts">
import { NDataTable, type DataTableColumns } from "naive-ui";

defineProps<{
  columns: DataTableColumns<Record<string, unknown>>;
  data: Record<string, unknown>[];
}>();
</script>

<style scoped>
.r-data-table {
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-card);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.03);
}

.r-data-table:deep(.n-data-table-th) {
  font-size: var(--font-caption);
  font-weight: 700;
}

.r-data-table:deep(.n-data-table-td) {
  height: 52px;
  font-size: var(--font-table);
}
</style>
