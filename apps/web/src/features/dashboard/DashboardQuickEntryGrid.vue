<template>
  <section class="dashboard-entry-grid" aria-label="快速入口">
    <button class="dashboard-entry dashboard-entry--purple" type="button" @click="$emit('navigate', '/assets')">
      <span class="dashboard-entry__icon"><Package :size="32" :stroke-width="1.8" /></span>
      <span class="dashboard-entry__arrow"><ChevronRight :size="15" :stroke-width="2" /></span>
      <strong>物品</strong>
      <p>管理物品信息与所在位置，<br />物品去向清晰可查。</p>
    </button>
    <button class="dashboard-entry dashboard-entry--blue" type="button" @click="$emit('navigate', '/ledger')">
      <span class="dashboard-entry__icon">▤</span>
      <span class="dashboard-entry__arrow"><ChevronRight :size="15" :stroke-width="2" /></span>
      <strong>记账</strong>
      <p>轻松记录每一笔收支，<br />分类清晰，账目一目了然。</p>
    </button>
    <button class="dashboard-entry dashboard-entry--green" type="button" @click="$emit('navigate', '/funds')">
      <span class="dashboard-entry__icon">◔</span>
      <span class="dashboard-entry__arrow"><ChevronRight :size="15" :stroke-width="2" /></span>
      <strong>资产</strong>
      <p>全面管理各类资产与负债，<br />掌握净资产变化趋势。</p>
    </button>
  </section>
</template>

<script setup lang="ts">
import { ChevronRight, Package } from "@lucide/vue";

defineEmits<{
  navigate: [path: "/assets" | "/ledger" | "/funds"];
}>();
</script>

<style scoped>
.dashboard-entry-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; width: min(100%, 1030px); margin: 0 auto; }
.dashboard-entry { position: relative; min-height: 244px; padding: 30px 30px 28px; color: #132653; text-align: left; background: rgba(255, 255, 255, .92); border: 1px solid rgba(216, 226, 244, .84); border-radius: 24px; box-shadow: 0 20px 46px rgba(60, 91, 150, .11); cursor: pointer; transition: transform .2s ease, box-shadow .2s ease; }
.dashboard-entry:hover { transform: translateY(-4px); box-shadow: 0 26px 54px rgba(60, 91, 150, .18); }
.dashboard-entry__icon { display: grid; width: 68px; height: 68px; place-items: center; border-radius: 20px; font-size: 34px; font-weight: 800; }
.dashboard-entry--blue .dashboard-entry__icon { color: #2475f5; background: #eaf2ff; }
.dashboard-entry--green .dashboard-entry__icon { color: #16b982; background: #eafbf4; }
.dashboard-entry--purple .dashboard-entry__icon { color: #7256e8; background: #f0edff; }
.dashboard-entry__arrow { position: absolute; top: 31px; right: 30px; display: grid; width: 24px; height: 24px; place-items: center; color: #2475f5; border: 1.5px solid currentColor; border-radius: 50%; font-size: 20px; line-height: 0; }
.dashboard-entry strong { display: block; margin-top: 18px; font-size: 22px; font-weight: 900; }
.dashboard-entry p { margin: 10px 0 0; color: #627395; font-size: 15px; line-height: 1.8; }
@media (max-width: 1440px) { .dashboard-entry { min-height: 176px; } }
</style>
