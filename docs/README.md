# 日值文档目录

这里集中存放日值当前版本的产品、设计、架构、后端、前端验收和测试文档。

## 当前入口

- [当前版本说明](./CURRENT_STATE.md)
- [部署说明](./DEPLOYMENT.md)
- [产品 PRD](./product/PRD.md)
- [业务规则](./product/BUSINESS_RULES.md)
- [开发路线图](./product/ROADMAP.md)

## 架构与接口

- [V2 架构](./architecture/V2_ARCHITECTURE.md)
- [技术设计](./architecture/TECHNICAL_DESIGN.md)
- [数据模型](./architecture/DATA_MODEL.md)
- [API 设计](./architecture/API_DESIGN.md)

## 后端

- [当前后端说明](./backend/README.md)
- [uniCloud 迁移与部署](./backend/UNICLOUD_MIGRATION.md)
- [Fastify + SQLite 历史资料](./legacy/fastify/README.md)

## 前端与设计

- [前端验收清单](./frontend/FRONTEND_ACCEPTANCE.md)
- [前端第一轮验收记录](./frontend/FRONTEND_ACCEPTANCE_ROUND1.md)
- [当前 UI 基线](./design/UI_BASELINE_V2.md)
- [设计规范历史版](./design/DESIGN.md)
- [设计组件差异](./design/DESIGN_COMPONENT_DIFFS.md)
- [Figma 评审记录](./design/FIGMA_REVIEW.md)

## 测试

- [测试策略](./testing/TEST_STRATEGY.md)

## 文档使用规则

1. 当前代码、`CURRENT_STATE.md` 和 `DEPLOYMENT.md` 优先级最高。
2. 涉及接口时以 `apps/uni-app/uniCloud-alipay/cloudfunctions/rizhi-api/index.js` 和数据库 Schema 为事实来源。
3. `docs/legacy/fastify/` 只用于迁移核对，不代表当前运行时，也不应作为部署操作手册。
4. 产品、设计和验收文档中的“规划/建议”不等同于已实现功能；实现状态以当前版本说明和代码为准。
