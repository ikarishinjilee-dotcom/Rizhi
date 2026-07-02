# 设计稿与组件库的差异清单

本次代码以 Vue 3 + Naive UI 为底座，并优先通过项目自有组件封装实现：

- `RButton`
- `RInput`
- `RCard`
- `RTag`
- `RDataTable`
- `RDrawer`
- `AmountText`
- `StatCard`
- `AssetMiniList`
- `AppShell`
- `Sidebar`
- `Topbar`

## 已按组件库规范处理的地方

1. 按钮没有直接写原生按钮样式，已封装 `RButton`，底层使用 `n-button`。
2. 输入框已封装 `RInput`，底层使用 `n-input`。
3. 卡片已封装 `RCard`，底层使用 `n-card`，并统一边框和阴影。
4. 标签已封装 `RTag`，颜色来自 `tokens.css`。
5. 表格已封装 `RDataTable`，后续记账页、附加项页都应复用。
6. 金额展示已封装 `AmountText`，统一正负号和红绿颜色。
7. 页面骨架已封装 `AppShell`、`Sidebar`、`Topbar`。

## 设计稿中不符合组件库规范或会增加开发成本的地方

1. Figma 中很多卡片是散装图层，不是组件实例。

   开发中已用 `StatCard` 和 `AssetMiniList` 抽象，后续 Figma 应补组件页。

2. Figma 的图表是手绘线条。

   代码中暂用 SVG 静态趋势线。正式开发建议统一换成 `vue-echarts`，避免每页手写 SVG。

3. Figma 中资产图片是粗略占位。

   代码本轮没有实现 `AssetImage`。后续需要补真实图片、无图、加载失败、订阅图标四种状态。

4. Figma 缺少 hover、disabled、loading、empty、error 状态。

   代码中 `RButton` 已支持 disabled/loading，但还没有专门状态页和空状态组件示例。

5. Figma 中看板卡片高度接近但不完全一致。

   代码中用 CSS grid 和统一 token 收敛，可能与设计稿像素级位置略有差异，但更利于开发维护。

6. Figma 顶部栏图标和头像是静态图层。

   代码使用 `lucide-vue-next` 图标和 CSS 头像占位，后续可以接真实用户信息。

7. Figma 侧边栏宽度接近 112px，但个别截图中看起来更窄。

   代码严格按 [DESIGN.md](./DESIGN.md) 使用 112px，保证后续页面一致。

## 本轮没有生成的内容

由于 Figma MCP 当前达到 Starter plan 调用限制，无法读取“当前选中的页面”。本轮默认实现了优先级最高的 `看板页`。

尚未生成：

- 资产列表页
- 资产详情页
- 记账页
- 资金页
- 新增资产抽屉
- 新增记账抽屉
- 添加附加项抽屉
- 组件状态页

## 后续建议

1. Figma 调用额度恢复后，读取当前选中画板，再逐页生成对应 Vue 页面。
2. 先补 `AssetCard`、`AccountCard`、`EmptyState`、`StatusBadge`。
3. 再生成资产列表页和资产详情页。
4. 最后生成记账页和资金页，因为这两页涉及更多表格与联动状态。
