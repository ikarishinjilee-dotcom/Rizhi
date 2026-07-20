<template>
  <div class="ledger-period-controls">
    <button type="button" class="ledger-icon-button" aria-label="上个月" @click="$emit('shift-month', -1)"><ChevronLeft :size="16" /></button>
    <div class="ledger-month-picker">
      <button type="button" class="ledger-month-select" aria-label="选择月份" @click="$emit('open-month-picker')">
        {{ ledgerView === 'year' ? yearLabel : monthLabel }} <ChevronDown :size="15" />
      </button>
      <div v-if="showMonthPicker" class="ledger-month-picker__popover" :class="{ 'is-year-picker': ledgerView === 'year' }">
        <div v-if="ledgerView === 'month'" class="ledger-month-picker__years">
          <button v-for="year in monthPickerYears" :key="year" type="button" :class="{ active: year === monthPickerYear }" @click="$emit('select-picker-year', year)">{{ year }}</button>
        </div>
        <div v-if="ledgerView === 'month'" class="ledger-month-picker__months">
          <button v-for="month in 12" :key="month" type="button" :class="{ active: monthPickerYear === new Date(calendarMonth).getFullYear() && month === new Date(calendarMonth).getMonth() + 1 }" @click="$emit('select-picker-month', month)">{{ month }}月</button>
        </div>
        <div v-else class="ledger-month-picker__year-grid">
          <button v-for="year in monthPickerYears" :key="year" type="button" :class="{ active: year === new Date(calendarMonth).getFullYear() }" @click="$emit('select-picker-year', year)">{{ year }}</button>
        </div>
      </div>
    </div>
    <button type="button" class="ledger-icon-button" aria-label="下个月" @click="$emit('shift-month', 1)"><ChevronRight :size="16" /></button>
    <div class="ledger-mode-switch">
      <button :class="{ active: ledgerView === 'month' }" type="button" @click="$emit('set-ledger-view', 'month')">月</button>
      <button :class="{ active: ledgerView === 'year' }" type="button" @click="$emit('set-ledger-view', 'year')">年</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronLeft, ChevronRight } from "@lucide/vue";

defineProps<{
  ledgerView: "month" | "year";
  monthLabel: string;
  yearLabel: string;
  showMonthPicker: boolean;
  monthPickerYears: number[];
  monthPickerYear: number;
  calendarMonth: number;
}>();

defineEmits<{
  "shift-month": [delta: number];
  "open-month-picker": [];
  "select-picker-year": [year: number];
  "select-picker-month": [month: number];
  "set-ledger-view": [view: "month" | "year"];
}>();
</script>
