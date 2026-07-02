import type {
  AccountFlowRecord,
  AssetAddonRecord,
  AssetAttachmentRecord,
  AssetRecord,
  CategoryRecord,
  CategoryDomain,
  CurrencyCode,
  CurrentValueSource,
  ID,
  MoneyAccountRecord,
  PurchaseChannel,
  TransactionRecord,
  TransactionBusinessType,
  TransactionType,
} from "@/domain/models";

export type AppDataSnapshot = {
  assets: AssetRecord[];
  assetAddons: AssetAddonRecord[];
  accounts: MoneyAccountRecord[];
  transactions: TransactionRecord[];
  accountFlows: AccountFlowRecord[];
  categories: CategoryRecord[];
};

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
  accountId: ID;
  assetId?: ID;
  addonId?: ID;
  merchant?: string;
  note?: string;
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
  institution?: string;
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

export type CreateCategoryInput = {
  domain: CategoryDomain;
  name: string;
  type?: CategoryRecord["type"];
  sort?: number;
  parentId?: ID;
  color?: string;
  icon?: string;
  monthlyBudget?: number;
  enabled?: boolean;
  isSystem?: boolean;
  deletedAt?: string;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput> & {
  id: ID;
};

export type ListCategoriesInput = {
  domain?: CategoryDomain;
  type?: CategoryRecord["type"];
  enabled?: boolean;
};

export type MigrateCategoryTransactionsInput = {
  fromCategoryId: ID;
  toCategoryId: ID;
  toSubCategoryId?: ID;
};

export type CategoryUsage = {
  assets: number;
  transactions: number;
  childCategories: number;
  accounts: number;
  total: number;
};

export type AppDataRepository = {
  initialize(): Promise<void>;
  reset(): Promise<void>;
  getSnapshot(): Promise<AppDataSnapshot>;
};

export type AssetRepository = {
  create(input: CreateAssetInput): Promise<AssetRecord>;
  update(input: UpdateAssetInput): Promise<AssetRecord>;
  delete(id: ID): Promise<void>;
  transfer(input: TransferAssetInput): Promise<TransactionRecord>;
  revokeTransfer(assetId: ID): Promise<void>;
};

export type AssetAddonRepository = {
  create(input: CreateAddonInput): Promise<AssetAddonRecord>;
  update(input: UpdateAddonInput): Promise<AssetAddonRecord>;
  delete(id: ID): Promise<void>;
};

export type AccountRepository = {
  create(input: CreateAccountInput): Promise<MoneyAccountRecord>;
  update(input: UpdateAccountInput): Promise<MoneyAccountRecord>;
  delete(id: ID): Promise<void>;
  transfer(input: TransferInput): Promise<TransactionRecord>;
  repayDebt(input: RepayDebtInput): Promise<TransactionRecord>;
};

export type TransactionRepository = {
  create(input: CreateTransactionInput): Promise<TransactionRecord>;
  update(input: UpdateTransactionInput): Promise<TransactionRecord>;
  convertToAssetAddon(input: ConvertTransactionToAddonInput): Promise<{
    addon: AssetAddonRecord;
    transaction: TransactionRecord;
  }>;
  delete(id: ID): Promise<void>;
};

export type CategoryRepository = {
  list(input?: ListCategoriesInput): Promise<CategoryRecord[]>;
  create(input: CreateCategoryInput): Promise<CategoryRecord>;
  update(input: UpdateCategoryInput): Promise<CategoryRecord>;
  delete(id: ID): Promise<void>;
  usage(id: ID): Promise<CategoryUsage>;
  migrateTransactions(input: MigrateCategoryTransactionsInput): Promise<number>;
};
