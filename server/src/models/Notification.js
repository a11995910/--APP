/**
 * 通知记录模型
 * 处理通知相关的数据库操作
 * 
 * @module models/Notification
 * @author AI Assistant
 */

const db = require('../config/database');

/**
 * 通知模型类
 */
class Notification {
    /**
     * 创建通知记录
     * @param {Object} notifyData - 通知数据
     * @returns {Promise<Object>} 创建结果
     */
    static async create(notifyData) {
        const {
            user_id,
            loan_id,
            notify_type,
            content,
            send_time = null,
            status = 'pending'
        } = notifyData;

        const sql = `
            INSERT INTO notifications (user_id, loan_id, notify_type, content, send_time, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            user_id,
            loan_id,
            notify_type,
            content,
            send_time,
            status
        ]);

        return {
            id: result.insertId,
            ...notifyData
        };
    }

    /**
     * 更新通知状态
     * @param {number} id - 通知ID
     * @param {string} status - 状态
     * @param {string} failReason - 失败原因
     * @returns {Promise<boolean>} 更新是否成功
     */
    static async updateStatus(id, status, failReason = null) {
        const sql = `
            UPDATE notifications 
            SET status = ?, fail_reason = ?, send_time = CASE WHEN ? = 'sent' THEN NOW() ELSE send_time END
            WHERE id = ?
        `;
        const result = await db.query(sql, [status, failReason, status, id]);
        return result.affectedRows > 0;
    }

    /**
     * 获取用户的通知记录
     * @param {number} userId - 用户ID
     * @param {Object} options - 查询选项
     * @returns {Promise<Array>} 通知列表
     */
    static async findByUserId(userId, options = {}) {
        const { page = 1, pageSize = 20 } = options;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const offset = (pageNum - 1) * pageSizeNum;

        const sql = `
            SELECT n.*, l.loan_name
            FROM notifications n
            LEFT JOIN loans l ON n.loan_id = l.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT ${pageSizeNum} OFFSET ${offset}
        `;
        return await db.query(sql, [userId]);
    }

    /**
     * 获取通知列表（后台用）
     * @param {Object} options - 查询选项
     * @returns {Promise<Object>} { list, total }
     */
    static async getList(options = {}) {
        const {
            page = 1,
            pageSize = 20,
            userId,
            notifyType,
            status,
            startDate,
            endDate
        } = options;

        let whereClauses = [];
        let params = [];

        if (userId) {
            whereClauses.push('n.user_id = ?');
            params.push(userId);
        }
        if (notifyType) {
            whereClauses.push('n.notify_type = ?');
            params.push(notifyType);
        }
        if (status) {
            whereClauses.push('n.status = ?');
            params.push(status);
        }
        if (startDate) {
            whereClauses.push('DATE(n.created_at) >= ?');
            params.push(startDate);
        }
        if (endDate) {
            whereClauses.push('DATE(n.created_at) <= ?');
            params.push(endDate);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 获取总数
        const countSQL = `SELECT COUNT(*) as total FROM notifications n ${whereSQL}`;
        const [countResult] = await db.query(countSQL, params);
        const total = countResult.total;

        // 获取列表
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const offset = (pageNum - 1) * pageSizeNum;
        const listSQL = `
            SELECT n.*, u.phone, u.nickname, l.loan_name
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            LEFT JOIN loans l ON n.loan_id = l.id
            ${whereSQL}
            ORDER BY n.created_at DESC
            LIMIT ${pageSizeNum} OFFSET ${offset}
        `;
        const list = await db.query(listSQL, params);

        return { list, total };
    }

    /**
     * 获取通知统计信息
     * @returns {Promise<Object>} 统计信息
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN notify_type = 'sms' THEN 1 ELSE 0 END) as sms_count,
                SUM(CASE WHEN notify_type = 'push' THEN 1 ELSE 0 END) as push_count,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count
            FROM notifications
        `;
        const rows = await db.query(sql);
        return rows[0];
    }

    /**
     * 获取用户的提醒统计
     * @param {number} userId - 用户ID
     * @returns {Promise<Object>} 用户提醒统计
     */
    static async getUserStats(userId) {
        const sql = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
            FROM notifications
            WHERE user_id = ?
        `;
        const rows = await db.query(sql, [userId]);
        return rows[0];
    }
}

module.exports = Notification;
