<template>
  <NModal
    :show="show"
    preset="card"
    class="rizhi-calendar-modal"
    :bordered="false"
    :style="{ width: 'min(1180px, calc(100vw - 48px))', height: 'min(720px, calc(100dvh - 48px))', maxHeight: 'calc(100dvh - 48px)' }"
    @update:show="$emit('update:show', $event)"
  >
    <RCard>
      <div class="ledger-calendar">
        <div class="calendar-toolbar">
          <div><span>日历视图</span><strong>{{ calendarTitle }}</strong></div>
          <div class="calendar-actions">
            <button type="button" @click="$emit('shift-month', -1)">上个月</button>
            <button type="button" @click="$emit('current-month')">本月</button>
            <button type="button" @click="$emit('shift-month', 1)">下个月</button>
          </div>
        </div>

        <div class="calendar-layout">
          <div class="calendar-board">
            <div v-for="weekday in weekdays" :key="weekday" class="calendar-weekday">{{ weekday }}</div>
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              class="calendar-day"
              :class="{ muted: !day.inMonth, today: day.isToday, selected: day.dateKey === selectedDateKey }"
              @click="$emit('select-date', day.dateKey)"
            >
              <span>{{ day.day }}</span>
              <div v-if="day.count" class="day-summary">
                <em v-if="day.income" class="positive">+{{ compactAmount(day.income) }}</em>
                <em v-if="day.expense" class="negative">-{{ compactAmount(day.expense) }}</em>
                <strong :class="day.net >= 0 ? 'net-positive' : 'net-negative'">{{ day.net >= 0 ? "+" : "-" }}{{ compactAmount(Math.abs(day.net)) }}</strong>
              </div>
              <small v-if="day.count">{{ day.count }} 笔</small>
            </button>
          </div>

          <aside class="calendar-detail">
            <div class="calendar-detail__head"><span>选中日期</span><strong>{{ selectedDateLabel }}</strong></div>
            <div class="calendar-detail__summary">
              <div><span>收入</span><strong class="positive">{{ formatAmount(selectedDayIncome) }}</strong></div>
              <div><span>支出</span><strong class="negative">{{ formatAmount(selectedDayExpense) }}</strong></div>
              <div><span>净流入</span><strong :class="selectedDayNet >= 0 ? 'positive' : 'negative'">{{ selectedDayNet >= 0 ? "" : "-" }}{{ formatAmount(selectedDayNet) }}</strong></div>
            </div>
            <div v-if="selectedDayEntries.length" class="calendar-entry-list">
              <div v-for="entry in selectedDayEntries" :key="entry.id" class="calendar-entry">
                <RTag :tone="tagTone(entry.type)">{{ transactionTypeLabel(entry.type) }}</RTag>
                <div><strong>{{ entry.merchant || entry.note || categoryLabel(entry) }}</strong><span>{{ categoryLabel(entry) }} / {{ accountRelationLabel(entry) }}</span></div>
                <em :class="isPositive(entry.type) ? 'positive' : isRepaymentTransaction(entry) ? 'warning' : 'negative'">{{ amountPrefix(entry) }}{{ formatAmount(entry.amount) }}</em>
              </div>
            </div>
            <div v-else class="calendar-empty">这一天暂无交易</div>
          </aside>
        </div>
      </div>
    </RCard>
  </NModal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import RCard from "@/components/ui/RCard.vue";
import RTag from "@/components/ui/RTag.vue";
import type { TransactionRecord, TransactionType } from "@/domain/models";

export interface LedgerCalendarDay {
  key: string;
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  count: number;
  income: number;
  expense: number;
  net: number;
}

defineProps<{
  show: boolean;
  calendarTitle: string;
  weekdays: string[];
  calendarDays: LedgerCalendarDay[];
  selectedDateKey: string;
  selectedDateLabel: string;
  selectedDayIncome: number;
  selectedDayExpense: number;
  selectedDayNet: number;
  selectedDayEntries: TransactionRecord[];
  formatAmount: (amount: number) => string;
  compactAmount: (amount: number) => string;
  tagTone: (type: TransactionType) => "success" | "danger" | "warning" | "info";
  transactionTypeLabel: (type: TransactionType) => string;
  categoryLabel: (entry: TransactionRecord) => string;
  accountRelationLabel: (entry: TransactionRecord) => string;
  isPositive: (type: TransactionType) => boolean;
  isRepaymentTransaction: (entry: TransactionRecord) => boolean;
  amountPrefix: (entry: TransactionRecord) => string;
}>();

defineEmits<{
  "update:show": [value: boolean];
  "shift-month": [offset: number];
  "current-month": [];
  "select-date": [dateKey: string];
}>();
</script>

<style>
.calendar-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); min-height: 58px; padding: 12px 16px; color: #fff; background: radial-gradient(circle at 88% 12%, rgba(255, 255, 255, 0.2), transparent 24%), linear-gradient(135deg, #111827, #1d4ed8 62%, #2f7cff); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 12px; box-shadow: 0 12px 28px rgba(22, 119, 255, 0.1); }
.calendar-toolbar span { display: block; font-size: var(--font-caption); font-weight: 800; opacity: 0.78; }
.calendar-toolbar strong { display: block; margin-top: 2px; font-size: 20px; letter-spacing: 0; }
.calendar-actions { display: flex; gap: var(--space-2); }
.calendar-actions button { height: 28px; padding: 0 10px; color: #fff; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.22); border-radius: var(--radius-md); cursor: pointer; font-weight: 700; font-size: 12px; }
.calendar-actions button:hover { background: rgba(255, 255, 255, 0.22); }
.calendar-layout { display: grid; min-height: 0; height: 100%; grid-template-columns: minmax(0, 1fr) 282px; gap: var(--space-4); align-items: start; }
.calendar-board { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-template-rows: 36px repeat(6, minmax(0, 1fr)); height: 100%; gap: 1px; overflow: hidden; background: #e8edf5; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.03); }
.calendar-weekday { display: grid; height: 28px; place-items: center; color: #64748b; background: #f8fafc; font-size: var(--font-caption); font-weight: 800; }
.calendar-day { position: relative; display: grid; min-height: 62px; align-content: start; gap: 2px; padding: 8px; text-align: left; background: rgba(255, 255, 255, 0.92); border: 0; cursor: pointer; transition: background 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease; }
.calendar-day:hover { z-index: 1; background: #f8fbff; box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.28); }
.calendar-day.muted { color: var(--color-text-tertiary); background: #f8fafc; }
.calendar-day.selected { z-index: 1; background: linear-gradient(180deg, rgba(22, 119, 255, 0.08), rgba(255, 255, 255, 0.96)); box-shadow: inset 0 0 0 2px var(--color-primary), 0 8px 18px rgba(22, 119, 255, 0.1); }
.calendar-day.today > span { display: grid; width: 20px; height: 20px; place-items: center; color: #fff; background: var(--color-primary); border-radius: 50%; font-weight: 800; }
.calendar-day > span { color: var(--color-text-primary); font-size: 12px; font-weight: 800; }
.day-summary { display: grid; gap: 1px; margin-top: 1px; font-size: 10px; line-height: 1.18; }
.day-summary em, .day-summary strong { font-style: normal; }
.day-summary strong { width: max-content; padding: 1px 4px; border-radius: 4px; font-weight: 800; }
.day-summary .net-positive { color: #2563eb; background: #eaf2ff; }
.day-summary .net-negative { color: #7c3aed; background: #f3e8ff; }
.calendar-day small { color: var(--color-text-tertiary); font-size: 9px; }
.calendar-detail { display: grid; gap: var(--space-2); padding: 14px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98)); border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.045); }
.calendar-detail__head span { color: var(--color-text-tertiary); font-size: var(--font-caption); font-weight: 800; }
.calendar-detail__head strong { display: block; margin-top: 2px; font-size: 16px; }
.calendar-detail__summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.calendar-detail__summary div { padding: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; }
.calendar-detail__summary span { display: block; color: var(--color-text-tertiary); font-size: 11px; }
.calendar-detail__summary strong { display: block; margin-top: 2px; font-size: 12px; }
.calendar-entry-list { display: grid; gap: 8px; max-height: 300px; overflow: auto; }
.calendar-entry { display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-2); align-items: center; padding: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; }
.calendar-entry strong { display: block; color: var(--color-text-primary); font-size: 12px; }
.calendar-entry > div span { display: block; margin-top: 2px; color: var(--color-text-tertiary); font-size: 11px; }
.calendar-entry em { font-style: normal; font-weight: 800; }
.calendar-empty { display: grid; min-height: 120px; place-items: center; color: var(--color-text-tertiary); background: var(--color-bg-card); border: 1px dashed var(--color-border); border-radius: 10px; }
.calendar-entry > .r-tag { justify-content: center; box-sizing: border-box; line-height: 1; vertical-align: middle; }
.rizhi-calendar-modal.n-card { height: min(720px, calc(100dvh - 48px)); overflow: hidden; }
.rizhi-calendar-modal .n-card__content { height: 100%; min-height: 0; padding: 0 !important; overflow: hidden; }
.rizhi-calendar-modal .r-card { height: 100%; }
.rizhi-calendar-modal .r-card > .n-card__content { height: 100%; min-height: 0; padding: 0 !important; }
</style>
