import { getAuthToken, handleUnauthorized } from "@/services/authService";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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
