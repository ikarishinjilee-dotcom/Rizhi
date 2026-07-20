# Rizhi Figma 审查清单：前端开发 + 设计系统规范

目标：从前端开发和设计系统落地角度检查当前 Figma 页面，减少后续 Vue 开发中的重复样式、临时组件和页面级微调。

## 总体判断

当前 Figma 稿已经具备产品结构和页面方向，但仍偏“静态页面拼图”。建议先统一 spacing、type、color tokens，再抽出 Sidebar、Topbar、Button、Input、Card、Table、Tag、StatCard、AssetCard 等组件，并补齐关键交互状态。

否则开发时容易出现：

- 大量一次性 CSS。
- 页面间距反复微调。
- 组件状态临时追加。
- 同类卡片和表格在不同页面表现不一致。
- 设计稿与代码 tokens 无法稳定对应。

## 修改建议清单

### P0：必须优先处理

1. 颜色需要归纳为设计变量

   建议建立：

   - `primary`
   - `success`
   - `danger`
   - `warning`
   - `info`
   - `purple`
   - `text-primary`
   - `text-secondary`
   - `text-tertiary`
   - `border`
   - `bg-page`
   - `bg-card`

   浅蓝、浅绿、浅红、浅黄标签背景也要变量化，避免组件内硬编码 hex。

2. 组件复用边界需要明确

   需要沉淀这些组件：

   - `AppShell`
   - `Sidebar`
   - `Topbar`
   - `PageHeader`
   - `RButton`
   - `RInput`
   - `RSelect`
   - `RCard`
   - `StatCard`
   - `AssetCard`
   - `RDataTable`
   - `RTag`
   - `AmountText`
   - `Drawer`
   - `Modal`
   - `EmptyState`

3. 缺少交互状态页或组件状态板

   当前主要展示默认态。需要补：

   - `hover`
   - `active`
   - `disabled`
   - `loading`
   - `empty`
   - `error`
   - `selected`
   - `focus`

   重点覆盖按钮、输入框、筛选器、表格行、资产卡片、删除确认、空列表、表单校验。

4. 抽屉和弹窗原型不足

   核心流程依赖：

   - 新增记账
   - 新增资产
   - 添加附加项

   建议补 3 个右侧抽屉画板，覆盖资产购买、关联资产、附加项计入成本、错误校验。

5. 建议新增“组件状态页”

   在 Figma 中新增 `Components / States`：

   - 按钮 5 态
   - 输入框 4 态
   - 标签 6 类
   - 表格行 3 态
   - 卡片 3 态
   - 抽屉表单错误态

### P1：影响开发效率，建议尽快处理

1. 间距体系未完全收敛

   建议把页面边距、卡片间距、表格间距收敛为 4px 栅格：

   - 页面边距：24px
   - 区块间距：20px
   - 卡片内边距：16px
   - 表单项间距：12px
   - 元素间距：8px

   当前资产卡片、看板卡片、资金页上下间距有轻微不一致，开发时会导致每页写独立 margin。

2. 字号层级需要冻结为 token

   建议只保留：

   - 12px
   - 13px
   - 14px
   - 16px
   - 20px
   - 24px

   前端应定义：

   - `text-page-title`
   - `text-section-title`
   - `text-card-title`
   - `text-body`
   - `text-caption`
   - `text-money`

3. 资产图片和图标占位会增加实现偏差

   当前部分资产图用简单符号占位，开发时可能和最终视觉差距较大。

   建议定义 `AssetImage` 组件：

   - 真实图片
   - 无图默认态
   - 加载失败态
   - 订阅服务图标态

4. 表格列宽和对齐规则需规范化

   建议固定列模型：

   - 日期：140px
   - 类型：96px
   - 分类：120px
   - 说明：flex
   - 账户：130px
   - 关联资产：160px
   - 金额：120px，右对齐
   - 操作：80px

   金额列统一使用 `AmountText`。

5. 页面内容密度需要开发约束

   建议每个页面定义 section 和 grid 规则：

   - 看板：6 张 `StatCard` + 3 列信息卡
   - 资产列表：`AssetCard` 固定 204 x 236
   - 详情页：左右布局固定
   - 资金页：资产账户与负债账户左右分区

6. 缺少空状态和错误状态会影响 MVP 完整度

   至少补：

   - 暂无资产
   - 暂无账单
   - 暂无账户
   - 暂无附加项
   - 搜索无结果
   - 表单金额错误
   - 账户余额不足提示
   - 删除关联记录确认

7. 设计变量和技术文档需一一对应

   建议 Figma 中变量命名与代码 `tokens.css` 对齐：

   - `--color-primary`
   - `--color-border`
   - `--radius-md`
   - `--shadow-card`
   - `--space-16`

   这样 Vue 组件实现时可以直接映射，不需要再翻译一遍。

## 建议修改顺序

1. 先建立设计变量：颜色、字号、间距、圆角、阴影。
2. 抽组件：Button、Input、Card、Table、Tag、AssetCard、StatCard。
3. 补组件状态页：hover、disabled、loading、empty、error。
4. 再回头修 5 个页面，全部替换为组件实例和统一 token。

## 对前端开发成本最高的风险点

1. 颜色没有 token 化，会导致 CSS 里散落大量 hex。
2. 同类卡片尺寸不一致，会导致多个相似但不能复用的组件。
3. 表格列宽未统一，会导致每个表格单独调样式。
4. 新增记账、添加附加项抽屉缺少完整状态，会导致开发时临时补交互。
5. 空状态、错误状态、禁用态缺失，会导致 MVP 上线前集中返工。
# 当前版本补充说明（2026-07-16）

评审结果需以当前 `apps/web` 页面和 `UI_BASELINE_V2.md` 为准。管理员、品牌配置、登录注册和云端数据状态是当前新增的体验范围。

