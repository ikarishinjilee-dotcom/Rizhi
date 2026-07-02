import { mkdir, readFile } from "node:fs/promises";
import { AsyncLocalStorage } from "node:async_hooks";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { migrateAppStateToStructuredTables, updateStructuredData } from "./migrateAppState.ts";
import { readStructuredJsonDb } from "./structuredSqliteStore.ts";
import { ensureRelationshipConstraints } from "./schema.ts";
import { currentUserId } from "../userContext.ts";

const defaultTimestamp = "2026-06-25T00:00:00.000+08:00";
const rootDir = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
const dbRuntimeConfig = new AsyncLocalStorage<DbRuntimeConfig>();
const databaseInitializations = new Map<string, Promise<void>>();

export type DbRuntimeConfig = {
  dataPath?: string;
  sqlitePath?: string;
};

export type MoneyAccountRecord = {
  id: string;
  userId?: string;
  name: string;
  type: string;
  direction: "asset" | "liability";
  balance: number;
  institution?: string;
  creditLimit?: number;
  billDay?: number;
  repaymentDay?: number;
  color?: string;
  icon?: string;
  note?: string;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type AccountFlowRecord = {
  id: string;
  accountId: string;
  transactionId?: string;
  transferId?: string;
  direction: "in" | "out";
  amount: number;
  occurredAt: string;
  balanceAfter: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type CategoryRecord = {
  id: string;
  userId?: string;
  domain: "asset" | "transaction" | "account";
  type?: string;
  name: string;
  sort: number;
  parentId?: string;
  color?: string;
  icon?: string;
  monthlyBudget?: number;
  enabled?: boolean;
  isSystem?: boolean;
  deletedAt?: string;
  [key: string]: unknown;
};

export type AssetRecord = {
  id: string;
  userId?: string;
  name: string;
  brand?: string;
  model?: string;
  categoryId: string;
  status: "using" | "idle" | "transferred" | "disposed";
  originalCost?: number;
  currency?: string;
  currentValue?: number;
  purchaseDate?: string;
  merchant?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AssetAddonRecord = {
  id: string;
  assetId: string;
  type?: string;
  name?: string;
  amount?: number;
  occurredAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type TransactionRecord = {
  id: string;
  categoryId: string;
  subCategoryId?: string;
  assetId?: string;
  [key: string]: unknown;
};

export type RizhiData = {
  meta?: Record<string, unknown>;
  settings?: Record<string, unknown> | Record<string, unknown>[];
  metadata?: Record<string, unknown>[];
  assets?: AssetRecord[];
  assetAddons?: AssetAddonRecord[];
  assetPartEvents?: Record<string, unknown>[];
  transactions?: TransactionRecord[];
  accounts: MoneyAccountRecord[];
  accountFlows?: AccountFlowRecord[];
  categories?: CategoryRecord[];
  [key: string]: unknown;
};

export async function readJsonDb(): Promise<RizhiData> {
  const database = await openDatabase();
  try {
    return normalizeJsonData(readStructuredJsonDb(database, currentUserId()));
  } finally {
    database.close();
  }
}

export async function initializeJsonDb() {
  const database = await openDatabase();
  database.close();
}

export function captureDbRuntimeConfig(): DbRuntimeConfig {
  return {
    dataPath: process.env.RIZHI_API_DATA_PATH,
    sqlitePath: process.env.RIZHI_API_SQLITE_PATH,
  };
}

export function enterDbRuntimeConfig(config: DbRuntimeConfig) {
  dbRuntimeConfig.enterWith(config);
}

function createDefaultJsonData(): RizhiData {
  return {
    meta: {
      version: 1,
      createdAt: defaultTimestamp,
      updatedAt: defaultTimestamp,
    },
    settings: {
      id: "default",
      currency: "CNY",
      locale: "zh-CN",
      theme: "light",
      firstDayOfWeek: 1,
      createdAt: defaultTimestamp,
      updatedAt: defaultTimestamp,
    },
    metadata: [],
    accounts: [
      { id: "alipay", name: "支付宝余额", type: "wallet", direction: "asset", balance: 5320, institution: "支付宝", color: "#1E9BFF", icon: "支", createdAt: defaultTimestamp, updatedAt: defaultTimestamp },
      { id: "wechat", name: "微信零钱", type: "wallet", direction: "asset", balance: 1300, institution: "微信", color: "#22C55E", icon: "微", createdAt: defaultTimestamp, updatedAt: defaultTimestamp },
      { id: "cmb-debit", name: "招商银行储蓄卡", type: "debit_card", direction: "asset", balance: 12800, institution: "招商银行", color: "#1677FF", icon: "招", createdAt: defaultTimestamp, updatedAt: defaultTimestamp },
      { id: "huabei", name: "花呗", type: "consumer_credit", direction: "liability", balance: 2300, creditLimit: 5000, repaymentDay: 10, institution: "支付宝", color: "#F04438", icon: "花", createdAt: defaultTimestamp, updatedAt: defaultTimestamp },
    ],
    assets: [
      {
        id: "ast_000001",
        userId: "user-local",
        name: "iPhone 16 Pro",
        brand: "Apple",
        categoryId: "asset-digital",
        status: "using",
        originalCost: 7999,
        currency: "CNY",
        currentValue: 5000,
        purchaseDate: "2024-01-04",
        merchant: "Apple 官网",
        createdAt: defaultTimestamp,
        updatedAt: defaultTimestamp,
      },
    ],
    assetAddons: [],
    assetPartEvents: [],
    transactions: [],
    accountFlows: [],
    categories: [
      { id: "asset-digital", domain: "asset", type: "digital", name: "数码设备", sort: 10, color: "#1677FF", enabled: true, isSystem: true },
      { id: "asset-home", domain: "asset", type: "home", name: "家居用品", sort: 20, color: "#F59E0B", enabled: true, isSystem: true },
      { id: "asset-subscription", domain: "asset", type: "subscription", name: "订阅服务", sort: 30, color: "#111827", enabled: true, isSystem: true },
      { id: "asset-other", domain: "asset", type: "other", name: "其他物品", sort: 90, color: "#64748B", enabled: true, isSystem: true },
      { id: "tx-food", domain: "transaction", type: "expense", name: "餐饮美食", sort: 110, color: "#F04438", enabled: true, isSystem: true },
      { id: "tx-food-lunch", domain: "transaction", type: "expense", parentId: "tx-food", name: "午餐", sort: 112, color: "#F04438", enabled: true, isSystem: true },
      { id: "tx-transport", domain: "transaction", type: "expense", name: "交通出行", sort: 130, color: "#1677FF", enabled: true, isSystem: true },
      { id: "tx-salary", domain: "transaction", type: "income", name: "工资收入", sort: 210, color: "#16A36A", enabled: true, isSystem: true },
      { id: "account-cash", domain: "account", type: "cash", name: "现金", sort: 510, enabled: true, isSystem: true },
      { id: "account-wallet", domain: "account", type: "wallet", name: "电子钱包", sort: 520, enabled: true, isSystem: true },
    ],
  };
}

function normalizeJsonData(data: Partial<RizhiData>): RizhiData {
  const defaults = createDefaultJsonData();
  return {
    ...data,
    meta: data.meta ?? defaults.meta,
    settings: data.settings ?? defaults.settings,
    metadata: data.metadata ?? [],
    accounts: data.accounts ?? defaults.accounts,
    assets: data.assets ?? defaults.assets,
    assetAddons: data.assetAddons ?? [],
    assetPartEvents: data.assetPartEvents ?? [],
    transactions: data.transactions ?? [],
    accountFlows: data.accountFlows ?? [],
    categories: data.categories ?? defaults.categories,
  };
}

export async function writeJsonDb(data: RizhiData) {
  const database = await openDatabase();
  try {
    database.exec("BEGIN IMMEDIATE");
    const userId = currentUserId();
    ensureUser(database, userId);
    const before = normalizeJsonData(readStructuredJsonDb(database, userId));
    updateStructuredData(database, before, stampUserId(withUpdatedMeta(data), userId));
    database.exec("COMMIT");
  } catch (error) {
    rollback(database);
    throw error;
  } finally {
    database.close();
  }
}

let mutationQueue: Promise<void> = Promise.resolve();

export async function mutateJsonDb<T>(mutator: (data: RizhiData) => T | Promise<T>): Promise<T> {
  const operation = mutationQueue.then(async () => {
    const database = await openDatabase();
    try {
      database.exec("BEGIN IMMEDIATE");
      const userId = currentUserId();
      ensureUser(database, userId);
      const data = normalizeJsonData(readStructuredJsonDb(database, userId));
      const before = structuredClone(data);
      const result = await mutator(data);
      updateStructuredData(database, before, stampUserId(withUpdatedMeta(data), userId));
      database.exec("COMMIT");
      return result;
    } catch (error) {
      rollback(database);
      throw error;
    } finally {
      database.close();
    }
  });
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function ensureUser(database: DatabaseSync, userId: string) {
  const timestamp = nowIso();
  database.prepare(`
    INSERT OR IGNORE INTO users (id, display_name, created_at, updated_at, extra_json)
    VALUES (?, ?, ?, ?, '{}')
  `).run(userId, userId, timestamp, timestamp);
}

function stampUserId(data: RizhiData, userId: string): RizhiData {
  const stamp = <T extends Record<string, unknown>>(records: T[] | undefined) =>
    records?.map((record) => ({ ...record, userId }));
  const settings = Array.isArray(data.settings)
    ? stamp(data.settings)
    : data.settings && typeof data.settings === "object" && Object.keys(data.settings).length > 0
      ? { ...data.settings, userId }
      : data.settings;
  return {
    ...data,
    settings,
    categories: stamp(data.categories) as CategoryRecord[] | undefined,
    accounts: stamp(data.accounts) as MoneyAccountRecord[],
    assets: stamp(data.assets) as AssetRecord[] | undefined,
    assetAddons: stamp(data.assetAddons) as AssetAddonRecord[] | undefined,
    assetPartEvents: stamp(data.assetPartEvents),
    transactions: stamp(data.transactions) as TransactionRecord[] | undefined,
    accountFlows: stamp(data.accountFlows) as AccountFlowRecord[] | undefined,
  };
}

export async function resetJsonDb(): Promise<RizhiData> {
  const data = createDefaultJsonData();
  await writeJsonDb(data);
  return data;
}

export function nowIso() {
  return new Date().toISOString();
}

function withUpdatedMeta(data: RizhiData): RizhiData {
  return {
    ...data,
    meta: {
      ...(data.meta ?? {}),
      version: data.meta?.version ?? 1,
      updatedAt: nowIso(),
    },
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function openDatabase() {
  const path = sqlitePath();
  await mkdir(dirname(path), { recursive: true });
  let initialization = databaseInitializations.get(path);
  if (!initialization) {
    initialization = initializeDatabase(path);
    databaseInitializations.set(path, initialization);
  }
  try {
    await initialization;
  } catch (error) {
    databaseInitializations.delete(path);
    throw error;
  }

  const database = new DatabaseSync(path);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
  `);
  return database;
}

async function initializeDatabase(path: string) {
  const database = new DatabaseSync(path);
  try {
    database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    `);

    const existing = database.prepare("SELECT 1 FROM app_state WHERE id = 1").get();
    if (!existing) {
      const initial = await readLegacyJsonData() ?? createDefaultJsonData();
      writeState(database, initial);
    }
    migrateAppStateToStructuredTables(database);
    ensureRelationshipConstraints(database);
  } finally {
    database.close();
  }
}

function readState(database: DatabaseSync): RizhiData {
  const row = database.prepare("SELECT data FROM app_state WHERE id = 1").get() as { data: string } | undefined;
  if (!row) return createDefaultJsonData();
  return normalizeJsonData(JSON.parse(row.data) as Partial<RizhiData>);
}

function writeState(database: DatabaseSync, data: RizhiData) {
  const next = withUpdatedMeta(data);
  database.prepare(`
    INSERT INTO app_state (id, version, data, updated_at)
    VALUES (1, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      version = excluded.version,
      data = excluded.data,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(next), String(next.meta?.updatedAt ?? nowIso()));
}

async function readLegacyJsonData(): Promise<RizhiData | undefined> {
  try {
    const text = await readFile(legacyJsonPath(), "utf8");
    return normalizeJsonData(JSON.parse(text.replace(/^\uFEFF/, "")) as Partial<RizhiData>);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}

function rollback(database: DatabaseSync) {
  try {
    database.exec("ROLLBACK");
  } catch {
    // No active transaction.
  }
}

function sqlitePath() {
  const config = dbRuntimeConfig.getStore();
  if (config?.sqlitePath) return config.sqlitePath;
  if (config?.dataPath) return `${config.dataPath}.sqlite`;
  if (process.env.RIZHI_API_SQLITE_PATH) return process.env.RIZHI_API_SQLITE_PATH;
  if (process.env.RIZHI_API_DATA_PATH) return `${process.env.RIZHI_API_DATA_PATH}.sqlite`;
  return join(rootDir, ".data", "rizhi-api.db");
}

function legacyJsonPath() {
  const config = dbRuntimeConfig.getStore();
  return config?.dataPath ?? process.env.RIZHI_API_DATA_PATH ?? join(rootDir, ".data", "rizhi-api-db.json");
}
