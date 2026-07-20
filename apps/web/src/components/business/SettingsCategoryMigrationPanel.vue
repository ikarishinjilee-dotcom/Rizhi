<template>
  <div v-if="sourceCategory" class="migration-panel" :class="{ done: completedCount !== null }">
    <div>
      <span>{{ completedCount === null ? "分类迁移" : "迁移完成" }}</span>
      <h3>{{ completedCount === null ? `「${sourceCategory.name}」已有记账记录` : `已迁移「${sourceCategory.name}」` }}</h3>
      <p v-if="completedCount === null">先把这些记账迁移到其他同类型分类，再回来删除原分类。</p>
      <p v-else>已迁移 {{ completedCount }} 条记账记录。现在可以直接删除原分类，系统会再次校验是否仍有关联账单。</p>
      <div v-if="targetCategoryId" class="migration-route">
        <small>迁移目标</small>
        <strong>{{ targetLabel }}</strong>
      </div>
    </div>
    <div class="migration-form">
      <template v-if="completedCount === null">
        <label>
          <span>目标一级分类</span>
          <RSelect :model-value="targetCategoryId" :options="targetCategoryOptions" placeholder="选择目标分类" @update:model-value="emit('update:targetCategoryId', $event)" />
        </label>
        <label>
          <span>目标子分类</span>
          <RSelect :model-value="targetSubCategoryId" :options="targetSubCategoryOptions" placeholder="可选" @update:model-value="emit('update:targetSubCategoryId', $event)" />
        </label>
        <div class="action-row">
          <RButton :loading="migrating" @click="emit('migrate')">迁移记账</RButton>
          <RButton variant="secondary" @click="emit('clear')">取消</RButton>
        </div>
      </template>
      <div v-else class="migration-done-actions">
        <RButton variant="danger" @click="emit('delete')">删除原分类</RButton>
        <RButton variant="secondary" @click="emit('reset')">重新选择目标</RButton>
        <RButton variant="secondary" @click="emit('clear')">关闭</RButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui";
import type { CategoryRecord } from "@/domain/models";
import RButton from "@/components/ui/RButton.vue";
import RSelect from "@/components/ui/RSelect.vue";

defineProps<{
  sourceCategory: CategoryRecord | null | undefined;
  completedCount: number | null;
  targetCategoryId: string | number | null;
  targetSubCategoryId: string | number | null;
  targetCategoryOptions: SelectOption[];
  targetSubCategoryOptions: SelectOption[];
  targetLabel: string;
  migrating: boolean;
}>();

const emit = defineEmits<{
  "update:targetCategoryId": [value: string | number | null];
  "update:targetSubCategoryId": [value: string | number | null];
  migrate: [];
  clear: [];
  delete: [];
  reset: [];
}>();
</script>

<style scoped>
.migration-panel {
  display: grid;
  grid-template-columns: 1fr minmax(420px, .9fr);
  gap: var(--space-4);
  align-items: start;
  padding: var(--space-5);
  background: linear-gradient(135deg, #fff7ed, #fff);
  border: 1px solid #fed7aa;
  border-radius: var(--radius-lg);
  box-shadow: 0 18px 42px rgba(234, 88, 12, .08);
}

.migration-panel.done {
  background: linear-gradient(135deg, #f0fdf4, #fff);
  border-color: #bbf7d0;
  box-shadow: 0 18px 42px rgba(22, 163, 74, .08);
}

.migration-panel > div:first-child span {
  display: inline-flex;
  height: 24px;
  align-items: center;
  padding: 0 var(--space-2);
  color: #c2410c;
  background: #ffedd5;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.migration-panel.done > div:first-child span {
  color: #15803d;
  background: #dcfce7;
}

.migration-panel h3 {
  margin: var(--space-2) 0 0;
}

.migration-route {
  display: inline-grid;
  gap: 2px;
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: rgba(255, 255, 255, .72);
  border: 1px solid rgba(148, 163, 184, .22);
  border-radius: var(--radius-lg);
}

.migration-route small {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.migration-route strong {
  color: var(--color-text-primary);
}

.migration-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.migration-form label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 800;
}

.migration-form .action-row {
  grid-column: 1 / -1;
  justify-content: flex-end;
}

.migration-done-actions {
  display: flex;
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: var(--space-3);
}

@media (max-width: 1100px) {
  .migration-panel,
  .migration-form {
    grid-template-columns: 1fr;
  }
}
</style>
