<template>
  <RCard>
    <div class="section-card">
      <div class="section-card__head"><h3>附加项（{{ assetAddons.length }}）</h3><RButton data-testid="asset-add-addon" :disabled="!canManageAddons" @click="$emit('create')">+ 添加附加项</RButton></div>
      <div v-if="!canManageAddons" class="readonly-hint">当前资产状态为“{{ statusLabel }}”，附加项进入只读模式。如需修改，请先恢复为使用中。</div>
      <table v-if="assetAddons.length" class="simple-table"><thead><tr><th>附加项</th><th>收支</th><th>类型</th><th>金额</th><th>日期</th><th>账户</th><th>是否计入成本</th><th>操作</th></tr></thead><tbody><tr v-for="addon in assetAddons" :key="addon.id"><td><div class="addon-cell"><div class="addon-thumb"><img v-if="addonCover(addon)" :src="addonCover(addon)" :alt="addon.name" /><span v-else>{{ addon.name.slice(0, 1) }}</span></div><strong>{{ addon.name }}</strong></div></td><td><RTag :tone="addonDirection(addon) === 'income' ? 'success' : 'danger'">{{ addonDirectionLabel(addon) }}</RTag></td><td>{{ addonTypeLabel(addon.type, addonDirection(addon)) }}</td><td :class="addonDirection(addon) === 'income' ? 'success' : 'danger'">{{ addonDirection(addon) === 'income' ? '+' : '-' }}{{ formatAmount(addon.amount) }}</td><td>{{ addon.purchaseDate }}</td><td>{{ accountName(addon.paymentAccountId) }}</td><td>{{ addonDirection(addon) === 'income' ? '收入不计成本' : addon.includedInCost ? '计入成本' : '不计入成本' }}</td><td class="table-actions"><button type="button" @click="$emit('detail', addon)">查看</button><button v-if="canManageAddons" type="button" @click="$emit('edit', addon)">编辑</button><button v-if="canManageAddons" type="button" class="danger" @click="$emit('delete', addon)">删除</button></td></tr></tbody></table>
      <REmptyState v-else title="暂无附加项" description="新购配件、维修支出、卖掉旧配件的收入都可以沉淀到这里。" />
    </div>
  </RCard>
</template>

<script setup lang="ts">
import RButton from "@/components/ui/RButton.vue";
import RCard from "@/components/ui/RCard.vue";
import REmptyState from "@/components/ui/REmptyState.vue";
import RTag from "@/components/ui/RTag.vue";
import type { AssetAddonRecord } from "@/domain/models";

defineProps<{ assetAddons: AssetAddonRecord[]; canManageAddons: boolean; statusLabel: string; addonCover: (addon: AssetAddonRecord) => string | undefined; addonDirection: (addon: AssetAddonRecord) => "income" | "expense"; addonDirectionLabel: (addon: AssetAddonRecord) => string; addonTypeLabel: (type: AssetAddonRecord["type"], direction?: NonNullable<AssetAddonRecord["direction"]>) => string; formatAmount: (amount: number) => string; accountName: (accountId?: string) => string }>();
defineEmits<{ create: []; detail: [addon: AssetAddonRecord]; edit: [addon: AssetAddonRecord]; delete: [addon: AssetAddonRecord] }>();
</script>

<style>
.section-card { padding: var(--space-4); }.section-card__head { display: flex; justify-content: space-between; margin-bottom: var(--space-3); }.section-card__head h3 { margin: 0; font-size: var(--font-section-title); }.readonly-hint { margin-bottom: var(--space-3); padding: var(--space-3) var(--space-4); color: var(--color-text-secondary); background: var(--color-warning-light, #fff7e6); border: 1px solid #ffd89b; border-radius: var(--radius-lg); font-size: var(--font-caption); }.simple-table { width: 100%; border-collapse: collapse; }.simple-table th, .simple-table td { height: 56px; padding: 0 var(--space-4); color: var(--color-text-secondary); font-size: var(--font-table); text-align: left; border-bottom: 1px solid var(--color-border); }.simple-table th { color: #667085; background: var(--color-bg-hover); }.addon-cell { display: inline-flex; gap: var(--space-3); align-items: center; color: var(--color-text-primary); }.addon-thumb { display: grid; width: 36px; height: 36px; place-items: center; overflow: hidden; color: var(--color-primary); background: var(--color-primary-light); border-radius: 10px; font-weight: 800; }.addon-thumb img { width: 100%; height: 100%; object-fit: cover; }.table-actions { display: flex; gap: var(--space-2); align-items: center; }.table-actions button { height: 34px; padding: 0 var(--space-3); color: var(--color-primary); background: var(--color-primary-light); border: 1px solid #bbd5ff; border-radius: var(--radius-md); cursor: pointer; font-weight: 700; }.table-actions button:hover { border-color: var(--color-primary); box-shadow: 0 8px 18px rgba(22, 119, 255, 0.14); }.table-actions button.danger { color: var(--color-danger); background: rgba(240, 68, 56, 0.08); border-color: rgba(240, 68, 56, 0.24); }
</style>
