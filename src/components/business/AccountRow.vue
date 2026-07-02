<template>
  <button class="account-row" type="button" @click="$emit('open', account.id)">
    <div class="account-row__icon" :style="{ background: account.color ?? fallbackColor }">{{ account.icon ?? "账" }}</div>
    <div class="account-row__main">
      <strong>{{ account.name }}</strong>
      <span>{{ typeLabel }}</span>
    </div>
    <div class="account-row__amount" :class="{ 'is-debt': account.direction === 'liability' }">
      {{ account.direction === "liability" ? "-" : "" }}¥{{ account.balance.toLocaleString("zh-CN", { minimumFractionDigits: 2 }) }}
      <span v-if="account.creditLimit">可用额度 ¥{{ Math.max(account.creditLimit - account.balance, 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 }) }}</span>
    </div>
    <svg class="account-row__spark" viewBox="0 0 64 24">
      <path :class="{ 'is-debt': account.direction === 'liability' }" d="M2 17 C10 6, 16 20, 24 11 S38 4, 44 14 S56 16, 62 5" />
    </svg>
    <span class="account-row__chevron">›</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { MoneyAccountRecord } from "@/domain/models";

const props = defineProps<{
  account: MoneyAccountRecord;
}>();

defineEmits<{
  open: [id: string];
}>();

const fallbackColor = computed(() => props.account.direction === "liability" ? "#F04438" : "#1677FF");

const typeLabel = computed(() => {
  const labels: Record<MoneyAccountRecord["type"], string> = {
    cash: "现金",
    wallet: "电子钱包",
    debit_card: "储蓄卡",
    credit_card: "信用卡",
    consumer_credit: "消费信用",
    loan: "贷款",
    investment: "投资账户",
    other: "其他账户",
  };
  return labels[props.account.type];
});
</script>

<style scoped>
.account-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 150px 72px 16px;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  min-height: 58px;
  padding: 0 var(--space-3);
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}

.account-row:hover {
  background: var(--color-bg-hover);
}

.account-row__icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: #fff;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
}

.account-row__main strong,
.account-row__amount {
  display: block;
  color: var(--color-text-primary);
  font-size: var(--font-table);
  font-weight: 700;
}

.account-row__main span,
.account-row__amount span {
  display: block;
  margin-top: 2px;
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 400;
}

.account-row__amount.is-debt {
  color: var(--color-danger);
}

.account-row__spark path {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2;
}

.account-row__spark path.is-debt {
  stroke: var(--color-danger);
}

.account-row__chevron {
  color: var(--color-text-tertiary);
  font-size: 20px;
}
</style>
