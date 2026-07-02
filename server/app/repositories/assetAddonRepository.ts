import {
  mutateJsonDb,
  nowIso,
  type AccountFlowRecord,
  type AssetAddonRecord,
  type AssetRecord,
  type MoneyAccountRecord,
  type RizhiData,
  type TransactionRecord,
} from "../db/sqliteStore.ts";
import { HttpError } from "../errors.ts";

type AddonWriteInput = Record<string, unknown>;
type AddonDirection = "expense" | "income";
type AddonType = "accessory" | "repair" | "maintenance" | "upgrade" | "consumable" | "other";

const addonTypes = new Set(["accessory", "repair", "maintenance", "upgrade", "consumable", "other"]);

export async function createAssetAddon(assetId: string, input: AddonWriteInput): Promise<AssetAddonRecord> {
  validateAddonDraft(input);
  return mutateJsonDb((data) => {
    const asset = requireAsset(data, assetId);
    assertAssetCanReceiveAddon(asset);
    const timestamp = nowIso();
    const direction = addonDirection(input.direction);
    const paymentAccountId = optionalString(input.paymentAccountId);
    const addonId = createId("addon");
    let transactionId: string | undefined;

    if (paymentAccountId) {
      const account = requireAccount(data, paymentAccountId, "账户不存在");
      const transaction = makeAddonTransaction(data, asset, addonId, input, direction, timestamp);
      applyTransactionEffect(data, transaction, account);
      data.transactions ??= [];
      data.transactions.push(transaction);
      transactionId = transaction.id;
    }

    const addon: AssetAddonRecord = {
      ...input,
      id: addonId,
      assetId,
      name: requiredString(input.name, "附加项名称不能为空").trim(),
      direction,
      type: addonType(input.type),
      amount: positiveNumber(input.amount),
      currency: optionalString(input.currency) ?? optionalString(asset.currency),
      purchaseDate: requiredString(input.purchaseDate, "日期不能为空"),
      paymentAccountId,
      transactionId,
      includedInCost: direction === "expense" && Boolean(input.includedInCost),
      attachments: Array.isArray(input.attachments) ? input.attachments : [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.assetAddons ??= [];
    data.assetAddons.push(addon);
    asset.updatedAt = timestamp;
    return addon;
  });
}

export async function updateAssetAddon(
  addonId: string,
  input: AddonWriteInput,
  expectedAssetId?: string,
): Promise<AssetAddonRecord> {
  return mutateJsonDb((data) => {
    const addon = (data.assetAddons ?? []).find((item) =>
      item.id === addonId && (!expectedAssetId || item.assetId === expectedAssetId));
    if (!addon) throw new HttpError(404, "ADDON_NOT_FOUND", "附加项不存在");
    const asset = requireAsset(data, addon.assetId);
    assertAssetCanReceiveAddon(asset);

    const updated = mergePatch(addon, input);
    updated.name = requiredString(updated.name, "附加项名称不能为空").trim();
    updated.direction = addonDirection(updated.direction);
    updated.type = addonType(updated.type);
    updated.amount = positiveNumber(updated.amount);
    updated.purchaseDate = requiredString(updated.purchaseDate, "日期不能为空");
    updated.paymentAccountId = optionalString(updated.paymentAccountId);
    updated.includedInCost = updated.direction === "expense" && Boolean(updated.includedInCost);
    updated.updatedAt = nowIso();

    syncAddonTransaction(data, asset, addon, updated);
    Object.assign(addon, updated);
    asset.updatedAt = updated.updatedAt;
    return addon;
  });
}

function syncAddonTransaction(
  data: RizhiData,
  asset: AssetRecord,
  original: AssetAddonRecord,
  updated: AssetAddonRecord,
) {
  const transactions = data.transactions ?? [];
  const existing = original.transactionId
    ? transactions.find((item) => item.id === original.transactionId)
    : undefined;

  if (existing) {
    const oldAccount = requireAccount(
      data,
      requiredString(existing.accountId, "原账户不存在"),
      "原账户不存在",
    );
    rollbackTransactionEffect(data, existing, oldAccount);

    if (updated.paymentAccountId) {
      const targetAccount = requireAccount(
        data,
        requiredString(updated.paymentAccountId, "账户不存在"),
        updated.direction === "income" ? "收款账户不存在" : "付款账户不存在",
      );
      const transaction = {
        ...makeAddonTransaction(data, asset, updated.id, updated, addonDirection(updated.direction), nowIso()),
        id: existing.id,
        createdAt: existing.createdAt,
      };
      applyTransactionEffect(data, transaction, targetAccount);
      data.transactions = transactions.map((item) => item.id === existing.id ? transaction : item);
    } else {
      data.transactions = transactions.filter((item) => item.id !== existing.id);
      updated.transactionId = undefined;
    }
    return;
  }

  if (updated.paymentAccountId) {
    const account = requireAccount(
      data,
      requiredString(updated.paymentAccountId, "账户不存在"),
      updated.direction === "income" ? "收款账户不存在" : "付款账户不存在",
    );
    const transaction = makeAddonTransaction(
      data,
      asset,
      updated.id,
      updated,
      addonDirection(updated.direction),
      nowIso(),
    );
    applyTransactionEffect(data, transaction, account);
    data.transactions ??= [];
    data.transactions.push(transaction);
    updated.transactionId = transaction.id;
  }
}

function makeAddonTransaction(
  data: RizhiData,
  asset: AssetRecord,
  addonId: string,
  input: AddonWriteInput | AssetAddonRecord,
  direction: AddonDirection,
  timestamp: string,
): TransactionRecord {
  const type = addonType(input.type);
  const transaction: TransactionRecord = {
    id: createId("tx"),
    type: direction,
    businessType: "asset_addon",
    categoryId: addonTransactionCategory(direction, type),
    amount: positiveNumber(input.amount),
    occurredAt: `${requiredString(input.purchaseDate, "日期不能为空")}T00:00:00.000+08:00`,
    accountId: requiredString(input.paymentAccountId, "账户不存在"),
    assetId: asset.id,
    addonId,
    merchant: optionalString(input.merchant) ?? requiredString(input.name, "附加项名称不能为空"),
    note: optionalString(input.notes)
      ?? `${direction === "income" ? "资产附加项收入" : "资产附加项"}：${asset.name} / ${requiredString(input.name, "附加项名称不能为空")}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const category = (data.categories ?? []).find((item) => item.id === transaction.categoryId);
  return {
    ...transaction,
    categorySnapshot: category ? { categoryName: category.name } : undefined,
  };
}

function addonTransactionCategory(direction: AddonDirection, type: string) {
  if (direction === "income") return "tx-asset-addon-income";
  const categories: Record<string, string> = {
    accessory: "tx-asset-addon-accessory",
    repair: "tx-asset-addon-repair",
    maintenance: "tx-asset-addon-maintenance",
    upgrade: "tx-asset-addon-upgrade",
    consumable: "tx-asset-addon-consumable",
    other: "tx-asset-addon-other",
  };
  return categories[type] ?? "tx-asset-addon-accessory";
}

function requireAsset(data: RizhiData, assetId: string): AssetRecord {
  const asset = (data.assets ?? []).find((item) => item.id === assetId);
  if (!asset) throw new HttpError(404, "ASSET_NOT_FOUND", "资产不存在");
  return asset;
}

function assertAssetCanReceiveAddon(asset: AssetRecord) {
  if (asset.status === "transferred" || asset.status === "disposed") {
    throw new HttpError(409, "ASSET_LOCKED", "当前资产已结束，不能新增或编辑附加项");
  }
}

function requireAccount(data: RizhiData, accountId: string, message: string): MoneyAccountRecord {
  const account = data.accounts.find((item) => item.id === accountId);
  if (!account) throw new HttpError(404, "ACCOUNT_NOT_FOUND", message);
  return account;
}

function applyTransactionEffect(data: RizhiData, transaction: TransactionRecord, account: MoneyAccountRecord) {
  const balanceAfter = account.balance
    + accountDelta(account, requiredString(transaction.type, "交易类型不能为空"), positiveNumber(transaction.amount));
  data.accountFlows ??= [];
  data.accountFlows.push(createAccountFlow(account, transaction, balanceAfter));
  account.balance = balanceAfter;
  account.updatedAt = nowIso();
}

function rollbackTransactionEffect(data: RizhiData, transaction: TransactionRecord, account: MoneyAccountRecord) {
  account.balance -= accountDelta(
    account,
    requiredString(transaction.type, "交易类型不能为空"),
    positiveNumber(transaction.amount),
  );
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

function validateAddonDraft(input: AddonWriteInput) {
  requiredString(input.name, "附加项名称不能为空");
  addonType(input.type);
  requiredString(input.purchaseDate, "日期不能为空");
  positiveNumber(input.amount);
  addonDirection(input.direction);
}

function mergePatch(source: AssetAddonRecord, patch: AddonWriteInput): AssetAddonRecord {
  const result = { ...source };
  for (const [key, value] of Object.entries(patch)) {
    if (key !== "id" && key !== "assetId") result[key] = value;
  }
  return result;
}

function addonDirection(value: unknown): AddonDirection {
  if (value === undefined) return "expense";
  if (value !== "expense" && value !== "income") {
    throw new HttpError(400, "VALIDATION_ERROR", "附加项方向不合法");
  }
  return value;
}

function addonType(value: unknown): AddonType {
  if (typeof value !== "string" || !addonTypes.has(value)) {
    throw new HttpError(400, "VALIDATION_ERROR", "附加项类型不合法");
  }
  return value as AddonType;
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
