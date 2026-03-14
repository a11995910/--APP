"use strict";
const REPAYMENT_METHODS = {
  EQUAL_INSTALLMENT: "equal_installment",
  EQUAL_PRINCIPAL: "equal_principal",
  INTEREST_FIRST: "interest_first"
};
const REPAYMENT_METHOD_LABELS = {
  [REPAYMENT_METHODS.EQUAL_INSTALLMENT]: "等额本息",
  [REPAYMENT_METHODS.EQUAL_PRINCIPAL]: "等额本金",
  [REPAYMENT_METHODS.INTEREST_FIRST]: "先息后本"
};
function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
function calcMonthlyRate(annualRate) {
  return Number(annualRate || 0) / 100 / 12;
}
function normalizeRepaymentMethod(method) {
  const values = Object.values(REPAYMENT_METHODS);
  return values.includes(method) ? method : REPAYMENT_METHODS.EQUAL_INSTALLMENT;
}
function calculateSchedule(options) {
  const principal = round2(options.principal || 0);
  const annualRate = Number(options.annualRate || 0);
  const termMonths = Math.max(1, parseInt(options.termMonths || 1));
  const repaymentMethod = normalizeRepaymentMethod(options.repaymentMethod);
  const monthlyRate = calcMonthlyRate(annualRate);
  const schedule = [];
  let balance = principal;
  let fixedInstallment = 0;
  let fixedPrincipal = 0;
  if (repaymentMethod === REPAYMENT_METHODS.EQUAL_INSTALLMENT) {
    if (monthlyRate === 0) {
      fixedInstallment = principal / termMonths;
    } else {
      const power = Math.pow(1 + monthlyRate, termMonths);
      fixedInstallment = principal * monthlyRate * power / (power - 1);
    }
  }
  if (repaymentMethod === REPAYMENT_METHODS.EQUAL_PRINCIPAL) {
    fixedPrincipal = principal / termMonths;
  }
  for (let i = 1; i <= termMonths; i++) {
    let interest = round2(balance * monthlyRate);
    let principalPart = 0;
    let payment = 0;
    if (repaymentMethod === REPAYMENT_METHODS.EQUAL_INSTALLMENT) {
      payment = round2(fixedInstallment);
      principalPart = round2(payment - interest);
      if (i === termMonths) {
        principalPart = round2(balance);
        payment = round2(principalPart + interest);
      }
    } else if (repaymentMethod === REPAYMENT_METHODS.EQUAL_PRINCIPAL) {
      principalPart = round2(fixedPrincipal);
      if (i === termMonths) {
        principalPart = round2(balance);
      }
      payment = round2(principalPart + interest);
    } else {
      if (i === termMonths) {
        principalPart = round2(balance);
        payment = round2(principalPart + interest);
      } else {
        principalPart = 0;
        payment = round2(interest);
      }
    }
    balance = round2(balance - principalPart);
    if (i === termMonths || balance < 0.01) {
      balance = 0;
    }
    schedule.push({
      period: i,
      payment,
      principal: principalPart,
      interest,
      balance
    });
  }
  return schedule;
}
function getTotalInterest(schedule = []) {
  return round2(schedule.reduce((sum, item) => sum + Number(item.interest || 0), 0));
}
exports.REPAYMENT_METHODS = REPAYMENT_METHODS;
exports.REPAYMENT_METHOD_LABELS = REPAYMENT_METHOD_LABELS;
exports.calcMonthlyRate = calcMonthlyRate;
exports.calculateSchedule = calculateSchedule;
exports.getTotalInterest = getTotalInterest;
exports.normalizeRepaymentMethod = normalizeRepaymentMethod;
