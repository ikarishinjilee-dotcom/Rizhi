import { reactive } from "vue";
import { rizhiDb } from "@/db/rizhiDb";

const TOKEN_KEY = "rizhi_uni_id_token";
const TOKEN_EXPIRED_KEY = "rizhi_uni_id_token_expired";
const USERNAME_KEY = "rizhi_uni_id_username";
const DEVICE_ID_KEY = "rizhi_device_id";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const browserStorage = typeof window === "undefined" ? null : window.localStorage;

type UniIdResponse = {
  errCode?: string | number;
  errMsg?: string;
  newToken?: {
    token: string;
    tokenExpired: number;
  };
  captchaBase64?: string;
};

export const authSession = reactive({
  token: browserStorage?.getItem(TOKEN_KEY) || "",
  tokenExpired: Number(browserStorage?.getItem(TOKEN_EXPIRED_KEY) || 0),
  username: browserStorage?.getItem(USERNAME_KEY) || "",
});

export function isUniCloudMode() {
  return import.meta.env.VITE_DATA_SOURCE === "unicloud";
}

export function getAuthToken() {
  if (!authSession.token) return "";
  if (authSession.tokenExpired && authSession.tokenExpired <= Date.now()) {
    clearSession();
    return "";
  }
  return authSession.token;
}

export function hasActiveSession() {
  return !isUniCloudMode() || Boolean(getAuthToken());
}

export function clearSession() {
  authSession.token = "";
  authSession.tokenExpired = 0;
  authSession.username = "";
  browserStorage?.removeItem(TOKEN_KEY);
  browserStorage?.removeItem(TOKEN_EXPIRED_KEY);
  browserStorage?.removeItem(USERNAME_KEY);
}

function saveSession(username: string, token: string, tokenExpired: number) {
  authSession.username = username;
  authSession.token = token;
  authSession.tokenExpired = tokenExpired;
  browserStorage?.setItem(USERNAME_KEY, username);
  browserStorage?.setItem(TOKEN_KEY, token);
  browserStorage?.setItem(TOKEN_EXPIRED_KEY, String(tokenExpired));
}

function getDeviceId() {
  const existing = browserStorage?.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const value = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  browserStorage?.setItem(DEVICE_ID_KEY, value);
  return value;
}

async function callAuthApi(method: string, params: Record<string, unknown>) {
  if (!apiBaseUrl) throw new Error("尚未配置业务 API 地址");
  const response = await fetch(`${apiBaseUrl}/auth/${method}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      __rizhiTransport: true,
      method: "POST",
      token: getAuthToken(),
      payload: {
        ...params,
        deviceId: getDeviceId(),
      },
    }),
  });
  const result = await response.json().catch(() => ({})) as {
    data?: UniIdResponse;
    error?: { message?: string };
  };
  if (!response.ok || result.error || result.data?.errCode) {
    throw new Error(result.error?.message || result.data?.errMsg || `登录服务请求失败（${response.status}）`);
  }
  return result.data || {};
}

export async function login(username: string, password: string) {
  const result = await callAuthApi("login", { username, password });
  if (!result.newToken?.token) throw new Error("登录成功但未返回 Token");
  saveSession(username, result.newToken.token, Number(result.newToken.tokenExpired || 0));
}

export async function loadRegisterCaptcha() {
  const result = await callAuthApi("captcha", {});
  if (!result.captchaBase64) throw new Error("验证码加载失败");
  return result.captchaBase64;
}

export async function registerAccount(input: {
  username: string;
  nickname?: string;
  password: string;
  captcha: string;
}) {
  const result = await callAuthApi("register", input);
  if (!result.newToken?.token) throw new Error("注册成功但未返回 Token");
  saveSession(input.username, result.newToken.token, Number(result.newToken.tokenExpired || 0));
}

export async function claimLocalData() {
  if (!apiBaseUrl) throw new Error("尚未配置业务 API 地址");
  const response = await fetch(`${apiBaseUrl}/auth/claim-local-data`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      __rizhiTransport: true,
      method: "POST",
      token: getAuthToken(),
      payload: {},
    }),
  });
  const result = await response.json().catch(() => ({})) as {
    data?: { claimed: number };
    error?: { message?: string };
  };
  if (!response.ok || result.error) {
    if (response.status === 401) handleUnauthorized();
    throw new Error(result.error?.message || "认领现有数据失败");
  }
  return result.data?.claimed ?? 0;
}

export async function logout() {
  try {
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
  } finally {
    clearSession();
  }
}

export function handleUnauthorized() {
  clearSession();
  if (location.pathname !== "/login") {
    const redirect = `${location.pathname}${location.search}`;
    location.assign(`/login?redirect=${encodeURIComponent(redirect)}`);
  }
}
