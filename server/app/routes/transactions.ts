import type { FastifyInstance } from "fastify";
import {
  convertTransactionToAssetAddon,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../repositories/transactionRepository.ts";

export function registerTransactionRoutes(app: FastifyInstance) {
  app.post<{ Body: Record<string, unknown> }>("/api/v1/transactions/expense", async (request) => ({
    data: await createTransaction(request.body, "expense"),
  }));
  app.post<{ Body: Record<string, unknown> }>("/api/v1/transactions/income", async (request) => ({
    data: await createTransaction(request.body, "income"),
  }));
  app.patch<{ Params: { transactionId: string }; Body: Record<string, unknown> }>(
    "/api/v1/transactions/:transactionId",
    async (request) => ({ data: await updateTransaction(request.params.transactionId, request.body) }),
  );
  app.delete<{ Params: { transactionId: string } }>(
    "/api/v1/transactions/:transactionId",
    async (request) => ({ data: await deleteTransaction(request.params.transactionId) }),
  );
  app.post<{ Body: Record<string, unknown> }>(
    "/api/v1/transactions/convert-to-asset-addon",
    async (request) => ({ data: await convertTransactionToAssetAddon(request.body) }),
  );
}
