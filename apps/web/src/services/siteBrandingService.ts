import { isUniCloudDataSource } from "@/services/apiConfig";
import { getCloudSiteBranding, updateCloudSiteBranding, uploadImageDataUrl } from "@/services/cloudApiService";
import { imageFileToPersistentUrl } from "@/utils/imageFiles";

export const SITE_BRANDING_UPDATED_EVENT = "rizhi:site-branding-updated";
const STORAGE_KEY = "rizhi-site-branding";
const DEFAULT_LOGO = "/rizhi-logo-mark.png";
const DEFAULT_MAIN_LOGO = "/rizhi-logo-lockup.png";
const DEFAULT_HOME_LOGO = "/rizhi-logo-lockup.png";
const DEFAULT_HOME_HERO = "/dashboard-hero.png";
const DEFAULT_HOME_TITLE = "把资产、交易与物品，\n整理成更清晰的生活秩序";
const DEFAULT_HOME_DESCRIPTION = "在 Rizhi，统一管理你的交易、资产与物品，清楚每一笔收支，\n掌握资产状况，物品去向不再遗忘，重要事项及时提醒，\n让生活与财务井井有条。";

export type SiteBranding = {
  logoUrl: string;
  mainLogoUrl: string;
  faviconUrl: string;
  homeLogoUrl: string;
  homeHeroUrl: string;
  homeTitle: string;
  homeDescription: string;
  logoFileId?: string;
  mainLogoFileId?: string;
  faviconFileId?: string;
  homeLogoFileId?: string;
  homeHeroFileId?: string;
};

function defaultBranding(): SiteBranding {
  return {
    logoUrl: DEFAULT_LOGO,
    mainLogoUrl: DEFAULT_MAIN_LOGO,
    faviconUrl: DEFAULT_LOGO,
    homeLogoUrl: DEFAULT_HOME_LOGO,
    homeHeroUrl: DEFAULT_HOME_HERO,
    homeTitle: DEFAULT_HOME_TITLE,
    homeDescription: DEFAULT_HOME_DESCRIPTION,
  };
}

export function getCachedSiteBranding(): SiteBranding {
  if (typeof window === "undefined") return defaultBranding();
  try {
    const cached = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<SiteBranding> | null;
    return { ...defaultBranding(), ...cached };
  } catch {
    return defaultBranding();
  }
}

function applyFavicon(url: string) {
  if (typeof document === "undefined") return;
  let link = document.querySelector<HTMLLinkElement>('link[data-rizhi-favicon]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.dataset.rizhiFavicon = "true";
    document.head.appendChild(link);
  }
  link.href = url;
}

function publish(next: SiteBranding) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SITE_BRANDING_UPDATED_EVENT, { detail: next }));
  }
  applyFavicon(next.faviconUrl);
  return next;
}

export const siteBrandingService = {
  async get(): Promise<SiteBranding> {
    const local = getCachedSiteBranding();
    if (!isUniCloudDataSource()) return publish({ ...defaultBranding(), ...local });
    const remote = await getCloudSiteBranding();
    return publish({
      ...defaultBranding(),
      ...local,
      ...(remote.logoUrl ? { logoUrl: remote.logoUrl } : {}),
      ...(remote.mainLogoUrl ? { mainLogoUrl: remote.mainLogoUrl } : {}),
      ...(remote.faviconUrl ? { faviconUrl: remote.faviconUrl } : {}),
      ...(remote.homeLogoUrl ? { homeLogoUrl: remote.homeLogoUrl } : {}),
      ...(remote.homeHeroUrl ? { homeHeroUrl: remote.homeHeroUrl } : {}),
      ...(remote.homeTitle ? { homeTitle: remote.homeTitle } : {}),
      ...(remote.homeDescription ? { homeDescription: remote.homeDescription } : {}),
      logoFileId: remote.logoFileId || local?.logoFileId,
      mainLogoFileId: remote.mainLogoFileId || local?.mainLogoFileId,
      faviconFileId: remote.faviconFileId || local?.faviconFileId,
      homeLogoFileId: remote.homeLogoFileId || local?.homeLogoFileId,
      homeHeroFileId: remote.homeHeroFileId || local?.homeHeroFileId,
    });
  },

  async update(input: Partial<SiteBranding>) {
    const current = await this.get();
    let next: SiteBranding = { ...current, ...input };
    if (isUniCloudDataSource()) {
      const remote = await updateCloudSiteBranding({
        logoFileId: next.logoFileId,
        mainLogoFileId: next.mainLogoFileId,
        faviconFileId: next.faviconFileId,
        homeLogoFileId: next.homeLogoFileId,
        homeHeroFileId: next.homeHeroFileId,
        homeTitle: next.homeTitle,
        homeDescription: next.homeDescription,
      });
      next = { ...next, ...Object.fromEntries(Object.entries(remote).filter(([, value]) => value)) };
    }
    return publish(next);
  },

  async upload(file: File, kind: "logo" | "mainLogo" | "favicon" | "homeLogo" | "homeHero") {
    const dataUrl = await imageFileToPersistentUrl(file);
    if (!isUniCloudDataSource()) {
      return this.update(kind === "logo" ? { logoUrl: dataUrl }
        : kind === "mainLogo" ? { mainLogoUrl: dataUrl }
          : kind === "favicon" ? { faviconUrl: dataUrl }
          : kind === "homeLogo" ? { homeLogoUrl: dataUrl } : { homeHeroUrl: dataUrl });
    }
    const uploaded = await uploadImageDataUrl(dataUrl, "site_icon");
    return this.update(kind === "logo" ? { logoUrl: uploaded.url, logoFileId: uploaded.fileId }
      : kind === "mainLogo" ? { mainLogoUrl: uploaded.url, mainLogoFileId: uploaded.fileId }
        : kind === "favicon" ? { faviconUrl: uploaded.url, faviconFileId: uploaded.fileId }
        : kind === "homeLogo" ? { homeLogoUrl: uploaded.url, homeLogoFileId: uploaded.fileId }
          : { homeHeroUrl: uploaded.url, homeHeroFileId: uploaded.fileId });
  },
};
