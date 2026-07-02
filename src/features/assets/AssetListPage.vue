<template>
  <RDataGate :loading="store.loading" :ready="store.initialized" :error="store.error" @retry="initializeData">
    <section class="asset-list-page">
    <div class="asset-list-page__content">
      <div class="asset-list-page__head">
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="{ active: activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <RButton data-testid="asset-create-button" @click="openCreateModal">+ 新增资产</RButton>
      </div>

      <div class="filters">
        <RInput v-model="query" class="asset-list-page__search" placeholder="搜索资产" />
        <RSelect v-model="statusFilter" :options="statusOptions" placeholder="全部状态" />
        <RSelect v-model="categoryFilter" :options="categoryOptions" placeholder="全部分类" />
        <RSelect v-model="sortBy" :options="sortOptions" placeholder="排序：购买日期" />
        <div class="view-switch">
          <button :class="{ active: viewMode === 'card' }" type="button" @click="viewMode = 'card'">▦</button>
          <button :class="{ active: viewMode === 'table' }" type="button" @click="viewMode = 'table'">☰</button>
        </div>
      </div>

      <div v-if="filteredAssets.length && viewMode === 'card'" class="asset-grid">
        <AssetCard
          v-for="asset in filteredAssets"
          :key="asset.id"
          :asset="asset"
          @open="openAsset"
          @edit="openEditModal"
          @delete="openDeleteModal"
        />
      </div>

      <RCard v-else-if="filteredAssets.length" class="asset-table-card">
        <table class="simple-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>分类</th>
              <th>资产总成本</th>
              <th>持有天数</th>
              <th>日均成本</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in filteredAssets" :key="asset.id" @click="openAsset(asset.id)">
              <td>{{ asset.name }}</td>
              <td>{{ asset.category }}</td>
              <td>¥{{ asset.totalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 }) }}</td>
              <td>{{ asset.days }} 天</td>
              <td>¥{{ asset.dailyCost.toFixed(2) }}</td>
              <td><RTag tone="success">{{ asset.status }}</RTag></td>
            </tr>
          </tbody>
        </table>
      </RCard>

      <REmptyState v-else title="没有找到资产" description="换个关键词或清空筛选试试。">
        <RButton variant="secondary" @click="clearFilters">清空筛选</RButton>
      </REmptyState>

      <div class="pagination">
        <span>显示 {{ filteredAssets.length }} 条，共 {{ store.assets.length }} 条资产</span>
      </div>
    </div>

    <AssetUpsertModal
      v-model:show="showAssetModal"
      :asset="editingAsset"
      :error="assetFormError"
      :loading="saving"
      :mode="editingAsset ? 'edit' : 'create'"
      @save="saveAsset"
    />

    <DeleteConfirmModal
      v-model:show="showDeleteModal"
      :loading="deleting"
      :title="`删除「${deletingAsset?.name ?? '该资产'}」？`"
      description="删除后会移除资产档案和附加项。历史记账流水会保留，但会解除与该资产的关联。"
      confirm-text="删除资产"
      @confirm="confirmDeleteAsset"
    >
      <div class="delete-detail">
        <span>资产总成本</span>
        <strong>¥{{ deletingAssetTotalCost.toLocaleString("zh-CN", { minimumFractionDigits: 2 }) }}</strong>
      </div>
      <div class="delete-detail">
        <span>附加项数量</span>
        <strong>{{ deletingAddonCount }} 项</strong>
      </div>
    </DeleteConfirmModal>
    </section>
  </RDataGate>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AssetCard, { type AssetCardItem } from "@/components/business/AssetCard.vue";
import AssetUpsertModal, { type AssetUpsertDraft } from "@/components/business/AssetUpsertModal.vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import RButton from "@/components/ui/RButton.vue";
import RCard from "@/components/ui/RCard.vue";
import REmptyState from "@/components/ui/REmptyState.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RTag from "@/components/ui/RTag.vue";
import RDataGate from "@/components/ui/RDataGate.vue";
import { assetCategoryKind, assetImageUrls, assetTotalCost } from "@/domain/assetCalculations";
import type { AssetRecord } from "@/domain/models";
import { assetService } from "@/services/assetService";
import { useAppDataStore } from "@/stores/appDataStore";

const router = useRouter();
const store = useAppDataStore();

const query = ref("");
const activeTab = ref("all");
const statusFilter = ref<string | number | null>("all");
const categoryFilter = ref<string | number | null>("all");
const sortBy = ref<string | number | null>("purchaseDate");
const viewMode = ref<"card" | "table">("card");
const showAssetModal = ref(false);
const showDeleteModal = ref(false);
const saving = ref(false);
const deleting = ref(false);
const assetFormError = ref("");
const editingAssetId = ref<string | null>(null);
const deletingAssetId = ref<string | null>(null);

const editingAsset = computed(() => editingAssetId.value ? store.assets.find((asset) => asset.id === editingAssetId.value) ?? null : null);
const deletingAsset = computed(() => deletingAssetId.value ? store.assets.find((asset) => asset.id === deletingAssetId.value) ?? null : null);
const deletingAssetTotalCost = computed(() => deletingAsset.value ? assetTotalCost(deletingAsset.value, store.assetAddons) : 0);
const deletingAddonCount = computed(() => deletingAssetId.value ? store.assetAddons.filter((addon) => addon.assetId === deletingAssetId.value).length : 0);
const assetCategories = computed(() => store.categories
  .filter((category) => category.domain === "asset" && !category.deletedAt && category.enabled !== false)
  .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, "zh-CN")));
const tabs = computed(() => [
  { label: `全部 (${store.assets.length})`, value: "all" },
  ...assetCategories.value.map((category) => ({
    label: `${category.name} (${store.assets.filter((asset) => asset.categoryId === category.id).length})`,
    value: category.id,
  })),
]);
const statusOptions = [
  { label: "全部状态", value: "all" },
  { label: "使用中", value: "using" },
  { label: "闲置", value: "idle" },
  { label: "已转让", value: "transferred" },
  { label: "已处置", value: "disposed" },
];
const categoryOptions = computed(() => [
  { label: "全部分类", value: "all" },
  ...assetCategories.value.map((category) => ({ label: category.name, value: category.id })),
]);
const sortOptions = [
  { label: "排序：购买日期", value: "purchaseDate" },
  { label: "排序：日均成本", value: "dailyCost" },
  { label: "排序：资产总成本", value: "totalCost" },
];

const filteredAssets = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return store.assets
    .filter((asset) => {
      const category = categoryName(asset.categoryId);
      const matchesKeyword = !keyword || `${asset.name}${asset.brand ?? ""}${asset.model ?? ""}${category}`.toLowerCase().includes(keyword);
      const matchesTab = isAllFilter(activeTab.value) || asset.categoryId === activeTab.value;
      const matchesCategory = isAllFilter(categoryFilter.value) || asset.categoryId === categoryFilter.value;
      const matchesStatus = isAllFilter(statusFilter.value) || asset.status === statusFilter.value;
      return matchesKeyword && matchesTab && matchesCategory && matchesStatus;
    })
    .map(toAssetCard)
    .sort((a, b) => {
      const currentSort = sortBy.value || "purchaseDate";
      if (currentSort === "dailyCost") return b.dailyCost - a.dailyCost;
      if (currentSort === "totalCost") return b.totalCost - a.totalCost;
      const rawA = store.assets.find((asset) => asset.id === a.id)?.purchaseDate ?? "";
      const rawB = store.assets.find((asset) => asset.id === b.id)?.purchaseDate ?? "";
      return rawB.localeCompare(rawA);
    });
});

onMounted(initializeData);

async function initializeData() {
  await store.init().catch(() => undefined);
}

function categoryName(id: string) {
  return store.categories.find((category) => category.id === id)?.name ?? "未分类";
}

function isAllFilter(value: string | number | null) {
  return value === null || value === "all";
}

function statusLabel(status: AssetRecord["status"]) {
  const labels: Record<AssetRecord["status"], string> = {
    using: "使用中",
    idle: "闲置",
    transferred: "已转让",
    disposed: "已处置",
  };
  return labels[status];
}

function dayDiff(from: string, to = Date.now()) {
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return 1;
  return Math.max(1, Math.ceil((to - start) / 86_400_000));
}

function warrantyDays(asset: AssetRecord) {
  if (!asset.warrantyEndDate) return undefined;
  return Math.max(0, Math.ceil((new Date(asset.warrantyEndDate).getTime() - Date.now()) / 86_400_000));
}

function imageTone(kind: ReturnType<typeof assetCategoryKind>): AssetCardItem["imageTone"] {
  if (kind === "digital") return "blue";
  if (kind === "subscription") return "dark";
  if (kind === "home" || kind === "sports") return "warm";
  return "gray";
}

function toAssetCard(asset: AssetRecord): AssetCardItem {
  const days = dayDiff(asset.purchaseDate);
  const totalCost = assetTotalCost(asset, store.assetAddons);
  const images = assetImageUrls(asset);
  return {
    id: asset.id,
    name: asset.name,
    brand: asset.brand,
    category: categoryName(asset.categoryId),
    totalCost,
    days,
    dailyCost: totalCost / days,
    warrantyDays: warrantyDays(asset),
    status: statusLabel(asset.status),
    symbol: (asset.name || "R").slice(0, 1).toUpperCase(),
    imageTone: imageTone(assetCategoryKind(asset, store.categories)),
    imageUrl: images[0],
    imageUrls: images,
  };
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/[¥￥,\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("请输入正确金额");
  return amount;
}

function normalizeDraftImages(draft: AssetUpsertDraft) {
  return Array.from(draft.imageUrls)
    .filter((url): url is string => typeof url === "string" && Boolean(url))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function toDateString(value: number | null) {
  const date = value ? new Date(value) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function openAsset(id: string) {
  router.push(`/assets/${id}`);
}

function openCreateModal() {
  editingAssetId.value = null;
  assetFormError.value = "";
  showAssetModal.value = true;
}

function openEditModal(id: string) {
  editingAssetId.value = id;
  assetFormError.value = "";
  showAssetModal.value = true;
}

function openDeleteModal(id: string) {
  deletingAssetId.value = id;
  showDeleteModal.value = true;
}

async function confirmDeleteAsset() {
  if (!deletingAssetId.value) return;

  deleting.value = true;
  try {
    await assetService.delete(deletingAssetId.value);
    await store.refresh();
    showDeleteModal.value = false;
    deletingAssetId.value = null;
  } finally {
    deleting.value = false;
  }
}

function clearFilters() {
  query.value = "";
  activeTab.value = "all";
  statusFilter.value = "all";
  categoryFilter.value = "all";
}

async function saveAsset(draft: AssetUpsertDraft) {
  const selectedCategory = store.categories.find((category) => category.id === draft.categoryId) ?? assetCategories.value[0];
  if (!selectedCategory) {
    assetFormError.value = "资产分类尚未加载，请刷新页面后重试。";
    return;
  }

  saving.value = true;
  assetFormError.value = "";
  try {
    const imageUrls = normalizeDraftImages(draft);
    const payload = {
      name: draft.name.trim() || "未命名资产",
      brand: draft.brand.trim() || undefined,
      model: draft.model.trim() || undefined,
      categoryId: selectedCategory.id,
      originalCost: parseAmount(draft.cost),
      currency: "CNY" as const,
      purchaseDate: toDateString(draft.purchaseDate),
      firstUseDate: toDateString(draft.purchaseDate),
      purchaseChannel: "online" as const,
      merchant: draft.channel.trim() || undefined,
      paymentAccountId: draft.accountId ? String(draft.accountId) : undefined,
      warrantyStartDate: draft.warrantyStart ? toDateString(draft.warrantyStart) : undefined,
      warrantyEndDate: draft.warrantyEnd ? toDateString(draft.warrantyEnd) : undefined,
      expectedUseDays: draft.life ? Number(draft.life) * 365 : undefined,
      notes: draft.note.trim() || undefined,
      imageUrl: draft.imageUrl || imageUrls[0] || undefined,
      imageUrls: imageUrls.length ? imageUrls : undefined,
    };

    if (editingAsset.value) {
      await assetService.update({ id: editingAsset.value.id, ...payload });
    } else {
      await assetService.create(payload);
    }

    await store.refresh();
    showAssetModal.value = false;
    editingAssetId.value = null;
    assetFormError.value = "";
  } catch (err) {
    assetFormError.value = err instanceof Error ? err.message : "资产保存失败，请检查表单后重试。";
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.asset-list-page {
  display: grid;
  gap: var(--space-5);
}

.asset-list-page__search {
  min-width: 220px;
}

.asset-list-page__content,
.filters,
.asset-list-page__head {
  display: grid;
  gap: var(--space-4);
}

.asset-list-page__head {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.tabs,
.filters,
.view-switch {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.tabs {
  flex-wrap: wrap;
}

.tabs button,
.view-switch button {
  height: 32px;
  padding: 0 var(--space-4);
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.tabs button.active,
.view-switch button.active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-color: #bbd5ff;
  font-weight: 700;
}

.filters {
  grid-template-columns: 220px 140px 140px 180px 1fr;
}

.view-switch {
  justify-self: end;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.asset-table-card {
  overflow: hidden;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
}

.simple-table th,
.simple-table td {
  height: 48px;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-table);
  text-align: left;
}

.simple-table th {
  color: #667085;
  background: var(--color-bg-hover);
}

.simple-table tr {
  cursor: pointer;
}

.simple-table tr:hover {
  background: var(--color-bg-hover);
}

.pagination {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: flex-end;
  color: var(--color-text-secondary);
}

.delete-detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  font-size: var(--font-table);
}

.delete-detail + .delete-detail {
  border-top: 1px solid var(--color-border);
}

.delete-detail span {
  color: var(--color-text-tertiary);
}

.delete-detail strong {
  color: var(--color-text-primary);
}
</style>
