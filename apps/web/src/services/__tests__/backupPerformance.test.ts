import { beforeEach, describe, expect, it } from "vitest";
import { rizhiDb } from "@/db/rizhiDb";
import { seedDatabaseIfNeeded } from "@/db/seed";
import type { AccountFlowRecord, CategoryRecord, TransactionRecord } from "@/domain/models";
import { backupService } from "@/services/backupService";

const RECORD_COUNT = 10_000;
const CATEGORY_COUNT = 100;
const PERFORMANCE_BUDGET_MS = Number(process.env.RIZHI_PERF_BUDGET_MS || 15_000);

async function resetLocalDb() {
  await rizhiDb.delete();
  await rizhiDb.open();
  await seedDatabaseIfNeeded();
}

function buildPerformanceRows(accountId: string) {
  const categories: CategoryRecord[] = Array.from({ length: CATEGORY_COUNT }, (_, index) => ({
    id: `perf-category-${index}`,
    domain: "transaction",
    type: index % 2 ? "income" : "expense",
    name: `性能分类 ${index}`,
    sort: 1_000 + index,
    enabled: true,
    isSystem: false,
  }));
  const transactions: TransactionRecord[] = Array.from({ length: RECORD_COUNT }, (_, index) => {
    const occurredAt = new Date(Date.UTC(2026, 0, 1 + (index % 365), 8, 0, 0)).toISOString();
    const category = categories[index % categories.length];
    return {
      id: `perf-transaction-${index}`,
      type: index % 2 ? "income" : "expense",
      categoryId: category.id,
      categorySnapshot: { categoryName: category.name },
      amount: (index % 500) + 1,
      occurredAt,
      accountId,
      note: `性能测试流水 ${index}`,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
  });
  const accountFlows: AccountFlowRecord[] = transactions.map((transaction, index) => ({
    id: `perf-flow-${index}`,
    accountId,
    transactionId: transaction.id,
    direction: transaction.type === "income" ? "in" : "out",
    amount: transaction.amount,
    occurredAt: transaction.occurredAt,
    balanceAfter: 100_000 + (index % 1_000),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  }));
  return { categories, transactions, accountFlows };
}

describe("backup performance", () => {
  beforeEach(async () => {
    await resetLocalDb();
  });

  it(`exports and restores ${RECORD_COUNT.toLocaleString()} records within the performance budget`, async () => {
    const account = (await rizhiDb.accounts.toArray())[0];
    expect(account).toBeDefined();
    const rows = buildPerformanceRows(account!.id);
    const baselineTransactionCount = await rizhiDb.transactions.count();

    await rizhiDb.categories.bulkPut(rows.categories);
    await rizhiDb.transactions.bulkPut(rows.transactions);
    await rizhiDb.accountFlows.bulkPut(rows.accountFlows);

    const exportStartedAt = performance.now();
    const payload = await backupService.createPayload();
    const exportDurationMs = performance.now() - exportStartedAt;

    await rizhiDb.categories.clear();
    await rizhiDb.transactions.clear();
    await rizhiDb.accountFlows.clear();

    const restoreStartedAt = performance.now();
    await backupService.restorePayload(payload);
    const restoreDurationMs = performance.now() - restoreStartedAt;

    console.info(`[backup-performance] records=${RECORD_COUNT} exportMs=${exportDurationMs.toFixed(1)} restoreMs=${restoreDurationMs.toFixed(1)}`);

    expect(payload.data.transactions).toHaveLength(RECORD_COUNT + baselineTransactionCount);
    expect(await rizhiDb.categories.where("id").startsWith("perf-category-").count()).toBe(CATEGORY_COUNT);
    expect(await rizhiDb.transactions.where("id").startsWith("perf-transaction-").count()).toBe(RECORD_COUNT);
    expect(await rizhiDb.accountFlows.where("id").startsWith("perf-flow-").count()).toBe(RECORD_COUNT);
    expect(await rizhiDb.transactions.get("perf-transaction-9999")).toMatchObject({ categoryId: "perf-category-99" });
    expect(exportDurationMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
    expect(restoreDurationMs).toBeLessThan(PERFORMANCE_BUDGET_MS);
  }, 30_000);
});
