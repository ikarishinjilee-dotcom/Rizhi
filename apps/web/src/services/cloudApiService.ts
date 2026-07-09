import { getAuthToken, handleUnauthorized } from "@/services/authService";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request<T>(path: string, method: "GET" | "POST" | "PATCH", payload: Record<string, unknown> = {}) {
  if (!apiBaseUrl) throw new Error("尚未配置业务 API 地址");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      __rizhiTransport: true,
      method,
      token: getAuthToken(),
      payload,
    }),
  });
  const result = await response.json().catch(() => ({})) as {
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok || result.error) {
    if (response.status === 401) handleUnauthorized();
    throw new Error(result.error?.message || `云端请求失败（${response.status}）`);
  }
  return result.data as T;
}

export type CloudUserProfile = {
  displayName: string;
  avatarFileId?: string;
  avatarUrl?: string;
};

export function isCloudDataSource() {
  return import.meta.env.VITE_DATA_SOURCE === "unicloud";
}

export function uploadImageDataUrl(dataUrl: string, purpose: "asset" | "addon" | "avatar" | "category_icon") {
  return request<{ fileId: string; url: string }>("/files/images", "POST", { dataUrl, purpose });
}

export function getCloudUserProfile() {
  return request<CloudUserProfile | null>("/profile", "GET");
}

export function updateCloudUserProfile(input: { displayName: string; avatarFileId?: string }) {
  return request<CloudUserProfile>("/profile", "PATCH", input);
}
