<template>
  <div class="amount-panel" :class="{ invalid: draftErrors.amount }">
    <span>金额</span>
    <div class="amount-input">
      <strong>¥</strong>
      <input v-model="draftAmount" placeholder="0.00" />
    </div>
    <em>{{ draftErrors.amount }}</em>
    <p>{{ draftType === "income" ? "收入会增加所选账户余额。" : draftType === "transfer" ? "金额会从转出账户扣除并转入目标账户。" : "支出会同步写入账户流水。" }}</p>
  </div>

  <div v-if="draftType === 'transfer'" class="ledger-form transfer-form">
    <section class="form-section"><h3>转账信息</h3><div class="form-grid"><label :class="{ invalid: transferErrors.fromAccountId }"><span>转出账户</span><button type="button" class="account-picker-trigger" @click="openAccountPicker('from')"><span>{{ accountPickerAccountName(transferDraft.fromAccountId) }}</span><ChevronDown :size="16" /></button><em>{{ transferErrors.fromAccountId }}</em></label><label :class="{ invalid: transferErrors.toAccountId }"><span>转入账户</span><button type="button" class="account-picker-trigger" @click="openAccountPicker('to')"><span>{{ accountPickerAccountName(transferDraft.toAccountId) }}</span><ChevronDown :size="16" /></button><em>{{ transferErrors.toAccountId }}</em></label><label><span>备注</span><RInput v-model="transferDraft.note" placeholder="例如 支付宝转入微信" /></label></div></section>
    <RInlineFeedback v-if="transferErrors.form" tone="danger">{{ transferErrors.form }}</RInlineFeedback>
  </div>
  <div v-else class="ledger-form">
    <section class="form-section">
      <h3>交易信息</h3>
      <div class="form-grid">
        <label :class="{ invalid: draftErrors.date }"><span>发生日期</span><RDatePicker v-model="transactionDate" type="datetime" placeholder="选择日期时间" /><em>{{ draftErrors.date }}</em></label>
        <label class="category-field" :class="{ invalid: draftErrors.categoryId }"><span>分类</span><div class="ledger-category-picker"><button v-for="category in currentRootCategories" :key="category.id" type="button" :class="{ active: draftCategoryId === category.id }" @click="selectTransactionRootCategory(category.id)"><img v-if="category.iconUrl" :src="category.iconUrl" alt="" /><i v-else>{{ categoryIconText(category) }}</i>{{ categoryDisplayName(category.id, category.name) }}</button></div><em>{{ draftErrors.categoryId }}</em></label>
        <label v-if="currentSubCategories.length" class="category-field"><span>子分类</span><div class="ledger-category-picker ledger-category-picker--children"><button v-for="category in currentSubCategories" :key="category.id" type="button" :class="{ active: draftSubCategoryId === category.id }" @click="draftSubCategoryId = category.id"><img v-if="category.iconUrl" :src="category.iconUrl" alt="" /><i v-else>{{ categoryIconText(category) }}</i>{{ categoryDisplayName(category.id, category.name) }}</button><button type="button" :class="{ active: !draftSubCategoryId || draftSubCategoryId === 'none' }" @click="draftSubCategoryId = 'none'">不选择子分类</button></div></label>
        <label :class="{ invalid: draftErrors.accountId }"><span>{{ draftType === "income" ? "收款账户" : "付款账户" }}</span><button type="button" class="account-picker-trigger" @click="openAccountPicker('draft')"><span>{{ accountPickerAccountName(draftAccountId) }}</span><ChevronDown :size="16" /></button><em>{{ draftErrors.accountId }}</em></label>
        <label><span>{{ draftType === "income" ? "来源" : "商家" }}</span><RInput v-model="draftMerchant" :placeholder="draftType === 'income' ? '例如 工资 / 副业' : '例如 麦当劳 / 京东'" /></label>
      </div>
    </section>

    <section v-if="draftType === 'expense'" class="form-section">
      <h3>资产关联（可选）</h3>
      <div class="asset-link-box" :class="{ invalid: draftErrors.assetId }">
        <RSelect v-model="draftAssetId" :options="assetCreateOptions" placeholder="选择已有资产" />
        <RInput v-model="assetSearchQuery" placeholder="搜索资产名称、品牌或型号" />
        <div v-if="assetSearchQuery.trim()" class="asset-search-results">
          <button v-for="asset in assetSearchResults" :key="asset.id" type="button" :class="{ active: draftAssetId === asset.id }" @click="draftAssetId = asset.id; assetSearchQuery = asset.name">
            <strong>{{ asset.name }}</strong><span>{{ [asset.brand, asset.model].filter(Boolean).join(' / ') || '未填写规格' }}</span>
          </button>
          <span v-if="!assetSearchResults.length" class="asset-search-empty">没有找到匹配资产</span>
        </div>
        <div v-else-if="draftAssetId" class="asset-selected-hint">已选择：{{ selectedAssetName }}</div>
        <em>{{ draftErrors.assetId }}</em>
        <div class="link-options">
          <label><input v-model="assetLinkMode" type="radio" value="related" /> 仅作为相关支出</label>
          <label><input v-model="assetLinkMode" type="radio" value="addon-included" /> 作为附加项并计入资产成本</label>
          <label><input v-model="assetLinkMode" type="radio" value="addon-excluded" /> 作为附加项但不计入成本</label>
        </div>
      </div>
    </section>

    <section class="form-section">
      <h3>备注与凭证</h3>
      <RInput v-model="draftNote" placeholder="添加备注，例如订单号、用途、说明" />
      <input ref="receiptFileInput" class="hidden-file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" @change="$emit('select-receipt', $event)" />
      <button type="button" class="receipt-box" @click="receiptFileInput?.click()">＋ {{ draftReceiptName || '上传凭证' }}</button>
    </section>
    <RInlineFeedback v-if="draftErrors.form" tone="danger">{{ draftErrors.form }}</RInlineFeedback>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ChevronDown } from "@lucide/vue";
import RDatePicker from "@/components/ui/RDatePicker.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import type { AssetRecord, CategoryRecord, TransactionType } from "@/domain/models";

const draftAmount = defineModel<string>("draftAmount", { required: true });
const draftCategoryId = defineModel<string | number | null>("draftCategoryId", { required: true });
const draftSubCategoryId = defineModel<string | number | null>("draftSubCategoryId", { required: true });
const draftAccountId = defineModel<string | number | null>("draftAccountId", { required: true });
const draftAssetId = defineModel<string | number | null>("draftAssetId", { required: true });
const assetSearchQuery = defineModel<string>("assetSearchQuery", { required: true });
const draftMerchant = defineModel<string>("draftMerchant", { required: true });
const draftNote = defineModel<string>("draftNote", { required: true });
const assetLinkMode = defineModel<"related" | "addon-included" | "addon-excluded">("assetLinkMode", { required: true });
const transactionDate = defineModel<number | null>("transactionDate", { required: true });
const transferDraft = defineModel<{ fromAccountId: string | number | null; toAccountId: string | number | null; note: string }>("transferDraft", { required: true });

const props = defineProps<{
  draftType: "expense" | "income" | "transfer";
  draftErrors: { amount: string; date: string; categoryId: string; accountId: string; assetId: string; form: string };
  transferErrors: { fromAccountId: string; toAccountId: string; form: string };
  currentRootCategories: CategoryRecord[];
  currentSubCategories: CategoryRecord[];
  assetCreateOptions: Array<{ label: string; value: string | number }>;
  assetSearchResults: AssetRecord[];
  selectedAssetName: string;
  draftReceiptName: string;
  openAccountPicker: (target: "draft" | "from" | "to") => void;
  accountPickerAccountName: (accountId: string | number | null) => string;
  selectTransactionRootCategory: (id: string | number) => void;
  categoryDisplayName: (id: string | number, fallback: string) => string;
  categoryIconText: (category: { icon?: string; name: string }) => string;
}>();

defineEmits<{ "select-receipt": [event: Event] }>();
const receiptFileInput = ref<HTMLInputElement | null>(null);
</script>

<style>
.amount-panel { display: grid; align-content: start; gap: var(--space-3); padding: var(--space-5); background: var(--color-bg-hover); border: 1px solid var(--color-border); border-radius: 14px; }
.amount-panel span { color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.amount-input { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-4); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.amount-input strong { color: var(--color-text-primary); font-size: 26px; }
.amount-input input { min-width: 0; width: 100%; border: 0; outline: 0; font-size: 30px; font-weight: 800; }
.amount-panel p { margin: 0; color: var(--color-text-tertiary); font-size: var(--font-caption); line-height: 1.7; }
.ledger-form, .form-section { display: grid; gap: var(--space-4); }
.form-section { padding-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); }
.form-section:last-child { padding-bottom: 0; border-bottom: 0; }
.form-section h3 { margin: 0; font-size: var(--font-card-title); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 10px var(--space-4); }
.form-grid label { display: grid; grid-template-rows: auto auto 16px; align-content: start; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.form-grid label.invalid, .asset-link-box.invalid, .amount-panel.invalid { color: var(--color-danger); }
.form-grid label.invalid .n-input, .form-grid label.invalid .n-base-selection, .asset-link-box.invalid .n-base-selection, .amount-panel.invalid .amount-input { border-color: var(--color-danger); box-shadow: 0 0 0 2px rgba(240, 68, 56, 0.08); }
.form-grid label em, .asset-link-box em, .amount-panel em { min-height: 16px; color: var(--color-danger); font-style: normal; font-weight: 600; line-height: 16px; }
.asset-link-box { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); padding: var(--space-4); background: var(--color-primary-soft); border-radius: var(--radius-lg); }
.link-options { display: grid; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); }
.receipt-box { display: grid; width: 100%; height: 60px; padding: 0; place-items: center; color: var(--color-text-tertiary); font: inherit; background: var(--color-bg-hover); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg); cursor: pointer; }
.asset-link-box > .r-select, .asset-link-box > .r-input { min-width: 0; }
.asset-link-box > .asset-search-results, .asset-link-box > .asset-search-empty, .asset-link-box > .asset-selected-hint, .asset-link-box > em, .asset-link-box > .link-options { grid-column: 1 / -1; }
.asset-search-results { display: grid; max-height: 190px; margin-top: 8px; overflow-y: auto; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 10px; }
.asset-search-results button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 9px 12px; color: var(--color-text-primary); background: transparent; border: 0; border-bottom: 1px solid var(--color-border); cursor: pointer; text-align: left; }
.asset-search-results button:last-of-type { border-bottom: 0; }
.asset-search-results button:hover, .asset-search-results button.active { background: var(--color-primary-light); }
.asset-search-results button span, .asset-search-empty, .asset-selected-hint { color: var(--color-text-tertiary); font-size: var(--font-caption); }
.asset-search-empty { padding: 12px; }
.asset-selected-hint { margin-top: 8px; }
.form-grid label.category-field { display: block; grid-column: 1 / -1; align-self: start; }
.ledger-category-picker { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
.ledger-category-picker button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 4px 10px; color: var(--color-text-secondary); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; }
.ledger-category-picker button.active { color: var(--color-primary); background: var(--color-primary-light); border-color: #bbd5ff; font-weight: 700; }
.ledger-category-picker button img, .ledger-category-picker button i { display: grid; width: 20px; height: 20px; place-items: center; border-radius: 6px; font-size: 11px; font-style: normal; object-fit: cover; }
.ledger-category-picker--children { padding-left: 10px; border-left: 2px solid var(--color-primary-light); }
.receipt-box:hover { color: var(--color-primary); border-color: var(--color-primary); background: #f4f8ff; }
.account-picker-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 42px; padding: 0 12px; color: var(--color-text-primary); background: #fff; border: 1px solid var(--color-border); border-radius: 10px; cursor: pointer; font: inherit; text-align: left; }
.account-picker-trigger:hover { border-color: var(--color-primary); }
.account-picker-trigger > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-picker-trigger svg { flex: 0 0 auto; color: var(--color-text-tertiary); }
</style>
