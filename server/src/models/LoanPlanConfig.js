/**
 * 贷款扩展配置模型
 * 存储还款方式、利率、首期支付、提醒时间等业务字段。
 *
 * @module models/LoanPlanConfig
 */

const db = require('../config/database');

/**
 * 贷款扩展配置模型类
 */
class LoanPlanConfig {
    /**
     * 标识当前进程是否已完成表结构检查。
     * @type {boolean}
     */
    static tableReady = false;

    /**
     * 确保扩展配置表存在。
     * 兼容历史库：首次访问自动创建，不要求手工迁移。
     */
    static async ensureTable() {
        if (this.tableReady) return;

        const sql = `
            CREATE TABLE IF NOT EXISTS loan_plan_configs (
                loan_id INT PRIMARY KEY COMMENT '贷款ID',
                annual_rate DECIMAL(6, 2) NOT NULL DEFAULT 0 COMMENT '年利率(%)',
                term_months INT NOT NULL DEFAULT 12 COMMENT '贷款期限(月)',
                repayment_method ENUM('equal_installment', 'equal_principal', 'interest_first') NOT NULL DEFAULT 'equal_installment' COMMENT '还款方式',
                first_payment_year INT NOT NULL COMMENT '首期支付年份',
                first_payment_month INT NOT NULL COMMENT '首期支付月份',
                remind_enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否提醒：0-关闭 1-开启',
                remind_day INT NOT NULL DEFAULT 1 COMMENT '每月提醒日(1-31)',
                remind_hour INT NOT NULL DEFAULT 12 COMMENT '提醒小时(0-23)',
                remind_minute INT NOT NULL DEFAULT 0 COMMENT '提醒分钟(0-59)',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                CONSTRAINT fk_loan_plan_configs_loan_id FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='贷款扩展配置表';
        `;

        await db.query(sql);
        this.tableReady = true;
    }

    /**
     * 根据贷款ID查询扩展配置。
     * @param {number} loanId - 贷款ID
     * @returns {Promise<Object|null>} 配置对象
     */
    static async findByLoanId(loanId) {
        await this.ensureTable();
        const rows = await db.query('SELECT * FROM loan_plan_configs WHERE loan_id = ?', [loanId]);
        return rows[0] || null;
    }

    /**
     * 根据贷款ID批量查询配置。
     * @param {Array<number>} loanIds - 贷款ID数组
     * @returns {Promise<Map<number, Object>>} 配置映射
     */
    static async findMapByLoanIds(loanIds = []) {
        await this.ensureTable();

        if (!loanIds.length) {
            return new Map();
        }

        const placeholders = loanIds.map(() => '?').join(', ');
        const rows = await db.query(
            `SELECT * FROM loan_plan_configs WHERE loan_id IN (${placeholders})`,
            loanIds
        );

        const map = new Map();
        rows.forEach((row) => map.set(row.loan_id, row));
        return map;
    }

    /**
     * 创建贷款扩展配置。
     * @param {Object} configData - 配置数据
     * @returns {Promise<boolean>} 是否成功
     */
    static async create(configData) {
        await this.ensureTable();

        const {
            loan_id,
            annual_rate = 0,
            term_months = 12,
            repayment_method = 'equal_installment',
            first_payment_year,
            first_payment_month,
            remind_enabled = 1,
            remind_day = 1,
            remind_hour = 12,
            remind_minute = 0
        } = configData;

        const sql = `
            INSERT INTO loan_plan_configs (
                loan_id,
                annual_rate,
                term_months,
                repayment_method,
                first_payment_year,
                first_payment_month,
                remind_enabled,
                remind_day,
                remind_hour,
                remind_minute
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            loan_id,
            annual_rate,
            term_months,
            repayment_method,
            first_payment_year,
            first_payment_month,
            remind_enabled,
            remind_day,
            remind_hour,
            remind_minute
        ]);

        return result.affectedRows > 0;
    }

    /**
     * 更新贷款扩展配置。
     * @param {number} loanId - 贷款ID
     * @param {Object} configData - 更新数据
     * @returns {Promise<boolean>} 是否成功
     */
    static async update(loanId, configData) {
        await this.ensureTable();

        const allowedFields = [
            'annual_rate',
            'term_months',
            'repayment_method',
            'first_payment_year',
            'first_payment_month',
            'remind_enabled',
            'remind_day',
            'remind_hour',
            'remind_minute'
        ];

        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (configData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(configData[field]);
            }
        }

        if (!updates.length) return false;

        values.push(loanId);
        const sql = `UPDATE loan_plan_configs SET ${updates.join(', ')} WHERE loan_id = ?`;
        const result = await db.query(sql, values);
        return result.affectedRows > 0;
    }

    /**
     * 贷款删除时，手动删除扩展配置。
     * 该方法用于无外键或兜底场景。
     *
     * @param {number} loanId - 贷款ID
     * @returns {Promise<boolean>} 是否成功
     */
    static async deleteByLoanId(loanId) {
        await this.ensureTable();
        const result = await db.query('DELETE FROM loan_plan_configs WHERE loan_id = ?', [loanId]);
        return result.affectedRows > 0;
    }
}

module.exports = LoanPlanConfig;
