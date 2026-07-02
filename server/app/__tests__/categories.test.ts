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

describe("Fastify categories routes", () => {
  test("lists default categories", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-categories-"));
    process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "asset-digital",
        domain: "asset",
      }),
      expect.objectContaining({
        id: "tx-food",
        domain: "transaction",
      }),
    ]));

    await app.close();
  });

  test("filters categories by domain and type", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-categories-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      accounts: [],
      accountFlows: [],
      categories: [
        { id: "asset-digital", domain: "asset", type: "digital", name: "数码", sort: 1 },
        { id: "tx-food", domain: "transaction", type: "expense", name: "餐饮", sort: 2 },
        { id: "tx-salary", domain: "transaction", type: "income", name: "工资", sort: 3 },
      ],
    }), "utf8");

    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories?domain=transaction&type=income",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([
      expect.objectContaining({
        id: "tx-salary",
        type: "income",
      }),
    ]);

    await app.close();
  });

  test("rejects invalid category domain filters", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-category-invalid-"));
    process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories?domain=bad",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "分类模块不合法",
        details: {},
      },
    });

    await app.close();
  });

  test("filters categories by enabled state", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-categories-enabled-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      accounts: [],
      accountFlows: [],
      categories: [
        { id: "asset-active", domain: "asset", type: "other", name: "Active", sort: 1, enabled: true },
        { id: "asset-disabled", domain: "asset", type: "other", name: "Disabled", sort: 2, enabled: false },
      ],
    }), "utf8");

    const app = createApp();
    const activeResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories?domain=asset&enabled=true",
    });
    const disabledResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories?domain=asset&enabled=false",
    });
    const invalidResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories?enabled=bad",
    });

    expect(activeResponse.statusCode).toBe(200);
    expect(activeResponse.json().data.map((category: { id: string }) => category.id)).toEqual(["asset-active"]);
    expect(disabledResponse.statusCode).toBe(200);
    expect(disabledResponse.json().data.map((category: { id: string }) => category.id)).toEqual(["asset-disabled"]);
    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json().error.code).toBe("VALIDATION_ERROR");

    await app.close();
  });

  test("disabling a used asset category preserves existing assets and re-enabling allows reuse", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-category-toggle-"));
    process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });

    const disableResponse = await app.inject({
      method: "PATCH",
      url: "/api/v1/categories/asset-digital",
      payload: { enabled: false },
    });
    const usageResponse = await app.inject({
      method: "GET",
      url: "/api/v1/categories/asset-digital/usage",
    });
    const blockedAssetResponse = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      payload: {
        name: "Blocked",
        categoryId: "asset-digital",
        originalCost: 100,
        purchaseDate: "2026-06-28",
      },
    });
    const enableResponse = await app.inject({
      method: "PATCH",
      url: "/api/v1/categories/asset-digital",
      payload: { enabled: true },
    });
    const allowedAssetResponse = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      payload: {
        name: "Allowed",
        categoryId: "asset-digital",
        originalCost: 100,
        purchaseDate: "2026-06-28",
      },
    });

    expect(disableResponse.statusCode).toBe(200);
    expect(disableResponse.json().data.enabled).toBe(false);
    expect(usageResponse.statusCode).toBe(200);
    expect(usageResponse.json().data.assets).toBe(1);
    expect(blockedAssetResponse.statusCode).toBe(400);
    expect(blockedAssetResponse.json().error.code).toBe("CATEGORY_DISABLED");
    expect(enableResponse.statusCode).toBe(200);
    expect(enableResponse.json().data.enabled).toBe(true);
    expect(allowedAssetResponse.statusCode).toBe(200);

    await app.close();
  });

  test("returns category usage across related records", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-category-usage-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      accounts: [
        { id: "wallet-1", name: "钱包", type: "wallet", direction: "asset", balance: 100, createdAt: "2026-06-26T00:00:00.000+08:00", updatedAt: "2026-06-26T00:00:00.000+08:00" },
      ],
      assets: [
        { id: "asset-1", categoryId: "asset-digital" },
      ],
      transactions: [
        { id: "tx-1", categoryId: "tx-food" },
        { id: "tx-2", categoryId: "tx-other", subCategoryId: "tx-food-lunch" },
      ],
      categories: [
        { id: "asset-digital", domain: "asset", type: "digital", name: "数码", sort: 1 },
        { id: "tx-food", domain: "transaction", type: "expense", name: "餐饮", sort: 2 },
        { id: "tx-food-lunch", domain: "transaction", type: "expense", parentId: "tx-food", name: "午餐", sort: 3 },
        { id: "tx-other", domain: "transaction", type: "expense", name: "其他", sort: 4 },
        { id: "account-wallet", domain: "account", type: "wallet", name: "钱包", sort: 5 },
      ],
    }), "utf8");

    const app = createApp();
    const [transactionUsage, assetUsage, accountUsage] = await Promise.all([
      app.inject({ method: "GET", url: "/api/v1/categories/tx-food/usage" }),
      app.inject({ method: "GET", url: "/api/v1/categories/asset-digital/usage" }),
      app.inject({ method: "GET", url: "/api/v1/categories/account-wallet/usage" }),
    ]);

    expect(transactionUsage.json().data).toEqual({
      assets: 0,
      transactions: 2,
      childCategories: 1,
      accounts: 0,
      total: 3,
    });
    expect(assetUsage.json().data).toMatchObject({
      assets: 1,
      total: 1,
    });
    expect(accountUsage.json().data).toMatchObject({
      accounts: 1,
      total: 1,
    });

    await app.close();
  });

  test("returns CATEGORY_NOT_FOUND for missing category usage", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-category-missing-"));
    process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories/missing/usage",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: "分类不存在",
        details: {},
      },
    });

    await app.close();
  });
});
