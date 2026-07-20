<template>
  <section class="ledger-surface ledger-day-panel">
    <LedgerDateEntriesNavigation
      ref="dateNavigation"
      :selected-date-display="selectedDateDisplay"
      :selected-date-context-label="selectedDateContextLabel"
      :selected-date-key="selectedDateKey"
      :selected-day-income="selectedDayIncome"
      :selected-day-expense="selectedDayExpense"
      :format-amount="formatAmount"
      @shift-date="$emit('shift-date', $event)"
      @open-date-picker="$emit('open-date-picker')"
      @date-change="$emit('date-change', $event)"
    />
    <LedgerEntryList
      :selected-day-entries="selectedDayEntries"
      :summary-category-for-entry="summaryCategoryForEntry"
      :category-initial="categoryInitial"
      :category-label="categoryLabel"
      :entry-display-name="entryDisplayName"
      :entry-source-label="entrySourceLabel"
      :account-for-entry="accountForEntry"
      :account-relation-label="accountRelationLabel"
      :is-positive="isPositive"
      :amount-prefix="amountPrefix"
      :format-amount="formatAmount"
      @open-entry="$emit('open-entry', $event)"
      @open-calendar="$emit('open-calendar')"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import LedgerDateEntriesNavigation from "@/components/business/LedgerDateEntriesNavigation.vue";
import LedgerEntryList from "@/components/business/LedgerEntryList.vue";
import type { MoneyAccountRecord, TransactionRecord } from "@/domain/models";

type EntryCategory = { iconUrl?: string };

defineProps<{
  selectedDateDisplay: string;
  selectedDateContextLabel: string;
  selectedDateKey: string;
  selectedDayIncome: number;
  selectedDayExpense: number;
  selectedDayEntries: TransactionRecord[];
  summaryCategoryForEntry: (entry: TransactionRecord) => EntryCategory;
  categoryInitial: (entry: TransactionRecord) => string;
  categoryLabel: (entry: TransactionRecord) => string;
  entryDisplayName: (entry: TransactionRecord) => string;
  entrySourceLabel: (entry: TransactionRecord) => string;
  accountForEntry: (entry: TransactionRecord) => MoneyAccountRecord | undefined;
  accountRelationLabel: (entry: TransactionRecord) => string;
  isPositive: (type: TransactionRecord["type"]) => boolean;
  amountPrefix: (entry: TransactionRecord) => string;
  formatAmount: (value: number) => string;
}>();

defineEmits<{
  "shift-date": [offset: number];
  "open-date-picker": [];
  "date-change": [event: Event];
  "open-entry": [id: string];
  "open-calendar": [];
}>();

const dateNavigation = ref<InstanceType<typeof LedgerDateEntriesNavigation> | null>(null);

defineExpose({
  openDatePicker() {
    dateNavigation.value?.openDatePicker();
  },
});
</script>
