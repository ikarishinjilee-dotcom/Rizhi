# 日值 API 设计

> 当前正式 API 为 uniCloud URL 化云函数 `rizhi-api`。旧 Fastify API 见 `docs/legacy/fastify/`，不属于当前运行时。

## 1. 地址与请求格式

生产和测试环境的 API 地址由 `VITE_API_BASE_URL` 注入，统一业务前缀为：

```text
https://<cloud-function-domain>/rizhi-api/api/v1
```

Web 端使用 POST transport，业务真实方法放在请求体：

```json
{
  "__rizhiTransport": true,
  "method": "GET",
  "token": "<uni-id-token>",
  "payload": {}
}
```

成功响应：

```json
{ "data": {} }
```

失败响应：

```json
{
  "error": {
    "code": "REQUEST_FAILED",
    "message": "错误说明",
    "details": {}
  }
}
```

## 2. 认证

- `/auth/login`、`/auth/captcha`、`/auth/register` 不要求已有 token。
- 其他业务接口通过 token 获取 uid。
- 客户端不得在业务 payload 中指定或覆盖用户归属。
- token 失效时 API 返回 401，前端清理会话并跳转登录页。

## 3. 接口分组

### 健康与数据

```text
GET  /health
GET  /snapshot
GET  /export
POST /import
POST /reset
POST /auth/claim-local-data
```

### 认证与用户

```text
POST /auth/login
POST /auth/captcha
POST /auth/register
POST /auth/me
GET  /profile
PATCH /profile
```

### 站点与文件

```text
POST  /files/images
POST  /files/migrate-images
GET   /site-branding
PATCH /site-branding
```

### 资产与附加项

```text
POST   /assets
PATCH  /assets/{assetId}
DELETE /assets/{assetId}
POST   /assets/{assetId}/transfer
POST   /assets/{assetId}/transfer/revoke
POST   /assets/{assetId}/addons
PATCH  /addons/{addonId}
DELETE /addons/{addonId}
```

### 交易与资金账户

```text
POST   /transactions/expense
POST   /transactions/income
PATCH  /transactions/{transactionId}
DELETE /transactions/{transactionId}
POST   /transactions/repayment
POST   /transactions/convert-to-asset-addon
POST   /accounts/transfer
POST   /accounts
PATCH  /accounts/{accountId}
DELETE /accounts/{accountId}
```

### 分类与管理员

```text
GET    /categories
POST   /categories
PATCH  /categories/{categoryId}
DELETE /categories/{categoryId}
GET    /categories/{categoryId}/usage
POST   /categories/{categoryId}/migrate-transactions
GET    /admin/users
PATCH  /admin/users/{userId}/admin-role
PATCH  /admin/users/{userId}/status
```

## 4. 写入约束

- 金额必须为有限且大于 0 的数值。
- 资产采购、附加项、转账和还款需要同步账户余额与账户流水。
- 已转让或已处置资产不能继续接收附加项或重复转让。
- 有流水或业务引用的账户、分类不能直接删除。
- 交易分类必须启用、未删除，并与收入/支出用途匹配。
- 图片先由 `/files/images` 上传，再将 file ID 和 URL 写入附件模型。

## 5. 事实来源

- Web 仓储契约：`apps/web/src/repositories/contracts.ts`。
- Web HTTP 实现：`apps/web/src/repositories/httpRepositories.ts`。
- 云端路由：`apps/uni-app/uniCloud-alipay/cloudfunctions/rizhi-api/index.js`。
- 数据库约束：`apps/uni-app/uniCloud-alipay/database/*.schema.json`。
