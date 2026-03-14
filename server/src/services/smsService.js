/**
 * 短信发送服务
 * 集成阿里云短信服务
 * 
 * @module services/smsService
 * @author AI Assistant
 * 
 * @description
 * 本服务封装阿里云短信发送功能
 * 实际使用时需要安装 @alicloud/dysmsapi20170525 依赖
 * 
 * @example
 * const smsService = require('./services/smsService');
 * await smsService.sendReminder('13800138000', { loanName: '房贷', amount: '5000', days: '3' });
 */

const axios = require('axios');
const crypto = require('crypto');
const SmsConfig = require('../models/SmsConfig');
const logger = require('../utils/logger');

/**
 * 短信服务类
 */
class SmsService {
    constructor() {
        this.config = null;
    }

    /**
     * 初始化配置
     */
    async initConfig() {
        this.config = await SmsConfig.getActiveConfig();
        if (!this.config) {
            logger.warn('短信服务未配置');
        }
        return this.config;
    }

    /**
     * 发送短信
     * @param {string} phone - 手机号
     * @param {string} templateCode - 模板代码
     * @param {Object} templateParams - 模板参数
     * @returns {Promise<Object>} 发送结果
     * 
     * @example
     * await smsService.sendSms('13800138000', 'SMS_123456', { code: '1234' });
     */
    async sendSms(phone, templateCode, templateParams = {}) {
        if (!this.config) {
            await this.initConfig();
        }

        if (!this.config) {
            throw new Error('短信服务未配置');
        }

        try {
            // 这里使用模拟发送，实际项目需要替换为真实的阿里云SDK调用
            // 安装: npm install @alicloud/dysmsapi20170525
            /*
            const Dysmsapi20170525 = require('@alicloud/dysmsapi20170525');
            const client = new Dysmsapi20170525.default({
                accessKeyId: this.config.access_key,
                accessKeySecret: this.config.access_secret,
                endpoint: 'dysmsapi.aliyuncs.com'
            });
            
            const result = await client.sendSms({
                phoneNumbers: phone,
                signName: this.config.sign_name,
                templateCode: templateCode,
                templateParam: JSON.stringify(templateParams)
            });
            */

            // 模拟发送结果
            logger.info('发送短信', {
                phone,
                templateCode,
                templateParams,
                signName: this.config.sign_name
            });

            // 扣减余额
            await SmsConfig.deductBalance(this.config.id, 1);

            return {
                success: true,
                requestId: `SMS_${Date.now()}`,
                message: '发送成功'
            };
        } catch (error) {
            logger.error('短信发送失败', { phone, error: error.message });
            throw error;
        }
    }

    /**
     * 发送还款提醒短信
     * @param {string} phone - 手机号
     * @param {Object} params - 提醒参数
     * @param {string} params.loanName - 贷款名称
     * @param {string} params.amount - 还款金额
     * @param {string} params.days - 剩余天数
     * @returns {Promise<Object>} 发送结果
     */
    async sendReminder(phone, params) {
        const { loanName, amount, days } = params;

        if (!this.config) {
            await this.initConfig();
        }

        return this.sendSms(phone, this.config?.template_code || 'SMS_REMINDER', {
            loanName,
            amount,
            days
        });
    }

    /**
     * 批量发送短信
     * @param {Array} tasks - 发送任务列表
     * @returns {Promise<Object>} 批量发送结果
     */
    async batchSend(tasks) {
        const results = {
            success: 0,
            failed: 0,
            details: []
        };

        for (const task of tasks) {
            try {
                await this.sendSms(task.phone, task.templateCode, task.params);
                results.success++;
                results.details.push({ phone: task.phone, success: true });
            } catch (error) {
                results.failed++;
                results.details.push({
                    phone: task.phone,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 检查余额
     * @returns {Promise<number>} 剩余短信条数
     */
    async checkBalance() {
        if (!this.config) {
            await this.initConfig();
        }
        return this.config?.balance || 0;
    }
}

module.exports = new SmsService();
