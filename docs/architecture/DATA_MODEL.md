# 日值数据模型设计

> 版本说明：本文包含 V1 IndexedDB 模型和后端规划。V2 迁移期间仍用于业务字段参考，云端最终契约以 uniCloud Schema 与 API 文档为准。

## 0. 文档状态说明

本文件同时记录当前前端数据模型和未来后端模型建议。

- `[当前已实现]`：当前 Vue + Dexie + IndexedDB 已使用。
- `[前端兼容]`：当前前端为兼容旧数据或过渡设计保留。
- `[后端规划]`：后端正式化阶段建议采用，当前前端不一定完全按此拆表。
- `[待决策]`：需要后续业务确认后再落地。

## 1. 数据源约定

[当前已实现]

MVP 使用 `Dexie + IndexedDB`，数据库名为 `rizhi-local-db`。

主要文件：

- `apps/web/src/domain/models.ts`：领域模型，定义前端和未来后端都应遵守的数据形状。
- `apps/web/src/domain/assetCalculations.ts`：资产派生计算，包括附加项成本、总成本、图片附件读取等。
- `apps/web/src/data/mock.ts`：开发期正式 mock 数据，字段结构尽量贴近后端 API。
- `apps/web/src/db/seed.ts`：把 mock 数据写入 IndexedDB。
- `apps/web/src/db/actions.ts`：跨模块联动写入，例如资产购买、附加项、转让、资金转账。
- `apps/web/src/stores/appDataStore.ts`：Pinia 数据读取与汇总。

## 2. 核心原则

[当前已实现]

业务数据只存事实字段，不存展示派生字段。

推荐存：

```ts
{
  id: "ast_000004",
  name: "WH-1000XM5 头戴式降噪耳机",
  categoryId: "asset-digital",
  status: "using",
  originalCost: 2199,
  paymentAccountId: "cmb-debit",
  purchaseTransactionId: "tx-sony-purchase"
}
```

不推荐存：

```ts
{
  category: "数码设备",
  paymentAccount: "招商银行储蓄卡",
  statusText: "使用中",
  addonCost: 111,
  totalCost: 2310,
  imageTone: "blue"
}
```

分类名称、状态文案、图标、颜色、附加项成本、资产总成本都应由 `categoryId`、`status`、`assetAddons` 和设计系统映射得到。

## 3. 枚举策略

[当前已实现] + [后端规划]

前端领域模型使用字符串枚举，例如：

```ts
type AssetStatus = "using" | "idle" | "transferred" | "disposed";
```

原因：

- 代码可读性高，不需要记忆 `0 / 1 / 2` 的含义。
- API 调试直观。
- `[后端规划]` 后端数据库如果需要使用 `tinyint`，可以在 API 层转换。

## 4. 核心表

### categories

[当前已实现]

统一管理资产分类、记账分类、账户分类。

记账分类只服务 `expense` 和 `income`，不包含转账。转账是账户之间的资金流转，独立于记账分类。

关键字段：

- `id`：稳定 id，例如 `asset-digital`。
- `domain`：`asset` / `transaction` / `account`。
- `type`：分类对应的业务类型。资产分类使用 `digital`、`home` 等；记账分类只使用 `expense` / `income`；账户分类使用 `wallet`、`credit_card` 等。
- `parentId`：父分类 id。记账分类支持一级分类和子分类，子分类挂在父分类下。
- `name`：展示名称。
- `sort`：排序权重。
- `color` / `icon`：展示颜色和图标。
- `enabled`：是否启用。停用后不再出现在新增记账表单中，但历史账单继续可读。
- `isSystem`：是否系统预置分类。
- `deletedAt`：软删除时间预留。当前实现优先使用“占用阻断 + 未占用物理删除”。

资产表不再存 `categoryKind`，需要资产大类时通过 `categoryId -> categories.type` 推导。

分类删除规则：

- 交易分类如果已被交易使用，不能删除，必须先把对应交易迁移到其他分类。
- 一级交易分类如果其子分类下有交易，也不能删除。
- 未被交易使用的交易分类可以删除；如果是一级分类，会一并删除未占用子分类。
- 资产分类如果已被资产使用，不能删除。
- 账户分类如果已被账户类型使用，不能删除。
- `isSystem` 只表示“系统预置”，不是“永远不可删除”。是否可删以占用情况为准。

分类迁移规则：

- 只允许迁移 `domain = transaction` 的分类。
- 只能迁移到同类型分类，例如支出到支出、收入到收入。
- 目标一级分类不能是子分类。
- 如果指定目标子分类，目标子分类必须属于目标一级分类。
- 迁移后要更新交易的 `categoryId`、`subCategoryId` 和 `categorySnapshot`。

记账分类示例：

```ts
{
  id: "tx-expense-food",
  domain: "transaction",
  type: "expense",
  parentId: null,
  name: "餐饮",
  sort: 100,
  enabled: true,
  isSystem: true
}

{
  id: "tx-expense-food-lunch",
  domain: "transaction",
  type: "expense",
  parentId: "tx-expense-food",
  name: "午餐",
  sort: 120,
  enabled: true,
  isSystem: false
}
```

### assets

[当前已实现]

记录可追踪的物品资产、订阅服务和耐用品。

关键字段：

- `id`：稳定资产 id，mock 使用 `ast_000001` 形式，`[后端规划]` 正式后端可使用 UUID 或雪花 id。
- `userId`：所属用户，MVP 本地版先使用 `user-local`。
- `name` / `brand` / `model`：资产名称、品牌和型号。
- `categoryId`：关联 `categories.id`。
- `status`：资产状态。
- `originalCost`：原始购入价。
- `currency`：币种，例如 `CNY`。
- `purchaseDate`：购买日期。
- `firstUseDate` / `lastUsedAt` / `idleSince`：使用周期相关字段。
- `purchaseChannel`：购买渠道枚举，例如 `online`、`offline`、`secondhand`。
- `merchant`：商家，例如 `京东`、`Apple 官网`。
- `orderNo`：订单号。
- `paymentAccountId`：付款账户 id。
- `purchaseTransactionId`：购买资产时生成的交易记录 id。
- `currentValue` / `currentValueUpdatedAt` / `currentValueSource`：当前估值、估值时间和估值来源。
- `transferDate` / `transferAmount` / `transferAccountId` / `transferTransactionId`：转让状态相关字段。
- `disposedAt`：处置时间。
- `warrantyStartDate` / `warrantyEndDate`：保修周期。
- `expectedUseDays`：预计使用天数。
- `notes`：备注。
- `attachments`：资产图片、订单、发票、凭证等附件。

不存储：

- `categoryKind`：从分类表推导。
- `addonCost`：从 `assetAddons` 计算。
- `totalCost`：`originalCost + includedAddonCost` 计算。
- `dailyCost`：从总成本和使用/持有天数计算。

### assetAddons

[当前已实现]

记录资产相关的附加项支出和收入。

支出例子：
- 手机壳、贴膜、维修、保养、升级件。
- 给主机新买 CPU、硬盘、内存等。

收入例子：
- 卖掉旧 CPU、旧硬盘、旧镜头。
- 会员共享回款。
- 售后退款、维修赔付、残值回收。

关键字段：

- `assetId`：所属资产 id。
- `direction`：`expense` / `income`，表示这条附加项是支出还是收入。旧数据没有该字段时默认按 `expense` 处理。
- `type`：`accessory` / `repair` / `maintenance` / `upgrade` / `consumable` / `other`。
- `amount`：附加项金额。
- `currency`：币种。
- `purchaseDate`：购买日期。
- `merchant`：商家。
- `paymentAccountId`：付款账户或收款账户 id，字段名沿用前端当前模型，`[后端规划]` 后端可命名为 `accountId`。
- `transactionId`：附加项收支生成的交易记录 id。
- `includedInCost`：是否计入资产成本，只对 `direction = expense` 生效。
- `notes`：备注。
- `attachments`：附加项图片、票据、维修单等。

### transactions

[当前已实现] + [后端规划]

记录真正进入记账体系的支出和收入，以及系统生成的资产购买、附加项收支、退款、还款等业务流水。

转账不属于记账分类，但 `[当前已实现]` 当前本地模型继续用 `type = transfer` 兼容保存。`[后端规划]` 正式后端建议提供独立的 `accountTransfers` 或 `transfers` 资源。

关键字段：

- `type`：交易类型。
- `businessType`：业务类型，例如 `normal`、`asset_purchase`、`asset_addon`、`debt_repayment`、`refund`。`[当前已实现]` 当前前端可由字段组合识别；`[后端规划]` 后端阶段建议显式存储。
- `categoryId`：一级记账分类 id。
- `subCategoryId`：子分类 id，可选。
- `categorySnapshot`：记账发生时的分类名称快照，避免分类后续改名或删除导致历史账单显示漂移。
- `accountId`：主账户 id。
- `relatedAccountId`：还款目标账户、退款原账户或兼容转账的关联账户 id。
- `assetId`：关联资产 id。
- `addonId`：关联附加项 id。
- `merchant`：商家或来源。
- `note`：交易备注。

资产购买、资产转让、附加项收支都是系统生成或系统维护的交易，不能在记账页直接编辑或删除。

记账交易建议结构：

```ts
{
  id: "tx_000001",
  type: "expense",
  businessType: "normal",
  categoryId: "tx-expense-food",
  subCategoryId: "tx-expense-food-lunch",
  categorySnapshot: {
    categoryName: "餐饮",
    subCategoryName: "午餐"
  },
  amount: 35,
  occurredAt: "2026-06-21T12:20:00.000+08:00",
  accountId: "wechat",
  merchant: "麦当劳",
  note: "午餐"
}
```

还款交易建议结构：

```ts
{
  id: "tx_000002",
  type: "repayment",
  businessType: "debt_repayment",
  categoryId: "tx-repayment",
  subCategoryId: "tx-repayment-huabei",
  accountId: "alipay-balance",
  relatedAccountId: "huabei",
  amount: 1000,
  occurredAt: "2026-06-21T10:00:00.000+08:00",
  note: "花呗还款"
}
```

还款是否计入收支统计由 `businessType = debt_repayment` 和统计口径控制，默认不计入日常支出，避免信用账户消费和还款重复统计。

系统生成交易保护规则：

- `type = asset_purchase` 或 `categoryId = tx-asset-purchase` 的交易，必须回到资产详情维护。
- `categoryId = tx-asset-transfer` 的交易，必须通过资产转让/撤销转让维护。
- 带 `addonId` 的交易，必须通过资产附加项维护。
- 带 `partEventId` 的交易，只作为旧部件变动兼容数据维护。
- 记账页只允许直接编辑和删除普通人工交易。

### accountTransfers

[后端规划]

账户之间的资金流转，独立于记账分类。

关键字段：

- `id`：转账 id。
- `fromAccountId`：转出账户。
- `toAccountId`：转入账户。
- `amount`：转账金额。
- `feeAmount`：手续费金额，可选。
- `feeAccountId`：手续费扣款账户，可选。
- `occurredAt`：发生时间。
- `note`：备注。

转账会生成账户流水，但不进入收入/支出统计。

如果发生手续费，应额外生成一条普通支出交易，分类为“金融手续费”或用户自定义分类。

### accounts

[当前已实现]

记录现金、支付宝、微信、储蓄卡、信用卡、花呗、借呗等资金账户。

关键字段：

- `type`：账户类型。
- `direction`：`asset` 资产账户 / `liability` 负债账户。
- `balance`：当前余额或当前欠款。
- `creditLimit`：信用额度。
- `billDay` / `repaymentDay`：账单日和还款日。

余额语义：

- `direction = asset` 时，`balance` 表示可用资产余额。
- `direction = liability` 时，`balance` 表示当前欠款。

账户删除规则：

- 没有资金流水的账户可以删除。
- 已有资金流水的账户不能删除，`[后端规划]` 后续应提供“停用账户”能力。
- 删除账户前必须由 UI 二次确认。

### accountFlows

[当前已实现]

记录每次交易对账户余额造成的变化。

关键字段：

- `transactionId`：来源交易。
- `transferId`：来源转账，可选。`[当前已实现]` 当前本地模型用 `transactionId` 兼容；`[后端规划]` 后端阶段建议拆开。
- `accountId`：发生变化的账户。
- `direction`：`in` / `out`。
- `balanceAfter`：发生后的账户余额。

账户流水规则：

- 交易、转账、还款一旦影响账户余额，就必须生成账户流水。
- 删除或撤销业务时，必须删除对应流水并回滚账户余额。
- 账户流水是判断账户能否删除的依据之一。

## 5. 派生计算

[当前已实现]

统一通过 `apps/web/src/domain/assetCalculations.ts` 计算：

```ts
includedAddonCost = sum(assetAddons where assetId = asset.id and direction = expense and includedInCost)
totalCost = asset.originalCost + includedAddonCost
dailyCost = totalCost / heldDays
profitLoss = currentValueOrTransferIncome - totalCost
```

附加项收入和转让收入都不扣进 `totalCost`。它们影响现金账户和历史收益观察，但不改变资产历史成本。

## 6. 附件模型

[当前已实现]

资产和附加项都使用同一类附件结构：

```ts
{
  id: "att-sony-image-1",
  type: "asset_image",
  name: "耳机主图",
  url: "/mock-assets/sony-wh-1000xm5-1.svg",
  sort: 1,
  isCover: true,
  createdAt: mockNow
}
```

附件类型：

- `asset_image`：资产或附加项图片。
- `order`：订单截图。
- `invoice`：发票。
- `receipt`：付款凭证。
- `warranty`：保修凭证。
- `other`：其他附件。

## 7. 联动规则

[当前已实现]

新增资产且选择付款账户：

1. 创建 `assets`。
2. 创建 `asset_purchase` 类型的 `transactions`。
3. 创建账户流出 `accountFlows`。
4. 更新资金账户余额或负债账户欠款。
5. 回写 `assets.purchaseTransactionId`。

新增附加项支出且选择付款账户：

1. 创建 `assetAddons`。
2. `direction = expense`。
2. 创建 `expense` 类型的 `transactions`。
3. 创建账户流水。
4. 如果 `includedInCost = true`，资产总成本由派生计算自动体现，不回写资产表。

新增附加项收入且选择收款账户：

1. 创建 `assetAddons`。
2. `direction = income`。
3. 创建 `income` 类型的 `transactions`，分类为 `tx-asset-addon-income`。
4. 创建账户流入流水。
5. `includedInCost` 固定不生效，资产总成本不变。

资产转让：

1. 资产必须不是 `transferred` 或 `disposed`。
2. 创建 `tx-asset-transfer` 收入交易。
3. 创建账户流入 `accountFlows`。
4. 更新资产状态为 `transferred`。
5. 回写 `transferDate`、`transferAmount`、`transferAccountId`、`transferTransactionId`。
6. 当前估值来源更新为 `transfer`。

撤销转让：

1. 删除对应资产转让收入。
2. 回滚收款账户余额。
3. 删除对应账户流水。
4. 资产恢复为 `using`。
5. 清空转让相关字段。

删除资产：

1. 删除资产档案和附加项。
2. 删除旧部件变动兼容记录。
3. 历史交易流水保留。
4. 历史交易解除 `assetId` / `addonId` / `partEventId` 关联。

这表示“删除资产档案”不是“撤销历史消费”。

删除普通交易：

1. 删除交易前 UI 必须二次确认。
2. 删除交易。
3. 删除对应账户流水。
4. 回滚账户余额。

删除分类：

1. 删除前 UI 必须二次确认。
2. 服务层先判断资产、交易、账户和子分类占用。
3. 有占用时不允许删除，并返回明确原因。
4. 没有占用时才允许物理删除。

## 8. 部件变动兼容说明

[前端兼容] + [后端规划]

早期设计中存在 `assetPartEvents`，用于记录整机原生部件的转让、拆出、更换或处置。当前产品主线已调整：

- 不再给用户暴露独立的“部件变动”页签和新增入口。
- 整机里原本自带的部件，后续卖出或回收时，统一作为 `assetAddons.direction = income` 记录。
- 后续新买替换件或升级件，统一作为 `assetAddons.direction = expense` 记录。

例如整机电脑多年后卖掉旧 CPU：

1. 创建一条附加项收入：`name = "卖出旧 CPU"`。
2. `direction = income`。
3. `type = accessory` 或 `upgrade`，按 UI 语义展示为“配件转卖”或“残值回收”。
4. 创建收入交易，分类为 `tx-asset-addon-income`。
5. 不改变资产总成本。如需调整当前估值，后续可通过资产估值编辑单独处理。

`[前端兼容]` `assetPartEvents` 表可以作为本地旧数据兼容保留一段时间，`[后端规划]` 后端第一版不建议暴露对应 API。
# 当前版本补充说明（2026-07-16）

本文后续章节保留早期字段设计和迁移参考。当前运行时的事实来源是 `apps/web/src/domain/models.ts`、`apps/web/src/repositories/contracts.ts`、`apps/uni-app/uniCloud-alipay/database/*.schema.json` 和 `rizhi-api` 云函数。

当前数据源有两种实现：

- 本地模式：`rizhi-local-db`，由 Dexie/IndexedDB 提供，写入细节位于 `apps/web/src/db/actions.ts`。
- 云端模式：uniCloud 数据库集合，由 token 对应 uid 隔离，Web 通过 `httpRepositories` 访问。

当前模型已经使用 `attachments` 统一承载资产、附加项和凭证图片；`imageUrl`/`imageUrls` 只作为兼容输入或表单字段。分类还包含 `scopes`、启用状态、父子关系、账户组和银行关联等配置字段。站点品牌数据位于 `rizhi-site-branding` 集合。

> 本文中标为“后端规划”的内容，如果与当前 Schema、仓储契约或云函数实现冲突，以代码为准。
