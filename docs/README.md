# Rizhi 文档目录

这里集中存放产品、设计、技术、后端、前端验收和测试相关文档，避免项目根目录堆积过多 Markdown 文件。

## 当前技术基线

- PC Web：根目录 Vue 3 + Vite 应用。
- 跨端客户端：`apps/uni-app/`，目标覆盖 Android、iOS 和小程序。
- 正式后端：`apps/uni-app/uniCloud-alipay/`。
- 用户体系：uni-id / uni-id-pages。
- `server/` 为旧 Fastify + SQLite 实现，只用于迁移核对，不再新增业务能力。

## 产品规划

- [PRD](./product/PRD.md)
- [路线图](./product/ROADMAP.md)
- [业务规则](./product/BUSINESS_RULES.md)
- [原型计划](./product/PROTOTYPE_PLAN.md)

## 设计规范

- [设计规范](./design/DESIGN.md)
- [设计稿与组件库差异](./design/DESIGN_COMPONENT_DIFFS.md)
- [Figma 检查建议](./design/FIGMA_REVIEW.md)

## 技术架构

- [V2 架构与目录边界](./architecture/V2_ARCHITECTURE.md)
- [技术设计](./architecture/TECHNICAL_DESIGN.md)
- [数据模型](./architecture/DATA_MODEL.md)
- [API 设计](./architecture/API_DESIGN.md)

## 后端

- [当前后端说明](./backend/README.md)
- [uniCloud 迁移说明](./backend/UNICLOUD_MIGRATION.md)

## 前端

- [前端验收清单](./frontend/FRONTEND_ACCEPTANCE.md)
- [前端第一轮验收](./frontend/FRONTEND_ACCEPTANCE_ROUND1.md)

## 测试

- [测试策略](./testing/TEST_STRATEGY.md)

## 历史资料

- [Fastify + SQLite 旧后端](./legacy/fastify/README.md)
