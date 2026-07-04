import { rizhiDb } from "@/db/rizhiDb";
import type { UserSettingsRecord } from "@/domain/models";
import { authSession, isUniCloudMode } from "@/services/authService";

export const SETTINGS_UPDATED_EVENT = "rizhi:settings-updated";

function settingsId() {
  return isUniCloudMode() && authSession.username
    ? `account:${authSession.username}`
    : "default";
}

function createDefaultSettings(): UserSettingsRecord {
  const timestamp = new Date().toISOString();
  return {
    id: settingsId(),
    currency: "CNY",
    locale: "zh-CN",
    theme: "light",
    firstDayOfWeek: 1,
    displayName: authSession.username || "Demo User",
    notificationReadIds: [],
    notificationIgnoredIds: [],
    warrantyReminderDays: 90,
    repaymentReminderDays: 30,
    idleReminderDays: 30,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const settingsService = {
  async get(): Promise<UserSettingsRecord> {
    return (await rizhiDb.settings.get(settingsId())) ?? createDefaultSettings();
  },

  async update(input: Partial<Omit<UserSettingsRecord, "id" | "createdAt" | "updatedAt">>) {
    const current = await this.get();
    const next: UserSettingsRecord = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    await rizhiDb.settings.put(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: next }));
    }
    return next;
  },
};
