# uniCloud 迁移与当前部署说明

## 1. 迁移结果

日值已经从旧 Fastify + SQLite 本地 API 迁移到 uniCloud：

- 用户认证：uni-id。
- 数据存储：uniCloud 数据库集合。
- 业务 API：`rizhi-api` URL 化云函数。
- 图片：uniCloud 文件存储。
- PC Web：通过 HTTP transport 访问云函数。
- uni-app：通过 uniCloud 运行时接入云端能力。

## 2. 云端资源

源码位置：

```text
apps/uni-app/uniCloud-alipay/cloudfunctions/rizhi-api/
apps/uni-app/uniCloud-alipay/database/
apps/uni-app/src/uni_modules/uni-id-common/
apps/uni-app/src/uni_modules/uni-id-pages/
```

部署时先在 HBuilderX 中关联目标云空间，再上传云函数和数据库 Schema。PC Web 的静态资源部署是另一条独立流程。

## 3. Web 配置

生产配置示例：

```env
VITE_DATA_SOURCE=unicloud
VITE_API_BASE_URL=https://<云函数域名>/rizhi-api/api/v1
VITE_ROUTER_MODE=hash
VITE_APP_ENV=production
```

测试环境使用 staging 配置和测试云空间。配置文件位于 `apps/web/.env.*.local`，不要提交包含私有地址、密钥或临时凭证的文件。

## 4. Transport 兼容层

由于部分云空间网关对浏览器 OPTIONS 预检处理不一致，Web 端把真实方法和参数包装到 POST 请求体：

```json
{
  "__rizhiTransport": true,
  "method": "PATCH",
  "token": "<uni-id-token>",
  "payload": {}
}
```

云函数再恢复业务方法。所有需要身份的接口都从 token 获取 uid。

## 5. 验证

部署后至少检查：

```text
POST <VITE_API_BASE_URL>/health
登录 -> /auth/login
身份刷新 -> /auth/me
数据初始化 -> /snapshot
```

若页面出现“连接服务器超时”，先确认上传的是 `apps/web/dist`，而不是 `apps/uni-app/dist/build/h5`，再检查 API URL 和云函数 CORS。
