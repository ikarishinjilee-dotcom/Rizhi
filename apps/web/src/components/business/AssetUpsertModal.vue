<template>
  <n-modal
    :show="show"
    preset="card"
    :bordered="false"
    :closable="false"
    :mask-closable="false"
    class="rizhi-asset-modal-card"
    content-style="padding: 0;"
    :style="{ width: 'min(940px, calc(100vw - 48px))', maxHeight: 'calc(100dvh - 48px)', borderRadius: '18px', overflow: 'hidden' }"
    @update:show="$emit('update:show', $event)"
  >
    <section class="asset-modal" data-testid="asset-upsert-modal">
      <header class="asset-modal__hero">
        <div>
          <span>{{ mode === "edit" ? "编辑物品资产" : "新增物品资产" }}</span>
          <h2>{{ mode === "edit" ? "调整资产档案和成本信息" : "把一次购买沉淀成可追踪的生活资产" }}</h2>
          <p>
            {{
              mode === "edit"
                ? "编辑后会影响资产成本、保修提醒、日均成本和关联记账展示。"
                : "资产会关联付款账户，并在后续计算保修、附加项、日均成本和当前估值。"
            }}
          </p>
        </div>
        <button type="button" data-testid="asset-upsert-close" aria-label="关闭" @click="requestClose">×</button>
      </header>

      <div class="asset-modal__body">
        <aside class="asset-uploader">
          <div class="asset-uploader__preview">
            <img v-if="coverImage" :src="coverImage" :alt="draft.name || '资产图片'" />
            <span v-else>{{ previewSymbol }}</span>
          </div>
          <strong>资产主图</strong>
          <p>支持商品图、订单截图或实拍图。上传多张后，可在资产详情页通过缩略图切换查看。</p>
          <input ref="fileInput" data-testid="asset-image-input" class="asset-uploader__file" type="file" accept="image/*" multiple @change="handleImageFiles" />
          <RButton variant="secondary" @click="fileInput?.click()">选择图片</RButton>
          <div v-if="draft.imageUrls.length" class="asset-uploader__thumbs">
            <button
              v-for="(image, index) in draft.imageUrls"
              :key="imageKey(image, index)"
              :class="{ active: draft.imageUrl === image }"
              type="button"
              @click="draft.imageUrl = image"
            >
              <img :src="image" :alt="imageAlt(index)" />
              <span data-testid="asset-image-remove" @click.stop="openRemoveImageConfirm(index)">×</span>
            </button>
          </div>
        </aside>

        <div class="asset-form">
          <section class="form-section">
            <h3>基础信息</h3>
            <div class="form-grid">
              <label :class="{ invalid: errors.name }"><span>资产名称</span><RInput v-model="draft.name" data-testid="asset-name-field" placeholder="例如 iPhone 16 Pro" /><em>{{ errors.name }}</em></label>
              <label><span>品牌</span><RInput v-model="draft.brand" placeholder="例如 Apple" /></label>
              <label><span>型号 / 规格</span><RInput v-model="draft.model" placeholder="例如 256GB / 黑色 / M2" /></label>
              <label><span>购买渠道</span><RInput v-model="draft.channel" placeholder="Apple 官网 / 京东 / 线下门店" /></label>
            </div>
            <CategoryCascadePicker
              v-model:category-id="draft.categoryId"
              scope="asset"
              title="资产分类"
              selection-mode="final"
            />
          </section>

          <section class="form-section">
            <h3>购买与资金</h3>
            <div class="form-grid form-grid--three">
              <label :class="{ invalid: errors.cost }"><span>购入价格</span><RInput v-model="draft.cost" data-testid="asset-cost-field" placeholder="¥ 0.00" /><em>{{ errors.cost }}</em></label>
              <label :class="{ invalid: errors.purchaseDate }"><span>购买日期</span><RDatePicker v-model="draft.purchaseDate" placeholder="选择日期" /><em>{{ errors.purchaseDate }}</em></label>
              <label :class="{ invalid: errors.accountId }"><span>付款账户</span><RSelect v-model="draft.accountId" :options="accountOptions" placeholder="选择账户" /><em>{{ errors.accountId }}</em></label>
            </div>
            <RInlineFeedback v-if="formError" tone="danger">{{ formError }}</RInlineFeedback>
            <div class="notice-card">
              <strong>联动预览</strong>
              <p>保存后会更新资产成本，并生成或关联一条记账记录，从资金账户同步扣款。</p>
            </div>
          </section>

          <section class="form-section">
            <h3>保修与生命周期</h3>
            <div class="form-grid form-grid--three">
              <label><span>保修开始</span><RDatePicker v-model="draft.warrantyStart" placeholder="选择日期" /></label>
              <label><span>过保日期</span><RDatePicker v-model="draft.warrantyEnd" placeholder="选择日期" /></label>
              <label><span>预计使用年限</span><RSelect v-model="draft.life" :options="lifeOptions" placeholder="选择年限" /></label>
            </div>
            <label class="wide-field"><span>备注</span><RInput v-model="draft.note" placeholder="例如主力机、办公使用、含 AppleCare 等" /></label>
          </section>
        </div>
      </div>

      <footer class="asset-modal__footer">
        <RButton data-testid="asset-upsert-cancel" variant="secondary" @click="requestClose">取消</RButton>
        <RButton data-testid="asset-upsert-save" :loading="loading" @click="submit">
          {{ mode === "edit" ? "保存修改" : "保存并创建资产" }}
        </RButton>
      </footer>
    </section>
  </n-modal>

  <DeleteConfirmModal
    v-model:show="showRemoveImageModal"
    title="移除这张资产图片？"
    description="移除后，这张图片不会随资产档案保存。若已经保存过该资产，保存修改后图片会从资产资料中移除。"
    eyebrow="移除图片"
    confirm-text="确认移除"
    @confirm="confirmRemoveImage"
  />

  <DeleteConfirmModal
    v-model:show="showUnsavedModal"
    title="放弃未保存的资产内容？"
    description="当前资产表单里有尚未保存的修改。离开后，这些文字、日期、账户选择和已上传图片都会丢失。"
    eyebrow="内容未保存"
    confirm-text="放弃离开"
    @confirm="confirmClose"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { NModal } from "naive-ui";
import CategoryCascadePicker from "@/components/business/CategoryCascadePicker.vue";
import DeleteConfirmModal from "@/components/business/DeleteConfirmModal.vue";
import RButton from "@/components/ui/RButton.vue";
import RDatePicker from "@/components/ui/RDatePicker.vue";
import RInput from "@/components/ui/RInput.vue";
import RSelect from "@/components/ui/RSelect.vue";
import RInlineFeedback from "@/components/ui/RInlineFeedback.vue";
import { assetImageUrls } from "@/domain/assetCalculations";
import { categoryHasScope } from "@/domain/categoryScopes";
import type { AssetRecord } from "@/domain/models";
import { useAppDataStore } from "@/stores/appDataStore";
import { imageFileToPersistentUrl } from "@/utils/imageFiles";

export type AssetUpsertDraft = {
  name: string;
  brand: string;
  model: string;
  categoryId: string | number | null;
  channel: string;
  cost: string;
  purchaseDate: number | null;
  accountId: string | number | null;
  warrantyStart: number | null;
  warrantyEnd: number | null;
  life: string | number | null;
  note: string;
  imageUrl: string;
  imageUrls: string[];
};

const props = withDefaults(defineProps<{
  show: boolean;
  mode?: "create" | "edit";
  loading?: boolean;
  asset?: AssetRecord | null;
  error?: string;
}>(), {
  mode: "create",
  loading: false,
  asset: null,
  error: "",
});

const emit = defineEmits<{
  "update:show": [value: boolean];
  save: [draft: AssetUpsertDraft];
}>();

const store = useAppDataStore();
const fileInput = ref<HTMLInputElement | null>(null);
const showRemoveImageModal = ref(false);
const showUnsavedModal = ref(false);
const pendingRemoveImageIndex = ref<number | null>(null);
const initialDraftSnapshot = ref("");

const assetCategories = computed(() => store.categories
  .filter((category) => categoryHasScope(category, "asset") && !category.deletedAt && category.enabled !== false)
  .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, "zh-CN")));
const accountOptions = computed(() => store.accounts.map((account) => ({ label: account.name, value: account.id })));
const lifeOptions = [1, 2, 3, 5, 8].map((year) => ({ label: `${year} 年`, value: year }));

const draft = reactive<AssetUpsertDraft>({
  name: "",
  brand: "",
  model: "",
  categoryId: null,
  channel: "",
  cost: "",
  purchaseDate: Date.now(),
  accountId: null,
  warrantyStart: Date.now(),
  warrantyEnd: Date.now() + 365 * 24 * 60 * 60 * 1000,
  life: null,
  note: "",
  imageUrl: "",
  imageUrls: [],
});
const errors = reactive({
  name: "",
  cost: "",
  purchaseDate: "",
  accountId: "",
  form: "",
});

const previewSymbol = computed(() => draft.name.trim().slice(0, 1).toUpperCase() || "R");
const coverImage = computed(() => draft.imageUrl || draft.imageUrls[0] || "");
const formError = computed(() => errors.form || props.error);
const isDirty = computed(() => props.show && serializeDraft() !== initialDraftSnapshot.value);

function toTime(value?: string) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function resetDraft() {
  const firstCategory = assetCategories.value[0]?.id ?? null;
  draft.name = props.asset?.name ?? "";
  draft.brand = props.asset?.brand ?? "";
  draft.model = props.asset?.model ?? "";
  draft.categoryId = props.asset?.categoryId ?? firstCategory;
  draft.channel = props.asset?.merchant ?? "";
  draft.cost = props.asset ? String(props.asset.originalCost) : "";
  draft.purchaseDate = toTime(props.asset?.purchaseDate) ?? Date.now();
  draft.accountId = props.asset?.paymentAccountId ?? store.accounts[0]?.id ?? null;
  draft.warrantyStart = toTime(props.asset?.warrantyStartDate) ?? draft.purchaseDate;
  draft.warrantyEnd = toTime(props.asset?.warrantyEndDate) ?? Date.now() + 365 * 24 * 60 * 60 * 1000;
  draft.life = props.asset?.expectedUseDays ? Math.round(props.asset.expectedUseDays / 365) : null;
  draft.note = props.asset?.notes ?? "";
  draft.imageUrls = props.asset ? assetImageUrls(props.asset) : [];
  draft.imageUrl = draft.imageUrls[0] || "";
  clearErrors();
  initialDraftSnapshot.value = serializeDraft();
}

function clearErrors() {
  errors.name = "";
  errors.cost = "";
  errors.purchaseDate = "";
  errors.accountId = "";
  errors.form = "";
}

function readAmount(value: string) {
  return Number(value.replace(/[¥￥,\s]/g, ""));
}

function validateDraft() {
  clearErrors();
  const amount = readAmount(draft.cost);
  if (!draft.name.trim()) errors.name = "请填写资产名称。";
  if (!draft.cost.trim()) {
    errors.cost = "请填写购入价格。";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.cost = "购入价格必须是大于 0 的数字。";
  }
  if (!draft.purchaseDate) errors.purchaseDate = "请选择购买日期。";
  if (!draft.accountId) errors.accountId = "请选择付款账户。";
  if (!assetCategories.value.length) {
    errors.form = "资产分类尚未加载，请刷新页面后重试。";
  } else if (!draft.categoryId) {
    errors.form = "请选择资产分类。";
  }
  return !errors.name && !errors.cost && !errors.purchaseDate && !errors.accountId && !errors.form;
}

function submit() {
  if (!validateDraft()) return;
  initialDraftSnapshot.value = serializeDraft();
  emit("save", { ...draft, imageUrls: [...draft.imageUrls] });
}

function serializeDraft() {
  return JSON.stringify({
    ...draft,
    imageUrls: [...draft.imageUrls],
  });
}

function requestClose() {
  if (isDirty.value) {
    showUnsavedModal.value = true;
    return;
  }
  emit("update:show", false);
}

function confirmClose() {
  showUnsavedModal.value = false;
  initialDraftSnapshot.value = serializeDraft();
  emit("update:show", false);
}

function imageKey(image: string, index: number) {
  return `${image.slice(0, 32)}-${index}`;
}

function imageAlt(index: number) {
  return `资产图片 ${index + 1}`;
}

async function handleImageFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (!files.length) return;

  try {
    const images = await Promise.all(files.map(imageFileToPersistentUrl));
    draft.imageUrls = [...draft.imageUrls, ...images].filter((url, index, urls) => urls.indexOf(url) === index);
    draft.imageUrl = draft.imageUrl || draft.imageUrls[0] || "";
    errors.form = "";
  } catch (error) {
    errors.form = error instanceof Error ? error.message : "图片处理失败，请重新选择。";
  }
  input.value = "";
}

function openRemoveImageConfirm(index: number) {
  pendingRemoveImageIndex.value = index;
  showRemoveImageModal.value = true;
}

function confirmRemoveImage() {
  if (pendingRemoveImageIndex.value === null) return;
  removeImage(pendingRemoveImageIndex.value);
  pendingRemoveImageIndex.value = null;
  showRemoveImageModal.value = false;
}

function removeImage(index: number) {
  const removed = draft.imageUrls[index];
  draft.imageUrls.splice(index, 1);
  if (draft.imageUrl === removed) {
    draft.imageUrl = draft.imageUrls[0] || "";
  }
}

watch(() => props.show, (show) => {
  if (show) resetDraft();
}, { immediate: true });

watch([() => props.asset, assetCategories, () => store.accounts.length], () => {
  if (props.show) resetDraft();
});
</script>

<style scoped>
.asset-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  background: var(--color-bg-card);
}

.asset-modal__hero {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  gap: var(--space-6);
  padding: 28px 32px;
  color: #fff;
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.26), transparent 24%),
    linear-gradient(135deg, #0f63d9, #1677ff 54%, #67a8ff);
}

.asset-modal__hero span {
  font-size: var(--font-caption);
  font-weight: 700;
  opacity: 0.86;
}

.asset-modal__hero h2 {
  margin: var(--space-2) 0;
  font-size: 24px;
}

.asset-modal__hero p {
  max-width: 620px;
  margin: 0;
  opacity: 0.84;
}

.asset-modal__hero button {
  width: 32px;
  height: 32px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.asset-modal__body {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: 230px 1fr;
  gap: var(--space-6);
  min-height: 0;
  overflow: auto;
  padding: 28px 32px;
}

.asset-uploader {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border-strong);
  border-radius: 14px;
}

.asset-uploader__preview {
  display: grid;
  height: 168px;
  overflow: hidden;
  place-items: center;
  color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary-soft), #fff);
  border-radius: var(--radius-lg);
  font-size: 42px;
  font-weight: 800;
}

.asset-uploader__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-uploader__file {
  display: none;
}

.asset-uploader__thumbs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
}

.asset-uploader__thumbs button {
  position: relative;
  height: 42px;
  overflow: hidden;
  padding: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.asset-uploader__thumbs button.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-soft);
}

.asset-uploader__thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-uploader__thumbs span {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  color: #fff;
  background: rgba(17, 24, 39, 0.72);
  border-radius: 50%;
  font-size: 12px;
  line-height: 1;
}

.asset-uploader p {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  line-height: 1.7;
}

.asset-form,
.form-section {
  display: grid;
  gap: var(--space-4);
}

.form-section {
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.form-section h3 {
  margin: 0;
  font-size: var(--font-card-title);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.form-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-grid label,
.wide-field {
  display: grid;
  grid-template-rows: auto auto 16px;
  align-content: start;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
  font-weight: 700;
}

.form-grid label.invalid {
  color: var(--color-danger);
}

.form-grid label.invalid :deep(.n-input),
.form-grid label.invalid :deep(.n-base-selection) {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 2px rgba(240, 68, 56, 0.08);
}

.form-grid label em {
  min-height: 16px;
  color: var(--color-danger);
  font-style: normal;
  font-weight: 600;
  line-height: 16px;
}

.form-error {
  padding: var(--space-3) var(--space-4);
  color: var(--color-danger);
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: var(--radius-lg);
  font-size: var(--font-caption);
  font-weight: 700;
}

.notice-card {
  padding: var(--space-4);
  background: var(--color-primary-soft);
  border-radius: var(--radius-lg);
}

.notice-card p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-caption);
}

.asset-modal__footer {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: 20px 32px;
  background: var(--color-bg-hover);
  border-top: 1px solid var(--color-border);
}
</style>

<style>
.rizhi-asset-modal-card.n-card {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  background: var(--color-bg-card);
  box-shadow: 0 24px 80px rgba(17, 24, 39, 0.22);
}

.rizhi-asset-modal-card .n-card__content {
  min-height: 0;
  overflow: hidden;
  padding: 0 !important;
}
</style>
