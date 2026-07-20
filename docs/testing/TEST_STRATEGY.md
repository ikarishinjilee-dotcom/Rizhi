# 日值测试策略

## 1. 当前测试范围

当前测试以 `apps/web` 为主，覆盖领域规则、服务层、IndexedDB 仓储和关键页面交互。云函数目前以代码审查、类型检查和线上健康检查作为基础保障，后续补充 API 集成测试。

## 2. 运行命令

```powershell
# Web 单元/服务测试
npm.cmd test

# Web 类型检查
npm.cmd run typecheck:web

# uni-app 类型检查
npm.cmd run typecheck:uni

# 全部类型检查
npm.cmd run typecheck:all

# E2E
npm.cmd run test:e2e

# 生产构建
npm.cmd run build:production
```

## 3. 当前基线

- 5 个 Vitest 测试文件。
- 49 个单元/服务测试已通过。
- E2E 用例位于 `apps/web/e2e/`，覆盖弹窗安全、删除确认和分类筛选。
- 测试环境使用 fake IndexedDB，避免污染真实浏览器数据。

## 4. 必须覆盖的业务规则

- 资产采购、附加项、转让会正确同步交易、账户余额和账户流水。
- 交易删除会回滚账户余额，并保留必要的历史快照。
- 有流水的账户不能删除。
- 被资产、交易、账户或子分类引用的分类不能直接删除。
- 收入和支出分类用途必须匹配。
- 已转让或已处置资产不能继续写入受保护业务。
- 备份导出、导入和结构校验不能破坏现有数据。
- token 失效时前端清理会话并回到登录页。

## 5. 发布前检查

```powershell
npm.cmd test
npm.cmd run typecheck:all
npm.cmd run build:production
```

如果改动涉及弹窗、删除、表单、图片或路由，再运行：

```powershell
npm.cmd run test:e2e
```

发布后检查测试/正式环境的首页、登录、数据初始化、资产写入、记账写入和管理员权限。

## 6. 后续补强

- 云函数路由和数据库 Schema 的集成测试。
- 正式环境用户隔离、token 失效、CORS 和图片上传测试。
- 站点品牌配置和管理员操作的 E2E。
- 生产构建 chunk 预算和首屏性能检查。
