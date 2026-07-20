<template>
  <RCard>
    <section class="chart-card">
      <h3>本月收支趋势</h3>
      <div class="chart-card__lines">
        <div class="chart-card__y-axis" aria-hidden="true">
          <span v-for="tick in trendTicks" :key="tick.label" :style="{ top: `${tick.top}%` }">{{ tick.label }}</span>
        </div>
        <svg viewBox="0 0 300 140" role="img" aria-label="本月收支趋势">
          <defs>
            <linearGradient id="dashboard-income-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2f7cff" stop-opacity=".2" /><stop offset="1" stop-color="#2f7cff" stop-opacity="0" /></linearGradient>
            <linearGradient id="dashboard-expense-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f05268" stop-opacity=".16" /><stop offset="1" stop-color="#f05268" stop-opacity="0" /></linearGradient>
          </defs>
          <path v-if="incomeTrendPath" class="trend-area income-area" :d="`${incomeTrendPath} L 290 126 L 10 126 Z`" />
          <path v-if="expenseTrendPath" class="trend-area expense-area" :d="`${expenseTrendPath} L 290 126 L 10 126 Z`" />
          <g class="chart-grid" aria-hidden="true"><line v-for="tick in trendTicks" :key="tick.label" x1="0" x2="300" :y1="tick.y" :y2="tick.y" /></g>
          <path v-if="incomeTrendPath" class="trend-line" :d="incomeTrendPath" />
          <path v-if="expenseTrendPath" class="trend-line expense" :d="expenseTrendPath" />
          <g v-for="point in trendPointMarkers" :key="`${point.type}-${point.index}`" @mouseenter="hoveredTrendPoint = point" @mouseleave="hoveredTrendPoint = null"><circle class="trend-hit-area" :cx="point.x" :cy="point.y" r="9" /></g>
        </svg>
        <div v-if="hoveredTrendPoint" class="chart-card__tooltip"><span>{{ hoveredTrendPoint.day }}日 · {{ hoveredTrendPoint.type === 'income' ? '收入' : '支出' }}</span><strong>{{ formatTrendAmount(hoveredTrendPoint.value) }}</strong></div>
        <div v-if="!incomeTrendPoints && !expenseTrendPoints" class="chart-empty">本月暂无收支趋势</div>
      </div>
      <div class="chart-card__legend"><RTag tone="info">收入</RTag><RTag tone="danger">支出</RTag></div>
    </section>
  </RCard>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RCard from "@/components/ui/RCard.vue";
import RTag from "@/components/ui/RTag.vue";

type TrendPoint = { x: number; y: number; index: number; day: number; value: number; type: "income" | "expense" };
defineProps<{
  trendTicks: Array<{ label: string; top: number; y: number }>;
  incomeTrendPath: string;
  expenseTrendPath: string;
  incomeTrendPoints: string;
  expenseTrendPoints: string;
  trendPointMarkers: TrendPoint[];
  formatTrendAmount: (value: number) => string;
}>();
const hoveredTrendPoint = ref<TrendPoint | null>(null);
</script>

<style scoped>
.chart-card { height: 100%; padding: var(--space-4); }
.chart-card h3 { margin: 0 0 var(--space-3); font-size: var(--font-card-title); }
.chart-card__lines { position: relative; height: 150px; padding: 0 4px 0 34px; border-bottom: 1px solid var(--color-border-soft); }
.chart-card svg { width: 100%; height: 100%; }
.chart-card__y-axis { position: absolute; inset: 0 auto 0 0; width: 30px; color: var(--color-text-tertiary); font-size: 10px; text-align: right; }
.chart-card__y-axis span { position: absolute; right: 0; transform: translateY(-50%); white-space: nowrap; }
.chart-grid line { stroke: var(--color-border-soft); stroke-dasharray: 3 5; stroke-width: 1; }
.chart-card .trend-area { stroke: none; }
.chart-card .income-area { fill: url(#dashboard-income-fill); }
.chart-card .expense-area { fill: url(#dashboard-expense-fill); }
.chart-card .trend-line { fill: none; stroke: var(--color-primary); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.chart-card .trend-line.expense { stroke: var(--color-danger); }
.chart-card .trend-hit-area { fill: transparent; stroke: transparent; pointer-events: all; cursor: crosshair; }
.chart-card__tooltip { position: absolute; top: 12px; right: 12px; display: grid; gap: 3px; min-width: 116px; padding: 8px 10px; background: rgba(255, 255, 255, 0.96); border: 1px solid var(--color-border-soft); border-radius: 10px; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12); pointer-events: none; }
.chart-card__tooltip span { color: var(--color-text-tertiary); font-size: 11px; }
.chart-card__tooltip strong { color: var(--color-text-primary); font-size: 13px; }
.chart-empty { display: grid; height: 100%; place-items: center; color: var(--color-text-tertiary); background: var(--color-bg-hover); border: 1px dashed var(--color-border); border-radius: var(--radius-md); font-size: var(--font-caption); }
.chart-card__legend { display: flex; gap: var(--space-2); justify-content: center; margin-top: var(--space-3); }
</style>
