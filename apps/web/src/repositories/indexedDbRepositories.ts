import {
  convertTransactionToAssetAddon,
  createAssetAddonWithExpense,
  createAssetWithExpense,
  createMoneyAccount,
  deleteMoneyAccount,
  deleteAssetAddon,
  createTransaction,
  deleteAsset,
  deleteTransaction,
  revokeAssetTransfer,
  repayDebt,
  syncMissingAssetPartEventTransactions,
  transferAsset,
  transferFunds,
  updateMoneyAccount,
  updateAsset,
  updateAssetAddonWithExpense,
  updateTransaction,
  upgradeLegacyMidnightTransactionTimes,
} from "@/db/actions";
import { rizhiDb } from "@/db/rizhiDb";
import { resetSeedDatabase, seedDatabaseIfNeeded } from "@/db/seed";
import { categoryHasScope, transactionTypeToScope } from "@/domain/categoryScopes";
import type {
  AccountRepository,
  AppDataRepository,
  AssetAddonRepository,
  AssetRepository,
  CategoryRepository,
  CreateCategoryInput,
  ListCategoriesInput,
  MigrateCategoryTransactionsInput,
  TransactionRepository,
  UpdateCategoryInput,
} from "@/repositories/contracts";
import type { CategoryRecord, CategoryScope, ID, TransactionRecord } from "@/domain/models";

function createId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function defaultCategoryType(input: CreateCategoryInput): CategoryRecord["type"] {
  if (input.type) return input.type;
  if (input.domain === "asset") return "other";
  if (input.domain === "account") return "other";
  return "expense";
}

async function validateCategoryParent(input: Pick<CreateCategoryInput, "domain" | "type" | "parentId">) {
  if (!input.parentId) return;
  const parent = await rizhiDb.categories.get(input.parentId);
  if (!parent) throw new Error("父级分类不存在");
  if (parent.parentId) throw new Error("暂不支持三级分类");
  if (parent.domain !== input.domain) throw new Error("子分类必须和父分类属于同一模块");
  if (input.type && parent.type !== input.type) throw new Error("子分类必须和父分类类型一致");
  if (parent.deletedAt || parent.enabled === false) throw new Error("父级分类已停用，不能新增子分类");
}

function inputScopes(input: Pick<CreateCategoryInput, "domain" | "type" | "scopes">): CategoryScope[] | undefined {
  if (input.scopes?.length) return [...new Set(input.scopes)];
  if (input.domain === "asset") return ["asset", "expense"];
  if (input.domain === "transaction" && input.type === "income") return ["income"];
  if (input.domain === "transaction") return ["expense"];
  return undefined;
}

async function getCategoryUsage(id: ID) {
  const category = await rizhiDb.categories.get(id);
  if (!category) throw new Error("分类不存在");

  const [assets, transactions, subTransactions, childCategories, accounts] = await Promise.all([
    categoryHasScope(category, "asset") ? rizhiDb.assets.where("categoryId").equals(id).count() : Promise.resolve(0),
    categoryHasScope(category, "expense") || categoryHasScope(category, "income") ? rizhiDb.transactions.where("categoryId").equals(id).count() : Promise.resolve(0),
    categoryHasScope(category, "expense") || categoryHasScope(category, "income") ? rizhiDb.transactions.where("subCategoryId").equals(id).count() : Promise.resolve(0),
    rizhiDb.categories.where("parentId").equals(id).count(),
    category.domain === "account" && category.type ? rizhiDb.accounts.where("type").equals(category.type).count() : Promise.resolve(0),
  ]);

  return {
    assets,
    transactions: transactions + subTransactions,
    childCategories,
    accounts,
    total: assets + transactions + subTransactions + childCategories + accounts,
  };
}

async function categorySnapshot(categoryId: ID, subCategoryId?: ID) {
  const category = await rizhiDb.categories.get(categoryId);
  const subCategory = subCategoryId ? await rizhiDb.categories.get(subCategoryId) : undefined;
  return {
    categoryName: category?.name ?? "未分类",
    subCategoryName: subCategory?.name,
  };
}

async function validateMigrationTarget(input: MigrateCategoryTransactionsInput) {
  const [source, target, targetSub] = await Promise.all([
    rizhiDb.categories.get(input.fromCategoryId),
    rizhiDb.categories.get(input.toCategoryId),
    input.toSubCategoryId ? rizhiDb.categories.get(input.toSubCategoryId) : Promise.resolve(undefined),
  ]);
  if (!source) throw new Error("来源分类不存在");
  if (!target) throw new Error("目标分类不存在");
  const sourceScope = categoryHasScope(source, "income") ? "income" : categoryHasScope(source, "expense") ? "expense" : undefined;
  const targetScope = categoryHasScope(target, "income") ? "income" : categoryHasScope(target, "expense") ? "expense" : undefined;
  if (!sourceScope || !targetScope) throw new Error("只能迁移记账分类");
  if (target.parentId) throw new Error("目标一级分类不能是子分类");
  if (target.deletedAt || target.enabled === false) throw new Error("目标分类已停用");
  if (sourceScope !== targetScope) throw new Error("只能迁移到同类型分类");
  if (input.toSubCategoryId) {
    if (!targetSub) throw new Error("目标子分类不存在");
    if (targetSub.parentId !== target.id) throw new Error("目标子分类不属于目标一级分类");
    if (!categoryHasScope(targetSub, targetScope)) throw new Error("目标子分类类型不一致");
    if (targetSub.deletedAt || targetSub.enabled === false) throw new Error("目标子分类已停用");
  }
  return { source, target, targetSub };
}

export const indexedDbAppDataRepository: AppDataRepository = {
  async initialize() {
    await seedDatabaseIfNeeded();
    await upgradeLegacyMidnightTransactionTimes();
  },

  async reset() {
    await resetSeedDatabase();
  },

  async getSnapshot() {
    await syncMissingAssetPartEventTransactions();

    const [assets, assetAddons, accounts, transactions, accountFlows, categories] = await Promise.all([
      rizhiDb.assets.orderBy("createdAt").reverse().toArray(),
      rizhiDb.assetAddons.orderBy("createdAt").reverse().toArray(),
      rizhiDb.accounts.orderBy("createdAt").toArray(),
      rizhiDb.transactions.orderBy("occurredAt").reverse().toArray(),
      rizhiDb.accountFlows.orderBy("occurredAt").reverse().toArray(),
      rizhiDb.categories.orderBy("sort").toArray(),
    ]);

    return {
      assets,
      assetAddons,
      accounts,
      transactions,
      accountFlows,
      categories,
    };
  },
};

export const indexedDbAssetRepository: AssetRepository = {
  create: createAssetWithExpense,
  update: updateAsset,
  delete: deleteAsset,
  transfer: transferAsset,
  revokeTransfer: revokeAssetTransfer,
};

export const indexedDbAssetAddonRepository: AssetAddonRepository = {
  create: createAssetAddonWithExpense,
  update: updateAssetAddonWithExpense,
  delete: deleteAssetAddon,
};

export const indexedDbAccountRepository: AccountRepository = {
  create: createMoneyAccount,
  update: updateMoneyAccount,
  delete: deleteMoneyAccount,
  transfer: transferFunds,
  repayDebt,
};

export const indexedDbTransactionRepository: TransactionRepository = {
  create: createTransaction,
  update: updateTransaction,
  convertToAssetAddon: convertTransactionToAssetAddon,
  delete: deleteTransaction,
};

export const indexedDbCategoryRepository: CategoryRepository = {
  async list(input: ListCategoriesInput = {}) {
    const categories = await rizhiDb.categories.orderBy("sort").toArray();
    return categories
      .filter((category) => !input.domain || category.domain === input.domain)
      .filter((category) => !input.type || category.type === input.type)
      .filter((category) => !input.scope || categoryHasScope(category, input.scope))
      .filter((category) => input.enabled === undefined || (category.enabled !== false) === input.enabled)
      .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, "zh-CN"));
  },

  async create(input) {
    if (!input.name.trim()) throw new Error("分类名称不能为空");
    await validateCategoryParent({ domain: input.domain, type: defaultCategoryType(input), parentId: input.parentId });

    const category: CategoryRecord = {
      id: createId("cat"),
      domain: input.domain,
      type: defaultCategoryType(input),
      name: input.name.trim(),
      sort: input.sort ?? 999,
      parentId: input.parentId,
      color: input.color,
      icon: input.icon,
      iconUrl: input.iconUrl,
      iconFileId: input.iconFileId,
      scopes: inputScopes(input),
      monthlyBudget: input.monthlyBudget,
      enabled: input.enabled ?? true,
      isSystem: input.isSystem ?? false,
      accountGroup: input.accountGroup,
      accountDirection: input.accountDirection,
      bankId: input.bankId,
      deletedAt: input.deletedAt,
    };

    await rizhiDb.categories.put(category);
    return category;
  },

  async update(input: UpdateCategoryInput) {
    const category = await rizhiDb.categories.get(input.id);
    if (!category) throw new Error("分类不存在");
    if (input.name !== undefined && !input.name.trim()) throw new Error("分类名称不能为空");
    const nextParentId = input.parentId ?? category.parentId;
    const nextEnabled = input.enabled ?? category.enabled ?? true;
    await validateCategoryParent({
      domain: input.domain ?? category.domain,
      type: input.type ?? category.type,
      parentId: nextParentId,
    });
    if (nextParentId && nextEnabled) {
      const parent = await rizhiDb.categories.get(nextParentId);
      if (parent?.enabled === false) throw new Error("一级分类已停用，不能单独启用子分类");
    }

    const updated: CategoryRecord = {
      ...category,
      domain: input.domain ?? category.domain,
      type: input.type ?? category.type,
      name: input.name?.trim() ?? category.name,
      sort: input.sort ?? category.sort,
      parentId: nextParentId,
      color: input.color ?? category.color,
      icon: input.icon ?? category.icon,
      iconUrl: "iconUrl" in input ? input.iconUrl : category.iconUrl,
      iconFileId: "iconFileId" in input ? input.iconFileId : category.iconFileId,
      scopes: "scopes" in input ? input.scopes : category.scopes,
      monthlyBudget: "monthlyBudget" in input ? input.monthlyBudget : category.monthlyBudget,
      enabled: nextEnabled,
      isSystem: input.isSystem ?? category.isSystem ?? false,
      accountGroup: input.accountGroup ?? category.accountGroup,
      accountDirection: input.accountDirection ?? category.accountDirection,
      bankId: "bankId" in input ? input.bankId : category.bankId,
      deletedAt: input.deletedAt ?? category.deletedAt,
    };

    await rizhiDb.categories.put(updated);
    if (!updated.parentId && updated.enabled === false) {
      const children = await rizhiDb.categories.where("parentId").equals(updated.id).toArray();
      await Promise.all(children
        .filter((child) => child.enabled !== false)
        .map((child) => rizhiDb.categories.update(child.id, { enabled: false })));
    }
    return updated;
  },

  async delete(id) {
    const category = await rizhiDb.categories.get(id);
    if (!category) throw new Error("分类不存在");

    if (categoryHasScope(category, "expense") || categoryHasScope(category, "income")) {
      const children = await rizhiDb.categories.where("parentId").equals(id).toArray();
      const childIds = children.map((child) => child.id);
      const [directTransactions, subTransactions, childCategoryTransactions, childSubTransactions] = await Promise.all([
        rizhiDb.transactions.where("categoryId").equals(id).count(),
        rizhiDb.transactions.where("subCategoryId").equals(id).count(),
        Promise.all(childIds.map((childId) => rizhiDb.transactions.where("categoryId").equals(childId).count())),
        Promise.all(childIds.map((childId) => rizhiDb.transactions.where("subCategoryId").equals(childId).count())),
      ]);
      const transactionCount = directTransactions
        + subTransactions
        + childCategoryTransactions.reduce((sum, count) => sum + count, 0)
        + childSubTransactions.reduce((sum, count) => sum + count, 0);

      if (transactionCount > 0) {
        throw new Error(`该分类已有 ${transactionCount} 条记账记录，不能删除。请先把对应记账改到其他分类。`);
      }

      if (children.length && !categoryHasScope(category, "asset")) {
        await rizhiDb.categories.bulkDelete(childIds);
      }
    }

    const usage = await getCategoryUsage(id);
    if (usage.assets > 0) {
      throw new Error(`该分类已有 ${usage.assets} 个资产使用，不能删除。请先把对应资产改到其他分类。`);
    }
    if (usage.accounts > 0) {
      throw new Error(`该分类已有 ${usage.accounts} 个账户使用，不能删除。请先把对应账户改到其他分类。`);
    }
    if (usage.childCategories > 0) {
      throw new Error(`该分类下面还有 ${usage.childCategories} 个子分类，不能删除。请先删除子分类。`);
    }

    await rizhiDb.categories.delete(id);
  },

  usage: getCategoryUsage,

  async migrateTransactions(input) {
    const { source, target } = await validateMigrationTarget(input);
    const children = source.parentId ? [] : await rizhiDb.categories.where("parentId").equals(source.id).toArray();
    const sourceIds = [source.id, ...children.map((child) => child.id)];
    const [byCategoryGroups, bySubCategoryGroups] = await Promise.all([
      Promise.all(sourceIds.map((id) => rizhiDb.transactions.where("categoryId").equals(id).toArray())),
      Promise.all(sourceIds.map((id) => rizhiDb.transactions.where("subCategoryId").equals(id).toArray())),
    ]);
    const transactions = new Map<string, TransactionRecord>();
    for (const group of [...byCategoryGroups, ...bySubCategoryGroups]) {
      for (const transaction of group) transactions.set(transaction.id, transaction);
    }
    const snapshot = await categorySnapshot(target.id, input.toSubCategoryId);
    const timestamp = new Date().toISOString();
    const updates = Array.from(transactions.values()).filter(Boolean).map((transaction) => ({
      ...transaction!,
      categoryId: target.id,
      subCategoryId: input.toSubCategoryId,
      categorySnapshot: snapshot,
      updatedAt: timestamp,
    }));
    if (!updates.length) return 0;
    await rizhiDb.transactions.bulkPut(updates);
    return updates.length;
  },
};

