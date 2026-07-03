# 日值 V2 架构

## 目标

- PC Web 保留独立 Vue 体验。
- Android、iOS 和小程序统一使用 uni-app Vue3。
- 所有客户端共用 uniCloud、uni-id、业务 API 和数据模型。
- 客户端不能直接决定用户 ID，服务端必须从有效 token 获取 uid。

## 目录

```text
rizhi/
├─ src/                         当前 PC Web，认证稳定前保持原位
├─ apps/
│  └─ uni-app/                 DCloud 官方 Vue3/Vite/TypeScript 项目
│     └─ uniCloud-alipay/      唯一云端源码目录
├─ packages/                   后续共享领域模型和 API 客户端
├─ server/                     旧 Fastify 后端，只读迁移参考
└─ docs/
```

## 边界

- PC Web 不导入 uni-app 页面组件。
- PC Web 只调用 URL 化的 `rizhi-api`；登录由 `rizhi-api` 在云端桥接 `uni-id-co`。
- uni-app 通过 `uniCloud.importObject` 调用相同云对象。
- `uni-id-pages` 只负责 uni-app 端现成登录页面。
- 资产、账户、交易等业务规则必须保留在云端，不能散落在各客户端。
- 只允许从 `apps/uni-app/uniCloud-alipay/` 上传和部署云函数、数据库 Schema。
- `server/` 不再接收新业务功能；需要参考旧逻辑时，只迁移规则，不复制旧存储方案。

## 当前阶段

1. PC Web 已具备 uni-id 登录入口和 uniCloud HTTP 适配层。
2. uni-app 已接入 uni-id-pages，H5 可以构建。
3. `rizhi-api` 已改为从 token 获取 uid，不再信任客户端传入用户 ID。
4. 根项目已启用 npm workspaces，PC Web 与 uni-app 共用根 `package-lock.json`。
5. 下一阶段是部署 uni-id Schema、`uni-id-co` 和 `rizhi-api`，完成真实注册登录联调。

## 工作区命令

```bash
npm run dev                 # PC Web
npm run dev:uni             # uni-app H5
npm run typecheck:all       # 两端类型检查
npm run build:all           # 两端生产构建
```

依赖统一从仓库根目录安装：

```bash
npm install
```

## 后续目录演进

- 认证和业务 API 稳定后，再将根目录 PC Web 迁入 `apps/web/`。
- 两个客户端出现真实重复代码后，再建立 `packages/domain/` 和 `packages/api-client/`。
- 在迁移完成前，不为追求目录整齐提前抽取共享包。

## 迁移纪律

1. 当前 PC Web 始终保持可构建、可回退。
2. 新模块先在云端确定契约，再分别接入客户端。
3. 每次只迁移一个业务域，并核对账户余额和关联流水。
4. 完成 uni-id 前不公开 URL 化业务接口。
5. 每次结构迁移都必须先提交可构建基线，再移动目录。
