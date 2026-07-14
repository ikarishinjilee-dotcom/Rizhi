import type {
  AccountRepository,
  AppDataRepository,
  AppDataSnapshot,
  AssetAddonRepository,
  AssetRepository,
  CategoryRepository,
  CategoryUsage,
  CreateAccountInput,
  CreateAddonInput,
  CreateAssetInput,
  CreateCategoryInput,
  CreateTransactionInput,
  ListCategoriesInput,
  MigrateCategoryTransactionsInput,
  RepayDebtInput,
  TransactionRepository,
  TransferAssetInput,
  TransferInput,
  UpdateAccountInput,
  UpdateAddonInput,
  UpdateAssetInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
} from "@/repositories/contracts";
import type { AssetAddonRecord, AssetAttachmentRecord, AssetRecord, CategoryRecord, ID, MoneyAccountRecord, TransactionRecord } from "@/domain/models";
import { getAuthToken, handleUnauthorized } from "@/services/authService";
import { getApiBaseUrl, isUniCloudDataSource } from "@/services/apiConfig";
import { uploadImageDataUrl } from "@/services/cloudApiService";

const apiBaseUrl = getApiBaseUrl();
const userId = import.meta.env.VITE_USER_ID?.trim() || "user-local";
const useUniCloudTransport = isUniCloudDataSource();

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    cache: "no-store",
    headers: useUniCloudTransport
      ? requestedMethod === "GET"
        ? undefined
        : { "Content-Type": "text/plain;charset=UTF-8" }
      : {
          "Content-Type": "application/json",
          "X-Rizhi-User-ID": userId,
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

function jsonBody(input: unknown): RequestInit {
  return {
    body: JSON.stringify(input),
  };
}

async function withImageAttachments<T extends { imageUrl?: string; imageUrls?: string[]; attachments?: AssetAttachmentRecord[] }>(
  input: T,
  purpose: "asset" | "addon",
) {
  let prepared: T | (Omit<T, "imageUrl" | "imageUrls"> & { attachments: AssetAttachmentRecord[] }) = input;
  if (input.attachments || (!("imageUrl" in input) && !("imageUrls" in input))) {
    prepared = input;
  } else {
  const urls = [input.imageUrl, ...(input.imageUrls ?? [])]
    .filter((url): url is string => Boolean(url))
    .filter((url, index, items) => items.indexOf(url) === index);
  const attachments: AssetAttachmentRecord[] = urls.map((url, index) => ({
    id: `att-${crypto.randomUUID()}`,
    type: "asset_image",
    name: index === 0 ? "主图" : `图片 ${index + 1}`,
    url,
    sort: index + 1,
    isCover: index === 0,
    createdAt: new Date().toISOString(),
  }));
  const { imageUrl: _imageUrl, imageUrls: _imageUrls, ...rest } = input;
    prepared = { ...rest, attachments };
  }

  const attachments = prepared.attachments;
  if (!useUniCloudTransport || !attachments?.some((attachment) => attachment.url.startsWith("data:image/"))) return prepared;
  const uploadedAttachments = await Promise.all(attachments.map(async (attachment) => {
    if (!attachment.url.startsWith("data:image/")) return attachment;
    const uploaded = await uploadImageDataUrl(attachment.url, purpose);
    return { ...attachment, url: uploaded.url, storageFileId: uploaded.fileId };
  }));
  return { ...prepared, attachments: uploadedAttachments };
}

export const httpAppDataRepository: AppDataRepository = {
  async initialize() {
    await request("/health");
    if (useUniCloudTransport) {
      await request("/files/migrate-images", { method: "POST" });
    }
  },

  async reset() {
    await request("/reset", { method: "POST" });
  },

  async getSnapshot() {
    return request<AppDataSnapshot>("/snapshot");
  },
};

export const httpAssetRepository: AssetRepository = {
  async create(input: CreateAssetInput) {
    return request<AssetRecord>("/assets", { method: "POST", ...jsonBody(await withImageAttachments(input, "asset")) });
  },

  async update(input: UpdateAssetInput) {
    const { id, ...body } = input;
    return request<AssetRecord>(`/assets/${encodeURIComponent(id)}`, { method: "PATCH", ...jsonBody(await withImageAttachments(body, "asset")) });
  },

  async delete(id: ID) {
    await request(`/assets/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  transfer(input: TransferAssetInput) {
    const { assetId, ...body } = input;
    return request<TransactionRecord>(`/assets/${encodeURIComponent(assetId)}/transfer`, { method: "POST", ...jsonBody(body) });
  },

  async revokeTransfer(assetId: ID) {
    await request(`/assets/${encodeURIComponent(assetId)}/transfer/revoke`, { method: "POST" });
  },
};

export const httpAssetAddonRepository: AssetAddonRepository = {
  async create(input: CreateAddonInput) {
    const { assetId, ...body } = input;
    return request<AssetAddonRecord>(`/assets/${encodeURIComponent(assetId)}/addons`, { method: "POST", ...jsonBody(await withImageAttachments(body, "addon")) });
  },

  async update(input: UpdateAddonInput) {
    const { id, ...body } = input;
    return request<AssetAddonRecord>(`/addons/${encodeURIComponent(id)}`, { method: "PATCH", ...jsonBody(await withImageAttachments(body, "addon")) });
  },

  async delete(id: ID) {
    await request(`/addons/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

export const httpTransactionRepository: TransactionRepository = {
  create(input: CreateTransactionInput) {
    const endpoint = input.type === "income" ? "/transactions/income" : "/transactions/expense";
    const { type: _type, ...body } = input;
    return request<TransactionRecord>(endpoint, { method: "POST", ...jsonBody(body) });
  },

  update(input: UpdateTransactionInput) {
    const { id, ...body } = input;
    return request<TransactionRecord>(`/transactions/${encodeURIComponent(id)}`, { method: "PATCH", ...jsonBody(body) });
  },

  convertToAssetAddon(input) {
    return request<{ addon: AssetAddonRecord; transaction: TransactionRecord }>("/transactions/convert-to-asset-addon", { method: "POST", ...jsonBody(input) });
  },

  async delete(id: ID) {
    await request(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

export const httpAccountRepository: AccountRepository = {
  create(input: CreateAccountInput) {
    return request<MoneyAccountRecord>("/accounts", { method: "POST", ...jsonBody(input) });
  },

  update(input: UpdateAccountInput) {
    const { id, ...body } = input;
    return request<MoneyAccountRecord>(`/accounts/${encodeURIComponent(id)}`, { method: "PATCH", ...jsonBody(body) });
  },

  async delete(id: string) {
    await request(`/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  transfer(input: TransferInput) {
    return request<TransactionRecord>("/accounts/transfer", { method: "POST", ...jsonBody(input) });
  },

  repayDebt(input: RepayDebtInput) {
    return request<TransactionRecord>("/transactions/repayment", { method: "POST", ...jsonBody(input) });
  },
};

export const httpCategoryRepository: CategoryRepository = {
  list(input: ListCategoriesInput = {}) {
    const params = new URLSearchParams();
    if (input.domain) params.set("domain", input.domain);
    if (input.type) params.set("type", input.type);
    if (input.scope) params.set("scope", input.scope);
    if (input.enabled !== undefined) params.set("enabled", String(input.enabled));
    const query = params.toString();
    return request<CategoryRecord[]>(`/categories${query ? `?${query}` : ""}`);
  },

  create(input: CreateCategoryInput) {
    return request<CategoryRecord>("/categories", { method: "POST", ...jsonBody(input) });
  },

  update(input: UpdateCategoryInput) {
    const { id, ...body } = input;
    return request<CategoryRecord>(`/categories/${encodeURIComponent(id)}`, { method: "PATCH", ...jsonBody(body) });
  },

  async delete(id: ID) {
    await request(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async usage(_id: ID): Promise<CategoryUsage> {
    return request<CategoryUsage>(`/categories/${encodeURIComponent(_id)}/usage`);
  },

  async migrateTransactions(input: MigrateCategoryTransactionsInput): Promise<number> {
    const { fromCategoryId, ...body } = input;
    const result = await request<{ migratedCount: number }>(`/categories/${encodeURIComponent(fromCategoryId)}/migrate-transactions`, { method: "POST", ...jsonBody(body) });
    return result.migratedCount;
  },
};
