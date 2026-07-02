import { mutateJsonDb, readJsonDb, type CategoryRecord, type RizhiData } from "../db/sqliteStore.ts";
import { HttpError } from "../errors.ts";

const categoryDomains = new Set(["asset", "transaction", "account"]);

export type ListCategoriesInput = {
  domain?: string;
  type?: string;
  enabled?: string;
};

export async function listCategories(input: ListCategoriesInput = {}): Promise<CategoryRecord[]> {
  validateCategoryFilters(input);
  const enabled = parseEnabledFilter(input.enabled);

  const data = await readJsonDb();
  return (data.categories ?? [])
    .filter((category) => !input.domain || category.domain === input.domain)
    .filter((category) => !input.type || category.type === input.type)
    .filter((category) => enabled === undefined || (category.enabled !== false) === enabled)
    .sort((left, right) => left.sort - right.sort);
}

export type CategoryUsage = {
  assets: number;
  transactions: number;
  childCategories: number;
  accounts: number;
  total: number;
};

export async function getCategoryUsage(categoryId: string): Promise<CategoryUsage> {
  const data = await readJsonDb();
  const category = (data.categories ?? []).find((item) => item.id === categoryId);
  if (!category) throw new HttpError(404, "CATEGORY_NOT_FOUND", "分类不存在");

  const childIds = (data.categories ?? []).filter((item) => item.parentId === categoryId).map((item) => item.id);
  const ids = [categoryId, ...childIds];
  const assets = category.domain === "asset" ? (data.assets ?? []).filter((item) => item.categoryId === categoryId).length : 0;
  const transactions = category.domain === "transaction"
    ? (data.transactions ?? []).filter((item) => ids.includes(item.categoryId) || (item.subCategoryId ? ids.includes(item.subCategoryId) : false)).length
    : 0;
  const accounts = category.domain === "account" ? (data.accounts ?? []).filter((item) => item.type === category.type).length : 0;
  const childCategories = childIds.length;

  return {
    assets,
    transactions,
    childCategories,
    accounts,
    total: assets + transactions + childCategories + accounts,
  };
}

function validateCategoryFilters(input: ListCategoriesInput) {
  if (input.domain && !categoryDomains.has(input.domain)) {
    throw new HttpError(400, "VALIDATION_ERROR", "分类模块不合法");
  }
  parseEnabledFilter(input.enabled);
}

function parseEnabledFilter(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new HttpError(400, "VALIDATION_ERROR", "分类启用状态不合法");
}

export async function createCategory(input: Record<string, unknown>): Promise<CategoryRecord> {
  const domain = categoryDomain(input.domain);
  const name = requiredString(input.name, "分类名称不能为空");
  return mutateJsonDb((data) => {
    validateParent(data, input.parentId, domain, optionalString(input.type));
    const category: CategoryRecord = {
      ...input,
      id: createId("cat"),
      domain,
      type: domain === "asset" ? "other" : optionalString(input.type) ?? (domain === "transaction" ? "expense" : "other"),
      name: name.trim(),
      sort: typeof input.sort === "number" ? input.sort : 999,
      parentId: optionalString(input.parentId),
      enabled: typeof input.enabled === "boolean" ? input.enabled : true,
      isSystem: false,
    };
    data.categories ??= [];
    data.categories.push(category);
    return category;
  });
}

export async function updateCategory(categoryId: string, input: Record<string, unknown>): Promise<CategoryRecord> {
  return mutateJsonDb((data) => {
    const category = requireCategory(data, categoryId, "分类不存在");
    const patch = Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== "id" && value !== undefined));
    if ("name" in patch) patch.name = requiredString(patch.name, "分类名称不能为空").trim();
    if ("domain" in patch) patch.domain = categoryDomain(patch.domain);
    Object.assign(category, patch);
    if (category.domain === "asset") category.type = "other";
    return category;
  });
}

export async function deleteCategory(categoryId: string) {
  return mutateJsonDb((data) => {
    const category = requireCategory(data, categoryId, "分类不存在");
    const childIds = (data.categories ?? []).filter((item) => item.parentId === categoryId).map((item) => item.id);
    const ids = [categoryId, ...childIds];
    const transactionCount = category.domain === "transaction"
      ? (data.transactions ?? []).filter((item) => ids.includes(item.categoryId) || Boolean(item.subCategoryId && ids.includes(item.subCategoryId))).length
      : 0;
    if (transactionCount > 0) throw new HttpError(409, "CATEGORY_IN_USE", `该分类已有 ${transactionCount} 条记账记录，不能删除`);
    if (category.domain === "asset" && (data.assets ?? []).some((item) => ids.includes(item.categoryId))) {
      throw new HttpError(409, "CATEGORY_IN_USE", "该分类已有资产使用，不能删除");
    }
    if (category.domain === "account" && data.accounts.some((item) => item.type === category.type)) {
      throw new HttpError(409, "CATEGORY_IN_USE", "该分类已有账户使用，不能删除");
    }
    data.categories = (data.categories ?? []).filter((item) => !ids.includes(item.id));
    return { deleted: true };
  });
}

export async function migrateCategoryTransactions(fromCategoryId: string, input: Record<string, unknown>) {
  const toCategoryId = requiredString(input.toCategoryId, "目标分类不能为空");
  const toSubCategoryId = optionalString(input.toSubCategoryId);
  return mutateJsonDb((data) => {
    const source = requireCategory(data, fromCategoryId, "来源分类不存在");
    const target = requireCategory(data, toCategoryId, "目标分类不存在");
    const targetSub = toSubCategoryId ? requireCategory(data, toSubCategoryId, "目标子分类不存在") : undefined;
    if (source.domain !== "transaction" || target.domain !== "transaction") {
      throw new HttpError(400, "CATEGORY_TYPE_MISMATCH", "只能迁移记账分类");
    }
    if (target.parentId) throw new HttpError(400, "CATEGORY_LEVEL_INVALID", "目标一级分类不能是子分类");
    if (target.enabled === false || target.deletedAt) throw new HttpError(400, "CATEGORY_DISABLED", "目标分类已停用");
    if (source.type !== target.type) throw new HttpError(400, "CATEGORY_TYPE_MISMATCH", "只能迁移到同类型分类");
    if (targetSub && (targetSub.parentId !== target.id || targetSub.type !== target.type)) {
      throw new HttpError(400, "CATEGORY_LEVEL_INVALID", "目标子分类不属于目标一级分类");
    }
    const childIds = source.parentId ? [] : (data.categories ?? []).filter((item) => item.parentId === source.id).map((item) => item.id);
    const sourceIds = [source.id, ...childIds];
    let migratedCount = 0;
    for (const transaction of data.transactions ?? []) {
      if (!sourceIds.includes(transaction.categoryId) && !(transaction.subCategoryId && sourceIds.includes(transaction.subCategoryId))) continue;
      transaction.categoryId = target.id;
      transaction.subCategoryId = targetSub?.id;
      transaction.categorySnapshot = { categoryName: target.name, subCategoryName: targetSub?.name };
      migratedCount += 1;
    }
    return { migratedCount };
  });
}

function validateParent(data: RizhiData, parentIdValue: unknown, domain: CategoryRecord["domain"], type?: string) {
  const parentId = optionalString(parentIdValue);
  if (!parentId) return;
  const parent = requireCategory(data, parentId, "父级分类不存在");
  if (parent.parentId) throw new HttpError(400, "CATEGORY_LEVEL_INVALID", "暂不支持三级分类");
  if (parent.domain !== domain || (type && parent.type !== type)) {
    throw new HttpError(400, "CATEGORY_TYPE_MISMATCH", "子分类必须与父分类类型一致");
  }
}

function requireCategory(data: RizhiData, id: string, message: string) {
  const category = (data.categories ?? []).find((item) => item.id === id);
  if (!category) throw new HttpError(404, "CATEGORY_NOT_FOUND", message);
  return category;
}

function categoryDomain(value: unknown): CategoryRecord["domain"] {
  if (value !== "asset" && value !== "transaction" && value !== "account") {
    throw new HttpError(400, "VALIDATION_ERROR", "分类模块不合法");
  }
  return value;
}

function requiredString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, "VALIDATION_ERROR", message);
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}
