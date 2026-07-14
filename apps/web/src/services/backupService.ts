import { rizhiDb } from "@/db/rizhiDb";
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
import { getAuthToken, handleUnauthorized } from "@/services/authService";
import { getApiBaseUrl, isRemoteDataSource, isUniCloudDataSource } from "@/services/apiConfig";

const BACKUP_FORMAT = "rizhi-local-backup";
const BACKUP_VERSION = 1;
const apiBaseUrl = getApiBaseUrl();

export type RizhiBackupPayload = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  app: "rizhi";
  data: {
    assets: AssetRecord[];
    assetAddons: AssetAddonRecord[];
    assetPartEvents: AssetPartEventRecord[];
    accounts: MoneyAccountRecord[];
    transactions: TransactionRecord[];
    accountFlows: AccountFlowRecord[];
    categories: CategoryRecord[];
    settings: UserSettingsRecord[];
    metadata: MetadataRecord[];
  };
};

type ApiSuccess<T> = {
  data: T;
};

type ApiFailure = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

function useRemoteDataSource() {
  return isRemoteDataSource();
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const useUniCloudTransport = isUniCloudDataSource();
  const requestedMethod = String(init?.method ?? "GET").toUpperCase();
  const cloudPayload = useUniCloudTransport
    ? {
        __rizhiTransport: true,
        method: requestedMethod,
        token: getAuthToken(),
        payload: init?.body ? JSON.parse(String(init.body)) : {},
      }
    : undefined;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    method: useUniCloudTransport ? "POST" : requestedMethod,
    body: useUniCloudTransport ? JSON.stringify(cloudPayload) : init?.body,
    headers: useUniCloudTransport
      ? requestedMethod === "GET"
        ? undefined
        : { "Content-Type": "text/plain;charset=UTF-8" }
      : {
          "Content-Type": "application/json",
          ...init?.headers,
        },
  });
  const payload = await response.json().catch(() => ({})) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || "error" in payload) {
    const message = "error" in payload ? payload.error.message : `HTTP ${response.status}`;
    if (response.status === 401 && useUniCloudTransport) handleUnauthorized();
    throw new Error(message);
  }

  return payload.data;
}

function assertArray(value: unknown, name: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`备份文件缺少 ${name} 数据`);
  }
}

export function validateBackupPayload(value: unknown): RizhiBackupPayload {
  if (!value || typeof value !== "object") {
    throw new Error("备份文件格式不正确");
  }

  const payload = value as Partial<RizhiBackupPayload>;
  if (payload.format !== BACKUP_FORMAT || payload.app !== "rizhi") {
    throw new Error("这不是日值的备份文件");
  }
  if (payload.version !== BACKUP_VERSION) {
    throw new Error(`暂不支持该备份版本：${String(payload.version)}`);
  }
  if (!payload.data || typeof payload.data !== "object") {
    throw new Error("备份文件缺少数据内容");
  }

  assertArray(payload.data.assets, "assets");
  assertArray(payload.data.assetAddons, "assetAddons");
  assertArray(payload.data.assetPartEvents, "assetPartEvents");
  assertArray(payload.data.accounts, "accounts");
  assertArray(payload.data.transactions, "transactions");
  assertArray(payload.data.accountFlows, "accountFlows");
  assertArray(payload.data.categories, "categories");
  assertArray(payload.data.settings, "settings");
  assertArray(payload.data.metadata, "metadata");

  return payload as RizhiBackupPayload;
}

export async function createBackupPayload(): Promise<RizhiBackupPayload> {
  if (useRemoteDataSource()) {
    const payload = await apiRequest<RizhiBackupPayload>("/export");
    return validateBackupPayload(payload);
  }

  const [assets, assetAddons, assetPartEvents, accounts, transactions, accountFlows, categories, settings, metadata] = await Promise.all([
    rizhiDb.assets.toArray(),
    rizhiDb.assetAddons.toArray(),
    rizhiDb.assetPartEvents.toArray(),
    rizhiDb.accounts.toArray(),
    rizhiDb.transactions.toArray(),
    rizhiDb.accountFlows.toArray(),
    rizhiDb.categories.toArray(),
    rizhiDb.settings.toArray(),
    rizhiDb.metadata.toArray(),
  ]);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: "rizhi",
    data: {
      assets,
      assetAddons,
      assetPartEvents,
      accounts,
      transactions,
      accountFlows,
      categories,
      settings,
      metadata,
    },
  };
}

export async function exportBackupText() {
  const payload = await createBackupPayload();
  return JSON.stringify(payload, null, 2);
}

export async function restoreBackupPayload(input: unknown) {
  const payload = validateBackupPayload(input);

  if (useRemoteDataSource()) {
    await apiRequest("/import", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return;
  }

  await rizhiDb.transaction(
    "rw",
    [
      rizhiDb.assets,
      rizhiDb.assetAddons,
      rizhiDb.assetPartEvents,
      rizhiDb.accounts,
      rizhiDb.transactions,
      rizhiDb.accountFlows,
      rizhiDb.categories,
      rizhiDb.settings,
      rizhiDb.metadata,
    ],
    async () => {
      await Promise.all([
        rizhiDb.assets.clear(),
        rizhiDb.assetAddons.clear(),
        rizhiDb.assetPartEvents.clear(),
        rizhiDb.accounts.clear(),
        rizhiDb.transactions.clear(),
        rizhiDb.accountFlows.clear(),
        rizhiDb.categories.clear(),
        rizhiDb.settings.clear(),
        rizhiDb.metadata.clear(),
      ]);

      await Promise.all([
        rizhiDb.assets.bulkPut(payload.data.assets),
        rizhiDb.assetAddons.bulkPut(payload.data.assetAddons),
        rizhiDb.assetPartEvents.bulkPut(payload.data.assetPartEvents),
        rizhiDb.accounts.bulkPut(payload.data.accounts),
        rizhiDb.transactions.bulkPut(payload.data.transactions),
        rizhiDb.accountFlows.bulkPut(payload.data.accountFlows),
        rizhiDb.categories.bulkPut(payload.data.categories),
        rizhiDb.settings.bulkPut(payload.data.settings),
        rizhiDb.metadata.bulkPut(payload.data.metadata),
      ]);
    },
  );
}

export async function restoreBackupText(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("备份文件不是有效的 JSON");
  }

  await restoreBackupPayload(parsed);
}

export const backupService = {
  createPayload: createBackupPayload,
  exportText: exportBackupText,
  restorePayload: restoreBackupPayload,
  restoreText: restoreBackupText,
  validate: validateBackupPayload,
};
