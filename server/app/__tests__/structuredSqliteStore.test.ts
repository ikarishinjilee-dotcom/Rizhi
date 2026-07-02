import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { migrateAppStateToStructuredTables } from "../db/migrateAppState.ts";
import { readStructuredJsonDb } from "../db/structuredSqliteStore.ts";
import { readJsonDb, writeJsonDb, type RizhiData } from "../db/sqliteStore.ts";

let tempDir: string | undefined;
let legacyPath: string;
let sqlitePath: string;
const originalDataPath = process.env.RIZHI_API_DATA_PATH;
const originalSqlitePath = process.env.RIZHI_API_SQLITE_PATH;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "rizhi-structured-read-"));
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

describe("structured SQLite read model", () => {
  test("reconstructs default app data from structured tables", async () => {
    const source = await readJsonDb();

    const database = new DatabaseSync(sqlitePath);
    try {
      migrateAppStateToStructuredTables(database);
      const structured = readStructuredJsonDb(database);

      expect(structured.accounts).toEqual(sortById(source.accounts));
      expect(structured.assets).toEqual(sortById(source.assets ?? []));
      expect(structured.assetAddons).toEqual([]);
      expect(structured.transactions).toEqual([]);
      expect(structured.accountFlows).toEqual([]);
      expect(structured.categories).toEqual(sortCategories(source.categories ?? []));
      expect(structured.settings).toEqual(source.settings);
      expect(structured.meta).toEqual(source.meta);
    } finally {
      database.close();
    }
  });

  test("reconstructs extended assets, addons, transactions and flows", async () => {
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
      migrateAppStateToStructuredTables(database);
      const structured = readStructuredJsonDb(database);

      expect(structured.assets?.find((asset) => asset.id === "asset-custom")).toEqual(data.assets?.find((asset) => asset.id === "asset-custom"));
      expect(structured.assetAddons).toEqual(data.assetAddons?.map((item) => ({ ...item, userId: "user-local" })));
      expect(structured.transactions).toEqual(data.transactions?.map((item) => ({ ...item, userId: "user-local" })));
      expect(structured.accountFlows).toEqual(data.accountFlows?.map((item) => ({ ...item, userId: "user-local" })));
    } finally {
      database.close();
    }
  });
});

function sortById<T extends { id: string }>(items: T[]) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function sortCategories(items: NonNullable<RizhiData["categories"]>) {
  return [...items]
    .map((category) => category.domain === "asset" ? { ...category, type: "other" } : category)
    .sort((left, right) => left.sort - right.sort || left.id.localeCompare(right.id));
}
