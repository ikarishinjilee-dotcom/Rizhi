<template>
  <button v-if="variant === 'asset'" class="account-line" data-testid="fund-account-line" type="button" @click="$emit('select', account.id)">
    <span class="account-icon" :style="{ background: account.color || '#1677ff' }">{{ account.icon || account.name.slice(0, 1) }}</span>
    <strong>{{ account.name }}</strong><em>{{ formatAmount(account.balance) }}</em>
    <svg v-if="sparkline" viewBox="0 0 72 24" aria-hidden="true"><polyline :points="sparkline" /></svg>
    <small v-else class="mini-trend-empty">暂无趋势</small>
  </button>
  <button v-else class="debt-line" data-testid="fund-account-line" type="button" @click="$emit('select', account.id)">
    <span class="account-icon" :style="{ background: account.color || '#ef4444' }">{{ account.icon || account.name.slice(0, 1) }}</span>
    <div><strong>{{ account.name }}</strong><small>剩余额度 {{ formatAmount(Math.max((account.creditLimit ?? 0) - account.balance, 0)) }}</small></div>
    <div><em>当前欠款 {{ formatAmount(account.balance) }}</em><small>总额度 {{ formatAmount(account.creditLimit ?? 0) }}</small></div>
  </button>
</template>

<script setup lang="ts">
import type { MoneyAccountRecord } from "@/domain/models";
import { formatAmount } from "@/utils/formatters";

defineProps<{ account: MoneyAccountRecord; variant: "asset" | "liability"; sparkline?: string }>();
defineEmits<{ select: [id: string] }>();
</script>

<style scoped>
.account-line, .debt-line { width: 100%; min-height: 64px; display: grid; align-items: center; gap: var(--space-3); color: var(--color-text-primary); background: transparent; border: 0; border-bottom: 1px solid var(--color-border); cursor: pointer; text-align: left; }
.account-line { grid-template-columns: 34px 1fr auto 68px; }
.debt-line { grid-template-columns: 34px 1fr auto; }
.account-line:hover, .debt-line:hover { background: var(--color-bg-hover); }
.account-icon { display: grid; width: 30px; height: 30px; place-items: center; color: #fff; border-radius: 9px; font-size: 12px; font-weight: 800; }
.account-line strong, .debt-line strong { font-weight: 800; }
.account-line em, .debt-line em { font-style: normal; font-weight: 800; }
.account-line small, .debt-line small { display: block; margin-top: 3px; color: var(--color-text-tertiary); font-size: 11px; }
.account-line svg { width: 68px; height: 24px; }
.account-line polyline { fill: none; stroke: var(--color-success); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.mini-trend-empty { justify-self: end; width: 68px; margin: 0; color: var(--color-text-tertiary); text-align: right; }
</style>
