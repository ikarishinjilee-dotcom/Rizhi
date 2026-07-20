<template>
  <n-modal v-model:show="visible" preset="card" class="rizhi-daily-report-modal" :bordered="false" :closable="false" :style="{ width: 'min(780px, calc(100vw - 48px))', borderRadius: '22px' }">
    <section class="daily-report">
      <header class="daily-report__header"><div><span>DAILY REPORT</span><h2>日报表</h2><p>{{ periodLabel }}</p></div><button type="button" aria-label="关闭日报表" @click="visible = false">×</button></header>
      <div class="daily-report__table-wrap">
        <table class="daily-report__table">
          <thead><tr><th>日期</th><th>收入</th><th>支出</th><th>结余</th></tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key"><td>{{ row.label }}</td><td>{{ formatAmount(row.income) }}</td><td>{{ formatAmount(row.expense) }}</td><td :class="row.net >= 0 ? 'positive' : 'negative'">{{ row.net >= 0 ? '+' : '-' }}{{ formatAmount(Math.abs(row.net)) }}</td></tr>
            <tr v-if="!rows.length"><td colspan="4" class="daily-report__empty">当前周期暂无交易记录</td></tr>
          </tbody>
          <tfoot v-if="rows.length"><tr><th>平均</th><td>{{ formatAmount(average.income) }}</td><td>{{ formatAmount(average.expense) }}</td><td :class="average.net >= 0 ? 'positive' : 'negative'">{{ average.net >= 0 ? '+' : '-' }}{{ formatAmount(Math.abs(average.net)) }}</td></tr></tfoot>
        </table>
      </div>
    </section>
  </n-modal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import { formatAmount } from "@/utils/formatters";

export type LedgerReportRow = { key: string; label: string; income: number; expense: number; net: number };
export type LedgerReportAverage = Omit<LedgerReportRow, "key" | "label">;

const visible = defineModel<boolean>({ required: true });
defineProps<{ periodLabel: string; rows: LedgerReportRow[]; average: LedgerReportAverage }>();
</script>

<style scoped>
.daily-report { overflow: hidden; background: #fff; border-radius: 22px; }
.daily-report__header { position: relative; padding: 30px 36px 26px; text-align: center; border-bottom: 1px solid #edf0f5; }
.daily-report__header span { display: block; color: var(--color-primary); font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.daily-report__header h2 { margin: 6px 0 3px; color: #182033; font-size: 30px; line-height: 1.2; }
.daily-report__header p { margin: 0; color: var(--color-text-tertiary); font-size: 13px; }
.daily-report__header button { position: absolute; top: 18px; right: 20px; display: grid; width: 32px; height: 32px; padding: 0; place-items: center; color: #69758a; background: #f5f7fb; border: 0; border-radius: 50%; cursor: pointer; font-size: 20px; }
.daily-report__table-wrap { max-height: min(540px, calc(100dvh - 260px)); overflow: auto; }
.daily-report__table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.daily-report__table th, .daily-report__table td { padding: 21px 18px; font-size: 16px; text-align: center; border-bottom: 1px solid #edf0f5; }
.daily-report__table thead th { color: #4a5568; font-weight: 750; background: #fbfcfe; }
.daily-report__table tbody td { color: #202939; font-variant-numeric: tabular-nums; }
.daily-report__table tfoot th, .daily-report__table tfoot td { color: #27334a; font-weight: 750; background: #fbfcfe; border-bottom: 0; }
.daily-report__table .positive { color: #12a775; }.daily-report__table .negative { color: #ed6269; }
.daily-report__empty { height: 130px; color: var(--color-text-tertiary) !important; }
</style>
