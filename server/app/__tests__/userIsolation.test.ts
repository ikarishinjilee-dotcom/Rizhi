import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createApp } from "../app.ts";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("request user isolation", () => {
  test("keeps concurrent users' records isolated", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-user-isolation-"));
    const app = createApp({
      db: { sqlitePath: join(tempDir, "data.sqlite") },
    });

    const [aliceCreate, bobCreate] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/v1/categories",
        headers: { "x-rizhi-user-id": "alice" },
        payload: { domain: "asset", name: "Alice category" },
      }),
      app.inject({
        method: "POST",
        url: "/api/v1/categories",
        headers: { "x-rizhi-user-id": "bob" },
        payload: { domain: "asset", name: "Bob category" },
      }),
    ]);

    expect(aliceCreate.statusCode).toBe(200);
    expect(bobCreate.statusCode).toBe(200);

    const [aliceList, bobList, localList] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/v1/categories?domain=asset",
        headers: { "x-rizhi-user-id": "alice" },
      }),
      app.inject({
        method: "GET",
        url: "/api/v1/categories?domain=asset",
        headers: { "x-rizhi-user-id": "bob" },
      }),
      app.inject({
        method: "GET",
        url: "/api/v1/categories?domain=asset",
      }),
    ]);

    expect(aliceList.json().data.map((item: { name: string }) => item.name)).toEqual(["Alice category"]);
    expect(bobList.json().data.map((item: { name: string }) => item.name)).toEqual(["Bob category"]);
    expect(localList.json().data.some((item: { name: string }) => item.name === "Alice category")).toBe(false);
    expect(localList.json().data.some((item: { name: string }) => item.name === "Bob category")).toBe(false);

    await app.close();
  });

  test("rejects invalid user identifiers", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "rizhi-user-validation-"));
    const app = createApp({
      db: { sqlitePath: join(tempDir, "data.sqlite") },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: { "x-rizhi-user-id": "../other-user" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_USER_ID");
    await app.close();
  });
});
