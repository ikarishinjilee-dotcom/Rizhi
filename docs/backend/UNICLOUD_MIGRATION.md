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

当前云端实现覆盖现有主要数据入口，但仍属于迁移验证版本。正式公开前还需要接入 uni-id、云存储图片和数据库事务补偿。

## 部署

1. 使用 HBuilderX 打开 `apps/uni-app`，将其中的 `uniCloud-alipay` 关联到现有支付宝云免费服务空间。
2. 在 `apps/uni-app/uniCloud-alipay/database` 上执行“上传所有 DB Schema”。
3. 上传部署云函数 `apps/uni-app/uniCloud-alipay/cloudfunctions/rizhi-api`。
4. 在 uniCloud Web 控制台为该云函数配置 URL 化路径 `/rizhi-api`。
5. 复制 `.env.unicloud.example` 为 `.env.unicloud.local`，填写 URL 化域名。
6. 使用 `npm run dev:unicloud` 本地验证。

## 安全边界

`VITE_USER_ID` 只是迁移期间的数据隔离标识，不是身份认证。当前 URL 不应公开。正式发布前必须接入 `uni-id`，由登录令牌确定用户，不能继续信任请求头中的用户 ID。

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
