<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay">
      <section class="addon-dialog" data-testid="asset-addon-modal" role="dialog" aria-modal="true" aria-labelledby="addon-dialog-title">
        <header class="modal-hero">
          <div><span>{{ editingAddonId ? "编辑附加项" : "资产附加项" }}</span><h2 id="addon-dialog-title">{{ editingAddonId ? "调整附加项信息和图片" : `给「${assetName}」记录一笔附加项` }}</h2><p>附加项支持支出和收入：新买 CPU 是支出，卖掉旧 CPU 是收入。保存后会同步资产档案和记账流水。</p></div>
          <button type="button" data-testid="asset-addon-close" aria-label="关闭" @click="$emit('close')">×</button>
        </header>

        <div class="addon-dialog__body">
          <aside class="addon-uploader">
            <div class="addon-uploader__preview"><img v-if="addonDraft.imageUrl || addonDraft.imageUrls[0]" :src="addonDraft.imageUrl || addonDraft.imageUrls[0]" :alt="addonDraft.name || '附加项图片'" /><span v-else>{{ addonDraft.name.slice(0, 1) || "附" }}</span></div>
            <strong>附加项图片</strong><p>可上传配件实拍、购物凭证或维修单。多张图片会在详情页中展示。</p>
            <input ref="addonFileInput" data-testid="addon-image-input" class="hidden-file" type="file" accept="image/*" multiple @change="$emit('select-images', $event)" />
            <RButton variant="secondary" @click="addonFileInput?.click()">上传图片</RButton>
            <div v-if="addonDraft.imageUrls.length" class="addon-image-list">
              <button v-for="(image, index) in addonDraft.imageUrls" :key="`${image.slice(0, 24)}-${index}`" :class="{ active: addonDraft.imageUrl === image }" type="button" @click="addonDraft.imageUrl = image"><img :src="image" :alt="`附加项图片 ${index + 1}`" /><span data-testid="addon-image-remove" @click.stop="$emit('remove-image', index)">×</span></button>
            </div>
          </aside>

          <div class="addon-form">
            <section class="addon-section"><h3>收支方向</h3><div class="addon-direction-grid"><button type="button" :class="{ active: addonDraft.direction === 'expense' }" @click="$emit('set-direction', 'expense')"><strong>支出</strong><span>新买配件、维修、升级，减少付款账户余额。</span></button><button type="button" :class="{ active: addonDraft.direction === 'income' }" @click="$emit('set-direction', 'income')"><strong>收入</strong><span>卖掉旧配件、订阅分摊回款，增加收款账户余额。</span></button></div></section>
            <section class="addon-section"><h3>{{ addonDraft.direction === "income" ? "收入类型" : "附加项类型" }}</h3><div class="addon-type-grid"><button v-for="option in currentAddonTypeOptions" :key="option.value" :class="{ active: addonDraft.type === option.value }" type="button" @click="addonDraft.type = option.value"><strong>{{ option.label }}</strong><span>{{ option.hint }}</span></button></div></section>
            <section class="addon-section"><h3>{{ addonDraft.direction === "income" ? "收入信息" : "购买信息" }}</h3><div class="addon-form-grid">
              <label :class="{ invalid: addonErrors.name }"><span>附加项名称</span><RInput v-model="addonDraft.name" data-testid="addon-name-field" :placeholder="addonDraft.direction === 'income' ? '例如 卖出旧 CPU' : '例如 透明手机壳'" /><em>{{ addonErrors.name }}</em></label>
              <label :class="{ invalid: addonErrors.amount }"><span>金额</span><RInput v-model="addonDraft.amount" data-testid="addon-amount-field" placeholder="¥ 0.00" /><em>{{ addonErrors.amount }}</em></label>
              <label :class="{ invalid: addonErrors.purchaseDate }"><span>{{ addonDraft.direction === "income" ? "收入日期" : "购买日期" }}</span><RDatePicker v-model="addonDraft.purchaseDate" placeholder="选择日期" /><em>{{ addonErrors.purchaseDate }}</em></label>
              <label :class="{ invalid: addonErrors.accountId }"><span>{{ addonDraft.direction === "income" ? "收款账户" : "付款账户" }}</span><RSelect v-model="addonDraft.accountId" :options="accountOptions" :placeholder="addonDraft.direction === 'income' ? '选择收款账户' : '选择付款账户'" /><em>{{ addonErrors.accountId }}</em></label>
              <label class="wide-field"><span>备注</span><RInput v-model="addonDraft.note" :placeholder="addonDraft.direction === 'income' ? '例如 闲鱼卖出旧 CPU，主机继续使用' : '例如 官方配件、透明壳、线下维修'" /></label>
            </div></section>
            <RInlineFeedback v-if="addonErrors.form" tone="danger">{{ addonErrors.form }}</RInlineFeedback>
            <section class="addon-rule-card" :class="{ 'income-rule': addonDraft.direction === 'income' }"><label class="addon-switch"><input v-model="addonDraft.includedInCost" type="checkbox" /><strong>计入资产成本</strong></label><p>{{ addonDraft.direction === "income" ? addonDraft.includedInCost ? "这笔收入会增加账户余额，同时冲减资产总成本。" : "这笔收入会增加账户余额，但不改变资产总成本。" : addonDraft.includedInCost ? "这笔金额会进入资产总成本，并影响日均成本。" : "这笔记录只进入记账流水，不改变资产成本。" }}</p></section>
          </div>
        </div>
        <footer class="modal-footer"><RButton data-testid="asset-addon-cancel" variant="secondary" @click="$emit('close')">取消</RButton><RButton data-testid="asset-addon-save" :loading="savingAddon" @click="$emit('save')">{{ editingAddonId ? "保存修改" : "保存附加项" }}</RButton></footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RButton from "@/components/ui/RButton.vue";
import RDatePicker from "@/components/ui/RDatePicker.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import type { AssetAddonRecord } from "@/domain/models";

export type AddonTypeOption = { label: string; value: AssetAddonRecord["type"]; hint: string };

defineProps<{
  show: boolean;
  assetName: string;
  editingAddonId: string | null;
  addonDraft: { name: string; direction: NonNullable<AssetAddonRecord["direction"]>; type: AssetAddonRecord["type"]; amount: string; purchaseDate: number | null; accountId: string | number | null; includedInCost: boolean; note: string; imageUrl: string; imageUrls: string[] };
  addonErrors: { name: string; amount: string; purchaseDate: string; accountId: string; form: string };
  currentAddonTypeOptions: AddonTypeOption[];
  accountOptions: Array<{ label: string; value: string | number }>;
  savingAddon: boolean;
}>();

defineEmits<{
  close: [];
  save: [];
  "set-direction": [direction: NonNullable<AssetAddonRecord["direction"]>];
  "select-images": [event: Event];
  "remove-image": [index: number];
}>();

const addonFileInput = ref<HTMLInputElement | null>(null);
</script>

<style>
.modal-overlay { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 24px; overflow: auto; background: rgba(15, 23, 42, 0.46); backdrop-filter: blur(8px); }
.modal-overlay .v-binder-follower-container, .modal-overlay .n-date-panel, body > .v-binder-follower-container:has(.n-date-panel) { z-index: 3600 !important; }
.addon-dialog { display: flex; flex-direction: column; width: min(940px, calc(100vw - 48px)); max-height: calc(100dvh - 48px); overflow: hidden; background: var(--color-bg-card); border: 1px solid rgba(255, 255, 255, 0.46); border-radius: 20px; box-shadow: 0 28px 90px rgba(17, 24, 39, 0.28); }
.modal-hero { display: flex; flex: 0 0 auto; justify-content: space-between; gap: var(--space-6); padding: 28px 32px; color: #fff; background: radial-gradient(circle at 86% 10%, rgba(255, 255, 255, 0.26), transparent 24%), linear-gradient(135deg, #1d4ed8, #1677ff 52%, #38bdf8); }
.modal-hero span { font-size: var(--font-caption); font-weight: 800; opacity: 0.86; }
.modal-hero h2 { margin: var(--space-2) 0; font-size: 24px; }
.modal-hero p { margin: 0; opacity: 0.86; }
.modal-hero button { display: grid; width: 32px; height: 32px; place-items: center; color: #fff; background: rgba(255, 255, 255, 0.16); border: 0; border-radius: 50%; cursor: pointer; font-size: 20px; }
.modal-footer { display: flex; flex: 0 0 auto; justify-content: flex-end; gap: var(--space-3); padding: 20px 32px; background: var(--color-bg-hover); border-top: 1px solid var(--color-border); }
.addon-dialog__body { display: grid; grid-template-columns: 260px 1fr; flex: 1 1 auto; min-height: 0; gap: var(--space-6); overflow-x: hidden; overflow-y: auto; padding: 28px 32px; }
.addon-uploader { display: grid; align-content: start; gap: var(--space-3); padding: var(--space-4); background: var(--color-bg-hover); border: 1px dashed var(--color-border); border-radius: 14px; }
.addon-uploader__preview { display: grid; height: 180px; place-items: center; overflow: hidden; color: var(--color-primary); background: linear-gradient(135deg, var(--color-primary-soft), #fff); border-radius: 14px; font-size: 48px; font-weight: 800; }
.addon-uploader__preview img, .addon-image-list img { width: 100%; height: 100%; object-fit: cover; }
.addon-uploader p { margin: 0; color: var(--color-text-tertiary); font-size: var(--font-caption); line-height: 1.7; }
.hidden-file { display: none; }
.addon-image-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
.addon-image-list button { position: relative; height: 46px; overflow: hidden; padding: 0; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; }
.addon-image-list button.active { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-soft); }
.addon-image-list button span { position: absolute; top: 2px; right: 2px; display: grid; width: 16px; height: 16px; place-items: center; color: #fff; background: rgba(17, 24, 39, 0.72); border-radius: 50%; font-size: 12px; }
.addon-form, .addon-section { display: grid; gap: var(--space-4); }
.addon-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.addon-form-grid label { display: grid; grid-template-rows: auto auto 16px; align-content: start; gap: var(--space-2); color: var(--color-text-secondary); font-size: var(--font-caption); font-weight: 700; }
.addon-form-grid .wide-field { grid-column: 1 / -1; }
.addon-form-grid label.invalid { color: var(--color-danger); }
.addon-form-grid label.invalid .n-input, .addon-form-grid label.invalid .n-base-selection { border-color: var(--color-danger); box-shadow: 0 0 0 2px rgba(240, 68, 56, 0.08); }
.addon-form-grid label em { min-height: 16px; color: var(--color-danger); font-style: normal; font-weight: 600; line-height: 16px; }
.addon-section h3 { margin: 0; font-size: var(--font-card-title); }
.addon-direction-grid, .addon-type-grid { display: grid; gap: var(--space-3); }
.addon-direction-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.addon-type-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.addon-direction-grid button, .addon-type-grid button { display: grid; gap: 4px; min-height: 74px; padding: var(--space-3); color: var(--color-text-secondary); text-align: left; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 14px; cursor: pointer; }
.addon-direction-grid button.active, .addon-type-grid button.active { color: var(--color-primary); background: var(--color-primary-light); border-color: #8cbcff; box-shadow: 0 10px 28px rgba(22, 119, 255, 0.12); }
.addon-direction-grid span, .addon-type-grid span { color: var(--color-text-tertiary); font-size: 11px; }
.addon-rule-card { padding: var(--space-4); background: linear-gradient(135deg, var(--color-bg-hover), #fff); border: 1px solid var(--color-border); border-radius: 14px; }
.addon-rule-card.income-rule { border-color: rgba(20, 184, 166, 0.24); background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), #fff); }
.addon-rule-card p { margin: var(--space-2) 0 0; color: var(--color-text-secondary); font-size: var(--font-caption); }
.addon-switch { display: inline-flex; gap: var(--space-2); align-items: center; color: var(--color-text-primary); }
.addon-switch input { width: 16px; height: 16px; accent-color: var(--color-primary); }

@media (max-width: 820px) {
  .addon-dialog { width: calc(100vw - 24px); max-height: calc(100dvh - 24px); }
  .addon-dialog__body { grid-template-columns: 1fr; padding: 20px; }
  .addon-type-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .modal-hero { padding: 20px; }
  .modal-footer { padding: 16px 20px; }
}
</style>
