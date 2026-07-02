import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mutateJsonDb, readJsonDb } from "../db/sqliteStore.ts";

let tempDir: string | undefined;
let legacyPath: string;
const originalDataPath = process.env.RIZHI_API_DATA_PATH;
const originalSqlitePath = process.env.RIZHI_API_SQLITE_PATH;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "rizhi-sqlite-"));
  legacyPath = join(tempDir, "legacy.json");
  process.env.RIZHI_API_DATA_PATH = legacyPath;
  delete process.env.RIZHI_API_SQLITE_PATH;
});

afterEach(async () => {
  process.env.RIZHI_API_DATA_PATH = originalDataPath;
  process.env.RIZHI_API_SQLITE_PATH = originalSqlitePath;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe("SQLite state store", () => {
  test("imports an existing JSON database on first open", async () => {
    await writeFile(legacyPath, JSON.stringify({
      accounts: [],
      assets: [{ id: "asset-imported", name: "Imported", categoryId: "asset-other", status: "using" }],
      categories: [],
    }));

    const data = await readJsonDb();

    expect(data.assets?.[0]?.id).toBe("asset-imported");
    await expect(access(`${legacyPath}.sqlite`)).resolves.toBeUndefined();
  });

  test("rolls back failed mutations", async () => {
    const before = await readJsonDb();

    await expect(mutateJsonDb((data) => {
      data.assets = [];
      throw new Error("rollback");
    })).rejects.toThrow("rollback");

    const after = await readJsonDb();
    expect(after.assets).toEqual(before.assets);
  });

  test("writes mutations directly to structured tables", async () => {
    const initial = await readJsonDb();
    expect(initial.assets?.some((asset) => asset.id === "ast_000001")).toBe(true);

    await mutateJsonDb((data) => {
      data.assets = [
        ...(data.assets ?? []),
        {
          id: "asset-after-structured-read",
          name: "Structured read asset",
          categoryId: "asset-other",
          status: "using",
        },
      ];
    });

    const refreshed = await readJsonDb();
    expect(refreshed.assets?.some((asset) => asset.id === "asset-after-structured-read")).toBe(true);

    const database = new DatabaseSync(`${legacyPath}.sqlite`);
    try {
      const structured = database.prepare("SELECT 1 FROM assets WHERE id = ?").get("asset-after-structured-read");
      const legacy = database.prepare("SELECT data FROM app_state WHERE id = 1").get() as { data: string };
      expect(structured).toBeDefined();
      expect(legacy.data).not.toContain("asset-after-structured-read");
    } finally {
      database.close();
    }
  });

  test("round-trips asset part events through structured storage", async () => {
    await mutateJsonDb((data) => {
      data.assetPartEvents = [{
        id: "part-event-1",
        assetId: "ast_000001",
        type: "replace",
        occurredAt: "2026-07-01T10:00:00.000+08:00",
        amount: 399,
      }];
    });

    const data = await readJsonDb();
    expect(data.assetPartEvents).toEqual([{
      id: "part-event-1",
      assetId: "ast_000001",
      type: "replace",
      occurredAt: "2026-07-01T10:00:00.000+08:00",
      amount: 399,
      userId: "user-local",
    }]);
  });

  test("does not rewrite unrelated structured records during a mutation", async () => {
    await readJsonDb();
    const sqlitePath = `${legacyPath}.sqlite`;
    const beforeDatabase = new DatabaseSync(sqlitePath);
    const accountRowIdBefore = (beforeDatabase.prepare(
      "SELECT rowid FROM accounts WHERE id = 'alipay'",
    ).get() as { rowid: number }).rowid;
    beforeDatabase.close();

    await mutateJsonDb((data) => {
      const asset = data.assets?.find((item) => item.id === "ast_000001");
      if (asset) asset.name = "Updated asset";
    });

    const afterDatabase = new DatabaseSync(sqlitePath);
    try {
      const accountRowIdAfter = (afterDatabase.prepare(
        "SELECT rowid FROM accounts WHERE id = 'alipay'",
      ).get() as { rowid: number }).rowid;
      expect(accountRowIdAfter).toBe(accountRowIdBefore);
    } finally {
      afterDatabase.close();
    }
  });

  test("rejects broken relationships and rolls back the mutation", async () => {
    await readJsonDb();

    await expect(mutateJsonDb((data) => {
      const asset = data.assets?.find((item) => item.id === "ast_000001");
      if (asset) asset.categoryId = "missing-category";
    })).rejects.toThrow("ASSET_CATEGORY_NOT_FOUND");

    const data = await readJsonDb();
    expect(data.assets?.find((item) => item.id === "ast_000001")?.categoryId).toBe("asset-digital");
  });
});
