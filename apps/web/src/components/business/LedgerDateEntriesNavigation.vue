<template>
  <div class="ledger-day-panel__head">
    <div class="ledger-day-panel__date">
      <button type="button" aria-label="前一天" @click="$emit('shift-date', -1)"><ChevronLeft :size="15" /></button>
      <div><strong>{{ selectedDateDisplay }}</strong><span>{{ selectedDateContextLabel }}</span></div>
      <button type="button" aria-label="后一天" @click="$emit('shift-date', 1)"><ChevronRight :size="15" /></button>
      <button type="button" class="ledger-calendar-date-button" aria-label="通过日历选择" title="通过日历选择" @click="$emit('open-date-picker')"><CalendarDays :size="15" /></button>
      <input ref="datePickerInput" class="ledger-date-picker-input" type="date" :value="selectedDateKey" aria-label="选择日期" @change="$emit('date-change', $event)" />
    </div>
    <div class="ledger-day-panel__totals"><b class="income">收入：{{ formatAmount(selectedDayIncome) }}</b><b class="expense">支出：{{ formatAmount(selectedDayExpense) }}</b></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { CalendarDays, ChevronLeft, ChevronRight } from "@lucide/vue";

defineProps<{
  selectedDateDisplay: string;
  selectedDateContextLabel: string;
  selectedDateKey: string;
  selectedDayIncome: number;
  selectedDayExpense: number;
  formatAmount: (value: number) => string;
}>();

defineEmits<{
  "shift-date": [offset: number];
  "open-date-picker": [];
  "date-change": [event: Event];
}>();

const datePickerInput = ref<HTMLInputElement | null>(null);

defineExpose({
  openDatePicker() {
    datePickerInput.value?.showPicker?.();
    datePickerInput.value?.click();
  },
});
</script>
