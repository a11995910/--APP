/**
 * 用户推送设备模型
 * 负责记录 APP 端推送客户端标识，并维护“当前活跃设备”状态。
 *
 * @module models/UserPushDevice
 */

const db = require('../config/database');

/**
 * 用户推送设备模型类
 */
class UserPushDevice {
    /**
     * 标记当前进程是否已完成表结构检查。
     * @type {boolean}
     */
    static tableReady = false;

    /**
     * 确保推送设备表存在。
     * 兼容老库：首次访问时自动补表，无需手工迁移。
     *
     * @returns {Promise<void>} 检查完成。
     */
    static async ensureTable() {
        if (this.tableReady) return;

        const sql = `
            CREATE TABLE IF NOT EXISTS user_push_devices (
                id INT PRIMARY KEY AUTO_INCREMENT COMMENT '设备记录ID',
                user_id INT NOT NULL COMMENT '用户ID',
                push_client_id VARCHAR(128) NOT NULL COMMENT '推送客户端ID',
                push_channel VARCHAR(32) NOT NULL DEFAULT 'unipush' COMMENT '推送通道标识',
                device_brand VARCHAR(50) COMMENT '设备品牌',
                device_model VARCHAR(80) COMMENT '设备型号',
                os_name VARCHAR(20) COMMENT '系统名称',
                os_version VARCHAR(30) COMMENT '系统版本',
                app_version VARCHAR(20) COMMENT '应用版本',
                status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-停用 1-启用',
                last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最近登录时间',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                UNIQUE KEY uk_push_client_id (push_client_id),
                INDEX idx_user_status (user_id, status),
                CONSTRAINT fk_user_push_devices_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户推送设备表';
        `;

        await db.query(sql);
        this.tableReady = true;
    }

    /**
     * 查找用户当前活跃推送设备。
     *
     * @param {number} userId - 用户ID
     * @returns {Promise<Object|null>} 当前活跃设备
     */
    static async findActiveByUserId(userId) {
        await this.ensureTable();

        const sql = `
            SELECT *
            FROM user_push_devices
            WHERE user_id = ? AND status = 1
            ORDER BY last_login_at DESC, id DESC
            LIMIT 1
        `;
        const rows = await db.query(sql, [userId]);
        return rows[0] || null;
    }

    /**
     * 获取用户所有活跃推送设备。
     *
     * @param {number} userId - 用户ID
     * @returns {Promise<Array>} 活跃设备列表
     */
    static async findActiveListByUserId(userId) {
        await this.ensureTable();

        const sql = `
            SELECT *
            FROM user_push_devices
            WHERE user_id = ? AND status = 1
            ORDER BY last_login_at DESC, id DESC
        `;
        return db.query(sql, [userId]);
    }

    /**
     * 将某个客户端标识上报为当前用户的最新活跃设备。
     * 规则：
     * 1. 当前用户旧设备全部停用；
     * 2. 当前客户端若已绑定其他账号，则直接改绑到当前账号；
     * 3. 当前客户端最终标记为活跃。
     *
     * @param {Object} deviceData - 设备数据
     * @param {number} deviceData.user_id - 用户ID
     * @param {string} deviceData.push_client_id - 推送客户端ID
     * @param {string} [deviceData.push_channel='unipush'] - 推送通道
     * @param {string} [deviceData.device_brand] - 设备品牌
     * @param {string} [deviceData.device_model] - 设备型号
     * @param {string} [deviceData.os_name] - 系统名称
     * @param {string} [deviceData.os_version] - 系统版本
     * @param {string} [deviceData.app_version] - 应用版本
     * @returns {Promise<Object|null>} 绑定后的活跃设备
     */
    static async upsertActiveDevice(deviceData) {
        await this.ensureTable();

        const {
            user_id,
            push_client_id,
            push_channel = 'unipush',
            device_brand = null,
            device_model = null,
            os_name = null,
            os_version = null,
            app_version = null
        } = deviceData;

        await db.transaction(async (connection) => {
            await connection.execute(
                'UPDATE user_push_devices SET status = 0 WHERE user_id = ? AND push_client_id <> ?',
                [user_id, push_client_id]
            );

            const sql = `
                INSERT INTO user_push_devices (
                    user_id,
                    push_client_id,
                    push_channel,
                    device_brand,
                    device_model,
                    os_name,
                    os_version,
                    app_version,
                    status,
                    last_login_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
                ON DUPLICATE KEY UPDATE
                    user_id = VALUES(user_id),
                    push_channel = VALUES(push_channel),
                    device_brand = VALUES(device_brand),
                    device_model = VALUES(device_model),
                    os_name = VALUES(os_name),
                    os_version = VALUES(os_version),
                    app_version = VALUES(app_version),
                    status = 1,
                    last_login_at = NOW()
            `;

            await connection.execute(sql, [
                user_id,
                push_client_id,
                push_channel,
                device_brand,
                device_model,
                os_name,
                os_version,
                app_version
            ]);
        });

        return this.findActiveByUserId(user_id);
    }
}

module.exports = UserPushDevice;
