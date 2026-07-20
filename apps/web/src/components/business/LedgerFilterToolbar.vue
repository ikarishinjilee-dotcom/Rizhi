<template>
  <header class="ledger-dashboard__toolbar">
    <LedgerDateNavigation
      :ledger-view="ledgerView"
      :month-label="monthLabel"
      :year-label="yearLabel"
      :show-month-picker="showMonthPicker"
      :month-picker-years="monthPickerYears"
      :month-picker-year="monthPickerYear"
      :calendar-month="calendarMonth"
      @shift-month="$emit('shift-month', $event)"
      @open-month-picker="$emit('open-month-picker')"
      @select-picker-year="$emit('select-picker-year', $event)"
      @select-picker-month="$emit('select-picker-month', $event)"
      @set-ledger-view="$emit('set-ledger-view', $event)"
    />
    <div class="ledger-dashboard__actions">
      <RButton variant="secondary" @click="$emit('open-daily-report')"><NotebookText :size="15" /> 日报表</RButton>
      <RButton variant="secondary" aria-label="打开日历" @click="$emit('open-calendar')"><CalendarDays :size="15" /> 日历模式</RButton>
      <RButton @click="$emit('create-entry', 'expense')"><Plus :size="16" /> 记一笔</RButton>
    </div>
  </header>
  <LedgerFilterBar
    :show-filter-panel="showFilterPanel"
    :type-filter="typeFilter"
    :category-filter="categoryFilter"
    :sub-category-filter="subCategoryFilter"
    :account-filter="accountFilter"
    :type-options="typeOptions"
    :category-options="categoryOptions"
    :sub-category-filter-options="subCategoryFilterOptions"
    :account-options="accountOptions"
    @update:type-filter="$emit('update:type-filter', $event)"
    @update:category-filter="$emit('update:category-filter', $event)"
    @update:sub-category-filter="$emit('update:sub-category-filter', $event)"
    @update:account-filter="$emit('update:account-filter', $event)"
    @create-entry="$emit('create-entry', $event)"
  />
</template>

<script setup lang="ts">
import { CalendarDays, NotebookText, Plus } from "@lucide/vue";
import RButton from "@/components/ui/RButton.vue";
import LedgerDateNavigation from "@/components/business/LedgerDateNavigation.vue";
import LedgerFilterBar from "@/components/business/LedgerFilterBar.vue";

type Option = { label: string; value: string | number };

defineProps<{
  ledgerView: "month" | "year";
  monthLabel: string;
  yearLabel: string;
  showMonthPicker: boolean;
  monthPickerYears: number[];
  monthPickerYear: number;
  calendarMonth: number;
  showFilterPanel: boolean;
  typeFilter: string | number | null;
  categoryFilter: string | number | null;
  subCategoryFilter: string | number | null;
  accountFilter: string | number | null;
  typeOptions: Option[];
  categoryOptions: Option[];
  subCategoryFilterOptions: Option[];
  accountOptions: Option[];
}>();

defineEmits<{
  "shift-month": [delta: number];
  "open-month-picker": [];
  "select-picker-year": [year: number];
  "select-picker-month": [month: number];
  "set-ledger-view": [view: "month" | "year"];
  "open-daily-report": [];
  "open-calendar": [];
  "create-entry": [type: "expense" | "income"];
  "update:type-filter": [value: string | number | null];
  "update:category-filter": [value: string | number | null];
  "update:sub-category-filter": [value: string | number | null];
  "update:account-filter": [value: string | number | null];
}>();
</script>
