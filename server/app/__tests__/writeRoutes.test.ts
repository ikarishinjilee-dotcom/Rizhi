import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createApp } from "../app.ts";

let tempDir: string | undefined;
const originalDataPath = process.env.RIZHI_API_DATA_PATH;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-writes-"));
  process.env.RIZHI_API_DATA_PATH = join(tempDir, "db.json");
});

afterEach(async () => {
  process.env.RIZHI_API_DATA_PATH = originalDataPath;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("Fastify native write routes", () => {
  test("creates assets with linked account effects", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      payload: {
        name: "Camera",
        categoryId: "asset-digital",
        originalCost: 1000,
        purchaseDate: "2026-06-01",
        paymentAccountId: "alipay",
      },
    });
    const snapshotResponse = await app.inject({ method: "GET", url: "/api/v1/snapshot" });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.json().data).toEqual(expect.objectContaining({
      name: "Camera",
      purchaseTransactionId: expect.any(String),
    }));
    expect(snapshotResponse.json().data.accounts.find((account: { id: string }) => account.id === "alipay").balance).toBe(4320);

    await app.close();
  });

  test("creates and updates asset addons", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/assets/ast_000001/addons",
      payload: {
        name: "Case",
        direction: "expense",
        type: "accessory",
        amount: 100,
        purchaseDate: "2026-06-02",
        paymentAccountId: "alipay",
        includedInCost: true,
      },
    });
    const addon = createResponse.json().data;
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/addons/${addon.id}`,
      payload: {
        name: "Refund",
        direction: "income",
        type: "accessory",
        amount: 80,
        purchaseDate: "2026-06-03",
        paymentAccountId: "wechat",
        includedInCost: false,
      },
    });
    const snapshotResponse = await app.inject({ method: "GET", url: "/api/v1/snapshot" });

    expect(createResponse.statusCode).toBe(200);
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().data).toEqual(expect.objectContaining({
      id: addon.id,
      direction: "income",
      includedInCost: false,
    }));
    expect(snapshotResponse.json().data.accounts.find((account: { id: string }) => account.id === "alipay").balance).toBe(5320);
    expect(snapshotResponse.json().data.accounts.find((account: { id: string }) => account.id === "wechat").balance).toBe(1380);
    expect(snapshotResponse.json().data.transactions).toHaveLength(1);

    await app.close();
  });

  test("rejects addon writes for transferred assets", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });
    await app.inject({
      method: "POST",
      url: "/api/v1/assets/ast_000001/transfer",
      payload: {
        amount: 500,
        occurredAt: "2026-06-02T10:00:00.000+08:00",
        accountId: "alipay",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/assets/ast_000001/addons",
      payload: {
        name: "Case",
        type: "accessory",
        amount: 100,
        purchaseDate: "2026-06-02",
        includedInCost: true,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("ASSET_LOCKED");
    await app.close();
  });

  test("creates transactions and account transfers", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });

    const expenseResponse = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/expense",
      payload: {
        categoryId: "tx-food",
        subCategoryId: "tx-food-lunch",
        amount: 35,
        occurredAt: "2026-06-05T12:00:00.000+08:00",
        accountId: "alipay",
      },
    });
    const transferResponse = await app.inject({
      method: "POST",
      url: "/api/v1/accounts/transfer",
      payload: {
        fromAccountId: "alipay",
        toAccountId: "wechat",
        amount: 100,
        occurredAt: "2026-06-05T13:00:00.000+08:00",
      },
    });
    const snapshotResponse = await app.inject({ method: "GET", url: "/api/v1/snapshot" });
    const accounts = snapshotResponse.json().data.accounts;

    expect(expenseResponse.statusCode).toBe(200);
    expect(transferResponse.statusCode).toBe(200);
    expect(accounts.find((account: { id: string }) => account.id === "alipay").balance).toBe(5185);
    expect(accounts.find((account: { id: string }) => account.id === "wechat").balance).toBe(1400);

    await app.close();
  });

  test("creates categories and migrates transactions", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });

    const categoryResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      payload: {
        domain: "transaction",
        type: "expense",
        name: "Daily",
      },
    });
    const transactionResponse = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/expense",
      payload: {
        categoryId: "tx-food",
        subCategoryId: "tx-food-lunch",
        amount: 20,
        occurredAt: "2026-06-06T12:00:00.000+08:00",
        accountId: "alipay",
      },
    });
    const migrateResponse = await app.inject({
      method: "POST",
      url: "/api/v1/categories/tx-food/migrate-transactions",
      payload: {
        toCategoryId: categoryResponse.json().data.id,
      },
    });
    const snapshotResponse = await app.inject({ method: "GET", url: "/api/v1/snapshot" });
    const updated = snapshotResponse.json().data.transactions.find((item: { id: string }) => item.id === transactionResponse.json().data.id);

    expect(categoryResponse.statusCode).toBe(200);
    expect(migrateResponse.statusCode).toBe(200);
    expect(migrateResponse.json().data.migratedCount).toBe(1);
    expect(updated.categoryId).toBe(categoryResponse.json().data.id);
    expect(updated.subCategoryId).toBeUndefined();

    await app.close();
  });

  test("updates, converts, and deletes manual transactions", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/expense",
      payload: {
        categoryId: "tx-food",
        amount: 30,
        occurredAt: "2026-06-10T12:00:00.000+08:00",
        accountId: "alipay",
      },
    });
    const id = created.json().data.id;
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/transactions/${id}`,
      payload: {
        type: "expense",
        categoryId: "tx-transport",
        amount: 40,
        occurredAt: "2026-06-11T12:00:00.000+08:00",
        accountId: "wechat",
      },
    });
    const converted = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/convert-to-asset-addon",
      payload: {
        id,
        amount: 45,
        occurredAt: "2026-06-11T12:00:00.000+08:00",
        accountId: "wechat",
        assetId: "ast_000001",
        addonType: "repair",
        includedInCost: true,
      },
    });
    const deleteProtected = await app.inject({ method: "DELETE", url: `/api/v1/transactions/${id}` });

    expect(updated.statusCode).toBe(200);
    expect(converted.statusCode).toBe(200);
    expect(converted.json().data.addon).toMatchObject({ type: "repair", includedInCost: true });
    expect(deleteProtected.statusCode).toBe(409);
    expect(deleteProtected.json().error.code).toBe("TRANSACTION_PROTECTED");
    await app.close();
  });

  test("creates, updates, and deletes unused accounts", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/accounts",
      payload: { name: "Cash", type: "cash", direction: "asset", balance: 100 },
    });
    const id = created.json().data.id;
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/accounts/${id}`,
      payload: { name: "Pocket Cash" },
    });
    const deleted = await app.inject({ method: "DELETE", url: `/api/v1/accounts/${id}` });

    expect(created.statusCode).toBe(200);
    expect(updated.json().data.name).toBe("Pocket Cash");
    expect(deleted.statusCode).toBe(200);
    await app.close();
  });

  test("repays debt and updates and deletes unused categories", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });
    const repayment = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/repayment",
      payload: {
        fromAccountId: "alipay",
        liabilityAccountId: "huabei",
        amount: 300,
        occurredAt: "2026-06-12T12:00:00.000+08:00",
      },
    });
    const category = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      payload: { domain: "asset", type: "other", name: "Temporary" },
    });
    const categoryId = category.json().data.id;
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/categories/${categoryId}`,
      payload: { name: "Temporary Updated" },
    });
    const deleted = await app.inject({ method: "DELETE", url: `/api/v1/categories/${categoryId}` });
    const snapshot = await app.inject({ method: "GET", url: "/api/v1/snapshot" });

    expect(repayment.statusCode).toBe(200);
    expect(snapshot.json().data.accounts.find((account: { id: string }) => account.id === "alipay").balance).toBe(5020);
    expect(snapshot.json().data.accounts.find((account: { id: string }) => account.id === "huabei").balance).toBe(2000);
    expect(updated.json().data.name).toBe("Temporary Updated");
    expect(deleted.statusCode).toBe(200);
    await app.close();
  });

  test("treats asset categories as user-defined names without a business subtype", async () => {
    const app = createApp();
    await app.inject({ method: "POST", url: "/api/v1/reset" });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      payload: {
        domain: "asset",
        name: "护肤美妆",
        type: "digital",
        color: "#EC4899",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      domain: "asset",
      name: "护肤美妆",
      type: "other",
      color: "#EC4899",
    });
    await app.close();
  });
});
