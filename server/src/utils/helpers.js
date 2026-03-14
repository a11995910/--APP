/**
 * 通用工具函数
 * 
 * @module utils/helpers
 * @author AI Assistant
 */

const crypto = require('crypto');

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
function generateRandomString(length = 16) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * 格式化日期
 * @param {Date|string} date - 日期对象或字符串
 * @param {string} format - 格式化模板
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 计算两个日期之间的天数差
 * @param {Date|string} date1 - 日期1
 * @param {Date|string} date2 - 日期2
 * @returns {number} 天数差（date2 - date1）
 */
function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const timeDiff = d2.getTime() - d1.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * 获取本月的开始和结束日期
 * @param {Date} date - 日期对象，默认当前日期
 * @returns {Object} { startDate, endDate }
 */
function getMonthRange(date = new Date()) {
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
    };
}

/**
 * 获取下一个还款日期
 * @param {number} paymentDay - 还款日（1-31）
 * @returns {Date} 下一个还款日期
 */
function getNextPaymentDate(paymentDay) {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let nextPaymentDate;
    if (currentDay <= paymentDay) {
        // 本月还款日还没到
        nextPaymentDate = new Date(currentYear, currentMonth, paymentDay);
    } else {
        // 本月还款日已过，下个月
        nextPaymentDate = new Date(currentYear, currentMonth + 1, paymentDay);
    }

    // 处理月末日期（如31号在小月份的情况）
    const lastDayOfMonth = new Date(nextPaymentDate.getFullYear(), nextPaymentDate.getMonth() + 1, 0).getDate();
    if (paymentDay > lastDayOfMonth) {
        nextPaymentDate.setDate(lastDayOfMonth);
    }

    return nextPaymentDate;
}

/**
 * 手机号脱敏
 * @param {string} phone - 手机号
 * @returns {string} 脱敏后的手机号
 */
function maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 金额格式化
 * @param {number} amount - 金额
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的金额
 */
function formatMoney(amount, decimals = 2) {
    return Number(amount).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 判断是否为有效的手机号
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
function isValidPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 安全解析JSON
 * @param {string} str - JSON字符串
 * @param {any} defaultValue - 解析失败时的默认值
 * @returns {any} 解析结果
 */
function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (error) {
        return defaultValue;
    }
}

module.exports = {
    generateRandomString,
    formatDate,
    daysBetween,
    getMonthRange,
    getNextPaymentDate,
    maskPhone,
    formatMoney,
    isValidPhone,
    safeJsonParse
};
