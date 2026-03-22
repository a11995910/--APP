/**
 * 应用入口文件
 * 
 * @module app
 * @author AI Assistant
 * @description 金融贷款提醒应用后端服务入口
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { registerRoutes } = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const db = require('./config/database');
const logger = require('./utils/logger');
const notifyService = require('./services/notifyService');

// 创建Express应用
const app = express();

/**
 * 允许访问后端接口的来源列表。
 * 说明：
 * 1. 正式域名用于后台管理端与未来 H5 场景。
 * 2. `127.0.0.1 / localhost` 用于微信开发者工具、浏览器本地调试与内嵌 WebView 调试。
 * 3. 无 `origin` 的请求通常来自小程序原生网络层、服务端探活或命令行请求，也应放行。
 * @type {string[]}
 */
const ALLOWED_CORS_ORIGINS = [
    'https://www.youkeduo.site',
    'http://www.youkeduo.site',
    'https://youkeduo.site',
    'http://youkeduo.site',
    'http://127.0.0.1',
    'https://127.0.0.1',
    'http://localhost',
    'https://localhost'
];

/**
 * 校验当前来源是否允许访问。
 * @param {string | undefined} origin 请求来源。
 * @returns {boolean} 是否允许跨域访问。
 */
function isAllowedCorsOrigin(origin) {
    if (!origin) {
        return true;
    }

    return ALLOWED_CORS_ORIGINS.some((allowedOrigin) => origin.startsWith(allowedOrigin));
}

// ==================== 中间件配置 ====================

// CORS跨域配置
app.use(cors({
    origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 请求日志
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.url !== '/health') {
            logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

// ==================== 路由注册 ====================
registerRoutes(app);

// ==================== 错误处理 ====================
app.use(notFoundHandler);
app.use(errorHandler);

// ==================== 服务启动 ====================
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // 测试数据库连接
        await db.testConnection();

        // 启动HTTP服务
        app.listen(PORT, () => {
            logger.info(`🚀 服务器已启动: http://localhost:${PORT}`);
            logger.info(`📌 环境: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`📌 API前缀: /api/v1`);

            // 启动通知调度服务
            if (process.env.NODE_ENV !== 'test') {
                notifyService.start();
            }
        });
    } catch (error) {
        logger.error('服务器启动失败', { error: error.message });
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGTERM', () => {
    logger.info('收到SIGTERM信号，开始优雅关闭...');
    notifyService.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('收到SIGINT信号，开始优雅关闭...');
    notifyService.stop();
    process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝', { reason });
});

// 启动服务器
startServer();

module.exports = app;
