import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createApp } from "../app.ts";

let tempDir: string | undefined;
const originalDataPath = process.env.RIZHI_API_DATA_PATH;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "rizhi-asset-writes-"));
  process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");
});

afterEach(async () => {
  process.env.RIZHI_API_DATA_PATH = originalDataPath;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("native Fastify asset writes", () => {
  test("creates and updates an asset while recalculating its account effect", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });
    const created = await createAsset(app, {
      name: "Camera",
      originalCost: 1000,
      paymentAccountId: "alipay",
      imageUrls: ["data:image/png;base64,a"],
    });

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/assets/${created.id}`,
      payload: {
        name: "Camera Pro",
        originalCost: 1200,
        paymentAccountId: "wechat",
      },
    });
    const snapshot = await getSnapshot(app);

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().data).toMatchObject({
      name: "Camera Pro",
      imageUrls: ["data:image/png;base64,a"],
    });
    expect(accountBalance(snapshot, "alipay")).toBe(5320);
    expect(accountBalance(snapshot, "wechat")).toBe(100);
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.accountFlows).toHaveLength(1);
    await app.close();
  });

  test("deletes asset-owned records and preserves detached transaction history", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });
    const created = await createAsset(app, { name: "Tablet", originalCost: 500, paymentAccountId: "alipay" });

    const deleteResponse = await app.inject({ method: "DELETE", url: `/api/v1/assets/${created.id}` });
    const snapshot = await getSnapshot(app);

    expect(deleteResponse.statusCode).toBe(200);
    expect(snapshot.assets.some((asset: { id: string }) => asset.id === created.id)).toBe(false);
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0].assetId).toBeUndefined();
    await app.close();
  });

  test("transfers and revokes an asset with matching account effects", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });
    const assetId = "ast_000001";

    const transferResponse = await app.inject({
      method: "POST",
      url: `/api/v1/assets/${assetId}/transfer`,
      payload: {
        amount: 800,
        occurredAt: "2026-06-28T10:00:00.000+08:00",
        accountId: "alipay",
      },
    });
    let snapshot = await getSnapshot(app);
    expect(transferResponse.statusCode).toBe(200);
    expect(accountBalance(snapshot, "alipay")).toBe(6120);
    expect(snapshot.assets.find((asset: { id: string }) => asset.id === assetId).status).toBe("transferred");

    const revokeResponse = await app.inject({
      method: "POST",
      url: `/api/v1/assets/${assetId}/transfer/revoke`,
    });
    snapshot = await getSnapshot(app);
    expect(revokeResponse.statusCode).toBe(200);
    expect(accountBalance(snapshot, "alipay")).toBe(5320);
    expect(snapshot.transactions).toHaveLength(0);
    expect(snapshot.accountFlows).toHaveLength(0);
    expect(snapshot.assets.find((asset: { id: string }) => asset.id === assetId).status).toBe("using");
    await app.close();
  });

  test("serializes concurrent asset writes", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) => app.inject({
        method: "POST",
        url: "/api/v1/assets",
        payload: baseAsset({ name: `Asset ${index}`, originalCost: 10 + index }),
      })),
    );
    const snapshot = await getSnapshot(app);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    expect(snapshot.assets.filter((asset: { name: string }) => asset.name.startsWith("Asset "))).toHaveLength(5);
    await app.close();
  });

  test("rejects assets that reference non-asset or disabled categories", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });

    const transactionCategoryResponse = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      payload: baseAsset({ categoryId: "tx-food" }),
    });
    const disabledCategoryResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      payload: { domain: "asset", name: "Hidden", enabled: false },
    });
    const disabledAssetResponse = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      payload: baseAsset({ categoryId: disabledCategoryResponse.json().data.id }),
    });
    const updateResponse = await app.inject({
      method: "PATCH",
      url: "/api/v1/assets/ast_000001",
      payload: { categoryId: "tx-food" },
    });

    expect(transactionCategoryResponse.statusCode).toBe(400);
    expect(transactionCategoryResponse.json().error.code).toBe("CATEGORY_TYPE_MISMATCH");
    expect(disabledAssetResponse.statusCode).toBe(400);
    expect(disabledAssetResponse.json().error.code).toBe("CATEGORY_DISABLED");
    expect(updateResponse.statusCode).toBe(400);
    expect(updateResponse.json().error.code).toBe("CATEGORY_TYPE_MISMATCH");
    await app.close();
  });
});

function baseAsset(overrides: Record<string, unknown>) {
  return {
    name: "Asset",
    categoryId: "asset-digital",
    originalCost: 100,
    purchaseDate: "2026-06-28",
    ...overrides,
  };
}

async function createAsset(app: ReturnType<typeof createApp>, overrides: Record<string, unknown>) {
  const response = await app.inject({ method: "POST", url: "/api/v1/assets", payload: baseAsset(overrides) });
  expect(response.statusCode).toBe(200);
  return response.json().data;
}

async function getSnapshot(app: ReturnType<typeof createApp>) {
  const response = await app.inject({ method: "GET", url: "/api/v1/snapshot" });
  expect(response.statusCode).toBe(200);
  return response.json().data;
}

function accountBalance(snapshot: { accounts: Array<{ id: string; balance: number }> }, accountId: string) {
  return snapshot.accounts.find((account) => account.id === accountId)?.balance;
}
