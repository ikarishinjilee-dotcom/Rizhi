import type { DatabaseSync } from "node:sqlite";
import {
  ensureStructuredSchema,
  structuredMigrationName,
  structuredMigrationVersion,
} from "./schema.ts";
import type {
  AccountFlowRecord,
  AssetAddonRecord,
  AssetRecord,
  CategoryRecord,
  MoneyAccountRecord,
  RizhiData,
  TransactionRecord,
} from "./sqliteStore.ts";

const defaultUserId = "user-local";
const defaultTimestamp = "2026-06-25T00:00:00.000+08:00";

export type StructuredMigrationCounts = {
  users: number;
  settings: number;
  categories: number;
  accounts: number;
  assets: number;
  assetAddons: number;
  assetPartEvents: number;
  transactions: number;
  accountFlows: number;
  metadata: number;
};

export type StructuredMigrationResult = {
  migrated: boolean;
  counts: StructuredMigrationCounts;
};

export type StructuredMigrationOptions = {
  refresh?: boolean;
};

export function migrateAppStateToStructuredTables(
  database: DatabaseSync,
  options: StructuredMigrationOptions = {},
): StructuredMigrationResult {
  ensureStructuredSchema(database);
  const existing = database.prepare("SELECT 1 FROM schema_migrations WHERE version = ?").get(structuredMigrationVersion);
  if (existing && !options.refresh) return { migrated: false, counts: countStructuredRows(database) };

  const row = database.prepare("SELECT data FROM app_state WHERE id = 1").get() as { data: string } | undefined;
  if (!row) throw new Error("Cannot migrate structured tables: app_state row is missing.");

  const data = JSON.parse(row.data) as RizhiData;
  database.exec("BEGIN IMMEDIATE");
  try {
    replaceStructuredData(database, data);
    database.prepare(`
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (?, ?, ?)
      ON CONFLICT(version) DO UPDATE SET
        name = excluded.name,
        applied_at = excluded.applied_at
    `).run(structuredMigrationVersion, structuredMigrationName, nowIso());
    database.exec("COMMIT");
  } catch (error) {
    rollback(database);
    throw error;
  }

  return { migrated: true, counts: countStructuredRows(database) };
}

export function replaceStructuredData(database: DatabaseSync, data: RizhiData) {
  clearStructuredData(database);
  insertUser(database, data);
  insertSettings(database, data);
  insertCategories(database, data.categories ?? []);
  insertAccounts(database, data.accounts ?? []);
  insertAssets(database, data.assets ?? []);
  insertAssetAddons(database, data.assetAddons ?? []);
  insertAssetPartEvents(database, data.assetPartEvents ?? []);
  insertTransactions(database, data.transactions ?? []);
  insertAccountFlows(database, data.accountFlows ?? []);
  insertMetadata(database, data);
}

export function updateStructuredData(database: DatabaseSync, before: RizhiData, after: RizhiData) {
  const collections = [
    ["categories", before.categories ?? [], after.categories ?? []],
    ["accounts", before.accounts ?? [], after.accounts ?? []],
    ["assets", before.assets ?? [], after.assets ?? []],
    ["asset_addons", before.assetAddons ?? [], after.assetAddons ?? []],
    ["asset_part_events", before.assetPartEvents ?? [], after.assetPartEvents ?? []],
    ["transactions", before.transactions ?? [], after.transactions ?? []],
    ["account_flows", before.accountFlows ?? [], after.accountFlows ?? []],
  ] as const;

  for (const [table, previous, next] of [...collections].reverse()) {
    deleteRemovedRecords(database, table, previous, next);
  }
  insertChangedRecords(database, before.categories ?? [], after.categories ?? [], insertCategories);
  insertChangedRecords(database, before.accounts ?? [], after.accounts ?? [], insertAccounts);
  insertChangedRecords(database, before.assets ?? [], after.assets ?? [], insertAssets);
  insertChangedRecords(database, before.assetAddons ?? [], after.assetAddons ?? [], insertAssetAddons);
  insertChangedRecords(database, before.assetPartEvents ?? [], after.assetPartEvents ?? [], insertAssetPartEvents);
  insertChangedRecords(database, before.transactions ?? [], after.transactions ?? [], insertTransactions);
  insertChangedRecords(database, before.accountFlows ?? [], after.accountFlows ?? [], insertAccountFlows);

  if (!sameJson(before.settings, after.settings)) {
    const settingsUserId = userIdFromData(after) ?? userIdFromData(before) ?? defaultUserId;
    database.prepare("DELETE FROM settings WHERE user_id = ?").run(settingsUserId);
    insertSettings(database, after);
  }
  if (!sameJson(before.meta, after.meta) || !sameJson(before.metadata, after.metadata)) {
    database.exec("DELETE FROM metadata");
    insertMetadata(database, after);
  }
}

function userIdFromData(data: RizhiData) {
  const settings = Array.isArray(data.settings) ? data.settings[0] : data.settings;
  if (settings && typeof settings === "object") {
    const userId = stringValue(settings.userId);
    if (userId) return userId;
  }
  for (const records of [data.categories, data.accounts, data.assets, data.transactions]) {
    const userId = records?.[0] && stringValue(records[0].userId);
    if (userId) return userId;
  }
  return undefined;
}

function deleteRemovedRecords<T extends Record<string, unknown>>(
  database: DatabaseSync,
  table: string,
  before: T[],
  after: T[],
) {
  const afterIds = new Set(after.map((record) => String(record.id)));
  const remove = database.prepare(`DELETE FROM ${table} WHERE id = ?`);

  for (const record of before) {
    const id = String(record.id);
    if (!afterIds.has(id)) remove.run(id);
  }
}

function insertChangedRecords<T extends Record<string, unknown>>(
  database: DatabaseSync,
  before: T[],
  after: T[],
  insert: (database: DatabaseSync, records: T[]) => void,
) {
  const beforeById = new Map(before.map((record) => [String(record.id), record]));
  const changed = after.filter((record) => {
    const previous = beforeById.get(String(record.id));
    return !previous || !sameJson(previous, record);
  });
  if (changed.length > 0) insert(database, changed);
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clearStructuredData(database: DatabaseSync) {
  for (const table of [
    "account_flows",
    "transactions",
    "asset_part_events",
    "asset_addons",
    "assets",
    "accounts",
    "categories",
    "settings",
    "metadata",
    "users",
  ]) {
    database.exec(`DELETE FROM ${table}`);
  }
}

export function countStructuredRows(database: DatabaseSync): StructuredMigrationCounts {
  return {
    users: tableCount(database, "users"),
    settings: tableCount(database, "settings"),
    categories: tableCount(database, "categories"),
    accounts: tableCount(database, "accounts"),
    assets: tableCount(database, "assets"),
    assetAddons: tableCount(database, "asset_addons"),
    assetPartEvents: tableCount(database, "asset_part_events"),
    transactions: tableCount(database, "transactions"),
    accountFlows: tableCount(database, "account_flows"),
    metadata: tableCount(database, "metadata"),
  };
}

function insertAssetPartEvents(database: DatabaseSync, events: Record<string, unknown>[]) {
  const insert = database.prepare(`
    INSERT INTO asset_part_events (id, asset_id, occurred_at, data_json)
    VALUES (?, ?, ?, ?)
  `);
  for (const event of events) {
    const id = stringValue(event.id);
    const assetId = stringValue(event.assetId);
    if (!id || !assetId) continue;
    insert.run(id, assetId, nullString(event.occurredAt), JSON.stringify(event));
  }
}

function insertUser(database: DatabaseSync, data: RizhiData) {
  const meta = objectOrEmpty(data.meta);
  const timestamp = stringValue(meta.updatedAt) ?? stringValue(meta.createdAt) ?? defaultTimestamp;
  database.prepare(`
    INSERT OR REPLACE INTO users (id, display_name, created_at, updated_at, extra_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(defaultUserId, "Local User", stringValue(meta.createdAt) ?? timestamp, timestamp, "{}");
}

function insertSettings(database: DatabaseSync, data: RizhiData) {
  const settingsList = Array.isArray(data.settings) ? data.settings : [objectOrEmpty(data.settings)];
  const insert = database.prepare(`
    INSERT OR REPLACE INTO settings (
      id, user_id, currency, locale, theme, first_day_of_week, created_at, updated_at, extra_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [index, settings] of settingsList.entries()) {
    const record = objectOrEmpty(settings);
    const id = stringValue(record.id) ?? (index === 0 ? "default" : `settings-${index + 1}`);
    const createdAt = stringValue(record.createdAt) ?? defaultTimestamp;
    const updatedAt = stringValue(record.updatedAt) ?? createdAt;
    insert.run(
      id,
      stringValue(record.userId) ?? defaultUserId,
      stringValue(record.currency) ?? "CNY",
      stringValue(record.locale) ?? "zh-CN",
      stringValue(record.theme) ?? "light",
      numberValue(record.firstDayOfWeek) ?? 1,
      createdAt,
      updatedAt,
      extraJson(record, ["id", "currency", "locale", "theme", "firstDayOfWeek", "createdAt", "updatedAt"]),
    );
  }
}

function insertCategories(database: DatabaseSync, categories: CategoryRecord[]) {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO categories (
      id, user_id, domain, type, parent_id, name, sort, color, icon, monthly_budget,
      enabled, is_system, deleted_at, created_at, updated_at, extra_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const category of categories) {
    const timestamp = timestampFor(category);
    insert.run(
      category.id,
      stringValue(category.userId) ?? defaultUserId,
      category.domain,
      category.domain === "asset" ? "other" : nullString(category.type),
      nullString(category.parentId),
      category.name,
      numberValue(category.sort) ?? 999,
      nullString(category.color),
      nullString(category.icon),
      numberValue(category.monthlyBudget),
      booleanToInteger(category.enabled, true),
      booleanToInteger(category.isSystem, false),
      nullString(category.deletedAt),
      timestamp.createdAt,
      timestamp.updatedAt,
      extraJson(category, [
        "id", "userId", "domain", "type", "parentId", "name", "sort", "color", "icon",
        "monthlyBudget", "enabled", "isSystem", "deletedAt",
      ]),
    );
  }
}

function insertAccounts(database: DatabaseSync, accounts: MoneyAccountRecord[]) {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO accounts (
      id, user_id, name, type, direction, balance, institution, credit_limit, bill_day,
      repayment_day, color, icon, note, enabled, created_at, updated_at, extra_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const account of accounts) {
    const timestamp = timestampFor(account);
    insert.run(
      account.id,
      stringValue(account.userId) ?? defaultUserId,
      account.name,
      account.type,
      account.direction,
      numberValue(account.balance) ?? 0,
      nullString(account.institution),
      numberValue(account.creditLimit),
      numberValue(account.billDay),
      numberValue(account.repaymentDay),
      nullString(account.color),
      nullString(account.icon),
      nullString(account.note),
      booleanToInteger(account.enabled, true),
      timestamp.createdAt,
      timestamp.updatedAt,
      extraJson(account, [
        "id", "userId", "name", "type", "direction", "balance", "institution", "creditLimit",
        "billDay", "repaymentDay", "color", "icon", "note", "createdAt", "updatedAt",
      ]),
    );
  }
}

function insertAssets(database: DatabaseSync, assets: AssetRecord[]) {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO assets (
      id, user_id, name, brand, model, category_id, status, original_cost, currency,
      current_value, current_value_updated_at, current_value_source, purchase_date, first_use_date,
      last_used_at, idle_since, purchase_channel, merchant, order_no, payment_account_id,
      purchase_transaction_id, transfer_date, transfer_amount, transfer_account_id,
      transfer_transaction_id, disposed_at, warranty_start_date, warranty_end_date,
      expected_use_days, notes, attachments_json, created_at, updated_at, extra_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const asset of assets) {
    const timestamp = timestampFor(asset);
    insert.run(
      asset.id,
      stringValue(asset.userId) ?? defaultUserId,
      stringValue(asset.name) ?? "Unnamed asset",
      nullString(asset.brand),
      nullString(asset.model),
      asset.categoryId,
      stringValue(asset.status) ?? "using",
      numberValue(asset.originalCost) ?? 0,
      stringValue(asset.currency) ?? "CNY",
      numberValue(asset.currentValue),
      nullString(asset.currentValueUpdatedAt),
      nullString(asset.currentValueSource),
      stringValue(asset.purchaseDate) ?? defaultTimestamp.slice(0, 10),
      nullString(asset.firstUseDate),
      nullString(asset.lastUsedAt),
      nullString(asset.idleSince),
      nullString(asset.purchaseChannel),
      nullString(asset.merchant),
      nullString(asset.orderNo),
      nullString(asset.paymentAccountId),
      nullString(asset.purchaseTransactionId),
      nullString(asset.transferDate),
      numberValue(asset.transferAmount),
      nullString(asset.transferAccountId),
      nullString(asset.transferTransactionId),
      nullString(asset.disposedAt),
      nullString(asset.warrantyStartDate),
      nullString(asset.warrantyEndDate),
      numberValue(asset.expectedUseDays),
      nullString(asset.notes),
      jsonValue(asset.attachments, []),
      timestamp.createdAt,
      timestamp.updatedAt,
      extraJson(asset, [
        "id", "userId", "name", "brand", "model", "categoryId", "status", "originalCost",
        "currency", "currentValue", "currentValueUpdatedAt", "currentValueSource", "purchaseDate",
        "firstUseDate", "lastUsedAt", "idleSince", "purchaseChannel", "merchant", "orderNo",
        "paymentAccountId", "purchaseTransactionId", "transferDate", "transferAmount",
        "transferAccountId", "transferTransactionId", "disposedAt", "warrantyStartDate",
        "warrantyEndDate", "expectedUseDays", "notes", "createdAt", "updatedAt",
      ]),
    );
  }
}

function insertAssetAddons(database: DatabaseSync, addons: AssetAddonRecord[]) {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO asset_addons (
      id, user_id, asset_id, name, direction, type, amount, currency, purchase_date, merchant,
      payment_account_id, transaction_id, included_in_cost, notes, attachments_json,
      created_at, updated_at, extra_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const addon of addons) {
    const timestamp = timestampFor(addon);
    insert.run(
      addon.id,
      stringValue(addon.userId) ?? defaultUserId,
      addon.assetId,
      stringValue(addon.name) ?? stringValue(addon.merchant) ?? "Asset addon",
      stringValue(addon.direction) ?? "expense",
      stringValue(addon.type) ?? "other",
      numberValue(addon.amount) ?? 0,
      stringValue(addon.currency) ?? "CNY",
      stringValue(addon.purchaseDate) ?? stringValue(addon.occurredAt)?.slice(0, 10) ?? defaultTimestamp.slice(0, 10),
      nullString(addon.merchant),
      nullString(addon.paymentAccountId),
      nullString(addon.transactionId),
      booleanToInteger(addon.includedInCost, false),
      nullString(addon.notes),
      jsonValue(addon.attachments, []),
      timestamp.createdAt,
      timestamp.updatedAt,
      extraJson(addon, [
        "id", "userId", "assetId", "name", "direction", "type", "amount", "currency", "purchaseDate",
        "occurredAt", "merchant", "paymentAccountId", "transactionId",
        "notes", "createdAt", "updatedAt",
      ]),
    );
  }
}

function insertTransactions(database: DatabaseSync, transactions: TransactionRecord[]) {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO transactions (
      id, user_id, type, business_type, category_id, sub_category_id, category_name_snapshot,
      sub_category_name_snapshot, amount, occurred_at, account_id, related_account_id, asset_id,
      addon_id, part_event_id, merchant, note, receipt_url, created_at, updated_at, extra_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const transaction of transactions) {
    const timestamp = timestampFor(transaction);
    const snapshot = objectOrEmpty(transaction.categorySnapshot);
    insert.run(
      transaction.id,
      stringValue(transaction.userId) ?? defaultUserId,
      stringValue(transaction.type) ?? "expense",
      nullString(transaction.businessType),
      transaction.categoryId,
      nullString(transaction.subCategoryId),
      nullString(snapshot.categoryName),
      nullString(snapshot.subCategoryName),
      numberValue(transaction.amount) ?? 0,
      stringValue(transaction.occurredAt) ?? defaultTimestamp,
      stringValue(transaction.accountId) ?? "",
      nullString(transaction.relatedAccountId),
      nullString(transaction.assetId),
      nullString(transaction.addonId),
      nullString(transaction.partEventId),
      nullString(transaction.merchant),
      nullString(transaction.note),
      nullString(transaction.receiptUrl),
      timestamp.createdAt,
      timestamp.updatedAt,
      extraJson(transaction, [
        "id", "userId", "type", "businessType", "categoryId", "subCategoryId", "categorySnapshot",
        "amount", "occurredAt", "accountId", "relatedAccountId", "assetId", "addonId",
        "partEventId", "merchant", "note", "receiptUrl", "createdAt", "updatedAt",
      ]),
    );
  }
}

function insertAccountFlows(database: DatabaseSync, flows: AccountFlowRecord[]) {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO account_flows (
      id, user_id, account_id, transaction_id, transfer_id, direction, amount, occurred_at,
      balance_after, note, created_at, updated_at, extra_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const flow of flows) {
    const timestamp = timestampFor(flow);
    insert.run(
      flow.id,
      stringValue(flow.userId) ?? defaultUserId,
      flow.accountId,
      nullString(flow.transactionId),
      nullString(flow.transferId),
      flow.direction,
      numberValue(flow.amount) ?? 0,
      flow.occurredAt,
      numberValue(flow.balanceAfter) ?? 0,
      nullString(flow.note),
      timestamp.createdAt,
      timestamp.updatedAt,
      extraJson(flow, [
        "id", "userId", "accountId", "transactionId", "transferId", "direction", "amount",
        "occurredAt", "balanceAfter", "note", "createdAt", "updatedAt",
      ]),
    );
  }
}

function insertMetadata(database: DatabaseSync, data: RizhiData) {
  const insert = database.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)");
  if (data.meta && typeof data.meta === "object") insert.run("meta", JSON.stringify(data.meta));
  for (const [index, item] of (data.metadata ?? []).entries()) {
    const key = typeof item.key === "string" ? item.key : `metadata:${index + 1}`;
    insert.run(key, JSON.stringify(item));
  }
}

function tableCount(database: DatabaseSync, tableName: string) {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count: number };
  return row.count;
}

function timestampFor(record: Record<string, unknown>) {
  const createdAt = stringValue(record.createdAt) ?? defaultTimestamp;
  return {
    createdAt,
    updatedAt: stringValue(record.updatedAt) ?? createdAt,
  };
}

function extraJson(record: Record<string, unknown>, knownKeys: string[]) {
  const known = new Set(knownKeys);
  const extra = Object.fromEntries(Object.entries(record).filter(([key]) => !known.has(key)));
  return JSON.stringify(extra);
}

function jsonValue(value: unknown, fallback: unknown) {
  return JSON.stringify(value ?? fallback);
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function nullString(value: unknown): string | null {
  return stringValue(value) ?? null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanToInteger(value: unknown, fallback: boolean) {
  return (typeof value === "boolean" ? value : fallback) ? 1 : 0;
}

function nowIso() {
  return new Date().toISOString();
}

function rollback(database: DatabaseSync) {
  try {
    database.exec("ROLLBACK");
  } catch {
    // No active transaction.
  }
}
