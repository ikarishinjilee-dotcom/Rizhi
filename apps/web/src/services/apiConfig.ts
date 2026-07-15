export type RizhiDataSource = "indexeddb" | "unicloud";

export function getDataSource(): RizhiDataSource {
  const value = import.meta.env.VITE_DATA_SOURCE;
  if (value === "unicloud") return value;
  return "indexeddb";
}

export function isUniCloudDataSource() {
  return getDataSource() === "unicloud";
}

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
}

export function requireApiBaseUrl() {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error("尚未配置业务 API 地址");
  return apiBaseUrl;
}

export function requireUniCloudMode(featureName: string) {
  if (!isUniCloudDataSource()) {
    throw new Error(`${featureName}仅在 uniCloud 模式可用；IndexedDB 本地模式暂不需要登录账户。`);
  }
}
