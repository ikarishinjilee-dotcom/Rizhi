import { computed, reactive, ref, type ComputedRef, type Reactive, type Ref } from "vue";
import type { CategoryDomain, CategoryRecord, CategoryScope, TransactionRecord } from "@/domain/models";
import { categoryScopes as resolveCategoryScopes } from "@/domain/categoryScopes";
import type { useAppDataStore } from "@/stores/appDataStore";

type Store = ReturnType<typeof useAppDataStore>;
type CategoryService = {
  usage: (categoryId: string) => Promise<{ assets: number; transactions: number; childCategories: number; accounts: number }>;
};

export type SettingsCategoryState = {
  categoryDomain: Ref<CategoryDomain>;
  categoryDirection: Ref<"expense" | "income">;
  categoryLevel: Ref<"parent" | "child">;
  categoryEditorVisible: Ref<boolean>;
  selectedParentCategoryId: Ref<string | null>;
  expandedParentCategoryId: Ref<string | null>;
  personalChildrenVisible: Ref<boolean>;
  selectedPersonalChildParent: Ref<CategoryRecord | null>;
  editingCategoryId: Ref<string | null>;
  savingCategory: Ref<boolean>;
  uploadingCategoryIcon: Ref<boolean>;
  migratingCategory: Ref<boolean>;
  migrationSourceCategoryId: Ref<string | null>;
  migrationTargetCategoryId: Ref<string | number | null>;
  migrationTargetSubCategoryId: Ref<string | number | null>;
  migrationCompletedCount: Ref<number | null>;
  deleteCategoryModalVisible: Ref<boolean>;
  deleteCategoryLoading: Ref<boolean>;
  pendingDeleteCategory: Ref<CategoryRecord | null>;
  pendingDeleteImpact: Ref<{ assets: number; transactions: number; childCategories: number; accounts: number; total: number } | null>;
  pendingDeleteLatestTransaction: Ref<TransactionRecord | null>;
  categoryMessage: Ref<string>;
  categoryMessageTone: Ref<"success" | "danger">;
  categoryQuery: Ref<string>;
  assetCategorySort: Ref<"manual" | "name" | "usage">;
  assetCategoryStatus: Ref<"active" | "disabled" | "all">;
  personalCategoryScopeFilter: Ref<"all" | CategoryScope>;
  personalBatchVisible: Ref<boolean>;
  personalBatchIds: Ref<string[]>;
  personalBatchOperation: Ref<"enable" | "disable" | "scopes" | "delete">;
  personalBatchScopes: Ref<CategoryScope[]>;
  personalBatchSaving: Ref<boolean>;
  personalBatchDeleteVisible: Ref<boolean>;
  personalBatchDeleting: Ref<boolean>;
  categoryDraft: Reactive<{ name: string; type: string | number | null; parentId: string | number | null; sort: string; iconUrl: string; iconFileId: string; scopes: CategoryScope[]; monthlyBudget: string; enabled: boolean }>;
  initialCategoryDraftSnapshot: Ref<string>;
  visiblePersonalCategories: ComputedRef<CategoryRecord[]>;
  personalBatchItems: ComputedRef<CategoryRecord[]>;
  selectedPersonalBatchItems: ComputedRef<CategoryRecord[]>;
  selectedPersonalChildItems: ComputedRef<CategoryRecord[]>;
  activeTransactionCategories: ComputedRef<CategoryRecord[]>;
  parentCategories: ComputedRef<CategoryRecord[]>;
  parentCategoryOptions: ComputedRef<Array<{ label: string; value: string }>>;
  personalBatchPreviewText: ComputedRef<string>;
  selectedParentCategory: ComputedRef<CategoryRecord | undefined>;
  migrationSourceCategory: ComputedRef<CategoryRecord | undefined>;
  migrationTargetCategoryOptions: ComputedRef<Array<{ label: string; value: string }>>;
  migrationTargetSubCategoryOptions: ComputedRef<Array<{ label: string; value: string }>>;
  migrationTargetLabel: ComputedRef<string>;
  pendingDeleteBlockedReason: ComputedRef<string>;
  deleteCategoryModalTitle: ComputedRef<string>;
  deleteCategoryModalDescription: ComputedRef<string>;
  showCategoryBudgetField: ComputedRef<boolean>;
  isCategoryDraftDirty: ComputedRef<boolean>;
  categoryFormTitle: ComputedRef<string>;
  categoryFormDescription: ComputedRef<string>;
  childCategoriesOf: (parentId: string) => CategoryRecord[];
  scopesOf: (category: CategoryRecord) => CategoryScope[];
  scopeLabel: (scope: CategoryScope) => string;
  serializeCategoryDraft: () => string;
  setCategoryMessage: (message: string, tone?: "success" | "danger") => void;
  buildDeleteCategoryImpact: (category: CategoryRecord) => Promise<{ usage: { assets: number; transactions: number; childCategories: number; accounts: number; total: number }; latestTransaction: TransactionRecord | null }>;
};

export function useSettingsCategories(store: Store, categoryService: CategoryService): SettingsCategoryState {
  const categoryDomain = ref<CategoryDomain>("asset");
  const categoryDirection = ref<"expense" | "income">("expense");
  const categoryLevel = ref<"parent" | "child">("parent");
  const categoryEditorVisible = ref(false);
  const selectedParentCategoryId = ref<string | null>(null);
  const expandedParentCategoryId = ref<string | null>(null);
  const personalChildrenVisible = ref(false);
  const selectedPersonalChildParent = ref<CategoryRecord | null>(null);
  const editingCategoryId = ref<string | null>(null);
  const savingCategory = ref(false);
  const uploadingCategoryIcon = ref(false);
  const migratingCategory = ref(false);
  const migrationSourceCategoryId = ref<string | null>(null);
  const migrationTargetCategoryId = ref<string | number | null>(null);
  const migrationTargetSubCategoryId = ref<string | number | null>("none");
  const migrationCompletedCount = ref<number | null>(null);
  const deleteCategoryModalVisible = ref(false);
  const deleteCategoryLoading = ref(false);
  const pendingDeleteCategory = ref<CategoryRecord | null>(null);
  const pendingDeleteImpact = ref<{ assets: number; transactions: number; childCategories: number; accounts: number; total: number } | null>(null);
  const pendingDeleteLatestTransaction = ref<TransactionRecord | null>(null);
  const categoryMessage = ref("");
  const categoryMessageTone = ref<"success" | "danger">("success");
  const categoryQuery = ref("");
  const assetCategorySort = ref<"manual" | "name" | "usage">("manual");
  const assetCategoryStatus = ref<"active" | "disabled" | "all">("active");
  const personalCategoryScopeFilter = ref<"all" | CategoryScope>("all");
  const personalBatchVisible = ref(false);
  const personalBatchIds = ref<string[]>([]);
  const personalBatchOperation = ref<"enable" | "disable" | "scopes" | "delete">("enable");
  const personalBatchScopes = ref<CategoryScope[]>(["asset", "expense"]);
  const personalBatchSaving = ref(false);
  const personalBatchDeleteVisible = ref(false);
  const personalBatchDeleting = ref(false);
  const categoryDraft = reactive({ name: "", type: "other" as string | number | null, parentId: null as string | number | null, sort: "999", iconUrl: "", iconFileId: "", scopes: ["asset", "expense"] as CategoryScope[], monthlyBudget: "", enabled: true });
  const initialCategoryDraftSnapshot = ref("");

  const scopeLabel = (scope: CategoryScope) => ({ asset: "资产", expense: "支出", income: "收入" })[scope];
  const scopesOf = (category: CategoryRecord) => resolveCategoryScopes(category);
  const compareByManualOrder = (left: CategoryRecord, right: CategoryRecord) => left.sort - right.sort || left.name.localeCompare(right.name, "zh-CN");
  const childCategoriesOf = (parentId: string) => store.categories.filter((category) => !category.deletedAt && category.parentId === parentId).sort(compareByManualOrder);
  const setCategoryMessage = (message: string, tone: "success" | "danger" = "success") => { categoryMessage.value = message; categoryMessageTone.value = tone; };

  const visiblePersonalCategories = computed(() => {
    const keyword = categoryQuery.value.trim().toLowerCase();
    return store.categories.filter((category) => (category.domain === "asset" || category.domain === "transaction") && !category.parentId && !category.deletedAt)
      .filter((category) => assetCategoryStatus.value === "all" || (assetCategoryStatus.value === "disabled" ? category.enabled === false : category.enabled !== false))
      .filter((category) => personalCategoryScopeFilter.value === "all" || scopesOf(category).includes(personalCategoryScopeFilter.value))
      .filter((category) => !keyword || category.name.toLowerCase().includes(keyword)).sort(compareByManualOrder);
  });
  const personalBatchItems = computed(() => visiblePersonalCategories.value.flatMap((category) => [category, ...childCategoriesOf(category.id)]));
  const selectedPersonalBatchItems = computed(() => personalBatchItems.value.filter((category) => personalBatchIds.value.includes(category.id)));
  const selectedPersonalChildItems = computed(() => selectedPersonalChildParent.value ? childCategoriesOf(selectedPersonalChildParent.value.id) : []);
  const activeTransactionCategories = computed(() => store.categories.filter((category) => category.domain === "transaction" && category.type === categoryDirection.value && !category.deletedAt));
  const parentCategories = computed(() => activeTransactionCategories.value.filter((category) => !category.parentId).sort(compareByManualOrder));
  const parentCategoryOptions = computed(() => visiblePersonalCategories.value.map((category) => ({ label: category.name, value: category.id })));
  const personalBatchPreviewText = computed(() => {
    const count = personalBatchIds.value.length;
    if (!count) return "请选择至少一个分类。";
    if (personalBatchOperation.value === "enable") return `将启用 ${count} 个分类。`;
    if (personalBatchOperation.value === "disable") return `将停用 ${count} 个分类，已有记录仍会保留。`;
    if (personalBatchOperation.value === "delete") return `将尝试删除 ${count} 个分类，存在业务记录的分类会保留。`;
    return `将 ${count} 个分类的适用范围改为：${personalBatchScopes.value.map(scopeLabel).join(" / ") || "未选择"}`;
  });

  const selectedParentCategory = computed(() => parentCategories.value.find((category) => category.id === selectedParentCategoryId.value));
  const migrationSourceCategory = computed(() => store.categories.find((category) => category.id === migrationSourceCategoryId.value));
  const migrationTargetCategoryOptions = computed(() => {
    const source = migrationSourceCategory.value;
    if (!source) return [];
    return store.categories.filter((category) => category.domain === "transaction" && !category.parentId && !category.deletedAt && category.enabled !== false && category.type === source.type && category.id !== source.id).map((category) => ({ label: category.name, value: category.id }));
  });
  const migrationTargetSubCategoryOptions = computed(() => [{ label: "不选择子分类", value: "none" }, ...store.categories.filter((category) => category.domain === "transaction" && !category.deletedAt && category.enabled !== false && category.parentId === migrationTargetCategoryId.value).map((category) => ({ label: category.name, value: category.id }))]);
  const migrationTargetLabel = computed(() => {
    const parent = store.categories.find((category) => category.id === migrationTargetCategoryId.value);
    const sub = migrationTargetSubCategoryId.value && migrationTargetSubCategoryId.value !== "none" ? store.categories.find((category) => category.id === migrationTargetSubCategoryId.value) : undefined;
    if (!parent) return "未选择";
    return sub ? `${parent.name} / ${sub.name}` : parent.name;
  });
  const pendingDeleteBlockedReason = computed(() => {
    const impact = pendingDeleteImpact.value;
    if (!impact) return "";
    if (impact.transactions > 0) return `该分类底下已有 ${impact.transactions} 条记账记录，不能直接删除。请先把这些记账迁移到其他分类。`;
    if (impact.assets > 0) return `该分类已有 ${impact.assets} 个资产使用，不能直接删除。请先把对应资产改到其他分类。`;
    if (impact.accounts > 0) return `该分类已有 ${impact.accounts} 个账户使用，不能直接删除。请先把对应账户改到其他分类。`;
    return "";
  });
  const deleteCategoryModalTitle = computed(() => {
    const name = pendingDeleteCategory.value?.name;
    if (!name) return "删除分类";
    return pendingDeleteBlockedReason.value ? `不能删除「${name}」` : `删除「${name}」？`;
  });
  const deleteCategoryModalDescription = computed(() => pendingDeleteBlockedReason.value ? "这个分类仍在被业务数据使用。为了避免历史账单失去归属，需要先处理关联数据。" : "删除后不可恢复。系统会在确认时再次校验，如仍有关联业务数据会阻止删除。");
  const showCategoryBudgetField = computed(() => categoryDomain.value === "transaction" && categoryDirection.value === "expense" && categoryLevel.value === "parent");
  const serializeCategoryDraft = () => JSON.stringify({ categoryDomain: categoryDomain.value, categoryDirection: categoryDirection.value, categoryLevel: categoryLevel.value, editingCategoryId: editingCategoryId.value, ...categoryDraft });
  const isCategoryDraftDirty = computed(() => serializeCategoryDraft() !== initialCategoryDraftSnapshot.value);
  const categoryFormTitle = computed(() => editingCategoryId.value ? (categoryLevel.value === "child" ? "编辑子分类" : "编辑一级分类") : (categoryLevel.value === "child" ? "新增子分类" : "新增一级分类"));
  const categoryFormDescription = computed(() => categoryLevel.value === "child" ? `归属于${selectedParentCategory.value ? `「${selectedParentCategory.value.name}」` : "某个一级分类"}，用于更细地统计账单。` : categoryDirection.value === "expense" ? "一级分类用于支出大类统计，例如餐饮、出行、购物。" : "一级分类用于收入大类统计，例如工资、外快、资产收入。");

  async function buildDeleteCategoryImpact(category: CategoryRecord) {
    const usage = await categoryService.usage(category.id);
    const childIds = store.categories.filter((item) => item.parentId === category.id && !item.deletedAt).map((item) => item.id);
    const ids = new Set([category.id, ...childIds]);
    const relatedTransactions = store.transactions.filter((transaction) => ids.has(transaction.categoryId) || (transaction.subCategoryId && ids.has(transaction.subCategoryId))).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    const transactions = relatedTransactions.length || usage.transactions;
    return { usage: { ...usage, transactions, total: usage.assets + transactions + usage.childCategories + usage.accounts }, latestTransaction: relatedTransactions[0] ?? null };
  }

  return { categoryDomain, categoryDirection, categoryLevel, categoryEditorVisible, selectedParentCategoryId, expandedParentCategoryId, personalChildrenVisible, selectedPersonalChildParent, editingCategoryId, savingCategory, uploadingCategoryIcon, migratingCategory, migrationSourceCategoryId, migrationTargetCategoryId, migrationTargetSubCategoryId, migrationCompletedCount, deleteCategoryModalVisible, deleteCategoryLoading, pendingDeleteCategory, pendingDeleteImpact, pendingDeleteLatestTransaction, categoryMessage, categoryMessageTone, categoryQuery, assetCategorySort, assetCategoryStatus, personalCategoryScopeFilter, personalBatchVisible, personalBatchIds, personalBatchOperation, personalBatchScopes, personalBatchSaving, personalBatchDeleteVisible, personalBatchDeleting, categoryDraft, initialCategoryDraftSnapshot, visiblePersonalCategories, personalBatchItems, selectedPersonalBatchItems, selectedPersonalChildItems, activeTransactionCategories, parentCategories, parentCategoryOptions, personalBatchPreviewText, selectedParentCategory, migrationSourceCategory, migrationTargetCategoryOptions, migrationTargetSubCategoryOptions, migrationTargetLabel, pendingDeleteBlockedReason, deleteCategoryModalTitle, deleteCategoryModalDescription, showCategoryBudgetField, isCategoryDraftDirty, categoryFormTitle, categoryFormDescription, childCategoriesOf, scopesOf, scopeLabel, serializeCategoryDraft, setCategoryMessage, buildDeleteCategoryImpact };
}
