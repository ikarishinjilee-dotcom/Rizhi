# 日值部署说明

## 1. Web 构建

在仓库根目录执行：

```powershell
npm.cmd run build:production
```

产物目录：

```text
E:\Code\rizhi\apps\web\dist
```

上传时应上传 `dist` 内的所有文件，并确保 `index.html` 位于对象存储根目录。静态网站托管的默认首页和错误页都设置为 `index.html`。

## 2. 测试线部署

```powershell
npm.cmd run deploy:web:test
```

该命令会使用 `scripts/deploy-web.mjs staging`，构建 staging 模式并部署到测试空间。需要本机存在 `C:\HBuilderX\cli.exe`；也可以通过 `HBUILDERX_CLI` 指定路径。

## 3. 正式线部署

```powershell
npm.cmd run deploy:web:production
```

该命令会重新构建生产包，并部署到正式 uniCloud Hosting 空间。部署前建议执行：

```powershell
npm.cmd test
npm.cmd run typecheck:all
npm.cmd run build:production
```

## 4. uni-app H5 构建

只有在需要部署 uni-app H5 时才执行：

```powershell
npm.cmd run build:uni
```

产物目录：

```text
E:\Code\rizhi\apps\uni-app\dist\build\h5
```

该目录包含 `uni.*.css` 和 uni-app 运行时，不能作为 `apps/web` PC Web 站点上传。

## 5. 云端 API 与函数

云函数源码位于：

```text
apps/uni-app/uniCloud-alipay/cloudfunctions/rizhi-api
```

云函数 URL 化入口统一使用 `/rizhi-api/api/v1`，健康检查为：

```text
POST /health
```

请求体使用项目自定义 transport 包装：

```json
{
  "__rizhiTransport": true,
  "method": "GET",
  "token": "",
  "payload": {}
}
```

云函数部署和数据库 Schema 更新通过 HBuilderX/uniCloud 控制台完成，不要把 `apps/web/dist` 上传到云函数目录。

## 6. 发布后检查

- 确认线上根目录返回的是 PC Web 的 `index.html`。
- 页面资源不应出现来自 uni-app H5 的 `uni.*.css`。
- 检查登录、数据初始化、资产列表、记账和管理员页面。
- 如果替换了同名静态资源，刷新 CDN 缓存并使用 Ctrl+F5 验证。
