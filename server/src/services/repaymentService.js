/**
 * 还款计划计算服务
 * 提供等额本息、等额本金、先息后本三种还款方式的计划计算。
 *
 * @module services/repaymentService
 */

/**
 * 还款方式枚举。
 */
const REPAYMENT_METHODS = {
    EQUAL_INSTALLMENT: 'equal_installment',
    EQUAL_PRINCIPAL: 'equal_principal',
    INTEREST_FIRST: 'interest_first'
};

/**
 * 还款方式展示文案。
 */
const REPAYMENT_METHOD_LABELS = {
    [REPAYMENT_METHODS.EQUAL_INSTALLMENT]: '等额本息',
    [REPAYMENT_METHODS.EQUAL_PRINCIPAL]: '等额本金',
    [REPAYMENT_METHODS.INTEREST_FIRST]: '先息后本'
};

/**
 * 将数值四舍五入到2位小数。
 *
 * @param {number|string} value - 输入值
 * @returns {number} 四舍五入后的值
 */
function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * 标准化还款方式，非法值回落到等额本息。
 *
 * @param {string} method - 输入方式
 * @returns {string} 标准化方式
 */
function normalizeRepaymentMethod(method) {
    const validMethods = new Set(Object.values(REPAYMENT_METHODS));
    return validMethods.has(method) ? method : REPAYMENT_METHODS.EQUAL_INSTALLMENT;
}

/**
 * 获取还款方式中文文案。
 *
 * @param {string} method - 还款方式
 * @returns {string} 中文文案
 */
function getRepaymentMethodLabel(method) {
    const normalized = normalizeRepaymentMethod(method);
    return REPAYMENT_METHOD_LABELS[normalized];
}

/**
 * 从首期年月起，按偏移量计算目标年月。
 *
 * @param {number} year - 起始年份
 * @param {number} month - 起始月份（1-12）
 * @param {number} offset - 月份偏移（从0开始）
 * @returns {{year:number, month:number}} 目标年月
 */
function addMonthOffset(year, month, offset) {
    const date = new Date(year, month - 1 + offset, 1);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
    };
}

/**
 * 计算年利率对应月利率（小数）。
 *
 * @param {number} annualRate - 年利率（百分数）
 * @returns {number} 月利率（如0.0167）
 */
function calcMonthlyRate(annualRate) {
    return Number(annualRate || 0) / 100 / 12;
}

/**
 * 基于开始/结束日期估算贷款期限（月）。
 *
 * @param {string|Date} startDate - 开始日期
 * @param {string|Date} endDate - 结束日期
 * @returns {number} 期限（月）
 */
function calcTermMonthsByRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 12;
    }

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return Math.max(1, months);
}

/**
 * 计算完整还款计划。
 *
 * @param {Object} params - 计算参数
 * @param {number} params.principal - 贷款总额
 * @param {number} params.annualRate - 年利率（%）
 * @param {number} params.termMonths - 期限（月）
 * @param {string} params.repaymentMethod - 还款方式
 * @param {number} params.firstPaymentYear - 首期支付年份
 * @param {number} params.firstPaymentMonth - 首期支付月份
 * @returns {{schedule:Array, totalInterest:number, totalPayment:number, monthlyRate:number}} 计划数据
 */
function calculateRepaymentSchedule(params) {
    const principal = round2(params.principal || 0);
    const annualRate = Number(params.annualRate || 0);
    const termMonths = Math.max(1, parseInt(params.termMonths || 12));
    const repaymentMethod = normalizeRepaymentMethod(params.repaymentMethod);
    const firstPaymentYear = parseInt(params.firstPaymentYear);
    const firstPaymentMonth = parseInt(params.firstPaymentMonth);

    const monthlyRate = calcMonthlyRate(annualRate);
    const schedule = [];

    let balance = principal;
    let totalInterest = 0;

    let fixedInstallment = 0;
    if (repaymentMethod === REPAYMENT_METHODS.EQUAL_INSTALLMENT) {
        if (monthlyRate === 0) {
            fixedInstallment = principal / termMonths;
        } else {
            const ratePower = Math.pow(1 + monthlyRate, termMonths);
            fixedInstallment = principal * monthlyRate * ratePower / (ratePower - 1);
        }
    }

    let fixedPrincipal = 0;
    if (repaymentMethod === REPAYMENT_METHODS.EQUAL_PRINCIPAL) {
        fixedPrincipal = principal / termMonths;
    }

    for (let period = 1; period <= termMonths; period++) {
        const { year, month } = addMonthOffset(firstPaymentYear, firstPaymentMonth, period - 1);

        let interestPayment = round2(balance * monthlyRate);
        let principalPayment = 0;
        let currentPayment = 0;

        if (repaymentMethod === REPAYMENT_METHODS.EQUAL_INSTALLMENT) {
            currentPayment = round2(fixedInstallment);
            principalPayment = round2(currentPayment - interestPayment);

            if (period === termMonths) {
                principalPayment = round2(balance);
                currentPayment = round2(principalPayment + interestPayment);
            }
        } else if (repaymentMethod === REPAYMENT_METHODS.EQUAL_PRINCIPAL) {
            principalPayment = round2(fixedPrincipal);
            if (period === termMonths) {
                principalPayment = round2(balance);
            }
            currentPayment = round2(principalPayment + interestPayment);
        } else {
            if (period === termMonths) {
                principalPayment = round2(balance);
                currentPayment = round2(principalPayment + interestPayment);
            } else {
                principalPayment = 0;
                currentPayment = round2(interestPayment);
            }
        }

        balance = round2(balance - principalPayment);
        if (period === termMonths || balance < 0.01) {
            balance = 0;
        }

        totalInterest = round2(totalInterest + interestPayment);

        schedule.push({
            period,
            year,
            month,
            periodLabel: `${year}/${month}`,
            payment: round2(currentPayment),
            principal: round2(principalPayment),
            interest: round2(interestPayment),
            balance: round2(balance)
        });
    }

    return {
        schedule,
        totalInterest: round2(totalInterest),
        totalPayment: round2(principal + totalInterest),
        monthlyRate
    };
}

/**
 * 计算“当前月份”对应的期次（1开始）。
 * 未到首期时返回0，超过最后一期时返回总期数。
 *
 * @param {number} firstPaymentYear - 首期支付年份
 * @param {number} firstPaymentMonth - 首期支付月份
 * @param {number} termMonths - 期限
 * @param {Date} now - 当前时间
 * @returns {number} 当前期次
 */
function getCurrentPeriodIndex(firstPaymentYear, firstPaymentMonth, termMonths, now = new Date()) {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const diff = (currentYear - firstPaymentYear) * 12 + (currentMonth - firstPaymentMonth);

    if (diff < 0) return 0;
    if (diff + 1 > termMonths) return termMonths;
    return diff + 1;
}

/**
 * 将提醒时间格式化为“每月X日 HH:mm”。
 *
 * @param {number} day - 提醒日
 * @param {number} hour - 小时
 * @param {number} minute - 分钟
 * @returns {string} 格式化文本
 */
function formatReminderTime(day, hour, minute) {
    const safeDay = Math.min(31, Math.max(1, parseInt(day || 1)));
    const safeHour = Math.min(23, Math.max(0, parseInt(hour || 0)));
    const safeMinute = Math.min(59, Math.max(0, parseInt(minute || 0)));
    const hh = String(safeHour).padStart(2, '0');
    const mm = String(safeMinute).padStart(2, '0');
    return `每月${safeDay}日 ${hh}:${mm}`;
}

module.exports = {
    REPAYMENT_METHODS,
    REPAYMENT_METHOD_LABELS,
    round2,
    normalizeRepaymentMethod,
    getRepaymentMethodLabel,
    calcMonthlyRate,
    calcTermMonthsByRange,
    calculateRepaymentSchedule,
    getCurrentPeriodIndex,
    formatReminderTime
};
