<template>
	<section class="asset-analytics">
		<article class="analysis-card">
			<div class="analysis-card__head">
				<h2>资产构成</h2>
				<div class="analysis-select">
					<button type="button" @click="emit('update:compositionMenuOpen', !compositionMenuOpen)">
						{{ compositionMode === "category" ? "按分类" : "按状态" }}
						<ChevronDown :size="14" />
					</button>
					<div v-if="compositionMenuOpen" class="analysis-select__menu">
						<button type="button" :class="{ active: compositionMode === 'category' }" @click="selectComposition('category')">按分类</button>
						<button type="button" :class="{ active: compositionMode === 'status' }" @click="selectComposition('status')">按状态</button>
					</div>
				</div>
			</div>
			<div class="composition-chart">
				<div class="donut" :style="{ background: compositionDonutGradient }" @mousemove="$emit('composition-donut-move', $event)" @mouseleave="$emit('composition-hover', null)"><i /><div v-if="hoveredComposition" class="composition-tooltip"><span><i :style="{ background: hoveredComposition.color }" />{{ hoveredComposition.name }}</span><b>{{ formatCurrency(hoveredComposition.total) }}</b><em>{{ hoveredComposition.percent }}%</em></div></div>
				<div class="composition-list">
					<div v-for="item in compositionStats" :key="item.id"><span><i :style="{ background: item.color }" />{{ item.name }}</span><b>{{ formatCurrency(item.total) }}</b><em>{{ item.percent }}%</em></div>
				</div>
			</div>
		</article>

		<article class="analysis-card analysis-card--wide">
			<div class="analysis-card__head">
				<h2>资产趋势</h2>
				<div class="analysis-select">
					<button type="button" @click="emit('update:trendMenuOpen', !trendMenuOpen)">{{ trendRangeLabel }} <ChevronDown :size="14" /></button>
					<div v-if="trendMenuOpen" class="analysis-select__menu"><button v-for="range in trendRanges" :key="range.value" type="button" :class="{ active: trendRange === range.value }" @click="selectTrendRange(range.value)">{{ range.label }}</button></div>
				</div>
			</div>
			<div class="trend-chart">
				<div class="trend-y-axis" aria-hidden="true"><span v-for="item in trendYAxisLabels" :key="item.value" :style="{ top: `${item.top}%` }">{{ item.label }}</span></div>
				<svg viewBox="0 0 520 190" aria-hidden="true"><g class="trend-grid"><line v-for="line in 4" :key="line" x1="0" x2="520" :y1="line * 38" :y2="line * 38" /></g><polyline :points="trendPolylinePoints" /><g v-for="(point, index) in trendPoints" :key="point.label" @mouseenter="$emit('trend-hover', index)" @mouseleave="$emit('trend-hover', null)"><circle class="trend-hit-area" :cx="point.x" :cy="point.y" r="18" @focus="$emit('trend-hover', index)" @blur="$emit('trend-hover', null)" tabindex="0" /><circle :cx="point.x" :cy="point.y" r="5" aria-hidden="true" /></g></svg>
				<div class="trend-labels" :style="{ gridTemplateColumns: `repeat(${trendPoints.length}, 1fr)` }"><span v-for="point in trendPoints" :key="point.label">{{ formatTrendAxisLabel(point.label) }}</span></div>
				<div v-if="hoveredTrendIndex !== null" class="trend-tooltip" :style="trendTooltipStyle"><span>{{ activeTrendPoint?.label }}</span><strong>总资产：{{ formatCurrency(activeTrendPoint?.value ?? 0) }}</strong></div>
			</div>
		</article>

		<article class="analysis-card">
			<div class="analysis-card__head"><h2>使用时长分布</h2><div class="analysis-select"><button type="button" @click="emit('update:usageMenuOpen', !usageMenuOpen)">{{ usageMode === "all" ? "全部" : usageMode === "using" ? "使用中" : "闲置" }} <ChevronDown :size="14" /></button><div v-if="usageMenuOpen" class="analysis-select__menu"><button type="button" :class="{ active: usageMode === 'all' }" @click="selectUsage('all')">全部</button><button type="button" :class="{ active: usageMode === 'using' }" @click="selectUsage('using')">使用中</button><button type="button" :class="{ active: usageMode === 'idle' }" @click="selectUsage('idle')">闲置</button></div></div></div>
			<div class="composition-chart"><div class="donut donut--usage" :style="{ background: usageDonutGradient }"><i /></div><div class="composition-list"><div v-for="item in usageStats" :key="item.name"><span><i :style="{ background: item.color }" />{{ item.name }}</span><b>{{ item.count }}</b><em>({{ item.percent }}%)</em></div></div></div>
		</article>
	</section>
</template>

<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";

type Stat = { id?: string; name: string; total: number; percent: number; color: string };
type UsageStat = { name: string; count: number; percent: number; color: string };
type TrendPoint = { label: string; value: number; x: number; y: number };
type TrendRange = { label: string; value: number };

const props = defineProps<{
	compositionMode: "category" | "status"; compositionMenuOpen: boolean; compositionStats: Stat[]; compositionDonutGradient: string; hoveredComposition?: Stat;
	trendRange: number; trendMenuOpen: boolean; trendRangeLabel: string; trendRanges: readonly TrendRange[]; trendYAxisLabels: { value: number; top: number; label: string }[]; trendPolylinePoints: string; trendPoints: TrendPoint[]; hoveredTrendIndex: number | null; trendTooltipStyle: Record<string, string>; activeTrendPoint?: TrendPoint;
	usageMode: "all" | "using" | "idle"; usageMenuOpen: boolean; usageStats: UsageStat[]; usageDonutGradient: string; formatCurrency: (value: number) => string; formatTrendAxisLabel: (value: string) => string;
}>();
const emit = defineEmits<{ "update:compositionMode": [value: "category" | "status"]; "update:compositionMenuOpen": [value: boolean]; "update:trendRange": [value: number]; "update:trendMenuOpen": [value: boolean]; "update:usageMode": [value: "all" | "using" | "idle"]; "update:usageMenuOpen": [value: boolean]; "composition-donut-move": [event: MouseEvent]; "composition-hover": [value: string | null]; "trend-hover": [value: number | null] }>();
function selectComposition(value: "category" | "status") { emit("update:compositionMode", value); emit("update:compositionMenuOpen", false); }
function selectTrendRange(value: number) { emit("update:trendRange", value); emit("update:trendMenuOpen", false); }
function selectUsage(value: "all" | "using" | "idle") { emit("update:usageMode", value); emit("update:usageMenuOpen", false); }
</script>

<style>
.asset-analytics { display: grid; grid-template-columns: 1fr 1.08fr 1fr; gap: 14px; align-items: stretch; }
.analysis-card { box-sizing: border-box; height: 220px; min-height: 220px; padding: 17px 20px; background: var(--color-bg-card); border: 1px solid var(--color-border-soft); border-radius: 20px; box-shadow: 0 18px 38px rgba(15, 23, 42, 0.052); }
.analysis-card__head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.analysis-card__head h2 { margin: 0; color: var(--color-text-primary); font-size: 15px; line-height: 24px; font-weight: 900; }
.analysis-card__head button { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; color: var(--color-text-secondary); background: #fff; border: 1px solid var(--color-border-soft); border-radius: var(--radius-pill); cursor: pointer; font-weight: 700; }
.analysis-select { position: relative; }.analysis-select__menu { position: absolute; top: calc(100% + 6px); right: 0; z-index: 12; display: grid; min-width: 104px; padding: 5px; background: #fff; border: 1px solid var(--color-border-soft); border-radius: 12px; box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14); }.analysis-select__menu button { justify-content: flex-start; width: 100%; border: 0; border-radius: 8px; }.analysis-select__menu button:hover, .analysis-select__menu button.active { color: var(--color-primary); background: var(--color-primary-light); }
.composition-chart { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 18px; align-items: center; margin-top: 16px; }.donut { position: relative; width: 92px; height: 92px; border-radius: var(--radius-pill); }.donut > i { position: absolute; inset: 25px; background: #fff; border-radius: inherit; box-shadow: inset 0 0 0 1px var(--color-border-soft); }.composition-list { display: grid; gap: 8px; max-height: 132px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; }.composition-list div { display: grid; grid-template-columns: minmax(0, 1fr) auto 52px; gap: 12px; align-items: center; color: var(--color-text-secondary); font-size: 11px; white-space: nowrap; }.composition-list span { display: flex; min-width: 0; align-items: center; gap: 8px; }.composition-list i { flex: 0 0 auto; width: 8px; height: 8px; border-radius: var(--radius-pill); }.composition-list b { color: var(--color-text-primary); font-weight: 700; }.composition-list em { color: var(--color-text-secondary); font-style: normal; text-align: right; }
.trend-chart { position: relative; margin-top: 12px; padding: 0 4px; }.trend-chart svg { width: calc(100% - 34px); height: 126px; margin-left: 34px; }.trend-y-axis { position: absolute; top: 0; bottom: 28px; left: 0; width: 32px; color: var(--color-text-tertiary); font-size: 10px; text-align: right; }.trend-y-axis span { position: absolute; right: 0; transform: translateY(-50%); white-space: nowrap; }.trend-grid line { stroke: #e8eef7; stroke-width: 1; }.trend-chart polyline { fill: none; stroke: var(--color-primary); stroke-linecap: round; stroke-linejoin: round; stroke-width: 4; }.trend-chart circle { fill: #fff; stroke: var(--color-primary); stroke-width: 4; cursor: pointer; pointer-events: all; }.trend-chart .trend-hit-area { fill: transparent; stroke: transparent; stroke-width: 0; }.trend-labels { display: grid; grid-template-columns: repeat(6, 1fr); box-sizing: border-box; padding: 0 5.38%; color: var(--color-text-tertiary); font-size: 12px; text-align: center; }.trend-tooltip { position: absolute; transform: translateX(-50%); top: 36px; display: grid; gap: 5px; min-width: 134px; padding: 10px 12px; background: rgba(255, 255, 255, 0.88); border: 1px solid var(--color-border-soft); border-radius: 14px; box-shadow: var(--shadow-card); backdrop-filter: blur(12px); }.trend-tooltip span { color: var(--color-text-secondary); font-size: 12px; }.trend-tooltip strong { color: var(--color-text-primary); font-size: 13px; }.composition-tooltip { position: absolute; z-index: 4; top: 50%; left: calc(100% + 10px); display: grid; grid-template-columns: 1fr auto; gap: 3px 8px; min-width: 120px; padding: 8px 10px; color: var(--color-text-primary); background: #fff; border: 1px solid var(--color-border-soft); border-radius: 8px; box-shadow: 0 8px 20px rgba(15, 23, 42, .16); transform: translateY(-50%); pointer-events: none; white-space: nowrap; }.composition-tooltip span { display: flex; align-items: center; gap: 5px; font-size: 11px; }.composition-tooltip span i { position: static; inset: auto; width: 8px; height: 8px; background: currentColor; border-radius: 50%; box-shadow: none; }.composition-tooltip b { font-size: 11px; }.composition-tooltip em { grid-column: 1 / -1; color: var(--color-text-tertiary); font-size: 10px; font-style: normal; }
@media (max-width: 1100px) { .asset-analytics { grid-template-columns: 1fr 1fr; } .analysis-card--wide { grid-column: 1 / -1; } }
</style>
