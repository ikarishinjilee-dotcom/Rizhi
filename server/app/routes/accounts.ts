import type { FastifyInstance } from "fastify";
import {
  createAccount,
  deleteAccount,
  listAccountFlows,
  listAccounts,
  repayDebt,
  transferFunds,
  updateAccount,
} from "../repositories/accountRepository.ts";

export function registerAccountRoutes(app: FastifyInstance) {
  app.get("/api/v1/accounts", async () => ({
    data: await listAccounts(),
  }));

  app.get<{
    Params: { accountId: string };
    Querystring: {
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      pageSize?: string;
    };
  }>("/api/v1/accounts/:accountId/flows", async (request) => ({
    data: await listAccountFlows({
      accountId: request.params.accountId,
      dateFrom: request.query.dateFrom,
      dateTo: request.query.dateTo,
      page: parsePositiveInt(request.query.page, 1),
      pageSize: Math.min(100, parsePositiveInt(request.query.pageSize, 20)),
    }),
  }));

  app.post<{ Body: Record<string, unknown> }>("/api/v1/accounts", async (request) => ({
    data: await createAccount(request.body),
  }));
  app.patch<{ Params: { accountId: string }; Body: Record<string, unknown> }>(
    "/api/v1/accounts/:accountId",
    async (request) => ({ data: await updateAccount(request.params.accountId, request.body) }),
  );
  app.delete<{ Params: { accountId: string } }>("/api/v1/accounts/:accountId", async (request) => ({
    data: await deleteAccount(request.params.accountId),
  }));
  app.post<{ Body: Record<string, unknown> }>("/api/v1/accounts/transfer", async (request) => ({
    data: await transferFunds(request.body),
  }));
  app.post<{ Body: Record<string, unknown> }>("/api/v1/transactions/repayment", async (request) => ({
    data: await repayDebt(request.body),
  }));
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}
