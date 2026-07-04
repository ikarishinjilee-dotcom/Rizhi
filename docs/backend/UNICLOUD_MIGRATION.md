# uniCloud 迁移说明

## 当前阶段

第一阶段已建立：

- 普通 Vite Vue 通过 URL 化云函数访问 uniCloud。
- 账户新增、编辑、删除、账户转账。
- 收入和支出的新增、编辑、删除。
- 账户余额和资金流水联动。
- 资产、附加项、资产转让和撤销。
- 分类增删改、占用检查和交易分类迁移。
- 完整快照导入、导出和读取，为本地数据首次迁移提供入口。

当前云端实现已接入 uni-id，业务数据所属用户由服务端校验 token 后确定。仍需完成真实账号联调、云存储图片和数据库事务补偿。

## 部署

1. 使用 HBuilderX 打开 `apps/uni-app`，将其中的 `uniCloud-alipay` 关联到现有支付宝云免费服务空间。
2. 上传业务 Schema，以及 `uni-id-pages`、`uni-captcha` 等插件提供的 Schema。
3. 上传 `uni-captcha`、`uni-cloud-s2s`、`uni-config-center`、`uni-id-common` 和 `uni-open-bridge-common` 公共模块。
4. 上传部署 `uni-id-co`、`uni-captcha-co` 和 `rizhi-api`。
5. 在 uniCloud Web 控制台为 `rizhi-api` 配置 URL 化路径 `/rizhi-api`；`uni-id-co` 不需要单独 URL 化。
6. 复制 `apps/web/.env.unicloud.example` 为 `apps/web/.env.unicloud.local`，填写 `rizhi-api/api/v1` 地址。
7. 使用 `npm run dev:unicloud` 本地验证。

## 安全边界

uniCloud 模式必须携带 uni-id token，`rizhi-api` 从 token 获取 uid，拒绝客户端指定数据所属用户。`VITE_USER_ID` 仅保留给旧 HTTP/Fastify 兼容模式，uniCloud 模式不使用它。

支付宝云默认域名会拦截浏览器 OPTIONS 预检。前端的 `unicloud` 传输层因此使用简单请求，并通过 `__method` 恢复 PATCH/DELETE 语义；接入正式身份认证或自定义域名时应重新评估该兼容层。

## 首次数据迁移

云函数提供：

- `GET /api/v1/export`
- `POST /api/v1/import`
- `GET /api/v1/snapshot`

`import` 接收现有 `AppDataSnapshot` JSON。建议先从本地应用导出，再导入云端；导入会覆盖当前用户在云端的六个业务集合，执行前应保留导出备份。

## 免费额度约束

- 图片不能以 Data URL 写入数据库，应在下一阶段上传云存储并只保存 file ID。
- 快照接口受阿里云 URL 化请求和响应 2MB 限制。
- 免费空间每月需要主动续期。
