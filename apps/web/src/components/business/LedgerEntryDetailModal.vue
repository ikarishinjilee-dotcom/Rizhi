<template>
  <NModal
    :show="show"
    preset="card"
    :bordered="false"
    :style="{ width: 'min(520px, calc(100vw - 48px))', borderRadius: '18px' }"
    @update:show="$emit('update:show', $event)"
  >
    <section v-if="selectedTransaction" class="ledger-entry-detail">
      <header>
        <div><span>记账详情</span><h2>{{ entryDisplayName(selectedTransaction) }}</h2><p>{{ categoryLabel(selectedTransaction) }}<em v-if="entrySourceLabel(selectedTransaction)"> · {{ entrySourceLabel(selectedTransaction) }}</em></p></div>
      </header>
      <div class="ledger-entry-detail__amount" :class="isPositive(selectedTransaction.type) ? 'positive' : 'negative'">{{ amountPrefix(selectedTransaction) }}{{ formatAmount(selectedTransaction.amount) }}</div>
      <dl>
        <div><dt>名称/摘要</dt><dd>{{ entryDisplayName(selectedTransaction) }}</dd></div>
        <div v-if="entrySourceLabel(selectedTransaction)"><dt>来源</dt><dd>{{ entrySourceLabel(selectedTransaction) }}</dd></div>
        <div v-if="selectedTransaction.assetId || selectedTransaction.assetSnapshot"><dt>关联资产</dt><dd>{{ assetName(selectedTransaction) }}</dd></div>
        <div><dt>分类</dt><dd>{{ categoryLabel(selectedTransaction) }}</dd></div>
        <div><dt>发生时间</dt><dd>{{ formatDateTime(displayOccurredAt(selectedTransaction)) }}</dd></div>
        <div><dt>账户</dt><dd>{{ accountRelationLabel(selectedTransaction) }}</dd></div>
        <div><dt>商家 / 来源</dt><dd>{{ selectedTransaction.merchant || '-' }}</dd></div>
        <div><dt>备注</dt><dd>{{ selectedTransaction.note || '-' }}</dd></div>
      </dl>
      <footer>
        <RButton variant="secondary" @click="$emit('update:show', false)">关闭</RButton>
        <RButton v-if="!isRepaymentTransaction(selectedTransaction) && !isTransferTransaction(selectedTransaction)" variant="secondary" @click="$emit('edit')">编辑</RButton>
        <RButton data-testid="ledger-detail-delete" variant="danger" :disabled="isProtectedTransaction(selectedTransaction)" @click="$emit('delete')">删除</RButton>
      </footer>
    </section>
  </NModal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import RButton from "@/components/ui/RButton.vue";
import { formatDateTime } from "@/utils/formatters";
import type { TransactionRecord, TransactionType } from "@/domain/models";

defineProps<{
  show: boolean;
  selectedTransaction?: TransactionRecord;
  entryDisplayName: (entry: TransactionRecord) => string;
  entrySourceLabel: (entry: TransactionRecord) => string;
  assetName: (entry: TransactionRecord) => string;
  categoryLabel: (entry: TransactionRecord) => string;
  accountRelationLabel: (entry: TransactionRecord) => string;
  displayOccurredAt: (entry: TransactionRecord) => string;
  amountPrefix: (entry: TransactionRecord) => string;
  formatAmount: (amount: number) => string;
  isPositive: (type: TransactionType) => boolean;
  isRepaymentTransaction: (entry: TransactionRecord) => boolean;
  isTransferTransaction: (entry: TransactionRecord) => boolean;
  isProtectedTransaction: (entry: TransactionRecord) => boolean;
}>();

defineEmits<{
  "update:show": [value: boolean];
  edit: [];
  delete: [];
}>();
</script>

<style>
.ledger-entry-detail { padding: 26px; background: var(--color-bg-card); }
.ledger-entry-detail header { display: flex; align-items: flex-start; justify-content: space-between; }
.ledger-entry-detail header span { color: var(--color-text-secondary); font-size: 13px; }
.ledger-entry-detail h2 { margin: 5px 0 0; font-size: 22px; }
.ledger-entry-detail header p { margin: 6px 0 0; color: var(--color-text-secondary); font-size: 13px; }
.ledger-entry-detail header p em { color: var(--color-primary); font-style: normal; }
.ledger-entry-detail__amount { margin: 26px 0; font-size: 32px; font-weight: 700; }
.ledger-entry-detail__amount.positive { color: var(--color-success); }
.ledger-entry-detail__amount.negative { color: var(--color-danger); }
.ledger-entry-detail dl { margin: 0; border-top: 1px solid var(--color-border); }
.ledger-entry-detail dl > div { display: flex; justify-content: space-between; gap: 20px; padding: 13px 0; border-bottom: 1px solid var(--color-border); }
.ledger-entry-detail dt { color: var(--color-text-secondary); }
.ledger-entry-detail dd { margin: 0; text-align: right; }
.ledger-entry-detail footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
</style>
