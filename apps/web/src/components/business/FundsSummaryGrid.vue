<template>
  <div class="summary-grid">
    <section v-for="card in cards" :key="card.label" class="summary-card" :class="card.tone">
      <div class="summary-card__head"><span>{{ card.label }}</span><i>{{ card.icon }}</i></div>
      <strong>{{ card.value }}</strong>
      <p>{{ card.trendLabel }} <em>{{ card.compare }}</em> <small>{{ card.rate }}</small></p>
      <svg v-if="card.points" viewBox="0 0 240 56" preserveAspectRatio="none" aria-hidden="true">
        <polyline :points="card.points" fill="none" :stroke="card.stroke" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div v-else class="trend-empty">暂无趋势</div>
    </section>
  </div>
</template>

<script setup lang="ts">
export type FundsSummaryCard = {
  label: string;
  tone: string;
  icon: string;
  value: string;
  trendLabel: string;
  compare: string;
  rate: string;
  points?: string;
  stroke?: string;
};

defineProps<{ cards: FundsSummaryCard[] }>();
</script>

<style scoped>
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-5); }
.summary-card { min-height: 170px; padding: 22px; overflow: hidden; border: 1px solid var(--tone-border); border-radius: 18px; background: linear-gradient(135deg, #fff, var(--tone-bg)); box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05); }
.summary-card.blue { --tone: #1677ff; --tone-bg: #eff6ff; --tone-border: #bfdbfe; }
.summary-card.green { --tone: #16a36a; --tone-bg: #f0fdf4; --tone-border: #bbf7d0; }
.summary-card.red { --tone: #ef4444; --tone-bg: #fff1f0; --tone-border: #fecaca; }
.summary-card.purple { --tone: #7c3aed; --tone-bg: #f5f3ff; --tone-border: #ddd6fe; }
.summary-card__head { display: flex; justify-content: space-between; color: var(--tone); font-size: var(--font-caption); font-weight: 800; }
.summary-card__head i { display: grid; width: 22px; height: 22px; place-items: center; background: color-mix(in srgb, var(--tone) 12%, white); border-radius: 50%; font-style: normal; }
.summary-card strong { display: block; margin-top: var(--space-2); color: var(--tone); font-size: 26px; }
.summary-card p { margin: var(--space-1) 0 var(--space-4); color: var(--color-text-tertiary); font-size: var(--font-caption); }
.summary-card em, .summary-card small { color: var(--color-text-secondary); font-style: normal; }
.summary-card svg { width: 100%; height: 56px; }
.summary-card polyline { fill: none; stroke: var(--tone); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.trend-empty { display: grid; height: 56px; place-items: center; color: color-mix(in srgb, var(--tone) 54%, #94a3b8); font-size: var(--font-caption); font-weight: 800; background: color-mix(in srgb, var(--tone) 6%, transparent); border: 1px dashed color-mix(in srgb, var(--tone) 22%, transparent); border-radius: 12px; }
@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .summary-grid { grid-template-columns: 1fr; } }
</style>
