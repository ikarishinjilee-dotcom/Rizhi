# 日值后端技术路线

## 当前结论

日值后端当前采用：

```text
Fastify + TypeScript + SQLite
```

后端入口统一为：

```text
server/app/main.ts
```

## 当前形态

- `server/app/app.ts`：Fastify 应用装配。
- `server/app/routes/`：HTTP 路由。
- `server/app/repositories/`：业务写入和查询逻辑。
- `server/app/db/sqliteStore.ts`：SQLite 存储入口。
- `server/app/__tests__/`：后端接口和存储测试。

当前 SQLite 仍以单行 JSON 状态保存应用数据，用于稳定替代旧 JSON 文件 API。后续再逐步拆成结构化表。

## 为什么继续用 Fastify

- 与当前 Vue + TypeScript 技术栈衔接自然。
- 路由、插件、错误处理和 schema 校验都有成熟模式。
- 比手写 HTTP 服务更适合长期维护。
- 比 NestJS 更轻，适合当前个人项目阶段。

## 数据库路线

当前阶段：

```text
SQLite + app_state JSON
```

下一阶段：

```text
SQLite structured tables
```

结构化表设计见 [SQLITE_SCHEMA_PLAN.md](./SQLITE_SCHEMA_PLAN.md)。

未来如进入云端多用户版本，再评估：

```text
Postgres
```

## 后续优先级

1. 把 SQLite 从 JSON 状态逐步拆成结构化表。
2. 给 Fastify 路由补 schema 校验。
3. 设计用户认证和 `userId` 隔离。
4. 设计附件上传与存储。
5. 设计云端多用户部署形态。
