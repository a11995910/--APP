/**
 * 通知控制器
 * 处理通知相关的API请求
 * 
 * @module controllers/notificationController
 * @author AI Assistant
 */

const Notification = require('../models/Notification');
const response = require('../utils/response');

/**
 * 获取用户通知记录
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getMyNotifications(req, res, next) {
    try {
        const userId = req.user.id;
        const { page = 1, pageSize = 20 } = req.query;

        const notifications = await Notification.findByUserId(userId, {
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json(response.success(notifications));
    } catch (error) {
        next(error);
    }
}

// ==================== 后台管理接口 ====================

/**
 * 获取通知列表（后台）
 */
async function getNotificationList(req, res, next) {
    try {
        const {
            page = 1,
            pageSize = 20,
            userId,
            notifyType,
            status,
            startDate,
            endDate
        } = req.query;

        const result = await Notification.getList({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            userId: (userId && userId !== '') ? parseInt(userId) : undefined,
            notifyType,
            status,
            startDate,
            endDate
        });

        res.json(response.paginate(result.list, result.total, page, pageSize));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取通知统计（后台）
 */
async function getNotificationStats(req, res, next) {
    try {
        const stats = await Notification.getStats();
        res.json(response.success(stats));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getMyNotifications,
    getNotificationList,
    getNotificationStats
};
