import {
  mutateJsonDb,
  nowIso,
  readJsonDb,
  type AccountFlowRecord,
  type AssetAddonRecord,
  type AssetRecord,
  type CategoryRecord,
  type MoneyAccountRecord,
  type RizhiData,
  type TransactionRecord,
} from "../db/sqliteStore.ts";
import { HttpError } from "../errors.ts";

const assetStatuses = new Set(["using", "idle", "transferred", "disposed"]);

export type ListAssetsInput = {
  status?: string;
  categoryId?: string;
  keyword?: string;
};

export type AssetDetail = {
  asset: AssetRecord;
  addons: AssetAddonRecord[];
  relatedTransactions: TransactionRecord[];
};

type AssetWriteInput = Record<string, unknown>;

type TransferAssetInput = {
  amount?: unknown;
  occurredAt?: unknown;
  accountId?: unknown;
  note?: unknown;
};

export async function listAssets(input: ListAssetsInput = {}): Promise<AssetRecord[]> {
  validateAssetFilters(input);

  const keyword = input.keyword?.trim().toLowerCase();
  const data = await readJsonDb();
  return (data.assets ?? []).filter((asset) => {
    if (input.status && asset.status !== input.status) return false;
    if (input.categoryId && asset.categoryId !== input.categoryId) return false;
    if (keyword && !`${asset.name} ${asset.brand ?? ""} ${asset.model ?? ""}`.toLowerCase().includes(keyword)) return false;
    return true;
  });
}

export async function getAssetDetail(assetId: string): Promise<AssetDetail> {
  const data = await readJsonDb();
  const asset = (data.assets ?? []).find((item) => item.id === assetId);
  if (!asset) {
    throw new HttpError(404, "ASSET_NOT_FOUND", "资产不存在");
  }

  return {
    asset,
    addons: (data.assetAddons ?? []).filter((addon) => addon.assetId === assetId),
    relatedTransactions: (data.transactions ?? []).filter((transaction) => transaction.assetId === assetId),
  };
}

export async function createAsset(input: AssetWriteInput): Promise<AssetRecord> {
  validateAssetDraft(input);
  return mutateJsonDb((data) => {
    const timestamp = nowIso();
    const assetId = createId("ast");
    const categoryId = requiredString(input.categoryId, "资产分类不能为空");
    validateAssetCategory(data, categoryId);
    const paymentAccountId = optionalString(input.paymentAccountId);
    let purchaseTransactionId: string | undefined;

    if (paymentAccountId) {
      const account = requireAccount(data, paymentAccountId, "付款账户不存在");
      const transaction = makePurchaseTransaction(data, assetId, input, timestamp);
      applyTransactionEffect(data, transaction, account);
      data.transactions ??= [];
      data.transactions.push(transaction);
      purchaseTransactionId = transaction.id;
    }

    const asset: AssetRecord = {
      ...input,
      id: assetId,
      userId: "user-local",
      name: requiredString(input.name, "资产名称不能为空").trim(),
      categoryId,
      status: "using",
      originalCost: positiveNumber(input.originalCost),
      currency: optionalString(input.currency) ?? "CNY",
      purchaseDate: requiredString(input.purchaseDate, "购买日期不能为空"),
      firstUseDate: optionalString(input.firstUseDate) ?? requiredString(input.purchaseDate, "购买日期不能为空"),
      paymentAccountId,
      purchaseTransactionId,
      attachments: Array.isArray(input.attachments) ? input.attachments : [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.assets ??= [];
    data.assets.push(asset);
    return asset;
  });
}

export async function updateAsset(assetId: string, input: AssetWriteInput): Promise<AssetRecord> {
  return mutateJsonDb((data) => {
    const assets = data.assets ?? [];
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) throw new HttpError(404, "ASSET_NOT_FOUND", "资产不存在");

    const updated = mergeDefined(asset, input) as AssetRecord;
    updated.id = asset.id;
    updated.name = requiredString(updated.name, "资产名称不能为空").trim();
    updated.categoryId = requiredString(updated.categoryId, "资产分类不能为空");
    validateAssetCategory(data, updated.categoryId);
    updated.originalCost = positiveNumber(updated.originalCost);
    updated.purchaseDate = requiredString(updated.purchaseDate, "购买日期不能为空");
    validateStatus(updated.status);
    updated.updatedAt = nowIso();

    syncPurchaseTransaction(data, asset, updated);
    Object.assign(asset, updated);
    return asset;
  });
}

export async function deleteAsset(assetId: string) {
  return mutateJsonDb((data) => {
    if (!(data.assets ?? []).some((asset) => asset.id === assetId)) {
      throw new HttpError(404, "ASSET_NOT_FOUND", "资产不存在");
    }
    const timestamp = nowIso();
    data.transactions = (data.transactions ?? []).map((transaction) => transaction.assetId === assetId
      ? { ...transaction, assetId: undefined, addonId: undefined, partEventId: undefined, updatedAt: timestamp }
      : transaction);
    data.assetAddons = (data.assetAddons ?? []).filter((addon) => addon.assetId !== assetId);
    data.assetPartEvents = (data.assetPartEvents ?? []).filter((event) => event.assetId !== assetId);
    data.assets = (data.assets ?? []).filter((asset) => asset.id !== assetId);
    return { deleted: true };
  });
}

export async function transferAsset(assetId: string, input: TransferAssetInput): Promise<TransactionRecord> {
  const amount = positiveNumber(input.amount);
  const occurredAt = requiredString(input.occurredAt, "转让时间不能为空");
  const accountId = requiredString(input.accountId, "收款账户不能为空");

  return mutateJsonDb((data) => {
    const asset = (data.assets ?? []).find((item) => item.id === assetId);
    if (!asset) throw new HttpError(404, "ASSET_NOT_FOUND", "资产不存在");
    if (asset.status === "transferred") throw new HttpError(409, "ASSET_ALREADY_TRANSFERRED", "当前资产已转让，不能重复转让");
    if (asset.status === "disposed") throw new HttpError(409, "ASSET_DISPOSED", "当前资产已处置，不能转让");

    const account = requireAccount(data, accountId, "收款账户不存在");
    const timestamp = nowIso();
    const transaction: TransactionRecord = withCategorySnapshot(data, {
      id: createId("tx"),
      type: "income",
      businessType: "asset_transfer",
      categoryId: "tx-asset-transfer",
      amount,
      occurredAt,
      accountId,
      assetId,
      merchant: "资产转让",
      note: optionalString(input.note) ?? `转让资产：${asset.name}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    applyTransactionEffect(data, transaction, account);
    data.transactions ??= [];
    data.transactions.push(transaction);
    Object.assign(asset, {
      status: "transferred",
      currentValue: amount,
      currentValueSource: "transfer",
      currentValueUpdatedAt: occurredAt,
      transferDate: occurredAt.slice(0, 10),
      transferAmount: amount,
      transferAccountId: accountId,
      transferTransactionId: transaction.id,
      updatedAt: timestamp,
    });
    return transaction;
  });
}

export async function revokeAssetTransfer(assetId: string) {
  return mutateJsonDb((data) => {
    const asset = (data.assets ?? []).find((item) => item.id === assetId);
    if (!asset) throw new HttpError(404, "ASSET_NOT_FOUND", "资产不存在");
    const transaction = (data.transactions ?? []).find((item) =>
      item.id === asset.transferTransactionId || (item.assetId === assetId && item.categoryId === "tx-asset-transfer"));
    if (!transaction) throw new HttpError(404, "TRANSACTION_NOT_FOUND", "没有找到资产转让收入记录");
    const accountId = requiredString(transaction.accountId, "收款账户不存在");
    const account = requireAccount(data, accountId, "收款账户不存在");

    rollbackTransactionEffect(data, transaction, account);
    data.transactions = (data.transactions ?? []).filter((item) => item.id !== transaction.id);
    Object.assign(asset, {
      status: "using",
      currentValue: undefined,
      currentValueSource: undefined,
      currentValueUpdatedAt: undefined,
      transferDate: undefined,
      transferAmount: undefined,
      transferAccountId: undefined,
      transferTransactionId: undefined,
      updatedAt: nowIso(),
    });
    return { revoked: true };
  });
}

function validateAssetFilters(input: ListAssetsInput) {
  if (input.status && !assetStatuses.has(input.status)) {
    throw new HttpError(400, "VALIDATION_ERROR", "资产状态不合法");
  }
}

function validateAssetDraft(input: AssetWriteInput) {
  requiredString(input.name, "资产名称不能为空");
  requiredString(input.categoryId, "资产分类不能为空");
  requiredString(input.purchaseDate, "购买日期不能为空");
  positiveNumber(input.originalCost);
}

function validateStatus(status: unknown) {
  if (typeof status !== "string" || !assetStatuses.has(status)) {
    throw new HttpError(400, "VALIDATION_ERROR", "资产状态不合法");
  }
}

function validateAssetCategory(data: RizhiData, categoryId: string): CategoryRecord {
  const category = (data.categories ?? []).find((item) => item.id === categoryId);
  if (!category) throw new HttpError(404, "CATEGORY_NOT_FOUND", "资产分类不存在");
  if (category.domain !== "asset") throw new HttpError(400, "CATEGORY_TYPE_MISMATCH", "请选择资产分类");
  if (category.parentId) throw new HttpError(400, "CATEGORY_LEVEL_INVALID", "资产只能选择一级分类");
  if (category.enabled === false || category.deletedAt) throw new HttpError(400, "CATEGORY_DISABLED", "该分类已停用");
  return category;
}

function syncPurchaseTransaction(data: RizhiData, original: AssetRecord, updated: AssetRecord) {
  const transactions = data.transactions ?? [];
  const existing = typeof original.purchaseTransactionId === "string"
    ? transactions.find((item) => item.id === original.purchaseTransactionId)
    : undefined;

  if (existing) {
    const oldAccount = requireAccount(data, requiredString(existing.accountId, "原付款账户不存在"), "原付款账户不存在");
    rollbackTransactionEffect(data, existing, oldAccount);
    if (typeof updated.paymentAccountId === "string" && updated.paymentAccountId) {
      const newAccount = requireAccount(data, updated.paymentAccountId, "付款账户不存在");
      const synced = {
        ...makePurchaseTransaction(data, updated.id, updated, nowIso()),
        id: existing.id,
        createdAt: existing.createdAt,
        note: existing.note || `购买资产：${updated.name}`,
      };
      applyTransactionEffect(data, synced, newAccount);
      data.transactions = transactions.map((item) => item.id === existing.id ? synced : item);
    } else {
      data.transactions = transactions.filter((item) => item.id !== existing.id);
      updated.purchaseTransactionId = undefined;
    }
    return;
  }

  if (typeof updated.paymentAccountId === "string" && updated.paymentAccountId) {
    const account = requireAccount(data, updated.paymentAccountId, "付款账户不存在");
    const transaction = makePurchaseTransaction(data, updated.id, updated, nowIso());
    applyTransactionEffect(data, transaction, account);
    data.transactions ??= [];
    data.transactions.push(transaction);
    updated.purchaseTransactionId = transaction.id;
  }
}

function makePurchaseTransaction(
  data: RizhiData,
  assetId: string,
  input: AssetWriteInput | AssetRecord,
  timestamp: string,
): TransactionRecord {
  const purchaseDate = requiredString(input.purchaseDate, "购买日期不能为空");
  return withCategorySnapshot(data, {
    id: createId("tx"),
    type: "asset_purchase",
    businessType: "asset_purchase",
    categoryId: "tx-asset-purchase",
    amount: positiveNumber(input.originalCost),
    occurredAt: `${purchaseDate}T00:00:00.000+08:00`,
    accountId: requiredString(input.paymentAccountId, "付款账户不存在"),
    assetId,
    merchant: input.merchant,
    note: `购买资产：${requiredString(input.name, "资产名称不能为空")}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function withCategorySnapshot(data: RizhiData, transaction: TransactionRecord): TransactionRecord {
  const category = (data.categories ?? []).find((item) => item.id === transaction.categoryId);
  const subCategory = transaction.subCategoryId
    ? (data.categories ?? []).find((item) => item.id === transaction.subCategoryId)
    : undefined;
  return {
    ...transaction,
    categorySnapshot: category || subCategory
      ? { categoryName: category?.name ?? "未分类", subCategoryName: subCategory?.name }
      : undefined,
  };
}

function requireAccount(data: RizhiData, accountId: string, message: string): MoneyAccountRecord {
  const account = data.accounts.find((item) => item.id === accountId);
  if (!account) throw new HttpError(404, "ACCOUNT_NOT_FOUND", message);
  return account;
}

function applyTransactionEffect(data: RizhiData, transaction: TransactionRecord, account: MoneyAccountRecord) {
  const balanceAfter = account.balance + accountDelta(account, requiredString(transaction.type, "交易类型不能为空"), positiveNumber(transaction.amount));
  data.accountFlows ??= [];
  data.accountFlows.push(createAccountFlow(account, transaction, balanceAfter));
  account.balance = balanceAfter;
  account.updatedAt = nowIso();
}

function rollbackTransactionEffect(data: RizhiData, transaction: TransactionRecord, account: MoneyAccountRecord) {
  account.balance -= accountDelta(account, requiredString(transaction.type, "交易类型不能为空"), positiveNumber(transaction.amount));
  account.updatedAt = nowIso();
  data.accountFlows = (data.accountFlows ?? []).filter((flow) => flow.transactionId !== transaction.id);
}

function accountDelta(account: MoneyAccountRecord, type: string, amount: number) {
  if (account.direction === "asset") return type === "income" || type === "refund" ? amount : -amount;
  return type === "income" || type === "refund" || type === "repayment" ? -amount : amount;
}

function createAccountFlow(
  account: MoneyAccountRecord,
  transaction: TransactionRecord,
  balanceAfter: number,
): AccountFlowRecord {
  return {
    id: createId("flow"),
    accountId: account.id,
    transactionId: transaction.id,
    direction: balanceAfter >= account.balance ? "in" : "out",
    amount: positiveNumber(transaction.amount),
    occurredAt: requiredString(transaction.occurredAt, "交易时间不能为空"),
    balanceAfter,
    note: optionalString(transaction.note),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function mergeDefined<T extends Record<string, unknown>>(source: T, patch: AssetWriteInput): T {
  const result = { ...source };
  for (const [key, value] of Object.entries(patch)) {
    if (key !== "id") result[key as keyof T] = value as T[keyof T];
  }
  return result;
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, "VALIDATION_ERROR", message);
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function positiveNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "金额必须大于 0");
  }
  return value;
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}
