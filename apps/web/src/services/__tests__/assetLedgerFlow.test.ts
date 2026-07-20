import { beforeEach, describe, expect, it } from "vitest";
import { rizhiDb } from "@/db/rizhiDb";
import { seedDatabaseIfNeeded } from "@/db/seed";
import { addonImageUrls, assetImageUrls, assetTotalCost } from "@/domain/assetCalculations";
import { accountService, assetAddonService, assetService, transactionService } from "@/services";

async function resetLocalDb() {
  await rizhiDb.delete();
  await rizhiDb.open();
  await seedDatabaseIfNeeded();
}

describe("asset and ledger linked writes", () => {
  beforeEach(async () => {
    await resetLocalDb();
  });

  it("creates an asset purchase transaction and deducts the payment account", async () => {
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    expect(beforeAccount).toBeTruthy();

    const asset = await assetService.create({
      name: "测试相机",
      brand: "Test",
      categoryId: "asset-digital",
      originalCost: 1000,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
      merchant: "测试商家",
    });

    const afterAccount = await rizhiDb.accounts.get("alipay");
    const transaction = asset.purchaseTransactionId
      ? await rizhiDb.transactions.get(asset.purchaseTransactionId)
      : undefined;
    const flows = asset.purchaseTransactionId
      ? await rizhiDb.accountFlows.where("transactionId").equals(asset.purchaseTransactionId).toArray()
      : [];

    expect(afterAccount?.balance).toBe((beforeAccount?.balance ?? 0) - 1000);
    expect(transaction).toMatchObject({
      type: "asset_purchase",
      categoryId: "tx-asset-purchase",
      amount: 1000,
      accountId: "alipay",
      assetId: asset.id,
    });
    expect(flows).toHaveLength(1);
    expect(flows[0]).toMatchObject({ accountId: "alipay", direction: "out", amount: 1000 });
    expect(new Date(transaction!.occurredAt).getHours()).toBe(new Date(transaction!.createdAt).getHours());
  });

  it("persists asset and add-on images as attachment records", async () => {
    const assetImage = "data:image/webp;base64,YXNzZXQ=";
    const addonImage = "data:image/webp;base64,YWRkb24=";
    const asset = await assetService.create({
      name: "带图片资产",
      categoryId: "asset-digital",
      originalCost: 100,
      currency: "CNY",
      purchaseDate: "2026-06-20",
      imageUrl: assetImage,
      imageUrls: [assetImage],
    });
    const addon = await assetAddonService.create({
      assetId: asset.id,
      name: "带图片附加项",
      direction: "expense",
      type: "accessory",
      amount: 10,
      currency: "CNY",
      purchaseDate: "2026-06-21",
      includedInCost: true,
      imageUrl: addonImage,
      imageUrls: [addonImage],
    });

    expect(assetImageUrls((await rizhiDb.assets.get(asset.id))!)).toEqual([assetImage]);
    expect(addonImageUrls((await rizhiDb.assetAddons.get(addon.id))!)).toEqual([addonImage]);
  });

  it("creates an expense add-on, deducts account balance, and increases included asset cost", async () => {
    const asset = await rizhiDb.assets.get("ast_000002");
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    const beforeAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    expect(asset).toBeTruthy();
    expect(beforeAccount).toBeTruthy();

    const beforeCost = assetTotalCost(asset!, beforeAddons);
    const addon = await assetAddonService.create({
      assetId: "ast_000002",
      name: "测试扩展坞",
      direction: "expense",
      type: "accessory",
      amount: 88,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
      includedInCost: true,
    });

    const afterAccount = await rizhiDb.accounts.get("alipay");
    const afterAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    const transaction = addon.transactionId ? await rizhiDb.transactions.get(addon.transactionId) : undefined;

    expect(afterAccount?.balance).toBe((beforeAccount?.balance ?? 0) - 88);
    expect(assetTotalCost(asset!, afterAddons)).toBe(beforeCost + 88);
    expect(transaction).toMatchObject({
      type: "expense",
      categoryId: "tx-asset-addon-accessory",
      amount: 88,
      accountId: "alipay",
      assetId: "ast_000002",
      addonId: addon.id,
    });
  });

  it("creates an income add-on, increases account balance, and reduces asset cost", async () => {
    const asset = await rizhiDb.assets.get("ast_000002");
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    const beforeAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    expect(asset).toBeTruthy();
    expect(beforeAccount).toBeTruthy();

    const beforeCost = assetTotalCost(asset!, beforeAddons);
    const addon = await assetAddonService.create({
      assetId: "ast_000002",
      name: "卖掉旧配件",
      direction: "income",
      type: "accessory",
      amount: 50,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
      includedInCost: true,
    });

    const afterAccount = await rizhiDb.accounts.get("alipay");
    const afterAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    const savedAddon = await rizhiDb.assetAddons.get(addon.id);
    const transaction = addon.transactionId ? await rizhiDb.transactions.get(addon.transactionId) : undefined;

    expect(afterAccount?.balance).toBe((beforeAccount?.balance ?? 0) + 50);
    expect(savedAddon?.includedInCost).toBe(true);
    expect(assetTotalCost(asset!, afterAddons)).toBe(beforeCost - 50);
    expect(transaction).toMatchObject({
      type: "income",
      categoryId: "tx-asset-addon-income",
      amount: 50,
      accountId: "alipay",
      assetId: "ast_000002",
      addonId: addon.id,
    });
  });

  it("creates an income add-on without changing asset cost when excluded", async () => {
    const asset = await rizhiDb.assets.get("ast_000002");
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    const beforeAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    expect(asset).toBeTruthy();
    expect(beforeAccount).toBeTruthy();

    const beforeCost = assetTotalCost(asset!, beforeAddons);
    const addon = await assetAddonService.create({
      assetId: "ast_000002",
      name: "不计成本的回款",
      direction: "income",
      type: "other",
      amount: 35,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
      includedInCost: false,
    });

    const afterAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    const transaction = addon.transactionId ? await rizhiDb.transactions.get(addon.transactionId) : undefined;

    expect((await rizhiDb.accounts.get("alipay"))?.balance).toBe((beforeAccount?.balance ?? 0) + 35);
    expect(assetTotalCost(asset!, afterAddons)).toBe(beforeCost);
    expect(transaction).toMatchObject({ type: "income", amount: 35, addonId: addon.id });
  });

  it("updates an add-on from expense to income and rewrites the linked transaction/account effect", async () => {
    const asset = await rizhiDb.assets.get("ast_000002");
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    const beforeAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    expect(asset).toBeTruthy();
    expect(beforeAccount).toBeTruthy();

    const beforeCost = assetTotalCost(asset!, beforeAddons);
    const addon = await assetAddonService.create({
      assetId: "ast_000002",
      name: "先记为支出",
      direction: "expense",
      type: "upgrade",
      amount: 20,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
      includedInCost: true,
    });

    await assetAddonService.update({
      id: addon.id,
      name: "改为转卖收入",
      direction: "income",
      type: "upgrade",
      amount: 25,
      currency: "CNY",
      purchaseDate: "2026-06-20",
      paymentAccountId: "alipay",
      includedInCost: true,
    });

    const afterAccount = await rizhiDb.accounts.get("alipay");
    const afterAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    const savedAddon = await rizhiDb.assetAddons.get(addon.id);
    const transaction = addon.transactionId ? await rizhiDb.transactions.get(addon.transactionId) : undefined;
    const flows = addon.transactionId
      ? await rizhiDb.accountFlows.where("transactionId").equals(addon.transactionId).toArray()
      : [];

    expect(afterAccount?.balance).toBe((beforeAccount?.balance ?? 0) + 25);
    expect(savedAddon).toMatchObject({ direction: "income", includedInCost: true, amount: 25 });
    expect(assetTotalCost(asset!, afterAddons)).toBe(beforeCost - 25);
    expect(transaction).toMatchObject({
      type: "income",
      categoryId: "tx-asset-addon-income",
      amount: 25,
      accountId: "alipay",
    });
    expect(flows).toHaveLength(1);
    expect(flows[0]).toMatchObject({ direction: "in", amount: 25 });
  });

  it("creates a transaction when an account is added to an existing unlinked add-on", async () => {
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    const addon = await assetAddonService.create({
      assetId: "ast_000002",
      name: "未付款配件",
      direction: "expense",
      type: "accessory",
      amount: 40,
      currency: "CNY",
      purchaseDate: "2026-06-20",
      includedInCost: true,
    });
    expect(addon.transactionId).toBeUndefined();

    const updated = await assetAddonService.update({
      id: addon.id,
      name: addon.name,
      direction: "expense",
      type: addon.type,
      amount: addon.amount,
      currency: addon.currency,
      purchaseDate: addon.purchaseDate,
      paymentAccountId: "alipay",
      includedInCost: addon.includedInCost,
    });

    expect(updated.transactionId).toBeTruthy();
    expect((await rizhiDb.accounts.get("alipay"))?.balance).toBe((beforeAccount?.balance ?? 0) - 40);
    expect(await rizhiDb.transactions.get(updated.transactionId!)).toMatchObject({
      accountId: "alipay",
      addonId: addon.id,
      amount: 40,
    });
    expect(await rizhiDb.accountFlows.where("transactionId").equals(updated.transactionId!).count()).toBe(1);
  });

  it("removes the linked transaction and restores the account when an add-on account is cleared", async () => {
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    const addon = await assetAddonService.create({
      assetId: "ast_000002",
      name: "可取消付款配件",
      direction: "expense",
      type: "accessory",
      amount: 45,
      currency: "CNY",
      purchaseDate: "2026-06-20",
      paymentAccountId: "alipay",
      includedInCost: true,
    });
    expect(addon.transactionId).toBeTruthy();

    const updated = await assetAddonService.update({
      id: addon.id,
      name: addon.name,
      direction: "expense",
      type: addon.type,
      amount: addon.amount,
      currency: addon.currency,
      purchaseDate: addon.purchaseDate,
      paymentAccountId: undefined,
      includedInCost: addon.includedInCost,
    });

    expect(updated.transactionId).toBeUndefined();
    expect((await rizhiDb.accounts.get("alipay"))?.balance).toBe(beforeAccount?.balance);
    expect(await rizhiDb.transactions.get(addon.transactionId!)).toBeUndefined();
    expect(await rizhiDb.accountFlows.where("transactionId").equals(addon.transactionId!).count()).toBe(0);
  });

  it("updates an asset purchase amount and payment account with account rollback", async () => {
    const beforeAlipay = await rizhiDb.accounts.get("alipay");
    const beforeWechat = await rizhiDb.accounts.get("wechat");
    expect(beforeAlipay).toBeTruthy();
    expect(beforeWechat).toBeTruthy();

    const asset = await assetService.create({
      name: "测试平板",
      categoryId: "asset-digital",
      originalCost: 100,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
      merchant: "测试商家",
    });

    await assetService.update({
      id: asset.id,
      originalCost: 150,
      purchaseDate: "2026-06-20",
      paymentAccountId: "wechat",
      merchant: "新商家",
    });

    const afterAlipay = await rizhiDb.accounts.get("alipay");
    const afterWechat = await rizhiDb.accounts.get("wechat");
    const updatedAsset = await rizhiDb.assets.get(asset.id);
    const transaction = asset.purchaseTransactionId
      ? await rizhiDb.transactions.get(asset.purchaseTransactionId)
      : undefined;
    const flows = asset.purchaseTransactionId
      ? await rizhiDb.accountFlows.where("transactionId").equals(asset.purchaseTransactionId).toArray()
      : [];

    expect(afterAlipay?.balance).toBe(beforeAlipay?.balance);
    expect(afterWechat?.balance).toBe((beforeWechat?.balance ?? 0) - 150);
    expect(updatedAsset?.paymentAccountId).toBe("wechat");
    expect(updatedAsset?.originalCost).toBe(150);
    expect(transaction).toMatchObject({
      type: "asset_purchase",
      amount: 150,
      accountId: "wechat",
      merchant: "新商家",
    });
    expect(flows).toHaveLength(1);
    expect(flows[0]).toMatchObject({ accountId: "wechat", direction: "out", amount: 150 });
  });

  it("removes an asset payment account and deletes the linked purchase transaction", async () => {
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    expect(beforeAccount).toBeTruthy();

    const asset = await assetService.create({
      name: "测试无付款资产",
      categoryId: "asset-digital",
      originalCost: 100,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
    });

    await assetService.update({
      id: asset.id,
      paymentAccountId: undefined,
    });

    const afterAccount = await rizhiDb.accounts.get("alipay");
    const updatedAsset = await rizhiDb.assets.get(asset.id);
    const transaction = asset.purchaseTransactionId
      ? await rizhiDb.transactions.get(asset.purchaseTransactionId)
      : undefined;
    const flows = asset.purchaseTransactionId
      ? await rizhiDb.accountFlows.where("transactionId").equals(asset.purchaseTransactionId).toArray()
      : [];

    expect(afterAccount?.balance).toBe(beforeAccount?.balance);
    expect(updatedAsset?.paymentAccountId).toBeUndefined();
    expect(updatedAsset?.purchaseTransactionId).toBeUndefined();
    expect(transaction).toBeUndefined();
    expect(flows).toHaveLength(0);
  });

  it("protects system generated transactions from ledger-page deletion", async () => {
    const asset = await assetService.create({
      name: "受保护资产",
      categoryId: "asset-digital",
      originalCost: 100,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
    });

    await expect(transactionService.delete(asset.purchaseTransactionId!)).rejects.toThrow("资产购买流水");
  });

  it("deletes a manual expense and restores the account balance", async () => {
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    expect(beforeAccount).toBeTruthy();

    const transaction = await transactionService.create({
      type: "expense",
      categoryId: "tx-daily",
      amount: 36,
      occurredAt: "2026-06-19T10:00:00.000+08:00",
      accountId: "alipay",
      merchant: "便利店",
    });

    const afterCreate = await rizhiDb.accounts.get("alipay");
    expect(afterCreate?.balance).toBe((beforeAccount?.balance ?? 0) - 36);

    await transactionService.delete(transaction.id);

    const afterDelete = await rizhiDb.accounts.get("alipay");
    const deletedTransaction = await rizhiDb.transactions.get(transaction.id);
    const flows = await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).toArray();

    expect(afterDelete?.balance).toBe(beforeAccount?.balance);
    expect(deletedTransaction).toBeUndefined();
    expect(flows).toHaveLength(0);
  });

  it("transfers funds between two asset accounts and creates two account flows", async () => {
    const beforeAlipay = await rizhiDb.accounts.get("alipay");
    const beforeWechat = await rizhiDb.accounts.get("wechat");
    expect(beforeAlipay).toBeTruthy();
    expect(beforeWechat).toBeTruthy();

    const transaction = await accountService.transfer({
      fromAccountId: "alipay",
      toAccountId: "wechat",
      amount: 200,
      occurredAt: "2026-06-19T12:00:00.000+08:00",
      note: "测试转账",
    });

    const afterAlipay = await rizhiDb.accounts.get("alipay");
    const afterWechat = await rizhiDb.accounts.get("wechat");
    const flows = await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).toArray();

    expect(transaction).toMatchObject({
      type: "transfer",
      categoryId: "tx-transfer",
      accountId: "alipay",
      relatedAccountId: "wechat",
      amount: 200,
    });
    expect(afterAlipay?.balance).toBe((beforeAlipay?.balance ?? 0) - 200);
    expect(afterWechat?.balance).toBe((beforeWechat?.balance ?? 0) + 200);
    expect(flows).toHaveLength(2);
    expect(flows).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountId: "alipay", direction: "out", amount: 200 }),
      expect.objectContaining({ accountId: "wechat", direction: "in", amount: 200 }),
    ]));
  });

  it("revokes an account transfer and restores both account balances", async () => {
    const beforeAlipay = await rizhiDb.accounts.get("alipay");
    const beforeWechat = await rizhiDb.accounts.get("wechat");
    const transaction = await accountService.transfer({
      fromAccountId: "alipay",
      toAccountId: "wechat",
      amount: 180,
      occurredAt: "2026-06-19T12:00:00.000+08:00",
    });

    await transactionService.delete(transaction.id);

    expect((await rizhiDb.accounts.get("alipay"))?.balance).toBe(beforeAlipay?.balance);
    expect((await rizhiDb.accounts.get("wechat"))?.balance).toBe(beforeWechat?.balance);
    expect(await rizhiDb.transactions.get(transaction.id)).toBeUndefined();
    expect(await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).count()).toBe(0);
  });

  it("rejects editing an account transfer as a normal transaction", async () => {
    const transaction = await accountService.transfer({
      fromAccountId: "alipay",
      toAccountId: "wechat",
      amount: 180,
      occurredAt: "2026-06-19T12:00:00.000+08:00",
    });

    await expect(transactionService.update({
      id: transaction.id,
      type: "expense",
      categoryId: "tx-daily",
      amount: 200,
      occurredAt: "2026-06-20T12:00:00.000+08:00",
      accountId: "alipay",
    })).rejects.toThrow("不能作为普通账单编辑");
  });

  it("updates accounts and blocks deleting accounts with flows", async () => {
    await accountService.update({
      id: "alipay",
      name: "支付宝余额-编辑",
      enabled: false,
    });

    const updated = await rizhiDb.accounts.get("alipay");
    expect(updated).toMatchObject({
      name: "支付宝余额-编辑",
      enabled: false,
    });

    await expect(accountService.delete("alipay")).rejects.toThrow("资金流水");
  });

  it("creates an auditable balance-adjustment transaction and flow when account balance changes", async () => {
    const before = await rizhiDb.accounts.get("alipay");
    expect(before).toBeTruthy();
    const nextBalance = (before?.balance ?? 0) + 123;

    await accountService.update({ id: "alipay", balance: nextBalance });

    const updated = await rizhiDb.accounts.get("alipay");
    const adjustment = await rizhiDb.transactions
      .where("accountId")
      .equals("alipay")
      .and((transaction) => transaction.businessType === "balance_adjustment")
      .last();
    const flows = adjustment
      ? await rizhiDb.accountFlows.where("transactionId").equals(adjustment.id).toArray()
      : [];

    expect(updated?.balance).toBe(nextBalance);
    expect(adjustment).toMatchObject({
      type: "income",
      categoryId: "tx-balance-adjustment",
      businessType: "balance_adjustment",
      amount: 123,
      accountId: "alipay",
    });
    expect(flows).toHaveLength(1);
    expect(flows[0]).toMatchObject({
      accountId: "alipay",
      direction: "in",
      amount: 123,
      balanceAfter: nextBalance,
    });
  });

  it("revokes the latest balance adjustment and recalculates later flow balances", async () => {
    const before = await rizhiDb.accounts.get("alipay");
    expect(before).toBeTruthy();
    await accountService.update({ id: "alipay", balance: (before?.balance ?? 0) + 100 });
    const adjustment = await rizhiDb.transactions
      .where("accountId")
      .equals("alipay")
      .and((transaction) => transaction.businessType === "balance_adjustment")
      .last();
    expect(adjustment).toBeTruthy();

    const laterTransaction = await transactionService.create({
      type: "expense",
      categoryId: "tx-daily",
      amount: 20,
      occurredAt: new Date(Date.now() + 60_000).toISOString(),
      accountId: "alipay",
      merchant: "调整后的消费",
    });
    const flowBeforeRevoke = (await rizhiDb.accountFlows.where("transactionId").equals(laterTransaction.id).first())!;

    await transactionService.delete(adjustment!.id);

    const flowAfterRevoke = await rizhiDb.accountFlows.where("transactionId").equals(laterTransaction.id).first();
    expect((await rizhiDb.accounts.get("alipay"))?.balance).toBe((before?.balance ?? 0) - 20);
    expect(flowAfterRevoke?.balanceAfter).toBe(flowBeforeRevoke.balanceAfter - 100);
    expect(await rizhiDb.transactions.get(adjustment!.id)).toBeUndefined();
    expect(await rizhiDb.accountFlows.where("transactionId").equals(adjustment!.id).count()).toBe(0);
  });

  it("blocks revoking an older balance adjustment while a newer adjustment exists", async () => {
    const before = await rizhiDb.accounts.get("alipay");
    await accountService.update({ id: "alipay", balance: (before?.balance ?? 0) + 50 });
    const firstAdjustment = await rizhiDb.transactions
      .where("accountId")
      .equals("alipay")
      .and((transaction) => transaction.businessType === "balance_adjustment")
      .last();
    await accountService.update({ id: "alipay", balance: (before?.balance ?? 0) + 80 });

    await expect(transactionService.delete(firstAdjustment!.id)).rejects.toThrow("最近一次余额调整");
  });

  it("deletes an add-on and rolls back its transaction, flow, account and asset cost", async () => {
    const asset = await rizhiDb.assets.get("ast_000002");
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    const beforeAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    const beforeCost = assetTotalCost(asset!, beforeAddons);
    const addon = await assetAddonService.create({
      assetId: "ast_000002",
      name: "待删除配件",
      direction: "expense",
      type: "accessory",
      amount: 77,
      currency: "CNY",
      purchaseDate: "2026-06-20",
      paymentAccountId: "alipay",
      includedInCost: true,
    });

    await assetAddonService.delete(addon.id);

    const afterAccount = await rizhiDb.accounts.get("alipay");
    const afterAddons = await rizhiDb.assetAddons.where("assetId").equals("ast_000002").toArray();
    expect(await rizhiDb.assetAddons.get(addon.id)).toBeUndefined();
    expect(afterAccount?.balance).toBe(beforeAccount?.balance);
    expect(assetTotalCost(asset!, afterAddons)).toBe(beforeCost);
    expect(await rizhiDb.transactions.get(addon.transactionId!)).toBeUndefined();
    expect(await rizhiDb.accountFlows.where("transactionId").equals(addon.transactionId!).count()).toBe(0);
  });

  it("repays a liability account from an asset account and creates repayment flows", async () => {
    const beforeAlipay = await rizhiDb.accounts.get("alipay");
    const beforeHuabei = await rizhiDb.accounts.get("huabei");
    expect(beforeAlipay).toBeTruthy();
    expect(beforeHuabei).toBeTruthy();

    const transaction = await accountService.repayDebt({
      fromAccountId: "alipay",
      liabilityAccountId: "huabei",
      amount: 300,
      occurredAt: "2026-06-19T12:30:00.000+08:00",
      note: "花呗还款",
    });

    const afterAlipay = await rizhiDb.accounts.get("alipay");
    const afterHuabei = await rizhiDb.accounts.get("huabei");
    const flows = await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).toArray();

    expect(transaction).toMatchObject({
      type: "repayment",
      categoryId: "tx-repayment",
      businessType: "debt_repayment",
      accountId: "alipay",
      relatedAccountId: "huabei",
      amount: 300,
    });
    expect(afterAlipay?.balance).toBe((beforeAlipay?.balance ?? 0) - 300);
    expect(afterHuabei?.balance).toBe((beforeHuabei?.balance ?? 0) - 300);
    expect(flows).toHaveLength(2);
    expect(flows).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountId: "alipay", direction: "out", amount: 300 }),
      expect.objectContaining({ accountId: "huabei", direction: "in", amount: 300 }),
    ]));
  });

  it("revokes a debt repayment and rolls back both accounts", async () => {
    const beforeAlipay = await rizhiDb.accounts.get("alipay");
    const beforeHuabei = await rizhiDb.accounts.get("huabei");
    expect(beforeAlipay).toBeTruthy();
    expect(beforeHuabei).toBeTruthy();

    const transaction = await accountService.repayDebt({
      fromAccountId: "alipay",
      liabilityAccountId: "huabei",
      amount: 240,
      occurredAt: "2026-06-19T13:00:00.000+08:00",
      note: "撤销测试还款",
    });

    await transactionService.delete(transaction.id);

    const afterAlipay = await rizhiDb.accounts.get("alipay");
    const afterHuabei = await rizhiDb.accounts.get("huabei");
    const deletedTransaction = await rizhiDb.transactions.get(transaction.id);
    const flows = await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).toArray();

    expect(afterAlipay?.balance).toBe(beforeAlipay?.balance);
    expect(afterHuabei?.balance).toBe(beforeHuabei?.balance);
    expect(deletedTransaction).toBeUndefined();
    expect(flows).toHaveLength(0);
  });

  it("transfers an asset and revokes the transfer with account rollback", async () => {
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    expect(beforeAccount).toBeTruthy();

    const transaction = await assetService.transfer({
      assetId: "ast_000002",
      amount: 500,
      occurredAt: "2026-06-19T15:00:00.000+08:00",
      accountId: "alipay",
      note: "测试转让",
    });

    const transferredAsset = await rizhiDb.assets.get("ast_000002");
    const afterTransferAccount = await rizhiDb.accounts.get("alipay");
    expect(afterTransferAccount?.balance).toBe((beforeAccount?.balance ?? 0) + 500);
    expect(transferredAsset).toMatchObject({
      status: "transferred",
      transferAmount: 500,
      transferAccountId: "alipay",
      transferTransactionId: transaction.id,
    });

    await assetService.revokeTransfer("ast_000002");

    const restoredAsset = await rizhiDb.assets.get("ast_000002");
    const afterRevokeAccount = await rizhiDb.accounts.get("alipay");
    const deletedTransaction = await rizhiDb.transactions.get(transaction.id);
    const flows = await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).toArray();

    expect(afterRevokeAccount?.balance).toBe(beforeAccount?.balance);
    expect(restoredAsset?.status).toBe("using");
    expect(restoredAsset?.transferTransactionId).toBeUndefined();
    expect(deletedTransaction).toBeUndefined();
    expect(flows).toHaveLength(0);
  });

  it("updates a manual transaction and rewrites account balance and flow", async () => {
    const beforeAlipay = await rizhiDb.accounts.get("alipay");
    const beforeWechat = await rizhiDb.accounts.get("wechat");
    expect(beforeAlipay).toBeTruthy();
    expect(beforeWechat).toBeTruthy();

    const transaction = await transactionService.create({
      type: "expense",
      categoryId: "tx-daily",
      amount: 30,
      occurredAt: "2026-06-19T10:00:00.000+08:00",
      accountId: "alipay",
      merchant: "便利店",
    });

    await transactionService.update({
      id: transaction.id,
      type: "expense",
      categoryId: "tx-food",
      amount: 45,
      occurredAt: "2026-06-20T12:00:00.000+08:00",
      accountId: "wechat",
      merchant: "餐厅",
    });

    const afterAlipay = await rizhiDb.accounts.get("alipay");
    const afterWechat = await rizhiDb.accounts.get("wechat");
    const updatedTransaction = await rizhiDb.transactions.get(transaction.id);
    const flows = await rizhiDb.accountFlows.where("transactionId").equals(transaction.id).toArray();

    expect(afterAlipay?.balance).toBe(beforeAlipay?.balance);
    expect(afterWechat?.balance).toBe((beforeWechat?.balance ?? 0) - 45);
    expect(updatedTransaction).toMatchObject({
      type: "expense",
      categoryId: "tx-food",
      amount: 45,
      accountId: "wechat",
      merchant: "餐厅",
    });
    expect(flows).toHaveLength(1);
    expect(flows[0]).toMatchObject({ accountId: "wechat", direction: "out", amount: 45 });
  });

  it("recalculates later flow balances after backdated transaction create, update and delete", async () => {
    const account = await accountService.create({
      name: "历史重算测试账户",
      type: "wallet",
      direction: "asset",
      balance: 1000,
    });
    const laterTransaction = await transactionService.create({
      type: "expense",
      categoryId: "tx-daily",
      amount: 20,
      occurredAt: "2026-06-20T12:00:00.000+08:00",
      accountId: account.id,
    });
    const earlierTransaction = await transactionService.create({
      type: "expense",
      categoryId: "tx-daily",
      amount: 100,
      occurredAt: "2026-06-10T12:00:00.000+08:00",
      accountId: account.id,
    });

    expect((await rizhiDb.accountFlows.where("transactionId").equals(earlierTransaction.id).first())?.balanceAfter).toBe(900);
    expect((await rizhiDb.accountFlows.where("transactionId").equals(laterTransaction.id).first())?.balanceAfter).toBe(880);

    await transactionService.update({
      id: earlierTransaction.id,
      type: "expense",
      categoryId: "tx-daily",
      amount: 50,
      occurredAt: earlierTransaction.occurredAt,
      accountId: account.id,
    });

    expect((await rizhiDb.accounts.get(account.id))?.balance).toBe(930);
    expect((await rizhiDb.accountFlows.where("transactionId").equals(earlierTransaction.id).first())?.balanceAfter).toBe(950);
    expect((await rizhiDb.accountFlows.where("transactionId").equals(laterTransaction.id).first())?.balanceAfter).toBe(930);

    await transactionService.delete(earlierTransaction.id);

    expect((await rizhiDb.accounts.get(account.id))?.balance).toBe(980);
    expect((await rizhiDb.accountFlows.where("transactionId").equals(laterTransaction.id).first())?.balanceAfter).toBe(980);
  });

  it("converts a manual transaction to an asset add-on and keeps the linked transaction", async () => {
    const beforeAccount = await rizhiDb.accounts.get("alipay");
    expect(beforeAccount).toBeTruthy();

    const transaction = await transactionService.create({
      type: "expense",
      categoryId: "tx-daily",
      amount: 66,
      occurredAt: "2026-06-19T10:00:00.000+08:00",
      accountId: "alipay",
      merchant: "配件店",
      note: "转成附加项",
    });

    const result = await transactionService.convertToAssetAddon({
      id: transaction.id,
      amount: 66,
      occurredAt: "2026-06-19T10:00:00.000+08:00",
      accountId: "alipay",
      assetId: "ast_000002",
      addonType: "accessory",
      includedInCost: true,
      merchant: "配件店",
      note: "转成附加项",
    });

    const afterAccount = await rizhiDb.accounts.get("alipay");
    const addon = await rizhiDb.assetAddons.get(result.addon.id);
    const updatedTransaction = await rizhiDb.transactions.get(transaction.id);

    expect(afterAccount?.balance).toBe((beforeAccount?.balance ?? 0) - 66);
    expect(addon).toMatchObject({
      assetId: "ast_000002",
      transactionId: transaction.id,
      includedInCost: true,
      amount: 66,
    });
    expect(updatedTransaction).toMatchObject({
      type: "expense",
      categoryId: "tx-asset-addon-accessory",
      assetId: "ast_000002",
      addonId: result.addon.id,
    });
  });

  it("keeps historical transactions but unlinks them when deleting an asset", async () => {
    const asset = await assetService.create({
      name: "待删除资产",
      categoryId: "asset-digital",
      originalCost: 100,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
    });
    const addon = await assetAddonService.create({
      assetId: asset.id,
      name: "待删除附加项",
      direction: "expense",
      type: "accessory",
      amount: 20,
      currency: "CNY",
      purchaseDate: "2026-06-20",
      paymentAccountId: "alipay",
      includedInCost: true,
    });

    await assetService.delete(asset.id);

    const deletedAsset = await rizhiDb.assets.get(asset.id);
    const deletedAddon = await rizhiDb.assetAddons.get(addon.id);
    const purchaseTransaction = asset.purchaseTransactionId
      ? await rizhiDb.transactions.get(asset.purchaseTransactionId)
      : undefined;
    const addonTransaction = addon.transactionId ? await rizhiDb.transactions.get(addon.transactionId) : undefined;

    expect(deletedAsset).toBeUndefined();
    expect(deletedAddon).toBeUndefined();
    expect(purchaseTransaction).toMatchObject({
      assetId: undefined,
      addonId: undefined,
      assetSnapshot: { id: asset.id, name: asset.name },
    });
    expect(addonTransaction).toMatchObject({
      assetId: undefined,
      addonId: undefined,
      assetSnapshot: { id: asset.id, name: asset.name },
    });
  });

  it("rejects add-on writes after an asset is transferred or disposed", async () => {
    await assetService.update({ id: "ast_000002", status: "disposed" });

    await expect(assetAddonService.create({
      assetId: "ast_000002",
      name: "不应允许",
      direction: "expense",
      type: "accessory",
      amount: 10,
      currency: "CNY",
      purchaseDate: "2026-06-19",
      paymentAccountId: "alipay",
      includedInCost: true,
    })).rejects.toThrow("不能新增或编辑附加项");
  });
});
