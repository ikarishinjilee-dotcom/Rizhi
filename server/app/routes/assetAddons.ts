import type { FastifyInstance } from "fastify";
import { createAssetAddon, updateAssetAddon } from "../repositories/assetAddonRepository.ts";

export function registerAssetAddonRoutes(app: FastifyInstance) {
  app.post<{
    Params: { assetId: string };
    Body: Record<string, unknown>;
  }>("/api/v1/assets/:assetId/addons", async (request) => ({
    data: await createAssetAddon(request.params.assetId, request.body),
  }));

  app.patch<{
    Params: { assetId: string; addonId: string };
    Body: Record<string, unknown>;
  }>("/api/v1/assets/:assetId/addons/:addonId", async (request) => ({
    data: await updateAssetAddon(request.params.addonId, request.body, request.params.assetId),
  }));

  app.patch<{
    Params: { addonId: string };
    Body: Record<string, unknown>;
  }>("/api/v1/addons/:addonId", async (request) => ({
    data: await updateAssetAddon(request.params.addonId, request.body),
  }));
}
