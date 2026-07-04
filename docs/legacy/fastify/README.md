# Fastify + SQLite 旧后端

本目录保存 V1 本地后端的设计、接口状态、验收和部署资料。

对应代码仍位于仓库根目录的 `server/`，用于：

- 对照迁移业务规则；
- 核对资产、附加项、交易和账户联动；
- 保留旧测试作为回归参考。

该实现不再是正式部署目标，不应继续添加新业务功能。正式后端以 uniCloud + uni-id 为准。

## 文档

- [技术路线](./BACKEND_TECH_PLAN.md)
- [API 状态](./BACKEND_API_STATUS.md)
- [验收清单](./BACKEND_ACCEPTANCE.md)
- [旧部署说明](./DEPLOYMENT.md)
- [SQLite 结构化方案](./SQLITE_SCHEMA_PLAN.md)
