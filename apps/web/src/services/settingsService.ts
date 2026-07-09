import { rizhiDb } from "@/db/rizhiDb";
import type { UserSettingsRecord } from "@/domain/models";
import { authSession, isUniCloudMode } from "@/services/authService";
import {
  getCloudUserProfile,
  isCloudDataSource,
  updateCloudUserProfile,
  uploadImageDataUrl,
} from "@/services/cloudApiService";

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
    const local = (await rizhiDb.settings.get(settingsId())) ?? createDefaultSettings();
    if (!isCloudDataSource()) return local;
    let profile = await getCloudUserProfile();
    if (!profile) {
      let avatarFileId = local.avatarFileId;
      if (local.avatarDataUrl?.startsWith("data:image/")) {
        const uploaded = await uploadImageDataUrl(local.avatarDataUrl, "avatar");
        avatarFileId = uploaded.fileId;
      }
      profile = await updateCloudUserProfile({
        displayName: local.displayName || authSession.username,
        avatarFileId,
      });
    }
    const next = {
      ...local,
      displayName: profile.displayName,
      avatarDataUrl: profile.avatarUrl || undefined,
      avatarFileId: profile.avatarFileId,
    };
    await rizhiDb.settings.put(next);
    return next;
  },

  async update(input: Partial<Omit<UserSettingsRecord, "id" | "createdAt" | "updatedAt">>) {
    const current = await this.get();
    let next: UserSettingsRecord = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    const updatesProfile = Object.prototype.hasOwnProperty.call(input, "displayName")
      || Object.prototype.hasOwnProperty.call(input, "avatarDataUrl");
    if (isCloudDataSource() && updatesProfile) {
      let avatarFileId = current.avatarFileId;
      let avatarUrl = next.avatarDataUrl;
      if (next.avatarDataUrl?.startsWith("data:image/")) {
        const uploaded = await uploadImageDataUrl(next.avatarDataUrl, "avatar");
        avatarFileId = uploaded.fileId;
        avatarUrl = uploaded.url;
      } else if (Object.prototype.hasOwnProperty.call(input, "avatarDataUrl") && !next.avatarDataUrl) {
        avatarFileId = undefined;
        avatarUrl = undefined;
      }
      const profile = await updateCloudUserProfile({
        displayName: next.displayName || authSession.username,
        avatarFileId,
      });
      next = {
        ...next,
        displayName: profile.displayName,
        avatarDataUrl: profile.avatarUrl || avatarUrl,
        avatarFileId: profile.avatarFileId,
      };
    }
    await rizhiDb.settings.put(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: next }));
    }
    return next;
  },
};
