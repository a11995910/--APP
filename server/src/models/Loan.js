/**
 * 贷款模型
 * 处理贷款主表与扩展配置表的数据库操作。
 *
 * @module models/Loan
 */

const db = require('../config/database');
const LoanPlanConfig = require('./LoanPlanConfig');
const {
    normalizeRepaymentMethod,
    calcTermMonthsByRange
} = require('../services/repaymentService');

/**
 * 对连接层 SQL 参数执行 undefined -> null 转换。
 *
 * @param {Array<any>} params - 原始参数
 * @returns {Array<any>} 标准化后的参数
 */
function sanitizeParams(params = []) {
    return params.map((item) => (item === undefined ? null : item));
}

/**
 * 贷款模型类
 */
class Loan {
    /**
     * 统一标准化贷款行，补齐扩展配置默认值。
     *
     * @param {Object|null} row - 原始数据库行
     * @returns {Object|null} 标准化后的贷款对象
     */
    static normalizeLoanRow(row) {
        if (!row) return null;

        const now = new Date();
        const startDate = row.start_date ? new Date(row.start_date) : null;

        const fallbackYear = startDate && !Number.isNaN(startDate.getTime())
            ? startDate.getFullYear()
            : now.getFullYear();
        const fallbackMonth = startDate && !Number.isNaN(startDate.getTime())
            ? startDate.getMonth() + 1
            : now.getMonth() + 1;

        const termMonths = row.term_months || calcTermMonthsByRange(row.start_date, row.end_date);

        return {
            ...row,
            annual_rate: Number(row.annual_rate ?? 0),
            term_months: parseInt(termMonths || 12),
            repayment_method: normalizeRepaymentMethod(row.repayment_method),
            first_payment_year: parseInt(row.first_payment_year || fallbackYear),
            first_payment_month: parseInt(row.first_payment_month || fallbackMonth),
            remind_enabled: row.remind_enabled === undefined || row.remind_enabled === null ? 1 : parseInt(row.remind_enabled),
            remind_day: parseInt(row.remind_day || row.payment_day || 1),
            remind_hour: parseInt(row.remind_hour ?? 12),
            remind_minute: parseInt(row.remind_minute ?? 0)
        };
    }

    /**
     * 根据ID查找贷款（含扩展配置）
     * @param {number} id - 贷款ID
     * @returns {Promise<Object|null>} 贷款对象或null
     */
    static async findById(id) {
        await LoanPlanConfig.ensureTable();

        const sql = `
            SELECT
                l.*,
                c.annual_rate,
                c.term_months,
                c.repayment_method,
                c.first_payment_year,
                c.first_payment_month,
                c.remind_enabled,
                c.remind_day,
                c.remind_hour,
                c.remind_minute
            FROM loans l
            LEFT JOIN loan_plan_configs c ON l.id = c.loan_id
            WHERE l.id = ?
        `;

        const rows = await db.query(sql, [id]);
        return this.normalizeLoanRow(rows[0] || null);
    }

    /**
     * 获取用户贷款列表（含扩展配置）
     * @param {number} userId - 用户ID
     * @param {Object} options - 查询选项
     * @returns {Promise<Array>} 贷款列表
     */
    static async findByUserId(userId, options = {}) {
        await LoanPlanConfig.ensureTable();

        const { status } = options;
        let sql = `
            SELECT
                l.*,
                c.annual_rate,
                c.term_months,
                c.repayment_method,
                c.first_payment_year,
                c.first_payment_month,
                c.remind_enabled,
                c.remind_day,
                c.remind_hour,
                c.remind_minute
            FROM loans l
            LEFT JOIN loan_plan_configs c ON l.id = c.loan_id
            WHERE l.user_id = ?
        `;
        const params = [userId];

        if (status !== undefined) {
            sql += ' AND l.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY l.created_at DESC';

        const rows = await db.query(sql, params);
        return rows.map((item) => this.normalizeLoanRow(item));
    }

    /**
     * 创建贷款及扩展配置
     * @param {Object} loanData - 贷款数据
     * @returns {Promise<Object>} 创建后的贷款对象
     */
    static async create(loanData) {
        await LoanPlanConfig.ensureTable();

        const {
            user_id,
            loan_name,
            principal,
            monthly_payment,
            payment_day,
            start_date,
            end_date,
            remind_days = 3,
            annual_rate = 0,
            term_months,
            repayment_method,
            first_payment_year,
            first_payment_month,
            remind_enabled = 1,
            remind_day,
            remind_hour = 12,
            remind_minute = 0
        } = loanData;

        const resolvedTerm = parseInt(term_months || calcTermMonthsByRange(start_date, end_date));
        const startDateObj = new Date(start_date);
        const resolvedFirstYear = parseInt(first_payment_year || startDateObj.getFullYear());
        const resolvedFirstMonth = parseInt(first_payment_month || (startDateObj.getMonth() + 1));
        const resolvedMethod = normalizeRepaymentMethod(repayment_method);

        const loanSql = `
            INSERT INTO loans (
                user_id,
                loan_name,
                principal,
                monthly_payment,
                payment_day,
                start_date,
                end_date,
                remind_days
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const configSql = `
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

        const loanId = await db.transaction(async (connection) => {
            const [loanResult] = await connection.execute(loanSql, sanitizeParams([
                user_id,
                loan_name,
                principal,
                monthly_payment,
                payment_day,
                start_date,
                end_date,
                remind_days
            ]));

            await connection.execute(configSql, sanitizeParams([
                loanResult.insertId,
                annual_rate,
                resolvedTerm,
                resolvedMethod,
                resolvedFirstYear,
                resolvedFirstMonth,
                remind_enabled,
                remind_day || payment_day,
                remind_hour,
                remind_minute
            ]));

            return loanResult.insertId;
        });

        return await this.findById(loanId);
    }

    /**
     * 更新贷款信息及扩展配置
     * @param {number} id - 贷款ID
     * @param {Object} loanData - 更新数据
     * @returns {Promise<boolean>} 是否更新成功
     */
    static async update(id, loanData) {
        await LoanPlanConfig.ensureTable();

        const currentLoan = await this.findById(id);
        if (!currentLoan) return false;

        const allowedBaseFields = [
            'loan_name',
            'principal',
            'monthly_payment',
            'payment_day',
            'start_date',
            'end_date',
            'remind_days',
            'status'
        ];

        const baseUpdates = [];
        const baseValues = [];

        for (const field of allowedBaseFields) {
            if (loanData[field] !== undefined) {
                baseUpdates.push(`${field} = ?`);
                baseValues.push(loanData[field]);
            }
        }

        const nextTermMonths = parseInt(
            loanData.term_months
            || currentLoan.term_months
            || calcTermMonthsByRange(loanData.start_date || currentLoan.start_date, loanData.end_date || currentLoan.end_date)
        );

        const currentStartDate = loanData.start_date || currentLoan.start_date;
        const currentStartDateObj = new Date(currentStartDate);
        const nextFirstYear = parseInt(loanData.first_payment_year || currentLoan.first_payment_year || currentStartDateObj.getFullYear());
        const nextFirstMonth = parseInt(loanData.first_payment_month || currentLoan.first_payment_month || (currentStartDateObj.getMonth() + 1));
        const nextRepaymentMethod = normalizeRepaymentMethod(loanData.repayment_method || currentLoan.repayment_method);

        const upsertConfigSql = `
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
            ON DUPLICATE KEY UPDATE
                annual_rate = VALUES(annual_rate),
                term_months = VALUES(term_months),
                repayment_method = VALUES(repayment_method),
                first_payment_year = VALUES(first_payment_year),
                first_payment_month = VALUES(first_payment_month),
                remind_enabled = VALUES(remind_enabled),
                remind_day = VALUES(remind_day),
                remind_hour = VALUES(remind_hour),
                remind_minute = VALUES(remind_minute)
        `;

        const affectedRows = await db.transaction(async (connection) => {
            let changedRows = 0;

            if (baseUpdates.length > 0) {
                const baseSql = `UPDATE loans SET ${baseUpdates.join(', ')} WHERE id = ?`;
                const [baseResult] = await connection.execute(baseSql, sanitizeParams([...baseValues, id]));
                changedRows += baseResult.affectedRows;
            }

            const [configResult] = await connection.execute(upsertConfigSql, sanitizeParams([
                id,
                loanData.annual_rate !== undefined ? loanData.annual_rate : currentLoan.annual_rate,
                nextTermMonths,
                nextRepaymentMethod,
                nextFirstYear,
                nextFirstMonth,
                loanData.remind_enabled !== undefined ? loanData.remind_enabled : currentLoan.remind_enabled,
                loanData.remind_day !== undefined ? loanData.remind_day : (loanData.payment_day || currentLoan.remind_day || currentLoan.payment_day),
                loanData.remind_hour !== undefined ? loanData.remind_hour : currentLoan.remind_hour,
                loanData.remind_minute !== undefined ? loanData.remind_minute : currentLoan.remind_minute
            ]));

            changedRows += configResult.affectedRows;
            return changedRows;
        });

        return affectedRows > 0;
    }

    /**
     * 删除贷款
     * @param {number} id - 贷款ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    static async delete(id) {
        const sql = 'DELETE FROM loans WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    /**
     * 获取用户本月待还总额
     * @param {number} userId - 用户ID
     * @returns {Promise<number>} 本月待还总额
     */
    static async getMonthlyRepaymentAmount(userId) {
        const sql = `
            SELECT COALESCE(SUM(monthly_payment), 0) as total
            FROM loans
            WHERE user_id = ? AND status = 1
        `;
        const rows = await db.query(sql, [userId]);
        return rows[0]?.total || 0;
    }

    /**
     * 获取最近待还贷款信息
     * @param {number} userId - 用户ID
     * @returns {Promise<Object|null>} 最近待还贷款信息
     */
    static async getNextRepayment(userId) {
        await LoanPlanConfig.ensureTable();

        const today = new Date();
        const currentDay = today.getDate();

        const sql = `
            SELECT
                l.*,
                c.remind_day,
                CASE
                    WHEN COALESCE(c.remind_day, l.payment_day) >= ? THEN COALESCE(c.remind_day, l.payment_day) - ?
                    ELSE DAY(LAST_DAY(CURDATE())) - ? + COALESCE(c.remind_day, l.payment_day)
                END as days_remaining
            FROM loans l
            LEFT JOIN loan_plan_configs c ON l.id = c.loan_id
            WHERE l.user_id = ? AND l.status = 1
            ORDER BY days_remaining ASC
            LIMIT 1
        `;

        const rows = await db.query(sql, [currentDay, currentDay, currentDay, userId]);
        return rows[0] || null;
    }

    /**
     * 获取需要提醒的贷款列表
     * @returns {Promise<Array>} 需要提醒的贷款列表
     */
    static async getLoansNeedRemind() {
        await LoanPlanConfig.ensureTable();

        const sql = `
            SELECT
                l.*,
                u.phone,
                u.notify_type,
                u.platform,
                c.remind_enabled,
                c.remind_day,
                c.remind_hour,
                c.remind_minute
            FROM loans l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN loan_plan_configs c ON l.id = c.loan_id
            WHERE l.status = 1
                AND u.status = 1
                AND COALESCE(c.remind_enabled, 1) = 1
                AND (
                    (
                        COALESCE(c.remind_day, l.payment_day) - DAY(CURDATE()) > 0
                        AND COALESCE(c.remind_day, l.payment_day) - DAY(CURDATE()) <= l.remind_days
                    )
                    OR
                    (
                        COALESCE(c.remind_day, l.payment_day) <= DAY(CURDATE())
                        AND DAY(LAST_DAY(CURDATE())) - DAY(CURDATE()) + COALESCE(c.remind_day, l.payment_day) <= l.remind_days
                    )
                )
        `;
        return await db.query(sql);
    }

    /**
     * 获取贷款列表（后台）
     * @param {Object} options - 查询选项
     * @returns {Promise<Object>} { list, total }
     */
    static async getList(options = {}) {
        await LoanPlanConfig.ensureTable();

        const {
            page = 1,
            pageSize = 10,
            userId,
            status,
            keyword,
            sortBy = 'created_at'
        } = options;

        const whereClauses = [];
        const params = [];

        if (userId) {
            whereClauses.push('l.user_id = ?');
            params.push(userId);
        }
        if (status !== undefined && status !== '' && status !== null) {
            whereClauses.push('l.status = ?');
            params.push(parseInt(status));
        }
        if (keyword) {
            whereClauses.push('(l.loan_name LIKE ? OR u.phone LIKE ?)');
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countSQL = `
            SELECT COUNT(*) as total
            FROM loans l
            LEFT JOIN users u ON l.user_id = u.id
            ${whereSQL}
        `;
        const [countResult] = await db.query(countSQL, params);
        const total = countResult.total;

        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 10;
        const offset = (pageNum - 1) * pageSizeNum;
        const normalizedSortBy = sortBy === 'end_date' ? 'end_date' : 'created_at';

        /**
         * 后台贷款列表排序规则。
         * 1. 默认按创建时间倒序，便于查看最新录入内容。
         * 2. 到期时间排序按结束日期升序，逾期记录会自然排在最前面。
         */
        const orderBySql = normalizedSortBy === 'end_date'
            ? 'ORDER BY l.end_date ASC, l.created_at DESC'
            : 'ORDER BY l.created_at DESC';

        const listSQL = `
            SELECT
                l.*,
                u.phone,
                u.nickname,
                u.notify_type,
                c.annual_rate,
                c.term_months,
                c.repayment_method
            FROM loans l
            LEFT JOIN users u ON l.user_id = u.id
            LEFT JOIN loan_plan_configs c ON l.id = c.loan_id
            ${whereSQL}
            ${orderBySql}
            LIMIT ${pageSizeNum} OFFSET ${offset}
        `;

        const list = await db.query(listSQL, params);
        return { list, total };
    }

    /**
     * 获取贷款统计信息
     * @returns {Promise<Object>} 统计信息
     */
    static async getStats() {
        const sql = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as completed_count,
                COALESCE(SUM(principal), 0) as total_principal,
                COALESCE(SUM(CASE WHEN status = 1 THEN monthly_payment ELSE 0 END), 0) as monthly_repayment
            FROM loans
        `;
        const rows = await db.query(sql);
        return rows[0];
    }
}

module.exports = Loan;
