import { rizhiDb } from "@/db/rizhiDb";
import { accountFlowDelta } from "@/domain/accountCalculations";
import { categoryHasScope, transactionTypeToScope } from "@/domain/categoryScopes";
import type {
  AccountFlowRecord,
  AssetAttachmentRecord,
  AssetAddonRecord,
  AssetPartEventRecord,
  AssetRecord,
  CurrencyCode,
  CurrentValueSource,
  ID,
  MoneyAccountRecord,
  PurchaseChannel,
  TransactionBusinessType,
  TransactionRecord,
  TransactionType,
} from "@/domain/models";

export type CreateAssetInput = {
  name: string;
  brand?: string;
  model?: string;
  categoryId: ID;
  originalCost: number;
  currency?: CurrencyCode;
  purchaseDate: string;
  firstUseDate?: string;
  lastUsedAt?: string;
  idleSince?: string;
  purchaseChannel?: PurchaseChannel;
  merchant?: string;
  orderNo?: string;
  paymentAccountId?: ID;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  expectedUseDays?: number;
  notes?: string;
  currentValue?: number;
  currentValueUpdatedAt?: string;
  currentValueSource?: CurrentValueSource;
  attachments?: AssetAttachmentRecord[];
  imageUrl?: string;
  imageUrls?: string[];
};

export type UpdateAssetInput = Partial<CreateAssetInput> & {
  id: ID;
  currentValue?: number;
  status?: AssetRecord["status"];
};

export type CreateAddonInput = {
  assetId: ID;
  name: string;
  direction?: AssetAddonRecord["direction"];
  type: AssetAddonRecord["type"];
  amount: number;
  currency?: CurrencyCode;
  purchaseDate: string;
  merchant?: string;
  paymentAccountId?: ID;
  includedInCost: boolean;
  notes?: string;
  attachments?: AssetAttachmentRecord[];
  imageUrl?: string;
  imageUrls?: string[];
};

export type UpdateAddonInput = Omit<CreateAddonInput, "assetId"> & {
  id: ID;
};

export type CreateTransactionInput = {
  type: Exclude<TransactionType, "transfer" | "asset_purchase">;
  categoryId: ID;
  subCategoryId?: ID;
  businessType?: TransactionBusinessType;
  amount: number;
  occurredAt: string;
  accountId?: ID;
  assetId?: ID;
  addonId?: ID;
  merchant?: string;
  note?: string;
  receiptUrl?: string;
};

export type UpdateTransactionInput = CreateTransactionInput & {
  id: ID;
};

export type ConvertTransactionToAddonInput = {
  id: ID;
  amount: number;
  occurredAt: string;
  accountId: ID;
  assetId: ID;
  addonType: AssetAddonRecord["type"];
  includedInCost: boolean;
  merchant?: string;
  note?: string;
};

export type CreateAssetPartEventInput = {
  assetId: ID;
  name: string;
  type: AssetPartEventRecord["type"];
  estimatedOriginalCost?: number;
  amount?: number;
  occurredAt: string;
  accountId?: ID;
  currentValueAdjustment?: number;
  notes?: string;
};

export type TransferInput = {
  fromAccountId: ID;
  toAccountId: ID;
  amount: number;
  occurredAt: string;
  note?: string;
};

export type RepayDebtInput = {
  fromAccountId: ID;
  liabilityAccountId: ID;
  amount: number;
  occurredAt: string;
  note?: string;
};

export type TransferAssetInput = {
  assetId: ID;
  amount: number;
  occurredAt: string;
  accountId: ID;
  note?: string;
};

export type CreateAccountInput = {
  name: string;
  type: MoneyAccountRecord["type"];
  direction: MoneyAccountRecord["direction"];
  balance: number;
  includeInTotalAssets?: boolean;
  institution?: string;
  bankName?: string;
  bankId?: ID;
  creditLimit?: number;
  billDay?: number;
  repaymentDay?: number;
  color?: string;
  icon?: string;
  note?: string;
  enabled?: boolean;
};

export type UpdateAccountInput = Partial<CreateAccountInput> & {
  id: ID;
};

function createId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function nowIso() {
  return new Date().toISOString();
}

function dateWithReferenceTimeIso(date: string, reference = new Date()) {
  const [year, month, day] = date.split("-").map(Number);
  const time = Number.isNaN(reference.getTime()) ? new Date() : reference;
  return new Date(
    year,
    month - 1,
    day,
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds(),
  ).toISOString();
}

function assetSnapshot(asset: Pick<AssetRecord, "id" | "name">): NonNullable<TransactionRecord["assetSnapshot"]> {
  return { id: asset.id, name: asset.name };
}

function addonTypeToTransactionCategory(type: AssetAddonRecord["type"]): ID {
  return (
    {
      accessory: "tx-asset-addon-accessory",
      repair: "tx-asset-addon-repair",
      maintenance: "tx-asset-addon-maintenance",
      upgrade: "tx-asset-addon-upgrade",
      consumable: "tx-asset-addon-consumable",
      other: "tx-asset-addon-other",
    } satisfies Record<AssetAddonRecord["type"], ID>
  )[type];
}

function addonTransactionCategory(direction: AssetAddonRecord["direction"], type: AssetAddonRecord["type"]): ID {
  return direction === "income" ? "tx-asset-addon-income" : addonTypeToTransactionCategory(type);
}

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("金额必须大于 0");
  }
}

function hasOwn<T extends object>(source: T, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function normalizeImageUrls(imageUrls?: string[]) {
  if (!imageUrls?.length) return undefined;
  return Array.from(imageUrls)
    .filter((url): url is string => typeof url === "string" && Boolean(url))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function normalizeImageUrl(imageUrl?: string, imageUrls?: string[]) {
  return imageUrl || normalizeImageUrls(imageUrls)?.[0];
}

function normalizeAttachments(attachments?: AssetAttachmentRecord[]) {
  if (!attachments?.length) return undefined;
  return attachments
    .filter((attachment) => Boolean(attachment.url))
    .map((attachment, index) => ({
      ...attachment,
      id: attachment.id || createId("att"),
      sort: Number.isFinite(attachment.sort) ? attachment.sort : index + 1,
      createdAt: attachment.createdAt || nowIso(),
    }));
}

function imageUrlsToAttachments(
  imageUrl?: string,
  imageUrls?: string[],
  existing?: AssetAttachmentRecord[],
  namePrefix = "资产图片",
) {
  const normalized = normalizeImageUrls([imageUrl, ...(imageUrls ?? [])].filter((url): url is string => Boolean(url))) ?? [];
  const existingNonImages = existing?.filter((attachment) => attachment.type !== "asset_image") ?? [];
  const imageAttachments = normalized.map((url, index): AssetAttachmentRecord => ({
    id: existing?.find((attachment) => attachment.url === url)?.id ?? createId("att"),
    type: "asset_image",
    name: index === 0 ? `${namePrefix}主图` : `${namePrefix} ${index + 1}`,
    url,
    sort: index + 1,
    isCover: url === normalizeImageUrl(imageUrl, imageUrls) || (!imageUrl && index === 0),
    createdAt: existing?.find((attachment) => attachment.url === url)?.createdAt ?? nowIso(),
  }));
  return normalizeAttachments([...imageAttachments, ...existingNonImages]);
}

function isLockedAssetStatus(status: AssetRecord["status"]) {
  return status === "transferred" || status === "disposed";
}

function assertAssetCanReceiveAddon(asset: AssetRecord) {
  if (isLockedAssetStatus(asset.status)) {
    throw new Error("当前资产已结束，不能新增或编辑附加项");
  }
}

function assertAssetCanTransfer(asset: AssetRecord) {
  if (asset.status === "transferred") {
    throw new Error("当前资产已转让，不能重复转让");
  }
  if (asset.status === "disposed") {
    throw new Error("当前资产已处置，不能转让");
  }
}

function assertManualTransactionEditable(transaction: TransactionRecord) {
  if (transaction.type === "asset_purchase" || transaction.categoryId === "tx-asset-purchase") {
    throw new Error("资产购买流水请在资产详情中维护，不能在记账页直接编辑或删除");
  }
  if (transaction.categoryId === "tx-asset-transfer") {
    throw new Error("资产转让收入请在资产详情中撤销，不能在记账页直接编辑或删除");
  }
  if (transaction.addonId) {
    throw new Error("附加项流水请在资产详情中维护，不能在记账页直接编辑或删除");
  }
  if (transaction.partEventId) {
    throw new Error("资产部件变动流水请在资产详情中维护，不能在记账页直接编辑或删除");
  }
}

function accountDelta(account: MoneyAccountRecord, type: TransactionType, amount: number) {
  if (account.direction === "asset") {
    return type === "income" || type === "refund" ? amount : -amount;
  }

  return type === "income" || type === "refund" || type === "repayment" ? -amount : amount;
}

function applyAccountDelta(account: MoneyAccountRecord, type: TransactionType, amount: number) {
  return account.balance + accountDelta(account, type, amount);
}

async function transactionCategorySnapshot(categoryId: ID, subCategoryId?: ID): Promise<TransactionRecord["categorySnapshot"]> {
  const category = await rizhiDb.categories.get(categoryId);
  const subCategory = subCategoryId ? await rizhiDb.categories.get(subCategoryId) : undefined;

  if (!category && !subCategory) return undefined;
  if (category?.parentId && !subCategory) {
    const parent = await rizhiDb.categories.get(category.parentId);
    return {
      categoryName: parent?.name ?? category.name,
      subCategoryName: parent ? category.name : undefined,
    };
  }

  return {
    categoryName: category?.name ?? "未分类",
    subCategoryName: subCategory?.name,
  };
}

async function assertUsableTransactionCategory(categoryId: ID, type: TransactionType, subCategoryId?: ID) {
  const category = await rizhiDb.categories.get(categoryId);
  if (!category) throw new Error("交易分类不存在");
  if (category.deletedAt || category.enabled === false) throw new Error("该分类已停用");
  const scope = transactionTypeToScope(type);
  if (scope && !categoryHasScope(category, scope)) {
    throw new Error(scope === "expense" ? "请选择支出分类" : "请选择收入分类");
  }

  if (!subCategoryId) return;
  const subCategory = await rizhiDb.categories.get(subCategoryId);
  if (!subCategory) throw new Error("交易子分类不存在");
  if (subCategory.deletedAt || subCategory.enabled === false) throw new Error("该子分类已停用");
  if (subCategory.parentId !== categoryId) throw new Error("子分类不属于当前一级分类");
  if (scope && !categoryHasScope(subCategory, scope)) throw new Error("子分类用途和一级分类不一致");
}

async function withTransactionCategoryMeta<T extends Pick<TransactionRecord, "categoryId" | "type"> & Partial<Pick<TransactionRecord, "subCategoryId" | "businessType" | "categorySnapshot">>>(
  transaction: T,
  shouldValidate = false,
): Promise<T & Pick<TransactionRecord, "businessType" | "categorySnapshot">> {
  if (shouldValidate) {
    await assertUsableTransactionCategory(transaction.categoryId, transaction.type, transaction.subCategoryId);
  }
  return {
    ...transaction,
    businessType: transaction.businessType ?? "normal",
    categorySnapshot: await transactionCategorySnapshot(transaction.categoryId, transaction.subCategoryId),
  };
}

async function createFlow(account: MoneyAccountRecord, transaction: TransactionRecord, balanceAfter: number): Promise<AccountFlowRecord> {
  return {
    id: createId("flow"),
    accountId: account.id,
    transactionId: transaction.id,
    direction: balanceAfter >= account.balance ? "in" : "out",
    amount: transaction.amount,
    occurredAt: transaction.occurredAt,
    balanceAfter,
    note: transaction.note,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

async function recalculateAccountFlowBalances(accountIds: Iterable<ID>) {
  const ids = [...new Set(accountIds)];
  const timestamp = nowIso();

  for (const accountId of ids) {
    const account = await rizhiDb.accounts.get(accountId);
    if (!account) continue;

    const flows = await rizhiDb.accountFlows.where("accountId").equals(accountId).toArray();
    flows.sort((left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id));
    if (!flows.length) continue;

    const transactions = await rizhiDb.transactions.bulkGet(flows.map((flow) => flow.transactionId));
    const deltas = flows.map((flow, index) => accountFlowDelta(account, transactions[index], flow));
    let runningBalance = account.balance - deltas.reduce((sum, delta) => sum + delta, 0);

    await rizhiDb.accountFlows.bulkPut(flows.map((flow, index) => {
      const delta = deltas[index];
      runningBalance += delta;
      return {
        ...flow,
        balanceAfter: runningBalance,
        updatedAt: timestamp,
      };
    }));
  }
}

export async function upgradeLegacyMidnightTransactionTimes() {
  return rizhiDb.transaction("rw", [rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows], async () => {
    const candidates = (await rizhiDb.transactions.toArray()).filter((transaction) => {
      if (!["asset_purchase", "asset_addon", "asset_transfer"].includes(transaction.businessType ?? "")) return false;
      const occurredAt = new Date(transaction.occurredAt);
      return occurredAt.getHours() === 0 &&
        occurredAt.getMinutes() === 0 &&
        occurredAt.getSeconds() === 0;
    });
    if (!candidates.length) return 0;

    const affectedAccountIds = new Set<ID>();
    for (const transaction of candidates) {
      const occurred = new Date(transaction.occurredAt);
      const localDate = `${occurred.getFullYear()}-${String(occurred.getMonth() + 1).padStart(2, "0")}-${String(occurred.getDate()).padStart(2, "0")}`;
      const upgradedOccurredAt = dateWithReferenceTimeIso(localDate, new Date(transaction.createdAt));
      await rizhiDb.transactions.put({ ...transaction, occurredAt: upgradedOccurredAt, updatedAt: nowIso() });
      const flows = await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).toArray();
      if (flows.length) {
        await rizhiDb.accountFlows.bulkPut(flows.map((flow) => ({
          ...flow,
          occurredAt: upgradedOccurredAt,
          updatedAt: nowIso(),
        })));
      }
      if (transaction.accountId) affectedAccountIds.add(transaction.accountId);
      if (transaction.relatedAccountId) affectedAccountIds.add(transaction.relatedAccountId);
    }

    await recalculateAccountFlowBalances(affectedAccountIds);
    return candidates.length;
  });
}

export async function createTransaction(input: CreateTransactionInput) {
  assertPositiveAmount(input.amount);

  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const account = input.accountId ? await rizhiDb.accounts.get(input.accountId) : undefined;
    if (input.accountId && !account) throw new Error("账户不存在");
    const linkedAsset = input.assetId ? await rizhiDb.assets.get(input.assetId) : undefined;

    const timestamp = nowIso();
    const transaction: TransactionRecord = await withTransactionCategoryMeta({
      id: createId("tx"),
      type: input.type,
      categoryId: input.categoryId,
      subCategoryId: input.subCategoryId,
      businessType: input.businessType,
      amount: input.amount,
      occurredAt: input.occurredAt,
      accountId: input.accountId,
      assetId: input.assetId,
      assetSnapshot: linkedAsset ? assetSnapshot(linkedAsset) : undefined,
      addonId: input.addonId,
      merchant: input.merchant,
      note: input.note,
      receiptUrl: input.receiptUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
    }, true);

    await rizhiDb.transactions.put(transaction);
    if (account) {
      const balanceAfter = applyAccountDelta(account, input.type, input.amount);
      const flow = await createFlow(account, transaction, balanceAfter);
      await rizhiDb.accounts.put({ ...account, balance: balanceAfter, updatedAt: timestamp });
      await rizhiDb.accountFlows.put(flow);
      await recalculateAccountFlowBalances([account.id]);
    }

    return transaction;
  });
}

export async function updateTransaction(input: UpdateTransactionInput) {
  assertPositiveAmount(input.amount);

  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const oldTransaction = await rizhiDb.transactions.get(input.id);
    if (!oldTransaction) throw new Error("交易记录不存在");
    if (oldTransaction.businessType === "account_transfer" || oldTransaction.type === "transfer") {
      throw new Error("账户转账会同时影响两个账户，不能作为普通账单编辑；请撤销后重新转账");
    }
    assertManualTransactionEditable(oldTransaction);

    const oldAccount = oldTransaction.accountId ? await rizhiDb.accounts.get(oldTransaction.accountId) : undefined;
    const newAccount = input.accountId ? await rizhiDb.accounts.get(input.accountId) : undefined;
    if ((oldTransaction.accountId && !oldAccount) || (input.accountId && !newAccount)) throw new Error("账户不存在");
    const linkedAsset = input.assetId ? await rizhiDb.assets.get(input.assetId) : undefined;

    const timestamp = nowIso();
    const updatedTransaction: TransactionRecord = await withTransactionCategoryMeta({
      ...oldTransaction,
      type: input.type,
      categoryId: input.categoryId,
      subCategoryId: input.subCategoryId,
      businessType: input.businessType ?? oldTransaction.businessType ?? "normal",
      amount: input.amount,
      occurredAt: input.occurredAt,
      accountId: input.accountId,
      assetId: input.assetId,
      assetSnapshot: linkedAsset ? assetSnapshot(linkedAsset) : oldTransaction.assetSnapshot,
      addonId: input.addonId,
        merchant: input.merchant,
        note: input.note,
        receiptUrl: input.receiptUrl,
      updatedAt: timestamp,
    }, true);

    await rizhiDb.accountFlows.where("transactionId").equals(input.id).delete();
    if (oldAccount && newAccount && oldAccount.id === newAccount.id) {
      const oldDelta = accountDelta(oldAccount, oldTransaction.type, oldTransaction.amount);
      const newDelta = accountDelta(newAccount, input.type, input.amount);
      const balance = oldAccount.balance - oldDelta + newDelta;
      await rizhiDb.accounts.put({ ...oldAccount, balance, updatedAt: timestamp });
      await rizhiDb.accountFlows.put({
        id: createId("flow"),
        accountId: oldAccount.id,
        transactionId: input.id,
        direction: newDelta >= 0 ? "in" : "out",
        amount: input.amount,
        occurredAt: input.occurredAt,
        balanceAfter: balance,
        note: input.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } else if (oldAccount && newAccount) {
      const oldDelta = accountDelta(oldAccount, oldTransaction.type, oldTransaction.amount);
      const newDelta = accountDelta(newAccount, input.type, input.amount);
      const oldBalance = oldAccount.balance - oldDelta;
      const newBalance = newAccount.balance + newDelta;
      await rizhiDb.accounts.bulkPut([
        { ...oldAccount, balance: oldBalance, updatedAt: timestamp },
        { ...newAccount, balance: newBalance, updatedAt: timestamp },
      ]);
      await rizhiDb.accountFlows.put({
        id: createId("flow"),
        accountId: newAccount.id,
        transactionId: input.id,
        direction: newDelta >= 0 ? "in" : "out",
        amount: input.amount,
        occurredAt: input.occurredAt,
        balanceAfter: newBalance,
        note: input.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } else if (oldAccount) {
      const oldDelta = accountDelta(oldAccount, oldTransaction.type, oldTransaction.amount);
      await rizhiDb.accounts.put({ ...oldAccount, balance: oldAccount.balance - oldDelta, updatedAt: timestamp });
    } else if (newAccount) {
      const newDelta = accountDelta(newAccount, input.type, input.amount);
      const balance = newAccount.balance + newDelta;
      await rizhiDb.accounts.put({ ...newAccount, balance, updatedAt: timestamp });
      await rizhiDb.accountFlows.put({
        id: createId("flow"), accountId: newAccount.id, transactionId: input.id,
        direction: newDelta >= 0 ? "in" : "out", amount: input.amount,
        occurredAt: input.occurredAt, balanceAfter: balance, note: input.note,
        createdAt: timestamp, updatedAt: timestamp,
      });
    }

    await rizhiDb.transactions.put(updatedTransaction);
    await recalculateAccountFlowBalances([oldAccount?.id, newAccount?.id].filter(Boolean) as ID[]);
    return updatedTransaction;
  });
}

export async function convertTransactionToAssetAddon(input: ConvertTransactionToAddonInput) {
  assertPositiveAmount(input.amount);

  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.assetAddons, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const oldTransaction = await rizhiDb.transactions.get(input.id);
    if (!oldTransaction) throw new Error("交易记录不存在");
    assertManualTransactionEditable(oldTransaction);

    const asset = await rizhiDb.assets.get(input.assetId);
    if (!asset) throw new Error("资产不存在");
    assertAssetCanReceiveAddon(asset);

    const oldAccount = await rizhiDb.accounts.get(oldTransaction.accountId!);
    const newAccount = await rizhiDb.accounts.get(input.accountId);
    if (!oldAccount || !newAccount) throw new Error("账户不存在");

    const timestamp = nowIso();
    const addonId = createId("addon");
    const addonName = input.merchant?.trim() || input.note?.trim() || "资产附加项";
    const updatedTransaction: TransactionRecord = await withTransactionCategoryMeta({
      ...oldTransaction,
      type: "expense",
      categoryId: addonTypeToTransactionCategory(input.addonType),
      businessType: "asset_addon",
      amount: input.amount,
      occurredAt: input.occurredAt,
      accountId: input.accountId,
      assetId: input.assetId,
      assetSnapshot: assetSnapshot(asset),
      addonId,
      merchant: input.merchant,
      note: input.note,
      updatedAt: timestamp,
    });
    const addon: AssetAddonRecord = {
      id: addonId,
      assetId: input.assetId,
      name: addonName,
      direction: "expense",
      type: input.addonType,
      amount: input.amount,
      currency: asset.currency,
      purchaseDate: input.occurredAt.slice(0, 10),
      merchant: input.merchant,
      paymentAccountId: input.accountId,
      transactionId: input.id,
      includedInCost: input.includedInCost,
      notes: input.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const oldDelta = accountDelta(oldAccount, oldTransaction.type, oldTransaction.amount);
    const newDelta = accountDelta(newAccount, updatedTransaction.type, updatedTransaction.amount);

    await rizhiDb.accountFlows.where("transactionId").equals(input.id).delete();

    if (oldAccount.id === newAccount.id) {
      const balance = oldAccount.balance - oldDelta + newDelta;
      await rizhiDb.accounts.put({ ...oldAccount, balance, updatedAt: timestamp });
      await rizhiDb.accountFlows.put({
        id: createId("flow"),
        accountId: oldAccount.id,
        transactionId: input.id,
        direction: newDelta >= 0 ? "in" : "out",
        amount: input.amount,
        occurredAt: input.occurredAt,
        balanceAfter: balance,
        note: input.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } else {
      const oldBalance = oldAccount.balance - oldDelta;
      const newBalance = newAccount.balance + newDelta;
      await rizhiDb.accounts.bulkPut([
        { ...oldAccount, balance: oldBalance, updatedAt: timestamp },
        { ...newAccount, balance: newBalance, updatedAt: timestamp },
      ]);
      await rizhiDb.accountFlows.put({
        id: createId("flow"),
        accountId: newAccount.id,
        transactionId: input.id,
        direction: newDelta >= 0 ? "in" : "out",
        amount: input.amount,
        occurredAt: input.occurredAt,
        balanceAfter: newBalance,
        note: input.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await rizhiDb.assetAddons.put(addon);
    await rizhiDb.transactions.put(updatedTransaction);
    await rizhiDb.assets.put({ ...asset, updatedAt: timestamp });
    await recalculateAccountFlowBalances([oldAccount.id, newAccount.id]);

    return { addon, transaction: updatedTransaction };
  });
}

export async function deleteTransaction(id: ID) {
  return rizhiDb.transaction("rw", rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, async () => {
    const transaction = await rizhiDb.transactions.get(id);
    if (!transaction) throw new Error("交易记录不存在");

    const account = transaction.accountId ? await rizhiDb.accounts.get(transaction.accountId) : undefined;
    if (transaction.accountId && !account) throw new Error("账户不存在");

    const timestamp = nowIso();
    if (transaction.businessType === "balance_adjustment") {
      if (!account || !transaction.accountId) throw new Error("余额调整缺少账户");
      const latestAdjustment = await rizhiDb.transactions
        .where("accountId")
        .equals(transaction.accountId)
        .and((item) => item.businessType === "balance_adjustment")
        .sortBy("occurredAt")
        .then((items) => items[items.length - 1]);
      if (latestAdjustment?.id !== transaction.id) {
        throw new Error("只能撤销该账户最近一次余额调整");
      }

      const adjustmentDelta = accountDelta(account, transaction.type, transaction.amount);
      const restoredBalance = account.balance - adjustmentDelta;
      await rizhiDb.accounts.put({ ...account, balance: restoredBalance, updatedAt: timestamp });
      await rizhiDb.accountFlows.where("transactionId").equals(id).delete();
      await rizhiDb.transactions.delete(id);
      await recalculateAccountFlowBalances([account.id]);
      return;
    }

    if (transaction.businessType === "account_transfer" || transaction.type === "transfer") {
      if (!account) throw new Error("转账记录缺少转出账户");
      if (!transaction.relatedAccountId) throw new Error("转账记录缺少转入账户");
      const targetAccount = await rizhiDb.accounts.get(transaction.relatedAccountId);
      if (!targetAccount) throw new Error("转入账户不存在");

      const sourceBalance = account.direction === "asset"
        ? account.balance + transaction.amount
        : account.balance - transaction.amount;
      const targetBalance = targetAccount.direction === "asset"
        ? targetAccount.balance - transaction.amount
        : targetAccount.balance + transaction.amount;

      await rizhiDb.accounts.bulkPut([
        { ...account, balance: sourceBalance, updatedAt: timestamp },
        { ...targetAccount, balance: targetBalance, updatedAt: timestamp },
      ]);
      await rizhiDb.accountFlows.where("transactionId").equals(id).delete();
      await rizhiDb.transactions.delete(id);
      await recalculateAccountFlowBalances([account.id, targetAccount.id]);
      return;
    }

    assertManualTransactionEditable(transaction);

    if (transaction.businessType === "debt_repayment" || transaction.type === "repayment") {
      if (!account) throw new Error("还款记录缺少付款账户");
      if (!transaction.relatedAccountId) throw new Error("还款记录缺少负债账户");
      const liabilityAccount = await rizhiDb.accounts.get(transaction.relatedAccountId);
      if (!liabilityAccount) throw new Error("负债账户不存在");
      if (account.direction !== "asset" || liabilityAccount.direction !== "liability") throw new Error("还款账户类型异常");

      await rizhiDb.accounts.bulkPut([
        { ...account, balance: account.balance + transaction.amount, updatedAt: timestamp },
        { ...liabilityAccount, balance: liabilityAccount.balance + transaction.amount, updatedAt: timestamp },
      ]);
      await rizhiDb.accountFlows.where("transactionId").equals(id).delete();
      await rizhiDb.transactions.delete(id);
      await recalculateAccountFlowBalances([account.id, liabilityAccount.id]);
      return;
    }

    if (account) {
      const balance = account.balance - accountDelta(account, transaction.type, transaction.amount);
      await rizhiDb.accounts.put({ ...account, balance, updatedAt: timestamp });
    }
    await rizhiDb.accountFlows.where("transactionId").equals(id).delete();
    await rizhiDb.transactions.delete(id);
    if (account) await recalculateAccountFlowBalances([account.id]);
  });
}

export async function createMoneyAccount(input: CreateAccountInput) {
  if (!input.name.trim()) throw new Error("账户名称不能为空");
  if (!Number.isFinite(input.balance)) throw new Error("账户金额不正确");

  const timestamp = nowIso();
  const account: MoneyAccountRecord = {
    id: createId("account"),
    name: input.name.trim(),
    type: input.type,
    direction: input.direction,
    balance: input.balance,
    includeInTotalAssets: input.includeInTotalAssets !== false,
    institution: input.institution?.trim() || undefined,
    bankName: input.bankName?.trim() || undefined,
    bankId: input.bankId,
    creditLimit: input.creditLimit,
    billDay: input.billDay,
    repaymentDay: input.repaymentDay,
    color: input.color,
    icon: input.icon,
    note: input.note,
    enabled: input.enabled ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await rizhiDb.accounts.put(account);
  return account;
}

export async function updateMoneyAccount(input: UpdateAccountInput) {
  return rizhiDb.transaction("rw", rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, async () => {
    const account = await rizhiDb.accounts.get(input.id);
    if (!account) throw new Error("账户不存在");
    if (input.name !== undefined && !input.name.trim()) throw new Error("账户名称不能为空");
    if (input.balance !== undefined && (!Number.isFinite(input.balance) || input.balance < 0)) throw new Error("账户金额不正确");

    const flowCount = await rizhiDb.accountFlows.where("accountId").equals(input.id).count();
    if (input.direction && input.direction !== account.direction && flowCount > 0) {
      throw new Error("已有资金流水的账户不能切换资产/负债方向");
    }

    const timestamp = nowIso();
    const nextBalance = input.balance ?? account.balance;
    const balanceDifference = nextBalance - account.balance;
    const updated: MoneyAccountRecord = {
      ...account,
      name: input.name?.trim() ?? account.name,
      type: input.type ?? account.type,
      direction: input.direction ?? account.direction,
      balance: nextBalance,
      includeInTotalAssets: "includeInTotalAssets" in input ? input.includeInTotalAssets !== false : account.includeInTotalAssets !== false,
      institution: "institution" in input ? input.institution?.trim() || undefined : account.institution,
      bankName: "bankName" in input ? input.bankName?.trim() || undefined : account.bankName,
      bankId: "bankId" in input ? input.bankId : account.bankId,
      creditLimit: "creditLimit" in input ? input.creditLimit : account.creditLimit,
      billDay: "billDay" in input ? input.billDay : account.billDay,
      repaymentDay: "repaymentDay" in input ? input.repaymentDay : account.repaymentDay,
      color: input.color ?? account.color,
      icon: input.icon ?? account.icon,
      note: "note" in input ? input.note : account.note,
      enabled: input.enabled ?? account.enabled ?? true,
      updatedAt: timestamp,
    };

    if (balanceDifference !== 0) {
      const increasesBalance = balanceDifference > 0;
      const adjustmentType: TransactionType = updated.direction === "asset"
        ? increasesBalance ? "income" : "expense"
        : increasesBalance ? "expense" : "income";
      const amount = Math.abs(balanceDifference);
      const transaction: TransactionRecord = {
        id: createId("tx"),
        type: adjustmentType,
        categoryId: "tx-balance-adjustment",
        businessType: "balance_adjustment",
        categorySnapshot: { categoryName: "余额调整" },
        amount,
        occurredAt: timestamp,
        accountId: account.id,
        merchant: "账户余额调整",
        note: `账户余额由 ${account.balance.toFixed(2)} 调整为 ${nextBalance.toFixed(2)}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const flow: AccountFlowRecord = {
        id: createId("flow"),
        accountId: account.id,
        transactionId: transaction.id,
        direction: increasesBalance ? "in" : "out",
        amount,
        occurredAt: timestamp,
        balanceAfter: nextBalance,
        note: transaction.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await rizhiDb.transactions.put(transaction);
      await rizhiDb.accountFlows.put(flow);
    }

    await rizhiDb.accounts.put(updated);
    await recalculateAccountFlowBalances([account.id]);
    return updated;
  });
}

export async function deleteMoneyAccount(id: ID) {
  const account = await rizhiDb.accounts.get(id);
  if (!account) throw new Error("账户不存在");

  const flowCount = await rizhiDb.accountFlows.where("accountId").equals(id).count();
  if (flowCount > 0) {
    throw new Error(`该账户已有 ${flowCount} 条资金流水，不能删除。可以停用账户以保留历史记录。`);
  }

  await rizhiDb.accounts.delete(id);
}

export async function createAssetWithExpense(input: CreateAssetInput) {
  assertPositiveAmount(input.originalCost);

  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const timestamp = nowIso();
    const assetId = createId("asset");
    let purchaseTransactionId: string | undefined;

    if (input.paymentAccountId) {
      const account = await rizhiDb.accounts.get(input.paymentAccountId);
      if (!account) throw new Error("付款账户不存在");

      const transaction: TransactionRecord = await withTransactionCategoryMeta({
        id: createId("tx"),
        type: "asset_purchase",
        categoryId: "tx-asset-purchase",
        businessType: "asset_purchase",
        amount: input.originalCost,
        occurredAt: dateWithReferenceTimeIso(input.purchaseDate),
        accountId: input.paymentAccountId,
        assetId,
        assetSnapshot: { id: assetId, name: input.name },
        merchant: input.merchant,
        note: `购买资产：${input.name}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const balanceAfter = applyAccountDelta(account, "asset_purchase", input.originalCost);
      const flow = await createFlow(account, transaction, balanceAfter);
      await rizhiDb.transactions.put(transaction);
      await rizhiDb.accounts.put({ ...account, balance: balanceAfter, updatedAt: timestamp });
      await rizhiDb.accountFlows.put(flow);
      purchaseTransactionId = transaction.id;
    }

    const asset: AssetRecord = {
      id: assetId,
      userId: "user-local",
      name: input.name,
      brand: input.brand,
      model: input.model,
      categoryId: input.categoryId,
      status: "using",
      originalCost: input.originalCost,
      currency: input.currency ?? "CNY",
      currentValue: input.currentValue,
      currentValueUpdatedAt: input.currentValue ? input.currentValueUpdatedAt ?? timestamp : input.currentValueUpdatedAt,
      currentValueSource: input.currentValue ? input.currentValueSource ?? "manual" : input.currentValueSource,
      purchaseDate: input.purchaseDate,
      firstUseDate: input.firstUseDate ?? input.purchaseDate,
      lastUsedAt: input.lastUsedAt,
      idleSince: input.idleSince,
      purchaseChannel: input.purchaseChannel,
      merchant: input.merchant,
      orderNo: input.orderNo,
      paymentAccountId: input.paymentAccountId,
      purchaseTransactionId,
      warrantyStartDate: input.warrantyStartDate,
      warrantyEndDate: input.warrantyEndDate,
      expectedUseDays: input.expectedUseDays,
      notes: input.notes,
      attachments: normalizeAttachments(input.attachments) ?? imageUrlsToAttachments(input.imageUrl, input.imageUrls),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await rizhiDb.assets.put(asset);
    if (input.paymentAccountId) {
      await recalculateAccountFlowBalances([input.paymentAccountId]);
    }
    return asset;
  });
}

export async function updateAsset(input: UpdateAssetInput) {
  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const asset = await rizhiDb.assets.get(input.id);
    if (!asset) throw new Error("资产不存在");

    const timestamp = nowIso();
    const affectedAccountIds = new Set<ID>();
    const originalCost = input.originalCost ?? asset.originalCost;
    let updated: AssetRecord = {
      ...asset,
      name: input.name ?? asset.name,
      brand: hasOwn(input, "brand") ? input.brand : asset.brand,
      model: hasOwn(input, "model") ? input.model : asset.model,
      categoryId: input.categoryId ?? asset.categoryId,
      status: input.status ?? asset.status,
      originalCost,
      currency: input.currency ?? asset.currency ?? "CNY",
      currentValue: hasOwn(input, "currentValue") ? input.currentValue : asset.currentValue,
      currentValueUpdatedAt: hasOwn(input, "currentValueUpdatedAt") ? input.currentValueUpdatedAt : asset.currentValueUpdatedAt,
      currentValueSource: hasOwn(input, "currentValueSource") ? input.currentValueSource : asset.currentValueSource,
      purchaseDate: input.purchaseDate ?? asset.purchaseDate,
      firstUseDate: hasOwn(input, "firstUseDate") ? input.firstUseDate : asset.firstUseDate,
      lastUsedAt: hasOwn(input, "lastUsedAt") ? input.lastUsedAt : asset.lastUsedAt,
      idleSince: hasOwn(input, "idleSince") ? input.idleSince : asset.idleSince,
      purchaseChannel: hasOwn(input, "purchaseChannel") ? input.purchaseChannel : asset.purchaseChannel,
      merchant: hasOwn(input, "merchant") ? input.merchant : asset.merchant,
      orderNo: hasOwn(input, "orderNo") ? input.orderNo : asset.orderNo,
      paymentAccountId: hasOwn(input, "paymentAccountId") ? input.paymentAccountId : asset.paymentAccountId,
      warrantyStartDate: hasOwn(input, "warrantyStartDate") ? input.warrantyStartDate : asset.warrantyStartDate,
      warrantyEndDate: hasOwn(input, "warrantyEndDate") ? input.warrantyEndDate : asset.warrantyEndDate,
      expectedUseDays: hasOwn(input, "expectedUseDays") ? input.expectedUseDays : asset.expectedUseDays,
      notes: hasOwn(input, "notes") ? input.notes : asset.notes,
      attachments: hasOwn(input, "attachments")
        ? normalizeAttachments(input.attachments)
        : hasOwn(input, "imageUrls") || hasOwn(input, "imageUrl")
          ? imageUrlsToAttachments(input.imageUrl, input.imageUrls, asset.attachments)
          : normalizeAttachments(asset.attachments),
      updatedAt: timestamp,
    };

    if (asset.purchaseTransactionId) {
      const purchaseTransaction = await rizhiDb.transactions.get(asset.purchaseTransactionId);
      if (purchaseTransaction) {
        if (!purchaseTransaction.accountId) throw new Error("原付款交易缺少账户");
        affectedAccountIds.add(purchaseTransaction.accountId);
        const oldAccount = await rizhiDb.accounts.get(purchaseTransaction.accountId);
        if (!oldAccount) throw new Error("原付款账户不存在");
        const oldDelta = accountDelta(oldAccount, purchaseTransaction.type, purchaseTransaction.amount);
        await rizhiDb.accountFlows.where("transactionId").equals(purchaseTransaction.id).delete();

        if (updated.paymentAccountId) {
          affectedAccountIds.add(updated.paymentAccountId);
          const newAccount = await rizhiDb.accounts.get(updated.paymentAccountId);
          if (!newAccount) throw new Error("付款账户不存在");
          const syncedTransaction: TransactionRecord = await withTransactionCategoryMeta({
            ...purchaseTransaction,
            type: "asset_purchase",
            categoryId: "tx-asset-purchase",
            businessType: "asset_purchase",
            amount: updated.originalCost,
            occurredAt: dateWithReferenceTimeIso(updated.purchaseDate, new Date(purchaseTransaction.createdAt)),
            accountId: updated.paymentAccountId,
            assetId: updated.id,
            assetSnapshot: assetSnapshot(updated),
            merchant: updated.merchant,
            note: purchaseTransaction.note || `购买资产：${updated.name}`,
            updatedAt: timestamp,
          });
          const newDelta = accountDelta(newAccount, syncedTransaction.type, syncedTransaction.amount);

          if (oldAccount.id === newAccount.id) {
            const balance = oldAccount.balance - oldDelta + newDelta;
            await rizhiDb.accounts.put({ ...oldAccount, balance, updatedAt: timestamp });
            await rizhiDb.accountFlows.put({
              id: createId("flow"),
              accountId: oldAccount.id,
              transactionId: syncedTransaction.id,
              direction: newDelta >= 0 ? "in" : "out",
              amount: syncedTransaction.amount,
              occurredAt: syncedTransaction.occurredAt,
              balanceAfter: balance,
              note: syncedTransaction.note,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
          } else {
            const oldBalance = oldAccount.balance - oldDelta;
            const newBalance = newAccount.balance + newDelta;
            await rizhiDb.accounts.bulkPut([
              { ...oldAccount, balance: oldBalance, updatedAt: timestamp },
              { ...newAccount, balance: newBalance, updatedAt: timestamp },
            ]);
            await rizhiDb.accountFlows.put({
              id: createId("flow"),
              accountId: newAccount.id,
              transactionId: syncedTransaction.id,
              direction: newDelta >= 0 ? "in" : "out",
              amount: syncedTransaction.amount,
              occurredAt: syncedTransaction.occurredAt,
              balanceAfter: newBalance,
              note: syncedTransaction.note,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
          }

          await rizhiDb.transactions.put(syncedTransaction);
        } else {
          const oldBalance = oldAccount.balance - oldDelta;
          await rizhiDb.accounts.put({ ...oldAccount, balance: oldBalance, updatedAt: timestamp });
          await rizhiDb.transactions.delete(purchaseTransaction.id);
          updated = { ...updated, purchaseTransactionId: undefined };
        }
      }
    } else if (updated.paymentAccountId) {
      affectedAccountIds.add(updated.paymentAccountId);
      const account = await rizhiDb.accounts.get(updated.paymentAccountId);
      if (!account) throw new Error("付款账户不存在");
      const purchaseTransaction: TransactionRecord = await withTransactionCategoryMeta({
        id: createId("tx"),
        type: "asset_purchase",
        categoryId: "tx-asset-purchase",
        businessType: "asset_purchase",
        amount: updated.originalCost,
        occurredAt: dateWithReferenceTimeIso(updated.purchaseDate),
        accountId: updated.paymentAccountId,
        assetId: updated.id,
        assetSnapshot: assetSnapshot(updated),
        merchant: updated.merchant,
        note: `购买资产：${updated.name}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const balanceAfter = applyAccountDelta(account, "asset_purchase", updated.originalCost);
      const flow = await createFlow(account, purchaseTransaction, balanceAfter);
      await rizhiDb.transactions.put(purchaseTransaction);
      await rizhiDb.accounts.put({ ...account, balance: balanceAfter, updatedAt: timestamp });
      await rizhiDb.accountFlows.put(flow);
      updated = { ...updated, purchaseTransactionId: purchaseTransaction.id };
    }

    await rizhiDb.assets.put(updated);
    await recalculateAccountFlowBalances(affectedAccountIds);
    return updated;
  });
}

export async function deleteAsset(id: ID) {
  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.assetAddons, rizhiDb.assetPartEvents, rizhiDb.transactions], async () => {
    const asset = await rizhiDb.assets.get(id);
    if (!asset) throw new Error("资产不存在");

    const linkedTransactions = await rizhiDb.transactions.where("assetId").equals(id).toArray();
    const timestamp = nowIso();

    await rizhiDb.transactions.bulkPut(linkedTransactions.map((transaction) => ({
      ...transaction,
      assetSnapshot: transaction.assetSnapshot ?? assetSnapshot(asset),
      assetId: undefined,
      addonId: undefined,
      partEventId: undefined,
      updatedAt: timestamp,
    })));
    await rizhiDb.assetAddons.where("assetId").equals(id).delete();
    await rizhiDb.assetPartEvents.where("assetId").equals(id).delete();
    await rizhiDb.assets.delete(id);
  });
}

export async function transferAsset(input: TransferAssetInput) {
  assertPositiveAmount(input.amount);

  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const asset = await rizhiDb.assets.get(input.assetId);
    if (!asset) throw new Error("资产不存在");
    assertAssetCanTransfer(asset);

    const account = await rizhiDb.accounts.get(input.accountId);
    if (!account) throw new Error("收款账户不存在");

    const timestamp = nowIso();
    const transaction: TransactionRecord = await withTransactionCategoryMeta({
      id: createId("tx"),
      type: "income",
      categoryId: "tx-asset-transfer",
      businessType: "asset_transfer",
      amount: input.amount,
      occurredAt: input.occurredAt,
      accountId: input.accountId,
      assetId: input.assetId,
      assetSnapshot: assetSnapshot(asset),
      merchant: "资产转让",
      note: input.note || `转让资产：${asset.name}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const balanceAfter = applyAccountDelta(account, "income", input.amount);
    const flow = await createFlow(account, transaction, balanceAfter);

    await rizhiDb.transactions.put(transaction);
    await rizhiDb.accounts.put({ ...account, balance: balanceAfter, updatedAt: timestamp });
    await rizhiDb.accountFlows.put(flow);
    await rizhiDb.assets.put({
      ...asset,
      status: "transferred",
      currentValue: input.amount,
      currentValueUpdatedAt: input.occurredAt,
      currentValueSource: "transfer",
      transferDate: input.occurredAt.slice(0, 10),
      transferAmount: input.amount,
      transferAccountId: input.accountId,
      transferTransactionId: transaction.id,
      notes: input.note ? `${asset.notes ? `${asset.notes}\n` : ""}转让备注：${input.note}` : asset.notes,
      updatedAt: timestamp,
    });
    await recalculateAccountFlowBalances([account.id]);

    return transaction;
  });
}

export async function revokeAssetTransfer(assetId: ID) {
  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows], async () => {
    const asset = await rizhiDb.assets.get(assetId);
    if (!asset) throw new Error("资产不存在");

    const transferTransaction = await rizhiDb.transactions
      .where("assetId")
      .equals(assetId)
      .and((transaction) => transaction.categoryId === "tx-asset-transfer" && transaction.type === "income")
      .last();

    if (!transferTransaction) throw new Error("没有找到资产转让收入记录");

    const account = transferTransaction.accountId ? await rizhiDb.accounts.get(transferTransaction.accountId) : undefined;
    if (!account) throw new Error("收款账户不存在");

    const timestamp = nowIso();
    const balance = account.balance - accountDelta(account, transferTransaction.type, transferTransaction.amount);

    await rizhiDb.accounts.put({ ...account, balance, updatedAt: timestamp });
    await rizhiDb.accountFlows.where("transactionId").equals(transferTransaction.id).delete();
    await rizhiDb.transactions.delete(transferTransaction.id);
    await rizhiDb.assets.put({
      ...asset,
      status: "using",
      currentValue: undefined,
      currentValueUpdatedAt: undefined,
      currentValueSource: undefined,
      transferDate: undefined,
      transferAmount: undefined,
      transferAccountId: undefined,
      transferTransactionId: undefined,
      updatedAt: timestamp,
    });
    await recalculateAccountFlowBalances([account.id]);
  });
}

export async function createAssetAddonWithExpense(input: CreateAddonInput) {
  assertPositiveAmount(input.amount);

  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.assetAddons, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const asset = await rizhiDb.assets.get(input.assetId);
    if (!asset) throw new Error("资产不存在");
    assertAssetCanReceiveAddon(asset);

    const timestamp = nowIso();
    const addonId = createId("addon");
    const direction = input.direction ?? "expense";
    let transactionId: string | undefined;

    if (input.paymentAccountId) {
      const account = await rizhiDb.accounts.get(input.paymentAccountId);
      if (!account) throw new Error(direction === "income" ? "收款账户不存在" : "付款账户不存在");

      const transaction: TransactionRecord = await withTransactionCategoryMeta({
        id: createId("tx"),
        type: direction,
        categoryId: addonTransactionCategory(direction, input.type),
        businessType: "asset_addon",
        amount: input.amount,
        occurredAt: dateWithReferenceTimeIso(input.purchaseDate),
        accountId: input.paymentAccountId,
        assetId: input.assetId,
        assetSnapshot: assetSnapshot(asset),
        addonId,
        merchant: input.merchant || input.name,
        note: input.notes || `${direction === "income" ? "资产附加项收入" : "资产附加项"}：${asset.name} / ${input.name}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const balanceAfter = applyAccountDelta(account, direction, input.amount);
      const flow = await createFlow(account, transaction, balanceAfter);
      await rizhiDb.transactions.put(transaction);
      await rizhiDb.accounts.put({ ...account, balance: balanceAfter, updatedAt: timestamp });
      await rizhiDb.accountFlows.put(flow);
      transactionId = transaction.id;
    }

    const addon: AssetAddonRecord = {
      id: addonId,
      assetId: input.assetId,
      name: input.name,
      direction,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      purchaseDate: input.purchaseDate,
      merchant: input.merchant,
      paymentAccountId: input.paymentAccountId,
      transactionId,
      includedInCost: input.includedInCost,
      notes: input.notes,
      attachments: normalizeAttachments(input.attachments) ?? imageUrlsToAttachments(input.imageUrl, input.imageUrls, undefined, "附加项图片"),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await rizhiDb.assetAddons.put(addon);
    await rizhiDb.assets.put({
      ...asset,
      updatedAt: timestamp,
    });
    if (input.paymentAccountId) {
      await recalculateAccountFlowBalances([input.paymentAccountId]);
    }

    return addon;
  });
}

export async function updateAssetAddonWithExpense(input: UpdateAddonInput) {
  assertPositiveAmount(input.amount);

  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.assetAddons, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const addon = await rizhiDb.assetAddons.get(input.id);
    if (!addon) throw new Error("附加项不存在");

    const asset = await rizhiDb.assets.get(addon.assetId);
    if (!asset) throw new Error("资产不存在");
    assertAssetCanReceiveAddon(asset);

    const timestamp = nowIso();
    const affectedAccountIds = new Set<ID>();
    const direction = input.direction ?? addon.direction ?? "expense";
    let updatedAddon: AssetAddonRecord = {
      ...addon,
      name: input.name,
      direction,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? addon.currency,
      purchaseDate: input.purchaseDate,
      merchant: input.merchant,
      paymentAccountId: input.paymentAccountId,
      includedInCost: input.includedInCost,
      notes: input.notes,
      attachments: input.attachments
        ? normalizeAttachments(input.attachments)
        : imageUrlsToAttachments(input.imageUrl, input.imageUrls, addon.attachments, "附加项图片"),
      updatedAt: timestamp,
    };

    if (addon.transactionId) {
      const oldTransaction = await rizhiDb.transactions.get(addon.transactionId);
      if (oldTransaction) {
        const oldAccount = oldTransaction.accountId ? await rizhiDb.accounts.get(oldTransaction.accountId) : undefined;
        const newAccount = input.paymentAccountId ? await rizhiDb.accounts.get(input.paymentAccountId) : undefined;
        if (!oldAccount) throw new Error("原账户不存在");
        affectedAccountIds.add(oldAccount.id);
        if (input.paymentAccountId && !newAccount) throw new Error(direction === "income" ? "收款账户不存在" : "付款账户不存在");

        const oldDelta = accountDelta(oldAccount, oldTransaction.type, oldTransaction.amount);
        await rizhiDb.accountFlows.where("transactionId").equals(oldTransaction.id).delete();

        if (!input.paymentAccountId) {
          await rizhiDb.accounts.put({
            ...oldAccount,
            balance: oldAccount.balance - oldDelta,
            updatedAt: timestamp,
          });
          await rizhiDb.transactions.delete(oldTransaction.id);
          updatedAddon = { ...updatedAddon, transactionId: undefined };
        } else {
        affectedAccountIds.add(input.paymentAccountId);
        const updatedTransaction: TransactionRecord = await withTransactionCategoryMeta({
          ...oldTransaction,
          type: direction,
          categoryId: addonTransactionCategory(direction, input.type),
          businessType: "asset_addon",
          amount: input.amount,
          occurredAt: dateWithReferenceTimeIso(input.purchaseDate, new Date(oldTransaction.createdAt)),
          accountId: input.paymentAccountId,
          assetId: addon.assetId,
          assetSnapshot: assetSnapshot(asset),
          addonId: addon.id,
          merchant: input.merchant || input.name,
          note: input.notes || `${direction === "income" ? "资产附加项收入" : "资产附加项"}：${asset.name} / ${input.name}`,
          updatedAt: timestamp,
        });

        const targetAccount = newAccount!;
        const newDelta = accountDelta(targetAccount, updatedTransaction.type, updatedTransaction.amount);

        if (oldAccount.id === targetAccount.id) {
          const balance = oldAccount.balance - oldDelta + newDelta;
          await rizhiDb.accounts.put({ ...oldAccount, balance, updatedAt: timestamp });
          await rizhiDb.accountFlows.put({
            id: createId("flow"),
            accountId: oldAccount.id,
            transactionId: updatedTransaction.id,
            direction: newDelta >= 0 ? "in" : "out",
            amount: input.amount,
            occurredAt: updatedTransaction.occurredAt,
            balanceAfter: balance,
            note: updatedTransaction.note,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        } else {
          const oldBalance = oldAccount.balance - oldDelta;
          const newBalance = targetAccount.balance + newDelta;
          await rizhiDb.accounts.bulkPut([
            { ...oldAccount, balance: oldBalance, updatedAt: timestamp },
            { ...targetAccount, balance: newBalance, updatedAt: timestamp },
          ]);
          await rizhiDb.accountFlows.put({
            id: createId("flow"),
            accountId: targetAccount.id,
            transactionId: updatedTransaction.id,
            direction: newDelta >= 0 ? "in" : "out",
            amount: input.amount,
            occurredAt: updatedTransaction.occurredAt,
            balanceAfter: newBalance,
            note: updatedTransaction.note,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }

        await rizhiDb.transactions.put(updatedTransaction);
        }
      } else {
        updatedAddon = { ...updatedAddon, transactionId: undefined };
      }
    } else if (input.paymentAccountId) {
      affectedAccountIds.add(input.paymentAccountId);
      const account = await rizhiDb.accounts.get(input.paymentAccountId);
      if (!account) throw new Error(direction === "income" ? "收款账户不存在" : "付款账户不存在");

      const transaction: TransactionRecord = await withTransactionCategoryMeta({
        id: createId("tx"),
        type: direction,
        categoryId: addonTransactionCategory(direction, input.type),
        businessType: "asset_addon",
        amount: input.amount,
        occurredAt: dateWithReferenceTimeIso(input.purchaseDate),
        accountId: input.paymentAccountId,
        assetId: addon.assetId,
        assetSnapshot: assetSnapshot(asset),
        addonId: addon.id,
        merchant: input.merchant || input.name,
        note: input.notes || `${direction === "income" ? "资产附加项收入" : "资产附加项"}：${asset.name} / ${input.name}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const balanceAfter = applyAccountDelta(account, transaction.type, transaction.amount);
      const flow = await createFlow(account, transaction, balanceAfter);

      await rizhiDb.transactions.put(transaction);
      await rizhiDb.accounts.put({ ...account, balance: balanceAfter, updatedAt: timestamp });
      await rizhiDb.accountFlows.put(flow);
      updatedAddon = { ...updatedAddon, transactionId: transaction.id };
    }

    await rizhiDb.assetAddons.put(updatedAddon);
    await rizhiDb.assets.put({
      ...asset,
      updatedAt: timestamp,
    });
    await recalculateAccountFlowBalances(affectedAccountIds);

    return updatedAddon;
  });
}

export async function deleteAssetAddon(id: ID) {
  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.assetAddons, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows], async () => {
    const addon = await rizhiDb.assetAddons.get(id);
    if (!addon) throw new Error("附加项不存在");

    const asset = await rizhiDb.assets.get(addon.assetId);
    if (!asset) throw new Error("资产不存在");
    assertAssetCanReceiveAddon(asset);

    const timestamp = nowIso();
    if (addon.transactionId) {
      const transaction = await rizhiDb.transactions.get(addon.transactionId);
      if (transaction) {
        const account = transaction.accountId ? await rizhiDb.accounts.get(transaction.accountId) : undefined;
        if (!account) throw new Error("附加项关联账户不存在");
        const restoredBalance = account.balance - accountDelta(account, transaction.type, transaction.amount);
        await rizhiDb.accounts.put({ ...account, balance: restoredBalance, updatedAt: timestamp });
        await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).delete();
        await rizhiDb.transactions.delete(transaction.id);
        await recalculateAccountFlowBalances([account.id]);
      }
    }

    await rizhiDb.assetAddons.delete(id);
    await rizhiDb.assets.put({ ...asset, updatedAt: timestamp });
  });
}

export async function createAssetPartEvent(input: CreateAssetPartEventInput) {
  if (!input.name.trim()) throw new Error("部件名称不能为空");
  if ((input.amount ?? 0) < 0 || (input.estimatedOriginalCost ?? 0) < 0) throw new Error("金额不能为负数");
  const shouldCreateIncome = Boolean(input.accountId && input.amount && input.amount > 0);
  if (input.type === "transferred" || shouldCreateIncome) {
    assertPositiveAmount(input.amount ?? 0);
    if (!input.accountId) throw new Error("有发生金额时需要选择收款账户");
  }

  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.assetPartEvents, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const asset = await rizhiDb.assets.get(input.assetId);
    if (!asset) throw new Error("资产不存在");

    const timestamp = nowIso();
    const partEventId = createId("part");
    let transactionId: ID | undefined;

    if (shouldCreateIncome && input.accountId && input.amount) {
      const account = await rizhiDb.accounts.get(input.accountId);
      if (!account) throw new Error("收款账户不存在");

      const transaction: TransactionRecord = await withTransactionCategoryMeta({
        id: createId("tx"),
        type: "income",
        categoryId: "tx-asset-part-transfer",
        businessType: "legacy_part_event",
        amount: input.amount,
        occurredAt: input.occurredAt,
        accountId: input.accountId,
        assetId: input.assetId,
        partEventId,
        merchant: input.name.trim(),
        note: input.notes || `资产部件收入：${asset.name} / ${input.name.trim()}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const balanceAfter = applyAccountDelta(account, transaction.type, transaction.amount);
      const flow = await createFlow(account, transaction, balanceAfter);

      await rizhiDb.transactions.put(transaction);
      await rizhiDb.accounts.put({ ...account, balance: balanceAfter, updatedAt: timestamp });
      await rizhiDb.accountFlows.put(flow);
      transactionId = transaction.id;
    }

    const event: AssetPartEventRecord = {
      id: partEventId,
      assetId: input.assetId,
      name: input.name.trim(),
      type: input.type,
      estimatedOriginalCost: input.estimatedOriginalCost,
      amount: input.amount,
      occurredAt: input.occurredAt,
      accountId: input.accountId,
      transactionId,
      currentValueAdjustment: input.currentValueAdjustment,
      notes: input.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const nextCurrentValue = typeof asset.currentValue === "number" && typeof input.currentValueAdjustment === "number"
      ? Math.max(0, asset.currentValue + input.currentValueAdjustment)
      : asset.currentValue;

    await rizhiDb.assetPartEvents.put(event);
    await rizhiDb.assets.put({
      ...asset,
      currentValue: nextCurrentValue,
      currentValueUpdatedAt: nextCurrentValue !== asset.currentValue ? timestamp : asset.currentValueUpdatedAt,
      currentValueSource: nextCurrentValue !== asset.currentValue ? "manual" : asset.currentValueSource,
      updatedAt: timestamp,
    });
    if (input.accountId && transactionId) {
      await recalculateAccountFlowBalances([input.accountId]);
    }

    return event;
  });
}

export async function syncMissingAssetPartEventTransactions() {
  return rizhiDb.transaction("rw", [rizhiDb.assets, rizhiDb.assetPartEvents, rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories], async () => {
    const events = await rizhiDb.assetPartEvents.toArray();
    const missingEvents = events.filter((event) => event.amount && event.amount > 0 && event.accountId && !event.transactionId);
    if (!missingEvents.length) return 0;

    const timestamp = nowIso();
    let syncedCount = 0;
    const affectedAccountIds = new Set<ID>();

    for (const event of missingEvents) {
      const [asset, account] = await Promise.all([
        rizhiDb.assets.get(event.assetId),
        event.accountId ? rizhiDb.accounts.get(event.accountId) : undefined,
      ]);
      if (!asset || !account || !event.amount || !event.accountId) continue;

      const transaction: TransactionRecord = await withTransactionCategoryMeta({
        id: createId("tx"),
        type: "income",
        categoryId: "tx-asset-part-transfer",
        businessType: "legacy_part_event",
        amount: event.amount,
        occurredAt: event.occurredAt,
        accountId: event.accountId,
        assetId: event.assetId,
        partEventId: event.id,
        merchant: event.name,
        note: event.notes || `资产部件收入：${asset.name} / ${event.name}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const balanceAfter = applyAccountDelta(account, transaction.type, transaction.amount);
      const flow = await createFlow(account, transaction, balanceAfter);

      await rizhiDb.transactions.put(transaction);
      await rizhiDb.accounts.put({ ...account, balance: balanceAfter, updatedAt: timestamp });
      await rizhiDb.accountFlows.put(flow);
      await rizhiDb.assetPartEvents.put({ ...event, transactionId: transaction.id, updatedAt: timestamp });
      affectedAccountIds.add(account.id);
      syncedCount += 1;
    }

    await recalculateAccountFlowBalances(affectedAccountIds);
    return syncedCount;
  });
}

export async function transferFunds(input: TransferInput) {
  assertPositiveAmount(input.amount);
  if (input.fromAccountId === input.toAccountId) throw new Error("转出和转入账户不能相同");

  return rizhiDb.transaction("rw", rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories, async () => {
    const [fromAccount, toAccount] = await Promise.all([
      rizhiDb.accounts.get(input.fromAccountId),
      rizhiDb.accounts.get(input.toAccountId),
    ]);
    if (!fromAccount || !toAccount) throw new Error("账户不存在");

    const timestamp = nowIso();
    const transaction: TransactionRecord = await withTransactionCategoryMeta({
      id: createId("tx"),
      type: "transfer",
      categoryId: "tx-transfer",
      businessType: "account_transfer",
      amount: input.amount,
      occurredAt: input.occurredAt,
      accountId: input.fromAccountId,
      relatedAccountId: input.toAccountId,
      note: input.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const fromBalanceAfter = fromAccount.direction === "asset"
      ? fromAccount.balance - input.amount
      : fromAccount.balance + input.amount;
    const toBalanceAfter = toAccount.direction === "asset"
      ? toAccount.balance + input.amount
      : toAccount.balance - input.amount;

    await rizhiDb.transactions.put(transaction);
    await rizhiDb.accounts.bulkPut([
      { ...fromAccount, balance: fromBalanceAfter, updatedAt: timestamp },
      { ...toAccount, balance: toBalanceAfter, updatedAt: timestamp },
    ]);
    await rizhiDb.accountFlows.bulkPut([
      {
        id: createId("flow"),
        accountId: fromAccount.id,
        transactionId: transaction.id,
        direction: "out",
        amount: input.amount,
        occurredAt: input.occurredAt,
        balanceAfter: fromBalanceAfter,
        note: input.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: createId("flow"),
        accountId: toAccount.id,
        transactionId: transaction.id,
        direction: "in",
        amount: input.amount,
        occurredAt: input.occurredAt,
        balanceAfter: toBalanceAfter,
        note: input.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    await recalculateAccountFlowBalances([fromAccount.id, toAccount.id]);

    return transaction;
  });
}

export async function repayDebt(input: RepayDebtInput) {
  assertPositiveAmount(input.amount);
  if (input.fromAccountId === input.liabilityAccountId) throw new Error("还款账户和负债账户不能相同");

  return rizhiDb.transaction("rw", rizhiDb.accounts, rizhiDb.transactions, rizhiDb.accountFlows, rizhiDb.categories, async () => {
    const [fromAccount, liabilityAccount] = await Promise.all([
      rizhiDb.accounts.get(input.fromAccountId),
      rizhiDb.accounts.get(input.liabilityAccountId),
    ]);
    if (!fromAccount || !liabilityAccount) throw new Error("账户不存在");
    if (fromAccount.direction !== "asset") throw new Error("还款账户必须是资产账户");
    if (liabilityAccount.direction !== "liability") throw new Error("被还款账户必须是负债账户");
    if (input.amount > liabilityAccount.balance) throw new Error("还款金额不能大于当前欠款");

    const timestamp = nowIso();
    const transaction: TransactionRecord = await withTransactionCategoryMeta({
      id: createId("tx"),
      type: "repayment",
      categoryId: "tx-repayment",
      businessType: "debt_repayment",
      amount: input.amount,
      occurredAt: input.occurredAt,
      accountId: input.fromAccountId,
      relatedAccountId: input.liabilityAccountId,
      note: input.note || `${liabilityAccount.name} 还款`,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const fromBalanceAfter = fromAccount.balance - input.amount;
    const liabilityBalanceAfter = liabilityAccount.balance - input.amount;

    await rizhiDb.transactions.put(transaction);
    await rizhiDb.accounts.bulkPut([
      { ...fromAccount, balance: fromBalanceAfter, updatedAt: timestamp },
      { ...liabilityAccount, balance: liabilityBalanceAfter, updatedAt: timestamp },
    ]);
    await rizhiDb.accountFlows.bulkPut([
      {
        id: createId("flow"),
        accountId: fromAccount.id,
        transactionId: transaction.id,
        direction: "out",
        amount: input.amount,
        occurredAt: input.occurredAt,
        balanceAfter: fromBalanceAfter,
        note: transaction.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: createId("flow"),
        accountId: liabilityAccount.id,
        transactionId: transaction.id,
        direction: "in",
        amount: input.amount,
        occurredAt: input.occurredAt,
        balanceAfter: liabilityBalanceAfter,
        note: transaction.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    await recalculateAccountFlowBalances([fromAccount.id, liabilityAccount.id]);

    return transaction;
  });
}
