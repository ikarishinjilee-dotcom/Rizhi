import { getAuthToken, handleUnauthorized } from "@/services/authService";
import { requireApiBaseUrl, requireUniCloudMode } from "@/services/apiConfig";

export type AdminUser = {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  roles: string[];
  status?: number;
  isCurrent?: boolean;
  registeredAt?: number;
};

async function adminRequest<T>(path: string, method = "GET", payload: Record<string, unknown> = {}) {
  requireUniCloudMode("用户和权限管理");
  const apiBaseUrl = requireApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: method === "GET" ? undefined : { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      __rizhiTransport: true,
      method,
      token: getAuthToken(),
      payload,
    }),
  });
  const result = await response.json().catch(() => ({})) as { data?: T; error?: { message?: string } };
  if (!response.ok || result.error) {
    if (response.status === 401) handleUnauthorized();
    if (response.status === 404) {
      throw new Error("用户与角色接口尚未部署，请重新部署测试线 rizhi-api 云函数");
    }
    throw new Error(result.error?.message || "管理员请求失败");
  }
  return result.data as T;
}

export function listAdminUsers() {
  return adminRequest<AdminUser[]>("/admin/users");
}

export function setUserAdminRole(userId: string, enabled: boolean) {
  return adminRequest<{ id: string; roles: string[] }>(
    `/admin/users/${encodeURIComponent(userId)}/admin-role`,
    "PATCH",
    { enabled },
  );
}

export function setUserEnabled(userId: string, enabled: boolean) {
  return adminRequest<{ id: string; status: number }>(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    "PATCH",
    { enabled },
  );
}
