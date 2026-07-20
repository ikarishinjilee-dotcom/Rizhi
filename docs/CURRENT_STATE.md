# 日值当前版本说明

> 本文是当前代码、测试和部署方式的唯一总览，更新日期：2026-07-16。

## 当前形态

日值是一个 npm workspace monorepo，当前包含两个客户端和一套正式云端 API：

- `apps/web/`：当前主力 PC Web 应用，Vue 3 + TypeScript + Vite。
- `apps/uni-app/`：uni-app 客户端，负责 H5、App 和小程序方向的跨端能力。
- `apps/uni-app/uniCloud-alipay/`：正式 uniCloud 云函数、数据库 Schema 和云端资源。
- `docs/legacy/fastify/`：已退役的 Fastify + SQLite 历史资料，只用于迁移追溯。

## Web 数据链路

```text
Vue 页面
  -> Pinia appDataStore
  -> services
  -> repositories
  -> IndexedDB/Dexie（本地模式）
     或
     HTTP URL 化云函数 rizhi-api（uniCloud 模式）
```

Web 正式环境使用 uni-id 登录和 uniCloud 数据源。用户身份由 token 决定，业务数据按 token 对应的 uid 隔离。

## 当前功能范围

- 用户注册、登录、身份刷新和退出。
- 仪表盘、资产、资产详情、附加项、记账、资金账户和设置。
- 资产采购、附加项、转让、账户转账、还款等资金联动。
- 资产/交易/账户分类管理，以及管理员字典和用户状态管理。
- 站点品牌配置：Logo、首页图片、标题和描述。
- 数据导入、导出、备份和云端图片附件。

## 当前验证基线

```powershell
npm.cmd test
npm.cmd run typecheck:all
npm.cmd run build:production
```

当前 Web 单元测试共 49 项，测试文件位于 `apps/web/src/services/__tests__/`；E2E 用例位于 `apps/web/e2e/`。

## 需要注意的边界

- `npm.cmd run build:production` 生成的是 `apps/web/dist/`，这是 PC Web 静态部署目录。
- `npm.cmd run build:uni` 生成的是 `apps/uni-app/dist/build/h5/`，这是 uni-app H5 产物，不能与 PC Web 产物混上传。
- 正式 Web 部署默认使用 `.env.production.local` 中的 uniCloud API 地址。
- 不要把 `server/`、Fastify 或 SQLite 文档中的命令用于当前正式环境。
