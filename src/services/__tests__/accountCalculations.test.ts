import { describe, expect, it } from "vitest";
import { accountFlowDelta } from "@/domain/accountCalculations";
import type { AccountFlowRecord, MoneyAccountRecord, TransactionRecord } from "@/domain/models";

const timestamp = "2026-07-02T00:00:00.000Z";

function account(id: string, direction: MoneyAccountRecord["direction"]): MoneyAccountRecord {
  return {
    id,
    name: id,
    type: direction === "asset" ? "wallet" : "credit_card",
    direction,
    balance: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function transaction(input: Partial<TransactionRecord> & Pick<TransactionRecord, "type" | "accountId">): TransactionRecord {
  return {
    id: "tx-1",
    categoryId: "test",
    amount: 100,
    occurredAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
}

function flow(accountId: string, direction: AccountFlowRecord["direction"]): AccountFlowRecord {
  return {
    id: `flow-${accountId}`,
    accountId,
    transactionId: "tx-1",
    direction,
    amount: 100,
    occurredAt: timestamp,
    balanceAfter: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("accountFlowDelta", () => {
  it("calculates normal asset and liability transaction deltas", () => {
    expect(accountFlowDelta(account("cash", "asset"), transaction({ type: "expense", accountId: "cash" }), flow("cash", "out"))).toBe(-100);
    expect(accountFlowDelta(account("cash", "asset"), transaction({ type: "income", accountId: "cash" }), flow("cash", "in"))).toBe(100);
    expect(accountFlowDelta(account("credit", "liability"), transaction({ type: "expense", accountId: "credit" }), flow("credit", "out"))).toBe(100);
    expect(accountFlowDelta(account("credit", "liability"), transaction({ type: "income", accountId: "credit" }), flow("credit", "in"))).toBe(-100);
  });

  it("calculates both sides of asset and liability transfers", () => {
    const transfer = transaction({
      type: "transfer",
      businessType: "account_transfer",
      accountId: "source",
      relatedAccountId: "target",
    });

    expect(accountFlowDelta(account("source", "asset"), transfer, flow("source", "out"))).toBe(-100);
    expect(accountFlowDelta(account("target", "asset"), transfer, flow("target", "in"))).toBe(100);
    expect(accountFlowDelta(account("source", "liability"), transfer, flow("source", "out"))).toBe(100);
    expect(accountFlowDelta(account("target", "liability"), transfer, flow("target", "in"))).toBe(-100);
  });

  it("reduces both the paying asset balance and repaid liability balance", () => {
    const repayment = transaction({
      type: "repayment",
      businessType: "debt_repayment",
      accountId: "cash",
      relatedAccountId: "credit",
    });

    expect(accountFlowDelta(account("cash", "asset"), repayment, flow("cash", "out"))).toBe(-100);
    expect(accountFlowDelta(account("credit", "liability"), repayment, flow("credit", "in"))).toBe(-100);
  });
});
