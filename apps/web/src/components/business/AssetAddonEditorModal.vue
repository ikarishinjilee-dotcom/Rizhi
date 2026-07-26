<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" data-testid="asset-addon-modal">
      <section class="addon-dialog" role="dialog" aria-modal="true" aria-labelledby="addon-dialog-title">
        <header class="modal-hero">
          <div>
            <span>{{ editingAddonId ? "编辑附加项" : "资产附加项" }}</span>
            <h2 id="addon-dialog-title">{{ editingAddonId ? "调整附加项信息和图片" : `给「${assetName}」记录一笔附加项` }}</h2>
            <p>附加项支持支出和收入：新买 CPU 是支出，卖掉旧 CPU 是收入。保存后会同步资产档案和记账流水。</p>
          </div>
          <button type="button" aria-label="关闭" data-testid="asset-addon-close" @click="$emit('close')"><X :size="16" :stroke-width="2" /></button>
        </header>

        <div class="addon-dialog__body">
          <aside class="addon-uploader">
            <div class="addon-uploader__preview">
              <img v-if="addonDraft.imageUrl || addonDraft.imageUrls[0]" :src="addonDraft.imageUrl || addonDraft.imageUrls[0]" :alt="addonDraft.name || '附加项图片'" />
              <span v-else>{{ addonDraft.name.slice(0, 1) || "附" }}</span>
            </div>
            <strong>附加项图片</strong>
            <p>可上传配件实拍、购物凭证或维修单。多张图片会在详情页中展示。</p>
            <input ref="addonFileInput" class="hidden-file" data-testid="addon-image-input" type="file" accept="image/*" multiple @change="$emit('select-images', $event)" />
            <RButton variant="secondary" @click="addonFileInput?.click()">上传图片</RButton>
            <div v-if="addonDraft.imageUrls.length" class="addon-image-list">
              <button v-for="(image, index) in addonDraft.imageUrls" :key="`${image.slice(0, 24)}-${index}`" :class="{ active: addonDraft.imageUrl === image }" type="button" @click="addonDraft.imageUrl = image">
                <img :src="image" :alt="`附加项图片 ${index + 1}`" />
                <span data-testid="addon-image-remove" aria-label="删除图片" @click.stop="$emit('remove-image', index)"><X :size="14" /></span>
              </button>
            </div>
          </aside>

          <div class="addon-form">
            <section class="addon-section">
              <h3>收支方向</h3>
              <div class="addon-direction-grid">
                <button type="button" :class="{ active: addonDraft.direction === 'expense' }" @click="$emit('set-direction', 'expense')"><strong>支出</strong><span>新买配件、维修、升级，减少付款账户余额。</span></button>
                <button type="button" :class="{ active: addonDraft.direction === 'income' }" @click="$emit('set-direction', 'income')"><strong>收入</strong><span>卖掉旧配件、订阅分摊回款，增加收款账户余额。</span></button>
              </div>
            </section>
            <section class="addon-section">
              <h3>{{ addonDraft.direction === "income" ? "收入类型" : "附加项类型" }}</h3>
              <div class="addon-type-grid"><button v-for="option in currentAddonTypeOptions" :key="option.value" :class="{ active: addonDraft.type === option.value }" type="button" @click="addonDraft.type = option.value"><strong>{{ option.label }}</strong><span>{{ option.hint }}</span></button></div>
            </section>
            <section class="addon-section">
              <h3>{{ addonDraft.direction === "income" ? "收入信息" : "购买信息" }}</h3>
              <div class="addon-form-grid">
                <label :class="{ invalid: addonErrors.name }"><span>附加项名称</span><RInput data-testid="addon-name-field" v-model="addonDraft.name" :placeholder="addonDraft.direction === 'income' ? '例如 卖出旧 CPU' : '例如 透明手机壳'" /><em>{{ addonErrors.name }}</em></label>
                <label :class="{ invalid: addonErrors.amount }"><span>金额</span><RInput data-testid="addon-amount-field" v-model="addonDraft.amount" placeholder="¥ 0.00" /><em>{{ addonErrors.amount }}</em></label>
                <label :class="{ invalid: addonErrors.purchaseDate }"><span>{{ addonDraft.direction === "income" ? "收入日期" : "购买日期" }}</span><RDatePicker v-model="addonDraft.purchaseDate" placeholder="选择日期" /><em>{{ addonErrors.purchaseDate }}</em></label>
                <label :class="{ invalid: addonErrors.accountId }"><span>{{ addonDraft.direction === "income" ? "收款账户" : "付款账户" }}</span><button type="button" class="addon-account-picker-trigger" @click="showAccountPicker = true"><span>{{ selectedAccountLabel }}</span><ChevronDown :size="16" /></button><em>{{ addonErrors.accountId }}</em></label>
                <label class="wide-field"><span>备注</span><RInput v-model="addonDraft.note" :placeholder="addonDraft.direction === 'income' ? '例如 闲鱼卖出旧 CPU，主机继续使用' : '例如 官方配件、透明壳、线下维修'" /></label>
              </div>
            </section>
            <RInlineFeedback v-if="addonErrors.form" tone="danger">{{ addonErrors.form }}</RInlineFeedback>
            <section class="addon-rule-card" :class="{ 'income-rule': addonDraft.direction === 'income' }">
              <label class="addon-switch"><input v-model="addonDraft.includedInCost" type="checkbox" /><strong>计入资产成本</strong></label>
              <p>{{ addonDraft.direction === "income" ? (addonDraft.includedInCost ? "这笔收入会增加账户余额，同时冲减资产总成本。" : "这笔收入会增加账户余额，但不改变资产总成本。") : (addonDraft.includedInCost ? "这笔金额会进入资产总成本，并影响日均成本。" : "这笔记录只进入记账流水，不改变资产成本。") }}</p>
            </section>
          </div>
        </div>
        <footer class="modal-footer"><RButton data-testid="asset-addon-cancel" variant="secondary" @click="$emit('close')">取消</RButton><RButton data-testid="asset-addon-save" :loading="savingAddon" @click="$emit('save')">{{ editingAddonId ? "保存修改" : "保存附加项" }}</RButton></footer>
      </section>
    </div>
  </Teleport>
  <LedgerAccountPickerModal v-model="showAccountPicker" :title="addonDraft.direction === 'income' ? '收款账户' : '付款账户'" target="from" :selected-id="addonDraft.accountId" :sections="accountPickerSections" :balance="accountBalanceLabel" @select="selectPaymentAccount" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ChevronDown, X } from "@lucide/vue";
import LedgerAccountPickerModal from "@/components/business/LedgerAccountPickerModal.vue";
import RButton from "@/components/ui/RButton.vue";
import RDatePicker from "@/components/ui/RDatePicker.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import type { AssetAddonRecord, CategoryRecord, MoneyAccountRecord } from "@/domain/models";
import { loadSystemBankCategories, resolveBankIcon } from "@/services/bankIconService";
import { useAppDataStore } from "@/stores/appDataStore";

export type AddonTypeOption = { label: string; value: AssetAddonRecord["type"]; hint: string };
const props = defineProps<{
  show: boolean; assetName: string; editingAddonId: string | null;
  addonDraft: { name: string; direction: NonNullable<AssetAddonRecord["direction"]>; type: AssetAddonRecord["type"]; amount: string; purchaseDate: number | null; accountId: string | number | null; includedInCost: boolean; note: string; imageUrl: string; imageUrls: string[] };
  addonErrors: { name: string; amount: string; purchaseDate: string; accountId: string; form: string };
  currentAddonTypeOptions: AddonTypeOption[]; accountOptions: Array<{ label: string; value: string | number }>; savingAddon: boolean;
}>();
defineEmits<{ close: []; save: []; "set-direction": [direction: NonNullable<AssetAddonRecord["direction"]>]; "select-images": [event: Event]; "remove-image": [index: number] }>();
const addonFileInput = ref<HTMLInputElement | null>(null);
const store = useAppDataStore();
const showAccountPicker = ref(false);
const systemBankItems = ref<CategoryRecord[]>([]);
const bankCategories = computed(() => systemBankItems.value.length ? systemBankItems.value : store.categories.filter((category) => category.domain === "bank" && category.enabled !== false && !category.deletedAt));
const accountWithBankIcon = (account: MoneyAccountRecord) => ({ ...account, iconUrl: resolveBankIcon(account, bankCategories.value) ?? account.iconUrl });
const accountPickerSections = computed(() => {
  const configured = store.categories.filter((category) => category.domain === "account" && category.enabled !== false && !category.deletedAt).sort((a, b) => a.sort - b.sort);
  if (!configured.length) return [{ key: "asset", title: "资产账户", accounts: store.activeAccounts.filter((a) => a.direction === "asset") }, { key: "liability", title: "信用账户", accounts: store.activeAccounts.filter((a) => a.direction === "liability") }].filter((s) => s.accounts.length).map((s) => ({ ...s, accounts: s.accounts.map(accountWithBankIcon) }));
  const included = new Set<string>();
  const sections = configured.map((category) => { const accounts = store.activeAccounts.filter((a) => a.accountTypeId === category.id); accounts.forEach((a) => included.add(String(a.id))); return { key: String(category.id), title: category.name, accounts }; }).filter((s) => s.accounts.length);
  const remaining = store.activeAccounts.filter((a) => !included.has(String(a.id))); if (remaining.length) sections.push({ key: "other", title: "其他账户", accounts: remaining });
  return sections.map((s) => ({ ...s, accounts: s.accounts.map(accountWithBankIcon) }));
});
const selectedAccountLabel = computed(() => { const account = store.accounts.find((a) => a.id === props.addonDraft.accountId); if (!account) return props.addonDraft.direction === "income" ? "选择收款账户" : "选择付款账户"; const descriptor = account.bankName || account.institution || account.note; return descriptor && descriptor !== account.name ? `${account.name} · ${descriptor}` : account.name; });
function accountBalanceLabel(account: { balance: number; direction: string }) { return `${account.direction === "liability" ? "当前欠款" : "当前余额"} ¥${account.balance.toFixed(2)}`; }
function selectPaymentAccount(id: string | number | null) { props.addonDraft.accountId = id; showAccountPicker.value = false; }
onMounted(async () => { systemBankItems.value = await loadSystemBankCategories(); });
</script>

<style>
.modal-overlay { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 24px; overflow: auto; background: rgba(15, 23, 42, .46); backdrop-filter: blur(8px); }
.addon-dialog { display: flex; flex-direction: column; width: min(940px, calc(100vw - 48px)); max-height: calc(100dvh - 48px); overflow: hidden; background: var(--color-bg-card); border-radius: 20px; box-shadow: 0 28px 90px rgba(17, 24, 39, .28); }
.modal-hero { display: flex; flex: 0 0 auto; justify-content: space-between; gap: var(--space-6); padding: 28px 32px; color: #fff; background: linear-gradient(135deg, #1d4ed8, #1677ff 52%, #38bdf8); }
.modal-hero span { font-size: var(--font-caption); font-weight: 800; opacity: .86; }.modal-hero h2 { margin: var(--space-2) 0; font-size: 24px; }.modal-hero p { margin: 0; opacity: .86; }.modal-hero button { display: grid; width: 32px; height: 32px; place-items: center; color: #fff; background: rgba(255,255,255,.16); border: 0; border-radius: 50%; cursor: pointer; }
.addon-dialog__body { display: grid; grid-template-columns: 260px 1fr; flex: 1 1 auto; min-height: 0; gap: var(--space-6); overflow-y: auto; padding: 28px 32px; }.addon-uploader { display: grid; align-content: start; gap: var(--space-3); padding: var(--space-4); background: var(--color-bg-hover); border: 1px dashed var(--color-border); border-radius: 14px; }.addon-uploader__preview { display: grid; height: 180px; place-items: center; overflow: hidden; color: var(--color-primary); background: linear-gradient(135deg, var(--color-primary-soft), #fff); border-radius: 14px; font-size: 48px; font-weight: 800; }.addon-uploader__preview img, .addon-image-list img { width: 100%; height: 100%; object-fit: cover; }.addon-uploader p { margin: 0; color: var(--color-text-tertiary); font-size: var(--font-caption); line-height: 1.7; }.hidden-file { display: none; }.addon-image-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }.addon-image-list button { position: relative; height: 46px; padding: 0; overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-md); }.addon-image-list button span { position: absolute; top: 2px; right: 2px; display: grid; width: 16px; height: 16px; place-items: center; color: #fff; background: rgba(17,24,39,.72); border-radius: 50%; }
.addon-form, .addon-section { display: grid; gap: var(--space-4); }.addon-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }.addon-form-grid label { display: grid; grid-template-rows: auto auto 16px; align-content: start; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }.addon-form-grid .wide-field { grid-column: 1 / -1; }.addon-form-grid label em { min-height: 16px; color: var(--color-danger); font-style: normal; }.addon-account-picker-trigger { display: flex; width: 100%; min-height: 38px; align-items: center; justify-content: space-between; gap: var(--space-2); padding: 0 12px; color: var(--color-text-primary); text-align: left; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; }.addon-account-picker-trigger:hover { border-color: var(--color-primary); }.addon-section h3 { margin: 0; font-size: var(--font-card-title); }.addon-direction-grid, .addon-type-grid { display: grid; gap: var(--space-3); }.addon-direction-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.addon-type-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }.addon-direction-grid button, .addon-type-grid button { display: grid; gap: 4px; min-height: 74px; padding: var(--space-3); color: var(--color-text-secondary); text-align: left; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 14px; cursor: pointer; }.addon-direction-grid button.active, .addon-type-grid button.active { color: var(--color-primary); background: var(--color-primary-light); border-color: #8cbcff; }.addon-direction-grid span, .addon-type-grid span { color: var(--color-text-tertiary); font-size: 11px; }.addon-rule-card { padding: var(--space-4); background: linear-gradient(135deg, var(--color-bg-hover), #fff); border: 1px solid var(--color-border); border-radius: 14px; }.addon-rule-card p { margin: var(--space-2) 0 0; color: var(--color-text-secondary); font-size: var(--font-caption); }.addon-switch { display: inline-flex; gap: var(--space-2); align-items: center; color: var(--color-text-primary); }.addon-switch input { width: 16px; height: 16px; accent-color: var(--color-primary); }.modal-footer { display: flex; flex: 0 0 auto; justify-content: flex-end; gap: var(--space-3); padding: 20px 32px; background: var(--color-bg-hover); border-top: 1px solid var(--color-border); }
@media (max-width: 820px) { .addon-dialog { width: calc(100vw - 24px); max-height: calc(100dvh - 24px); }.addon-dialog__body { grid-template-columns: 1fr; padding: 20px; }.addon-type-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.modal-hero { padding: 20px; }.modal-footer { padding: 16px 20px; } }
</style>
