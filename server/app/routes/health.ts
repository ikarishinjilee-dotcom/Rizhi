import type { FastifyInstance } from "fastify";

export function registerHealthRoutes(app: FastifyInstance) {
  app.get("/api/v1/health", async () => ({
    data: {
      status: "ok",
      runtime: "fastify",
      time: new Date().toISOString(),
    },
  }));
}
