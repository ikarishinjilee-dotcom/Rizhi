<template>
  <RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
    <section class="settings-page">
    <SettingsPageHeader
      :avatar-data-url="profileDraft.avatarDataUrl"
      :profile-initial="profileInitial"
      :current-section-title="currentSectionTitle"
      :current-section-description="currentSectionDescription"
      :nav-items="settingsNavItems"
    />

    <SettingsOverviewGrid
      v-if="activeSection === 'overview'"
      :items="overviewItems.filter((item) => item.path !== '/settings/categories')"
    />

    <RCard v-if="activeSection === 'profile'">
      <SettingsProfileSection
        :profile-draft="profileDraft"
        :profile-initial="profileInitial"
        :currency-options="currencyOptions"
        :locale-options="localeOptions"
        :profile-message="profileMessage"
        :profile-message-tone="profileMessageTone"
        :saving-profile="savingProfile"
        :logging-out="loggingOut"
        @select-avatar="selectAvatar"
        @save-profile="saveProfile"
        @load-profile="loadProfile"
        @logout="requestLogout"
      />
    </RCard>

    <RCard v-if="activeSection === 'data'">
      <SettingsDataSection
        :assets="store.assets.length"
        :asset-addons="store.assetAddons.length"
        :accounts="store.accounts.length"
        :transactions="store.transactions.length"
        :exporting="exporting"
        :importing="importing"
        :resetting="resetting"
        :backup-message="backupMessage"
        :backup-message-tone="backupMessageTone"
        @export-backup="exportBackup"
        @import-backup="importBackup"
        @reset-data="resetData"
      />
    </RCard>

    <RCard v-if="activeSection === 'categories'">
      <div class="settings-section">
        <SettingsCategoryMigrationPanel
          :source-category="migrationSourceCategory"
          :completed-count="migrationCompletedCount"
          :target-category-id="migrationTargetCategoryId"
          :target-sub-category-id="migrationTargetSubCategoryId"
          :target-category-options="migrationTargetCategoryOptions"
          :target-sub-category-options="migrationTargetSubCategoryOptions"
          :target-label="migrationTargetLabel"
          :migrating="migratingCategory"
          @update:target-category-id="migrationTargetCategoryId = $event"
          @update:target-sub-category-id="migrationTargetSubCategoryId = $event"
          @migrate="migrateCategoryTransactions"
          @clear="clearMigrationPanel"
          @delete="openMigratedCategoryDeleteModal"
          @reset="migrationCompletedCount = null"
        />
        <SettingsCategoryWorkspace
          :category-editor-visible="categoryEditorVisible"
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
          :visible-personal-categories="visiblePersonalCategories"
          :category-query="categoryQuery"
          :asset-category-status="assetCategoryStatus"
          :asset-category-status-options="assetCategoryStatusOptions"
          :personal-category-scope-filter="personalCategoryScopeFilter"
          :personal-category-scope-filter-options="personalCategoryScopeFilterOptions"
          :selected-parent-category-id="selectedParentCategoryId"
          :personal-batch-visible="personalBatchVisible"
          :personal-batch-items="personalBatchItems"
          :personal-batch-ids="personalBatchIds"
          :personal-batch-operation="personalBatchOperation"
          :personal-batch-operation-options="personalBatchOperationOptions"
          :personal-batch-scopes="personalBatchScopes"
          :personal-batch-delete-visible="personalBatchDeleteVisible"
          :selected-personal-batch-items="selectedPersonalBatchItems"
          :personal-batch-deleting="personalBatchDeleting"
          :category-scope-options-for-batch="categoryScopeOptions"
          :personal-batch-preview-text="personalBatchPreviewText"
          :personal-batch-saving="personalBatchSaving"
          :personal-children-visible="personalChildrenVisible"
          :selected-personal-child-parent="selectedPersonalChildParent"
          :selected-personal-child-items="selectedPersonalChildItems"
          :scope-label="scopeLabel"
          :scopes-of="scopesOf"
          @update:category-editor-visible="categoryEditorVisible = $event"
          @update:query="categoryQuery = $event"
          @update:status="assetCategoryStatus = $event"
          @update:personal-category-scope-filter="personalCategoryScopeFilter = $event"
          @update:batch-visible="personalBatchVisible = $event"
          @update:children-visible="personalChildrenVisible = $event"
          @update:batch-ids="personalBatchIds = $event"
          @update:batch-operation="personalBatchOperation = $event"
          @update:batch-scopes="personalBatchScopes = $event"
          @close-editor="closeCategoryEditor"
          @save-category="saveCategory"
          @delete-editing-category="requestDeleteEditingCategory"
          @remove-category-icon="removeCategoryIcon"
          @select-category-icon="selectCategoryIcon"
          @create-parent="startCreateParentCategory"
          @open-batch="openPersonalBatchManager"
          @refresh="refreshPersonalCategories"
          @edit-category="editCategory"
          @view-children="openPersonalChildren"
          @create-child="startCreateChildCategory"
          @select-all-batch="selectAllPersonalBatchItems"
          @apply-batch="applyPersonalBatch"
          @confirm-batch-delete="confirmPersonalBatchDelete"
          @edit-child="editPersonalChild"
          @delete-child="deletePersonalChild"
          @close-children="personalChildrenVisible = false"
          @create-child-from-modal="startCreateChildFromModal"
        />      </div>
    </RCard>

    <DeleteConfirmModal
      v-model:show="deleteCategoryModalVisible"
      :title="deleteCategoryModalTitle"
      :description="deleteCategoryModalDescription"
      :eyebrow="pendingDeleteBlockedReason ? '无法删除' : '分类删除'"
      confirm-text="确认删除"
      :cancel-text="pendingDeleteBlockedReason ? '知道了' : '取消'"
      :show-confirm="!pendingDeleteBlockedReason"
      :loading="deleteCategoryLoading"
      @confirm="confirmDeleteCategory"
    >
      <div v-if="pendingDeleteImpact" class="delete-impact">
        <div class="delete-impact__grid">
          <div>
            <span>子分类</span>
            <strong>{{ pendingDeleteImpact.childCategories }}</strong>
          </div>
          <div>
            <span>关联记账</span>
            <strong>{{ pendingDeleteImpact.transactions }}</strong>
          </div>
          <div>
            <span>关联资产</span>
            <strong>{{ pendingDeleteImpact.assets }}</strong>
          </div>
          <div>
            <span>关联账户</span>
            <strong>{{ pendingDeleteImpact.accounts }}</strong>
          </div>
        </div>
        <div v-if="pendingDeleteLatestTransaction" class="delete-impact__latest">
          <span>最近一条记账</span>
          <strong>{{ transactionSummary(pendingDeleteLatestTransaction) }}</strong>
        </div>
        <p>{{ pendingDeleteBlockedReason || "当前没有检测到会阻止删除的业务数据，可以删除。" }}</p>
        <div v-if="pendingDeleteImpact.transactions > 0" class="delete-impact__actions">
          <RButton @click="openMigrationFromDeleteModal">去迁移记账</RButton>
        </div>
      </div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="resetDataModalVisible"
      title="重置本地数据？"
      description="这会清空当前浏览器里的 IndexedDB 数据，并重新写入最新的初始数据。当前资产、附加项、账户和交易都会被替换。"
      eyebrow="重置本地数据"
      confirm-text="确认重置"
      :loading="resetting"
      @confirm="confirmResetData"
    >
      <div class="delete-impact">
        <div class="delete-impact__grid">
          <div><span>资产</span><strong>{{ store.assets.length }}</strong></div>
          <div><span>附加项</span><strong>{{ store.assetAddons.length }}</strong></div>
          <div><span>账户</span><strong>{{ store.accounts.length }}</strong></div>
          <div><span>交易</span><strong>{{ store.transactions.length }}</strong></div>
        </div>
        <p>建议先导出备份。确认后，本地现有数据会被开发期初始数据覆盖。</p>
      </div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="importBackupModalVisible"
      title="导入备份并覆盖当前数据？"
      description="导入备份会覆盖当前浏览器里的所有本地数据。请确认你选择的是可信备份文件。"
      eyebrow="导入覆盖"
      confirm-text="确认导入"
      :loading="importing"
      @confirm="confirmImportBackup"
    >
      <div class="delete-impact">
        <div class="delete-impact__latest">
          <span>备份文件</span>
          <strong>{{ pendingBackupFile?.name ?? "未选择文件" }}</strong>
        </div>
        <div class="delete-impact__grid">
          <div><span>当前资产</span><strong>{{ store.assets.length }}</strong></div>
          <div><span>当前附加项</span><strong>{{ store.assetAddons.length }}</strong></div>
          <div><span>当前账户</span><strong>{{ store.accounts.length }}</strong></div>
          <div><span>当前交易</span><strong>{{ store.transactions.length }}</strong></div>
        </div>
        <p>确认后会先校验备份格式，再执行覆盖恢复。</p>
      </div>
    </DeleteConfirmModal>

    <DeleteConfirmModal
      v-model:show="showUnsavedCategoryModal"
      title="放弃未保存的分类内容？"
      description="当前分类表单里有尚未保存的修改。离开后，分类名称和预算设置都会丢失。"
      eyebrow="内容未保存"
      confirm-text="放弃清空"
      @confirm="confirmResetCategoryDraft"
    />

    <DeleteConfirmModal
      v-model:show="showLogoutConfirm"
      eyebrow="账户操作"
      title="确认退出当前账户？"
      description="退出后会清除当前设备上的登录状态和本地业务缓存。"
      confirm-text="退出登录"
      :loading="loggingOut"
      @confirm="handleLogout"
    />
    </section>
  </RDataGate>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { DatabaseBackup, LayoutGrid, Tags, UserRound } from "@lucide/vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import SettingsProfileSection from "@/components/business/SettingsProfileSection.vue";
import SettingsDataSection from "@/components/business/SettingsDataSection.vue";
import SettingsCategoryMigrationPanel from "@/components/business/SettingsCategoryMigrationPanel.vue";
import SettingsCategoryWorkspace from "@/components/business/SettingsCategoryWorkspace.vue";
import SettingsOverviewGrid from "@/components/business/SettingsOverviewGrid.vue";
import SettingsPageHeader from "@/components/business/SettingsPageHeader.vue";
import RButton from "@/components/ui/RButton.vue";
import RCard from "@/components/ui/RCard.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RDataGate from "@/components/ui/RDataGate.vue";
import type { CategoryDomain, CategoryRecord, CategoryScope, TransactionRecord } from "@/domain/models";
import { backupService } from "@/services/backupService";
import { categoryService } from "@/services/categoryService";
import { settingsService } from "@/services/settingsService";
import { authSession, logout } from "@/services/authService";
import { useAppDataStore } from "@/stores/appDataStore";
import { imageFileToPersistentUrl } from "@/utils/imageFiles";
import { uploadImageDataUrl } from "@/services/cloudApiService";
import { useSettingsCategories } from "./useSettingsCategories";

const store = useAppDataStore();
const route = useRoute();
const router = useRouter();
const savingProfile = ref(false);
const loggingOut = ref(false);
const showLogoutConfirm = ref(false);
const profileMessage = ref("");
const profileMessageTone = ref<"success" | "danger">("success");
const profileDraft = reactive({
  displayName: authSession.username || "未设置",
  avatarDataUrl: undefined as string | undefined,
  currency: "CNY" as string | number | null,
  locale: "zh-CN" as string | number | null,
});
const resetting = ref(false);
const exporting = ref(false);
const importing = ref(false);
const resetDataModalVisible = ref(false);
const importBackupModalVisible = ref(false);
const showUnsavedCategoryModal = ref(false);
const pendingBackupFile = ref<File | null>(null);
const backupMessage = ref("");
const backupMessageTone = ref<"success" | "danger">("success");
type SettingsSection = "overview" | "profile" | "categories" | "data";

const activeSection = computed<SettingsSection>(() => {
  const section = route.meta.section;
  return section === "profile" || section === "categories" || section === "data" ? section : "overview";
});
const profileInitial = computed(() => profileDraft.displayName.trim().charAt(0).toUpperCase() || "R");
const settingsNavItems = [
  { label: "设置总览", path: "/settings", icon: LayoutGrid },
  { label: "个人资料", path: "/settings/profile", icon: UserRound },
  { label: "分类管理", path: "/settings/categories", icon: Tags },
  { label: "数据管理", path: "/settings/data", icon: DatabaseBackup },
];
const sectionCopy: Record<SettingsSection, { title: string; description: string }> = {
  overview: { title: "设置中心", description: "管理个人资料、业务分类和本地数据。" },
  profile: { title: "个人资料", description: "设置应用内显示身份和基础偏好。" },
  categories: { title: "分类管理", description: "维护资产、记账和资金账户的分类体系。" },
  data: { title: "数据管理", description: "备份、恢复和维护当前浏览器中的本地数据。" },
};
const currentSectionTitle = computed(() => sectionCopy[activeSection.value].title);
const currentSectionDescription = computed(() => sectionCopy[activeSection.value].description);
const overviewItems = computed(() => [
  {
    label: "个人资料",
    path: "/settings/profile",
    icon: UserRound,
    description: "头像、显示名称和基础偏好",
    meta: profileDraft.displayName || "未设置",
  },
  {
    label: "分类管理",
    path: "/settings/categories",
    icon: Tags,
    description: "资产、记账和账户分类",
    meta: `${store.categories.filter((item) => !item.deletedAt).length} 个分类`,
  },
  {
    label: "数据管理",
    path: "/settings/data",
    icon: DatabaseBackup,
    description: "本地备份、恢复和数据重置",
    meta: `${store.transactions.length} 条交易`,
  },
]);
const currencyOptions = [{ label: "人民币（CNY）", value: "CNY" }];
const localeOptions = [{ label: "简体中文", value: "zh-CN" }];

const categoryDomainOptions: Array<{ label: string; value: CategoryDomain }> = [
  { label: "资产分类", value: "asset" },
  { label: "交易分类", value: "transaction" },
];
const categoryScopeOptions: Array<{ label: string; value: CategoryScope }> = [
  { label: "资产", value: "asset" },
  { label: "支出", value: "expense" },
  { label: "收入", value: "income" },
];

const categoryTypeOptions = {
  asset: [
    { label: "自定义分类", value: "other" },
  ],
  transaction: [
    { label: "支出", value: "expense" },
    { label: "收入", value: "income" },
  ],
  account: [
    { label: "现金", value: "cash" },
    { label: "电子钱包", value: "wallet" },
    { label: "储蓄卡", value: "debit_card" },
    { label: "信用卡", value: "credit_card" },
    { label: "消费信用", value: "consumer_credit" },
    { label: "贷款", value: "loan" },
    { label: "投资账户", value: "investment" },
    { label: "其他账户", value: "other" },
  ],
};


const categoryTypeOptionsWithBank = { ...categoryTypeOptions, bank: [{ label: "银行", value: "other" }] };

const assetCategorySortOptions = [
  { label: "自定义", value: "manual" as const },
  { label: "名称", value: "name" as const },
  { label: "使用量", value: "usage" as const },
];

const assetCategoryStatusOptions = [
  { label: "启用", value: "active" as const },
  { label: "已停用", value: "disabled" as const },
  { label: "全部", value: "all" as const },
];
const personalCategoryScopeFilterOptions = [
  { label: "分类类型：全部", value: "all" },
  { label: "资产分类", value: "asset" },
  { label: "支出分类", value: "expense" },
  { label: "收入分类", value: "income" },
];

const {
  categoryDomain, categoryDirection, categoryLevel, categoryEditorVisible, selectedParentCategoryId,
  expandedParentCategoryId, personalChildrenVisible, selectedPersonalChildParent, editingCategoryId,
  savingCategory, uploadingCategoryIcon, migratingCategory, migrationSourceCategoryId,
  migrationTargetCategoryId, migrationTargetSubCategoryId, migrationCompletedCount,
  deleteCategoryModalVisible, deleteCategoryLoading, pendingDeleteCategory, pendingDeleteImpact,
  pendingDeleteLatestTransaction, categoryMessage, categoryMessageTone, categoryQuery, assetCategorySort,
  assetCategoryStatus, personalCategoryScopeFilter, personalBatchVisible, personalBatchIds,
  personalBatchOperation, personalBatchScopes, personalBatchSaving, personalBatchDeleteVisible,
  personalBatchDeleting, categoryDraft, initialCategoryDraftSnapshot,
  visiblePersonalCategories, personalBatchItems, selectedPersonalBatchItems, selectedPersonalChildItems,
  activeTransactionCategories, parentCategories, parentCategoryOptions,
  personalBatchPreviewText, selectedParentCategory, migrationSourceCategory, migrationTargetCategoryOptions,
  migrationTargetSubCategoryOptions, migrationTargetLabel, pendingDeleteBlockedReason,
  deleteCategoryModalTitle, deleteCategoryModalDescription, showCategoryBudgetField, isCategoryDraftDirty,
  categoryFormTitle, categoryFormDescription, childCategoriesOf, scopesOf, scopeLabel,
  serializeCategoryDraft, setCategoryMessage, buildDeleteCategoryImpact,
    } = useSettingsCategories(store, categoryService);
const personalBatchOperationOptions = [
  { label: "批量启用", value: "enable" },
  { label: "批量停用", value: "disable" },
  { label: "批量修改适用范围", value: "scopes" },
  { label: "批量删除", value: "delete" },
];

onMounted(initializeData);

async function initializeData() {
  await store.init().catch(() => undefined);
  if (store.initialized) await loadProfile();
}

watch(categoryDomain, () => {
  resetCategoryDraft();
});

watch(parentCategories, (parents) => {
  if (categoryDomain.value !== "transaction") return;
  if (!selectedParentCategoryId.value || !parents.some((parent) => parent.id === selectedParentCategoryId.value)) {
    selectedParentCategoryId.value = parents[0]?.id ?? null;
  }
}, { immediate: true });

async function loadProfile() {
  const settings = await settingsService.get();
  profileDraft.displayName = settings.displayName || authSession.username || "未设置";
  profileDraft.avatarDataUrl = settings.avatarDataUrl;
  profileDraft.currency = settings.currency;
  profileDraft.locale = settings.locale;
  profileMessage.value = "";
}

async function saveProfile() {
  const displayName = profileDraft.displayName.trim();
  if (!displayName) {
    profileMessageTone.value = "danger";
    profileMessage.value = "请填写显示名称。";
    return;
  }

  savingProfile.value = true;
  try {
    await settingsService.update({
      displayName,
      avatarDataUrl: profileDraft.avatarDataUrl,
      currency: "CNY",
      locale: "zh-CN",
    });
    profileDraft.displayName = displayName;
    profileMessageTone.value = "success";
    profileMessage.value = import.meta.env.VITE_DATA_SOURCE === "unicloud"
      ? "个人资料已同步到云端。"
      : "个人资料已保存到本地。";
  } catch (error) {
    profileMessageTone.value = "danger";
    profileMessage.value = error instanceof Error ? error.message : "保存失败，请稍后重试。";
  } finally {
    savingProfile.value = false;
  }
}

function requestLogout() {
  if (!loggingOut.value) showLogoutConfirm.value = true;
}

async function handleLogout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await logout();
    store.clearSessionData();
    showLogoutConfirm.value = false;
    await router.replace("/login");
  } finally {
    loggingOut.value = false;
  }
}

async function selectAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    profileMessageTone.value = "danger";
    profileMessage.value = "头像文件不能超过 2 MB。";
    return;
  }

  try {
    profileDraft.avatarDataUrl = await imageFileToPersistentUrl(file);
    profileMessage.value = "";
  } catch (error) {
    profileMessageTone.value = "danger";
    profileMessage.value = error instanceof Error ? error.message : "图片读取失败，请重新选择。";
  }
}

function resetData() {
  resetDataModalVisible.value = true;
}

async function confirmResetData() {
  resetting.value = true;
  try {
    await store.resetLocalData();
    resetDataModalVisible.value = false;
    setBackupMessage("本地数据已重置。");
  } finally {
    resetting.value = false;
  }
}

function setBackupMessage(message: string, tone: "success" | "danger" = "success") {
  backupMessage.value = message;
  backupMessageTone.value = tone;
}

function backupFileName() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `rizhi-backup-${date}-${time}.json`;
}

async function exportBackup() {
  exporting.value = true;
  setBackupMessage("");
  try {
    const text = await backupService.exportText();
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupMessage("备份文件已导出。");
  } catch (err) {
    setBackupMessage(err instanceof Error ? err.message : "导出备份失败", "danger");
  } finally {
    exporting.value = false;
  }
}

async function importBackup(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  pendingBackupFile.value = file;
  importBackupModalVisible.value = true;
}

async function confirmImportBackup() {
  const file = pendingBackupFile.value;
  if (!file) return;

  importing.value = true;
  setBackupMessage("");
  try {
    const text = await file.text();
    await backupService.restoreText(text);
    await store.refresh();
    importBackupModalVisible.value = false;
    pendingBackupFile.value = null;
    setBackupMessage("备份已恢复，本地数据已刷新。");
  } catch (err) {
    setBackupMessage(err instanceof Error ? err.message : "导入备份失败", "danger");
  } finally {
    importing.value = false;
  }
}

function openMigrationPanel(categoryId: string) {
  const category = store.categories.find((item) => item.id === categoryId);
  if (!category) return;
  migrationSourceCategoryId.value = categoryId;
  migrationTargetCategoryId.value = migrationTargetCategoryOptions.value[0]?.value ?? null;
  migrationTargetSubCategoryId.value = "none";
  migrationCompletedCount.value = null;
}

function clearMigrationPanel() {
  migrationSourceCategoryId.value = null;
  migrationTargetCategoryId.value = null;
  migrationTargetSubCategoryId.value = "none";
  migrationCompletedCount.value = null;
}

function resetCategoryDraft() {
  editingCategoryId.value = null;
  categoryDraft.name = "";
  categoryDomain.value = "asset";
  categoryDraft.type = "other";
  categoryDraft.parentId = categoryLevel.value === "child" ? selectedParentCategoryId.value : null;
  categoryDraft.sort = "999";
  categoryDraft.iconUrl = "";
  categoryDraft.iconFileId = "";
  categoryDraft.scopes = ["asset", "expense"];
  categoryDraft.monthlyBudget = "";
  categoryDraft.enabled = true;
  setCategoryMessage("");
  initialCategoryDraftSnapshot.value = serializeCategoryDraft();
}

function editCategory(category: CategoryRecord) {
  editingCategoryId.value = category.id;
  categoryDomain.value = category.domain;
  categoryDirection.value = category.type === "income" ? "income" : "expense";
  categoryLevel.value = category.parentId ? "child" : "parent";
  selectedParentCategoryId.value = category.parentId ?? category.id;
  categoryDraft.name = category.name;
  categoryDraft.type = category.type ?? categoryTypeOptionsWithBank[category.domain][0]?.value ?? "other";
  categoryDraft.parentId = category.parentId ?? null;
  categoryDraft.sort = String(category.sort);
  categoryDraft.iconUrl = category.iconUrl || "";
  categoryDraft.iconFileId = category.iconFileId || "";
  categoryDraft.scopes = [...scopesOf(category)];
  categoryDraft.monthlyBudget = category.monthlyBudget ? String(category.monthlyBudget) : "";
  categoryDraft.enabled = category.enabled !== false;
  setCategoryMessage("");
  initialCategoryDraftSnapshot.value = serializeCategoryDraft();
  categoryEditorVisible.value = true;
}

function closeCategoryEditor() {
  categoryEditorVisible.value = false;
  setCategoryMessage("");
}

async function selectCategoryIcon(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  uploadingCategoryIcon.value = true;
  try {
    const dataUrl = await imageFileToPersistentUrl(file);
    const uploaded = await uploadImageDataUrl(dataUrl, "category_icon");
    categoryDraft.iconUrl = uploaded.url;
    categoryDraft.iconFileId = uploaded.fileId;
    setCategoryMessage("");
  } catch (error) {
    setCategoryMessage(error instanceof Error ? error.message : "图标上传失败，请重新选择。", "danger");
  } finally {
    uploadingCategoryIcon.value = false;
  }
}

function removeCategoryIcon() {
  categoryDraft.iconUrl = "";
  categoryDraft.iconFileId = "";
}

function requestDeleteEditingCategory() {
  if (!editingCategoryId.value) return;
  const category = store.categories.find((item) => item.id === editingCategoryId.value);
  categoryEditorVisible.value = false;
  if (category) deleteCategory(category.id);
}

function requestResetCategoryDraft() {
  if (isCategoryDraftDirty.value) {
    showUnsavedCategoryModal.value = true;
    return;
  }
  resetCategoryDraft();
}

function confirmResetCategoryDraft() {
  showUnsavedCategoryModal.value = false;
  resetCategoryDraft();
}

function switchCategoryDirection(direction: "expense" | "income") {
  categoryDirection.value = direction;
  categoryLevel.value = "parent";
  selectedParentCategoryId.value = parentCategories.value[0]?.id ?? null;
  expandedParentCategoryId.value = null;
  resetCategoryDraft();
}

function selectParentCategory(id: string) {
  selectedParentCategoryId.value = id;
  if (!editingCategoryId.value && categoryLevel.value === "child") {
    categoryDraft.parentId = id;
  }
}

function toggleParentChildren(id: string) {
  selectedParentCategoryId.value = id;
  expandedParentCategoryId.value = expandedParentCategoryId.value === id ? null : id;
}

function openPersonalChildren(parent: CategoryRecord) {
  selectedParentCategoryId.value = parent.id;
  selectedPersonalChildParent.value = parent;
  personalChildrenVisible.value = true;
}

function editPersonalChild(child: CategoryRecord) {
  personalChildrenVisible.value = false;
  editCategory(child);
}

function deletePersonalChild(id: string) {
  personalChildrenVisible.value = false;
  deleteCategory(id);
}

function startCreateChildFromModal() {
  const parentId = selectedPersonalChildParent.value?.id;
  personalChildrenVisible.value = false;
  if (parentId) startCreateChildCategory(parentId);
}

function startCreateParentCategory() {
  categoryLevel.value = "parent";
  resetCategoryDraft();
  categoryDraft.sort = String(Math.max(0, ...personalBatchItems.value.filter((item) => !item.parentId).map((item) => item.sort)) + 10);
  categoryEditorVisible.value = true;
}

function startCreateChildCategory(parentId = selectedParentCategoryId.value) {
  if (!parentId) {
    setCategoryMessage("请先创建或选择一个一级分类。", "danger");
    return;
  }
  const parent = visiblePersonalCategories.value.find((item) => item.id === parentId);
  categoryLevel.value = "child";
  selectedParentCategoryId.value = parentId;
  resetCategoryDraft();
  categoryDraft.parentId = parentId;
  categoryDraft.sort = String(Math.max(parent?.sort ?? 0, ...childCategoriesOf(parentId).map((item) => item.sort)) + 10);
  if (parent) {
    categoryDomain.value = parent.domain;
    categoryDirection.value = parent.type === "income" ? "income" : "expense";
    categoryDraft.scopes = [...scopesOf(parent)];
  }
  initialCategoryDraftSnapshot.value = serializeCategoryDraft();
  categoryEditorVisible.value = true;
}

function transactionSummary(transaction: TransactionRecord) {
  const sign = transaction.type === "income" ? "+" : "-";
  const date = transaction.occurredAt.slice(0, 10);
  const title = transaction.merchant || transaction.note || transaction.categorySnapshot?.subCategoryName || transaction.categorySnapshot?.categoryName || "未命名记账";
  return `${date} ${title} ${sign}¥${transaction.amount.toFixed(2)}`;
}


async function saveCategory() {
  savingCategory.value = true;
  setCategoryMessage("");
  try {
    const sort = Number(categoryDraft.sort);
    if (!Number.isFinite(sort)) throw new Error("排序必须是数字");
    const monthlyBudget = categoryDraft.monthlyBudget.trim() ? Number(categoryDraft.monthlyBudget) : undefined;
    if (monthlyBudget !== undefined && (!Number.isFinite(monthlyBudget) || monthlyBudget < 0)) {
      throw new Error("月预算必须是大于等于 0 的数字");
    }
    if (categoryLevel.value === "child" && !categoryDraft.parentId) {
      throw new Error("新增子分类时必须选择所属一级分类");
    }
    if (!categoryDraft.scopes.length) throw new Error("请至少选择一个适用范围");
  const type = categoryDomain.value === "transaction"
    ? categoryDirection.value
    : categoryDomain.value === "asset"
      ? "other"
      : categoryDraft.type as CategoryRecord["type"];
    const parentId = categoryLevel.value === "child" ? String(categoryDraft.parentId) : undefined;
    const budget = showCategoryBudgetField.value ? monthlyBudget : undefined;
    if (editingCategoryId.value) {
      await categoryService.update({
        id: editingCategoryId.value,
        name: categoryDraft.name,
        type,
        parentId,
        sort,
        scopes: categoryDraft.scopes,
        monthlyBudget: budget,
        iconUrl: categoryDraft.iconUrl || undefined,
        iconFileId: categoryDraft.iconFileId || undefined,
        enabled: categoryDraft.enabled,
      });
      setCategoryMessage("分类已保存。");
    } else {
      await categoryService.create({
        domain: categoryDomain.value,
        name: categoryDraft.name,
        type,
        parentId,
        sort,
        scopes: categoryDraft.scopes,
        monthlyBudget: budget,
        iconUrl: categoryDraft.iconUrl || undefined,
        iconFileId: categoryDraft.iconFileId || undefined,
        enabled: categoryDraft.enabled,
      });
      setCategoryMessage("分类已新增。");
    }
    await store.refresh();
    if (!editingCategoryId.value) {
      resetCategoryDraft();
    } else {
      initialCategoryDraftSnapshot.value = serializeCategoryDraft();
    }
    categoryEditorVisible.value = false;
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "保存分类失败", "danger");
  } finally {
    savingCategory.value = false;
  }
}

async function setCategoryEnabled(category: CategoryRecord, enabled: boolean) {
  setCategoryMessage("");
  try {
    await categoryService.update({ id: category.id, enabled });
    await store.refresh();
    if (editingCategoryId.value === category.id) {
      categoryDraft.enabled = enabled;
      initialCategoryDraftSnapshot.value = serializeCategoryDraft();
    }
    setCategoryMessage(enabled ? "分类已恢复。" : "分类已停用。");
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "更新分类状态失败", "danger");
  }
}

function openPersonalBatchManager() {
  personalBatchIds.value = [];
  personalBatchOperation.value = "enable";
  personalBatchScopes.value = ["asset", "expense"];
  personalBatchVisible.value = true;
}

function selectAllPersonalBatchItems() {
  personalBatchIds.value = personalBatchItems.value.map((category) => category.id);
}

async function refreshPersonalCategories() {
  setCategoryMessage("");
  try {
    await store.refresh();
    setCategoryMessage("分类已刷新。");
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "刷新分类失败", "danger");
  }
}

async function applyPersonalBatch() {
  const selected = selectedPersonalBatchItems.value;
  if (!selected.length) {
    setCategoryMessage("请至少选择一个分类。", "danger");
    return;
  }
  if (personalBatchOperation.value === "delete") {
    personalBatchDeleteVisible.value = true;
    return;
  }
  if (personalBatchOperation.value === "scopes" && !personalBatchScopes.value.length) {
    setCategoryMessage("请至少选择一个适用范围。", "danger");
    return;
  }
  if (personalBatchOperation.value === "enable") {
    const blockedChildren = selected.filter((category) => category.parentId
      && store.categories.find((parent) => parent.id === category.parentId)?.enabled === false
      && !personalBatchIds.value.includes(String(category.parentId)));
    if (blockedChildren.length) {
      setCategoryMessage(`有 ${blockedChildren.length} 个子分类的一级分类已停用，请同时选择并启用一级分类。`, "danger");
      return;
    }
  }
  personalBatchSaving.value = true;
  setCategoryMessage("");
  try {
    if (personalBatchOperation.value === "enable" || personalBatchOperation.value === "disable") {
      const enabled = personalBatchOperation.value === "enable";
      const cascadedChildren = enabled ? [] : selected.flatMap((category) => category.parentId ? [] : childCategoriesOf(category.id));
      const updates = Array.from(new Map([...selected, ...cascadedChildren].map((category) => [category.id, category])).values());
      await Promise.all(updates.map((category) => categoryService.update({ id: category.id, enabled })));
    } else {
      const scopes = [...personalBatchScopes.value];
      const domain: CategoryDomain = scopes.includes("asset") ? "asset" : "transaction";
      await Promise.all(selected.map((category) => categoryService.update({
        id: category.id,
        domain,
        scopes,
        type: scopes.includes("income") && !scopes.includes("expense") ? "income" : category.type,
      })));
    }
    await store.refresh();
    personalBatchVisible.value = false;
    personalBatchIds.value = [];
    setCategoryMessage("批量操作已完成。");
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "批量更新分类失败", "danger");
  } finally {
    personalBatchSaving.value = false;
  }
}

async function confirmPersonalBatchDelete() {
  const selected = [...selectedPersonalBatchItems.value].sort((left, right) => Number(Boolean(right.parentId)) - Number(Boolean(left.parentId)));
  if (!selected.length) return;
  personalBatchDeleting.value = true;
  let deleted = 0;
  let retained = 0;
  try {
    for (const category of selected) {
      try {
        await categoryService.delete(category.id);
        deleted += 1;
      } catch {
        retained += 1;
      }
    }
    await store.refresh();
    personalBatchDeleteVisible.value = false;
    personalBatchIds.value = [];
    if (retained) {
      setCategoryMessage(`已删除 ${deleted} 个分类，${retained} 个分类因存在业务记录而保留。`, "danger");
    } else {
      personalBatchVisible.value = false;
      setCategoryMessage(`已删除 ${deleted} 个分类。`);
    }
  } finally {
    personalBatchDeleting.value = false;
  }
}

async function deleteCategory(id: string) {
  const category = store.categories.find((item) => item.id === id);
  if (!category) return;
  setCategoryMessage("");
  try {
    const impact = await buildDeleteCategoryImpact(category);
    pendingDeleteCategory.value = category;
    pendingDeleteImpact.value = impact.usage;
    pendingDeleteLatestTransaction.value = impact.latestTransaction;
    deleteCategoryModalVisible.value = true;
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "读取分类影响范围失败", "danger");
  }
}

function openMigrationFromDeleteModal() {
  if (!pendingDeleteCategory.value) return;
  const id = pendingDeleteCategory.value.id;
  deleteCategoryModalVisible.value = false;
  openMigrationPanel(id);
}

async function confirmDeleteCategory() {
  if (!pendingDeleteCategory.value) return;
  if (pendingDeleteBlockedReason.value) return;

  const id = pendingDeleteCategory.value.id;
  setCategoryMessage("");
  deleteCategoryLoading.value = true;
  try {
    await categoryService.delete(id);
    await store.refresh();
    if (editingCategoryId.value === id) resetCategoryDraft();
    deleteCategoryModalVisible.value = false;
    pendingDeleteCategory.value = null;
    pendingDeleteImpact.value = null;
    pendingDeleteLatestTransaction.value = null;
    setCategoryMessage("分类已删除。");
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除分类失败";
    setCategoryMessage(message, "danger");
    if (message.includes("记账记录")) {
      deleteCategoryModalVisible.value = false;
      openMigrationPanel(id);
    }
  } finally {
    deleteCategoryLoading.value = false;
  }
}

async function migrateCategoryTransactions() {
  if (!migrationSourceCategoryId.value || !migrationTargetCategoryId.value) {
    setCategoryMessage("请选择要迁移到的目标分类。", "danger");
    return;
  }

  migratingCategory.value = true;
  setCategoryMessage("");
  try {
    const count = await categoryService.migrateTransactions({
      fromCategoryId: migrationSourceCategoryId.value,
      toCategoryId: String(migrationTargetCategoryId.value),
      toSubCategoryId: migrationTargetSubCategoryId.value && migrationTargetSubCategoryId.value !== "none" ? String(migrationTargetSubCategoryId.value) : undefined,
    });
    await store.refresh();
    const sourceName = migrationSourceCategory.value?.name ?? "该分类";
    migrationCompletedCount.value = count;
    setCategoryMessage(`已迁移 ${count} 条记账记录。现在可以删除「${sourceName}」。`);
  } catch (err) {
    setCategoryMessage(err instanceof Error ? err.message : "迁移失败", "danger");
  } finally {
    migratingCategory.value = false;
  }
}

function openMigratedCategoryDeleteModal() {
  if (!migrationSourceCategoryId.value) return;
  deleteCategory(migrationSourceCategoryId.value);
}
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: var(--space-6);
  max-width: 1240px;
  margin: 0 auto;
}

.avatar img,
.profile-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-settings {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 420px;
}

.profile-photo-panel {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: var(--space-3);
  padding: 40px 32px;
  background: var(--color-bg-hover);
  border-right: 1px solid var(--color-border);
  text-align: center;
}

.profile-photo {
  overflow: hidden;
  display: grid;
  width: 104px;
  height: 104px;
  place-items: center;
  color: #fff;
  background: var(--color-primary);
  border-radius: 28px;
  font-size: 42px;
  font-weight: 800;
}

.profile-photo-panel h2,
.profile-photo-panel p {
  margin: 0;
}

.profile-photo-panel h2 {
  font-size: 15px;
}

.profile-photo-panel p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.text-danger-button {
  color: var(--color-danger);
  background: none;
  border: 0;
  cursor: pointer;
  font-size: 12px;
}

.profile-form {
  padding: 36px 40px;
}

.section-heading h2,
.section-heading p {
  margin: 0;
}

.section-heading h2 {
  font-size: 17px;
}

.section-heading p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.profile-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  margin-top: 28px;
}

.profile-form__grid label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.profile-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-6);
}

.personal-batch-modal { width: min(860px, calc(100vw - 48px)); overflow: hidden; border-radius: 18px; }
.personal-batch { display: grid; background: #fff; }
.personal-batch__head { display: flex; min-height: 112px; align-items: center; justify-content: space-between; padding: 22px 26px; color: #fff; background: linear-gradient(120deg, #1754c6, #3788ff); }
.personal-batch__head span { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 900; letter-spacing: .12em; }
.personal-batch__head h3 { margin: 0; font-size: 24px; }
.personal-batch__head button { display: grid; width: 34px; height: 34px; place-items: center; color: #fff; background: rgba(255,255,255,.16); border: 0; border-radius: 50%; cursor: pointer; font-size: 22px; }
.personal-batch__body { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr); gap: 18px; max-height: calc(100dvh - 260px); overflow: auto; padding: 22px 24px; }
.personal-batch__picker, .personal-batch__operation { display: grid; align-content: start; gap: 14px; padding: 16px; background: #f8fafc; border: 1px solid var(--color-border); border-radius: 16px; }
.personal-batch__picker-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.personal-batch__picker-head strong, .personal-batch__operation > strong { display: block; color: var(--color-text-primary); font-size: 16px; }
.personal-batch__picker-head small { display: block; margin-top: 4px; color: var(--color-text-muted); font-size: 12px; }
.personal-batch__picker-actions { display: flex; gap: 8px; }
.personal-batch__picker-actions button { padding: 6px 10px; color: var(--color-primary); background: #fff; border: 1px solid var(--color-border); border-radius: 8px; cursor: pointer; font-weight: 800; }
.personal-batch__list { display: grid; gap: 10px; max-height: 460px; overflow: auto; padding-right: 4px; }
.personal-batch__item { display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; gap: 12px; padding: 12px; background: #fff; border: 1px solid var(--color-border); border-radius: 13px; cursor: pointer; }
.personal-batch__item.child { margin-left: 24px; }
.personal-batch__item.checked { border-color: #1677ff; box-shadow: 0 0 0 3px rgba(22,119,255,.1); }
.personal-batch__item .item-icon { display: grid; width: 34px; height: 34px; overflow: hidden; place-items: center; color: #fff; border-radius: 9px; }
.personal-batch__item .item-icon img { width: 100%; height: 100%; object-fit: cover; }
.personal-batch__item strong, .personal-batch__item small { display: block; }
.personal-batch__item small { margin-top: 4px; color: var(--color-text-muted); font-size: 12px; }
.personal-batch__operation > label { display: grid; gap: 8px; font-size: 12px; font-weight: 800; }
.personal-batch__preview, .personal-batch__danger { padding: 14px; background: #fff; border: 1px solid var(--color-border); border-radius: 12px; }
.personal-batch__danger { color: #b42318; background: #fff1f0; border-color: #ffd5d2; }
.personal-batch__danger strong { color: #b42318; font-size: 13px; }
.personal-batch__danger p, .personal-batch__preview p { margin: 8px 0 0; line-height: 1.6; }
.personal-batch__preview span { color: var(--color-text-muted); font-size: 12px; font-weight: 800; }
.personal-batch__footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; background: #f8fafc; border-top: 1px solid var(--color-border); }

@media (max-width: 760px) {
  .personal-batch__body { grid-template-columns: 1fr; }
  .personal-batch__item.child { margin-left: 12px; }
}

.profile-logout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-6);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-border);
}

.profile-logout h3 {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-body);
}

.profile-logout p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-caption);
}

.profile-message {
  margin: var(--space-4) 0 0;
  color: var(--color-success);
  font-size: 12px;
}

.profile-message.danger {
  color: var(--color-danger);
}

.settings-section h2,
.category-form h4,
.danger-zone h3 {
  margin: 0;
}

.settings-section p,
.category-form p,
.danger-zone p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
}

.settings-section {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-5);
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.data-grid div {
  padding: var(--space-4);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.data-grid span {
  display: block;
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
}

.data-grid strong {
  display: block;
  margin-top: var(--space-2);
  color: var(--color-text-primary);
  font-size: 24px;
}

.danger-zone {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  background: #fff7f7;
  border: 1px solid #ffd0d0;
  border-radius: var(--radius-lg);
}

.backup-zone {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--color-primary-soft), #fff);
  border: 1px solid #bbd5ff;
  border-radius: var(--radius-lg);
}

.backup-zone h3 {
  margin: 0;
}

.action-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.hidden-file {
  display: none;
}

.backup-message {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  color: var(--color-success);
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-lg);
  font-weight: 700;
}

.backup-message.danger {
  color: var(--color-danger);
  background: #fff1f0;
  border-color: #ffccc7;
}

.delete-impact {
  display: grid;
  gap: var(--space-4);
}

.delete-impact__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.delete-impact__grid div,
.delete-impact__latest {
  display: grid;
  gap: 4px;
  padding: var(--space-3);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.delete-impact span {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.delete-impact strong {
  color: var(--color-text-primary);
  font-size: 16px;
}

.delete-impact__latest strong {
  font-size: 14px;
  line-height: 1.6;
}

.delete-impact p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  line-height: 1.7;
}

.delete-impact__actions {
  display: flex;
  justify-content: flex-end;
}

.category-editor {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-4);
  align-items: start;
}

.category-tabs {
  display: inline-flex;
  gap: var(--space-2);
  padding: 4px;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-tabs button {
  height: 34px;
  padding: 0 var(--space-3);
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 700;
}

.category-tabs button.active {
  color: var(--color-primary);
  background: #fff;
  box-shadow: var(--shadow-card);
}

.category-direction-tabs,
.category-level-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 4px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-direction-tabs button,
.category-level-tabs button {
  height: 34px;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 800;
}

.category-direction-tabs button.active,
.category-level-tabs button.active {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.ledger-category-manager {
  display: grid;
  gap: var(--space-4);
}

.ledger-category-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3);
  background: linear-gradient(135deg, #f8fbff, #fff);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.ledger-category-toolbar .category-direction-tabs {
  width: 280px;
}

.ledger-category-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  align-items: start;
}

.category-editor {
  grid-template-columns: minmax(0, 1fr);
}

.category-editor .category-list {
  order: 1;
}

.category-editor .category-form {
  order: 2;
}

.category-inspector {
  position: sticky;
  top: var(--space-4);
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 18px 42px rgba(15, 23, 42, .06);
}

.category-inspector__head span {
  display: inline-flex;
  width: fit-content;
  height: 24px;
  align-items: center;
  padding: 0 var(--space-2);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.category-inspector__head h4 {
  margin: var(--space-2) 0 0;
  font-size: var(--font-card-title);
}

.category-inspector label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.category-form {
  width: 100%;
  display: grid;
  gap: 0;
  overflow: hidden;
  background: #fff;
  border: 0;
  border-radius: 0;
}

.category-form__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 24px;
  color: #fff;
  background: linear-gradient(135deg, #1459d5, #3387ff);
}

.category-form__head span {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
}

.category-form__head h3 {
  margin: 8px 0 0;
  font-size: 22px;
}

.category-form__head > button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #fff;
  background: rgba(255, 255, 255, .16);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  font-size: 22px;
}

.category-form__body {
  display: grid;
  gap: var(--space-3);
  padding: 20px 24px;
}

.category-form label {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.category-form__hint {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  line-height: 1.6;
}

.category-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  background: var(--color-bg-hover);
  border-top: 1px solid var(--color-border);
}

.scope-field {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.scope-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.category-icon-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.category-icon-preview {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  overflow: hidden;
  color: var(--color-primary);
  background: #eef4ff;
  border: 1px solid #bbd5ff;
  border-radius: 12px;
  font-weight: 800;
}

.category-icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-enabled-row {
  display: flex !important;
  grid-template-columns: none;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.scope-options label {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 var(--space-2);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
}

.category-list {
  min-width: 0;
  display: grid;
  gap: var(--space-2);
}

.asset-category-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto auto;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-2);
}

.category-status-switch,
.category-sort-switch {
  display: inline-grid;
  grid-template-columns: repeat(3, 64px);
  padding: 3px;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.category-status-switch button,
.category-sort-switch button {
  height: 30px;
  padding: 0 8px;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.category-status-switch button.active,
.category-sort-switch button.active {
  color: var(--color-primary);
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .12);
  font-weight: 700;
}

.category-tree {
  min-width: 0;
  display: grid;
  gap: var(--space-3);
}

.category-tree__body {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.category-parent-card {
  display: grid;
  position: relative;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: center;
  overflow: hidden;
  padding: var(--space-4) var(--space-4) 0;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.category-parent-card.active {
  border-color: #9ec5ff;
  box-shadow: 0 18px 42px rgba(22, 119, 255, 0.1);
}

.category-parent-main {
  min-width: 0;
  display: block;
  padding-right: 112px;
  align-items: center;
  color: var(--color-text-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.category-parent-main .category-color,
.category-item .category-color {
  display: none;
}

.category-parent-card::before,
.category-item::before {
  display: grid;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #1677ff;
  border-radius: 14px;
  content: "分";
  font-size: 14px;
  font-weight: 800;
}

.category-parent-card strong,
.category-item strong {
  display: block;
  font-size: 16px;
}

.category-parent-card small,
.category-item small {
  display: block;
  margin-top: 6px;
  color: var(--color-text-secondary);
}

.category-card-footer {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: var(--space-3) calc(var(--space-4) * -1) 0;
  border-top: 1px solid var(--color-border);
}

.category-card-footer button,
.category-card-footer span {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-weight: 800;
}

.category-card-footer > :first-child {
  border-right: 1px solid var(--color-border);
}

.category-child-list {
  grid-column: 1 / -1;
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.category-child-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.category-child-item > button {
  display: grid;
  gap: 2px;
  color: var(--color-text-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.category-child-item span {
  font-weight: 800;
}

.category-child-item small {
  color: var(--color-text-tertiary);
}

.add-child-button {
  height: 36px;
  color: var(--color-primary);
  background: #fff;
  border: 1px dashed #9ec5ff;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 800;
}

.category-item {
  display: grid;
  position: relative;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: center;
  overflow: hidden;
  padding: var(--space-4) var(--space-4) 0;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.category-item > div:not(.category-actions):not(.category-card-footer) {
  padding-right: 112px;
}

.category-color {
  width: 12px;
  height: 36px;
  border-radius: 99px;
}

.category-item strong,
.category-item small {
  display: block;
}

.category-item__main {
  min-width: 0;
  padding-right: 112px;
  color: var(--color-text-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.category-item small {
  margin-top: 2px;
  color: var(--color-text-tertiary);
}

.category-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.personal-category-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 9px 10px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.personal-children-list {
  display: grid;
  gap: 10px;
  max-height: min(520px, calc(100dvh - 240px));
  overflow: auto;
  padding: 20px 24px;
}

.personal-category-child > button {
  min-width: 0;
  color: var(--color-text-primary);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.personal-category-child strong,
.personal-category-child small {
  display: block;
}

.personal-category-child small {
  margin-top: 2px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.personal-category-child > span {
  display: flex;
  gap: 6px;
}

.personal-category-child > span button {
  padding: 4px 8px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border: 1px solid #bbd5ff;
  border-radius: 7px;
  cursor: pointer;
  font-size: 12px;
}

.personal-category-child > span .danger {
  color: var(--color-danger);
  background: #fff1f0;
  border-color: #ffccc7;
}

.personal-category-badges {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: calc(var(--space-2) * -1);
}

.personal-category-badges em {
  padding: 3px 8px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 999px;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.personal-category-badges .scope-expense {
  color: #e64545;
  background: #fff1f0;
}

.personal-category-badges .scope-income {
  color: #129b62;
  background: #ecfdf3;
}

.personal-category-badges .disabled {
  color: #667085;
  background: #f2f4f7;
}

.category-actions {
  display: flex;
  gap: var(--space-2);
}

.category-parent-card > .category-actions,
.category-item > .category-actions {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
}

.category-actions button {
  height: 28px;
  min-width: 28px;
  padding: 0 var(--space-2);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border: 1px solid #bbd5ff;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 700;
}

.category-actions button.danger {
  color: var(--color-danger);
  background: #fff1f0;
  border-color: #ffccc7;
}

.category-message {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  color: var(--color-success);
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  font-size: var(--font-caption);
  font-weight: 700;
}

.category-message.danger {
  color: var(--color-danger);
  background: #fff1f0;
  border-color: #ffccc7;
}

.empty-category {
  padding: var(--space-5);
  text-align: center;
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

@media (max-width: 1100px) {
  .settings-header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .settings-nav {
    width: 100%;
  }

  .settings-nav a {
    flex: 1;
    justify-content: center;
  }

  .settings-overview {
    grid-template-columns: 1fr;
  }

  .profile-settings {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .category-editor,
  .ledger-category-layout,
  .backup-zone,
  .danger-zone {
    grid-template-columns: 1fr;
  }

  .ledger-category-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .ledger-category-toolbar .category-direction-tabs {
    width: 100%;
  }

  .category-inspector {
    position: static;
  }

  .category-form {
    width: auto;
  }

  .category-tree__body,
  .category-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .asset-category-toolbar {
    grid-template-columns: 1fr;
  }

  .category-sort-switch {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 760px) {
  .category-tree__body,
  .category-card-grid {
    grid-template-columns: 1fr;
  }

  .settings-identity {
    align-items: flex-start;
  }

  .settings-nav {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .settings-nav a {
    flex: 0 0 auto;
  }

  .settings-nav a span {
    white-space: nowrap;
  }

  .overview-card {
    grid-template-columns: 44px minmax(0, 1fr) 18px;
  }

  .overview-card__meta {
    display: none;
  }

  .profile-settings {
    grid-template-columns: 1fr;
  }

  .profile-photo-panel {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .profile-form {
    padding: var(--space-5);
  }

  .profile-form__grid,
  .data-grid {
    grid-template-columns: 1fr;
  }
}
</style>
