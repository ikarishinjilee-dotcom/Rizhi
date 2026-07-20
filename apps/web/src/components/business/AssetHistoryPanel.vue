<template>
  <RCard>
    <div class="section-card">
      <div class="section-card__head"><h3>历史记录（{{ items.length }}）</h3></div>
      <div v-if="items.length" class="history-timeline">
        <div v-for="item in items" :key="item.id" class="history-item">
          <div class="history-dot" :class="item.tone" />
          <div class="history-card"><div><span>{{ item.time }}</span><strong>{{ item.title }}</strong></div><p>{{ item.description }}</p></div>
        </div>
      </div>
      <REmptyState v-else title="暂无历史记录" description="后续对资产和附加项的操作会沉淀到这里。" />
    </div>
  </RCard>
</template>

<script setup lang="ts">
import RCard from "@/components/ui/RCard.vue";
import REmptyState from "@/components/ui/REmptyState.vue";

defineProps<{ items: Array<{ id: string; time: string; title: string; description: string; tone: "primary" | "success" | "warning" | "danger" }> }>();
</script>

<style>
.section-card { padding: var(--space-4); }.section-card__head { display: flex; justify-content: space-between; margin-bottom: var(--space-3); }.section-card__head h3 { margin: 0; font-size: var(--font-section-title); }
.history-timeline { position: relative; display: grid; gap: var(--space-4); padding: var(--space-2) 0 var(--space-2) 18px; }.history-timeline::before { position: absolute; top: 8px; bottom: 8px; left: 25px; width: 1px; content: ""; background: linear-gradient(180deg, rgba(22, 119, 255, 0.45), rgba(22, 119, 255, 0.04)); }.history-item { position: relative; display: grid; grid-template-columns: 16px 1fr; gap: var(--space-4); align-items: start; }.history-dot { z-index: 1; width: 14px; height: 14px; margin-top: 18px; background: var(--color-primary); border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 0 4px var(--color-primary-soft); }.history-dot.success { background: var(--color-success); box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12); }.history-dot.warning { background: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12); }.history-dot.danger { background: var(--color-danger); box-shadow: 0 0 0 4px rgba(240, 68, 56, 0.12); }.history-card { display: grid; gap: var(--space-2); padding: var(--space-4); background: linear-gradient(180deg, #fff, #fbfcff); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05); }.history-card div { display: flex; justify-content: space-between; gap: var(--space-4); }.history-card span { color: var(--color-text-tertiary); font-size: var(--font-caption); }.history-card strong { color: var(--color-text-primary); }.history-card p { margin: 0; color: var(--color-text-secondary); line-height: 1.7; }
</style>
