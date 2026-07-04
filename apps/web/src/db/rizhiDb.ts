import Dexie, { type Table } from "dexie";
import type {
  AccountFlowRecord,
  AssetAddonRecord,
  AssetPartEventRecord,
  AssetRecord,
  CategoryRecord,
  MetadataRecord,
  MoneyAccountRecord,
  TransactionRecord,
  UserSettingsRecord,
} from "@/domain/models";

export class RizhiDatabase extends Dexie {
  assets!: Table<AssetRecord, string>;
  assetAddons!: Table<AssetAddonRecord, string>;
  assetPartEvents!: Table<AssetPartEventRecord, string>;
  accounts!: Table<MoneyAccountRecord, string>;
  transactions!: Table<TransactionRecord, string>;
  accountFlows!: Table<AccountFlowRecord, string>;
  categories!: Table<CategoryRecord, string>;
  settings!: Table<UserSettingsRecord, string>;
  metadata!: Table<MetadataRecord, string>;

  constructor() {
    super("rizhi-local-db");

    this.version(1).stores({
      assets: "&id, name, categoryId, categoryKind, status, purchaseDate, warrantyEndDate, paymentAccountId, purchaseTransactionId, createdAt, updatedAt",
      assetAddons: "&id, assetId, type, purchaseDate, paymentAccountId, transactionId, createdAt, updatedAt",
      accounts: "&id, name, type, direction, institution, createdAt, updatedAt",
      transactions: "&id, type, categoryId, accountId, relatedAccountId, assetId, addonId, occurredAt, createdAt, updatedAt",
      accountFlows: "&id, accountId, transactionId, direction, occurredAt, createdAt",
      categories: "&id, domain, type, sort, parentId",
      settings: "&id",
      metadata: "&key",
    });

    this.version(2).stores({
      assets: "&id, userId, name, categoryId, status, purchaseDate, firstUseDate, lastUsedAt, idleSince, warrantyEndDate, paymentAccountId, purchaseTransactionId, transferTransactionId, createdAt, updatedAt",
      assetAddons: "&id, assetId, type, purchaseDate, paymentAccountId, transactionId, createdAt, updatedAt",
      accounts: "&id, name, type, direction, institution, createdAt, updatedAt",
      transactions: "&id, type, categoryId, accountId, relatedAccountId, assetId, addonId, occurredAt, createdAt, updatedAt",
      accountFlows: "&id, accountId, transactionId, direction, occurredAt, createdAt",
      categories: "&id, domain, type, sort, parentId",
      settings: "&id",
      metadata: "&key",
    });

    this.version(3).stores({
      assets: "&id, userId, name, categoryId, status, purchaseDate, firstUseDate, lastUsedAt, idleSince, warrantyEndDate, paymentAccountId, purchaseTransactionId, transferTransactionId, createdAt, updatedAt",
      assetAddons: "&id, assetId, type, purchaseDate, paymentAccountId, transactionId, createdAt, updatedAt",
      assetPartEvents: "&id, assetId, type, occurredAt, accountId, transactionId, createdAt, updatedAt",
      accounts: "&id, name, type, direction, institution, createdAt, updatedAt",
      transactions: "&id, type, categoryId, accountId, relatedAccountId, assetId, addonId, partEventId, occurredAt, createdAt, updatedAt",
      accountFlows: "&id, accountId, transactionId, direction, occurredAt, createdAt",
      categories: "&id, domain, type, sort, parentId",
      settings: "&id",
      metadata: "&key",
    });

    this.version(4).stores({
      assets: "&id, userId, name, categoryId, status, purchaseDate, firstUseDate, lastUsedAt, idleSince, warrantyEndDate, paymentAccountId, purchaseTransactionId, transferTransactionId, createdAt, updatedAt",
      assetAddons: "&id, assetId, direction, type, purchaseDate, paymentAccountId, transactionId, createdAt, updatedAt",
      assetPartEvents: "&id, assetId, type, occurredAt, accountId, transactionId, createdAt, updatedAt",
      accounts: "&id, name, type, direction, institution, createdAt, updatedAt",
      transactions: "&id, type, categoryId, accountId, relatedAccountId, assetId, addonId, partEventId, occurredAt, createdAt, updatedAt",
      accountFlows: "&id, accountId, transactionId, direction, occurredAt, createdAt",
      categories: "&id, domain, type, sort, parentId",
      settings: "&id",
      metadata: "&key",
    }).upgrade(async (tx) => {
      await tx.table("assetAddons").toCollection().modify((addon) => {
        addon.direction = addon.direction ?? "expense";
      });
      await tx.table("categories").put({
        id: "tx-asset-addon-income",
        domain: "transaction",
        type: "income",
        name: "资产附加项收入",
        sort: 225,
        color: "#14B8A6",
      });
    });

    this.version(5).stores({
      assets: "&id, userId, name, categoryId, status, purchaseDate, firstUseDate, lastUsedAt, idleSince, warrantyEndDate, paymentAccountId, purchaseTransactionId, transferTransactionId, createdAt, updatedAt",
      assetAddons: "&id, assetId, direction, type, purchaseDate, paymentAccountId, transactionId, createdAt, updatedAt",
      assetPartEvents: "&id, assetId, type, occurredAt, accountId, transactionId, createdAt, updatedAt",
      accounts: "&id, name, type, direction, institution, createdAt, updatedAt",
      transactions: "&id, type, categoryId, subCategoryId, businessType, accountId, relatedAccountId, assetId, addonId, partEventId, occurredAt, createdAt, updatedAt",
      accountFlows: "&id, accountId, transactionId, direction, occurredAt, createdAt",
      categories: "&id, domain, type, sort, parentId, enabled, isSystem, deletedAt",
      settings: "&id",
      metadata: "&key",
    }).upgrade(async (tx) => {
      const categories = await tx.table("categories").toArray();
      const categoryMap = new Map(categories.map((category) => [category.id, category]));

      await tx.table("categories").toCollection().modify((category) => {
        category.enabled = category.enabled ?? true;
        category.isSystem = category.isSystem ?? true;
      });

      await tx.table("transactions").toCollection().modify((transaction) => {
        const category = categoryMap.get(transaction.categoryId);
        const subCategory = transaction.subCategoryId ? categoryMap.get(transaction.subCategoryId) : undefined;
        transaction.businessType = transaction.businessType
          ?? (transaction.type === "asset_purchase" ? "asset_purchase"
            : transaction.addonId ? "asset_addon"
              : transaction.partEventId ? "legacy_part_event"
                : transaction.categoryId === "tx-asset-transfer" ? "asset_transfer"
                  : transaction.type === "transfer" ? "account_transfer"
                    : transaction.type === "repayment" ? "debt_repayment"
                      : transaction.type === "refund" ? "refund"
                        : "normal");
        transaction.categorySnapshot = transaction.categorySnapshot ?? (category || subCategory ? {
          categoryName: category?.name ?? "未分类",
          subCategoryName: subCategory?.name,
        } : undefined);
      });
    });
  }
}

export const rizhiDb = new RizhiDatabase();
