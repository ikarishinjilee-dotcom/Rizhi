import {
  mutateJsonDb,
  nowIso,
  readJsonDb,
  type AccountFlowRecord,
  type MoneyAccountRecord,
  type RizhiData,
  type TransactionRecord,
} from "../db/sqliteStore.ts";
import { HttpError } from "../errors.ts";

export async function listAccounts(): Promise<MoneyAccountRecord[]> {
  const data = await readJsonDb();
  return data.accounts ?? [];
}

export type ListAccountFlowsInput = {
  accountId: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export type PaginatedAccountFlows = {
  flows: AccountFlowRecord[];
  page: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export async function listAccountFlows(input: ListAccountFlowsInput): Promise<PaginatedAccountFlows> {
  const data = await readJsonDb();
  const account = data.accounts?.find((item) => item.id === input.accountId);
  if (!account) throw new HttpError(404, "ACCOUNT_NOT_FOUND", "账户不存在");

  const filtered = (data.accountFlows ?? [])
    .filter((flow) => flow.accountId === input.accountId)
    .filter((flow) => !input.dateFrom || flow.occurredAt.slice(0, 10) >= input.dateFrom!)
    .filter((flow) => !input.dateTo || flow.occurredAt.slice(0, 10) <= input.dateTo!)
    .sort((left, right) => String(right.occurredAt).localeCompare(String(left.occurredAt)));
  const start = (input.page - 1) * input.pageSize;

  return {
    flows: filtered.slice(start, start + input.pageSize),
    page: {
      page: input.page,
      pageSize: input.pageSize,
      total: filtered.length,
    },
  };
}

export async function createAccount(input: Record<string, unknown>): Promise<MoneyAccountRecord> {
  const name = requiredString(input.name, "账户名称不能为空");
  const type = requiredString(input.type, "账户类型不能为空");
  const direction = accountDirection(input.direction);
  const balance = optionalNumber(input.balance) ?? 0;
  return mutateJsonDb((data) => {
    const timestamp = nowIso();
    const account: MoneyAccountRecord = {
      ...input,
      id: createId("acc"),
      name: name.trim(),
      type,
      direction,
      balance,
      enabled: typeof input.enabled === "boolean" ? input.enabled : true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.accounts.push(account);
    return account;
  });
}

export async function updateAccount(accountId: string, input: Record<string, unknown>): Promise<MoneyAccountRecord> {
  return mutateJsonDb((data) => {
    const account = requireAccount(data, accountId, "账户不存在");
    const patch = Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== "id" && value !== undefined));
    if ("name" in patch) patch.name = requiredString(patch.name, "账户名称不能为空").trim();
    if ("direction" in patch) patch.direction = accountDirection(patch.direction);
    if ("balance" in patch) patch.balance = optionalNumber(patch.balance);
    Object.assign(account, patch, { updatedAt: nowIso() });
    return account;
  });
}

export async function deleteAccount(accountId: string) {
  return mutateJsonDb((data) => {
    requireAccount(data, accountId, "账户不存在");
    const flowCount = (data.accountFlows ?? []).filter((flow) => flow.accountId === accountId).length;
    if (flowCount > 0) throw new HttpError(409, "ACCOUNT_HAS_FLOWS", `该账户已有 ${flowCount} 条资金流水，不能删除`);
    data.accounts = data.accounts.filter((account) => account.id !== accountId);
    return { deleted: true };
  });
}

export async function transferFunds(input: Record<string, unknown>): Promise<TransactionRecord> {
  const fromAccountId = requiredString(input.fromAccountId, "转出账户不能为空");
  const toAccountId = requiredString(input.toAccountId, "转入账户不能为空");
  const amount = positiveNumber(input.amount);
  const occurredAt = requiredString(input.occurredAt, "转账时间不能为空");
  if (fromAccountId === toAccountId) throw new HttpError(400, "VALIDATION_ERROR", "转出和转入账户不能相同");

  return mutateJsonDb((data) => {
    const from = requireAccount(data, fromAccountId, "转出账户不存在");
    const to = requireAccount(data, toAccountId, "转入账户不存在");
    const timestamp = nowIso();
    const transaction = makeTransaction(data, {
      id: createId("tx"),
      type: "transfer",
      businessType: "account_transfer",
      categoryId: "tx-transfer",
      amount,
      occurredAt,
      accountId: from.id,
      relatedAccountId: to.id,
      note: optionalString(input.note),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const fromBalance = from.direction === "asset" ? from.balance - amount : from.balance + amount;
    const toBalance = to.direction === "asset" ? to.balance + amount : to.balance - amount;
    data.transactions ??= [];
    data.accountFlows ??= [];
    data.transactions.push(transaction);
    data.accountFlows.push({ ...createFlow(from, transaction, fromBalance), direction: "out" });
    data.accountFlows.push({ ...createFlow(to, transaction, toBalance), direction: "in" });
    from.balance = fromBalance;
    to.balance = toBalance;
    from.updatedAt = timestamp;
    to.updatedAt = timestamp;
    return transaction;
  });
}

export async function repayDebt(input: Record<string, unknown>): Promise<TransactionRecord> {
  const fromAccountId = requiredString(input.fromAccountId, "还款账户不能为空");
  const liabilityAccountId = requiredString(input.liabilityAccountId, "负债账户不能为空");
  const amount = positiveNumber(input.amount);
  const occurredAt = requiredString(input.occurredAt, "还款时间不能为空");
  if (fromAccountId === liabilityAccountId) throw new HttpError(400, "VALIDATION_ERROR", "还款账户和负债账户不能相同");

  return mutateJsonDb((data) => {
    const from = requireAccount(data, fromAccountId, "还款账户不存在");
    const liability = requireAccount(data, liabilityAccountId, "负债账户不存在");
    if (from.direction !== "asset") throw new HttpError(400, "ACCOUNT_DIRECTION_INVALID", "还款账户必须是资产账户");
    if (liability.direction !== "liability") throw new HttpError(400, "ACCOUNT_DIRECTION_INVALID", "被还款账户必须是负债账户");
    if (amount > liability.balance) throw new HttpError(400, "VALIDATION_ERROR", "还款金额不能大于当前欠款");
    const timestamp = nowIso();
    const transaction = makeTransaction(data, {
      id: createId("tx"),
      type: "repayment",
      businessType: "debt_repayment",
      categoryId: "tx-repayment",
      amount,
      occurredAt,
      accountId: from.id,
      relatedAccountId: liability.id,
      note: optionalString(input.note) ?? `${liability.name} 还款`,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const fromBalance = from.balance - amount;
    const liabilityBalance = liability.balance - amount;
    data.transactions ??= [];
    data.accountFlows ??= [];
    data.transactions.push(transaction);
    data.accountFlows.push({ ...createFlow(from, transaction, fromBalance), direction: "out" });
    data.accountFlows.push({ ...createFlow(liability, transaction, liabilityBalance), direction: "in" });
    from.balance = fromBalance;
    liability.balance = liabilityBalance;
    from.updatedAt = timestamp;
    liability.updatedAt = timestamp;
    return transaction;
  });
}

function makeTransaction(data: RizhiData, transaction: TransactionRecord): TransactionRecord {
  const category = (data.categories ?? []).find((item) => item.id === transaction.categoryId);
  return { ...transaction, categorySnapshot: category ? { categoryName: category.name } : undefined };
}

function createFlow(account: MoneyAccountRecord, transaction: TransactionRecord, balanceAfter: number): AccountFlowRecord {
  return {
    id: createId("flow"),
    accountId: account.id,
    transactionId: transaction.id,
    direction: balanceAfter >= account.balance ? "in" : "out",
    amount: positiveNumber(transaction.amount),
    occurredAt: requiredString(transaction.occurredAt, "交易时间不能为空"),
    balanceAfter,
    note: optionalString(transaction.note),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function requireAccount(data: RizhiData, id: string, message: string) {
  const account = data.accounts.find((item) => item.id === id);
  if (!account) throw new HttpError(404, "ACCOUNT_NOT_FOUND", message);
  return account;
}

function accountDirection(value: unknown): "asset" | "liability" {
  if (value !== "asset" && value !== "liability") throw new HttpError(400, "VALIDATION_ERROR", "账户方向不合法");
  return value;
}

function requiredString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, "VALIDATION_ERROR", message);
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function optionalNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new HttpError(400, "VALIDATION_ERROR", "数值不合法");
  return value;
}

function positiveNumber(value: unknown) {
  const number = optionalNumber(value);
  if (number === undefined || number <= 0) throw new HttpError(400, "VALIDATION_ERROR", "金额必须大于 0");
  return number;
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}
