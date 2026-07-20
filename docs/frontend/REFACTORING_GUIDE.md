# Web 端代码梳理与重构基线

## 当前分层

- `features/` 只负责页面编排、路由参数和页面级状态。
- `components/ui/` 放无业务语义的基础控件。
- `components/business/` 放跨页面复用的业务展示与交互组件。
- `domain/` 只放纯计算和领域规则，不读取 Vue 状态。
- `services/` 负责业务用例和持久化边界；页面不直接操作 IndexedDB。
- `utils/` 放无副作用的通用格式化与转换函数。

## 已完成的基线整理

1. 金额、紧凑金额和日期时间格式化集中到 `src/utils/formatters.ts`，Ledger、Funds、Dashboard、Assets 页面共享同一实现。
2. Ledger 的收支总览卡片抽取为 `LedgerOverviewCards.vue`，页面只负责传入统计结果。
3. Funds 的统计网格、资金流水、资产/负债账户行分别抽取为 `FundsSummaryGrid.vue`、`FundsFlowPanel.vue` 和 `FundsAccountLine.vue`。
4. Ledger 的日报弹窗抽取为 `LedgerDailyReport.vue`，日报表格与主页面状态解耦。
5. Ledger 的账户选择器抽取为 `LedgerAccountPickerModal.vue`，并迁移原 scoped 样式，保留父页面的选择状态和业务计算。
6. Settings 的 Profile、Data 区块分别抽取为 `SettingsProfileSection.vue` 和 `SettingsDataSection.vue`，父页面继续持有数据和业务动作。
7. Funds 的账户、负债和还款提醒面板抽取为 `FundsAccountPanels.vue`，并将统计卡、账户行、流水面板的 scoped 样式随组件迁移。
8. Funds 的四类弹窗统一由 `FundsModalShell.vue` 承载外层 modal 配置；AssetDetail 顶部媒体、详情和成本概览抽取为 `AssetDetailHero.vue`。
9. Settings 分类编辑和批量管理分别抽取为 `SettingsCategoryEditorModal.vue`、`SettingsCategoryBatchModal.vue`；Ledger 记账表单主体抽取为 `LedgerEntryEditorForm.vue`，并将原 scoped 表单样式同步迁移。
10. Ledger 日历视图和交易详情弹窗分别抽取为 `LedgerCalendarModal.vue`、`LedgerEntryDetailModal.vue`，日历网格、日期摘要、交易明细和详情操作样式随组件迁移。
6. 管理后台改为路由级懒加载，避免普通用户进入应用时提前加载管理页面。
7. 统一页面组件的导入边界，新增复用组件优先放在 `components/business/`，避免在页面内定义组件。

## 后续拆分顺序

按耦合度和收益排序，后续页面建议按以下顺序拆分：

1. `LedgerPage.vue`：拆出日历、日报、记账编辑器、账户选择器和交易详情；将筛选、草稿和弹窗状态收敛到 composable。当前已完成日报、账户选择器和记账弹窗外壳迁移，记账字段主体仍通过 slot 保留在页面中，确保功能与样式不变。
2. `SettingsPage.vue`：拆出 Profile、Data、Category 三个 section，以及分类编辑器、批量管理和迁移流程。
3. `FundsPage.vue`：拆出账户卡片、账户编辑器、转账/还款表单和账户详情抽屉。
4. `AssetListPage.vue` / `AssetDetailPage.vue`：拆出分析卡片、资产媒体区、附加项编辑器和转让表单。
5. `db/actions.ts`：按 asset、transaction、account、category 分成领域 action 文件，保留一个兼容出口。

## 约束

- 页面组件建议控制在 300 行以内；单个 composable 只服务一个明确业务域。
- 子组件通过 props / emits 通信，不直接读取路由或全局 store，除非它本身就是业务容器。
- 纯计算优先放到 `domain/` 并补单元测试；所有跨页面格式化逻辑不得在 `.vue` 文件重复实现。
- 每次拆分后必须运行 `npm.cmd run typecheck`、`npm.cmd test` 和 `npm.cmd run build`。
