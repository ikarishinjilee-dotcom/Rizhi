<template>
  <section class="ledger-surface ledger-chart-panel">
    <div class="ledger-section-title"><span>{{ ledgerView === 'year' ? '月收支统计' : '日收支统计' }}</span><div class="ledger-chart-tabs"><button :class="{ active: chartMetric === 'expense' }" @click="$emit('update:chart-metric', 'expense')">支出</button><button :class="{ active: chartMetric === 'income' }" @click="$emit('update:chart-metric', 'income')">收入</button><button :class="{ active: chartMetric === 'all' }" @click="$emit('update:chart-metric', 'all')">全部</button></div></div>
    <VChart class="ledger-echart" :option="dailyChartOption" autoresize @click="$emit('chart-click', $event)" />
  </section>
</template>

<script setup lang="ts">
import VChart from "vue-echarts";

defineProps<{
  ledgerView: "month" | "year";
  chartMetric: "expense" | "income" | "all";
  dailyChartOption: Record<string, unknown>;
}>();

defineEmits<{
  "update:chart-metric": [value: "expense" | "income" | "all"];
  "chart-click": [params: { dataIndex?: number }];
}>();
</script>
