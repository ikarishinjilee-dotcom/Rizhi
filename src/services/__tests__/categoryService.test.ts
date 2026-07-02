import { beforeEach, describe, expect, it } from "vitest";
import { rizhiDb } from "@/db/rizhiDb";
import { seedDatabaseIfNeeded } from "@/db/seed";
import { categoryService } from "@/services/categoryService";
import { transactionService } from "@/services/transactionService";

async function resetLocalDb() {
  await rizhiDb.delete();
  await rizhiDb.open();
  await seedDatabaseIfNeeded();
}

describe("categoryService", () => {
  beforeEach(async () => {
    await resetLocalDb();
  });

  it("creates a category", async () => {
    const category = await categoryService.create({
      domain: "asset",
      name: "测试资产分类",
      type: "other",
      sort: 777,
      color: "#123456",
    });

    const saved = await rizhiDb.categories.get(category.id);
    expect(saved).toMatchObject({
      domain: "asset",
      name: "测试资产分类",
      type: "other",
      sort: 777,
      color: "#123456",
    });
  });

  it("lists categories with domain and enabled filters", async () => {
    const disabled = await categoryService.create({
      domain: "asset",
      name: "Disabled Asset Category",
      type: "other",
      sort: 778,
      enabled: false,
    });

    const activeAssetCategories = await categoryService.list({ domain: "asset", enabled: true });
    const disabledAssetCategories = await categoryService.list({ domain: "asset", enabled: false });

    expect(activeAssetCategories.some((category) => category.id === "asset-digital")).toBe(true);
    expect(activeAssetCategories.some((category) => category.id === disabled.id)).toBe(false);
    expect(disabledAssetCategories.map((category) => category.id)).toEqual([disabled.id]);
  });

  it("updates a category", async () => {
    const category = await categoryService.create({
      domain: "transaction",
      name: "旧名称",
      type: "expense",
      sort: 700,
    });

    await categoryService.update({
      id: category.id,
      name: "新名称",
      sort: 701,
      color: "#abcdef",
    });

    const saved = await rizhiDb.categories.get(category.id);
    expect(saved).toMatchObject({
      name: "新名称",
      sort: 701,
      color: "#abcdef",
    });
  });

  it("saves and clears monthly budgets on expense categories", async () => {
    const category = await categoryService.create({
      domain: "transaction",
      name: "预算测试",
      type: "expense",
      sort: 705,
      monthlyBudget: 1500,
    });

    expect(await rizhiDb.categories.get(category.id)).toMatchObject({
      monthlyBudget: 1500,
    });

    await categoryService.update({
      id: category.id,
      monthlyBudget: undefined,
    });

    const saved = await rizhiDb.categories.get(category.id);
    expect(saved?.monthlyBudget).toBeUndefined();
  });

  it("deletes an unused category", async () => {
    const category = await categoryService.create({
      domain: "transaction",
      name: "可删除分类",
      type: "expense",
      sort: 800,
    });

    await categoryService.delete(category.id);

    expect(await rizhiDb.categories.get(category.id)).toBeUndefined();
  });

  it("rejects deleting an asset category that is used by assets", async () => {
    await expect(categoryService.delete("asset-digital")).rejects.toThrow("资产");
    expect(await rizhiDb.categories.get("asset-digital")).toBeTruthy();
  });

  it("rejects deleting a category that is already used by transactions", async () => {
    const category = await categoryService.create({
      domain: "transaction",
      name: "测试支出",
      type: "expense",
      sort: 810,
    });
    await transactionService.create({
      type: "expense",
      categoryId: category.id,
      amount: 12,
      occurredAt: "2026-06-21T12:00:00.000+08:00",
      accountId: "alipay",
      merchant: "测试商户",
    });

    await expect(categoryService.delete(category.id)).rejects.toThrow("记账记录");

    const saved = await rizhiDb.categories.get(category.id);
    expect(saved).toBeTruthy();
  });

  it("rejects deleting an account category used by account type", async () => {
    await expect(categoryService.delete("account-wallet")).rejects.toThrow("账户");
    expect(await rizhiDb.categories.get("account-wallet")).toBeTruthy();
  });

  it("deletes an unused system transaction category", async () => {
    await categoryService.delete("tx-refund");
    expect(await rizhiDb.categories.get("tx-refund")).toBeUndefined();
  });

  it("rejects deleting a parent category when child categories have transactions", async () => {
    const parent = await categoryService.create({
      domain: "transaction",
      name: "父级测试",
      type: "expense",
      sort: 830,
    });
    const child = await categoryService.create({
      domain: "transaction",
      name: "子级测试",
      type: "expense",
      parentId: parent.id,
      sort: 831,
    });
    await transactionService.create({
      type: "expense",
      categoryId: parent.id,
      subCategoryId: child.id,
      amount: 18,
      occurredAt: "2026-06-21T18:00:00.000+08:00",
      accountId: "alipay",
      merchant: "测试",
    });

    await expect(categoryService.delete(parent.id)).rejects.toThrow("记账记录");
    expect(await rizhiDb.categories.get(parent.id)).toBeTruthy();
    expect(await rizhiDb.categories.get(child.id)).toBeTruthy();
  });

  it("creates transaction category snapshots and keeps them when categories are renamed", async () => {
    const parent = await categoryService.create({
      domain: "transaction",
      name: "餐饮测试",
      type: "expense",
      sort: 820,
    });
    const child = await categoryService.create({
      domain: "transaction",
      name: "午餐测试",
      type: "expense",
      parentId: parent.id,
      sort: 821,
    });

    const transaction = await transactionService.create({
      type: "expense",
      categoryId: parent.id,
      subCategoryId: child.id,
      amount: 28,
      occurredAt: "2026-06-21T12:30:00.000+08:00",
      accountId: "wechat",
      merchant: "测试餐厅",
    });

    await categoryService.update({ id: parent.id, name: "餐饮改名" });
    await categoryService.update({ id: child.id, name: "午餐改名" });

    const saved = await rizhiDb.transactions.get(transaction.id);
    expect(saved).toMatchObject({
      categoryId: parent.id,
      subCategoryId: child.id,
      categorySnapshot: {
        categoryName: "餐饮测试",
        subCategoryName: "午餐测试",
      },
    });
  });

  it("migrates transactions to another category and rewrites snapshots", async () => {
    const fromParent = await categoryService.create({
      domain: "transaction",
      name: "旧餐饮",
      type: "expense",
      sort: 840,
    });
    const fromChild = await categoryService.create({
      domain: "transaction",
      name: "旧午餐",
      type: "expense",
      parentId: fromParent.id,
      sort: 841,
    });
    const toParent = await categoryService.create({
      domain: "transaction",
      name: "新餐饮",
      type: "expense",
      sort: 850,
    });
    const toChild = await categoryService.create({
      domain: "transaction",
      name: "新午餐",
      type: "expense",
      parentId: toParent.id,
      sort: 851,
    });
    const transaction = await transactionService.create({
      type: "expense",
      categoryId: fromParent.id,
      subCategoryId: fromChild.id,
      amount: 32,
      occurredAt: "2026-06-21T12:40:00.000+08:00",
      accountId: "wechat",
      merchant: "测试餐厅",
    });

    const migratedCount = await categoryService.migrateTransactions({
      fromCategoryId: fromParent.id,
      toCategoryId: toParent.id,
      toSubCategoryId: toChild.id,
    });

    const saved = await rizhiDb.transactions.get(transaction.id);
    expect(migratedCount).toBe(1);
    expect(saved).toMatchObject({
      categoryId: toParent.id,
      subCategoryId: toChild.id,
      categorySnapshot: {
        categoryName: "新餐饮",
        subCategoryName: "新午餐",
      },
    });
  });

  it("rejects migrating transactions across expense and income categories", async () => {
    await expect(categoryService.migrateTransactions({
      fromCategoryId: "tx-food",
      toCategoryId: "tx-salary",
    })).rejects.toThrow("同类型");
  });
});
