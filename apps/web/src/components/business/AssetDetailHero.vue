<template>
  <div class="detail-hero">
    <RCard>
      <div class="product-media">
        <div class="product-media__main">
          <img v-if="activeMedia.type === 'image'" :src="activeMedia.src" :alt="asset.name" />
          <span v-else>{{ activeMedia.label }}</span>
        </div>
        <div class="product-media__thumbs">
          <button v-for="(thumb, index) in mediaItems" :key="thumb.key" :class="{ active: selectedMediaIndex === index }" type="button" @click="$emit('select-media', index)">
            <img v-if="thumb.type === 'image'" :src="thumb.src" :alt="`${asset.name} 图片 ${index + 1}`" /><span v-else>{{ thumb.label }}</span>
          </button>
        </div>
      </div>
    </RCard>
    <div class="product-info">
      <h2>{{ asset.name }}</h2>
      <p>{{ asset.brand || "未填写品牌" }} / {{ categoryName(asset.categoryId) }}</p>
      <dl>
        <div><dt>资产状态：</dt><dd><RTag :tone="asset.status === 'transferred' ? 'warning' : 'success'">{{ statusLabel(asset.status) }}</RTag></dd></div>
        <div><dt>购入日期：</dt><dd>{{ asset.purchaseDate }}</dd></div>
        <div><dt>购买渠道：</dt><dd>{{ purchaseChannelLabel(asset.purchaseChannel) }}</dd></div>
        <div><dt>购买商家：</dt><dd>{{ asset.merchant || "-" }}</dd></div>
        <div><dt>保修开始：</dt><dd>{{ asset.warrantyStartDate || "-" }}</dd></div>
        <div><dt>过保日期：</dt><dd>{{ asset.warrantyEndDate || "-" }} <span v-if="warrantyDays !== undefined" class="danger">（剩余 {{ warrantyDays }} 天）</span></dd></div>
        <div><dt>付款账户：</dt><dd>{{ accountName(asset.paymentAccountId) }}</dd></div>
        <div><dt>备注：</dt><dd class="success">{{ asset.notes || "无" }}</dd></div>
      </dl>
    </div>
    <RCard>
      <div class="cost-card">
        <h3>成本概览</h3>
        <div class="cost-row"><span>原始购入价</span><strong>{{ formatAmount(asset.originalCost) }}</strong></div>
        <div class="cost-row"><span>附加项合计</span><strong>{{ formatAmount(addonCost) }}</strong></div>
        <div class="cost-row"><span>资产总成本</span><strong>{{ formatAmount(totalCost) }}</strong></div>
        <div class="cost-row split"><span>{{ asset.status === "transferred" ? "转让收入" : "当前估值" }}</span><strong>{{ formatAmount(asset.currentValue ?? totalCost) }}</strong></div>
        <div class="cost-row"><span>{{ profitLoss >= 0 ? "已收益" : "已损失" }}</span><strong :class="profitLoss >= 0 ? 'success' : 'danger'">{{ formatAmount(Math.abs(profitLoss)) }}</strong></div>
        <div class="daily-cost"><span>日均成本</span><strong>{{ formatAmount(dailyCost) }}</strong></div>
      </div>
    </RCard>
  </div>
</template>

<script setup lang="ts">
import RCard from "@/components/ui/RCard.vue";
import RTag from "@/components/ui/RTag.vue";
import type { AssetRecord, PurchaseChannel } from "@/domain/models";

export type AssetDetailMediaItem = { key: string; type: "placeholder"; label: string } | { key: string; type: "image"; src: string; label: string };

defineProps<{
  asset: AssetRecord;
  mediaItems: AssetDetailMediaItem[];
  activeMedia: AssetDetailMediaItem;
  selectedMediaIndex: number;
  addonCost: number;
  totalCost: number;
  dailyCost: number;
  profitLoss: number;
  warrantyDays?: number;
  categoryName: (id: string) => string;
  accountName: (id?: string) => string;
  statusLabel: (status: AssetRecord["status"]) => string;
  purchaseChannelLabel: (channel?: PurchaseChannel) => string;
  formatAmount: (amount: number) => string;
}>();
defineEmits<{ "select-media": [index: number] }>();
</script>

<style scoped>
.detail-hero { display: grid; grid-template-columns: 360px 1fr 360px; gap: var(--space-6); align-items: start; }
.product-media { padding: var(--space-4); }
.product-media__main { display: grid; height: 300px; place-items: center; overflow: hidden; color: #fff; background: linear-gradient(135deg, #111827, #334155); border-radius: var(--radius-lg); font-size: 96px; font-weight: 800; }
.product-media__main img, .product-media__thumbs img { width: 100%; height: 100%; object-fit: cover; }
.product-media__thumbs { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
.product-media__thumbs button { width: 42px; height: 42px; overflow: hidden; color: var(--color-text-primary); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; }
.product-media__thumbs button.active { color: var(--color-primary); border-color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--color-primary); }
.product-info h2 { margin: var(--space-4) 0 var(--space-3); font-size: 26px; }
.product-info p, .product-info dd, .product-info dt { color: var(--color-text-secondary); font-size: var(--font-body); }
.product-info dl { display: grid; gap: var(--space-4); margin: var(--space-6) 0 0; }
.product-info dl div { display: flex; align-items: center; }
.product-info dt { width: 86px; }
.product-info dd { margin: 0; }
.cost-card { padding: var(--space-5); }
.cost-card h3 { margin: 0 0 var(--space-4); font-size: var(--font-section-title); }
.cost-row { display: flex; justify-content: space-between; padding: var(--space-2) 0; color: var(--color-text-secondary); font-size: var(--font-body); }
.cost-row strong { color: var(--color-text-primary); }
.cost-row.split { margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
.daily-cost { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); padding: var(--space-4); color: var(--color-primary); background: var(--color-primary-light); border-radius: var(--radius-lg); font-size: 20px; font-weight: 800; }
.success { color: var(--color-success) !important; }
.danger { color: var(--color-danger) !important; }
@media (max-width: 1200px) { .detail-hero { grid-template-columns: 1fr 1fr; } .detail-hero > :last-child { grid-column: 1 / -1; } }
@media (max-width: 760px) { .detail-hero { grid-template-columns: 1fr; } .detail-hero > :last-child { grid-column: auto; } }
</style>
