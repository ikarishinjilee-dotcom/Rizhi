<template>
  <div class="ledger-day-panel__columns"><span>&#x5206;&#x7C7B;</span><span>&#x540D;&#x79F0;/&#x6458;&#x8981;</span><span>&#x5173;&#x8054;&#x8D26;&#x6237;</span><span>&#x91D1;&#x989D;</span></div>
    <div v-if="selectedDayEntries.length" class="ledger-day-list">
      <div v-for="entry in selectedDayEntries" :key="entry.id" class="ledger-day-row" data-testid="ledger-row" role="button" tabindex="0" @click="$emit('open-entry', entry.id)" @keydown.enter="$emit('open-entry', entry.id)">
        <span class="ledger-day-row__category"><img v-if="summaryCategoryForEntry(entry).iconUrl" :src="summaryCategoryForEntry(entry).iconUrl" alt="" /><i v-else>{{ categoryInitial(entry) }}</i><strong>{{ categoryLabel(entry) }}</strong></span>
        <span class="ledger-day-row__name" :title="entryDisplayName(entry)"><strong>{{ entryDisplayName(entry) }}</strong><em v-if="entrySourceLabel(entry)">{{ entrySourceLabel(entry) }}</em></span>
        <span class="ledger-day-row__note ledger-account-cell"><img v-if="accountForEntry(entry)?.iconUrl" :src="accountForEntry(entry)?.iconUrl" alt="" /><i v-else :style="{ background: accountForEntry(entry)?.color || '#edf4ff', color: accountForEntry(entry)?.color ? '#fff' : 'var(--color-primary)' }">{{ accountForEntry(entry)?.icon || accountForEntry(entry)?.name?.slice(0, 1) || '\u8D26' }}</i>{{ accountRelationLabel(entry) }}</span>
        <strong class="ledger-day-row__amount" :class="isPositive(entry.type) ? 'positive' : 'negative'">{{ amountPrefix(entry) }}{{ formatAmount(entry.amount) }}</strong>
      </div>
    </div>
    <REmptyState v-else title="&#x8FD9;&#x4E00;&#x5929;&#x6682;&#x65E0;&#x4EA4;&#x6613;" description="&#x9009;&#x62E9;&#x5176;&#x4ED6;&#x65E5;&#x671F;&#x6216;&#x8BB0;&#x5F55;&#x4E00;&#x7B14;&#x65B0;&#x8D26;&#x3002" />
    <button type="button" class="ledger-detail-link" @click="$emit('open-calendar')">&#x67E5;&#x770B;&#x8D26;&#x5355;&#x660E;&#x7EC6; &#x2192;</button>
</template>

<script setup lang="ts">
import REmptyState from "@/components/ui/REmptyState.vue";
import type { MoneyAccountRecord, TransactionRecord } from "@/domain/models";

type EntryCategory = { iconUrl?: string };

defineProps<{
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
  "open-entry": [id: string];
  "open-calendar": [];
}>();
</script>
