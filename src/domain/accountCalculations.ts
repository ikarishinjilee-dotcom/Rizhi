import type { AccountFlowRecord, MoneyAccountRecord, TransactionRecord, TransactionType } from "@/domain/models";

export function accountTransactionDelta(account: MoneyAccountRecord, type: TransactionType, amount: number) {
  if (account.direction === "asset") {
    return type === "income" || type === "refund" ? amount : -amount;
  }

  return type === "income" || type === "refund" || type === "repayment" ? -amount : amount;
}

export function accountFlowDelta(
  account: MoneyAccountRecord,
  transaction: TransactionRecord | undefined,
  flow: AccountFlowRecord,
) {
  if (!transaction) return flow.direction === "in" ? flow.amount : -flow.amount;

  if (transaction.businessType === "account_transfer" || transaction.type === "transfer") {
    const isSource = transaction.accountId === account.id;
    if (account.direction === "asset") return isSource ? -transaction.amount : transaction.amount;
    return isSource ? transaction.amount : -transaction.amount;
  }

  if (transaction.businessType === "debt_repayment" || transaction.type === "repayment") {
    return -transaction.amount;
  }

  return accountTransactionDelta(account, transaction.type, transaction.amount);
}
