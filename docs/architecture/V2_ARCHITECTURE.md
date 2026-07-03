# 日值 V2 架构

## 目标

- PC Web 保留独立 Vue 体验。
- Android、iOS 和小程序统一使用 uni-app Vue3。
- 所有客户端共用 uniCloud、uni-id、业务 API 和数据模型。
- 客户端不能直接决定用户 ID，服务端必须从有效 token 获取 uid。

## 目录

```text
rizhi/
├─ src/                         当前 PC Web，迁移稳定前保持原位
├─ apps/
│  └─ uni-app/                 DCloud 官方 Vue3/Vite/TypeScript 项目
│     └─ uniCloud-alipay/      唯一云端源码目录
├─ packages/                   后续共享领域模型和 API 客户端
└─ docs/
```

## 边界

- PC Web 不导入 uni-app 页面组件。
- PC Web 通过 URL 化接口调用 `uni-id-co` 和 `rizhi-api`。
- uni-app 通过 `uniCloud.importObject` 调用相同云对象。
- `uni-id-pages` 只负责 uni-app 端现成登录页面。
- 资产、账户、交易等业务规则必须保留在云端，不能散落在各客户端。

## 迁移纪律

1. 当前 PC Web 始终保持可构建、可回退。
2. 新模块先在云端确定契约，再分别接入客户端。
3. 每次只迁移一个业务域，并核对账户余额和关联流水。
4. 完成 uni-id 前不公开 URL 化业务接口。
