# Rizhi 技术设计

> 版本说明：本文记录 V1 PC 本地版技术设计。当前跨端与云端架构以 [V2 架构](./V2_ARCHITECTURE.md) 为准。

## 1. 技术目标

Rizhi 第一版的技术目标是：先做一个可靠的 PC 网页端本地应用，把“物品资产、记账、资金账户”的核心联动跑通。

第一版不优先做复杂后端、多人协作、云同步和自动导入。重点是：

- 数据结构清晰。
- 资金联动准确。
- 资产成本计算准确。
- 新增、编辑、删除都有可追踪的影响。
- 页面结构和组件规范可以长期复用。

## 2. 推荐技术栈

### 2.1 前端

推荐：

```text
Vue 3 + TypeScript + Vite
```

原因：

- Vue 3 适合快速搭建 PC 管理后台，模板语法直观，单文件组件适合长期维护。
- TypeScript 能约束资产、账单、账户之间的复杂关系。
- Vite 启动快，适合个人项目迭代。

### 2.2 路由

推荐：

```text
vue-router
```

页面路由：

```text
/dashboard          看板
/assets             物品资产列表
/assets/:id         物品资产详情
/ledger             记账
/funds              资金
/me                 我的
```

### 2.3 状态管理

MVP 推荐：

```text
Pinia
```

原因：

- Vue 官方推荐状态管理方案。
- API 简单，和组合式 API 配合自然。
- 适合个人项目。
- 方便把资产、账单、账户集中管理。

如果项目后期变大，可以再考虑引入更完整的数据请求和缓存方案。

### 2.4 本地存储

MVP 推荐：

```text
IndexedDB
```

封装库推荐：

```text
Dexie
```

原因：

- 数据量比 localStorage 更安全。
- 支持结构化数据。
- 适合本地优先应用。
- 后续迁移到后端时，数据模型也不会浪费。

### 2.4.1 数据访问分层

当前前端采用：

```text
页面组件
  -> services
  -> repositories
  -> IndexedDB / Dexie
```

职责划分：

- `apps/web/src/services`：承载业务动作命名，例如创建资产、编辑附加项、资金转账。
- `apps/web/src/repositories/contracts.ts`：定义数据访问接口和输入输出类型，是未来 HTTP API 的对接契约。
- `apps/web/src/repositories/indexedDbRepositories.ts`：当前本地 IndexedDB 实现。
- `apps/web/src/db/actions.ts`：IndexedDB 事务细节，后续接后端后可以逐步收缩为本地兼容层。

后续接后端时，优先新增 `httpRepositories`，并在 `apps/web/src/repositories/index.ts` 切换导出实现。页面和大部分 service 不应该直接感知 IndexedDB 或 HTTP。

### 2.5 UI 与样式

推荐：

```text
CSS Variables + CSS Modules
```

也可以使用 Tailwind CSS，但第一版更建议先按 [DESIGN.md](../design/DESIGN.md) 里的变量落地一套自有组件。

图标库：

```text
lucide-vue-next
```

### 2.6 图表

MVP 推荐：

```text
ECharts 或 vue-echarts
```

用于看板里的收支趋势、资金变化、日均成本排行等轻量图表。

## 3. 项目目录结构

推荐目录：

```text
apps/web/src/
  app/
    App.vue
    router.ts
    main.ts
  assets/
  components/
    ui/
      RButton.vue
      RInput.vue
      RSelect.vue
      RCard.vue
      RDataTable.vue
      RTag.vue
      RModal.vue
      RDrawer.vue
    layout/
      AppShell.vue
      Sidebar.vue
      Topbar.vue
      PageHeader.vue
  features/
    dashboard/
      DashboardPage.vue
      dashboardSelectors.ts
    assets/
      AssetListPage.vue
      AssetDetailPage.vue
      AssetForm.vue
      AssetAddOnForm.vue
      assetCalculations.ts
      assetTypes.ts
    ledger/
      LedgerPage.vue
      LedgerForm.vue
      ledgerTypes.ts
      ledgerEffects.ts
    funds/
      FundsPage.vue
      FundAccountForm.vue
      fundTypes.ts
      fundCalculations.ts
    me/
      MePage.vue
  lib/
    db/
      db.ts
      schema.ts
      repositories/
    money.ts
    date.ts
    id.ts
  store/
    assetStore.ts
    ledgerStore.ts
    fundStore.ts
    categoryStore.ts
  styles/
    tokens.css
    global.css
```

## 4. 核心数据模型

### 4.1 Money 金额规则

金额不要直接用浮点数存储，避免精度问题。

推荐：

```ts
type MoneyCent = number;
```

也就是所有金额以“分”为单位存储。

示例：

```text
¥2,000.00 -> 200000
¥15.00    -> 1500
```

展示时再格式化为人民币。

### 4.2 Asset 物品资产

```ts
type AssetStatus =
  | "in_use"
  | "idle"
  | "sold"
  | "discarded"
  | "lent_out"
  | "lost";

interface Asset {
  id: string;
  name: string;
  categoryId: string;
  brand?: string;
  model?: string;
  originalPriceCent: number;
  purchaseDate: string;
  paymentAccountId?: string;
  purchaseLedgerEntryId?: string;
  purchaseChannel?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  estimatedServiceLifeDays?: number;
  currentEstimatedValueCent?: number;
  status: AssetStatus;
  notes?: string;
  imageIds?: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 4.3 AssetAddOn 资产附加项

```ts
type AssetAddOnType =
  | "accessory"
  | "repair"
  | "maintenance"
  | "upgrade"
  | "consumable"
  | "service"
  | "other";

interface AssetAddOn {
  id: string;
  assetId: string;
  ledgerEntryId?: string;
  name: string;
  type: AssetAddOnType;
  amountCent: number;
  purchaseDate: string;
  paymentAccountId?: string;
  ledgerCategoryId?: string;
  includeInAssetCost: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.4 LedgerEntry 记账记录

```ts
type LedgerEntryType =
  | "expense"
  | "income"
  | "transfer"
  | "repayment"
  | "refund"
  | "borrow_in"
  | "lend_out"
  | "asset_purchase"
  | "asset_add_on"
  | "asset_sale";

interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  amountCent: number;
  occurredAt: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  relatedAssetId?: string;
  relatedAssetAddOnId?: string;
  relatedLedgerEntryId?: string;
  merchant?: string;
  channel?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

说明：

- `fromAccountId` 表示付款账户、转出账户或还款来源账户。
- `toAccountId` 表示收款账户、转入账户或负债账户。
- `relatedLedgerEntryId` 用于退款、还款等关联原交易。

### 4.5 FundAccount 资金账户

```ts
type FundAccountType =
  | "cash"
  | "alipay"
  | "wechat"
  | "debit_card"
  | "credit_card"
  | "huabei"
  | "jiebei"
  | "loan"
  | "receivable"
  | "payable"
  | "investment";

type FundAccountDirection = "asset" | "liability";

interface FundAccount {
  id: string;
  name: string;
  type: FundAccountType;
  direction: FundAccountDirection;
  balanceCent: number;
  creditLimitCent?: number;
  billingDay?: number;
  repaymentDay?: number;
  institution?: string;
  isArchived: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

说明：

- 现金、支付宝、微信、储蓄卡属于 `asset`。
- 信用卡、花呗、借呗、贷款一般属于 `liability`。
- `balanceCent` 对资产账户表示余额，对负债账户表示当前欠款。

### 4.6 Category 分类

```ts
type CategoryType = "asset" | "ledger" | "add_on";

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}
```

## 5. 数据关系

核心关系：

```text
Asset 1 - N AssetAddOn
Asset 1 - N LedgerEntry
AssetAddOn 1 - 1 LedgerEntry
FundAccount 1 - N LedgerEntry
Category 1 - N Asset
Category 1 - N LedgerEntry
```

关键引用：

- `Asset.purchaseLedgerEntryId` 记录资产最初购买账单。
- `AssetAddOn.ledgerEntryId` 记录附加项对应账单。
- `LedgerEntry.relatedAssetId` 记录账单关联的资产。
- `LedgerEntry.relatedAssetAddOnId` 记录账单关联的附加项。

## 6. 计算规则

### 6.1 持有天数

```text
持有天数 = 今天 - 购买日期 + 1
```

最小值为 1，避免当天购买时日均成本除以 0。

### 6.2 资产总成本

```text
资产总成本 = 原始购买价 + 计入成本的附加项总额 - 转卖收入
```

其中：

- 只有 `includeInAssetCost = true` 的附加项才计入成本。
- 转卖收入来自 `type = asset_sale` 的记账记录。

### 6.3 日均成本

```text
日均成本 = 资产总成本 / 持有天数
```

如果资产已转卖，可以继续按购买日期到转卖日期计算实际持有天数。

### 6.4 过保状态

```text
剩余保修天数 = 过保日期 - 今天
```

展示规则：

- 大于 30 天：正常。
- 1 到 30 天：即将过保。
- 小于 0 天：已过保。

### 6.5 净资产

```text
净资产 = 资产账户余额总和 - 负债账户余额总和
```

### 6.6 本月收入与支出

本月收入统计：

- 包含 `income`。
- 包含可选的 `asset_sale`，但看板可以单独展示为“资产转卖收入”。

本月支出统计：

- 包含 `expense`。
- 包含 `asset_purchase`。
- 包含 `asset_add_on`。
- 不包含 `transfer`。
- 不包含 `repayment`。

## 7. 资金账户联动规则

所有记账记录都应该通过统一函数影响账户余额。

推荐函数：

```ts
applyLedgerEntryEffect(entry: LedgerEntry): AccountPatch[]
revertLedgerEntryEffect(entry: LedgerEntry): AccountPatch[]
```

### 7.1 支出 expense / asset_purchase / asset_add_on

现金类账户付款：

```text
fromAccount.balance -= amount
```

信用类账户付款：

```text
fromAccount.balance += amount
```

说明：

- 对信用卡、花呗等负债账户来说，消费会增加欠款。

### 7.2 收入 income / asset_sale

```text
toAccount.balance += amount
```

### 7.3 转账 transfer

```text
fromAccount.balance -= amount
toAccount.balance += amount
```

转账不计入收入和支出。

### 7.4 还款 repayment

```text
fromAccount.balance -= amount
toAccount.balance -= amount
```

说明：

- `fromAccount` 是现金类账户。
- `toAccount` 是信用卡、花呗、借呗等负债账户。
- 还款不计入支出。

### 7.5 退款 refund

推荐关联原交易：

```text
toAccount.balance += amount
```

如果原交易是信用账户付款，也可以支持退回信用账户：

```text
creditAccount.balance -= amount
```

MVP 可以先让用户手动选择退款到账账户。

## 8. 写入事务设计

因为资产、账单、账户会联动，写操作必须尽量使用事务。

### 8.1 新增资产购买

一次操作应完成：

1. 创建 `LedgerEntry(type = asset_purchase)`。
2. 创建 `Asset`。
3. 更新 `LedgerEntry.relatedAssetId`。
4. 更新 `Asset.purchaseLedgerEntryId`。
5. 应用资金账户变动。

### 8.2 新增资产附加项

一次操作应完成：

1. 创建 `LedgerEntry(type = asset_add_on)`。
2. 创建 `AssetAddOn`。
3. 更新 `LedgerEntry.relatedAssetAddOnId`。
4. 应用资金账户变动。
5. 触发资产计算刷新。

### 8.3 编辑记账记录

编辑时不要直接覆盖影响账户余额。

推荐流程：

1. 读取旧记账记录。
2. 反向撤销旧记录对账户的影响。
3. 保存新记账记录。
4. 应用新记录对账户的影响。
5. 更新相关资产和附加项。

### 8.4 删除记账记录

删除时推荐：

1. 弹窗提示会影响账户余额和关联资产。
2. 反向撤销该记录对账户的影响。
3. 删除记账记录。
4. 如果有关联附加项，由用户选择：
   - 同时删除附加项。
   - 保留附加项，但取消账单关联。
5. 如果是资产购买记录，不允许直接删除，必须先处理关联资产。

## 9. 页面与功能拆分

### 9.1 AppShell

负责：

- 左侧导航。
- 顶部搜索。
- 用户信息入口。
- 页面内容插槽。

### 9.2 Dashboard

读取：

- 资产列表。
- 附加项列表。
- 记账列表。
- 账户列表。

计算：

- 净资产。
- 本月收入。
- 本月支出。
- 即将过保资产。
- 即将还款账户。
- 日均成本排行。

### 9.3 Assets

功能：

- 资产列表。
- 资产搜索。
- 分类和状态筛选。
- 新增资产。
- 编辑资产。
- 删除资产。
- 资产详情。
- 附加项列表。
- 添加附加项。
- 转卖资产。

### 9.4 Ledger

功能：

- 记账列表。
- 按日期、类型、分类、账户、资产筛选。
- 新增记账。
- 编辑记账。
- 删除记账。
- 从记账创建资产。
- 从记账创建附加项。

### 9.5 Funds

功能：

- 账户列表。
- 新增账户。
- 编辑账户。
- 归档账户。
- 转账。
- 还款。
- 查看账户相关流水。

### 9.6 Me

MVP 功能：

- 用户资料展示。
- 分类管理入口。
- 账户管理入口。
- 数据导出。
- 数据导入。
- 设计主题占位。

## 10. 组件设计

优先实现这些基础组件：

```text
AppShell
Sidebar
Topbar
PageHeader
Button
IconButton
Input
Select
DateRangePicker
Tabs
Card
StatCard
AssetCard
DataTable
Tag
StatusBadge
AmountText
Modal
Drawer
EmptyState
Pagination
```

组件原则：

- 不在业务页面重复写按钮样式。
- 金额展示统一用 `AmountText`。
- 表格统一用 `DataTable`。
- 资产状态统一用 `StatusBadge`。
- 复杂新增和编辑表单优先用右侧抽屉。

## 11. 数据初始化

MVP 可以提供一组 demo 数据，方便开发和展示。

默认分类：

- 资产分类：数码设备、衣物鞋子、家居用品、运动器材、订阅服务、其他物品。
- 支出一级分类：餐饮、出行、购物、住房、资产相关、还款、金融手续费、其他支出。
- 支出子分类示例：
  - 餐饮：早餐、午餐、晚餐、零食饮料、聚餐。
  - 出行：地铁、公交、打车、高铁、飞机、加油停车。
  - 资产相关：资产购买、资产配件、维修保养、耗材、升级改造。
  - 还款：信用卡还款、花呗还款、借呗还款、贷款还款。
- 收入一级分类：工资、外快、资产收入、投资收益、退款赔付、其他收入。
- 收入子分类示例：
  - 工资：A 公司工资、B 公司工资、奖金补贴。
  - 外快：视频剪辑、开店收入、接单收入、内容收益。
  - 资产收入：二手转卖、配件转卖、共享出租、残值回收。
- 账户分类：现金、钱包、储蓄卡、信用卡、消费信贷、贷款、投资账户、其他账户。

默认账户：

- 现金
- 支付宝
- 微信
- 招商银行储蓄卡
- 信用卡
- 花呗

默认资产：

- iPhone 16 Pro
- MacBook Air M2
- AirPods Pro 2
- Sony WH-1000XM5

## 12. 开发顺序

建议按下面顺序推进：

1. 初始化项目：Vue 3、TypeScript、Vite、Vue Router、Pinia、样式变量。
2. 实现基础布局：AppShell、Sidebar、Topbar。
3. 实现基础 UI 组件：Button、Input、Card、Tag、DataTable。
4. 建立 TypeScript 数据模型。
5. 建立 IndexedDB / Dexie 数据层。
6. 写金额、日期、资产成本、账户余额计算函数。
7. 做 demo 数据初始化。
8. 实现资金账户页面。
9. 实现记账页面和账户联动。
10. 实现物品资产列表和详情。
11. 实现资产附加项联动。
12. 实现看板统计。
13. 补充导入导出。
14. 做整体 UI 调整和空状态、加载状态。

## 13. 测试重点

第一版最需要测试的是联动逻辑。

重点用例：

- 新增支出后，现金账户余额减少。
- 新增信用卡支出后，信用卡负债增加。
- 新增收入后，收款账户余额增加。
- 转账不计入收入和支出。
- 还款不重复计入支出。
- 支出/收入分类支持一级分类和子分类。
- 分类改名默认不改变历史交易快照。
- 停用分类后，新建记账不再出现，但历史交易可正常显示。
- 已被交易使用的分类不能直接物理删除。
- 新增资产购买后，同时生成资产和账单。
- 新增计入成本的附加项后，资产总成本增加。
- 新增不计入成本的附加项后，资产总成本不变。
- 编辑记账金额后，账户余额正确反向修正。
- 删除记账后，账户余额正确恢复。
- 转卖资产后，收款账户增加，资产真实成本重新计算。

## 14. 后续扩展方向

后续版本可以扩展：

- 云同步。
- 登录账户。
- 多设备同步。
- OCR 识别订单和小票。
- 银行账单导入。
- AI 自动分类。
- 预算系统。
- 订阅管理。
- 多货币。
- 投资账户市值同步。
- 移动端适配。

## 15. 当前决策

MVP 暂定决策：

- PC 网页端优先。
- 本地优先。
- 金额以分为单位存储。
- 日均成本默认按持有天数计算。
- 维修、配件、保养等附加项默认让用户选择是否计入资产成本。
- 记账分类只包含支出和收入，且支持一级分类 + 子分类。
- 转账独立于记账分类，只生成账户流水，不计入收入支出统计。
- 还款作为负债联动业务，默认不计入日常支出统计。
- 删除有关联数据时必须提示影响范围。
