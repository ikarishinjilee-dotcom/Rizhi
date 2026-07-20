<template>
  <section class="ledger-overview ledger-surface">
    <div class="ledger-section-title"><span>收支总览</span><small>{{ monthLabel }}</small></div>
    <div class="ledger-overview__grid">
      <article><span>收入</span><strong class="success">{{ formatAmount(monthIncome) }}</strong><i class="ledger-stat-icon income">↗</i></article>
      <article><span>支出</span><strong class="danger">{{ formatAmount(monthExpense) }}</strong><i class="ledger-stat-icon expense">↘</i></article>
      <article><span>结余</span><strong :class="monthNet >= 0 ? 'success' : 'danger'">{{ monthNet >= 0 ? '' : '-' }}{{ formatAmount(monthNet) }}</strong><i class="ledger-stat-icon balance">↔</i></article>
      <article><span>日均支出</span><strong>{{ formatAmount(dailyExpenseAverage) }}</strong><i class="ledger-stat-icon average">◒</i></article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatAmount } from "@/utils/formatters";

defineProps<{
  monthLabel: string;
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  dailyExpenseAverage: number;
}>();
</script>
