"use strict";

const uniIdCommon = require("uni-id-common");
const db = uniCloud.database();
const command = db.command;
const userProfiles = db.collection("rizhi-user-profiles");
const uniIdUsers = db.collection("uni-id-users");

const collections = {
  assets: db.collection("rizhi-assets"),
  assetAddons: db.collection("rizhi-asset-addons"),
  accounts: db.collection("rizhi-accounts"),
  transactions: db.collection("rizhi-transactions"),
  accountFlows: db.collection("rizhi-account-flows"),
  categories: db.collection("rizhi-categories"),
};

const collectionNames = Object.keys(collections);
const SYSTEM_USER_ID = "__system__";
function categoryScopes(category) {
  if (Array.isArray(category.scopes) && category.scopes.length) return [...new Set(category.scopes)];
  if (category.domain === "asset") return ["asset", "expense"];
  if (category.domain === "transaction" && category.type === "income") return ["income"];
  if (category.domain === "transaction" && category.type === "refund") return ["income"];
  if (category.domain === "transaction") return ["expense"];
  return [];
}

function categoryHasScope(category, scope) {
  return categoryScopes(category).includes(scope);
}

function normalizeCategory(record) {
  return { ...record, scopes: categoryScopes(record) };
}

const systemCategoryDefaults = [
  { id: "asset-digital", domain: "asset", type: "digital", name: "数码设备", sort: 10, color: "#1677FF" },
  { id: "asset-clothing", domain: "asset", type: "clothing", name: "衣物鞋子", sort: 20, color: "#8B5CF6" },
  { id: "asset-home", domain: "asset", type: "home", name: "家居用品", sort: 30, color: "#F59E0B" },
  { id: "asset-sports", domain: "asset", type: "sports", name: "运动器材", sort: 40, color: "#16A36A" },
  { id: "asset-subscription", domain: "asset", type: "subscription", name: "订阅服务", sort: 50, color: "#111827" },
  { id: "asset-other", domain: "asset", type: "other", name: "其他物品", sort: 90, color: "#64748B" },
  { id: "bank-icbc", domain: "bank", name: "中国工商银行", sort: 10, color: "#E60012", icon: "工" },
  { id: "bank-abc", domain: "bank", name: "中国农业银行", sort: 20, color: "#009882", icon: "农" },
  { id: "bank-boc", domain: "bank", name: "中国银行", sort: 30, color: "#B40A19", icon: "中" },
  { id: "bank-ccb", domain: "bank", name: "中国建设银行", sort: 40, color: "#0066B3", icon: "建" },
  { id: "bank-bocom", domain: "bank", name: "交通银行", sort: 50, color: "#003B7C", icon: "交" },
  { id: "bank-cmb", domain: "bank", name: "招商银行", sort: 60, color: "#D71920", icon: "招" },
  { id: "bank-psbc", domain: "bank", name: "中国邮政储蓄银行", sort: 70, color: "#008A45", icon: "邮" },
  { id: "bank-other", domain: "bank", name: "其他银行", sort: 999, color: "#64748B", icon: "银" },
  { id: "account-cash", domain: "account", type: "cash", name: "现金", icon: "现", color: "#3B82F6", sort: 510, accountGroup: "asset", accountDirection: "asset" },
  { id: "account-wechat", domain: "account", type: "wallet", name: "微信", icon: "微", color: "#22C55E", sort: 520, accountGroup: "asset", accountDirection: "asset" },
  { id: "account-alipay", domain: "account", type: "wallet", name: "支付宝", icon: "支", color: "#1677FF", sort: 530, accountGroup: "asset", accountDirection: "asset" },
  { id: "account-bank-card", domain: "account", type: "debit_card", name: "银行卡", icon: "卡", color: "#38BDF8", sort: 540, accountGroup: "asset", accountDirection: "asset" },
  { id: "account-other-asset", domain: "account", type: "other", name: "其他", icon: "其", color: "#94A3B8", sort: 590, accountGroup: "asset", accountDirection: "asset" },
  { id: "account-credit-card", domain: "account", type: "credit_card", name: "信用卡", icon: "信", color: "#F97316", sort: 610, accountGroup: "credit", accountDirection: "liability" },
  { id: "account-huabei", domain: "account", type: "consumer_credit", name: "花呗", icon: "花", color: "#3B82F6", sort: 620, accountGroup: "credit", accountDirection: "liability" },
  { id: "account-jiebei", domain: "account", type: "consumer_credit", name: "借呗", icon: "借", color: "#0EA5E9", sort: 630, accountGroup: "credit", accountDirection: "liability" },
  { id: "account-jd", domain: "account", type: "consumer_credit", name: "京东白条", icon: "京", color: "#EF4444", sort: 640, accountGroup: "credit", accountDirection: "liability" },
  { id: "account-mobile", domain: "account", type: "wallet", name: "话费充值", icon: "话", color: "#06B6D4", sort: 710, accountGroup: "stored_value", accountDirection: "asset" },
  { id: "account-food", domain: "account", type: "wallet", name: "餐饮卡", icon: "餐", color: "#14B8A6", sort: 720, accountGroup: "stored_value", accountDirection: "asset" },
  { id: "account-transport", domain: "account", type: "wallet", name: "交通卡", icon: "交", color: "#0EA5E9", sort: 730, accountGroup: "stored_value", accountDirection: "asset" },
];

async function ensureSystemCategories() {
  const existing = await collections.categories.where({ userId: SYSTEM_USER_ID }).get();
  const ids = new Set(existing.data.map((item) => item.id));
  const missing = systemCategoryDefaults
    .filter((item) => !ids.has(item.id))
    .map((item) => ({ ...normalizeCategory(item), userId: SYSTEM_USER_ID, enabled: true, isSystem: true }));
  if (missing.length) await collections.categories.add(missing);
}

async function clearUserBusinessData(userId) {
  const [assetResult, addonResult] = await Promise.all([
    collections.assets.where({ userId }).get(),
    collections.assetAddons.where({ userId }).get(),
  ]);
  const records = [...(assetResult.data || []), ...(addonResult.data || [])];
  const fileIds = [...new Set(records.flatMap((record) =>
    (record.attachments || [])
      .map((attachment) => attachment.storageFileId)
      .filter(Boolean)))];

  if (fileIds.length) {
    await uniCloud.deleteFile({ fileList: fileIds });
  }

  const deleted = {};
  for (const name of collectionNames) {
    const result = await collections[name].where({ userId }).remove();
    deleted[name] = result.deleted || 0;
  }

  return {
    deleted,
    deletedFiles: fileIds.length,
  };
}

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
  const userResult = await uniIdUsers.doc(result.uid).field({ status: true }).get();
  const user = userResult.data?.[0];
  if (!user || Number(user.status || 0) !== 0) {
    const error = new Error(Number(user?.status) === 1 ? "账户已被停用" : "账户当前不可用");
    error.statusCode = 401;
    error.code = Number(user?.status) === 1 ? "ACCOUNT_DISABLED" : "ACCOUNT_UNAVAILABLE";
    throw error;
  }
  return result;
}

async function invokeUniId(event, method, params, deviceId) {
  const headers = event.headers || {};
  const bridgeClientInfo = {
    deviceId: String(deviceId || ""),
    clientIP: headers["x-forwarded-for"] || headers["x-real-ip"] || "",
    userAgent: headers["user-agent"] || "",
  };
  const invocation = await uniCloud.callFunction({
    name: "uni-id-co",
    data: {
      method,
      params: [
        {
          ...params,
          __rizhiClientInfo: bridgeClientInfo,
        },
        {
          __rizhiClientInfo: bridgeClientInfo,
        },
      ],
    },
  });
  const result = invocation.result;
  if (!result || result.errCode) {
    const error = new Error(result?.errMsg || "账户服务请求失败");
    error.statusCode = method === "login" ? 401 : 400;
    error.code = result?.errCode || "AUTH_REQUEST_FAILED";
    throw error;
  }
  return result;
}

async function loginWithPassword(event, body) {
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) throw new Error("请输入用户名和密码");
  return invokeUniId(event, "login", { username, password }, body.deviceId);
}

async function createRegisterCaptcha(event, body) {
  if (!body.deviceId) throw new Error("缺少客户端设备标识");
  return invokeUniId(event, "createCaptcha", { scene: "register" }, body.deviceId);
}

async function registerWithPassword(event, body) {
  const username = String(body.username || "").trim();
  const nickname = String(body.nickname || "").trim();
  const password = String(body.password || "");
  const captcha = String(body.captcha || "").trim();
  if (!username || !password || !captcha || !body.deviceId) throw new Error("请完整填写注册信息");
  return invokeUniId(event, "registerUser", {
    username,
    nickname,
    password,
    captcha,
  }, body.deviceId);
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

function requireAdmin(auth) {
  if (Array.isArray(auth?.role) && (auth.role.includes("admin") || auth.role.includes("super_admin"))) return;
  const error = new Error("需要管理员权限");
  error.statusCode = 403;
  error.code = "FORBIDDEN";
  throw error;
}

function requireSuperAdmin(auth) {
  if (Array.isArray(auth?.role) && auth.role.includes("super_admin")) return;
  const error = new Error("需要超级管理员权限");
  error.statusCode = 403;
  error.code = "SUPER_ADMIN_REQUIRED";
  throw error;
}

async function listAdminUsers(auth) {
  requireAdmin(auth);
  const [result, profileResult] = await Promise.all([uniIdUsers
    .field({ username: true, nickname: true, avatar: true, role: true, status: true, register_date: true })
    .orderBy("register_date", "desc")
    .limit(200)
    .get(), userProfiles.limit(200).get()]);
  const profileByUserId = new Map(profileResult.data.map((profile) => [profile.userId, profile]));
  const avatarUrls = await getTemporaryFileUrls(profileResult.data.map((profile) => profile.avatarFileId).filter(Boolean));
  return result.data.map((user) => {
    const profile = profileByUserId.get(user._id);
    return ({
    id: user._id,
    username: user.username || "",
    nickname: profile?.displayName || user.nickname || "",
    avatar: avatarUrls.get(profile?.avatarFileId) || user.avatar || "",
    roles: Array.isArray(user.role) ? user.role : [],
    status: user.status,
    isCurrent: user._id === auth.uid,
    registeredAt: user.register_date,
    });
  });
}

async function updateUserStatus(auth, targetUserId, enabled) {
  requireAdmin(auth);
  if (!targetUserId) throw new Error("缺少用户 ID");
  if (targetUserId === auth.uid) throw new Error("不能停用自己的账户");
  const targetResult = await uniIdUsers.doc(targetUserId).get();
  const target = targetResult.data?.[0];
  if (!target) throw new Error("用户不存在");
  const targetRoles = Array.isArray(target.role) ? target.role : [];
  if (targetRoles.includes("super_admin")) throw new Error("超级管理员账户不能被停用");
  const operatorIsSuperAdmin = Array.isArray(auth.role) && auth.role.includes("super_admin");
  if (targetRoles.includes("admin") && !operatorIsSuperAdmin) {
    throw new Error("只有超级管理员可以停用管理员账户");
  }
  const status = enabled ? 0 : 1;
  await uniIdUsers.doc(targetUserId).update({ status });
  return { id: targetUserId, status };
}

async function updateAdminRole(auth, targetUserId, enabled) {
  requireSuperAdmin(auth);
  if (!targetUserId) throw new Error("缺少用户 ID");
  if (!enabled && targetUserId === auth.uid) throw new Error("不能取消自己的管理员身份");
  const targetResult = await uniIdUsers.doc(targetUserId).get();
  const target = targetResult.data?.[0];
  if (!target) throw new Error("用户不存在");
  const roles = Array.isArray(target.role) ? target.role.filter(Boolean) : [];
  if (roles.includes("super_admin")) throw new Error("超级管理员身份不能在此页面修改");
  const nextRoles = enabled
    ? [...new Set([...roles, "admin"])]
    : roles.filter((role) => role !== "admin");
  if (!enabled) {
    const privilegedUsers = await uniIdUsers.field({ role: true }).limit(500).get();
    const managerCount = privilegedUsers.data.filter((user) => {
      const userRoles = Array.isArray(user.role) ? user.role : [];
      return userRoles.includes("admin") || userRoles.includes("super_admin");
    }).length;
    if (managerCount <= 1) throw new Error("系统必须至少保留一名管理员或超级管理员");
  }
  await uniIdUsers.doc(targetUserId).update({ role: nextRoles });
  return { id: targetUserId, roles: nextRoles };
}

async function getTemporaryFileUrls(fileIds) {
  const uniqueIds = [...new Set((fileIds || []).filter(Boolean))];
  if (!uniqueIds.length) return new Map();
  const result = await uniCloud.getTempFileURL({ fileList: uniqueIds });
  const files = result.fileList || result.files || [];
  return new Map(files.map((item) => [
    item.fileID || item.fileId,
    item.tempFileURL || item.fileURL || item.download_url || item.fileID || item.fileId,
  ]));
}

async function resolveRecordAttachmentUrls(records) {
  const fileIds = records.flatMap((record) =>
    (record.attachments || []).map((attachment) => attachment.storageFileId).filter(Boolean));
  const urls = await getTemporaryFileUrls(fileIds);
  return records.map((record) => ({
    ...record,
    attachments: (record.attachments || []).map((attachment) => ({
      ...attachment,
      url: urls.get(attachment.storageFileId) || attachment.url,
    })),
  }));
}

async function resolveCategoryIconUrls(records) {
  const urls = await getTemporaryFileUrls(records.map((record) => record.iconFileId).filter(Boolean));
  return records.map((record) => ({
    ...record,
    iconUrl: urls.get(record.iconFileId) || record.iconUrl,
  }));
}

async function uploadImage(userId, body) {
  const dataUrl = String(body.dataUrl || "");
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("仅支持 JPEG、PNG 或 WebP 图片");
  const fileContent = Buffer.from(match[2], "base64");
  if (!fileContent.length || fileContent.length > 1536 * 1024) {
    throw new Error("图片压缩后不能超过 1.5 MB");
  }
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[match[1]];
  const purpose = ["asset", "addon", "avatar", "category_icon"].includes(body.purpose) ? body.purpose : "asset";
  const cloudPath = `rizhi/${userId}/${purpose}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const uploaded = await uniCloud.uploadFile({ cloudPath, fileContent });
  const fileId = uploaded.fileID || uploaded.fileId;
  const urls = await getTemporaryFileUrls([fileId]);
  return { fileId, url: urls.get(fileId) || fileId };
}

async function migrateLegacyImages(userId) {
  let migrated = 0;
  let failed = 0;
  for (const name of ["assets", "assetAddons"]) {
    const result = await collections[name].where({ userId }).limit(1000).get();
    for (const record of result.data) {
      let changed = false;
      const attachments = [];
      for (const attachment of record.attachments || []) {
        if (!attachment.storageFileId && String(attachment.url || "").startsWith("data:image/")) {
          try {
            const uploaded = await uploadImage(userId, {
              dataUrl: attachment.url,
              purpose: name === "assets" ? "asset" : "addon",
            });
            attachments.push({
              ...attachment,
              url: uploaded.url,
              storageFileId: uploaded.fileId,
            });
            migrated += 1;
            changed = true;
          } catch {
            attachments.push(attachment);
            failed += 1;
          }
        } else {
          attachments.push(attachment);
        }
      }
      if (changed) {
        await collections[name].doc(record._id).update({ attachments, updatedAt: now() });
      }
    }
  }
  return { migrated, failed };
}

async function getUserProfile(userId) {
  const result = await userProfiles.where({ userId }).limit(1).get();
  const profile = result.data[0];
  if (!profile) return null;
  const urls = await getTemporaryFileUrls([profile.avatarFileId]);
  return {
    displayName: profile.displayName,
    avatarFileId: profile.avatarFileId,
    avatarUrl: urls.get(profile.avatarFileId) || "",
  };
}

async function updateUserProfile(userId, body) {
  const displayName = String(body.displayName || "").trim();
  if (!displayName || displayName.length > 64) throw new Error("显示名称长度应为 1 至 64 个字符");
  const avatarFileId = body.avatarFileId ? String(body.avatarFileId) : undefined;
  const existingResult = await userProfiles.where({ userId }).limit(1).get();
  const existing = existingResult.data[0];
  const record = {
    userId,
    displayName,
    createdAt: existing?.createdAt || now(),
    updatedAt: now(),
  };
  if (avatarFileId) record.avatarFileId = avatarFileId;
  if (existing) await userProfiles.doc(existing._id).set(record);
  else await userProfiles.add(record);
  return getUserProfile(userId);
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
  await ensureSystemCategories();
  const [rawAssets, rawAssetAddons, accounts, transactions, accountFlows, categories] = await Promise.all([
    findAll("assets", userId),
    findAll("assetAddons", userId),
    findAll("accounts", userId, "createdAt", "asc"),
    findAll("transactions", userId, "occurredAt", "desc"),
    findAll("accountFlows", userId, "occurredAt", "desc"),
    Promise.all([
      findAll("categories", SYSTEM_USER_ID, "sort", "asc"),
      findAll("categories", userId, "sort", "asc"),
    ]).then(([systemCategories, userCategories]) => [
      ...systemCategories,
      ...userCategories.filter((item) => item.domain === "transaction"),
    ]),
  ]);
  const [assets, assetAddons] = await Promise.all([
    resolveRecordAttachmentUrls(rawAssets),
    resolveRecordAttachmentUrls(rawAssetAddons),
  ]);
  return { assets, assetAddons, accounts, transactions, accountFlows, categories: await resolveCategoryIconUrls(categories.map(normalizeCategory)) };
}

async function importSnapshot(userId, snapshot) {
  const source = snapshot && snapshot.data ? snapshot.data : snapshot;
  for (const name of collectionNames) {
    if (!Array.isArray(source[name])) throw new Error(`缺少数据集合：${name}`);
  }

  for (const name of collectionNames) {
    await collections[name].where({ userId }).remove();
    const records = name === "categories"
      ? source[name].filter((record) => record.domain === "transaction")
      : source[name];
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
      categoryId: asset.categoryId,
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
      categoryId: direction === "income" ? "cat-asset-addon-income" : asset.categoryId,
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
  const [assets, accounts, directTransactions, subTransactions, children] = await Promise.all([
    collections.assets.where({ categoryId: id }).count(),
    collections.accounts.where({ accountTypeId: id }).count(),
    collections.transactions.where({ userId, categoryId: id }).count(),
    collections.transactions.where({ userId, subCategoryId: id }).count(),
    collections.categories.where({ userId, parentId: id }).count(),
  ]);
  return {
    assets: assets.total,
    transactions: directTransactions.total + subTransactions.total,
    childCategories: children.total,
    accounts: accounts.total,
    total: assets.total + accounts.total + directTransactions.total + subTransactions.total + children.total,
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

async function handleCategories(method, path, body, userId, query, auth) {
  if (method === "GET" && path === "/categories") {
    await ensureSystemCategories();
    const [systemCategories, userCategories] = await Promise.all([
      findAll("categories", SYSTEM_USER_ID, "sort", "asc"),
      findAll("categories", userId, "sort", "asc"),
    ]);
    const all = await resolveCategoryIconUrls([...systemCategories, ...userCategories.filter((item) => item.domain === "transaction")].map(normalizeCategory));
    return ok(all
      .filter((item) => !query.domain || item.domain === query.domain)
      .filter((item) => !query.type || item.type === query.type)
      .filter((item) => !query.scope || categoryHasScope(item, query.scope))
      .filter((item) => query.enabled === undefined || String(item.enabled !== false) === query.enabled));
  }
  if (method === "POST" && path === "/categories") {
    requireAdmin(auth);
    const ownerId = SYSTEM_USER_ID;
    if (!String(body.name || "").trim()) throw new Error("分类名称不能为空");
    return ok(await insert("categories", ownerId, {
      ...normalizeCategory(body),
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
    const existing = await findOne("categories", SYSTEM_USER_ID, id)
      || await findOne("categories", userId, id);
    requireAdmin(auth);
    if (!existing) throw new Error("分类不存在");
    const ownerId = existing.userId === SYSTEM_USER_ID ? SYSTEM_USER_ID : userId;
    const nextCategory = normalizeCategory({ ...withoutInternalFields(existing), ...body });
    if (nextCategory.parentId && nextCategory.enabled !== false) {
      const parent = await findOne("categories", SYSTEM_USER_ID, nextCategory.parentId)
        || await findOne("categories", userId, nextCategory.parentId);
      if (parent?.enabled === false) throw new Error("一级分类已停用，不能单独启用子分类");
    }
    const saved = await replace("categories", ownerId, id, {
      ...nextCategory,
      id,
    });
    if (!saved.parentId && saved.enabled === false) {
      const children = await collections.categories.where({ userId: ownerId, parentId: id }).get();
      for (const child of children.data) {
        if (child.enabled !== false) {
          await collections.categories.doc(child._id).update({ enabled: false, updatedAt: now() });
        }
      }
    }
    return ok(saved);
  }
  if (method === "DELETE") {
    const existing = await findOne("categories", SYSTEM_USER_ID, id)
      || await findOne("categories", userId, id);
    requireAdmin(auth);
    const usage = await categoryUsage(userId, id);
    if (usage.total > 0) throw new Error("分类仍有业务记录或子分类，不能删除");
    await remove("categories", existing.userId === SYSTEM_USER_ID ? SYSTEM_USER_ID : userId, id);
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
    const updatedAccount = {
      ...withoutInternalFields(existing),
      ...body,
      id,
      updatedAt: now(),
    };
    if (updatedAccount.direction === "asset") {
      delete updatedAccount.creditLimit;
      delete updatedAccount.billDay;
      delete updatedAccount.repaymentDay;
    }
    return ok(await replace("accounts", userId, id, updatedAccount));
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
  const path = String(event.path || "/").replace(/^.*\/api\/v1/, "") || "/";
  if (method === "OPTIONS") return response(200, { ok: true });

  if (method === "GET" && path === "/health") {
    return ok({ status: "ok", storage: "unicloud", timestamp: now() });
  }
  if (method === "POST" && path === "/auth/login") {
    return ok(await loginWithPassword(event, body));
  }
  if (method === "POST" && path === "/auth/captcha") {
    return ok(await createRegisterCaptcha(event, body));
  }
  if (method === "POST" && path === "/auth/register") {
    return ok(await registerWithPassword(event, body), 201);
  }
  const auth = await authenticate(event, token);
  const userId = auth.uid;
  if (method === "POST" && path === "/auth/me") {
    return ok({ uid: userId, role: auth.role || [], permission: auth.permission || [] });
  }
  if (method === "GET" && path === "/admin/users") {
    return ok(await listAdminUsers(auth));
  }
  const adminRoleMatch = path.match(/^\/admin\/users\/([^/]+)\/admin-role$/);
  if (method === "PATCH" && adminRoleMatch) {
    return ok(await updateAdminRole(auth, decodeURIComponent(adminRoleMatch[1]), body.enabled === true));
  }
  const userStatusMatch = path.match(/^\/admin\/users\/([^/]+)\/status$/);
  if (method === "PATCH" && userStatusMatch) {
    return ok(await updateUserStatus(auth, decodeURIComponent(userStatusMatch[1]), body.enabled === true));
  }
  if (method === "POST" && path === "/files/images") {
    return ok(await uploadImage(userId, body), 201);
  }
  if (method === "POST" && path === "/files/migrate-images") {
    return ok(await migrateLegacyImages(userId));
  }
  if (method === "GET" && path === "/profile") {
    return ok(await getUserProfile(userId));
  }
  if (method === "PATCH" && path === "/profile") {
    return ok(await updateUserProfile(userId, body));
  }
  if (method === "POST" && path === "/auth/claim-local-data") {
    return ok(await claimLocalData(userId));
  }
  if (method === "GET" && path === "/snapshot") return ok(await getSnapshot(userId));
  if (method === "GET" && path === "/export") return ok(await exportBackup(userId));
  if (method === "POST" && path === "/import") return ok(await importSnapshot(userId, body));
  if (method === "POST" && path === "/reset") {
    return ok(await clearUserBusinessData(userId));
  }

  const accountResult = await handleAccounts(method, path, body, userId);
  if (accountResult) return accountResult;
  const transactionResult = await handleTransactions(method, path, body, userId);
  if (transactionResult) return transactionResult;
  const assetResult = await handleAssets(method, path, body, userId);
  if (assetResult) return assetResult;
  const addonResult = await handleAddons(method, path, body, userId);
  if (addonResult) return addonResult;
  const categoryResult = await handleCategories(method, path, body, userId, query, auth);
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
