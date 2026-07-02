import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createApp } from "../app.ts";

let tempDir: string | undefined;
const originalDataPath = process.env.RIZHI_API_DATA_PATH;

afterEach(async () => {
  process.env.RIZHI_API_DATA_PATH = originalDataPath;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("Fastify data routes", () => {
  test("gets a full data snapshot", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-snapshot-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      meta: { version: 1 },
      settings: { id: "default", currency: "CNY" },
      accounts: [{ id: "cash", name: "Cash", type: "cash", direction: "asset", balance: 100, createdAt: "now", updatedAt: "now" }],
      assets: [],
      assetAddons: [],
      assetPartEvents: [],
      transactions: [],
      accountFlows: [],
      categories: [],
    }), "utf8");

    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/snapshot",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(expect.objectContaining({
      assets: [],
      assetAddons: [],
      assetPartEvents: [],
      accounts: [expect.objectContaining({ id: "cash" })],
      transactions: [],
      accountFlows: [],
      categories: [],
      settings: expect.objectContaining({ id: "default" }),
      meta: expect.objectContaining({ version: 1 }),
    }));

    await app.close();
  });

  test("resets data to defaults", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-reset-"));
    process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");

    const app = createApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/reset",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(expect.objectContaining({
      assets: expect.arrayContaining([
        expect.objectContaining({ id: "ast_000001" }),
      ]),
      accounts: expect.arrayContaining([
        expect.objectContaining({ id: "alipay" }),
      ]),
    }));

    await app.close();
  });

  test("exports and imports Rizhi backup payloads", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-backup-"));
    process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");

    const app = createApp();
    const exportResponse = await app.inject({
      method: "GET",
      url: "/api/v1/export",
    });
    const backup = exportResponse.json().data;

    expect(exportResponse.statusCode).toBe(200);
    expect(backup).toMatchObject({
      format: "rizhi-local-backup",
      version: 1,
      app: "rizhi",
    });
    expect(backup.data.settings).toBeInstanceOf(Array);
    expect(backup.data.metadata).toBeInstanceOf(Array);

    backup.data.assets = [
      {
        ...backup.data.assets[0],
        id: "ast_imported",
        name: "Imported asset",
      },
    ];
    backup.data.assetAddons = [];
    backup.data.transactions = [];
    backup.data.accountFlows = [];

    const importResponse = await app.inject({
      method: "POST",
      url: "/api/v1/import",
      payload: backup,
    });
    const snapshotResponse = await app.inject({
      method: "GET",
      url: "/api/v1/snapshot",
    });

    expect(importResponse.statusCode).toBe(200);
    expect(importResponse.json().data).toEqual(expect.objectContaining({
      imported: true,
      counts: expect.objectContaining({ assets: 1 }),
    }));
    expect(snapshotResponse.json().data.assets).toEqual([
      expect.objectContaining({
        id: "ast_imported",
        name: "Imported asset",
      }),
    ]);

    await app.close();
  });

  test("preserves empty arrays on import", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-empty-import-"));
    process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");

    const app = createApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/import",
      payload: {
        format: "rizhi-local-backup",
        version: 1,
        exportedAt: "2026-06-26T00:00:00.000Z",
        app: "rizhi",
        data: {
          assets: [],
          assetAddons: [],
          assetPartEvents: [],
          accounts: [],
          transactions: [],
          accountFlows: [],
          categories: [],
          settings: [],
          metadata: [],
        },
      },
    });
    const snapshotResponse = await app.inject({
      method: "GET",
      url: "/api/v1/snapshot",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.counts).toEqual({
      assets: 0,
      assetAddons: 0,
      transactions: 0,
      accounts: 0,
      accountFlows: 0,
      categories: 0,
    });
    expect(snapshotResponse.json().data.assets).toEqual([]);
    expect(snapshotResponse.json().data.accounts).toEqual([]);

    await app.close();
  });

  test("rejects invalid backup payloads", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/import",
      payload: { app: "other" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "这不是日值的备份文件",
        details: {},
      },
    });

    await app.close();
  });
});
