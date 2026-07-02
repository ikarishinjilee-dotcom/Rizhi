import { AsyncLocalStorage } from "node:async_hooks";

export const defaultUserId = "user-local";

const userContext = new AsyncLocalStorage<string>();

export function enterUserContext(userId: string) {
  userContext.enterWith(userId);
}

export function currentUserId() {
  return userContext.getStore() ?? defaultUserId;
}

export function parseUserId(value: string | string[] | undefined) {
  const userId = Array.isArray(value) ? value[0] : value;
  if (!userId) return defaultUserId;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(userId)) return undefined;
  return userId;
}
