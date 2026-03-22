# 贷款提醒移动端

基于 uni-app 开发的金融贷款提醒移动端应用，支持微信小程序和 APP。

## 技术栈

- uni-app
- Vue 3
- Pinia

## 功能

- 首页还款动态展示
- 贷款管理（增删改查）
- 用户登录/注册
- 个人中心（通知渠道自动展示：小程序=短信，APP=推送）
- APP 推送设备自动采集与绑定
- APP 推送点击后按业务 payload 跳转页面

## 开发

```bash
# 安装依赖
npm install

# H5开发预览
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# APP开发
npm run dev:app
```

## 构建

```bash
# 构建微信小程序
npm run build:mp-weixin

# 构建APP
npm run build:app

# 构建H5
npm run build:h5
```

## 当前构建状态

- `2026-03-14`
- 已将 `uni-app` Vue3 相关依赖升级到 `5.03` 对应版本：
  - `@dcloudio/uni-app`
  - `@dcloudio/uni-app-plus`
  - `@dcloudio/uni-components`
  - `@dcloudio/uni-h5`
  - `@dcloudio/uni-mp-weixin`
  - `@dcloudio/uni-automator`
  - `@dcloudio/uni-cli-shared`
  - `@dcloudio/uni-stacktracey`
  - `@dcloudio/vite-plugin-uni`
  - `@dcloudio/types`
- 当前已验证：
  - `npm run build:app` 成功
  - `npm run build:mp-weixin` 后续可继续使用
  - `HBuilderX CLI` 可导出 `appResource`
- 若要生成安卓可安装包，仍需在 `HBuilderX` 图形界面中执行：
  - `发行 -> 原生App-云打包 -> Android -> APK`
- 当前测试阶段已将应用名称调整为 `贷款提醒测试版`，用于重新获取测试 AppID 并规避原应用名的云打包资质校验

## 目录结构

```
mobile/
├── api/              # API接口
├── pages/            # 页面
│   ├── index/        # 首页
│   ├── loan/         # 贷款管理
│   ├── mine/         # 我的
│   └── login/        # 登录
├── stores/           # 状态管理
├── utils/            # 工具函数
├── static/           # 静态资源
├── App.vue           # 根组件
├── main.js           # 入口文件
├── manifest.json     # 应用配置
└── pages.json        # 页面配置
```

## 注意事项

1. 开发前请确保后端服务已启动
2. 当前移动端默认接口地址由 `/Users/wangjun/Documents/GitHub/金融APP/mobile/utils/siteinfo.js` 统一管理，默认环境为 `production`
3. 如需切换环境，可执行：
   - 切换生产环境：`uni.setStorageSync('site_env', 'production')`
   - 切换开发环境：`uni.setStorageSync('site_env', 'development')`
4. 如需临时直接覆盖接口地址，仍可通过 `uni.setStorageSync('api_base_url', 'http://IP:3000/api/v1')` 覆盖
5. 微信小程序需要在 `manifest.json` 中配置正确的 appid
6. 若启用小程序 openid 静默登录，后端 `.env` 需配置 `WECHAT_MINIAPP_APP_ID` 与 `WECHAT_MINIAPP_APP_SECRET`
7. 若启用 APP 真正推送，需在云打包/HBuilderX 中配置可用的推送服务，并保证服务端与客户端使用同一推送通道
