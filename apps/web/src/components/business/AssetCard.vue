<template>
  <article class="asset-card" data-testid="asset-card" role="button" tabindex="0" @click="$emit('open', asset.id)" @keydown.enter="$emit('open', asset.id)">
    <div class="asset-card__status">
      <RTag :tone="statusTone">{{ asset.status }}</RTag>
    </div>

    <div class="asset-card__menu" data-testid="asset-card-menu" @click.stop>
      <button class="asset-card__more" data-testid="asset-card-more" type="button" aria-label="更多操作">…</button>
      <div class="asset-card__popover">
        <button type="button" @click="handleOpen">查看详情</button>
        <button type="button" @click="handleEdit">编辑资产</button>
        <button class="danger" data-testid="asset-card-delete" type="button" @click="handleDelete">删除资产</button>
      </div>
    </div>

    <div
      class="asset-card__media"
      :class="coverImage ? 'asset-card__media--image' : `asset-card__media--${asset.imageTone}`"
    >
      <img v-if="coverImage" :src="coverImage" :alt="asset.name" />
      <span v-else>{{ asset.symbol }}</span>
    </div>

    <div class="asset-card__body">
      <h3>{{ asset.name }}</h3>
      <p>{{ asset.category }}</p>

      <div v-if="asset.warrantyDays !== undefined && asset.warrantyDays <= 30" class="asset-card__warning">
        保修剩余 {{ asset.warrantyDays }} 天
      </div>

      <footer class="asset-card__footer">
        <AmountText class="asset-card__price" :value="asset.totalCost" sign="none" />
        <span>¥{{ asset.dailyCost.toFixed(2) }}/天</span>
      </footer>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AmountText from "@/components/business/AmountText.vue";
import RTag from "@/components/ui/RTag.vue";

export type AssetCardItem = {
  id: string;
  name: string;
  brand?: string;
  category: string;
  totalCost: number;
  days: number;
  dailyCost: number;
  expectedUseDays?: number;
  warrantyDays?: number;
  status: string;
  symbol: string;
  imageTone: "blue" | "dark" | "warm" | "gray";
  imageUrl?: string;
  imageUrls?: string[];
};

const props = defineProps<{
  asset: AssetCardItem;
}>();

const emit = defineEmits<{
  open: [id: string];
  edit: [id: string];
  delete: [id: string];
}>();

const coverImage = computed(() => props.asset.imageUrl || props.asset.imageUrls?.[0] || "");
const statusTone = computed(() => {
  if (props.asset.status.includes("过保")) return "warning";
  if (props.asset.status.includes("闲置")) return "warning";
  if (props.asset.status.includes("转让") || props.asset.status.includes("处置")) return "muted";
  return "success";
});

function handleOpen() {
  emit("open", props.asset.id);
}

function handleEdit() {
  emit("edit", props.asset.id);
}

function handleDelete() {
  emit("delete", props.asset.id);
}
</script>

<style scoped>
.asset-card {
  position: relative;
  display: grid;
  gap: 11px;
  min-height: 0;
  padding: 14px 14px 12px;
  color: inherit;
  text-align: left;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-soft);
  border-radius: 20px;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.054);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.asset-card:hover,
.asset-card:focus-visible {
  border-color: rgba(38, 116, 255, 0.24);
  box-shadow: 0 24px 46px rgba(15, 23, 42, 0.09);
  outline: none;
  transform: translateY(-3px);
}

.asset-card__status {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
}

.asset-card__media {
  display: grid;
  width: 100%;
  aspect-ratio: 1 / 1;
  height: auto;
  overflow: hidden;
  place-items: center;
  margin-top: 4px;
  border: 0;
  border-radius: 18px;
  font-size: 50px;
  font-weight: 800;
}

.asset-card__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.asset-card__media--image {
  background: linear-gradient(135deg, #f8fbff, #ffffff);
}

.asset-card__media--blue {
  color: var(--color-primary);
  background: linear-gradient(135deg, #eef5ff, #dbeafe);
}

.asset-card__media--dark {
  color: #fff;
  background: linear-gradient(135deg, #111827, #334155);
}

.asset-card__media--warm {
  color: #92400e;
  background: linear-gradient(135deg, #fff7ed, #fef3c7);
}

.asset-card__media--gray {
  color: var(--color-text-secondary);
  background: linear-gradient(135deg, #f8fafc, #e5e7eb);
}

.asset-card__body {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.asset-card h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 15px;
  line-height: 20px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.asset-card p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 17px;
}

.asset-card__menu {
  position: absolute;
  z-index: 3;
  top: 14px;
  right: 14px;
}

.asset-card__more {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: rgba(248, 250, 252, 0.86);
  border: 0;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.asset-card__more:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.asset-card__popover {
  position: absolute;
  top: 34px;
  right: 0;
  z-index: 5;
  display: none;
  min-width: 112px;
  padding: var(--space-2);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-popover);
}

.asset-card__menu:hover .asset-card__popover,
.asset-card__menu:focus-within .asset-card__popover {
  display: grid;
}

.asset-card__popover button {
  height: 32px;
  padding: 0 var(--space-3);
  color: var(--color-text-secondary);
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.asset-card__popover button:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.asset-card__popover button.danger {
  color: var(--color-danger);
}

.asset-card__popover button.danger:hover {
  color: var(--color-danger);
  background: #fff1f1;
}

.asset-card__warning {
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 700;
}

.asset-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-soft);
}

.asset-card__price {
  display: block;
  font-size: 15px;
  font-weight: 800;
}

.asset-card__footer span {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
}
</style>
