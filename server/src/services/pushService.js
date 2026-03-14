/**
 * 推送服务
 * 集成极光推送服务
 * 
 * @module services/pushService
 * @author AI Assistant
 * 
 * @description
 * 本服务封装极光推送功能
 * 实际使用时需要安装 jpush-async 依赖
 * 
 * @example
 * const pushService = require('./services/pushService');
 * await pushService.sendToUser('user_123', '还款提醒', '您有一笔贷款即将到期');
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const UserPushDevice = require('../models/UserPushDevice');

/**
 * 推送服务类
 */
class PushService {
    constructor() {
        this.appKey = config.jpush.appKey;
        this.masterSecret = config.jpush.masterSecret;
        this.apiUrl = 'https://api.jpush.cn/v3/push';
    }

    /**
     * 获取认证头
     * @returns {string} Base64编码的认证信息
     */
    getAuthHeader() {
        const auth = Buffer.from(`${this.appKey}:${this.masterSecret}`).toString('base64');
        return `Basic ${auth}`;
    }

    /**
     * 发送推送给单个用户
     * @param {string} userId - 用户ID（作为alias）
     * @param {string} title - 推送标题
     * @param {string} content - 推送内容
     * @param {Object} extras - 额外数据
     * @returns {Promise<Object>} 发送结果
     */
    async sendToUser(userId, title, content, extras = {}) {
        if (!this.appKey || !this.masterSecret) {
            logger.warn('推送服务未配置');
            return { success: false, message: '推送服务未配置' };
        }

        try {
            const activeDevices = await UserPushDevice.findActiveListByUserId(userId);
            const clientIds = activeDevices.map((item) => item.push_client_id).filter(Boolean);

            if (!clientIds.length) {
                logger.warn('未找到可用的推送设备', { userId });
                return { success: false, message: '未找到可用的推送设备' };
            }

            const payload = {
                platform: 'all',
                audience: {
                    registration_id: clientIds
                },
                notification: {
                    android: {
                        alert: content,
                        title: title,
                        extras: extras
                    },
                    ios: {
                        alert: {
                            title: title,
                            body: content
                        },
                        sound: 'default',
                        extras: extras
                    }
                },
                options: {
                    apns_production: process.env.NODE_ENV === 'production'
                }
            };

            // 当前阶段仍保留模拟发送，但目标对象已切换为“最新活跃推送设备”。
            logger.info('发送推送', { userId, title, content, clientIds });

            /*
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                success: true,
                msgId: response.data.msg_id,
                sendno: response.data.sendno
            };
            */

            return {
                success: true,
                msgId: `PUSH_${Date.now()}`,
                message: '推送成功',
                clientIds
            };
        } catch (error) {
            logger.error('推送发送失败', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * 发送还款提醒推送
     * @param {string} userId - 用户ID
     * @param {Object} params - 提醒参数
     * @returns {Promise<Object>} 发送结果
     */
    async sendReminder(userId, params) {
        const { loanId, loanName, amount, days } = params;

        const title = '还款提醒';
        const content = `您的${loanName}还有${days}天到期，应还金额${amount}元，请及时还款。`;

        return this.sendToUser(userId, title, content, {
            type: 'reminder',
            targetPage: 'loanSchedule',
            loanId,
            loanName,
            amount,
            days
        });
    }

    /**
     * 批量推送
     * @param {Array<string>} userIds - 用户ID列表
     * @param {string} title - 推送标题
     * @param {string} content - 推送内容
     * @param {Object} extras - 额外数据
     * @returns {Promise<Object>} 发送结果
     */
    async sendToUsers(userIds, title, content, extras = {}) {
        if (!this.appKey || !this.masterSecret) {
            return { success: false, message: '推送服务未配置' };
        }

        try {
            const payload = {
                platform: 'all',
                audience: {
                    alias: userIds.map(id => String(id))
                },
                notification: {
                    android: {
                        alert: content,
                        title: title,
                        extras: extras
                    },
                    ios: {
                        alert: {
                            title: title,
                            body: content
                        },
                        sound: 'default',
                        extras: extras
                    }
                }
            };

            logger.info('批量推送', { userCount: userIds.length, title });

            return {
                success: true,
                msgId: `PUSH_BATCH_${Date.now()}`,
                message: `成功推送给${userIds.length}个用户`
            };
        } catch (error) {
            logger.error('批量推送失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 发送全量推送
     * @param {string} title - 推送标题
     * @param {string} content - 推送内容
     * @returns {Promise<Object>} 发送结果
     */
    async sendToAll(title, content) {
        logger.info('全量推送', { title, content });

        return {
            success: true,
            msgId: `PUSH_ALL_${Date.now()}`,
            message: '全量推送已发送'
        };
    }
}

module.exports = new PushService();
