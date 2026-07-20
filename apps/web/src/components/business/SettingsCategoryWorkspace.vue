<template>
  <div class="category-zone">
    <div class="category-zone__head">
      <div>
        <h3>&#x5206;&#x7C7B;&#x7BA1;&#x7406;</h3>
        <p>&#x7EF4;&#x62A4;&#x5206;&#x7C7B;&#x8BBE;&#x7F6E;&#x3002;</p>
      </div>
    </div>

    <div class="category-editor">
      <SettingsCategoryEditorModal
        v-model:show="editorVisible"
        :category-form-title="categoryFormTitle"
        :category-level="categoryLevel"
        :category-draft="categoryDraft"
        :parent-category-options="parentCategoryOptions"
        :category-scope-options="categoryScopeOptions"
        :uploading-category-icon="uploadingCategoryIcon"
        :category-message="categoryMessage"
        :category-message-tone="categoryMessageTone"
        :saving-category="savingCategory"
        :editing-category-id="editingCategoryId"
        @close="emit('close-editor')"
        @save="emit('save-category')"
        @delete="emit('delete-editing-category')"
        @remove-icon="emit('remove-category-icon')"
        @select-icon="emit('select-category-icon', $event)"
      />

      <CategoryManagerGrid
        :items="visiblePersonalCategories"
        :query="categoryQuery"
        :status="assetCategoryStatus"
        :status-options="assetCategoryStatusOptions"
        :create-label="createLabel"
        :empty-text="emptyText"
        @update:query="emit('update:query', $event)"
        @update:status="emit('update:status', $event as CategoryStatus)"
        @create="emit('create-parent')"
      >
        <template #filters>
          <RSelect v-model="scopeFilter" :options="personalCategoryScopeFilterOptions" />
        </template>
        <template #actions>
          <RButton variant="secondary" @click="emit('open-batch')">&#x6279;&#x91CF;&#x7BA1;&#x7406;</RButton>
          <RButton variant="secondary" @click="emit('refresh')">&#x5237;&#x65B0;</RButton>
        </template>
        <template #card="{ category }">
          <CategoryCard
            :category="category"
            :active="selectedParentCategoryId === category.id"
            :sort-only="true"
            :show-sort="false"
            :show-child-actions="true"
            :data-testid="`category-item-${category.id}`"
            @edit="emit('edit-category', $event)"
            @view-children="emit('view-children', $event)"
            @add-child="emit('create-child', $event.id)"
          />
        </template>
      </CategoryManagerGrid>
    </div>

    <SettingsCategoryBatchModal
      v-model:show="batchVisible"
      :items="personalBatchItems"
      :selected-ids="personalBatchIds"
      :operation="personalBatchOperation"
      :operation-options="personalBatchOperationOptions"
      :selected-scopes="personalBatchScopes"
      :batch-scopes="categoryScopeOptionsForBatch"
      :preview-text="personalBatchPreviewText"
      :saving="personalBatchSaving"
      :scopes-of="scopesOf"
      :scope-label="scopeLabel"
      @update:selected-ids="emit('update:batch-ids', $event)"
      @update:operation="emit('update:batch-operation', $event)"
      @update:selected-scopes="emit('update:batch-scopes', $event)"
      @select-all="emit('select-all-batch')"
      @apply="emit('apply-batch')"
    />

    <DeleteConfirmModal
      v-model:show="batchDeleteVisible"
      :title="deleteTitle"
      :description="deleteDescription"
      :loading="personalBatchDeleting"
      @confirm="emit('confirm-batch-delete')"
    />

    <CategoryChildrenModal v-model:show="childrenVisible" :title="selectedPersonalChildParent?.name ?? childTitle">
      <div class="personal-children-list">
        <template v-if="selectedPersonalChildItems.length">
          <div v-for="child in selectedPersonalChildItems" :key="child.id" class="personal-category-child">
            <button type="button" @click="emit('edit-child', child)"><strong>{{ child.name }}</strong></button>
            <span>
              <button type="button" @click="emit('edit-child', child)">&#x7F16;&#x8F91;</button>
              <button type="button" class="danger" @click="emit('delete-child', child.id)">&#x5220;&#x9664;</button>
            </span>
          </div>
        </template>
        <p v-else class="empty-category">&#x6682;&#x65E0;&#x5B50;&#x5206;&#x7C7B;&#x3002;</p>
      </div>
      <template #footer>
        <RButton variant="secondary" @click="emit('close-children')">&#x5173;&#x95ED;</RButton>
        <RButton v-if="selectedPersonalChildParent" @click="emit('create-child-from-modal')">&#x6DFB;&#x52A0;&#x5B50;&#x5206;&#x7C7B;</RButton>
      </template>
    </CategoryChildrenModal>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import CategoryCard from "@/components/business/CategoryCard.vue";
import CategoryChildrenModal from "@/components/business/CategoryChildrenModal.vue";
import CategoryManagerGrid from "@/components/business/CategoryManagerGrid.vue";
import SettingsCategoryEditorModal from "@/components/business/SettingsCategoryEditorModal.vue";
import SettingsCategoryBatchModal from "@/components/business/SettingsCategoryBatchModal.vue";
import RButton from "@/components/ui/RButton.vue";
import RSelect from "@/components/ui/RSelect.vue";
import type { CategoryRecord, CategoryScope } from "@/domain/models";

type CategoryStatus = "active" | "disabled" | "all";
type BatchOperation = "enable" | "disable" | "scopes" | "delete";
type Option = { label: string; value: string | number };
type ScopeOption = { label: string; value: CategoryScope };
type CategoryDraft = { name: string; type: string | number | null; parentId: string | number | null; sort: string; iconUrl: string; iconFileId: string; scopes: CategoryScope[]; monthlyBudget: string; enabled: boolean };

const props = defineProps<{
  categoryEditorVisible: boolean; categoryFormTitle: string; categoryLevel: "parent" | "child"; categoryDraft: CategoryDraft;
  parentCategoryOptions: Array<{ label: string; value: string }>; categoryScopeOptions: ScopeOption[]; uploadingCategoryIcon: boolean;
  categoryMessage: string; categoryMessageTone: "success" | "danger"; savingCategory: boolean; editingCategoryId: string | null;
  visiblePersonalCategories: CategoryRecord[]; categoryQuery: string; assetCategoryStatus: CategoryStatus;
  assetCategoryStatusOptions: Array<{ label: string; value: CategoryStatus }>; personalCategoryScopeFilter: "all" | CategoryScope;
  personalCategoryScopeFilterOptions: Option[]; selectedParentCategoryId: string | null; personalBatchVisible: boolean;
  personalBatchItems: CategoryRecord[]; personalBatchIds: string[]; personalBatchOperation: BatchOperation;
  personalBatchOperationOptions: Array<{ label: string; value: string }>; personalBatchScopes: CategoryScope[];
  personalBatchDeleteVisible: boolean; selectedPersonalBatchItems: CategoryRecord[]; personalBatchDeleting: boolean;
  categoryScopeOptionsForBatch: ScopeOption[]; personalBatchPreviewText: string; personalBatchSaving: boolean;
  personalChildrenVisible: boolean; selectedPersonalChildParent: CategoryRecord | null; selectedPersonalChildItems: CategoryRecord[];
  scopeLabel: (scope: CategoryScope) => string; scopesOf: (category: CategoryRecord) => CategoryScope[];
}>();

const createLabel = "\u002B \u65B0\u589E\u4E00\u7EA7\u5206\u7C7B";
const emptyText = "\u6682\u65E0\u5206\u7C7B\uFF0C\u53EF\u4EE5\u65B0\u589E\u4E00\u7EA7\u5206\u7C7B\u3002";
const deleteTitle = "\u6279\u91CF\u5220\u9664\u5206\u7C7B";
const deleteDescription = computed(() => `\u5C06\u5C1D\u8BD5\u5220\u9664 ${props.selectedPersonalBatchItems.length} \u4E2A\u5206\u7C7B\uFF1B\u5B58\u5728\u4E1A\u52A1\u8BB0\u5F55\u7684\u5206\u7C7B\u4F1A\u4FDD\u7559\u3002`);
const childTitle = "\u5B50\u5206\u7C7B";

const emit = defineEmits<{
  "update:category-editor-visible": [value: boolean]; "update:query": [value: string]; "update:status": [value: CategoryStatus];
  "update:personal-category-scope-filter": [value: "all" | CategoryScope]; "update:batch-visible": [value: boolean];
  "update:children-visible": [value: boolean]; "update:batch-ids": [value: string[]]; "update:batch-operation": [value: BatchOperation];
  "update:batch-scopes": [value: CategoryScope[]]; "close-editor": []; "save-category": []; "delete-editing-category": [];
  "remove-category-icon": []; "select-category-icon": [event: Event]; "create-parent": []; "open-batch": []; refresh: [];
  "edit-category": [category: CategoryRecord]; "view-children": [category: CategoryRecord]; "create-child": [parentId: string];
  "select-all-batch": []; "apply-batch": []; "confirm-batch-delete": []; "edit-child": [category: CategoryRecord];
  "delete-child": [categoryId: string]; "close-children": []; "create-child-from-modal": [];
}>();

const editorVisible = computed({ get: () => props.categoryEditorVisible, set: (value) => emit("update:category-editor-visible", value) });
const scopeFilter = computed({ get: () => props.personalCategoryScopeFilter, set: (value) => emit("update:personal-category-scope-filter", value as "all" | CategoryScope) });
const batchVisible = computed({ get: () => props.personalBatchVisible, set: (value) => emit("update:batch-visible", value) });
const batchDeleteVisible = computed({ get: () => props.personalBatchDeleteVisible, set: () => undefined });
const childrenVisible = computed({ get: () => props.personalChildrenVisible, set: (value) => emit("update:children-visible", value) });
</script>

<style scoped>
.category-zone { display: grid; gap: var(--space-4); padding: var(--space-4); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.category-zone__head, .category-editor { display: grid; grid-template-columns: 1fr auto; gap: var(--space-4); align-items: start; }
.category-zone h3 { margin: 0; }
.category-zone p { margin: var(--space-1) 0 0; color: var(--color-text-secondary); }
.category-editor { grid-template-columns: minmax(0, 1fr); }
.personal-category-child { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: 9px 10px; background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.personal-children-list { display: grid; gap: 10px; max-height: min(520px, calc(100dvh - 240px)); overflow: auto; padding: 20px 24px; }
.personal-category-child > button { min-width: 0; color: var(--color-text-primary); text-align: left; background: transparent; border: 0; cursor: pointer; }
.personal-category-child strong { display: block; }
.personal-category-child > span { display: flex; gap: 6px; }
.personal-category-child > span button { padding: 4px 8px; color: var(--color-primary); background: var(--color-primary-light); border: 1px solid #bbd5ff; border-radius: 7px; cursor: pointer; font-size: 12px; }
.personal-category-child > span .danger { color: var(--color-danger); background: #fff1f0; border-color: #ffccc7; }
.empty-category { padding: var(--space-5); text-align: center; background: var(--color-bg-hover); border: 1px dashed var(--color-border); border-radius: var(--radius-lg); }
@media (max-width: 1100px) { .category-zone__head, .category-editor { grid-template-columns: 1fr; } }
</style>
