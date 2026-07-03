# 日值后端验收清单

> 历史文档：用于验收旧 Fastify + SQLite 后端。当前正式后端采用 uniCloud + uni-id。

这份清单用于验收当前 Fastify + TypeScript 后端。后端入口统一到 `server/app/main.ts`。

## 当前后端形态

- 服务入口：`server/app/main.ts`
- 应用骨架：`server/app/app.ts`
- 存储入口：`server/app/db/sqliteStore.ts`
- 本地启动：`npm.cmd run api:dev`
- 前后端联调：`npm.cmd run dev:full`
- 前端 HTTP 模式：`VITE_DATA_SOURCE=http`

当前后端仍是单用户本地 API，数据存储为 SQLite 内的应用状态 JSON。正式登录、多用户、附件上传和权限系统暂不在当前阶段。

## 必须保持一致的能力

### 资产

- 新增资产时，如果选择付款账户，必须创建资产购买交易、账户流水，并更新账户余额。
- 编辑资产的 `originalCost` / `purchaseDate` / `merchant` / `paymentAccountId` 时，必须同步购买交易、账户流水和账户余额。
- 删除资产只删除资产档案和附加项档案，历史交易保留但解除 `assetId` / `addonId` / `partEventId`。
- 转让资产必须创建收入交易和账户流入，撤销转让必须完整回滚。
- 资产分类必须存在、启用、未删除，且属于 `domain = asset`。

### 附加项

- 新增附加项时，如果选择账户，必须创建对应支出/收入交易、账户流水并更新余额。
- 编辑附加项的方向、金额、日期、账户、类型时，必须同步交易、分类快照、账户流水和余额。
- 已转让或已处置资产不能新增或编辑附加项。

### 记账

- 普通支出/收入新增后必须生成账户流水并更新余额。
- 普通交易编辑金额、类型、账户、分类时，必须回滚旧账户影响，再写入新账户影响。
- 普通交易删除时，必须删除账户流水并回滚余额。
- 系统生成交易不能在记账接口直接编辑或删除。
- 普通交易转换为资产附加项时，必须创建附加项、更新原交易关联，并重算账户影响。

### 账户

- 有资金流水的账户不能删除。
- 转账必须生成两条账户流水。
- 还款必须校验资产账户到账户负债账户，且还款金额不能超过当前欠款。

### 分类

- 删除分类前必须检查资产、账户、交易和子分类占用。
- 交易分类迁移只允许同类型迁移，并更新交易 `categoryId`、`subCategoryId` 和 `categorySnapshot`。
- 资产分类是用户自定义名称，不再使用业务子类型；后端统一将资产分类 `type` 归为 `other`。
- 停用分类不影响历史资产，但不能再用于新增或编辑资产。

## 验证命令

```bash
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

联调：

```bash
npm.cmd run dev:full
```
