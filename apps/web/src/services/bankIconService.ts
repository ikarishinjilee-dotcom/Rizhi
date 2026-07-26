import type { CategoryRecord, MoneyAccountRecord } from "@/domain/models";
import { getIconDefinition } from "@/domain/iconLibrary";
import { categoryService } from "@/services/categoryService";

let systemBanksCache: CategoryRecord[] | null = null;
let systemBanksPromise: Promise<CategoryRecord[]> | null = null;

export async function loadSystemBankCategories(force = false) {
  if (force) {
    systemBanksCache = null;
    systemBanksPromise = null;
  }
  if (systemBanksCache) return systemBanksCache;
  systemBanksPromise ??= categoryService.list({ scope: "system", domain: "bank", enabled: true }).catch(() => []);
  systemBanksCache = await systemBanksPromise;
  return systemBanksCache;
}

function normalize(value?: string) {
  return (value || "").replace(/[\s()\uFF08\uFF09_\-]/g, "").toLocaleLowerCase("zh-CN");
}

// Accounts are often named with a short bank hint (for example “邮政卡8541”),
// while the system category stores the full institution name. Keep these
// stable keywords so custom bank icons resolve in every account picker.
const bankKeywords = [
  "\u5de5\u5546", "\u519c\u4e1a", "\u4e2d\u56fd\u94f6\u884c", "\u5efa\u8bbe", "\u4ea4\u901a", "\u62db\u5546", "\u90ae\u653f", "\u50a8\u84c4", "\u6d66\u53d1", "\u6c11\u751f", "\u5174\u4e1a", "\u5149\u5927", "\u534e\u590f", "\u5e73\u5b89", "\u4e2d\u4fe1", "\u5e7f\u53d1", "\u6e23\u6253", "\u6c47\u4e30",
];

function bankAliases(value?: string) {
  const normalized = normalize(value);
  if (!normalized) return [];
  const aliases = new Set([normalized]);
  bankKeywords.forEach((keyword) => {
    if (normalized.includes(keyword)) aliases.add(keyword);
  });
  const shortened = normalized
    .replace(/^\u4e2d\u56fd/, "")
    .replace(/(\u80a1\u4efd\u6709\u9650\u516c\u53f8|\u6709\u9650\u516c\u53f8|\u50a8\u84c4\u94f6\u884c|\u5546\u4e1a\u94f6\u884c|\u94f6\u884c)$/, "");
  if (shortened.length >= 2) aliases.add(shortened);
  return [...aliases];
}

export function resolveBankCategory(source: CategoryRecord | MoneyAccountRecord | null | undefined, banks: CategoryRecord[]) {
  if (!source) return undefined;
  const bankId = "bankId" in source ? source.bankId : undefined;
  const sourceCategoryId = (source as CategoryRecord & { sourceCategoryId?: string }).sourceCategoryId;
  const bank = banks.find((item) => item.id === bankId || item.id === sourceCategoryId);
  if (bank) return bank;
  const values = [source.name, "bankName" in source ? source.bankName : undefined, "institution" in source ? source.institution : undefined]
    .flatMap(bankAliases);
  return banks.find((item) => {
    const aliases = bankAliases(item.name);
    return aliases.some((name) => name.length >= 2 && values.some((value) => value.includes(name) || name.includes(value)));
  });
}

export function resolveBankIcon(source: CategoryRecord | MoneyAccountRecord | null | undefined, banks: CategoryRecord[]) {
  if (!source) return undefined;
  const bank = resolveBankCategory(source, banks);
  const libraryKey = source.iconKey || bank?.iconKey;
  const libraryAsset = libraryKey ? getIconDefinition(libraryKey)?.assetUrl : undefined;
  return libraryAsset || source.iconUrl || bank?.iconUrl;
}

export function resolveBankIconKey(source: CategoryRecord | MoneyAccountRecord | null | undefined, banks: CategoryRecord[]) {
  if (!source) return undefined;
  if (source.iconKey) return source.iconKey;
  return resolveBankCategory(source, banks)?.iconKey;
}
