<template>
  <div class="ledger-content-grid__left">
    <LedgerDailyChartPanel
      :ledger-view="ledgerView"
      :chart-metric="chartMetric"
      :daily-chart-option="dailyChartOption"
      @update:chart-metric="$emit('update:chart-metric', $event)"
      @chart-click="$emit('chart-click', $event)"
    />
    <LedgerCategoryStatisticsPanel
      :category-metric="categoryMetric"
      :category-summary="categorySummary"
      :category-summary-total="categorySummaryTotal"
      :hovered-category="hoveredCategory"
      :category-segment-path="categorySegmentPath"
      :format-amount="formatAmount"
      @update:category-metric="$emit('update:category-metric', $event)"
      @donut-move="$emit('donut-move', $event)"
      @clear-category-hover="$emit('clear-category-hover')"
    />
  </div>
</template>

<script setup lang="ts">
import LedgerDailyChartPanel from "@/components/business/LedgerDailyChartPanel.vue";
import LedgerCategoryStatisticsPanel, { type LedgerCategorySummaryItem } from "@/components/business/LedgerCategoryStatisticsPanel.vue";

defineProps<{
  ledgerView: "month" | "year";
  chartMetric: "expense" | "income" | "all";
  categoryMetric: "expense" | "income";
  dailyChartOption: Record<string, unknown>;
  categorySummary: LedgerCategorySummaryItem[];
  categorySummaryTotal: number;
  hoveredCategory?: LedgerCategorySummaryItem;
  categorySegmentPath: (index: number) => string;
  formatAmount: (value: number) => string;
}>();

defineEmits<{
  "update:chart-metric": [value: "expense" | "income" | "all"];
  "update:category-metric": [value: "expense" | "income"];
  "chart-click": [params: { dataIndex?: number }];
  "donut-move": [event: MouseEvent];
  "clear-category-hover": [];
}>();
</script>
