# 金融贷款提醒应用 - 后端API服务

## 项目简介

这是金融贷款提醒应用的后端API服务，使用 Node.js + Express + MySQL 构建。

## 技术栈

- **运行环境**: Node.js >= 18
- **Web框架**: Express.js
- **数据库**: MySQL 8.0
- **认证**: JWT
- **日志**: Winston
- **定时任务**: node-cron

## 目录结构

```
server/
├── database/           # 数据库脚本
│   └── init.sql        # 初始化脚本
├── src/
│   ├── config/         # 配置文件
│   │   ├── database.js # 数据库配置
│   │   ├── jwt.js      # JWT配置
│   │   └── index.js    # 配置汇总
│   ├── controllers/    # 控制器
│   │   ├── userController.js
│   │   ├── loanController.js
│   │   ├── bannerController.js
│   │   ├── adminController.js
│   │   ├── notificationController.js
│   │   └── smsController.js
│   ├── middlewares/    # 中间件
│   │   ├── auth.js     # 认证中间件
│   │   ├── validator.js # 验证中间件
│   │   └── errorHandler.js # 错误处理
│   ├── models/         # 数据模型
│   │   ├── User.js
│   │   ├── Loan.js
│   │   ├── Banner.js
│   │   ├── Notification.js
│   │   ├── Admin.js
│   │   └── SmsConfig.js
│   ├── routes/         # 路由
│   │   ├── user.js
│   │   ├── loan.js
│   │   ├── banner.js
│   │   ├── notification.js
│   │   ├── admin.js
│   │   └── index.js
│   ├── services/       # 服务层
│   │   ├── smsService.js    # 短信服务
│   │   ├── pushService.js   # 推送服务
│   │   └── notifyService.js # 通知调度
│   ├── utils/          # 工具函数
│   │   ├── response.js # 统一响应
│   │   ├── logger.js   # 日志工具
│   │   └── helpers.js  # 通用工具
│   └── app.js          # 应用入口
├── .env                # 环境变量
├── .env.example        # 环境变量示例
├── .gitignore
├── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

主要配置项：
- `DB_*`: 数据库连接信息
- `JWT_SECRET`: JWT密钥
- `ALIYUN_*`: 阿里云短信配置（可选）
- `JPUSH_*`: 极光推送配置（可选）

### 3. 初始化数据库

```bash
# 使用MySQL客户端执行初始化脚本
mysql -u root -p < database/init.sql
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务启动后访问: http://localhost:3000

## API接口

### 公开接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /health | 健康检查 |
| POST | /api/v1/user/login | 用户登录/注册 |
| GET | /api/v1/banners | 获取Banner列表 |

### 用户接口（需认证）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/user/profile | 获取用户信息 |
| PUT | /api/v1/user/profile | 更新用户信息 |
| GET | /api/v1/user/home | 获取首页数据 |

### 贷款接口（需认证）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/loans | 获取贷款列表 |
| POST | /api/v1/loans | 添加贷款 |
| GET | /api/v1/loans/:id | 获取贷款详情 |
| PUT | /api/v1/loans/:id | 更新贷款 |
| DELETE | /api/v1/loans/:id | 删除贷款 |
| POST | /api/v1/loans/:id/complete | 标记已结清 |

### 上传接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/upload/image | 上传图片文件 |

上传接口只允许 JPG、PNG、GIF、WEBP 图片。服务端会同时校验 `Content-Type`、原始文件扩展名和真实文件头，并按校验后的图片类型重新生成存储扩展名，避免脚本文件伪装成图片落入公开 `uploads` 目录。生产 Nginx 也应拒绝访问 `/uploads/` 下的 PHP 类脚本后缀文件，作为入口层兜底。

### 后台管理接口

所有后台接口都以 `/api/v1/admin` 开头，需要管理员认证。

#### 认证
- `POST /login` - 管理员登录

#### 仪表盘
- `GET /dashboard` - 获取统计数据

#### 用户管理
- `GET /users` - 用户列表
- `GET /users/:id` - 用户详情
- `PUT /users/:id/status` - 更新用户状态

#### 贷款管理
- `GET /loans` - 贷款列表
- `GET /loans/stats` - 贷款统计

#### Banner管理
- `GET /banners` - Banner列表
- `POST /banners` - 创建Banner
- `PUT /banners/:id` - 更新Banner
- `DELETE /banners/:id` - 删除Banner

#### 短信管理
- `GET /sms/configs` - 配置列表
- `POST /sms/configs` - 创建配置
- `GET /sms/stats` - 发送统计

## 认证说明

API使用JWT进行认证，获取token后在请求头中添加：

```
Authorization: Bearer <token>
```

## 默认账号

管理员账号：`admin` / `admin123`

## 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start

# 代码检查
npm run lint

# 运行测试
npm test
```

## 注意事项

1. 生产环境请务必修改 `JWT_SECRET`
2. 短信和推送服务需要配置真实的API密钥才能使用
3. 建议使用PM2进行生产环境部署
4. 当前 CORS 已显式放行：
   - `https://www.youkeduo.site`
   - `http://127.0.0.1`
   - `http://localhost`
   这样可同时兼容线上后台域名与微信开发者工具本地调试来源
