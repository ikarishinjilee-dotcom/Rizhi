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

describe("Fastify accounts routes", () => {
  test("lists accounts using the shared response envelope", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/accounts",
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "alipay",
        name: "支付宝余额",
      }),
    ]));

    await app.close();
  });

  test("reads accounts from RIZHI_API_DATA_PATH when provided", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-accounts-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      accounts: [
        {
          id: "test-account",
          name: "测试账户",
          type: "wallet",
          direction: "asset",
          balance: 42,
          createdAt: "2026-06-26T00:00:00.000+08:00",
          updatedAt: "2026-06-26T00:00:00.000+08:00",
        },
      ],
    }), "utf8");

    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/accounts",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([
      expect.objectContaining({
        id: "test-account",
        balance: 42,
      }),
    ]);

    await app.close();
  });

  test("keeps the data path captured when the app was created", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-accounts-captured-"));
    const firstPath = join(tempDir, "first.json");
    const secondPath = join(tempDir, "second.json");
    process.env.RIZHI_API_DATA_PATH = firstPath;
    await writeFile(firstPath, JSON.stringify({
      accounts: [
        {
          id: "captured-account",
          name: "Captured",
          type: "wallet",
          direction: "asset",
          balance: 77,
          createdAt: "2026-06-26T00:00:00.000+08:00",
          updatedAt: "2026-06-26T00:00:00.000+08:00",
        },
      ],
    }), "utf8");
    await writeFile(secondPath, JSON.stringify({
      accounts: [
        {
          id: "other-account",
          name: "Other",
          type: "wallet",
          direction: "asset",
          balance: 88,
          createdAt: "2026-06-26T00:00:00.000+08:00",
          updatedAt: "2026-06-26T00:00:00.000+08:00",
        },
      ],
    }), "utf8");

    const app = createApp();
    process.env.RIZHI_API_DATA_PATH = secondPath;
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/accounts",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([
      expect.objectContaining({
        id: "captured-account",
        balance: 77,
      }),
    ]);

    await app.close();
  });

  test("returns filtered paginated account flows", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-fastify-flows-"));
    const dataPath = join(tempDir, "db.json");
    process.env.RIZHI_API_DATA_PATH = dataPath;
    await writeFile(dataPath, JSON.stringify({
      accounts: [
        {
          id: "alipay",
          name: "支付宝余额",
          type: "wallet",
          direction: "asset",
          balance: 100,
          createdAt: "2026-06-26T00:00:00.000+08:00",
          updatedAt: "2026-06-26T00:00:00.000+08:00",
        },
      ],
      accountFlows: [
        {
          id: "flow-1",
          accountId: "alipay",
          transactionId: "tx-1",
          direction: "out",
          amount: 35,
          occurredAt: "2026-06-05T12:00:00.000+08:00",
          balanceAfter: 65,
          createdAt: "2026-06-05T12:00:00.000+08:00",
          updatedAt: "2026-06-05T12:00:00.000+08:00",
        },
        {
          id: "flow-2",
          accountId: "alipay",
          transactionId: "tx-2",
          direction: "out",
          amount: 12,
          occurredAt: "2026-06-06T09:00:00.000+08:00",
          balanceAfter: 53,
          createdAt: "2026-06-06T09:00:00.000+08:00",
          updatedAt: "2026-06-06T09:00:00.000+08:00",
        },
      ],
    }), "utf8");

    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/accounts/alipay/flows?dateFrom=2026-06-06&dateTo=2026-06-06&page=1&pageSize=1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        flows: [
          expect.objectContaining({
            id: "flow-2",
            amount: 12,
          }),
        ],
        page: {
          page: 1,
          pageSize: 1,
          total: 1,
        },
      },
    });

    await app.close();
  });

  test("returns ACCOUNT_NOT_FOUND for missing account flows", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/accounts/missing/flows",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "ACCOUNT_NOT_FOUND",
        message: "账户不存在",
        details: {},
      },
    });

    await app.close();
  });
});
