/**
 * 路由索引
 * 统一管理所有路由
 * 
 * @module routes/index
 * @author AI Assistant
 */

const express = require('express');
const router = express.Router();

const userRoutes = require('./user');
const loanRoutes = require('./loan');
const bannerRoutes = require('./banner');
const notificationRoutes = require('./notification');
const adminRoutes = require('./admin');
const uploadRoutes = require('./upload');

// API版本前缀
const API_PREFIX = '/api/v1';

/**
 * 注册所有路由
 * @param {Object} app - Express应用实例
 */
function registerRoutes(app) {
    // 健康检查
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: Date.now() });
    });

    // 移动端API
    app.use(`${API_PREFIX}/user`, userRoutes);
    app.use(`${API_PREFIX}/loans`, loanRoutes);
    app.use(`${API_PREFIX}/banners`, bannerRoutes);
    app.use(`${API_PREFIX}/notifications`, notificationRoutes);

    // 通用API
    app.use(`${API_PREFIX}/upload`, uploadRoutes);

    // 后台管理API
    app.use(`${API_PREFIX}/admin`, adminRoutes);
}

module.exports = { registerRoutes };
