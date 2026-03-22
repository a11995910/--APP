/**
 * 贷款控制器
 * 提供贷款 CRUD、还款计划明细、移动端展示聚合数据。
 *
 * @module controllers/loanController
 */

const { body, param } = require('express-validator');
const Loan = require('../models/Loan');
const response = require('../utils/response');
const { handleValidation } = require('../middlewares/validator');
const {
    REPAYMENT_METHODS,
    normalizeRepaymentMethod,
    getRepaymentMethodLabel,
    calcMonthlyRate,
    calculateRepaymentSchedule,
    getCurrentPeriodIndex,
    formatReminderTime,
    round2
} = require('../services/repaymentService');

/**
 * 还款方式允许值。
 */
const REPAYMENT_METHOD_VALUES = Object.values(REPAYMENT_METHODS);

/**
 * 创建贷款验证规则
 */
const createValidation = [
    body('loan_name').notEmpty().withMessage('贷款名称不能为空')
        .isLength({ max: 100 }).withMessage('贷款名称最多100个字符'),
    body('principal').isFloat({ min: 1 }).withMessage('贷款总额必须大于0'),
    body('annual_rate').isFloat({ min: 0, max: 100 }).withMessage('贷款年利率必须在0-100之间'),
    body('term_months').isInt({ min: 1, max: 360 }).withMessage('贷款期限必须在1-360个月之间'),
    body('repayment_method').isIn(REPAYMENT_METHOD_VALUES).withMessage('还款方式不正确'),
    body('first_payment').optional().isString(),
    body('first_payment_year').optional().isInt({ min: 2000, max: 2100 }).withMessage('首期支付年份不正确'),
    body('first_payment_month').optional().isInt({ min: 1, max: 12 }).withMessage('首期支付月份不正确'),
    body('remind_enabled').optional().custom((value) => [0, 1, '0', '1', true, false].includes(value)).withMessage('提醒开关值不正确'),
    body('remind_day').optional().isInt({ min: 1, max: 31 }).withMessage('提醒日期必须在1-31之间'),
    body('remind_hour').optional().isInt({ min: 0, max: 23 }).withMessage('提醒小时必须在0-23之间'),
    body('remind_minute').optional().isInt({ min: 0, max: 59 }).withMessage('提醒分钟必须在0-59之间'),
    body().custom((payload) => {
        const hasFirstPaymentString = typeof payload.first_payment === 'string' && payload.first_payment.trim();
        const hasYearMonth = payload.first_payment_year !== undefined && payload.first_payment_month !== undefined;
        if (!hasFirstPaymentString && !hasYearMonth) {
            throw new Error('请选择首期支付日期');
        }
        return true;
    }),
    handleValidation
];

/**
 * 更新贷款验证规则
 */
const updateValidation = [
    param('id').isInt().withMessage('贷款ID不正确'),
    body('loan_name').optional().isLength({ max: 100 }).withMessage('贷款名称最多100个字符'),
    body('principal').optional().isFloat({ min: 1 }).withMessage('贷款总额必须大于0'),
    body('annual_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('贷款年利率必须在0-100之间'),
    body('term_months').optional().isInt({ min: 1, max: 360 }).withMessage('贷款期限必须在1-360个月之间'),
    body('repayment_method').optional().isIn(REPAYMENT_METHOD_VALUES).withMessage('还款方式不正确'),
    body('first_payment').optional().isString(),
    body('first_payment_year').optional().isInt({ min: 2000, max: 2100 }).withMessage('首期支付年份不正确'),
    body('first_payment_month').optional().isInt({ min: 1, max: 12 }).withMessage('首期支付月份不正确'),
    body('remind_enabled').optional().custom((value) => [0, 1, '0', '1', true, false].includes(value)).withMessage('提醒开关值不正确'),
    body('remind_day').optional().isInt({ min: 1, max: 31 }).withMessage('提醒日期必须在1-31之间'),
    body('remind_hour').optional().isInt({ min: 0, max: 23 }).withMessage('提醒小时必须在0-23之间'),
    body('remind_minute').optional().isInt({ min: 0, max: 59 }).withMessage('提醒分钟必须在0-59之间'),
    handleValidation
];

/**
 * 将输入值转换为 0/1。
 *
 * @param {any} value - 输入值
 * @param {number} fallback - 默认值
 * @returns {number} 0 或 1
 */
function normalizeBooleanToNumber(value, fallback = 1) {
    if (value === undefined || value === null || value === '') return fallback;
    if (value === true || value === '1' || value === 1) return 1;
    if (value === false || value === '0' || value === 0) return 0;
    return fallback;
}

/**
 * 解析首期支付日期（支持 YYYY/M、YYYY-MM、YYYY-MM-DD）。
 *
 * @param {Object} payload - 请求参数
 * @param {number} fallbackYear - 默认年份
 * @param {number} fallbackMonth - 默认月份
 * @returns {{year:number, month:number}} 年月对象
 */
function parseFirstPayment(payload, fallbackYear, fallbackMonth) {
    if (payload.first_payment_year !== undefined && payload.first_payment_month !== undefined) {
        return {
            year: parseInt(payload.first_payment_year),
            month: parseInt(payload.first_payment_month)
        };
    }

    if (typeof payload.first_payment === 'string' && payload.first_payment.trim()) {
        const raw = payload.first_payment.trim();
        const match = raw.match(/^(\d{4})[/-](\d{1,2})(?:[/-](\d{1,2}))?$/);
        if (match) {
            return {
                year: parseInt(match[1]),
                month: parseInt(match[2])
            };
        }

        const parsedDate = new Date(raw);
        if (!Number.isNaN(parsedDate.getTime())) {
            return {
                year: parsedDate.getFullYear(),
                month: parsedDate.getMonth() + 1
            };
        }
    }

    return {
        year: fallbackYear,
        month: fallbackMonth
    };
}

/**
 * 生成贷款持久化载荷，并计算计划相关金额。
 *
 * @param {Object} input - 请求输入
 * @param {Object|null} existingLoan - 旧贷款（更新场景）
 * @returns {{payload:Object, scheduleResult:Object}} 可持久化数据与计划结果
 */
function buildLoanPayload(input, existingLoan = null) {
    const now = new Date();

    const loanName = input.loan_name !== undefined ? input.loan_name : existingLoan?.loan_name;
    const principal = Number(input.principal !== undefined ? input.principal : existingLoan?.principal || 0);
    const annualRate = Number(input.annual_rate !== undefined ? input.annual_rate : existingLoan?.annual_rate || 0);
    const termMonths = parseInt(input.term_months !== undefined ? input.term_months : existingLoan?.term_months || 12);
    const repaymentMethod = normalizeRepaymentMethod(input.repayment_method || existingLoan?.repayment_method);

    const fallbackYear = existingLoan?.first_payment_year || now.getFullYear();
    const fallbackMonth = existingLoan?.first_payment_month || (now.getMonth() + 1);
    const firstPayment = parseFirstPayment(input, fallbackYear, fallbackMonth);

    const remindEnabled = normalizeBooleanToNumber(input.remind_enabled, existingLoan?.remind_enabled ?? 1);
    const remindDay = parseInt(input.remind_day !== undefined ? input.remind_day : (existingLoan?.remind_day || existingLoan?.payment_day || 1));
    const remindHour = parseInt(input.remind_hour !== undefined ? input.remind_hour : (existingLoan?.remind_hour ?? 12));
    const remindMinute = parseInt(input.remind_minute !== undefined ? input.remind_minute : (existingLoan?.remind_minute ?? 0));

    const scheduleResult = calculateRepaymentSchedule({
        principal,
        annualRate,
        termMonths,
        repaymentMethod,
        firstPaymentYear: firstPayment.year,
        firstPaymentMonth: firstPayment.month
    });

    const firstItem = scheduleResult.schedule[0];
    const lastItem = scheduleResult.schedule[scheduleResult.schedule.length - 1];

    const startDate = `${firstPayment.year}-${String(firstPayment.month).padStart(2, '0')}-01`;
    const endDate = `${lastItem.year}-${String(lastItem.month).padStart(2, '0')}-01`;

    const payload = {
        loan_name: loanName,
        principal: round2(principal),
        monthly_payment: firstItem ? firstItem.payment : 0,
        payment_day: remindDay,
        start_date: startDate,
        end_date: endDate,
        remind_days: parseInt(input.remind_days !== undefined ? input.remind_days : (existingLoan?.remind_days || 3)),
        annual_rate: round2(annualRate),
        term_months: termMonths,
        repayment_method: repaymentMethod,
        first_payment_year: firstPayment.year,
        first_payment_month: firstPayment.month,
        remind_enabled: remindEnabled,
        remind_day: remindDay,
        remind_hour: remindHour,
        remind_minute: remindMinute
    };

    if (input.status !== undefined) {
        payload.status = parseInt(input.status);
    }

    return { payload, scheduleResult };
}

/**
 * 计算并格式化贷款页面展示数据。
 *
 * @param {Object} loan - 原始贷款对象
 * @param {Object} options - 控制项
 * @param {boolean} options.includeSchedule - 是否返回完整计划
 * @returns {Object} 格式化后的贷款数据
 */
function formatLoanViewData(loan, options = {}) {
    const { includeSchedule = false } = options;

    const scheduleResult = calculateRepaymentSchedule({
        principal: Number(loan.principal || 0),
        annualRate: Number(loan.annual_rate || 0),
        termMonths: parseInt(loan.term_months || 12),
        repaymentMethod: loan.repayment_method,
        firstPaymentYear: parseInt(loan.first_payment_year),
        firstPaymentMonth: parseInt(loan.first_payment_month)
    });

    const currentPeriodIndex = getCurrentPeriodIndex(
        parseInt(loan.first_payment_year),
        parseInt(loan.first_payment_month),
        parseInt(loan.term_months || 12),
        new Date()
    );

    const currentSchedule = currentPeriodIndex > 0
        ? scheduleResult.schedule[currentPeriodIndex - 1]
        : scheduleResult.schedule[0];

    const firstPaymentText = `${loan.first_payment_year}/${loan.first_payment_month}`;

    const base = {
        ...loan,
        annual_rate: Number(loan.annual_rate || 0),
        monthly_rate: round2(calcMonthlyRate(loan.annual_rate || 0) * 100),
        term_months: parseInt(loan.term_months || 12),
        repayment_method: normalizeRepaymentMethod(loan.repayment_method),
        repayment_method_label: getRepaymentMethodLabel(loan.repayment_method),
        first_payment: firstPaymentText,
        remind_time_text: loan.remind_enabled ? formatReminderTime(loan.remind_day, loan.remind_hour, loan.remind_minute) : '已关闭',
        current_period_index: currentPeriodIndex,
        current_payment_amount: round2(currentSchedule?.payment || 0),
        remaining_amount: currentPeriodIndex > 0 ? round2(currentSchedule?.balance || 0) : round2(loan.principal || 0),
        total_interest: round2(scheduleResult.totalInterest),
        total_payment: round2(scheduleResult.totalPayment)
    };

    if (!includeSchedule) {
        return base;
    }

    return {
        ...base,
        schedule: scheduleResult.schedule.map((item) => ({
            ...item,
            is_current: currentPeriodIndex > 0 && item.period === currentPeriodIndex
        }))
    };
}

/**
 * 获取用户贷款列表
 */
async function getMyLoans(req, res, next) {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        const loans = await Loan.findByUserId(userId, {
            status: (status !== undefined && status !== '') ? parseInt(status) : undefined
        });

        const formatted = loans.map((loan) => formatLoanViewData(loan));
        res.json(response.success(formatted));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取单个贷款详情
 */
async function getLoanDetail(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const loan = await Loan.findById(id);

        if (!loan) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        if (loan.user_id !== userId) {
            return res.status(403).json(response.errors.FORBIDDEN);
        }

        res.json(response.success(formatLoanViewData(loan), '获取成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取贷款还款明细
 */
async function getLoanSchedule(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const loan = await Loan.findById(id);

        if (!loan) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        if (loan.user_id !== userId) {
            return res.status(403).json(response.errors.FORBIDDEN);
        }

        const formatted = formatLoanViewData(loan, { includeSchedule: true });

        res.json(response.success({
            summary: {
                loanName: formatted.loan_name,
                principal: round2(formatted.principal),
                totalInterest: formatted.total_interest,
                repaymentMethod: formatted.repayment_method,
                repaymentMethodLabel: formatted.repayment_method_label,
                annualRate: formatted.annual_rate,
                monthlyRate: formatted.monthly_rate,
                firstPayment: formatted.first_payment,
                currentPaymentAmount: formatted.current_payment_amount,
                remainingAmount: formatted.remaining_amount
            },
            schedule: formatted.schedule
        }, '获取成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 创建贷款
 */
async function createLoan(req, res, next) {
    try {
        const userId = req.user.id;
        const { payload } = buildLoanPayload(req.body, null);

        const loan = await Loan.create({
            user_id: userId,
            ...payload
        });

        res.status(201).json(response.success(formatLoanViewData(loan), '贷款添加成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 更新贷款
 */
async function updateLoan(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existingLoan = await Loan.findById(id);
        if (!existingLoan) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }
        if (existingLoan.user_id !== userId) {
            return res.status(403).json(response.errors.FORBIDDEN);
        }

        const { payload } = buildLoanPayload(req.body, existingLoan);
        const updated = await Loan.update(id, payload);

        if (!updated) {
            return res.status(400).json(response.error('更新失败'));
        }

        const updatedLoan = await Loan.findById(id);
        res.json(response.success(formatLoanViewData(updatedLoan), '贷款更新成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 删除贷款
 */
async function deleteLoan(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const loan = await Loan.findById(id);
        if (!loan) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }
        if (loan.user_id !== userId) {
            return res.status(403).json(response.errors.FORBIDDEN);
        }

        await Loan.delete(id);
        res.json(response.success(null, '贷款删除成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 标记贷款已结清
 */
async function markAsCompleted(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const loan = await Loan.findById(id);
        if (!loan) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }
        if (loan.user_id !== userId) {
            return res.status(403).json(response.errors.FORBIDDEN);
        }

        await Loan.update(id, { status: 0 });
        res.json(response.success(null, '已标记为已结清'));
    } catch (error) {
        next(error);
    }
}

// ==================== 后台管理接口 ====================

/**
 * 获取贷款列表（后台）
 */
async function getLoanList(req, res, next) {
    try {
        const { page = 1, pageSize = 10, userId, status, keyword, sortBy = 'created_at' } = req.query;

        const result = await Loan.getList({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            userId: (userId && userId !== '') ? parseInt(userId) : undefined,
            status: (status !== undefined && status !== '') ? parseInt(status) : undefined,
            keyword,
            sortBy
        });

        res.json(response.paginate(result.list, result.total, page, pageSize));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取贷款统计（后台）
 */
async function getLoanStats(req, res, next) {
    try {
        const stats = await Loan.getStats();
        res.json(response.success(stats));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取贷款详情（后台）
 */
async function getAdminLoanDetail(req, res, next) {
    try {
        const { id } = req.params;
        const loan = await Loan.findById(id);

        if (!loan) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        res.json(response.success(loan));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createValidation,
    updateValidation,
    getMyLoans,
    getLoanDetail,
    getLoanSchedule,
    createLoan,
    updateLoan,
    deleteLoan,
    markAsCompleted,
    getLoanList,
    getLoanStats,
    getAdminLoanDetail
};
