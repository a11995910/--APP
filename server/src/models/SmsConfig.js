/**
 * 短信配置模型
 * 处理短信平台配置相关的数据库操作
 * 
 * @module models/SmsConfig
 * @author AI Assistant
 */

const db = require('../config/database');

/**
 * 短信配置模型类
 */
class SmsConfig {
    /**
     * 获取当前启用的短信配置
     * @returns {Promise<Object|null>} 短信配置
     */
    static async getActiveConfig() {
        const sql = 'SELECT * FROM sms_config WHERE status = 1 LIMIT 1';
        const rows = await db.query(sql);
        return rows[0] || null;
    }

    /**
     * 根据ID查找配置
     * @param {number} id - 配置ID
     * @returns {Promise<Object|null>} 配置对象
     */
    static async findById(id) {
        const sql = 'SELECT * FROM sms_config WHERE id = ?';
        const rows = await db.query(sql, [id]);
        return rows[0] || null;
    }

    /**
     * 创建短信配置
     * @param {Object} configData - 配置数据
     * @returns {Promise<Object>} 创建结果
     */
    static async create(configData) {
        const {
            platform,
            access_key,
            access_secret,
            sign_name,
            template_code,
            balance = 0
        } = configData;

        const sql = `
            INSERT INTO sms_config (platform, access_key, access_secret, sign_name, template_code, balance)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            platform,
            access_key,
            access_secret,
            sign_name,
            template_code,
            balance
        ]);

        return {
            id: result.insertId,
            ...configData
        };
    }

    /**
     * 更新配置
     * @param {number} id - 配置ID
     * @param {Object} configData - 更新数据
     * @returns {Promise<boolean>} 更新是否成功
     */
    static async update(id, configData) {
        const allowedFields = ['platform', 'access_key', 'access_secret', 'sign_name', 'template_code', 'balance', 'status'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (configData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(configData[field]);
            }
        }

        if (updates.length === 0) return false;

        values.push(id);
        const sql = `UPDATE sms_config SET ${updates.join(', ')} WHERE id = ?`;
        const result = await db.query(sql, values);

        return result.affectedRows > 0;
    }

    /**
     * 更新余额
     * @param {number} id - 配置ID
     * @param {number} balance - 新余额
     * @returns {Promise<boolean>} 更新是否成功
     */
    static async updateBalance(id, balance) {
        const sql = 'UPDATE sms_config SET balance = ? WHERE id = ?';
        const result = await db.query(sql, [balance, id]);
        return result.affectedRows > 0;
    }

    /**
     * 扣减余额
     * @param {number} id - 配置ID
     * @param {number} count - 扣减数量
     * @returns {Promise<boolean>} 更新是否成功
     */
    static async deductBalance(id, count = 1) {
        const sql = 'UPDATE sms_config SET balance = balance - ? WHERE id = ? AND balance >= ?';
        const result = await db.query(sql, [count, id, count]);
        return result.affectedRows > 0;
    }

    /**
     * 获取配置列表
     * @returns {Promise<Array>} 配置列表
     */
    static async getList() {
        const sql = `
            SELECT id, platform, sign_name, template_code, balance, status, created_at
            FROM sms_config
            ORDER BY created_at DESC
        `;
        return await db.query(sql);
    }

    /**
     * 删除配置
     * @param {number} id - 配置ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    static async delete(id) {
        const sql = 'DELETE FROM sms_config WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }
}

module.exports = SmsConfig;
