/**
 * 用户模型
 * 处理用户相关的数据库操作
 * 
 * @module models/User
 * @author AI Assistant
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * 用户模型类
 */
class User {
    /**
     * 根据ID查找用户
     * @param {number} id - 用户ID
     * @returns {Promise<Object|null>} 用户对象或null
     */
    static async findById(id) {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const rows = await db.query(sql, [id]);
        return rows[0] || null;
    }

    /**
     * 根据手机号查找用户
     * @param {string} phone - 手机号
     * @returns {Promise<Object|null>} 用户对象或null
     */
    static async findByPhone(phone) {
        const sql = 'SELECT * FROM users WHERE phone = ?';
        const rows = await db.query(sql, [phone]);
        return rows[0] || null;
    }

    /**
     * 根据微信OpenID查找用户
     * @param {string} openid - 微信OpenID
     * @returns {Promise<Object|null>} 用户对象或null
     */
    static async findByWechatOpenid(openid) {
        const sql = 'SELECT * FROM users WHERE wechat_openid = ?';
        const rows = await db.query(sql, [openid]);
        return rows[0] || null;
    }

    /**
     * 创建用户
     * @param {Object} userData - 用户数据
     * @returns {Promise<Object>} 创建结果
     */
    static async create(userData) {
        const {
            wechat_openid,
            wechat_unionid,
            phone,
            nickname,
            avatar,
            platform = 'miniapp',
            notify_type = 'sms'
        } = userData;

        const sql = `
            INSERT INTO users (wechat_openid, wechat_unionid, phone, nickname, avatar, platform, notify_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            wechat_openid,
            wechat_unionid,
            phone,
            nickname,
            avatar,
            platform,
            notify_type
        ]);

        return {
            id: result.insertId,
            ...userData
        };
    }

    /**
     * 更新用户信息
     * @param {number} id - 用户ID
     * @param {Object} userData - 更新数据
     * @returns {Promise<boolean>} 更新是否成功
     */
    static async update(id, userData) {
        const allowedFields = ['phone', 'nickname', 'avatar', 'platform', 'notify_type', 'wechat_openid', 'wechat_unionid', 'status'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (userData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(userData[field]);
            }
        }

        if (updates.length === 0) return false;

        values.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        const result = await db.query(sql, values);

        return result.affectedRows > 0;
    }

    /**
     * 获取用户列表（后台用）
     * @param {Object} options - 查询选项
     * @returns {Promise<Object>} { list, total }
     */
    static async getList(options = {}) {
        const {
            page = 1,
            pageSize = 10,
            phone,
            platform,
            status,
            keyword
        } = options;

        let whereClauses = [];
        let params = [];

        if (phone) {
            whereClauses.push('phone LIKE ?');
            params.push(`%${phone}%`);
        }
        if (platform) {
            whereClauses.push('platform = ?');
            params.push(platform);
        }
        if (status !== undefined && status !== '' && status !== null) {
            whereClauses.push('status = ?');
            params.push(parseInt(status));
        }
        if (keyword) {
            whereClauses.push('(nickname LIKE ? OR phone LIKE ?)');
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 获取总数
        const countSQL = `SELECT COUNT(*) as total FROM users ${whereSQL}`;
        const [countResult] = await db.query(countSQL, params);
        const total = countResult.total;

        // 获取列表
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 10;
        const offset = (pageNum - 1) * pageSizeNum;
        const listSQL = `
            SELECT id, wechat_openid, phone, nickname, avatar, platform, notify_type, status, created_at
            FROM users ${whereSQL}
            ORDER BY created_at DESC
            LIMIT ${pageSizeNum} OFFSET ${offset}
        `;
        const list = await db.query(listSQL, params);

        return { list, total };
    }

    /**
     * 获取用户统计信息
     * @returns {Promise<Object>} 统计信息
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN platform = 'miniapp' THEN 1 ELSE 0 END) as miniapp_count,
                SUM(CASE WHEN platform = 'app' THEN 1 ELSE 0 END) as app_count,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_new
            FROM users WHERE status = 1
        `;
        const rows = await db.query(sql);
        return rows[0];
    }
}

module.exports = User;
