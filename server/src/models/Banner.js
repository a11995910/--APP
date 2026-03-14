/**
 * Banner模型
 * 处理Banner广告相关的数据库操作
 * 
 * @module models/Banner
 * @author AI Assistant
 */

const db = require('../config/database');

/**
 * Banner模型类
 */
class Banner {
    /**
     * 根据ID查找Banner
     * @param {number} id - Banner ID
     * @returns {Promise<Object|null>} Banner对象或null
     */
    static async findById(id) {
        const sql = 'SELECT * FROM banners WHERE id = ?';
        const rows = await db.query(sql, [id]);
        return rows[0] || null;
    }

    /**
     * 获取启用的Banner列表（前端用）
     * @returns {Promise<Array>} Banner列表
     */
    static async getActiveBanners() {
        const sql = `
            SELECT id, title, image_url, link_url 
            FROM banners 
            WHERE status = 1 
            ORDER BY sort_order ASC, created_at DESC
        `;
        return await db.query(sql);
    }

    /**
     * 创建Banner
     * @param {Object} bannerData - Banner数据
     * @returns {Promise<Object>} 创建结果
     */
    static async create(bannerData) {
        const { title, image_url, link_url, sort_order = 0, status = 1 } = bannerData;

        const sql = `
            INSERT INTO banners (title, image_url, link_url, sort_order, status)
            VALUES (?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [title, image_url, link_url, sort_order, status]);

        return {
            id: result.insertId,
            ...bannerData
        };
    }

    /**
     * 更新Banner
     * @param {number} id - Banner ID
     * @param {Object} bannerData - 更新数据
     * @returns {Promise<boolean>} 更新是否成功
     */
    static async update(id, bannerData) {
        const allowedFields = ['title', 'image_url', 'link_url', 'sort_order', 'status'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (bannerData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(bannerData[field]);
            }
        }

        if (updates.length === 0) return false;

        values.push(id);
        const sql = `UPDATE banners SET ${updates.join(', ')} WHERE id = ?`;
        const result = await db.query(sql, values);

        return result.affectedRows > 0;
    }

    /**
     * 删除Banner
     * @param {number} id - Banner ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    static async delete(id) {
        const sql = 'DELETE FROM banners WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    /**
     * 获取Banner列表（后台用）
     * @param {Object} options - 查询选项
     * @returns {Promise<Object>} { list, total }
     */
    static async getList(options = {}) {
        const { page = 1, pageSize = 10, status } = options;

        let whereClauses = [];
        let params = [];

        if (status !== undefined && status !== '' && status !== null) {
            whereClauses.push('status = ?');
            params.push(parseInt(status));
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 获取总数
        const countSQL = `SELECT COUNT(*) as total FROM banners ${whereSQL}`;
        const [countResult] = await db.query(countSQL, params);
        const total = countResult.total;

        // 获取列表
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 10;
        const offset = (pageNum - 1) * pageSizeNum;
        const listSQL = `
            SELECT * FROM banners ${whereSQL}
            ORDER BY sort_order ASC, created_at DESC
            LIMIT ${pageSizeNum} OFFSET ${offset}
        `;
        const list = await db.query(listSQL, params);

        return { list, total };
    }
}

module.exports = Banner;
