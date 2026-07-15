import { getAuthToken, handleUnauthorized } from "@/services/authService";
import { isUniCloudDataSource, requireApiBaseUrl, requireUniCloudMode } from "@/services/apiConfig";

async function request<T>(path: string, method: "GET" | "POST" | "PATCH", payload: Record<string, unknown> = {}) {
  requireUniCloudMode("云端资料和图片同步");
  const apiBaseUrl = requireApiBaseUrl();
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
  return isUniCloudDataSource();
}

export function uploadImageDataUrl(dataUrl: string, purpose: "asset" | "addon" | "avatar" | "category_icon" | "site_icon") {
  return request<{ fileId: string; url: string }>("/files/images", "POST", { dataUrl, purpose });
}

export type CloudSiteBranding = {
  logoUrl?: string;
  mainLogoUrl?: string;
  faviconUrl?: string;
  homeLogoUrl?: string;
  homeHeroUrl?: string;
  homeTitle?: string;
  homeDescription?: string;
  logoFileId?: string;
  mainLogoFileId?: string;
  faviconFileId?: string;
  homeLogoFileId?: string;
  homeHeroFileId?: string;
};

export function getCloudSiteBranding() {
  return request<CloudSiteBranding>("/site-branding", "GET");
}

export function updateCloudSiteBranding(input: {
  logoFileId?: string;
  mainLogoFileId?: string;
  faviconFileId?: string;
  homeLogoFileId?: string;
  homeHeroFileId?: string;
  homeTitle?: string;
  homeDescription?: string;
}) {
  return request<CloudSiteBranding>("/site-branding", "PATCH", input);
}

export function getCloudUserProfile() {
  return request<CloudUserProfile | null>("/profile", "GET");
}

export function updateCloudUserProfile(input: { displayName: string; avatarFileId?: string }) {
  return request<CloudUserProfile>("/profile", "PATCH", input);
}
