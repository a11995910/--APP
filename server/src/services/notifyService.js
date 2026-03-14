/**
 * 通知调度服务
 * 定时检查并发送还款提醒
 * 
 * @module services/notifyService
 * @author AI Assistant
 * 
 * @description
 * 本服务负责：
 * 1. 定时检查需要提醒的贷款
 * 2. 根据用户设置发送短信或推送
 * 3. 记录通知发送结果
 */

const cron = require('node-cron');
const Loan = require('../models/Loan');
const Notification = require('../models/Notification');
const smsService = require('./smsService');
const pushService = require('./pushService');
const logger = require('../utils/logger');
const { formatMoney, daysBetween, getNextPaymentDate } = require('../utils/helpers');

/**
 * 通知调度服务类
 */
class NotifyService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
    }

    /**
     * 启动定时任务
     * 每天早上9点执行还款提醒检查
     */
    start() {
        if (this.cronJob) {
            logger.warn('通知调度服务已在运行');
            return;
        }

        // 每天早上9点执行
        this.cronJob = cron.schedule('0 9 * * *', async () => {
            await this.checkAndSendReminders();
        }, {
            timezone: 'Asia/Shanghai'
        });

        logger.info('通知调度服务已启动，每天9:00执行还款提醒');
    }

    /**
     * 停止定时任务
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            logger.info('通知调度服务已停止');
        }
    }

    /**
     * 检查并发送还款提醒
     */
    async checkAndSendReminders() {
        if (this.isRunning) {
            logger.warn('上一次提醒任务尚未完成');
            return;
        }

        this.isRunning = true;
        logger.info('开始执行还款提醒检查');

        try {
            // 获取需要提醒的贷款
            const loans = await Loan.getLoansNeedRemind();

            logger.info(`发现 ${loans.length} 笔需要提醒的贷款`);

            let successCount = 0;
            let failCount = 0;

            for (const loan of loans) {
                try {
                    await this.sendReminder(loan);
                    successCount++;
                } catch (error) {
                    failCount++;
                    logger.error('发送提醒失败', {
                        loanId: loan.id,
                        userId: loan.user_id,
                        error: error.message
                    });
                }
            }

            logger.info('还款提醒执行完成', { successCount, failCount });
        } catch (error) {
            logger.error('还款提醒检查失败', { error: error.message });
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 发送单条还款提醒
     * @param {Object} loan - 贷款信息（包含用户信息）
     */
    async sendReminder(loan) {
        const today = new Date();
        const currentDay = today.getDate();
        const effectiveNotifyType = loan.platform === 'app' ? 'push' : 'sms';

        // 计算剩余天数
        let daysRemaining;
        if (loan.payment_day >= currentDay) {
            daysRemaining = loan.payment_day - currentDay;
        } else {
            // 下个月的还款日
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            daysRemaining = lastDayOfMonth - currentDay + loan.payment_day;
        }

        const params = {
            loanId: loan.id,
            loanName: loan.loan_name,
            amount: formatMoney(loan.monthly_payment),
            days: String(daysRemaining)
        };

        // 创建通知记录
        const notification = await Notification.create({
            user_id: loan.user_id,
            loan_id: loan.id,
            notify_type: effectiveNotifyType,
            content: `您的${params.loanName}还有${params.days}天到期，应还金额${params.amount}元`,
            status: 'pending'
        });

        try {
            let result;

            // 根据通知类型发送
            if (effectiveNotifyType === 'push') {
                result = await pushService.sendReminder(loan.user_id, params);
            } else {
                result = await smsService.sendReminder(loan.phone, params);
            }

            // 更新通知状态
            await Notification.updateStatus(notification.id, 'sent');

            logger.info('提醒发送成功', {
                notificationId: notification.id,
                userId: loan.user_id,
                loanId: loan.id,
                type: effectiveNotifyType
            });

            return result;
        } catch (error) {
            // 更新通知状态为失败
            await Notification.updateStatus(notification.id, 'failed', error.message);
            throw error;
        }
    }

    /**
     * 手动触发提醒检查
     * 用于测试或管理员手动执行
     */
    async manualCheck() {
        logger.info('手动触发还款提醒检查');
        await this.checkAndSendReminders();
    }

    /**
     * 手动发送提醒给指定用户
     * @param {number} userId - 用户ID
     * @param {number} loanId - 贷款ID
     */
    async sendToUser(userId, loanId) {
        const loan = await Loan.findById(loanId);
        if (!loan || loan.user_id !== userId) {
            throw new Error('贷款不存在或不属于该用户');
        }

        // 获取用户信息
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('用户不存在');
        }

        // 合并贷款和用户信息
        const loanWithUser = {
            ...loan,
            phone: user.phone,
            notify_type: user.notify_type,
            platform: user.platform
        };

        return this.sendReminder(loanWithUser);
    }
}

module.exports = new NotifyService();
