import type { FastifyInstance } from "fastify";
import {
  createAsset,
  deleteAsset,
  getAssetDetail,
  listAssets,
  revokeAssetTransfer,
  transferAsset,
  updateAsset,
} from "../repositories/assetRepository.ts";

export function registerAssetRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: {
      status?: string;
      categoryId?: string;
      keyword?: string;
    };
  }>("/api/v1/assets", async (request) => ({
    data: await listAssets({
      status: request.query.status,
      categoryId: request.query.categoryId,
      keyword: request.query.keyword,
    }),
  }));

  app.get<{
    Params: {
      assetId: string;
    };
  }>("/api/v1/assets/:assetId", async (request) => ({
    data: await getAssetDetail(request.params.assetId),
  }));

  app.post<{ Body: Record<string, unknown> }>("/api/v1/assets", async (request) => ({
    data: await createAsset(request.body),
  }));

  app.patch<{ Params: { assetId: string }; Body: Record<string, unknown> }>(
    "/api/v1/assets/:assetId",
    async (request) => ({ data: await updateAsset(request.params.assetId, request.body) }),
  );

  app.delete<{ Params: { assetId: string } }>("/api/v1/assets/:assetId", async (request) => ({
    data: await deleteAsset(request.params.assetId),
  }));

  app.post<{
    Params: { assetId: string };
    Body: { amount?: unknown; occurredAt?: unknown; accountId?: unknown; note?: unknown };
  }>("/api/v1/assets/:assetId/transfer", async (request) => ({
    data: await transferAsset(request.params.assetId, request.body),
  }));

  app.post<{ Params: { assetId: string } }>(
    "/api/v1/assets/:assetId/transfer/revoke",
    async (request) => ({ data: await revokeAssetTransfer(request.params.assetId) }),
  );
}
