import { beforeEach, describe, expect, it } from "vitest";
import { rizhiDb } from "@/db/rizhiDb";
import { seedDatabaseIfNeeded } from "@/db/seed";
import { backupService } from "@/services/backupService";

async function resetLocalDb() {
  await rizhiDb.delete();
  await rizhiDb.open();
  await seedDatabaseIfNeeded();
}

describe("backupService", () => {
  beforeEach(async () => {
    await resetLocalDb();
  });

  it("exports a Rizhi backup payload with all required tables", async () => {
    const payload = await backupService.createPayload();

    expect(payload).toMatchObject({
      format: "rizhi-local-backup",
      version: 1,
      app: "rizhi",
    });
    expect(payload.data.assets.length).toBeGreaterThan(0);
    expect(payload.data.assetAddons).toBeInstanceOf(Array);
    expect(payload.data.assetPartEvents).toBeInstanceOf(Array);
    expect(payload.data.accounts.length).toBeGreaterThan(0);
    expect(payload.data.transactions.length).toBeGreaterThan(0);
    expect(payload.data.accountFlows).toBeInstanceOf(Array);
    expect(payload.data.categories.length).toBeGreaterThan(0);
    expect(payload.data.settings.length).toBeGreaterThan(0);
    expect(payload.data.metadata.length).toBeGreaterThan(0);
  });

  it("rejects non-json backup text", async () => {
    await expect(backupService.restoreText("not-json")).rejects.toThrow("有效的 JSON");
  });

  it("rejects json that is not a Rizhi backup", async () => {
    await expect(backupService.restoreText(JSON.stringify({ app: "other" }))).rejects.toThrow("日值");
  });

  it("restores backup data by replacing local tables", async () => {
    const payload = await backupService.createPayload();
    const originalAssetCount = await rizhiDb.assets.count();

    await rizhiDb.assets.clear();
    expect(await rizhiDb.assets.count()).toBe(0);

    await backupService.restorePayload(payload);

    expect(await rizhiDb.assets.count()).toBe(originalAssetCount);
    expect(await rizhiDb.accounts.count()).toBe(payload.data.accounts.length);
    expect(await rizhiDb.transactions.count()).toBe(payload.data.transactions.length);
  });

  it("keeps custom parent and child categories attached to imported transactions", async () => {
    const parentId = "custom-category-parent";
    const childId = "custom-category-child";
    const transactionId = "custom-category-transaction";

    await rizhiDb.categories.bulkPut([
      { id: parentId, domain: "transaction", type: "expense", name: "A 用户分类", sort: 900, color: "#123456", enabled: true, isSystem: false },
      { id: childId, domain: "transaction", type: "expense", name: "A 用户子分类", parentId, sort: 910, enabled: true, isSystem: false },
    ]);
    await rizhiDb.transactions.put({
      id: transactionId,
      type: "expense",
      categoryId: parentId,
      subCategoryId: childId,
      categorySnapshot: { categoryName: "A 用户分类", subCategoryName: "A 用户子分类" },
      amount: 128,
      occurredAt: "2026-07-20T08:00:00.000Z",
      createdAt: "2026-07-20T08:00:00.000Z",
      updatedAt: "2026-07-20T08:00:00.000Z",
    });

    const payload = await backupService.createPayload();
    await rizhiDb.categories.clear();
    await rizhiDb.transactions.clear();
    await backupService.restorePayload(payload);

    expect(await rizhiDb.categories.get(parentId)).toMatchObject({ name: "A 用户分类", isSystem: false });
    expect(await rizhiDb.categories.get(childId)).toMatchObject({ name: "A 用户子分类", parentId, isSystem: false });
    expect(await rizhiDb.transactions.get(transactionId)).toMatchObject({ categoryId: parentId, subCategoryId: childId });
  });
});
