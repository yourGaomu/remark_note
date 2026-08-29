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

移动端当前覆盖登录、财务概览、交易列表、新增交易、统计、账户和设置页面。账户、分类管理、导出等复杂编辑能力仍通过 Web 端使用，移动端页面会明确提示尚未接入，避免产生无效点击。
