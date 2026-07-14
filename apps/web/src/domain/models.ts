export type ID = string;

export type AssetStatus = "using" | "idle" | "transferred" | "disposed";
export type AssetPartEventType = "transferred" | "disposed" | "replaced" | "removed";
export type AssetCategoryKind = "digital" | "clothing" | "home" | "sports" | "subscription" | "other";
export type CurrencyCode = "CNY" | "USD" | "HKD" | "EUR" | "JPY" | "GBP";
export type PurchaseChannel = "online" | "offline" | "secondhand" | "gift" | "company_benefit" | "transfer" | "other";
export type CurrentValueSource = "manual" | "market" | "depreciation" | "transfer" | "system";
export type AssetAttachmentType = "asset_image" | "order" | "invoice" | "receipt" | "warranty" | "other";
export type AccountDirection = "asset" | "liability";
export type AccountType =
  | "cash"
  | "wallet"
  | "debit_card"
  | "credit_card"
  | "consumer_credit"
  | "loan"
  | "investment"
  | "other";
export type TransactionType = "expense" | "income" | "transfer" | "refund" | "repayment" | "asset_purchase";
export type TransactionBusinessType = "normal" | "asset_purchase" | "asset_addon" | "asset_transfer" | "debt_repayment" | "refund" | "account_transfer" | "balance_adjustment" | "legacy_part_event";
export type CategoryDomain = "asset" | "transaction" | "account" | "bank";
export type CategoryScope = "asset" | "expense" | "income";
export type AccountTypeGroup = "asset" | "credit" | "stored_value";
export type FlowDirection = "in" | "out";

export type TimestampFields = {
  createdAt: string;
  updatedAt: string;
};

export type AssetAttachmentRecord = {
  id: ID;
  type: AssetAttachmentType;
  name: string;
  url: string;
  storageFileId?: string;
  sort: number;
  isCover?: boolean;
  createdAt: string;
};

export type AssetRecord = TimestampFields & {
  id: ID;
  userId: ID;
  name: string;
  brand?: string;
  model?: string;
  categoryId: ID;
  status: AssetStatus;
  originalCost: number;
  currency: CurrencyCode;
  currentValue?: number;
  currentValueUpdatedAt?: string;
  currentValueSource?: CurrentValueSource;
  purchaseDate: string;
  firstUseDate?: string;
  lastUsedAt?: string;
  idleSince?: string;
  purchaseChannel?: PurchaseChannel;
  merchant?: string;
  orderNo?: string;
  paymentAccountId?: ID;
  purchaseTransactionId?: ID;
  transferDate?: string;
  transferAmount?: number;
  transferAccountId?: ID;
  transferTransactionId?: ID;
  disposedAt?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  expectedUseDays?: number;
  notes?: string;
  attachments?: AssetAttachmentRecord[];
};

export type AssetAddonRecord = TimestampFields & {
  id: ID;
  assetId: ID;
  name: string;
  direction?: "expense" | "income";
  type: "accessory" | "repair" | "maintenance" | "upgrade" | "consumable" | "other";
  amount: number;
  currency?: CurrencyCode;
  purchaseDate: string;
  merchant?: string;
  paymentAccountId?: ID;
  transactionId?: ID;
  includedInCost: boolean;
  notes?: string;
  attachments?: AssetAttachmentRecord[];
};

export type AssetPartEventRecord = TimestampFields & {
  id: ID;
  assetId: ID;
  name: string;
  type: AssetPartEventType;
  estimatedOriginalCost?: number;
  amount?: number;
  occurredAt: string;
  accountId?: ID;
  transactionId?: ID;
  currentValueAdjustment?: number;
  notes?: string;
};

export type MoneyAccountRecord = TimestampFields & {
  id: ID;
  accountTypeId?: ID;
  name: string;
  type: AccountType;
  direction: AccountDirection;
  balance: number;
  institution?: string;
  creditLimit?: number;
  billDay?: number;
  repaymentDay?: number;
  color?: string;
  icon?: string;
  iconUrl?: string;
  iconFileId?: string;
  bankName?: string;
  bankId?: ID;
  note?: string;
  enabled?: boolean;
};

export type TransactionRecord = TimestampFields & {
  id: ID;
  type: TransactionType;
  categoryId: ID;
  subCategoryId?: ID;
  businessType?: TransactionBusinessType;
  categorySnapshot?: {
    categoryName: string;
    subCategoryName?: string;
  };
  amount: number;
  occurredAt: string;
  accountId: ID;
  relatedAccountId?: ID;
  assetId?: ID;
  assetSnapshot?: {
    id: ID;
    name: string;
  };
  addonId?: ID;
  partEventId?: ID;
  merchant?: string;
  note?: string;
  receiptUrl?: string;
};

export type AccountFlowRecord = TimestampFields & {
  id: ID;
  accountId: ID;
  transactionId: ID;
  direction: FlowDirection;
  amount: number;
  occurredAt: string;
  balanceAfter: number;
  note?: string;
};

export type CategoryRecord = {
  id: ID;
  domain: CategoryDomain;
  type?: TransactionType | AccountType | AssetCategoryKind;
  name: string;
  sort: number;
  parentId?: ID;
  color?: string;
  icon?: string;
  iconUrl?: string;
  iconFileId?: string;
  scopes?: CategoryScope[];
  bankName?: string;
  bankId?: ID;
  monthlyBudget?: number;
  enabled?: boolean;
  isSystem?: boolean;
  accountGroup?: AccountTypeGroup;
  accountDirection?: AccountDirection;
  deletedAt?: string;
};

export type UserSettingsRecord = TimestampFields & {
  id: ID;
  currency: "CNY";
  locale: "zh-CN";
  theme: "light" | "dark" | "system";
  displayName?: string;
  avatarDataUrl?: string;
  avatarFileId?: string;
  notificationReadIds?: string[];
  notificationIgnoredIds?: string[];
  warrantyReminderDays?: number;
  repaymentReminderDays?: number;
  idleReminderDays?: number;
};

export type MetadataRecord = {
  key: string;
  value: string;
};

