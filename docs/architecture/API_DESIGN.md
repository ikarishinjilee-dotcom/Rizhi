# 日值 API 设计文档

## 文档状态

当前后端为 Fastify + TypeScript，Base URL 为：

```text
/api/v1
```

前端可通过 `VITE_DATA_SOURCE=http` 切换到 HTTP 模式。当前仍是单用户本地 API，暂未包含正式登录、多用户协作和权限系统。

## 通用约定

请求和响应均使用 JSON。

```http
Content-Type: application/json
```

成功响应统一为：

```json
{
  "data": {}
}
```

错误响应统一为：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "错误说明",
    "details": {}
  }
}
```

## 通用接口

- `GET /health`
- `GET /snapshot`
- `POST /reset`
- `GET /export`
- `POST /import`

## 资产接口

- `GET /assets`
- `GET /assets/{assetId}`
- `POST /assets`
- `PATCH /assets/{assetId}`
- `DELETE /assets/{assetId}`
- `POST /assets/{assetId}/transfer`
- `POST /assets/{assetId}/transfer/revoke`

资产写入规则：

- `categoryId` 必须指向启用、未删除的资产分类。
- 如传入 `paymentAccountId`，必须联动资产购买交易、账户流水和账户余额。
- 编辑资产购买信息时，必须回滚旧账户影响，再写入新影响。

## 资产附加项接口

- `POST /assets/{assetId}/addons`
- `PATCH /assets/{assetId}/addons/{addonId}`
- `PATCH /addons/{addonId}`

附加项写入规则：

- 支持支出和收入方向。
- 如传入账户，必须联动交易、账户流水和余额。
- 已转让或已处置资产不能新增或编辑附加项。

## 记账接口

- `GET /transactions`
- `POST /transactions/expense`
- `POST /transactions/income`
- `PATCH /transactions/{transactionId}`
- `DELETE /transactions/{transactionId}`
- `POST /transactions/repayment`
- `POST /transactions/convert-to-asset-addon`

记账规则：

- 普通交易会联动账户流水和账户余额。
- 系统生成交易不能直接编辑或删除。
- 交易分类必须存在、启用、未删除，并且类型匹配。

## 账户接口

- `GET /accounts`
- `POST /accounts`
- `PATCH /accounts/{accountId}`
- `DELETE /accounts/{accountId}`
- `POST /accounts/transfer`
- `GET /accounts/{accountId}/flows`

账户规则：

- 有账户流水的账户不能删除。
- 转账生成两条账户流水。
- 还款必须从资产账户到负债账户，且金额不能超过负债余额。

## 分类接口

- `GET /categories`
- `POST /categories`
- `GET /categories/{categoryId}/usage`
- `PATCH /categories/{categoryId}`
- `DELETE /categories/{categoryId}`
- `POST /categories/{categoryId}/migrate-transactions`

分类规则：

- `GET /categories` 支持 `domain`、`type`、`enabled` 过滤。
- 资产分类由用户自定义名称，后端统一把资产分类 `type` 归为 `other`。
- 停用分类不影响历史数据，但不能再用于新增或编辑资产/交易。
- 删除分类前必须检查资产、账户、交易和子分类占用。
- 交易分类迁移只允许同类型迁移。

## 暂未实现

- 正式认证。
- 多用户协作。
- 附件 multipart 上传。
- 独立设置接口。
- SQLite 结构化表。
