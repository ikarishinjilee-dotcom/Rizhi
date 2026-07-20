<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :bordered="false"
    :closable="false"
    :mask-closable="false"
    class="rizhi-ledger-modal-card"
    content-style="padding: 0;"
    :style="{ width: 'min(860px, calc(100vw - 48px))', height: 'min(720px, calc(100dvh - 48px))', maxHeight: 'calc(100dvh - 48px)', borderRadius: '18px', overflow: 'hidden' }"
  >
    <section class="ledger-modal" :class="{ income: draftType === 'income', transfer: draftType === 'transfer' }">
      <header class="ledger-modal__hero">
        <div>
          <div class="ledger-modal__tabs"><button type="button" :class="{ active: draftType === 'expense' }" @click="$emit('switch-draft-type', 'expense')">支出</button><button type="button" :class="{ active: draftType === 'income' }" @click="$emit('switch-draft-type', 'income')">收入</button><button type="button" :class="{ active: draftType === 'transfer' }" @click="$emit('switch-draft-type', 'transfer')">转账</button></div>
          <span>{{ draftType === "income" ? "Income" : draftType === "transfer" ? "Transfer" : "Expense" }}</span>
          <h2>{{ draftType === "income" ? "记录一笔收入" : draftType === "transfer" ? "记录一次账户转账" : "记录一笔日常支出" }}</h2>
          <p>{{ draftType === "income" ? "收入会增加所选账户余额。" : draftType === "transfer" ? "转账会生成转出和转入两条账户流水。" : "支出会减少现金账户余额，或增加信用/负债账户欠款。" }}</p>
        </div>
        <button type="button" @click="$emit('close')">×</button>
      </header>
      <div class="ledger-modal__body"><slot /></div>
      <footer class="ledger-modal__footer">
        <RButton variant="secondary" @click="$emit('close')">取消</RButton>
        <RButton :variant="draftType === 'income' ? 'primary' : 'danger'" :loading="saving" @click="$emit('save')">
          {{ draftType === "income" ? "保存收入" : draftType === "transfer" ? "确认转账" : "保存支出" }}
        </RButton>
      </footer>
    </section>
  </n-modal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import RButton from "@/components/ui/RButton.vue";

const visible = defineModel<boolean>({ required: true });
defineProps<{ draftType: "expense" | "income" | "transfer"; saving: boolean }>();
defineEmits<{
  close: [];
  save: [];
  "switch-draft-type": [type: "expense" | "income" | "transfer"];
}>();
</script>

<style scoped>
.ledger-modal { display: flex; flex-direction: column; width: 100%; height: 100%; max-height: calc(100dvh - 48px); overflow: hidden; background: var(--color-bg-card); }
.ledger-modal__hero { display: flex; flex: 0 0 auto; justify-content: space-between; gap: var(--space-6); padding: 28px 32px; color: #fff; background: radial-gradient(circle at 84% 18%, rgba(255, 255, 255, 0.25), transparent 26%), linear-gradient(135deg, #f04438, #ff776d); }
.ledger-modal.income .ledger-modal__hero { background: radial-gradient(circle at 84% 18%, rgba(255, 255, 255, 0.25), transparent 26%), linear-gradient(135deg, #0f9f6e, #16a36a); }
.ledger-modal.transfer .ledger-modal__hero { background: radial-gradient(circle at 84% 18%, rgba(255, 255, 255, 0.25), transparent 26%), linear-gradient(135deg, #356fe8, #5b8ff5); }
.ledger-modal__hero span { font-size: var(--font-caption); font-weight: 800; opacity: 0.86; text-transform: uppercase; }
.ledger-modal__hero h2 { margin: var(--space-2) 0; font-size: 24px; }
.ledger-modal__hero p { margin: 0; opacity: 0.85; }
.ledger-modal__hero > button { width: 32px; height: 32px; color: #fff; background: rgba(255, 255, 255, 0.16); border: 0; border-radius: 50%; cursor: pointer; }
.ledger-modal__body { display: grid; flex: 1 1 auto; min-height: 0; overflow-y: auto; grid-template-columns: 250px 1fr; gap: var(--space-6); overflow: auto; height: 0; padding: 28px 32px; }
.ledger-modal__footer { display: flex; flex: 0 0 auto; justify-content: flex-end; gap: var(--space-3); padding: 20px 32px; background: var(--color-bg-hover); border-top: 1px solid var(--color-border); }
.ledger-modal__tabs { display: inline-flex; gap: 4px; width: fit-content; margin-bottom: 16px; padding: 4px; background: rgba(0,0,0,.12); border-radius: 999px; }
.ledger-modal__tabs button { width: auto; min-width: 62px; height: 32px; padding: 0 14px; color: rgba(255,255,255,.82); background: transparent; border: 0; border-radius: 999px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 700; line-height: 32px; white-space: nowrap; }
.ledger-modal__tabs button.active { color: var(--color-text-primary); background: #fff; box-shadow: 0 2px 8px rgba(15, 23, 42, .14); }
.ledger-modal.transfer .ledger-form { align-content: start; }
.ledger-modal.transfer .form-section { padding-bottom: 0; border-bottom: 0; }
.ledger-modal .hidden-file { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
</style>
