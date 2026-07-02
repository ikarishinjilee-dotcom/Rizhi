# 日值当前 API 状态表

当前后端为 Fastify + TypeScript，代码位于 `server/app/`。

## 通用接口

| 接口 | 状态 | 说明 |
| --- | --- | --- |
| `GET /api/v1/health` | 已实现 | 健康检查 |
| `GET /api/v1/snapshot` | 已实现 | 返回完整数据快照，供前端初始化 |
| `POST /api/v1/reset` | 已实现 | 重置为默认数据，主要用于开发和测试 |
| `GET /api/v1/export` | 已实现 | 导出 `rizhi-local-backup` 备份 |
| `POST /api/v1/import` | 已实现 | 校验并覆盖导入 `rizhi-local-backup` 备份 |

## 资产

| 接口 | 状态 | 说明 |
| --- | --- | --- |
| `GET /api/v1/assets` | 已实现 | 支持 `status`、`categoryId`、`keyword` 过滤 |
| `GET /api/v1/assets/{assetId}` | 已实现 | 返回资产、附加项、关联交易 |
| `POST /api/v1/assets` | 已实现 | 支持付款账户联动购买交易、账户流水和余额 |
| `PATCH /api/v1/assets/{assetId}` | 已实现 | 同步购买交易和余额 |
| `DELETE /api/v1/assets/{assetId}` | 已实现 | 删除资产档案和附加项，历史交易保留并解除关联 |
| `POST /api/v1/assets/{assetId}/transfer` | 已实现 | 创建资产转让收入交易和账户流水 |
| `POST /api/v1/assets/{assetId}/transfer/revoke` | 已实现 | 撤销转让并回滚账户影响 |

## 附加项

| 接口 | 状态 | 说明 |
| --- | --- | --- |
| `POST /api/v1/assets/{assetId}/addons` | 已实现 | 支持支出/收入方向和账户联动 |
| `PATCH /api/v1/assets/{assetId}/addons/{addonId}` | 已实现 | 按资产路径更新附加项 |
| `PATCH /api/v1/addons/{addonId}` | 已实现 | 前端 HTTP 仓库使用的快捷更新入口 |

## 记账

| 接口 | 状态 | 说明 |
| --- | --- | --- |
| `GET /api/v1/transactions` | 部分实现 | 支持 `type` 过滤 |
| `POST /api/v1/transactions/expense` | 已实现 | 创建普通支出并联动账户流水 |
| `POST /api/v1/transactions/income` | 已实现 | 创建普通收入并联动账户流水 |
| `PATCH /api/v1/transactions/{transactionId}` | 已实现 | 支持普通交易编辑，系统交易会阻断 |
| `DELETE /api/v1/transactions/{transactionId}` | 已实现 | 只允许删除普通交易，并回滚账户影响 |
| `POST /api/v1/transactions/repayment` | 已实现 | 支持资产账户偿还负债账户 |
| `POST /api/v1/transactions/convert-to-asset-addon` | 已实现 | 将普通交易转换为资产附加项 |

## 资金账户

| 接口 | 状态 | 说明 |
| --- | --- | --- |
| `GET /api/v1/accounts` | 已实现 | 返回账户数组 |
| `POST /api/v1/accounts` | 已实现 | 创建账户 |
| `PATCH /api/v1/accounts/{accountId}` | 部分实现 | 更新账户资料字段 |
| `DELETE /api/v1/accounts/{accountId}` | 已实现 | 有账户流水时阻断删除 |
| `POST /api/v1/accounts/transfer` | 已实现 | 创建转账交易和两条账户流水 |
| `GET /api/v1/accounts/{accountId}/flows` | 已实现 | 支持 `dateFrom`、`dateTo`、`page`、`pageSize` |

## 分类

| 接口 | 状态 | 说明 |
| --- | --- | --- |
| `GET /api/v1/categories` | 已实现 | 支持 `domain`、`type`、`enabled` 过滤 |
| `POST /api/v1/categories` | 已实现 | 支持父子分类基础校验；资产分类 `type` 统一为 `other` |
| `GET /api/v1/categories/{categoryId}/usage` | 已实现 | 返回占用统计 |
| `PATCH /api/v1/categories/{categoryId}` | 已实现 | 支持分类名称、排序、颜色、启用状态等更新 |
| `DELETE /api/v1/categories/{categoryId}` | 已实现 | 按资产、账户、交易、子分类占用阻断 |
| `POST /api/v1/categories/{categoryId}/migrate-transactions` | 已实现 | 同类型迁移交易并更新分类快照 |

## 暂未实现

| 能力 | 说明 |
| --- | --- |
| 正式登录认证 | 当前仍是单用户本地 API |
| 多用户协作 | 暂未设计权限和租户模型 |
| 附件 multipart 上传 | 当前沿用前端本地 URL/Data URL |
| 独立设置接口 | 当前随 snapshot/export/import 读写 |
| 数据表结构化 | 当前 SQLite 中仍以应用状态 JSON 保存 |
