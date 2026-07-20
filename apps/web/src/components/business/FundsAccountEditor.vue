<template>
  <section class="account-modal">
    <header class="modal-head">
      <div>
        <span>{{ editingAccountId ? "编辑账户" : "添加账户" }}</span>
        <h2>{{ editingAccountId ? "维护账户档案" : "把资金账户统一建档" }}</h2>
        <p>{{ editingAccountId ? "可修改账户类型、名称、余额、额度、账单日和还款日；已有流水的账户不能在资产和负债之间切换。" : "选择账户类型后填写余额、欠款、账单日和还款日。" }}</p>
      </div>
      <button type="button" @click="$emit('close')">×</button>
    </header>

    <div class="account-modal__body">
      <aside class="type-panel">
        <div v-for="group in accountTypeSections" :key="group.title" class="type-group">
          <h4>{{ group.title }}</h4>
          <div class="type-grid">
            <button v-for="item in group.items" :key="item.key" :class="{ active: selectedAccountType.key === item.key }" type="button" :disabled="isAccountTypeDisabled(item)" :title="accountTypeDisabledTitle(item)" @click="$emit('select-type', item)">
              <span :style="{ background: item.color }">{{ item.icon }}</span>
              <small>{{ item.label }}</small>
            </button>
          </div>
        </div>
      </aside>

      <div class="account-form">
        <h3>账户信息</h3>
        <div class="form-grid">
          <label :class="{ invalid: accountErrors.name }"><span>名称 *</span><RInput v-model="accountDraft.name" placeholder="例如 花呗" /><em>{{ accountErrors.name }}</em></label>
          <label><span>备注</span><RInput v-model="accountDraft.note" placeholder="例如 日常消费分期" /></label>
          <label v-if="selectedAccountNeedsBank"><span>所属银行</span><button type="button" class="bank-picker-trigger" @click="$emit('open-bank-picker')"><span v-if="selectedBank" class="bank-picker-trigger__value"><b :style="{ background: selectedBank.color || '#1677ff' }">{{ selectedBank.icon || selectedBank.name.slice(0, 1) }}</b>{{ selectedBank.name }}</span><span v-else class="bank-picker-trigger__placeholder">选择银行</span><span>⌄</span></button></label>
          <div class="account-total-assets-toggle"><span>资产汇总</span><label class="switch-row"><input v-model="accountDraft.includeInTotalAssets" type="checkbox" /> 计入总资产</label><small>关闭后仍保留账户和流水，但不计入总资产与净资产。</small></div>
          <label :class="{ invalid: accountErrors.balance }"><span>{{ selectedAccountType.direction === "liability" ? "当前欠款" : "当前余额" }}</span><RInput v-model="accountDraft.balance" placeholder="1,256.00" /><em>{{ accountErrors.balance }}</em></label>
          <label v-if="selectedAccountIsCredit"><span>总额度</span><RInput v-model="accountDraft.creditLimit" placeholder="5,000.00" /></label>
          <label v-if="selectedAccountIsCredit"><span>出账日</span><RSelect v-model="accountDraft.billDay" :options="dayOptions" placeholder="每月10日" /></label>
          <label v-if="selectedAccountIsCredit"><span>还款日</span><RSelect v-model="accountDraft.repaymentDay" :options="dayOptions" placeholder="每月10日" /></label>
        </div>
        <RInlineFeedback v-if="accountErrors.form" tone="danger">{{ accountErrors.form }}</RInlineFeedback>
        <footer><RButton variant="secondary" @click="$emit('close')">取消</RButton><RButton :loading="savingAccount" @click="$emit('submit')">{{ editingAccountId ? "保存修改" : "保存账户" }}</RButton></footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import RButton from "@/components/ui/RButton.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import type { AccountType, MoneyAccountRecord } from "@/domain/models";

type AccountTypeItem = { key: string; label: string; icon: string; color: string; direction: MoneyAccountRecord["direction"]; requiresBank?: boolean; type: AccountType; group?: "asset" | "credit" | "stored_value" };
type AccountTypeGroup = { title: string; items: AccountTypeItem[] };
type BankItem = { name: string; color?: string; icon?: string };

defineProps<{
  editingAccountId: string | null;
  accountTypeSections: AccountTypeGroup[];
  selectedAccountType: AccountTypeItem;
  selectedAccountIsCredit: boolean;
  selectedAccountNeedsBank: boolean;
  selectedBank: BankItem | null;
  accountDraft: { name: string; note: string; includeInTotalAssets: boolean; balance: string; creditLimit: string; billDay: string | number | null; repaymentDay: string | number | null };
  accountErrors: { name: string; balance: string; form: string };
  dayOptions: Array<{ label: string; value: number }>;
  savingAccount: boolean;
  isAccountTypeDisabled: (item: AccountTypeItem) => boolean;
  accountTypeDisabledTitle: (item: AccountTypeItem) => string;
}>();

defineEmits<{ close: []; submit: []; "select-type": [item: AccountTypeItem]; "open-bank-picker": [] }>();
</script>

<style>
.account-modal { max-height: calc(100dvh - 48px); overflow: auto; background: #fff; }
.modal-head { display: flex; justify-content: space-between; gap: var(--space-6); padding: 24px 28px; color: #fff; background: linear-gradient(135deg, #111827, #2563eb 58%, #60a5fa); }
.modal-head span { font-size: var(--font-caption); font-weight: 800; opacity: .82; }
.modal-head h2 { margin: var(--space-2) 0; }
.modal-head p { margin: 0; opacity: .82; }
.modal-head button { width: 32px; height: 32px; color: #fff; background: rgba(255,255,255,.16); border: 0; border-radius: 50%; cursor: pointer; }
.account-modal__body { display: grid; grid-template-columns: 360px 1fr; min-height: 500px; }
.type-panel { display: grid; gap: var(--space-4); align-content: start; padding: var(--space-5); background: #f8fbff; border-right: 1px solid var(--color-border); }
.type-group h4, .account-form h3 { margin: 0 0 var(--space-3); }
.type-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
.type-grid button { display: grid; justify-items: center; gap: var(--space-2); min-height: 62px; padding: var(--space-2); background: transparent; border: 1px solid transparent; border-radius: 12px; cursor: pointer; }
.type-grid button.active { background: #eef5ff; border-color: var(--color-primary); }
.type-grid button:disabled { cursor: not-allowed; opacity: .72; }
.type-grid span { display: grid; width: 32px; height: 32px; place-items: center; color: #fff; border-radius: 50%; font-size: 11px; font-weight: 800; }
.account-form { padding: var(--space-5); }
.account-form .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.account-form .form-grid label { display: grid; grid-template-rows: auto auto 16px; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.account-form .form-grid label.invalid { color: var(--color-danger); }
.account-form .form-grid em { min-height: 16px; color: var(--color-danger); font-style: normal; line-height: 16px; }
.bank-picker-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 40px; padding: 0 12px; color: var(--color-text-primary); background: #fff; border: 1px solid var(--color-border); border-radius: 10px; cursor: pointer; text-align: left; }
.bank-picker-trigger:hover { border-color: var(--color-primary); }
.bank-picker-trigger__value { display: flex; align-items: center; gap: 8px; }
.bank-picker-trigger__value b { display: grid; width: 28px; height: 28px; place-items: center; overflow: hidden; color: #fff; border-radius: 8px; font-size: 12px; font-weight: 800; }
.bank-picker-trigger__placeholder { color: var(--color-text-muted); }
.account-total-assets-toggle { display: grid; grid-column: 1 / -1; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.account-total-assets-toggle .switch-row { display: flex; align-items: center; gap: var(--space-2); color: var(--color-text-primary); font-weight: 700; }
.account-total-assets-toggle .switch-row input { accent-color: var(--color-primary); }
.account-total-assets-toggle small { color: var(--color-text-tertiary); font-weight: 500; }
.account-form footer { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); }
@media (max-width: 1100px) { .account-modal__body { grid-template-columns: 1fr; } }
</style>
