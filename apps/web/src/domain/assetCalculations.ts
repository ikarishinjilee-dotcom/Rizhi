import type { AssetAddonRecord, AssetAttachmentRecord, AssetCategoryKind, AssetRecord, CategoryRecord } from "@/domain/models";

export function includedAddonCost(assetId: string, addons: AssetAddonRecord[]) {
  return addons
    .filter((addon) => addon.assetId === assetId)
    .reduce((sum, addon) => {
      if (!addon.includedInCost) return sum;
      return (addon.direction ?? "expense") === "income" ? sum - addon.amount : sum + addon.amount;
    }, 0);
}

export function assetTotalCost(asset: AssetRecord, addons: AssetAddonRecord[]) {
  return asset.originalCost + includedAddonCost(asset.id, addons);
}

export function assetCategoryKind(asset: AssetRecord, categories: CategoryRecord[]): AssetCategoryKind {
  const type = categories.find((category) => category.id === asset.categoryId)?.type;
  if (type === "digital" || type === "clothing" || type === "home" || type === "sports" || type === "subscription") return type;
  return "other";
}

export function sortedAttachments(attachments?: AssetAttachmentRecord[]) {
  return [...(attachments ?? [])].sort((a, b) => a.sort - b.sort);
}

export function assetImageUrls(asset: AssetRecord) {
  return sortedAttachments(asset.attachments)
    .filter((attachment) => attachment.type === "asset_image")
    .sort((a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)) || a.sort - b.sort)
    .map((attachment) => attachment.url);
}

export function addonImageUrls(addon: AssetAddonRecord) {
  return sortedAttachments(addon.attachments)
    .filter((attachment) => attachment.type === "asset_image")
    .sort((a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)) || a.sort - b.sort)
    .map((attachment) => attachment.url);
}
