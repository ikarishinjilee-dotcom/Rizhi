import { HttpError } from "../errors.ts";
import {
  nowIso,
  readJsonDb,
  resetJsonDb,
  writeJsonDb,
  type AccountFlowRecord,
  type AssetAddonRecord,
  type AssetRecord,
  type CategoryRecord,
  type MoneyAccountRecord,
  type RizhiData,
  type TransactionRecord,
} from "../db/sqliteStore.ts";

const backupFormat = "rizhi-local-backup";
const backupVersion = 1;

type BackupPayload = {
  format: typeof backupFormat;
  version: typeof backupVersion;
  exportedAt: string;
  app: "rizhi";
  data: {
    assets: AssetRecord[];
    assetAddons: AssetAddonRecord[];
    assetPartEvents: Record<string, unknown>[];
    accounts: MoneyAccountRecord[];
    transactions: TransactionRecord[];
    accountFlows: AccountFlowRecord[];
    categories: CategoryRecord[];
    settings: Record<string, unknown>[];
    metadata: Record<string, unknown>[];
  };
};

export async function getSnapshot() {
  const data = await readJsonDb();
  return {
    assets: data.assets ?? [],
    assetAddons: data.assetAddons ?? [],
    assetPartEvents: data.assetPartEvents ?? [],
    accounts: data.accounts ?? [],
    transactions: data.transactions ?? [],
    accountFlows: data.accountFlows ?? [],
    categories: data.categories ?? [],
    settings: data.settings,
    meta: data.meta,
  };
}

export async function resetData() {
  return resetJsonDb();
}

export async function exportData(): Promise<BackupPayload> {
  const data = await readJsonDb();
  return {
    format: backupFormat,
    version: backupVersion,
    exportedAt: nowIso(),
    app: "rizhi",
    data: {
      assets: data.assets ?? [],
      assetAddons: data.assetAddons ?? [],
      assetPartEvents: data.assetPartEvents ?? [],
      accounts: data.accounts ?? [],
      transactions: data.transactions ?? [],
      accountFlows: data.accountFlows ?? [],
      categories: data.categories ?? [],
      settings: normalizeSettingsForBackup(data.settings),
      metadata: normalizeMetadataForBackup(data),
    },
  };
}

export async function importData(input: unknown) {
  const payload = validateBackupPayload(input);
  const nextData: RizhiData = {
    meta: {
      version: payload.version,
      createdAt: payload.exportedAt,
      importedAt: nowIso(),
    },
    settings: payload.data.settings[0] ?? {},
    metadata: payload.data.metadata,
    assets: payload.data.assets,
    assetAddons: payload.data.assetAddons,
    assetPartEvents: payload.data.assetPartEvents,
    accounts: payload.data.accounts,
    transactions: payload.data.transactions,
    accountFlows: payload.data.accountFlows,
    categories: payload.data.categories,
  };

  await writeJsonDb(nextData);

  return {
    imported: true,
    counts: {
      assets: nextData.assets?.length ?? 0,
      assetAddons: nextData.assetAddons?.length ?? 0,
      transactions: nextData.transactions?.length ?? 0,
      accounts: nextData.accounts.length,
      accountFlows: nextData.accountFlows?.length ?? 0,
      categories: nextData.categories?.length ?? 0,
    },
  };
}

function normalizeSettingsForBackup(settings: RizhiData["settings"]): Record<string, unknown>[] {
  if (Array.isArray(settings)) return settings;
  if (settings && typeof settings === "object") return [settings];
  return [];
}

function normalizeMetadataForBackup(data: RizhiData): Record<string, unknown>[] {
  if (Array.isArray(data.metadata)) return data.metadata;
  if (data.meta && typeof data.meta === "object") return [data.meta];
  return [];
}

function validateBackupPayload(value: unknown): BackupPayload {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "VALIDATION_ERROR", "备份文件格式不正确");
  }

  const payload = value as Partial<BackupPayload>;
  if (payload.format !== backupFormat || payload.app !== "rizhi") {
    throw new HttpError(400, "VALIDATION_ERROR", "这不是日值的备份文件");
  }
  if (payload.version !== backupVersion) {
    throw new HttpError(400, "VALIDATION_ERROR", `暂不支持该备份版本：${String(payload.version)}`);
  }
  if (!payload.data || typeof payload.data !== "object") {
    throw new HttpError(400, "VALIDATION_ERROR", "备份文件缺少数据内容");
  }

  for (const key of ["assets", "assetAddons", "assetPartEvents", "accounts", "transactions", "accountFlows", "categories", "settings", "metadata"] as const) {
    if (!Array.isArray(payload.data[key])) {
      throw new HttpError(400, "VALIDATION_ERROR", `备份文件缺少 ${key} 数据`);
    }
  }

  return payload as BackupPayload;
}
