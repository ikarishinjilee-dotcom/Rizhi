<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay">
      <section class="transfer-dialog" data-testid="asset-transfer-modal" role="dialog" aria-modal="true" aria-labelledby="asset-transfer-title">
        <header class="modal-hero modal-hero--green">
          <div><span>资产转让</span><h2 id="asset-transfer-title">记录这件物品离开你的时刻</h2><p>保存后会把资产标记为已转让，并生成一条收入记录。</p></div>
          <button type="button" aria-label="关闭" @click="$emit('close')">×</button>
        </header>
        <div class="transfer-dialog__body">
          <aside class="transfer-summary"><span>资产总成本</span><strong>{{ formatAmount(totalCost) }}</strong><p>转让金额会作为当前估值，用于计算最终收益或损失。</p></aside>
          <div class="transfer-form">
            <label :class="{ invalid: transferErrors.amount }"><span>转让金额</span><RInput v-model="transferDraft.amount" placeholder="例如 5000" /><em>{{ transferErrors.amount }}</em></label>
            <label :class="{ invalid: transferErrors.date }"><span>转让日期</span><RDatePicker v-model="transferDraft.date" placeholder="选择日期" /><em>{{ transferErrors.date }}</em></label>
            <label :class="{ invalid: transferErrors.accountId }"><span>收款账户</span><RSelect v-model="transferDraft.accountId" :options="accountOptions" placeholder="选择收款账户" /><em>{{ transferErrors.accountId }}</em></label>
            <label class="wide-field"><span>备注</span><RInput v-model="transferDraft.note" placeholder="例如 闲鱼卖出 / 送给朋友 / 折价处理" /></label>
          </div>
        </div>
        <RInlineFeedback v-if="transferErrors.form" class="transfer-form-error" tone="danger">{{ transferErrors.form }}</RInlineFeedback>
        <footer class="modal-footer"><RButton variant="secondary" @click="$emit('close')">取消</RButton><RButton :loading="saving" @click="$emit('save')">确认转让</RButton></footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import RButton from "@/components/ui/RButton.vue";
import RDatePicker from "@/components/ui/RDatePicker.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";

defineProps<{
  show: boolean;
  totalCost: number;
  transferDraft: { amount: string; date: number | null; accountId: string | number | null; note: string };
  transferErrors: { amount: string; date: string; accountId: string; form: string };
  accountOptions: Array<{ label: string; value: string | number }>;
  saving: boolean;
  formatAmount: (amount: number) => string;
}>();

defineEmits<{
  close: [];
  save: [];
}>();
</script>

<style>
.transfer-dialog { width: min(760px, calc(100vw - 48px)); display: flex; flex-direction: column; max-height: calc(100dvh - 48px); overflow: hidden; background: var(--color-bg-card); border: 1px solid rgba(255, 255, 255, 0.46); border-radius: 20px; box-shadow: 0 28px 90px rgba(17, 24, 39, 0.28); }
.transfer-dialog__body { display: grid; grid-template-columns: 220px 1fr; flex: 1 1 auto; min-height: 0; gap: var(--space-6); overflow: auto; padding: 28px 32px; }
.transfer-summary { display: grid; align-content: start; gap: var(--space-4); padding: var(--space-4); background: var(--color-bg-hover); border: 1px solid var(--color-border); border-radius: 14px; }
.transfer-summary span { display: block; color: var(--color-text-tertiary); font-size: var(--font-caption); }
.transfer-summary strong { display: block; color: var(--color-text-primary); font-size: 24px; }
.transfer-summary p { margin: 0; color: var(--color-text-tertiary); font-size: var(--font-caption); line-height: 1.7; }
.transfer-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: var(--space-4); }
.transfer-form label { display: grid; grid-template-rows: auto auto 16px; align-content: start; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.transfer-form .wide-field { grid-column: 1 / -1; }
.transfer-form label.invalid { color: var(--color-danger); }
.transfer-form label.invalid .n-input, .transfer-form label.invalid .n-base-selection { border-color: var(--color-danger); box-shadow: 0 0 0 2px rgba(240, 68, 56, 0.08); }
.transfer-form label em { min-height: 16px; color: var(--color-danger); font-style: normal; font-weight: 600; line-height: 16px; }
.transfer-form-error { margin: 16px 32px 0; padding: var(--space-3) var(--space-4); color: var(--color-danger); background: #fff1f0; border: 1px solid #ffccc7; border-radius: var(--radius-lg); font-size: var(--font-caption); font-weight: 700; }

@media (max-width: 760px) {
  .transfer-dialog { width: calc(100vw - 24px); max-height: calc(100dvh - 24px); }
  .transfer-dialog__body { grid-template-columns: 1fr; padding: 20px; }
  .transfer-form-error { margin: 16px 20px 0; }
}
</style>
