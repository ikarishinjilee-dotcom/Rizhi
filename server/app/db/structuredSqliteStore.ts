import type { DatabaseSync } from "node:sqlite";
import type {
  AccountFlowRecord,
  AssetAddonRecord,
  AssetRecord,
  CategoryRecord,
  MoneyAccountRecord,
  RizhiData,
  TransactionRecord,
} from "./sqliteStore.ts";

export function readStructuredJsonDb(database: DatabaseSync, userId = "user-local"): RizhiData {
  return {
    meta: readMeta(database),
    settings: readSettings(database, userId),
    metadata: readMetadata(database),
    accounts: readAccounts(database, userId),
    assets: readAssets(database, userId),
    assetAddons: readAssetAddons(database, userId),
    assetPartEvents: readAssetPartEvents(database, userId),
    transactions: readTransactions(database, userId),
    accountFlows: readAccountFlows(database, userId),
    categories: readCategories(database, userId),
  };
}

function readAssetPartEvents(database: DatabaseSync, userId: string) {
  const rows = database.prepare(`
    SELECT event.data_json
    FROM asset_part_events event
    JOIN assets asset ON asset.id = event.asset_id
    WHERE asset.user_id = ?
    ORDER BY event.occurred_at, event.id
  `).all(userId) as Array<{
    data_json: string;
  }>;
  return rows.map((row) => parseJsonObject(row.data_json));
}

function readMeta(database: DatabaseSync) {
  const row = database.prepare("SELECT value FROM metadata WHERE key = 'meta'").get() as { value: string } | undefined;
  return row ? parseJsonObject(row.value) : {};
}

function readMetadata(database: DatabaseSync) {
  const rows = database.prepare("SELECT key, value FROM metadata WHERE key <> 'meta' ORDER BY key").all() as Array<{
    key: string;
    value: string;
  }>;
  return rows.map((row) => parseJsonObject(row.value));
}

function readSettings(database: DatabaseSync, userId: string) {
  const row = database.prepare("SELECT * FROM settings WHERE user_id = ? ORDER BY id LIMIT 1").get(userId) as Record<string, unknown> | undefined;
  if (!row) return {};
  return mergeExtra(row.extra_json, {
    id: row.id,
    userId: row.user_id,
    currency: row.currency,
    locale: row.locale,
    theme: row.theme,
    firstDayOfWeek: row.first_day_of_week,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function readCategories(database: DatabaseSync, userId: string): CategoryRecord[] {
  const rows = database.prepare("SELECT * FROM categories WHERE user_id = ? ORDER BY sort, id").all(userId) as Record<string, unknown>[];
  return rows.map((row) => {
    const extra = parseJsonObject(typeof row.extra_json === "string" ? row.extra_json : "{}");
    return stripUndefined(mergeExtra(extra, {
    id: row.id,
    userId: row.user_id,
    domain: row.domain,
    type: row.type,
    name: row.name,
    sort: row.sort,
    parentId: row.parent_id,
    color: row.color,
    icon: row.icon,
    monthlyBudget: row.monthly_budget,
    enabled: integerToBoolean(row.enabled),
    isSystem: integerToBoolean(row.is_system),
    deletedAt: row.deleted_at,
    createdAt: "createdAt" in extra ? row.created_at : undefined,
    updatedAt: "updatedAt" in extra ? row.updated_at : undefined,
  })) as CategoryRecord;
  });
}

function readAccounts(database: DatabaseSync, userId: string): MoneyAccountRecord[] {
  const rows = database.prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY id").all(userId) as Record<string, unknown>[];
  return rows.map((row) => {
    const extra = parseJsonObject(typeof row.extra_json === "string" ? row.extra_json : "{}");
    return stripUndefined(mergeExtra(extra, {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    direction: row.direction,
    balance: row.balance,
    institution: row.institution,
    creditLimit: row.credit_limit,
    billDay: row.bill_day,
    repaymentDay: row.repayment_day,
    color: row.color,
    icon: row.icon,
    note: row.note,
    enabled: "enabled" in extra ? integerToBoolean(row.enabled) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as MoneyAccountRecord;
  });
}

function readAssets(database: DatabaseSync, userId: string): AssetRecord[] {
  const rows = database.prepare("SELECT * FROM assets WHERE user_id = ? ORDER BY id").all(userId) as Record<string, unknown>[];
  return rows.map((row) => {
    const extra = parseJsonObject(typeof row.extra_json === "string" ? row.extra_json : "{}");
    return stripUndefined(mergeExtra(extra, {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    brand: row.brand,
    model: row.model,
    categoryId: row.category_id,
    status: row.status,
    originalCost: row.original_cost,
    currency: row.currency,
    currentValue: row.current_value,
    currentValueUpdatedAt: row.current_value_updated_at,
    currentValueSource: row.current_value_source,
    purchaseDate: row.purchase_date,
    firstUseDate: row.first_use_date,
    lastUsedAt: row.last_used_at,
    idleSince: row.idle_since,
    purchaseChannel: row.purchase_channel,
    merchant: row.merchant,
    orderNo: row.order_no,
    paymentAccountId: row.payment_account_id,
    purchaseTransactionId: row.purchase_transaction_id,
    transferDate: row.transfer_date,
    transferAmount: row.transfer_amount,
    transferAccountId: row.transfer_account_id,
    transferTransactionId: row.transfer_transaction_id,
    disposedAt: row.disposed_at,
    warrantyStartDate: row.warranty_start_date,
    warrantyEndDate: row.warranty_end_date,
    expectedUseDays: row.expected_use_days,
    notes: row.notes,
    attachments: "attachments" in extra ? parseJsonArray(row.attachments_json) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as AssetRecord;
  });
}

function readAssetAddons(database: DatabaseSync, userId: string): AssetAddonRecord[] {
  const rows = database.prepare("SELECT * FROM asset_addons WHERE user_id = ? ORDER BY id").all(userId) as Record<string, unknown>[];
  return rows.map((row) => {
    const extra = parseJsonObject(typeof row.extra_json === "string" ? row.extra_json : "{}");
    return stripUndefined(mergeExtra(extra, {
    id: row.id,
    userId: row.user_id,
    assetId: row.asset_id,
    name: row.name,
    direction: row.direction,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    purchaseDate: row.purchase_date,
    merchant: row.merchant,
    paymentAccountId: row.payment_account_id,
    transactionId: row.transaction_id,
    includedInCost: "includedInCost" in extra ? integerToBoolean(row.included_in_cost) : undefined,
    notes: row.notes,
    attachments: "attachments" in extra ? parseJsonArray(row.attachments_json) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as AssetAddonRecord;
  });
}

function readTransactions(database: DatabaseSync, userId: string): TransactionRecord[] {
  const rows = database.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY occurred_at, id").all(userId) as Record<string, unknown>[];
  return rows.map((row) => {
    const categorySnapshot = row.category_name_snapshot || row.sub_category_name_snapshot
      ? stripUndefined({
        categoryName: row.category_name_snapshot,
        subCategoryName: row.sub_category_name_snapshot,
      })
      : undefined;
    return stripUndefined(mergeExtra(row.extra_json, {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      businessType: row.business_type,
      categoryId: row.category_id,
      subCategoryId: row.sub_category_id,
      categorySnapshot,
      amount: row.amount,
      occurredAt: row.occurred_at,
      accountId: row.account_id,
      relatedAccountId: row.related_account_id,
      assetId: row.asset_id,
      addonId: row.addon_id,
      partEventId: row.part_event_id,
      merchant: row.merchant,
      note: row.note,
      receiptUrl: row.receipt_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as TransactionRecord;
  });
}

function readAccountFlows(database: DatabaseSync, userId: string): AccountFlowRecord[] {
  const rows = database.prepare("SELECT * FROM account_flows WHERE user_id = ? ORDER BY occurred_at, id").all(userId) as Record<string, unknown>[];
  return rows.map((row) => stripUndefined(mergeExtra(row.extra_json, {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    transactionId: row.transaction_id,
    transferId: row.transfer_id,
    direction: row.direction,
    amount: row.amount,
    occurredAt: row.occurred_at,
    balanceAfter: row.balance_after,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as AccountFlowRecord);
}

function mergeExtra(extraJson: unknown, record: Record<string, unknown>) {
  const extra = typeof extraJson === "string" ? parseJsonObject(extraJson) : extraJson as Record<string, unknown>;
  return {
    ...extra,
    ...record,
  };
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== "string") return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
}

function integerToBoolean(value: unknown): boolean | undefined {
  if (typeof value !== "number") return undefined;
  return value === 1;
}

function stripUndefined<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null)) as T;
}
