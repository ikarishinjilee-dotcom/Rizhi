import type { FastifyInstance } from "fastify";
import { exportData, getSnapshot, importData, resetData } from "../repositories/dataRepository.ts";

export function registerDataRoutes(app: FastifyInstance) {
  app.get("/api/v1/snapshot", async () => ({
    data: await getSnapshot(),
  }));

  app.post("/api/v1/reset", async () => ({
    data: await resetData(),
  }));

  app.get("/api/v1/export", async () => ({
    data: await exportData(),
  }));

  app.post("/api/v1/import", async (request) => ({
    data: await importData(request.body),
  }));
}
