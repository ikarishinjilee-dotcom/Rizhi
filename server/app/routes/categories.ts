import type { FastifyInstance } from "fastify";
import {
  createCategory,
  deleteCategory,
  getCategoryUsage,
  listCategories,
  migrateCategoryTransactions,
  updateCategory,
} from "../repositories/categoryRepository.ts";

export function registerCategoryRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: {
      domain?: string;
      type?: string;
      enabled?: string;
    };
  }>("/api/v1/categories", async (request) => ({
    data: await listCategories({
      domain: request.query.domain,
      type: request.query.type,
      enabled: request.query.enabled,
    }),
  }));

  app.get<{
    Params: {
      categoryId: string;
    };
  }>("/api/v1/categories/:categoryId/usage", async (request) => ({
    data: await getCategoryUsage(request.params.categoryId),
  }));

  app.post<{ Body: Record<string, unknown> }>("/api/v1/categories", async (request) => ({
    data: await createCategory(request.body),
  }));
  app.patch<{ Params: { categoryId: string }; Body: Record<string, unknown> }>(
    "/api/v1/categories/:categoryId",
    async (request) => ({ data: await updateCategory(request.params.categoryId, request.body) }),
  );
  app.delete<{ Params: { categoryId: string } }>("/api/v1/categories/:categoryId", async (request) => ({
    data: await deleteCategory(request.params.categoryId),
  }));
  app.post<{ Params: { categoryId: string }; Body: Record<string, unknown> }>(
    "/api/v1/categories/:categoryId/migrate-transactions",
    async (request) => ({ data: await migrateCategoryTransactions(request.params.categoryId, request.body) }),
  );
}
