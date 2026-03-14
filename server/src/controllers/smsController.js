/**
 * 短信配置控制器
 * 处理短信平台配置相关的API请求
 * 
 * @module controllers/smsController
 * @author AI Assistant
 */

const { body } = require('express-validator');
const SmsConfig = require('../models/SmsConfig');
const Notification = require('../models/Notification');
const response = require('../utils/response');
const { handleValidation } = require('../middlewares/validator');

/**
 * 创建配置验证规则
 */
const createValidation = [
    body('platform').notEmpty().withMessage('平台名称不能为空'),
    body('access_key').notEmpty().withMessage('AccessKey不能为空'),
    body('access_secret').notEmpty().withMessage('AccessSecret不能为空'),
    body('sign_name').notEmpty().withMessage('短信签名不能为空'),
    body('template_code').notEmpty().withMessage('模板Code不能为空'),
    handleValidation
];

/**
 * 获取短信配置列表
 */
async function getSmsConfigList(req, res, next) {
    try {
        const configs = await SmsConfig.getList();

        // 隐藏敏感信息
        const safeConfigs = configs.map(config => ({
            ...config,
            access_key: config.access_key ? `${config.access_key.slice(0, 4)}****` : '',
            access_secret: '******'
        }));

        res.json(response.success(safeConfigs));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取配置详情
 */
async function getSmsConfigDetail(req, res, next) {
    try {
        const { id } = req.params;
        const config = await SmsConfig.findById(id);

        if (!config) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        // 隐藏敏感信息
        res.json(response.success({
            ...config,
            access_key: config.access_key ? `${config.access_key.slice(0, 4)}****` : '',
            access_secret: '******'
        }));
    } catch (error) {
        next(error);
    }
}

/**
 * 创建短信配置
 */
async function createSmsConfig(req, res, next) {
    try {
        const {
            platform,
            access_key,
            access_secret,
            sign_name,
            template_code,
            balance = 0
        } = req.body;

        const config = await SmsConfig.create({
            platform,
            access_key,
            access_secret,
            sign_name,
            template_code,
            balance
        });

        res.status(201).json(response.success({
            id: config.id,
            platform: config.platform,
            sign_name: config.sign_name
        }, '配置创建成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 更新短信配置
 */
async function updateSmsConfig(req, res, next) {
    try {
        const { id } = req.params;

        const config = await SmsConfig.findById(id);
        if (!config) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        const {
            platform,
            access_key,
            access_secret,
            sign_name,
            template_code,
            balance,
            status
        } = req.body;

        const updateData = { platform, sign_name, template_code, balance, status };

        // 只有提供了新的密钥才更新
        if (access_key && !access_key.includes('****')) {
            updateData.access_key = access_key;
        }
        if (access_secret && access_secret !== '******') {
            updateData.access_secret = access_secret;
        }

        const updated = await SmsConfig.update(id, updateData);

        if (!updated) {
            return res.status(400).json(response.error('更新失败'));
        }

        res.json(response.success(null, '配置更新成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 删除短信配置
 */
async function deleteSmsConfig(req, res, next) {
    try {
        const { id } = req.params;

        const config = await SmsConfig.findById(id);
        if (!config) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        await SmsConfig.delete(id);
        res.json(response.success(null, '配置删除成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 更新短信余额
 */
async function updateBalance(req, res, next) {
    try {
        const { id } = req.params;
        const { balance } = req.body;

        const config = await SmsConfig.findById(id);
        if (!config) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        await SmsConfig.updateBalance(id, balance);
        res.json(response.success(null, '余额更新成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取短信发送统计
 */
async function getSmsStats(req, res, next) {
    try {
        // 获取短信配置
        const config = await SmsConfig.getActiveConfig();

        // 获取通知统计
        const notifyStats = await Notification.getStats();

        res.json(response.success({
            config: config ? {
                platform: config.platform,
                balance: config.balance,
                sign_name: config.sign_name
            } : null,
            stats: {
                totalSent: notifyStats.sms_count || 0,
                sentToday: notifyStats.today_count || 0,
                failedCount: notifyStats.failed_count || 0
            }
        }));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createValidation,
    getSmsConfigList,
    getSmsConfigDetail,
    createSmsConfig,
    updateSmsConfig,
    deleteSmsConfig,
    updateBalance,
    getSmsStats
};
