import { getAuthToken, handleUnauthorized } from "@/services/authService";
import { isUniCloudDataSource, requireApiBaseUrl, requireUniCloudMode } from "@/services/apiConfig";

export const permissionKeys = ["system_users", "default_categories", "account_types", "banks", "branding"] as const;
export type PermissionKey = typeof permissionKeys[number];
export type PermissionRole = "super_admin" | "admin" | "user";
export type PermissionMatrix = Record<PermissionRole, Record<PermissionKey, boolean>>;

export const permissionDefaults: PermissionMatrix = {
  super_admin: Object.fromEntries(permissionKeys.map((key) => [key, true])) as PermissionMatrix["super_admin"],
  admin: Object.fromEntries(permissionKeys.map((key) => [key, true])) as PermissionMatrix["admin"],
  user: Object.fromEntries(permissionKeys.map((key) => [key, false])) as PermissionMatrix["user"],
};

export type PartialPermissionMatrix = {
  [role in PermissionRole]?: Partial<PermissionMatrix[role]>;
};

export function normalizePermissionMatrix(input?: PartialPermissionMatrix): PermissionMatrix {
  return {
    super_admin: { ...permissionDefaults.super_admin },
    admin: { ...permissionDefaults.admin, ...(input?.admin || {}) },
    user: { ...permissionDefaults.user, ...(input?.user || {}) },
  };
}

async function request<T>(method: "GET" | "PATCH", matrix?: PermissionMatrix) {
  requireUniCloudMode("管理员权限设置");
  const response = await fetch(`${requireApiBaseUrl()}/admin/permissions`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ __rizhiTransport: true, method, token: getAuthToken(), payload: method === "PATCH" ? { matrix } : {} }),
  });
  const result = await response.json().catch(() => ({})) as { data?: PermissionMatrix; error?: { message?: string } };
  if (!response.ok || result.error) {
    if (response.status === 401) handleUnauthorized();
    throw new Error(result.error?.message || "权限设置请求失败");
  }
  return normalizePermissionMatrix(result.data);
}

export function isPermissionCloudAvailable() {
  return isUniCloudDataSource();
}

export function getCloudPermissionMatrix() {
  return request<PermissionMatrix>("GET");
}

export function updateCloudPermissionMatrix(matrix: PermissionMatrix) {
  return request<PermissionMatrix>("PATCH", matrix);
}
