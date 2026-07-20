<template>
  <RCard>
    <section class="flow-panel">
      <div class="panel-head">
        <h3>资金流水 <small>最近5条</small></h3>
        <button type="button" @click="$emit('view-all')">查看全部流水 ›</button>
      </div>
      <table v-if="rows.length">
        <thead><tr><th>交易描述</th><th>账户</th><th>金额</th><th>类型</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="flow in rows" :key="flow.id">
            <td>{{ flow.title }}</td><td>{{ flow.accountName }}</td>
            <td :class="flow.direction === 'in' ? 'success' : 'danger'">{{ flow.direction === "in" ? "+" : "-" }}{{ formatAmount(flow.amount) }}</td>
            <td><span class="type-pill" :class="flow.direction">{{ flow.typeLabel }}</span></td><td>{{ flow.time }}</td>
          </tr>
        </tbody>
      </table>
      <REmptyState v-else compact title="暂无资金流水" description="新增交易、转账或还款后会在这里显示。" />
    </section>
  </RCard>
</template>

<script setup lang="ts">
import RCard from "@/components/ui/RCard.vue";
import REmptyState from "@/components/ui/REmptyState.vue";
import { formatAmount } from "@/utils/formatters";

export type FundsFlowRow = {
  id: string;
  title: string;
  accountName: string;
  amount: number;
  direction: "in" | "out";
  typeLabel: string;
  time: string;
};

defineProps<{ rows: FundsFlowRow[] }>();
defineEmits<{ "view-all": [] }>();
</script>

<style scoped>
.flow-panel { padding: var(--space-5); }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
.panel-head h3 { margin: 0; font-size: var(--font-card-title); }
.panel-head small, .panel-head button { color: var(--color-text-tertiary); }
.panel-head button { background: none; border: 0; cursor: pointer; font-weight: 700; }
.flow-panel table { width: 100%; border-collapse: collapse; }
.flow-panel th, .flow-panel td { height: 46px; padding: 0 var(--space-4); color: var(--color-text-secondary); font-size: var(--font-table); text-align: left; border-bottom: 1px solid var(--color-border); }
.flow-panel th { background: var(--color-bg-hover); color: #667085; }
.type-pill { display: inline-flex; height: 24px; align-items: center; padding: 0 var(--space-3); border-radius: 999px; font-size: 12px; font-weight: 800; }
.type-pill.in { color: var(--color-success); background: #dcfce7; }
.type-pill.out { color: var(--color-danger); background: #fee2e2; }
.success { color: var(--color-success) !important; }
.danger { color: var(--color-danger) !important; }
</style>
