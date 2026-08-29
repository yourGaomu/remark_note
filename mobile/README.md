# ezBookkeeping Mobile

独立的 React Native + Expo 移动端客户端。它通过 HTTP API 与 ezBookkeeping 后端通信，不直接访问后端数据库、文件系统或对象存储。

## 启动

```powershell
Copy-Item .env.example .env.local
# 修改 .env.local 中的 EXPO_PUBLIC_EZBK_API_URL
npm install
npm start
```

示例：

```text
EXPO_PUBLIC_EZBK_API_URL=https://bookkeeping.example.com/api
```

Android 模拟器访问本机开发服务时，使用 `http://10.0.2.2:18082/api`；真机需要使用电脑局域网 IP 或 HTTPS 域名。

## Android 打包

登录 Expo 后，在 `mobile` 目录执行：

```powershell
npx eas build --platform android --profile preview
```

`preview` 会生成可直接安装的 APK；正式发布使用 `production` 配置。API 地址需要在构建前通过 EAS 环境变量或项目环境文件注入，不能把密钥写入代码。

## OTA 更新

OTA 只能更新 JavaScript、样式和资源，不能替换应用图标、原生模块或 Android 原生配置。首次启用 OTA 或修改图标后，需要先重新构建并安装 APK：

```powershell
npx eas build --platform android --profile preview
```

之后发布界面和业务代码更新：

```powershell
npx eas update --channel preview --environment preview --message "更新移动端界面"
npx eas update --channel production --environment production --message "发布移动端更新"
```

预览包只接收 `preview` channel，正式包只接收 `production` channel。发布前请在 EAS 项目中分别配置 `EXPO_PUBLIC_EZBK_API_URL` 环境变量。移动端设置页也提供手动检查更新入口。

## 目录

```text
src/
├── application/ 启动和导航
├── config/    环境配置
├── core/      HTTP、认证、存储、领域类型
├── features/  按业务隔离的页面和组件
└── shared/    主题、通用组件和工具
```

## 通信约定

- 登录：`POST /api/authorize.json`
- 刷新 Token：`POST /api/v1/tokens/refresh.json`
- 账户：`GET /api/v1/accounts/list.json`
- 交易：`GET /api/v1/transactions/list.json`、`POST /api/v1/transactions/add.json`
- 统计：`GET /api/v1/transactions/statistics.json`

Token 存储在 `expo-secure-store`。请求遇到 401 时，客户端只自动刷新一次并重试原请求；刷新失败则清理登录态并回到登录页。

## 当前范围

移动端当前覆盖登录、财务概览、交易列表、新增交易、统计、账户和设置页面。第二阶段第一批已接入普通账户新增、隐藏/删除，以及收入、支出、转账分类的新增、子分类新增、隐藏和删除。账户复杂编辑、图标选择、数据导出和两步验证仍通过 Web 端使用。

应用图标使用 `assets/icon.png`。图标属于 Android 原生资源，修改后必须重新构建 APK，不能通过 OTA 替换。
