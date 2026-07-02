import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { migrateAppStateToStructuredTables } from "../db/migrateAppState.ts";
import { readJsonDb, resetJsonDb, writeJsonDb, type RizhiData } from "../db/sqliteStore.ts";

let tempDir: string | undefined;
let legacyPath: string;
let sqlitePath: string;
const originalDataPath = process.env.RIZHI_API_DATA_PATH;
const originalSqlitePath = process.env.RIZHI_API_SQLITE_PATH;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "rizhi-structured-"));
  legacyPath = join(tempDir, "data.json");
  sqlitePath = `${legacyPath}.sqlite`;
  process.env.RIZHI_API_DATA_PATH = legacyPath;
  delete process.env.RIZHI_API_SQLITE_PATH;
});

afterEach(async () => {
  process.env.RIZHI_API_DATA_PATH = originalDataPath;
  process.env.RIZHI_API_SQLITE_PATH = originalSqlitePath;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe("app_state to structured tables migration", () => {
  test("migrates default app_state data into structured tables", async () => {
    const source = await resetJsonDb();

    const database = new DatabaseSync(sqlitePath);
    try {
      database.prepare("DELETE FROM schema_migrations WHERE version = 1").run();
      const result = migrateAppStateToStructuredTables(database);

      expect(result.migrated).toBe(true);
      expect(result.counts).toMatchObject({
        users: 1,
        settings: 1,
        categories: source.categories?.length ?? 0,
        accounts: source.accounts.length,
        assets: source.assets?.length ?? 0,
        assetAddons: source.assetAddons?.length ?? 0,
        transactions: source.transactions?.length ?? 0,
        accountFlows: source.accountFlows?.length ?? 0,
        metadata: 1,
      });
      expect(singleValue(database, "SELECT type FROM categories WHERE id = 'asset-digital'")).toBe("other");
      expect(singleValue(database, "SELECT user_id FROM assets WHERE id = 'ast_000001'")).toBe("user-local");
      expect(singleValue(database, "SELECT value FROM metadata WHERE key = 'meta'")).toContain("updatedAt");
    } finally {
      database.close();
    }
  });

  test("keeps extended records queryable while preserving unstable fields as JSON", async () => {
    const source = await readJsonDb();
    const data: RizhiData = {
      ...source,
      assets: [
        ...(source.assets ?? []),
        {
          id: "asset-custom",
          userId: "user-local",
          name: "Custom Camera",
          brand: "Nikon",
          categoryId: "asset-digital",
          status: "using",
          originalCost: 8800,
          currency: "CNY",
          purchaseDate: "2026-06-30",
          paymentAccountId: "alipay",
          attachments: [{ name: "receipt.jpg" }],
          customField: "kept",
          createdAt: "2026-06-30T10:00:00.000+08:00",
          updatedAt: "2026-06-30T10:00:00.000+08:00",
        },
      ],
      assetAddons: [
        {
          id: "addon-custom",
          assetId: "asset-custom",
          name: "Memory Card",
          direction: "expense",
          type: "accessory",
          amount: 299,
          currency: "CNY",
          purchaseDate: "2026-06-30",
          attachments: [{ name: "addon.jpg" }],
          createdAt: "2026-06-30T10:00:00.000+08:00",
          updatedAt: "2026-06-30T10:00:00.000+08:00",
        },
      ],
      transactions: [
        {
          id: "tx-custom",
          type: "expense",
          businessType: "normal",
          categoryId: "tx-food",
          amount: 25,
          occurredAt: "2026-06-30T12:00:00.000+08:00",
          accountId: "alipay",
          categorySnapshot: { categoryName: "Food" },
          note: "Lunch",
          createdAt: "2026-06-30T12:00:00.000+08:00",
          updatedAt: "2026-06-30T12:00:00.000+08:00",
        },
      ],
      accountFlows: [
        {
          id: "flow-custom",
          accountId: "alipay",
          transactionId: "tx-custom",
          direction: "out",
          amount: 25,
          occurredAt: "2026-06-30T12:00:00.000+08:00",
          balanceAfter: 5295,
          createdAt: "2026-06-30T12:00:00.000+08:00",
          updatedAt: "2026-06-30T12:00:00.000+08:00",
        },
      ],
    };
    await writeJsonDb(data);

    const database = new DatabaseSync(sqlitePath);
    try {
      const result = migrateAppStateToStructuredTables(database);

      expect(result.counts.assets).toBe(data.assets?.length);
      expect(result.counts.assetAddons).toBe(1);
      expect(result.counts.transactions).toBe(1);
      expect(result.counts.accountFlows).toBe(1);
      expect(singleValue(database, "SELECT attachments_json FROM assets WHERE id = 'asset-custom'")).toContain("receipt.jpg");
      expect(singleValue(database, "SELECT extra_json FROM assets WHERE id = 'asset-custom'")).toContain("customField");
      expect(singleValue(database, "SELECT category_name_snapshot FROM transactions WHERE id = 'tx-custom'")).toBe("Food");
    } finally {
      database.close();
    }
  });

  test("is idempotent after the first successful migration", async () => {
    await resetJsonDb();

    const database = new DatabaseSync(sqlitePath);
    try {
      database.prepare("DELETE FROM schema_migrations WHERE version = 1").run();
      const first = migrateAppStateToStructuredTables(database);
      const second = migrateAppStateToStructuredTables(database);

      expect(first.migrated).toBe(true);
      expect(second.migrated).toBe(false);
      expect(second.counts).toEqual(first.counts);
      expect(singleValue(database, "SELECT COUNT(*) FROM schema_migrations")).toBe(1);
    } finally {
      database.close();
    }
  });
});

function singleValue(database: DatabaseSync, sql: string) {
  const row = database.prepare(sql).get() as Record<string, unknown>;
  return Object.values(row)[0];
}
