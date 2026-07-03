import { reactive } from "vue";

const TOKEN_KEY = "rizhi_uni_id_token";
const TOKEN_EXPIRED_KEY = "rizhi_uni_id_token_expired";
const USERNAME_KEY = "rizhi_uni_id_username";
const appId = import.meta.env.VITE_DCLOUD_APP_ID || "__UNI__2A67492";
const uniIdBaseUrl = (import.meta.env.VITE_UNI_ID_BASE_URL || "").replace(/\/$/, "");
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

type UniIdResponse = {
  errCode?: string | number;
  errMsg?: string;
  newToken?: {
    token: string;
    tokenExpired: number;
  };
};

export const authSession = reactive({
  token: localStorage.getItem(TOKEN_KEY) || "",
  tokenExpired: Number(localStorage.getItem(TOKEN_EXPIRED_KEY) || 0),
  username: localStorage.getItem(USERNAME_KEY) || "",
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRED_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

function saveSession(username: string, token: string, tokenExpired: number) {
  authSession.username = username;
  authSession.token = token;
  authSession.tokenExpired = tokenExpired;
  localStorage.setItem(USERNAME_KEY, username);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRED_KEY, String(tokenExpired));
}

async function callUniId(method: string, params: Record<string, unknown>, token = "") {
  if (!uniIdBaseUrl) throw new Error("尚未配置 uni-id URL 化地址");
  const response = await fetch(`${uniIdBaseUrl}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      clientInfo: {
        uniPlatform: "web",
        appId,
        appLanguage: "zh-Hans",
      },
      uniIdToken: token,
      params,
    }),
  });
  const result = await response.json().catch(() => ({})) as UniIdResponse;
  if (!response.ok || result.errCode) {
    throw new Error(result.errMsg || `登录服务请求失败（${response.status}）`);
  }
  return result;
}

export async function login(username: string, password: string) {
  const result = await callUniId("login", { username, password });
  if (!result.newToken?.token) throw new Error("登录成功但未返回 Token");
  saveSession(username, result.newToken.token, Number(result.newToken.tokenExpired || 0));
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
  const token = getAuthToken();
  try {
    if (token) await callUniId("logout", {}, token);
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
