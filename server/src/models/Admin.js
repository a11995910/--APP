/**
 * 管理员模型
 * 处理管理员相关的数据库操作
 * 
 * @module models/Admin
 * @author AI Assistant
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * 管理员模型类
 */
class Admin {
    /**
     * 根据ID查找管理员
     * @param {number} id - 管理员ID
     * @returns {Promise<Object|null>} 管理员对象或null
     */
    static async findById(id) {
        const sql = 'SELECT id, username, name, role, status, last_login, created_at FROM admins WHERE id = ?';
        const rows = await db.query(sql, [id]);
        return rows[0] || null;
    }

    /**
     * 根据用户名查找管理员
     * @param {string} username - 用户名
     * @returns {Promise<Object|null>} 管理员对象或null（包含密码）
     */
    static async findByUsername(username) {
        const sql = 'SELECT * FROM admins WHERE username = ?';
        const rows = await db.query(sql, [username]);
        return rows[0] || null;
    }

    /**
     * 创建管理员
     * @param {Object} adminData - 管理员数据
     * @returns {Promise<Object>} 创建结果
     */
    static async create(adminData) {
        const { username, password, name, role = 'operator' } = adminData;

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO admins (username, password, name, role)
            VALUES (?, ?, ?, ?)
        `;

        const result = await db.query(sql, [username, hashedPassword, name, role]);

        return {
            id: result.insertId,
            username,
            name,
            role
        };
    }

    /**
     * 验证密码
     * @param {string} plainPassword - 明文密码
     * @param {string} hashedPassword - 加密密码
     * @returns {Promise<boolean>} 是否匹配
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * 更新管理员信息
     * @param {number} id - 管理员ID
     * @param {Object} adminData - 更新数据
     * @returns {Promise<boolean>} 更新是否成功
     */
    static async update(id, adminData) {
        const allowedFields = ['name', 'role', 'status'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (adminData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(adminData[field]);
            }
        }

        // 如果更新密码，需要加密
        if (adminData.password) {
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
        }

        if (updates.length === 0) return false;

        values.push(id);
        const sql = `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`;
        const result = await db.query(sql, values);

        return result.affectedRows > 0;
    }

    /**
     * 更新最后登录时间
     * @param {number} id - 管理员ID
     * @returns {Promise<boolean>} 更新是否成功
     */
    static async updateLastLogin(id) {
        const sql = 'UPDATE admins SET last_login = NOW() WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    /**
     * 获取管理员列表
     * @param {Object} options - 查询选项
     * @returns {Promise<Object>} { list, total }
     */
    static async getList(options = {}) {
        const { page = 1, pageSize = 10, role, status } = options;

        let whereClauses = [];
        let params = [];

        if (role) {
            whereClauses.push('role = ?');
            params.push(role);
        }
        if (status !== undefined && status !== '' && status !== null) {
            whereClauses.push('status = ?');
            params.push(parseInt(status));
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 获取总数
        const countSQL = `SELECT COUNT(*) as total FROM admins ${whereSQL}`;
        const [countResult] = await db.query(countSQL, params);
        const total = countResult.total;

        // 获取列表
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 10;
        const offset = (pageNum - 1) * pageSizeNum;
        const listSQL = `
            SELECT id, username, name, role, status, last_login, created_at
            FROM admins ${whereSQL}
            ORDER BY created_at DESC
            LIMIT ${pageSizeNum} OFFSET ${offset}
        `;
        const list = await db.query(listSQL, params);

        return { list, total };
    }

    /**
     * 删除管理员
     * @param {number} id - 管理员ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    static async delete(id) {
        const sql = 'DELETE FROM admins WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Admin;
