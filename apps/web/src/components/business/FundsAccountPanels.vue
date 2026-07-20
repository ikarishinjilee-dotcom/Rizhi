<template>
  <div class="panel-grid">
    <RCard>
      <section class="list-panel">
        <div class="panel-head"><h3>资产账户</h3><span>{{ assetAccounts.length }}个账户</span></div>
        <FundsAccountLine v-for="account in assetAccounts.slice(0, 6)" :key="account.id" :account="account" variant="asset" :sparkline="accountSparklinePoints(account.id)" @select="$emit('open-account', $event)" />
        <REmptyState v-if="!assetAccounts.length" compact title="暂无资产账户" description="添加现金、钱包或储蓄卡后即可记录余额。"><RButton size="small" @click="$emit('open-account-modal')">添加账户</RButton></REmptyState>
        <button v-else class="panel-link" type="button" @click="$emit('open-account-list', 'asset')">查看全部资产账户 ›</button>
      </section>
    </RCard>
    <RCard>
      <section class="list-panel">
        <div class="panel-head"><h3>负债账户</h3><span>{{ liabilityAccounts.length }}个账户</span></div>
        <FundsAccountLine v-for="account in liabilityAccounts.slice(0, 4)" :key="account.id" :account="account" variant="liability" @select="$emit('open-account', $event)" />
        <REmptyState v-if="!liabilityAccounts.length" compact title="暂无负债账户" description="添加信用卡、消费信用或贷款账户。"><RButton size="small" @click="$emit('open-account-modal')">添加账户</RButton></REmptyState>
        <button v-else class="panel-link" type="button" @click="$emit('open-account-list', 'liability')">查看全部负债账户 ›</button>
      </section>
    </RCard>
    <RCard>
      <section class="list-panel">
        <div class="panel-head"><h3>近期还款提醒</h3><span>{{ repaymentReminders.length }}条待还</span></div>
        <button v-for="item in repaymentReminders" :key="item.id" class="reminder-line" type="button" @click="$emit('open-account', item.id)">
          <span class="account-icon danger-bg">{{ item.icon }}</span><div><strong>{{ item.name }}</strong><small>还款日 {{ item.date }}</small></div><div><em>{{ formatAmount(item.balance) }}</em><small :class="item.days <= 1 ? 'danger' : 'success'">{{ item.daysText }}</small></div>
        </button>
        <REmptyState v-if="!repaymentReminders.length" compact title="暂无近期还款" description="设置负债账户的还款日后会在这里提醒。" />
        <button v-else class="panel-link" type="button" @click="$emit('open-account-list', 'repayment')">查看全部还款计划 ›</button>
      </section>
    </RCard>
  </div>
</template>

<script setup lang="ts">
import RButton from "@/components/ui/RButton.vue";
import RCard from "@/components/ui/RCard.vue";
import REmptyState from "@/components/ui/REmptyState.vue";
import FundsAccountLine from "@/components/business/FundsAccountLine.vue";
import type { MoneyAccountRecord } from "@/domain/models";
import { formatAmount } from "@/utils/formatters";

defineProps<{
  assetAccounts: MoneyAccountRecord[];
  liabilityAccounts: MoneyAccountRecord[];
  repaymentReminders: Array<{ id: string; icon: string; name: string; date: string; balance: number; days: number; daysText: string }>;
  accountSparklinePoints: (id: string) => string | undefined;
}>();
defineEmits<{
  "open-account": [id: string];
  "open-account-modal": [];
  "open-account-list": [kind: "asset" | "liability" | "repayment"];
}>();
</script>

<style scoped>
.panel-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-5); }
.list-panel { padding: var(--space-5); }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
.panel-head h3 { margin: 0; font-size: var(--font-card-title); }
.panel-head span { color: var(--color-text-tertiary); }
.account-icon { display: grid; width: 30px; height: 30px; place-items: center; color: #fff; border-radius: 9px; font-size: 12px; font-weight: 800; }
.reminder-line { width: 100%; min-height: 64px; display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: var(--space-3); color: var(--color-text-primary); background: transparent; border: 0; border-bottom: 1px solid var(--color-border); cursor: pointer; text-align: left; }
.reminder-line:hover { background: var(--color-bg-hover); }
.reminder-line strong { font-weight: 800; }
.reminder-line em { font-style: normal; font-weight: 800; }
.reminder-line small { display: block; margin-top: 3px; color: var(--color-text-tertiary); font-size: 11px; }
.panel-link { display: block; margin: var(--space-4) auto 0; color: var(--color-primary); background: transparent; border: 0; cursor: pointer; font-weight: 800; }
.danger-bg { background: var(--color-danger); }
.success { color: var(--color-success) !important; }
.danger { color: var(--color-danger) !important; }
@media (max-width: 1200px) { .panel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .panel-grid { grid-template-columns: 1fr; } }
</style>
