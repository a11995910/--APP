<template>
  <view class="page" v-if="loaded">
    <view class="summary-card">
      <view class="summary-cell">
        <text class="summary-value">{{ formatMoney(summary.principal) }}</text>
        <text class="summary-label">贷款总额(元)</text>
      </view>
      <view class="summary-cell">
        <text class="summary-value">{{ formatMoney(summary.totalInterest) }}</text>
        <text class="summary-label">利息总额(元)</text>
      </view>
    </view>

    <view class="table-header">
      <text class="header-col">日期</text>
      <text class="header-col center">付款(元)</text>
      <text class="header-col right">余额(元)</text>
    </view>

    <scroll-view scroll-y class="table-body">
      <view
        v-for="item in schedule"
        :key="item.period"
        class="table-row"
        :class="{ active: item.is_current }"
      >
        <view class="col-date">
          <text class="date-text">{{ item.periodLabel }}</text>
          <text v-if="item.is_current" class="current-tag">本月付款</text>
        </view>
        <text class="col-payment">{{ formatMoney(item.payment) }}</text>
        <text class="col-balance">{{ formatMoney(item.balance) }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
/**
 * 还款明细页面
 * 职责：展示后端还款计划，或在新增/编辑预览模式下本地计算并展示分期明细。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getLoanSchedule } from '../../../api/loan'
import {
  calculateSchedule,
  getTotalInterest,
  normalizeRepaymentMethod
} from '../../../utils/repayment'

const loaded = ref(false)
const summary = ref({
  principal: 0,
  totalInterest: 0
})
const schedule = ref([])

/**
 * 解析首期支付时间字符串。
 * @param {string} firstPayment 首期支付，格式：YYYY/M
 * @returns {{year:number, month:number}} 年月对象
 */
function parseFirstPayment(firstPayment) {
  const now = new Date()
  const [yearText, monthText] = String(firstPayment || '').split('/')
  const year = Number(yearText) || now.getFullYear()
  const month = Number(monthText) || now.getMonth() + 1
  return { year, month }
}

/**
 * 计算指定偏移月份后的年月标签。
 * @param {number} startYear 起始年份
 * @param {number} startMonth 起始月份（1-12）
 * @param {number} offset 月份偏移（0开始）
 * @returns {string} 标签文本（YYYY/M）
 */
function buildPeriodLabel(startYear, startMonth, offset) {
  const totalMonth = (startYear * 12 + (startMonth - 1)) + offset
  const year = Math.floor(totalMonth / 12)
  const month = (totalMonth % 12) + 1
  return `${year}/${month}`
}

/**
 * 金额格式化。
 * @param {number|string} value 金额值
 * @returns {string} 两位小数
 */
function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

/**
 * 拉取还款明细。
 * @param {string|number} id 贷款ID
 */
async function loadSchedule(id) {
  const res = await getLoanSchedule(id)
  if (res.success) {
    summary.value = res.data.summary || { principal: 0, totalInterest: 0 }
    schedule.value = res.data.schedule || []
    loaded.value = true
  }
}

/**
 * 使用页面参数生成预览还款明细（新增页未保存场景）。
 * @param {Object} options 页面参数
 */
function loadPreviewSchedule(options) {
  const principal = Number(options.principal || 0)
  const annualRate = Number(options.annual_rate || 0)
  const termMonths = Number(options.term_months || 0)
  const repaymentMethod = normalizeRepaymentMethod(options.repayment_method)
  const firstPayment = options.first_payment || ''

  if (!(principal > 0 && termMonths > 0)) {
    uni.showToast({ title: '预览参数不完整', icon: 'none' })
    return
  }

  const rawSchedule = calculateSchedule({
    principal,
    annualRate,
    termMonths,
    repaymentMethod
  })
  const firstDate = parseFirstPayment(firstPayment)

  schedule.value = rawSchedule.map((item, index) => ({
    ...item,
    periodLabel: buildPeriodLabel(firstDate.year, firstDate.month, index),
    is_current: index === 0
  }))

  summary.value = {
    principal,
    totalInterest: getTotalInterest(rawSchedule)
  }
  loaded.value = true
}

/**
 * 页面加载生命周期。
 * @param {Object} options 路由参数，支持 `id` 或 `mode=preview`。
 */
onLoad((options) => {
  if (options.mode === 'preview') {
    loadPreviewSchedule(options)
    return
  }
  loadSchedule(options.id)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.summary-card {
  margin: 20rpx;
  background: #fcefee;
  border-radius: 12rpx;
  padding: 22rpx 30rpx;
  display: flex;
}

.summary-cell {
  flex: 1;
  text-align: center;
}

.summary-value {
  display: block;
  color: #ed6a72;
  font-size: 50rpx;
  line-height: 54rpx;
  font-weight: 600;
}

.summary-label {
  display: block;
  margin-top: 10rpx;
  color: #5a5a5a;
  font-size: 30rpx;
}

.table-header {
  height: 88rpx;
  background: #ffffff;
  border-top: 1rpx solid #efefef;
  border-bottom: 1rpx solid #efefef;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.header-col {
  flex: 1;
  font-size: 34rpx;
  color: #555;
}

.header-col.center {
  text-align: center;
}

.header-col.right {
  text-align: right;
}

.table-body {
  height: calc(100vh - 20rpx - 186rpx - 88rpx);
}

.table-row {
  min-height: 98rpx;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #f3f3f3;
  background: #ffffff;
}

.table-row.active {
  background: #fff2f1;
}

.col-date {
  flex: 1;
}

.date-text {
  display: block;
  font-size: 34rpx;
  color: #2e2e2e;
}

.current-tag {
  display: block;
  margin-top: 6rpx;
  color: #df4e47;
  font-size: 26rpx;
}

.col-payment {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  color: #2e2e2e;
}

.col-balance {
  flex: 1;
  text-align: right;
  font-size: 34rpx;
  color: #2e2e2e;
}
</style>
