<template>
  <section class="asset-summary-grid">
    <article class="summary-card summary-card--primary">
      <div class="summary-card__top"><span>总资产（含附加）</span></div>
      <strong class="summary-card__amount">
        {{ showTotalAsset ? formatCurrency(totalAssetCost) : "••••••" }}
        <button class="summary-card__visibility" type="button" aria-label="切换资产金额显示" @click.stop="$emit('update:show-total-asset', !showTotalAsset)"><Eye v-if="showTotalAsset" :size="17" /><EyeOff v-else :size="17" /></button>
      </strong>
      <p>较上月 <b>+ {{ formatCurrency(monthlyAssetIncrease) }}</b><em>↑ {{ assetGrowthRate }}%</em></p>
      <svg class="summary-card__sparkline" viewBox="0 0 220 64" aria-hidden="true"><defs><linearGradient id="asset-summary-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.26" /><stop offset="1" stop-color="#fff" stop-opacity="0" /></linearGradient></defs><polygon :points="`${summarySparklinePoints} 220,64 0,64`" fill="url(#asset-summary-fill)" /><polyline :points="summarySparklinePoints" /></svg>
    </article>
    <article class="summary-card summary-card--stat summary-card--green"><div class="summary-card__icon"><Layers :size="24" /></div><span>在用物品</span><strong>{{ usingCount }}</strong><div class="summary-card__popover"><strong class="summary-card__popover-title">当前在用物品</strong><ul v-if="usingAssets.length"><li v-for="asset in usingAssets" :key="asset.id"><span>{{ asset.name }}</span><em>{{ asset.category }}</em></li></ul><p v-else>暂无在用物品</p></div><p>日均成本 <b>{{ formatCurrency(averageDailyCost) }}/天</b></p></article>
    <article class="summary-card summary-card--stat summary-card--orange"><div class="summary-card__icon"><Archive :size="24" /></div><span>闲置物品</span><strong>{{ idleCount }}</strong><div class="summary-card__popover"><strong class="summary-card__popover-title">当前闲置物品</strong><ul v-if="idleAssets.length"><li v-for="asset in idleAssets" :key="asset.id"><span>{{ asset.name }}</span><em>{{ asset.category }}</em></li></ul><p v-else>暂无闲置物品</p></div><p>可考虑整理处理</p></article>
    <article class="summary-card summary-card--stat summary-card--purple"><div class="summary-card__icon"><ShieldCheck :size="24" /></div><span>即将过保</span><strong>{{ warrantySoonCount }}</strong><div class="summary-card__popover"><strong class="summary-card__popover-title">即将过保物品</strong><ul v-if="warrantyAssets.length"><li v-for="asset in warrantyAssets" :key="asset.id"><span>{{ asset.name }}</span><em>{{ asset.warrantyDays == null ? '待确认' : `${asset.warrantyDays} 天内` }}</em></li></ul><p v-else>暂无即将过保物品</p></div><p>30 天内提醒</p></article>
  </section>
</template>

<script setup lang="ts">
import { Archive, Eye, EyeOff, Layers, ShieldCheck } from "@lucide/vue";
import type { AssetCardItem } from "@/components/business/AssetCard.vue";

defineProps<{
  showTotalAsset: boolean;
  totalAssetCost: number;
  monthlyAssetIncrease: number;
  assetGrowthRate: string;
  summarySparklinePoints: string;
  usingCount: number;
  idleCount: number;
  warrantySoonCount: number;
  averageDailyCost: number;
  usingAssets: AssetCardItem[];
  idleAssets: AssetCardItem[];
  warrantyAssets: AssetCardItem[];
  formatCurrency: (amount: number) => string;
}>();

defineEmits<{ "update:show-total-asset": [value: boolean] }>();
</script>

<style>
.asset-summary-grid { display: grid; grid-template-columns: minmax(420px, 1.8fr) repeat(3, minmax(210px, 0.9fr)); gap: 14px; }
.summary-card { position: relative; overflow: hidden; min-height: 126px; padding: 18px 22px; background: var(--color-bg-card); border: 1px solid var(--color-border-soft); border-radius: 20px; box-shadow: 0 18px 38px rgba(15, 23, 42, 0.055); }
.summary-card > span, .summary-card__top { color: var(--color-primary); font-size: 14px; font-weight: 800; }
.summary-card strong { display: block; margin-top: 8px; color: var(--color-text-primary); font-size: 30px; line-height: 34px; font-weight: 900; }
.summary-card--stat { overflow: visible; }
.summary-card--stat:hover { z-index: 20; }
.summary-card__popover { position: absolute; z-index: 30; top: calc(100% + 10px); left: 0; width: min(280px, calc(100vw - 32px)); padding: 14px; color: var(--color-text-primary); background: rgba(255, 255, 255, 0.98); border: 1px solid var(--color-border-soft); border-radius: 14px; box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16); backdrop-filter: blur(12px); display: none; }
.summary-card--stat:hover .summary-card__popover, .summary-card--stat:focus-within .summary-card__popover { display: block; }
.summary-card__popover-title { display: block; margin: 0 0 9px !important; font-size: 14px !important; line-height: 20px !important; }
.summary-card__popover ul { display: grid; gap: 7px; max-height: 190px; margin: 0; padding: 0; overflow-y: auto; list-style: none; }
.summary-card__popover li { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; padding-bottom: 7px; border-bottom: 1px solid var(--color-border-soft); font-size: 12px; }
.summary-card__popover li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.summary-card__popover li em, .summary-card__popover p { margin: 0; color: var(--color-text-tertiary); font-size: 11px; font-style: normal; white-space: nowrap; }
.summary-card__amount { display: flex !important; align-items: center; gap: 8px; white-space: nowrap; font-size: clamp(22px, 2.25vw, 30px) !important; }
.summary-card__visibility { display: inline-grid; width: 28px; height: 28px; place-items: center; padding: 0; color: currentColor; background: transparent; border: 0; border-radius: var(--radius-pill); cursor: pointer; opacity: 0.82; }
.summary-card__visibility:hover { background: rgba(255, 255, 255, 0.16); opacity: 1; }
.summary-card p { margin: 8px 0 0; color: var(--color-text-secondary); font-size: 13px; }
.summary-card p b { color: inherit; }
.summary-card p em { margin-left: 10px; color: inherit; font-style: normal; }
.summary-card__top { display: flex; align-items: center; justify-content: space-between; }
.summary-card__icon { position: absolute; top: 18px; right: 18px; display: grid; width: 48px; height: 48px; place-items: center; border-radius: var(--radius-pill); }
.summary-card--primary { min-height: 132px; color: #fff; background: radial-gradient(circle at 82% 6%, rgba(255, 255, 255, 0.34), transparent 28%), linear-gradient(135deg, #1f6bff 0%, #377dff 48%, #70a8ff 100%); border-color: transparent; box-shadow: 0 22px 46px rgba(38, 116, 255, 0.25); }
.summary-card--primary .summary-card__top, .summary-card--primary strong, .summary-card--primary p { position: relative; z-index: 1; max-width: 60%; color: #fff; }
.summary-card--primary .summary-card__sparkline { position: absolute; right: 24px; bottom: 20px; width: min(200px, 34%); height: 52px; opacity: 0.72; }
.summary-card--primary .summary-card__sparkline polyline { fill: none; stroke: rgba(255, 255, 255, 0.94); stroke-linecap: round; stroke-linejoin: round; stroke-width: 4; }
.summary-card--green { background: linear-gradient(135deg, #f0fff8 0%, #fbfffd 100%); }
.summary-card--green > span, .summary-card--green p { color: #047857; }
.summary-card--green .summary-card__icon { color: var(--color-success); background: rgba(22, 184, 120, 0.12); }
.summary-card--orange { background: linear-gradient(135deg, #fff7eb 0%, #fffdf8 100%); }
.summary-card--orange > span, .summary-card--orange p { color: #c26208; }
.summary-card--orange .summary-card__icon { color: var(--color-warning); background: rgba(245, 158, 11, 0.14); }
.summary-card--purple { background: linear-gradient(135deg, #f7f0ff 0%, #fffaff 100%); }
.summary-card--purple > span, .summary-card--purple p { color: var(--color-purple); }
.summary-card--purple .summary-card__icon { color: var(--color-purple); background: rgba(124, 58, 237, 0.12); }
</style>
