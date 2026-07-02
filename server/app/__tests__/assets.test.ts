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

describe("Fastify assets routes", () => {
  test("lists default assets", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-assets-"));
    process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assets",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "ast_000001",
        name: "iPhone 16 Pro",
      }),
    ]));

    await app.close();
  });

  test("filters assets by status category and keyword", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-assets-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      accounts: [],
      assets: [
        { id: "asset-1", name: "Sony 耳机", brand: "Sony", model: "WH-1000XM5", categoryId: "asset-digital", status: "using" },
        { id: "asset-2", name: "旧沙发", brand: "宜家", categoryId: "asset-home", status: "idle" },
      ],
      categories: [],
    }), "utf8");

    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assets?status=using&categoryId=asset-digital&keyword=xm5",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([
      expect.objectContaining({
        id: "asset-1",
      }),
    ]);

    await app.close();
  });

  test("rejects invalid asset status filters", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assets?status=bad",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "资产状态不合法",
        details: {},
      },
    });

    await app.close();
  });

  test("gets asset detail with addons and related transactions", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-asset-detail-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      accounts: [],
      assets: [
        { id: "asset-1", name: "MacBook Pro", categoryId: "asset-digital", status: "using" },
        { id: "asset-2", name: "Desk", categoryId: "asset-home", status: "idle" },
      ],
      assetAddons: [
        { id: "addon-1", assetId: "asset-1", type: "accessory", name: "USB-C Hub", amount: 199 },
        { id: "addon-2", assetId: "asset-2", type: "repair", name: "Paint", amount: 80 },
      ],
      transactions: [
        { id: "tx-1", assetId: "asset-1", categoryId: "tx-office", amount: 12999 },
        { id: "tx-2", assetId: "asset-2", categoryId: "tx-home", amount: 699 },
      ],
      categories: [],
    }), "utf8");

    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assets/asset-1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      asset: expect.objectContaining({
        id: "asset-1",
        name: "MacBook Pro",
      }),
      addons: [
        expect.objectContaining({
          id: "addon-1",
          assetId: "asset-1",
        }),
      ],
      relatedTransactions: [
        expect.objectContaining({
          id: "tx-1",
          assetId: "asset-1",
        }),
      ],
    });

    await app.close();
  });

  test("returns 404 when asset detail is missing", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-asset-missing-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      accounts: [],
      assets: [],
      categories: [],
    }), "utf8");

    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/assets/missing-asset",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "ASSET_NOT_FOUND",
        message: "资产不存在",
        details: {},
      },
    });

    await app.close();
  });
});
