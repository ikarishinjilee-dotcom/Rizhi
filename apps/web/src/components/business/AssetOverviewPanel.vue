<template>
  <RCard>
    <div class="overview-panel">
      <div class="overview-panel__hero">
        <div>
          <span>资产概览</span>
          <h3>{{ asset.name }} 的使用与成本状态</h3>
          <p>把持有、保修、估值和日均成本放在一起看，方便判断这件物品还值不值得继续留着。</p>
        </div>
        <div class="overview-score"><span>日均成本</span><strong>{{ formatAmount(dailyCost) }}</strong></div>
      </div>

      <div class="overview-metrics">
        <div v-for="metric in overviewMetrics" :key="metric.label" class="overview-metric" :class="metric.tone"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.hint }}</small></div>
      </div>

      <div class="overview-grid">
        <div class="overview-block"><span>成本结构</span><div class="overview-row"><em>原始购入价</em><strong>{{ formatAmount(asset.originalCost) }}</strong></div><div class="overview-row"><em>附加项合计</em><strong>{{ formatAmount(addonCost) }}</strong></div><div class="overview-row total"><em>资产总成本</em><strong>{{ formatAmount(totalCost) }}</strong></div></div>
        <div class="overview-block"><span>生命周期</span><div class="overview-row"><em>购买日期</em><strong>{{ asset.purchaseDate }}</strong></div><div class="overview-row"><em>过保日期</em><strong>{{ asset.warrantyEndDate || "-" }}</strong></div><div class="overview-row total"><em>当前状态</em><strong>{{ statusLabel(asset.status) }}</strong></div></div>
        <div class="overview-block accent"><span>{{ profitLoss >= 0 ? "当前收益" : "当前损失" }}</span><strong>{{ formatAmount(Math.abs(profitLoss)) }}</strong><p>按当前估值与资产总成本估算，不影响历史记账流水。</p></div>
      </div>
    </div>
  </RCard>
</template>

<script setup lang="ts">
import RCard from "@/components/ui/RCard.vue";
import type { AssetRecord } from "@/domain/models";

defineProps<{
  asset: AssetRecord;
  overviewMetrics: Array<{ label: string; value: string; hint: string; tone: string }>;
  addonCost: number;
  totalCost: number;
  dailyCost: number;
  profitLoss: number;
  formatAmount: (value: number) => string;
  statusLabel: (status: AssetRecord["status"]) => string;
}>();
</script>

<style>
.overview-panel { display: grid; gap: var(--space-5); padding: var(--space-5); }
.overview-panel__hero { display: flex; align-items: stretch; justify-content: space-between; gap: var(--space-5); padding: 24px; overflow: hidden; color: #fff; background: radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.34), transparent 24%), linear-gradient(135deg, #0f172a, #1d4ed8 58%, #38bdf8); border-radius: 18px; box-shadow: 0 24px 60px rgba(22, 119, 255, 0.18); }
.overview-panel__hero span, .overview-score span { display: block; font-size: var(--font-caption); font-weight: 800; letter-spacing: 0.04em; opacity: 0.78; }.overview-panel__hero h3 { margin: var(--space-2) 0; font-size: 24px; }.overview-panel__hero p { max-width: 560px; margin: 0; color: rgba(255, 255, 255, 0.78); line-height: 1.7; }.overview-score { display: grid; min-width: 190px; align-content: center; padding: var(--space-5); background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.24); border-radius: 16px; backdrop-filter: blur(10px); }.overview-score strong { margin-top: var(--space-2); font-size: 28px; }
.overview-metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--space-3); }.overview-metric { display: grid; gap: var(--space-2); min-height: 118px; padding: var(--space-4); background: linear-gradient(180deg, #fff, #f8fbff); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05); }.overview-metric span { color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }.overview-metric strong { color: var(--color-primary); font-size: 22px; }.overview-metric small { color: var(--color-text-tertiary); line-height: 1.45; }.overview-metric.success strong { color: var(--color-success); }.overview-metric.warning strong { color: #f59e0b; }
.overview-grid { display: grid; grid-template-columns: 1fr 1fr 0.8fr; gap: var(--space-4); }.overview-block { display: grid; gap: var(--space-3); padding: var(--space-4); background: var(--color-bg-hover); border: 1px solid var(--color-border); border-radius: 16px; }.overview-block > span { color: var(--color-text-tertiary); font-size: var(--font-caption); font-weight: 800; }.overview-row { display: flex; justify-content: space-between; gap: var(--space-3); color: var(--color-text-secondary); }.overview-row em { font-style: normal; }.overview-row strong { color: var(--color-text-primary); }.overview-row.total { padding-top: var(--space-3); border-top: 1px solid var(--color-border); font-weight: 800; }.overview-block.accent { align-content: center; color: var(--color-primary); background: linear-gradient(135deg, var(--color-primary-soft), #fff); border-color: #bbd5ff; }.overview-block.accent strong { font-size: 28px; }.overview-block.accent p { margin: 0; color: var(--color-text-tertiary); line-height: 1.7; }
@media (max-width: 1200px) { .overview-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }.overview-grid { grid-template-columns: 1fr; }.overview-panel__hero { flex-direction: column; } }
</style>
