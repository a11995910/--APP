/**
 * 应用配置模块
 * 集中管理所有应用配置
 * 
 * @module config/index
 * @author AI Assistant
 */

require('dotenv').config();

module.exports = {
    // 服务器配置
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },

    // 数据库配置
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'loan_reminder'
    },

    // JWT配置
    jwt: {
        secret: process.env.JWT_SECRET || 'default_secret_key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },

    // 阿里云短信配置
    aliyunSms: {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
        signName: process.env.ALIYUN_SMS_SIGN_NAME || '',
        templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || ''
    },

    // 极光推送配置
    jpush: {
        appKey: process.env.JPUSH_APP_KEY || '',
        masterSecret: process.env.JPUSH_MASTER_SECRET || ''
    },

    // 微信小程序配置
    wechatMiniapp: {
        appId: process.env.WECHAT_MINIAPP_APP_ID || '',
        appSecret: process.env.WECHAT_MINIAPP_APP_SECRET || ''
    },

    // 文件上传配置
    upload: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        uploadPath: 'uploads/'
    },

    // 分页配置
    pagination: {
        defaultPage: 1,
        defaultPageSize: 10,
        maxPageSize: 100
    }
};
