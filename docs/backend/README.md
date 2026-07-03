# 当前后端说明

日值 V2 的正式后端采用支付宝云 uniCloud，用户体系采用 uni-id。

## 唯一云端源码

```text
apps/uni-app/uniCloud-alipay/
├─ cloudfunctions/
│  └─ rizhi-api/
└─ database/
```

uni-id 的云对象、公共模块和数据库 Schema 位于：

```text
apps/uni-app/src/uni_modules/
```

部署时使用 HBuilderX 打开 `apps/uni-app/`，关联支付宝云空间后上传相关 Schema、公共模块和云函数。

## 当前约束

- 业务接口必须从有效 token 获取 uid。
- 客户端不能传入或覆盖数据所属用户。
- PC Web 通过 URL 化接口访问云端。
- uni-app 优先通过 uniCloud 云对象访问云端。
- `server/` 目录中的 Fastify 后端不再作为正式部署目标。

## uni-id 定制

`uni-id-pages` 包含两项项目级定制，升级插件时必须复核：

- `common/universal.js`：允许 PC Web 使用 `text/plain` 请求，避免支付宝云默认网关的 OPTIONS 预检限制。
- `uni-id-co/index.obj.js`：支付宝云内部 `callFunction` 上下文的 AppID 不可靠，内部调用统一使用本项目唯一的 DCloud AppID。

PC Web 不直接 URL 化 `uni-id-co`。登录统一经过 `rizhi-api/api/v1/auth/login`，再由云函数内部调用 `uni-id-co`。

## 相关文档

- [V2 架构](../architecture/V2_ARCHITECTURE.md)
- [uniCloud 迁移说明](./UNICLOUD_MIGRATION.md)
- [旧 Fastify 后端资料](../legacy/fastify/README.md)
