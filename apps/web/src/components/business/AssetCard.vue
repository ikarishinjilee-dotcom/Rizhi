<template>
  <article class="asset-card" data-testid="asset-card" role="button" tabindex="0" @click="$emit('open', asset.id)" @keydown.enter="$emit('open', asset.id)">
    <div
      class="asset-card__media"
      :class="coverImage ? 'asset-card__media--image' : `asset-card__media--${asset.imageTone}`"
    >
      <img v-if="coverImage" :src="coverImage" :alt="asset.name" />
      <span v-else>{{ asset.symbol }}</span>
    </div>

    <div class="asset-card__body">
      <div class="asset-card__head">
        <div>
          <h3>{{ asset.name }}</h3>
          <p>{{ asset.brand || "未填写品牌" }}</p>
          <RTag tone="muted">{{ asset.category }}</RTag>
        </div>

        <div class="asset-card__menu" data-testid="asset-card-menu" @click.stop>
          <button class="asset-card__more" data-testid="asset-card-more" type="button" aria-label="更多操作">…</button>
          <div class="asset-card__popover">
            <button type="button" @click="handleOpen">查看详情</button>
            <button type="button" @click="handleEdit">编辑资产</button>
            <button class="danger" data-testid="asset-card-delete" type="button" @click="handleDelete">删除资产</button>
          </div>
        </div>
      </div>

      <AmountText class="asset-card__price" :value="asset.totalCost" sign="none" />

      <div class="asset-card__metrics">
        <div>
          <span>持有</span>
          <strong>{{ asset.days }} 天</strong>
        </div>
        <div>
          <span>日均成本</span>
          <strong>¥{{ asset.dailyCost.toFixed(2) }}</strong>
        </div>
      </div>

      <div class="asset-card__tags">
        <RTag v-if="asset.warrantyDays && asset.warrantyDays > 0" tone="success">保修剩余 {{ asset.warrantyDays }} 天</RTag>
        <RTag v-else tone="muted">无保修提醒</RTag>
        <RTag :tone="asset.status === '订阅中' ? 'purple' : 'success'">{{ asset.status }}</RTag>
      </div>
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
  grid-template-columns: 112px minmax(0, 1fr);
  gap: var(--space-4);
  min-height: 250px;
  padding: var(--space-4);
  color: inherit;
  text-align: left;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.asset-card:hover,
.asset-card:focus-visible {
  border-color: #bbd5ff;
  box-shadow: var(--shadow-popover);
  outline: none;
  transform: translateY(-1px);
}

.asset-card__media {
  display: grid;
  width: 112px;
  height: 112px;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 42px;
  font-weight: 800;
}

.asset-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-card__media--image {
  background: var(--color-bg-hover);
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

.asset-card__head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}

.asset-card__head > div:first-child {
  min-width: 0;
}

.asset-card h3 {
  margin: 0;
  font-size: var(--font-card-title);
  overflow-wrap: anywhere;
}

.asset-card p {
  margin: var(--space-1) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-table);
}

.asset-card__menu {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  align-self: start;
  padding-bottom: 6px;
}

.asset-card__more {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
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
  top: 36px;
  right: 0;
  z-index: 5;
  display: none;
  min-width: 112px;
  padding: var(--space-2);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
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

.asset-card__price {
  display: block;
  margin-top: var(--space-5);
  font-size: 18px;
}

.asset-card__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.asset-card__metrics div + div {
  padding-left: var(--space-4);
  border-left: 1px solid var(--color-border);
}

.asset-card__metrics span {
  display: block;
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
}

.asset-card__metrics strong {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-table);
}

.asset-card__tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-5);
}
</style>
