# 当前后端说明

日值当前正式后端采用支付宝云 uniCloud，用户体系采用 uni-id。正式源码位于：

```text
apps/uni-app/uniCloud-alipay/
├─ cloudfunctions/rizhi-api/       PC Web URL 化 API
└─ database/                       业务数据 Schema
```

## 当前职责

- `rizhi-api` 提供健康检查、认证代理、业务数据、附件、备份、站点品牌和管理员接口。
- `uni-id-common`/`uni-id-pages` 提供用户认证能力和跨端登录支持。
- 数据按 token 对应的 uid 隔离，客户端不能自行传入用户 ID 覆盖归属。
- Web 端通过 `VITE_API_BASE_URL` 访问 URL 化云函数；默认业务前缀为 `/rizhi-api/api/v1`。

## 开发与部署

云函数和 Schema 使用 HBuilderX/uniCloud 控制台部署；PC Web 只部署静态资源：

```powershell
npm.cmd run build:production
npm.cmd run deploy:web:production
```

测试环境使用：

```powershell
npm.cmd run build:test
npm.cmd run deploy:web:test
```

完整步骤见 [部署说明](../DEPLOYMENT.md) 和 [uniCloud 迁移说明](./UNICLOUD_MIGRATION.md)。

## 退役后端

根目录 `server/` 对应的 Fastify + SQLite 方案已经退役，不是正式部署目标。相关文档统一放在 `docs/legacy/fastify/`，仅用于历史数据和业务规则迁移核对。
