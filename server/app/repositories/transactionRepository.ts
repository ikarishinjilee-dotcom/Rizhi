import {
  mutateJsonDb,
  nowIso,
  type AccountFlowRecord,
  type AssetAddonRecord,
  type MoneyAccountRecord,
  type RizhiData,
  type TransactionRecord,
} from "../db/sqliteStore.ts";
import { HttpError } from "../errors.ts";

type Input = Record<string, unknown>;

export async function createTransaction(input: Input, type: "expense" | "income"): Promise<TransactionRecord> {
  const draft = transactionDraft(input, type);
  return mutateJsonDb((data) => {
    validateCategory(data, draft.categoryId, type, draft.subCategoryId);
    const account = requireAccount(data, draft.accountId, "账户不存在");
    const timestamp = nowIso();
    const transaction = withSnapshot(data, {
      id: createId("tx"),
      ...draft,
      businessType: optionalString(input.businessType) ?? "normal",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    applyEffect(data, transaction, account);
    data.transactions ??= [];
    data.transactions.push(transaction);
    return transaction;
  });
}

export async function updateTransaction(transactionId: string, input: Input): Promise<TransactionRecord> {
  const type = transactionType(input.type);
  const draft = transactionDraft(input, type);
  return mutateJsonDb((data) => {
    const transaction = requireTransaction(data, transactionId);
    assertEditable(transaction);
    validateCategory(data, draft.categoryId, type, draft.subCategoryId);
    const oldAccount = requireAccount(data, requiredString(transaction.accountId, "原账户不存在"), "原账户不存在");
    const newAccount = requireAccount(data, draft.accountId, "账户不存在");
    rollbackEffect(data, transaction, oldAccount);
    const updated = withSnapshot(data, {
      ...transaction,
      ...draft,
      businessType: optionalString(input.businessType) ?? optionalString(transaction.businessType) ?? "normal",
      addonId: optionalString(input.addonId),
      updatedAt: nowIso(),
    });
    applyEffect(data, updated, newAccount);
    Object.assign(transaction, updated);
    return transaction;
  });
}

export async function deleteTransaction(transactionId: string) {
  return mutateJsonDb((data) => {
    const transaction = requireTransaction(data, transactionId);
    assertEditable(transaction);
    const account = requireAccount(data, requiredString(transaction.accountId, "账户不存在"), "账户不存在");
    rollbackEffect(data, transaction, account);
    data.transactions = (data.transactions ?? []).filter((item) => item.id !== transactionId);
    return { deleted: true };
  });
}

export async function convertTransactionToAssetAddon(input: Input) {
  const transactionId = requiredString(input.id, "交易不能为空");
  const assetId = requiredString(input.assetId, "资产不能为空");
  const amount = positiveNumber(input.amount);
  const occurredAt = requiredString(input.occurredAt, "发生时间不能为空");
  const accountId = requiredString(input.accountId, "账户不能为空");
  const addonType = validAddonType(input.addonType);

  return mutateJsonDb((data) => {
    const transaction = requireTransaction(data, transactionId);
    assertEditable(transaction);
    const asset = (data.assets ?? []).find((item) => item.id === assetId);
    if (!asset) throw new HttpError(404, "ASSET_NOT_FOUND", "资产不存在");
    if (asset.status === "transferred" || asset.status === "disposed") {
      throw new HttpError(409, "ASSET_LOCKED", "当前资产已结束，不能新增附加项");
    }
    const oldAccount = requireAccount(data, requiredString(transaction.accountId, "原账户不存在"), "原账户不存在");
    const newAccount = requireAccount(data, accountId, "账户不存在");
    const timestamp = nowIso();
    const addonId = createId("addon");
    const updated = withSnapshot(data, {
      ...transaction,
      type: "expense",
      businessType: "asset_addon",
      categoryId: addonCategory(addonType),
      subCategoryId: undefined,
      amount,
      occurredAt,
      accountId,
      assetId,
      addonId,
      merchant: optionalString(input.merchant),
      note: optionalString(input.note),
      updatedAt: timestamp,
    });
    const addon: AssetAddonRecord = {
      id: addonId,
      assetId,
      name: optionalString(input.merchant)?.trim() || optionalString(input.note)?.trim() || "资产附加项",
      direction: "expense",
      type: addonType,
      amount,
      currency: optionalString(asset.currency),
      purchaseDate: occurredAt.slice(0, 10),
      merchant: optionalString(input.merchant),
      paymentAccountId: accountId,
      transactionId: transaction.id,
      includedInCost: Boolean(input.includedInCost),
      notes: optionalString(input.note),
      attachments: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    rollbackEffect(data, transaction, oldAccount);
    applyEffect(data, updated, newAccount);
    Object.assign(transaction, updated);
    data.assetAddons ??= [];
    data.assetAddons.push(addon);
    asset.updatedAt = timestamp;
    return { addon, transaction };
  });
}

function transactionDraft(input: Input, type: "expense" | "income") {
  return {
    type,
    categoryId: requiredString(input.categoryId, "分类不能为空"),
    subCategoryId: optionalString(input.subCategoryId),
    amount: positiveNumber(input.amount),
    occurredAt: requiredString(input.occurredAt, "发生时间不能为空"),
    accountId: requiredString(input.accountId, "账户不能为空"),
    assetId: optionalString(input.assetId),
    merchant: optionalString(input.merchant),
    note: optionalString(input.note),
  };
}

function validateCategory(data: RizhiData, categoryId: string, type: string, subCategoryId?: string) {
  const category = (data.categories ?? []).find((item) => item.id === categoryId);
  if (!category) throw new HttpError(404, "CATEGORY_NOT_FOUND", "交易分类不存在");
  if (category.domain !== "transaction") throw new HttpError(400, "CATEGORY_TYPE_MISMATCH", "请选择交易分类");
  if (category.deletedAt || category.enabled === false) throw new HttpError(400, "CATEGORY_DISABLED", "该分类已停用");
  if (category.type !== type) throw new HttpError(400, "CATEGORY_TYPE_MISMATCH", "交易类型与分类不一致");
  if (!subCategoryId) return;
  const sub = (data.categories ?? []).find((item) => item.id === subCategoryId);
  if (!sub) throw new HttpError(404, "CATEGORY_NOT_FOUND", "交易子分类不存在");
  if (sub.parentId !== categoryId || sub.type !== category.type) {
    throw new HttpError(400, "CATEGORY_LEVEL_INVALID", "子分类不属于当前一级分类");
  }
}

function assertEditable(transaction: TransactionRecord) {
  if (
    transaction.type === "asset_purchase"
    || transaction.categoryId === "tx-asset-purchase"
    || transaction.categoryId === "tx-asset-transfer"
    || transaction.addonId
    || transaction.partEventId
  ) {
    throw new HttpError(409, "TRANSACTION_PROTECTED", "系统生成流水不能直接编辑或删除");
  }
}

function withSnapshot(data: RizhiData, transaction: TransactionRecord): TransactionRecord {
  const category = (data.categories ?? []).find((item) => item.id === transaction.categoryId);
  const sub = transaction.subCategoryId
    ? (data.categories ?? []).find((item) => item.id === transaction.subCategoryId)
    : undefined;
  return {
    ...transaction,
    categorySnapshot: category || sub
      ? { categoryName: category?.name ?? "未分类", subCategoryName: sub?.name }
      : undefined,
  };
}

function applyEffect(data: RizhiData, transaction: TransactionRecord, account: MoneyAccountRecord) {
  const balanceAfter = account.balance + accountDelta(account, requiredString(transaction.type, "交易类型不能为空"), positiveNumber(transaction.amount));
  data.accountFlows ??= [];
  data.accountFlows.push(createFlow(account, transaction, balanceAfter));
  account.balance = balanceAfter;
  account.updatedAt = nowIso();
}

function rollbackEffect(data: RizhiData, transaction: TransactionRecord, account: MoneyAccountRecord) {
  account.balance -= accountDelta(account, requiredString(transaction.type, "交易类型不能为空"), positiveNumber(transaction.amount));
  account.updatedAt = nowIso();
  data.accountFlows = (data.accountFlows ?? []).filter((flow) => flow.transactionId !== transaction.id);
}

function accountDelta(account: MoneyAccountRecord, type: string, amount: number) {
  if (account.direction === "asset") return type === "income" || type === "refund" ? amount : -amount;
  return type === "income" || type === "refund" || type === "repayment" ? -amount : amount;
}

function createFlow(account: MoneyAccountRecord, transaction: TransactionRecord, balanceAfter: number): AccountFlowRecord {
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

function requireTransaction(data: RizhiData, id: string) {
  const transaction = (data.transactions ?? []).find((item) => item.id === id);
  if (!transaction) throw new HttpError(404, "TRANSACTION_NOT_FOUND", "交易不存在");
  return transaction;
}

function requireAccount(data: RizhiData, id: string, message: string) {
  const account = data.accounts.find((item) => item.id === id);
  if (!account) throw new HttpError(404, "ACCOUNT_NOT_FOUND", message);
  return account;
}

function transactionType(value: unknown): "expense" | "income" {
  if (value !== "expense" && value !== "income") throw new HttpError(400, "VALIDATION_ERROR", "交易类型不合法");
  return value;
}

function validAddonType(value: unknown): NonNullable<AssetAddonRecord["type"]> {
  if (!["accessory", "repair", "maintenance", "upgrade", "consumable", "other"].includes(String(value))) {
    throw new HttpError(400, "VALIDATION_ERROR", "附加项类型不合法");
  }
  return value as NonNullable<AssetAddonRecord["type"]>;
}

function addonCategory(type: string) {
  const map: Record<string, string> = {
    accessory: "tx-asset-addon-accessory",
    repair: "tx-asset-addon-repair",
    maintenance: "tx-asset-addon-maintenance",
    upgrade: "tx-asset-addon-upgrade",
    consumable: "tx-asset-addon-consumable",
    other: "tx-asset-addon-other",
  };
  return map[type] ?? "tx-asset-addon-accessory";
}

function requiredString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, "VALIDATION_ERROR", message);
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function positiveNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "金额必须大于 0");
  }
  return value;
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}
