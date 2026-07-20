# 日值 V2 架构

> 当前版本架构说明。代码事实来源优先于早期设计稿。

## 1. 总体结构

```text
rizhi/
├─ apps/
│  ├─ web/                         PC Web：Vue 3 + Vite + TypeScript
│  └─ uni-app/                     跨端客户端：uni-app + Vue 3
│     └─ uniCloud-alipay/          云函数、数据库 Schema 和云端资源
├─ scripts/                        构建、测试和 Web Hosting 部署脚本
└─ docs/                           当前说明、产品、设计和历史资料
```

`server/` 已从当前代码基线中退役；旧 Fastify + SQLite 文件只保留在 `docs/legacy/fastify/` 中供迁移追溯。

## 2. 当前数据链路

PC Web 通过仓储契约隔离数据源：

```text
页面 -> Pinia store -> service -> repository contract
                         ├─ indexedDbRepositories -> Dexie/IndexedDB
                         └─ httpRepositories       -> rizhi-api URL 化云函数
```

`VITE_DATA_SOURCE=unicloud` 时使用云端仓储；其他情况下使用 IndexedDB 本地仓储。页面和业务 service 不应直接依赖具体存储实现。

## 3. 云端边界

- `rizhi-api` 是 PC Web 的统一业务 API 入口。
- `uni-id` 负责注册、登录、token 校验和用户身份。
- 云函数从有效 token 获取 uid，客户端不能通过普通请求体指定数据归属用户。
- `rizhi-api` 负责业务数据、图片上传、站点品牌、管理员和备份接口。
- uni-app 通过 uniCloud 能力接入同一云端资源；两端不直接共享页面组件。

## 4. 当前模块

PC Web 当前包含：

- 登录、注册和身份刷新。
- 仪表盘、资产列表、资产详情和附加项。
- 记账、资金账户、转账、还款和账户流水。
- 设置、分类迁移、数据备份和恢复。
- 管理员用户管理、资产/账户/银行字典和站点品牌配置。

## 5. 目录职责

- `apps/web/src/domain/`：领域模型和纯计算。
- `apps/web/src/services/`：业务操作和云端辅助服务。
- `apps/web/src/repositories/`：数据访问契约及 IndexedDB/HTTP 实现。
- `apps/web/src/db/`：本地 Dexie 数据库、种子和事务写入。
- `apps/web/src/stores/`：页面共享状态。
- `apps/uni-app/uniCloud-alipay/cloudfunctions/rizhi-api/`：正式 API 云函数。
- `apps/uni-app/uniCloud-alipay/database/`：业务集合 Schema。

## 6. 构建与部署边界

```powershell
npm.cmd run build:production  # apps/web/dist，PC Web
npm.cmd run build:uni         # apps/uni-app/dist/build/h5，uni-app H5
npm.cmd run deploy:web:test
npm.cmd run deploy:web:production
```

两个客户端的构建产物不可混用；PC Web 静态托管必须上传 `apps/web/dist` 内的文件。
