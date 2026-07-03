"use strict";

const uniIdCommon = require("uni-id-common");
const db = uniCloud.database();
const command = db.command;

const collections = {
  assets: db.collection("rizhi-assets"),
  assetAddons: db.collection("rizhi-asset-addons"),
  accounts: db.collection("rizhi-accounts"),
  transactions: db.collection("rizhi-transactions"),
  accountFlows: db.collection("rizhi-account-flows"),
  categories: db.collection("rizhi-categories"),
};

const collectionNames = Object.keys(collections);

function response(statusCode, body) {
  return {
    mpserverlessComposedResponse: true,
    isBase64Encoded: false,
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Rizhi-User-ID",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function ok(data, statusCode = 200) {
  return response(statusCode, { data });
}

function fail(statusCode, code, message, details) {
  return response(statusCode, { error: { code, message, details } });
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("请求体必须是有效的 JSON");
  }
}

function parseTransportRequest(event) {
  const query = event.queryStringParameters || {};
  const rawBody = parseBody(event);
  if (rawBody && rawBody.__rizhiTransport === true) {
    return {
      method: String(rawBody.method || "GET").toUpperCase(),
      body: rawBody.payload || {},
      token: String(rawBody.token || ""),
      query,
    };
  }
  return {
    method: String(query.__method || event.httpMethod || "GET").toUpperCase(),
    body: rawBody,
    token: String(query.__token || ""),
    query,
  };
}

async function authenticate(event, token) {
  if (!token) {
    const error = new Error("请先登录");
    error.statusCode = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }
  const headers = event.headers || {};
  const uniId = uniIdCommon.createInstance({
    clientInfo: {
      appId: "__UNI__2A67492",
      uniPlatform: "web",
      locale: "zh-Hans",
      clientIP: headers["x-forwarded-for"] || headers["x-real-ip"] || "",
      userAgent: headers["user-agent"] || "",
    },
  });
  const result = await uniId.checkToken(token);
  if (!result || result.errCode) {
    const error = new Error(result?.errMsg || "登录状态已失效");
    error.statusCode = 401;
    error.code = result?.errCode || "UNAUTHORIZED";
    throw error;
  }
  return result;
}

async function claimLocalData(userId) {
  let claimed = 0;
  for (const name of collectionNames) {
    const ownCount = await collections[name].where({ userId }).count();
    if (ownCount.total > 0) continue;
    const result = await collections[name].where({ userId: "user-local" }).update({ userId });
    claimed += result.updated || result.affectedDocs || 0;
  }
  return { claimed };
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return new Date().toISOString();
}

function withoutInternalFields(record) {
  if (!record) return record;
  const { _id, userId, ...result } = record;
  return result;
}

async function findAll(name, userId, orderBy = "createdAt", direction = "desc") {
  const result = await collections[name]
    .where({ userId })
    .orderBy(orderBy, direction)
    .limit(1000)
    .get();
  return result.data.map(withoutInternalFields);
}

async function findOne(name, userId, id) {
  const result = await collections[name].where({ userId, id }).limit(1).get();
  return result.data[0];
}

async function insert(name, userId, record) {
  await collections[name].add({ ...record, userId });
  return record;
}

async function replace(name, userId, id, record) {
  const existing = await findOne(name, userId, id);
  if (!existing) throw new Error("记录不存在");
  await collections[name].doc(existing._id).set({ ...record, id, userId });
  return record;
}

async function remove(name, userId, id) {
  const existing = await findOne(name, userId, id);
  if (!existing) throw new Error("记录不存在");
  await collections[name].doc(existing._id).remove();
  return withoutInternalFields(existing);
}

async function getSnapshot(userId) {
  const [assets, assetAddons, accounts, transactions, accountFlows, categories] = await Promise.all([
    findAll("assets", userId),
    findAll("assetAddons", userId),
    findAll("accounts", userId, "createdAt", "asc"),
    findAll("transactions", userId, "occurredAt", "desc"),
    findAll("accountFlows", userId, "occurredAt", "desc"),
    findAll("categories", userId, "sort", "asc"),
  ]);
  return { assets, assetAddons, accounts, transactions, accountFlows, categories };
}

async function importSnapshot(userId, snapshot) {
  const source = snapshot && snapshot.data ? snapshot.data : snapshot;
  for (const name of collectionNames) {
    if (!Array.isArray(source[name])) throw new Error(`缺少数据集合：${name}`);
  }

  for (const name of collectionNames) {
    await collections[name].where({ userId }).remove();
    const records = source[name];
    for (let index = 0; index < records.length; index += 100) {
      const batch = records.slice(index, index + 100).map((record) => ({ ...record, userId }));
      if (batch.length) await collections[name].add(batch);
    }
  }
  return getSnapshot(userId);
}

async function exportBackup(userId) {
  const snapshot = await getSnapshot(userId);
  return {
    format: "rizhi-local-backup",
    version: 1,
    exportedAt: now(),
    app: "rizhi",
    data: {
      ...snapshot,
      assetPartEvents: [],
      settings: [],
      metadata: [],
    },
  };
}

async function updateAccountBalance(userId, accountId, delta, transactionId, occurredAt, note) {
  const account = await findOne("accounts", userId, accountId);
  if (!account) throw new Error("账户不存在");
  const balanceAfter = Number(account.balance || 0) + delta;
  await collections.accounts.doc(account._id).update({ balance: balanceAfter, updatedAt: now() });
  const flow = {
    id: newId("flow"),
    accountId,
    transactionId,
    direction: delta >= 0 ? "in" : "out",
    amount: Math.abs(delta),
    occurredAt,
    balanceAfter,
    note,
    createdAt: now(),
    updatedAt: now(),
  };
  await insert("accountFlows", userId, flow);
  return flow;
}

async function createTransaction(userId, body, type) {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("金额必须大于 0");
  if (!body.accountId) throw new Error("请选择账户");
  const timestamp = now();
  const transaction = {
    ...body,
    id: newId("txn"),
    type,
    businessType: body.businessType || "normal",
    amount,
    occurredAt: body.occurredAt || timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await insert("transactions", userId, transaction);
  await updateAccountBalance(
    userId,
    transaction.accountId,
    type === "income" ? amount : -amount,
    transaction.id,
    transaction.occurredAt,
    transaction.note,
  );
  return transaction;
}

async function updateTransaction(userId, id, body) {
  const existing = await findOne("transactions", userId, id);
  if (!existing) throw new Error("交易不存在");
  if (existing.businessType && existing.businessType !== "normal") {
    throw new Error("联动交易请在对应业务入口修改");
  }

  const oldDelta = existing.type === "income" ? Number(existing.amount) : -Number(existing.amount);
  await updateAccountBalance(userId, existing.accountId, -oldDelta, id, now(), "撤销交易原值");

  const updated = {
    ...withoutInternalFields(existing),
    ...body,
    id,
    amount: Number(body.amount),
    updatedAt: now(),
  };
  if (!Number.isFinite(updated.amount) || updated.amount <= 0) throw new Error("金额必须大于 0");
  await replace("transactions", userId, id, updated);
  const newDelta = updated.type === "income" ? updated.amount : -updated.amount;
  await updateAccountBalance(userId, updated.accountId, newDelta, id, updated.occurredAt, updated.note);
  return updated;
}

async function deleteTransaction(userId, id) {
  const existing = await findOne("transactions", userId, id);
  if (!existing) throw new Error("交易不存在");
  if (existing.businessType && existing.businessType !== "normal") {
    throw new Error("联动交易请在对应业务入口删除");
  }
  const delta = existing.type === "income" ? -Number(existing.amount) : Number(existing.amount);
  await updateAccountBalance(userId, existing.accountId, delta, id, now(), "删除交易回滚");
  await collections.accountFlows.where({ userId, transactionId: id }).remove();
  await collections.transactions.doc(existing._id).remove();
  return null;
}

async function createAccount(userId, body) {
  if (!String(body.name || "").trim()) throw new Error("账户名称不能为空");
  const timestamp = now();
  return insert("accounts", userId, {
    ...body,
    id: newId("acc"),
    name: String(body.name).trim(),
    balance: Number(body.balance || 0),
    enabled: body.enabled !== false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function deleteAccount(userId, id) {
  const flowCount = await collections.accountFlows.where({ userId, accountId: id }).count();
  if (flowCount.total > 0) throw new Error("该账户已有资金流水，不能删除");
  await remove("accounts", userId, id);
  return null;
}

async function transferFunds(userId, body) {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("转账金额必须大于 0");
  if (!body.fromAccountId || !body.toAccountId || body.fromAccountId === body.toAccountId) {
    throw new Error("请选择不同的转出和转入账户");
  }
  const timestamp = now();
  const transaction = {
    id: newId("txn"),
    type: "transfer",
    categoryId: "cat-transfer",
    businessType: "account_transfer",
    amount,
    occurredAt: body.occurredAt || timestamp,
    accountId: body.fromAccountId,
    relatedAccountId: body.toAccountId,
    note: body.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await insert("transactions", userId, transaction);
  await updateAccountBalance(userId, body.fromAccountId, -amount, transaction.id, transaction.occurredAt, body.note);
  await updateAccountBalance(userId, body.toAccountId, amount, transaction.id, transaction.occurredAt, body.note);
  return transaction;
}

async function repayDebt(userId, body) {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("还款金额必须大于 0");
  const source = await findOne("accounts", userId, body.fromAccountId);
  const liability = await findOne("accounts", userId, body.liabilityAccountId);
  if (!source || !liability) throw new Error("还款账户不存在");
  if (liability.direction !== "liability") throw new Error("目标账户不是负债账户");
  const timestamp = now();
  const transaction = {
    id: newId("txn"),
    type: "repayment",
    categoryId: "cat-repayment",
    businessType: "debt_repayment",
    amount,
    occurredAt: body.occurredAt || timestamp,
    accountId: source.id,
    relatedAccountId: liability.id,
    note: body.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await insert("transactions", userId, transaction);
  await updateAccountBalance(userId, source.id, -amount, transaction.id, transaction.occurredAt, body.note);
  await updateAccountBalance(userId, liability.id, -amount, transaction.id, transaction.occurredAt, body.note);
  return transaction;
}

async function categorySnapshot(userId, categoryId, subCategoryId) {
  const category = await findOne("categories", userId, categoryId);
  const subCategory = subCategoryId ? await findOne("categories", userId, subCategoryId) : null;
  return {
    categoryName: category ? category.name : "未分类",
    subCategoryName: subCategory ? subCategory.name : undefined,
  };
}

async function createAsset(userId, body) {
  if (!String(body.name || "").trim()) throw new Error("资产名称不能为空");
  const cost = Number(body.originalCost);
  if (!Number.isFinite(cost) || cost < 0) throw new Error("购入价格不能小于 0");
  const timestamp = now();
  const asset = {
    ...body,
    id: newId("ast"),
    userId,
    name: String(body.name).trim(),
    status: body.status || "using",
    originalCost: cost,
    currency: body.currency || "CNY",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  delete asset.userId;

  if (body.paymentAccountId && cost > 0) {
    const transaction = {
      id: newId("txn"),
      type: "asset_purchase",
      categoryId: "cat-asset-purchase",
      businessType: "asset_purchase",
      amount: cost,
      occurredAt: body.purchaseDate || timestamp,
      accountId: body.paymentAccountId,
      assetId: asset.id,
      assetSnapshot: { id: asset.id, name: asset.name },
      merchant: body.merchant,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    asset.purchaseTransactionId = transaction.id;
    await insert("transactions", userId, transaction);
    await updateAccountBalance(userId, body.paymentAccountId, -cost, transaction.id, transaction.occurredAt, asset.name);
  }

  return insert("assets", userId, asset);
}

async function createAddon(userId, assetId, body) {
  const asset = await findOne("assets", userId, assetId);
  if (!asset) throw new Error("资产不存在");
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("附加项金额必须大于 0");
  const direction = body.direction || "expense";
  const timestamp = now();
  const addon = {
    ...body,
    id: newId("addon"),
    assetId,
    direction,
    amount,
    currency: body.currency || "CNY",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (body.paymentAccountId) {
    const transaction = {
      id: newId("txn"),
      type: direction === "income" ? "income" : "expense",
      categoryId: direction === "income" ? "cat-asset-addon-income" : "cat-asset-addon",
      businessType: "asset_addon",
      amount,
      occurredAt: body.purchaseDate || timestamp,
      accountId: body.paymentAccountId,
      assetId,
      assetSnapshot: { id: asset.id, name: asset.name },
      addonId: addon.id,
      merchant: body.merchant,
      note: body.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    addon.transactionId = transaction.id;
    await insert("transactions", userId, transaction);
    await updateAccountBalance(
      userId,
      body.paymentAccountId,
      direction === "income" ? amount : -amount,
      transaction.id,
      transaction.occurredAt,
      body.notes,
    );
  }
  return insert("assetAddons", userId, addon);
}

async function deleteAddon(userId, id) {
  const addon = await findOne("assetAddons", userId, id);
  if (!addon) throw new Error("附加项不存在");
  if (addon.transactionId) {
    const transaction = await findOne("transactions", userId, addon.transactionId);
    if (transaction) {
      const rollback = transaction.type === "income" ? -Number(transaction.amount) : Number(transaction.amount);
      await updateAccountBalance(userId, transaction.accountId, rollback, transaction.id, now(), "删除附加项回滚");
      await collections.accountFlows.where({ userId, transactionId: transaction.id }).remove();
      await collections.transactions.doc(transaction._id).remove();
    }
  }
  await collections.assetAddons.doc(addon._id).remove();
  return null;
}

async function updateAddon(userId, id, body) {
  const existing = await findOne("assetAddons", userId, id);
  if (!existing) throw new Error("附加项不存在");
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("附加项金额必须大于 0");
  const updated = {
    ...withoutInternalFields(existing),
    ...body,
    id,
    amount,
    updatedAt: now(),
  };

  if (existing.transactionId) {
    const transaction = await findOne("transactions", userId, existing.transactionId);
    if (transaction) {
      const oldDelta = transaction.type === "income" ? Number(transaction.amount) : -Number(transaction.amount);
      await updateAccountBalance(userId, transaction.accountId, -oldDelta, transaction.id, now(), "撤销附加项原值");
      await collections.accountFlows.where({ userId, transactionId: transaction.id }).remove();

      const direction = updated.direction || "expense";
      const nextTransaction = {
        ...withoutInternalFields(transaction),
        type: direction === "income" ? "income" : "expense",
        amount,
        occurredAt: updated.purchaseDate,
        accountId: updated.paymentAccountId,
        merchant: updated.merchant,
        note: updated.notes,
        updatedAt: now(),
      };
      if (!nextTransaction.accountId) throw new Error("关联交易必须选择账户");
      await replace("transactions", userId, transaction.id, nextTransaction);
      await updateAccountBalance(
        userId,
        nextTransaction.accountId,
        nextTransaction.type === "income" ? amount : -amount,
        nextTransaction.id,
        nextTransaction.occurredAt,
        nextTransaction.note,
      );
    }
  }

  return replace("assetAddons", userId, id, updated);
}

async function convertTransactionToAddon(userId, body) {
  const transaction = await findOne("transactions", userId, body.id);
  if (!transaction) throw new Error("交易不存在");
  if (transaction.type !== "expense") throw new Error("只有支出可以转换为资产附加项");
  const asset = await findOne("assets", userId, body.assetId);
  if (!asset) throw new Error("资产不存在");
  const timestamp = now();
  const addon = {
    id: newId("addon"),
    assetId: asset.id,
    name: body.note || transaction.merchant || "资产附加项",
    direction: "expense",
    type: body.addonType || "other",
    amount: Number(body.amount || transaction.amount),
    currency: "CNY",
    purchaseDate: body.occurredAt || transaction.occurredAt,
    merchant: body.merchant || transaction.merchant,
    paymentAccountId: body.accountId || transaction.accountId,
    transactionId: transaction.id,
    includedInCost: body.includedInCost !== false,
    notes: body.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await insert("assetAddons", userId, addon);
  const updatedTransaction = {
    ...withoutInternalFields(transaction),
    businessType: "asset_addon",
    assetId: asset.id,
    assetSnapshot: { id: asset.id, name: asset.name },
    addonId: addon.id,
    updatedAt: timestamp,
  };
  await replace("transactions", userId, transaction.id, updatedTransaction);
  return { addon, transaction: updatedTransaction };
}

async function transferAsset(userId, assetId, body) {
  const asset = await findOne("assets", userId, assetId);
  if (!asset) throw new Error("资产不存在");
  if (asset.status === "transferred") throw new Error("资产已经转让");
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("转让金额不能小于 0");
  const timestamp = now();
  let transactionId;
  if (amount > 0 && body.accountId) {
    const transaction = {
      id: newId("txn"),
      type: "income",
      categoryId: "cat-asset-transfer",
      businessType: "asset_transfer",
      amount,
      occurredAt: body.occurredAt || timestamp,
      accountId: body.accountId,
      assetId,
      assetSnapshot: { id: asset.id, name: asset.name },
      note: body.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    transactionId = transaction.id;
    await insert("transactions", userId, transaction);
    await updateAccountBalance(userId, body.accountId, amount, transaction.id, transaction.occurredAt, body.note);
  }
  const updated = {
    ...withoutInternalFields(asset),
    status: "transferred",
    transferDate: body.occurredAt || timestamp,
    transferAmount: amount,
    transferAccountId: body.accountId,
    transferTransactionId: transactionId,
    updatedAt: timestamp,
  };
  await replace("assets", userId, assetId, updated);
  return transactionId ? withoutInternalFields(await findOne("transactions", userId, transactionId)) : null;
}

async function revokeAssetTransfer(userId, assetId) {
  const asset = await findOne("assets", userId, assetId);
  if (!asset) throw new Error("资产不存在");
  if (asset.status !== "transferred") throw new Error("资产当前不是已转让状态");
  if (asset.transferTransactionId) {
    const transaction = await findOne("transactions", userId, asset.transferTransactionId);
    if (transaction) {
      await updateAccountBalance(userId, transaction.accountId, -Number(transaction.amount), transaction.id, now(), "撤销资产转让");
      await collections.accountFlows.where({ userId, transactionId: transaction.id }).remove();
      await collections.transactions.doc(transaction._id).remove();
    }
  }
  await replace("assets", userId, assetId, {
    ...withoutInternalFields(asset),
    status: "using",
    transferDate: undefined,
    transferAmount: undefined,
    transferAccountId: undefined,
    transferTransactionId: undefined,
    updatedAt: now(),
  });
  return null;
}

async function categoryUsage(userId, id) {
  const [assets, directTransactions, subTransactions, children] = await Promise.all([
    collections.assets.where({ userId, categoryId: id }).count(),
    collections.transactions.where({ userId, categoryId: id }).count(),
    collections.transactions.where({ userId, subCategoryId: id }).count(),
    collections.categories.where({ userId, parentId: id }).count(),
  ]);
  return {
    assets: assets.total,
    transactions: directTransactions.total + subTransactions.total,
    childCategories: children.total,
    accounts: 0,
    total: assets.total + directTransactions.total + subTransactions.total + children.total,
  };
}

async function handleAssets(method, path, body, userId) {
  if (method === "GET" && path === "/assets") return ok(await findAll("assets", userId));
  if (method === "POST" && path === "/assets") return ok(await createAsset(userId, body), 201);

  const addonCreate = path.match(/^\/assets\/([^/]+)\/addons$/);
  if (method === "POST" && addonCreate) {
    return ok(await createAddon(userId, decodeURIComponent(addonCreate[1]), body), 201);
  }
  const transferRevoke = path.match(/^\/assets\/([^/]+)\/transfer\/revoke$/);
  if (method === "POST" && transferRevoke) {
    return ok(await revokeAssetTransfer(userId, decodeURIComponent(transferRevoke[1])));
  }
  const transfer = path.match(/^\/assets\/([^/]+)\/transfer$/);
  if (method === "POST" && transfer) {
    return ok(await transferAsset(userId, decodeURIComponent(transfer[1]), body), 201);
  }
  const match = path.match(/^\/assets\/([^/]+)$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  if (method === "GET") {
    const asset = await findOne("assets", userId, id);
    if (!asset) throw new Error("资产不存在");
    return ok(withoutInternalFields(asset));
  }
  if (method === "PATCH") {
    const existing = await findOne("assets", userId, id);
    if (!existing) throw new Error("资产不存在");
    return ok(await replace("assets", userId, id, {
      ...withoutInternalFields(existing),
      ...body,
      id,
      updatedAt: now(),
    }));
  }
  if (method === "DELETE") {
    await remove("assets", userId, id);
    return ok(null);
  }
  return null;
}

async function handleAddons(method, path, body, userId) {
  const match = path.match(/^\/addons\/([^/]+)$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  if (method === "PATCH") {
    return ok(await updateAddon(userId, id, body));
  }
  if (method === "DELETE") return ok(await deleteAddon(userId, id));
  return null;
}

async function handleCategories(method, path, body, userId, query) {
  if (method === "GET" && path === "/categories") {
    const all = await findAll("categories", userId, "sort", "asc");
    return ok(all
      .filter((item) => !query.domain || item.domain === query.domain)
      .filter((item) => !query.type || item.type === query.type)
      .filter((item) => query.enabled === undefined || String(item.enabled !== false) === query.enabled));
  }
  if (method === "POST" && path === "/categories") {
    if (!String(body.name || "").trim()) throw new Error("分类名称不能为空");
    return ok(await insert("categories", userId, {
      ...body,
      id: newId("cat"),
      name: String(body.name).trim(),
      sort: Number(body.sort || 999),
      enabled: body.enabled !== false,
    }), 201);
  }
  const usageMatch = path.match(/^\/categories\/([^/]+)\/usage$/);
  if (method === "GET" && usageMatch) return ok(await categoryUsage(userId, decodeURIComponent(usageMatch[1])));
  const migrateMatch = path.match(/^\/categories\/([^/]+)\/migrate-transactions$/);
  if (method === "POST" && migrateMatch) {
    const fromId = decodeURIComponent(migrateMatch[1]);
    const categoryIds = [fromId];
    const children = await collections.categories.where({ userId, parentId: fromId }).get();
    categoryIds.push(...children.data.map((item) => item.id));
    const snapshot = await categorySnapshot(userId, body.toCategoryId, body.toSubCategoryId);
    let migratedCount = 0;
    for (const categoryId of categoryIds) {
      const byCategory = await collections.transactions.where({ userId, categoryId }).get();
      const bySubCategory = await collections.transactions.where({ userId, subCategoryId: categoryId }).get();
      const records = new Map([...byCategory.data, ...bySubCategory.data].map((item) => [item._id, item]));
      for (const record of records.values()) {
        await collections.transactions.doc(record._id).update({
          categoryId: body.toCategoryId,
          subCategoryId: body.toSubCategoryId,
          categorySnapshot: snapshot,
          updatedAt: now(),
        });
        migratedCount += 1;
      }
    }
    return ok({ migratedCount });
  }
  const match = path.match(/^\/categories\/([^/]+)$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  if (method === "PATCH") {
    const existing = await findOne("categories", userId, id);
    if (!existing) throw new Error("分类不存在");
    return ok(await replace("categories", userId, id, {
      ...withoutInternalFields(existing),
      ...body,
      id,
    }));
  }
  if (method === "DELETE") {
    const usage = await categoryUsage(userId, id);
    if (usage.total > 0) throw new Error("分类仍有业务记录或子分类，不能删除");
    await remove("categories", userId, id);
    return ok(null);
  }
  return null;
}

async function handleAccounts(method, path, body, userId) {
  if (method === "POST" && path === "/accounts/transfer") return ok(await transferFunds(userId, body), 201);
  if (method === "GET" && path === "/accounts") return ok(await findAll("accounts", userId, "createdAt", "asc"));
  if (method === "POST" && path === "/accounts") return ok(await createAccount(userId, body), 201);

  const match = path.match(/^\/accounts\/([^/]+)$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  if (method === "PATCH") {
    const existing = await findOne("accounts", userId, id);
    if (!existing) throw new Error("账户不存在");
    return ok(await replace("accounts", userId, id, {
      ...withoutInternalFields(existing),
      ...body,
      id,
      updatedAt: now(),
    }));
  }
  if (method === "DELETE") return ok(await deleteAccount(userId, id));
  return null;
}

async function handleTransactions(method, path, body, userId) {
  if (method === "POST" && path === "/transactions/repayment") {
    return ok(await repayDebt(userId, body), 201);
  }
  if (method === "POST" && path === "/transactions/convert-to-asset-addon") {
    return ok(await convertTransactionToAddon(userId, body), 201);
  }
  if (method === "POST" && path === "/transactions/expense") {
    return ok(await createTransaction(userId, body, "expense"), 201);
  }
  if (method === "POST" && path === "/transactions/income") {
    return ok(await createTransaction(userId, body, "income"), 201);
  }
  const match = path.match(/^\/transactions\/([^/]+)$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  if (method === "PATCH") return ok(await updateTransaction(userId, id, body));
  if (method === "DELETE") return ok(await deleteTransaction(userId, id));
  return null;
}

async function route(event) {
  const { method, body, token, query } = parseTransportRequest(event);
  const path = String(event.path || "/").replace(/^\/api\/v1/, "") || "/";
  if (method === "OPTIONS") return response(200, { ok: true });

  if (method === "GET" && path === "/health") {
    return ok({ status: "ok", storage: "unicloud", timestamp: now() });
  }
  const auth = await authenticate(event, token);
  const userId = auth.uid;
  if (method === "POST" && path === "/auth/claim-local-data") {
    return ok(await claimLocalData(userId));
  }
  if (method === "GET" && path === "/snapshot") return ok(await getSnapshot(userId));
  if (method === "GET" && path === "/export") return ok(await exportBackup(userId));
  if (method === "POST" && path === "/import") return ok(await importSnapshot(userId, body));
  if (method === "POST" && path === "/reset") {
    for (const name of collectionNames) await collections[name].where({ userId }).remove();
    return ok(null);
  }

  const accountResult = await handleAccounts(method, path, body, userId);
  if (accountResult) return accountResult;
  const transactionResult = await handleTransactions(method, path, body, userId);
  if (transactionResult) return transactionResult;
  const assetResult = await handleAssets(method, path, body, userId);
  if (assetResult) return assetResult;
  const addonResult = await handleAddons(method, path, body, userId);
  if (addonResult) return addonResult;
  const categoryResult = await handleCategories(method, path, body, userId, query);
  if (categoryResult) return categoryResult;

  return fail(501, "NOT_MIGRATED", "该业务接口尚未迁移到 uniCloud");
}

exports.main = async (event) => {
  try {
    return await route(event);
  } catch (error) {
    console.error(error);
    return fail(
      error?.statusCode || 400,
      error?.code || "REQUEST_FAILED",
      error && error.message ? error.message : "请求失败",
    );
  }
};
