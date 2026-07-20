<template>
  <section class="ledger-surface ledger-category-panel">
    <div class="ledger-section-title"><span>分类统计</span><div class="ledger-chart-tabs"><button :class="{ active: categoryMetric === 'expense' }" type="button" @click="$emit('update:category-metric', 'expense')">支出</button><button :class="{ active: categoryMetric === 'income' }" type="button" @click="$emit('update:category-metric', 'income')">收入</button></div></div>
    <div v-if="categorySummary.length" class="ledger-category-summary">
      <div class="ledger-donut" @mousemove="$emit('donut-move', $event)" @mouseleave="$emit('clear-category-hover')"><svg viewBox="0 0 152 152" aria-hidden="true"><path v-for="(item, index) in categorySummary" :key="item.key" :d="categorySegmentPath(index)" :fill="item.color" /></svg><span>总计<strong>{{ formatAmount(categorySummaryTotal) }}</strong></span><div v-if="hoveredCategory" class="ledger-donut-tooltip"><i :style="{ background: hoveredCategory.color }"></i><strong>{{ hoveredCategory.name }}</strong><b>{{ formatAmount(hoveredCategory.total) }}</b><em>{{ hoveredCategory.percent }}%</em></div></div>
      <div class="ledger-category-summary__list">
        <div v-for="item in categorySummary" :key="item.key">
          <span class="ledger-category-name"><img v-if="item.iconUrl" :src="item.iconUrl" alt="" /><i v-else :style="{ background: item.color }">{{ item.icon || item.name.slice(0, 1) }}</i>{{ item.name }}</span><strong>{{ formatAmount(item.total) }}</strong><em>{{ item.percent }}%</em>
          <b><i :style="{ width: `${item.percent}%`, background: item.color }"></i></b>
        </div>
      </div>
    </div>
    <REmptyState v-else title="暂无分类数据" description="选择其他月份或新增一笔记账。" />
  </section>
</template>

<script setup lang="ts">
import REmptyState from "@/components/ui/REmptyState.vue";

export type LedgerCategorySummaryItem = { key: string; name: string; total: number; icon?: string; iconUrl?: string; percent: number; color: string };

defineProps<{
  categoryMetric: "expense" | "income";
  categorySummary: LedgerCategorySummaryItem[];
  categorySummaryTotal: number;
  hoveredCategory?: LedgerCategorySummaryItem;
  categorySegmentPath: (index: number) => string;
  formatAmount: (value: number) => string;
}>();

defineEmits<{
  "update:category-metric": [value: "expense" | "income"];
  "donut-move": [event: MouseEvent];
  "clear-category-hover": [];
}>();
</script>
