/**
 * 还款计算工具
 * 提供小程序端实时预估，保持与后端一致的计算规则。
 */

/**
 * 还款方式枚举。
 */
export const REPAYMENT_METHODS = {
  EQUAL_INSTALLMENT: 'equal_installment',
  EQUAL_PRINCIPAL: 'equal_principal',
  INTEREST_FIRST: 'interest_first'
}

/**
 * 还款方式文案映射。
 */
export const REPAYMENT_METHOD_LABELS = {
  [REPAYMENT_METHODS.EQUAL_INSTALLMENT]: '等额本息',
  [REPAYMENT_METHODS.EQUAL_PRINCIPAL]: '等额本金',
  [REPAYMENT_METHODS.INTEREST_FIRST]: '先息后本'
}

/**
 * 保留两位小数。
 * @param {number|string} value 输入值
 * @returns {number} 结果值
 */
export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

/**
 * 计算月利率（小数）。
 * @param {number|string} annualRate 年利率（百分数）
 * @returns {number} 月利率
 */
export function calcMonthlyRate(annualRate) {
  return Number(annualRate || 0) / 100 / 12
}

/**
 * 标准化还款方式。
 * @param {string} method 输入方式
 * @returns {string} 标准方式
 */
export function normalizeRepaymentMethod(method) {
  const values = Object.values(REPAYMENT_METHODS)
  return values.includes(method) ? method : REPAYMENT_METHODS.EQUAL_INSTALLMENT
}

/**
 * 计算每月应还计划。
 * @param {Object} options 计算参数
 * @param {number|string} options.principal 贷款总额
 * @param {number|string} options.annualRate 年利率（%）
 * @param {number|string} options.termMonths 贷款期限（月）
 * @param {string} options.repaymentMethod 还款方式
 * @returns {Array<Object>} 计划数组
 */
export function calculateSchedule(options) {
  const principal = round2(options.principal || 0)
  const annualRate = Number(options.annualRate || 0)
  const termMonths = Math.max(1, parseInt(options.termMonths || 1))
  const repaymentMethod = normalizeRepaymentMethod(options.repaymentMethod)

  const monthlyRate = calcMonthlyRate(annualRate)
  const schedule = []

  let balance = principal
  let fixedInstallment = 0
  let fixedPrincipal = 0

  if (repaymentMethod === REPAYMENT_METHODS.EQUAL_INSTALLMENT) {
    if (monthlyRate === 0) {
      fixedInstallment = principal / termMonths
    } else {
      const power = Math.pow(1 + monthlyRate, termMonths)
      fixedInstallment = principal * monthlyRate * power / (power - 1)
    }
  }

  if (repaymentMethod === REPAYMENT_METHODS.EQUAL_PRINCIPAL) {
    fixedPrincipal = principal / termMonths
  }

  for (let i = 1; i <= termMonths; i++) {
    let interest = round2(balance * monthlyRate)
    let principalPart = 0
    let payment = 0

    if (repaymentMethod === REPAYMENT_METHODS.EQUAL_INSTALLMENT) {
      payment = round2(fixedInstallment)
      principalPart = round2(payment - interest)
      if (i === termMonths) {
        principalPart = round2(balance)
        payment = round2(principalPart + interest)
      }
    } else if (repaymentMethod === REPAYMENT_METHODS.EQUAL_PRINCIPAL) {
      principalPart = round2(fixedPrincipal)
      if (i === termMonths) {
        principalPart = round2(balance)
      }
      payment = round2(principalPart + interest)
    } else {
      if (i === termMonths) {
        principalPart = round2(balance)
        payment = round2(principalPart + interest)
      } else {
        principalPart = 0
        payment = round2(interest)
      }
    }

    balance = round2(balance - principalPart)
    if (i === termMonths || balance < 0.01) {
      balance = 0
    }

    schedule.push({
      period: i,
      payment,
      principal: principalPart,
      interest,
      balance
    })
  }

  return schedule
}

/**
 * 计算总利息。
 * @param {Array<Object>} schedule 还款计划
 * @returns {number} 利息总额
 */
export function getTotalInterest(schedule = []) {
  return round2(schedule.reduce((sum, item) => sum + Number(item.interest || 0), 0))
}
