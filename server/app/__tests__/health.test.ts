import { describe, expect, test } from "vitest";
import { createApp } from "../app.ts";

describe("Fastify app skeleton", () => {
  test("responds to health checks", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        status: "ok",
        runtime: "fastify",
      },
    });

    await app.close();
  });

  test("returns the shared error envelope for unknown routes", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/missing",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "接口不存在",
        details: {},
      },
    });

    await app.close();
  });

  test("protects API routes when a production token is configured", async () => {
    const app = createApp({ apiToken: "test-secret" });

    const health = await app.inject({ method: "GET", url: "/api/v1/health" });
    const denied = await app.inject({ method: "GET", url: "/api/v1/categories" });
    const allowed = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      headers: { authorization: "Bearer test-secret" },
    });

    expect(health.statusCode).toBe(200);
    expect(denied.statusCode).toBe(401);
    expect(allowed.statusCode).toBe(200);
    await app.close();
  });
});
