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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
</style>
