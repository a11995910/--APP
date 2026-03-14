# 贷款提醒后台管理系统

后台管理端基于 Vue 3 + Vite + Element Plus，实现用户、贷款、Banner、通知和短信平台配置的集中管理。

## 技术栈

- Vue 3
- Vite
- Element Plus
- Vue Router
- Pinia
- Axios

## 已实现功能

- 管理员登录
- 仪表盘数据概览
- 用户管理（查询、启用/禁用、详情查看）
- 贷款管理（列表与统计）
- Banner 管理（增删改查、上下架、图片上传）
- 通知记录管理（列表与统计）
- 短信配置管理（增删改查、统计）

## 目录结构

```text
admin/
├── src/
│   ├── api/            # 接口封装
│   ├── layouts/        # 布局组件
│   ├── router/         # 路由配置与守卫
│   ├── stores/         # Pinia 状态管理
│   └── views/          # 页面视图
├── index.html
├── package.json
└── vite.config.js
```

## 启动方式

```bash
cd admin
npm install
npm run dev
```

默认访问地址：`http://localhost:5173`

## 环境变量

通过 `VITE_API_BASE_URL` 指定后端接口地址。

示例：

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

如果未配置，默认使用：`http://localhost:3000/api/v1`

## 登录信息

- 默认管理员账号：`admin`
- 默认管理员密码：`admin123`

## 开发备注

- 路由守卫在未登录状态下会自动跳转登录页。
- 请求层统一处理 401/403/500 等错误。
- Banner 上传接口依赖后端 `/api/v1/upload/image`。
