import { rizhiDb } from "@/db/rizhiDb";
import type { UserSettingsRecord } from "@/domain/models";

export const SETTINGS_UPDATED_EVENT = "rizhi:settings-updated";

const defaultSettings: UserSettingsRecord = {
  id: "default",
  currency: "CNY",
  locale: "zh-CN",
  theme: "light",
  firstDayOfWeek: 1,
  displayName: "Demo User",
  notificationReadIds: [],
  notificationIgnoredIds: [],
  warrantyReminderDays: 90,
  repaymentReminderDays: 30,
  idleReminderDays: 30,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const settingsService = {
  async get(): Promise<UserSettingsRecord> {
    return (await rizhiDb.settings.get("default")) ?? defaultSettings;
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
