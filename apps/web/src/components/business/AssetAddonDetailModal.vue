<template>
  <Teleport to="body">
    <div v-if="show && selectedAddon" class="modal-overlay">
      <section class="addon-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="addon-detail-title">
        <header class="modal-hero">
          <div>
            <span>附加项详情</span>
            <h2 id="addon-detail-title">{{ selectedAddon.name }}</h2>
            <p>{{ addonDirectionLabel(selectedAddon) }} / {{ addonTypeLabel(selectedAddon.type, addonDirection(selectedAddon)) }} / {{ assetName }}</p>
          </div>
          <button type="button" aria-label="关闭" @click="$emit('close')">×</button>
        </header>

        <div class="addon-detail-dialog__body">
          <div class="addon-detail-media">
            <img v-if="addonCover(selectedAddon)" :src="addonCover(selectedAddon)" :alt="selectedAddon.name" />
            <span v-else>{{ selectedAddon.name.slice(0, 1) }}</span>
          </div>
          <div class="addon-detail-amount">
            <span>金额</span>
            <strong :class="addonDirection(selectedAddon) === 'income' ? 'success' : 'danger'">{{ addonDirection(selectedAddon) === "income" ? "+" : "-" }}{{ formatAmount(selectedAddon.amount) }}</strong>
          </div>
          <div v-if="addonImages(selectedAddon).length > 1" class="addon-detail-thumbs">
            <img v-for="(image, index) in addonImages(selectedAddon)" :key="`${image}-${index}`" :src="image" :alt="`${selectedAddon.name} 图片 ${index + 1}`" />
          </div>
          <div class="addon-detail-grid">
            <div><span>购买日期</span><strong>{{ selectedAddon.purchaseDate }}</strong></div>
            <div><span>{{ addonDirection(selectedAddon) === "income" ? "收款账户" : "付款账户" }}</span><strong>{{ accountName(selectedAddon.paymentAccountId) }}</strong></div>
            <div><span>是否计入成本</span><strong>{{ selectedAddon.includedInCost ? "计入成本" : "不计入成本" }}</strong></div>
            <div><span>关联资产</span><strong>{{ assetName }}</strong></div>
          </div>
          <div class="addon-detail-note">
            <span>备注</span>
            <p>{{ selectedAddon.notes || "暂无备注" }}</p>
          </div>
        </div>

        <footer class="modal-footer">
          <RButton variant="secondary" @click="$emit('close')">关闭</RButton>
          <RButton v-if="canManage" variant="danger" @click="$emit('delete', selectedAddon)">删除附加项</RButton>
          <RButton v-if="canManage" @click="$emit('edit', selectedAddon)">编辑附加项</RButton>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import RButton from "@/components/ui/RButton.vue";
import type { AssetAddonRecord } from "@/domain/models";

type AddonDirection = NonNullable<AssetAddonRecord["direction"]>;

defineProps<{
  show: boolean;
  selectedAddon: AssetAddonRecord | null;
  assetName: string;
  canManage: boolean;
  addonCover: (addon: AssetAddonRecord) => string;
  addonImages: (addon: AssetAddonRecord) => string[];
  addonDirection: (addon: AssetAddonRecord) => AddonDirection;
  addonDirectionLabel: (addon: AssetAddonRecord) => string;
  addonTypeLabel: (type: AssetAddonRecord["type"], direction?: AddonDirection) => string;
  accountName: (id?: string) => string;
  formatAmount: (amount: number) => string;
}>();

defineEmits<{
  close: [];
  delete: [addon: AssetAddonRecord];
  edit: [addon: AssetAddonRecord];
}>();
</script>

<style>
.addon-detail-dialog { display: flex; flex-direction: column; width: min(680px, calc(100vw - 48px)); max-height: calc(100dvh - 48px); overflow: visible; background: var(--color-bg-card); border: 1px solid rgba(255, 255, 255, 0.46); border-radius: 20px; box-shadow: 0 28px 90px rgba(17, 24, 39, 0.28); }
.addon-detail-dialog__body { display: grid; flex: 1 1 auto; min-height: 0; gap: var(--space-4); overflow: visible; padding: 28px 30px; }
.addon-detail-grid div, .addon-detail-note { padding: var(--space-4); background: var(--color-bg-hover); border: 1px solid var(--color-border); border-radius: 14px; }
.addon-detail-media { display: grid; height: 220px; place-items: center; overflow: hidden; color: var(--color-primary); background: linear-gradient(135deg, var(--color-primary-soft), #fff); border-radius: 14px; font-size: 48px; font-weight: 800; }
.addon-detail-media img, .addon-detail-thumbs img { width: 100%; height: 100%; object-fit: cover; }
.addon-detail-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
.addon-detail-amount { padding: var(--space-5); color: var(--color-primary); background: var(--color-primary-soft); border: 1px solid #bbd5ff; border-radius: 16px; }
.addon-detail-amount strong { display: block; margin-top: var(--space-1); font-size: 28px; }
.addon-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.addon-detail-grid strong { margin-top: var(--space-1); }
@media (max-width: 720px) {
  .addon-detail-dialog { width: calc(100vw - 24px); max-height: calc(100dvh - 24px); }
  .addon-detail-dialog__body { padding: 20px; }
  .addon-detail-grid { grid-template-columns: 1fr; }
}
</style>
