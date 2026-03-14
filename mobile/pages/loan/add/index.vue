<template>
  <view class="page">
    <scroll-view scroll-y class="content">
      <view class="section-card single-line">
        <text class="item-label">贷款名称</text>
        <input v-model="form.loan_name" class="item-input" maxlength="100" placeholder="请输入贷款名称" placeholder-class="placeholder" />
      </view>

      <view class="section-card">
        <view class="item-row">
          <text class="item-label">贷款总额(元)</text>
          <input v-model="form.principal" class="item-input" type="digit" placeholder="请输入8位数内的整数" placeholder-class="placeholder" />
        </view>

        <view class="item-row">
          <view>
            <text class="item-label">贷款年利率(%)</text>
            <text class="item-sub">贷款月利率{{ monthlyRateText }}</text>
          </view>
          <input v-model="form.annual_rate" class="item-input" type="digit" placeholder="请输入100内的数字" placeholder-class="placeholder" />
        </view>

        <view class="item-row">
          <text class="item-label">贷款期限(月)</text>
          <input v-model="form.term_months" class="item-input" type="number" placeholder="请输入1-360的整数" placeholder-class="placeholder" />
        </view>

        <view class="item-row clickable" @click="chooseRepaymentMethod">
          <text class="item-label">还款方式</text>
          <view class="item-value-wrap">
            <text class="item-value">{{ methodLabel }}</text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view class="item-row clickable" @click="openFirstPaymentPicker">
          <text class="item-label">首期支付</text>
          <view class="item-value-wrap">
            <text class="item-value muted" :class="{ 'is-selected': !!form.first_payment }">
              {{ form.first_payment || '请选择首期支付日期' }}
            </text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view class="item-row clickable" @click="goSchedule">
          <view>
            <text class="item-label item-accent">本月付款金额</text>
            <text class="payment-amount">¥{{ monthlyPaymentText }}</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="section-card remind-card" @click="onRemindCardClick">
        <view>
          <text class="item-label">还款提醒</text>
          <text v-if="form.remind_enabled" class="item-sub">{{ remindTimeText }}</text>
        </view>
        <switch :checked="form.remind_enabled" color="#ff4d3a" @change="onRemindToggle" @click.stop="noop" />
      </view>

      <button class="submit-btn" @click="submitForm">提交新增</button>
    </scroll-view>

    <view v-if="showFirstPaymentPicker" class="picker-mask" @click="closeFirstPaymentPicker">
      <view class="picker-panel" @click.stop="noop">
        <view class="picker-header">
          <text class="header-btn cancel" @click="closeFirstPaymentPicker">取消</text>
          <text class="header-title">首期支付</text>
          <text class="header-btn confirm" @click="confirmFirstPaymentPicker">确定</text>
        </view>

        <picker-view :value="firstPaymentPickerValue" class="picker-view" @change="onFirstPaymentPickerChange">
          <picker-view-column>
            <view v-for="item in years" :key="`y-${item}`" class="picker-item">{{ item }}年</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="item in months" :key="`mo-${item}`" class="picker-item">{{ item }}月</view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>

    <view v-if="showReminderPicker" class="picker-mask" @click="closeReminderPicker">
      <view class="picker-panel" @click.stop="noop">
        <view class="picker-header">
          <text class="header-btn cancel" @click="closeReminderPicker">取消</text>
          <text class="header-title">每月提醒</text>
          <text class="header-btn confirm" @click="confirmReminderPicker">确定</text>
        </view>

        <picker-view :value="remindPickerValue" class="picker-view" @change="onRemindPickerChange">
          <picker-view-column>
            <view v-for="item in days" :key="`d-${item}`" class="picker-item">{{ item }}日</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="item in hours" :key="`h-${item}`" class="picker-item">{{ pad2(item) }}</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="item in minutes" :key="`m-${item}`" class="picker-item">{{ pad2(item) }}</view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>
  </view>
</template>

<script setup>
/**
 * 贷款新增页面
 * 职责：收集贷款参数、计算首期月供、配置提醒时间并提交新增请求。
 */
import { computed, reactive, ref } from 'vue'
import { createLoan } from '../../../api/loan'
import {
  REPAYMENT_METHOD_LABELS,
  REPAYMENT_METHODS,
  calculateSchedule,
  calcMonthlyRate,
  normalizeRepaymentMethod
} from '../../../utils/repayment'

const form = reactive({
  loan_name: '',
  principal: '',
  annual_rate: '',
  term_months: '',
  repayment_method: REPAYMENT_METHODS.EQUAL_INSTALLMENT,
  first_payment: '',
  remind_enabled: true,
  remind_day: 1,
  remind_hour: 12,
  remind_minute: 0
})

const showReminderPicker = ref(false)
const showFirstPaymentPicker = ref(false)
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 31 }, (_, i) => currentYear - 10 + i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)
const days = Array.from({ length: 31 }, (_, i) => i + 1)
const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 60 }, (_, i) => i)
const firstPaymentPickerValue = ref([10, 0])
const remindPickerValue = ref([0, 12, 0])

/**
 * 获取还款方式文案。
 */
const methodLabel = computed(() => REPAYMENT_METHOD_LABELS[form.repayment_method])

/**
 * 计算月利率展示文案。
 */
const monthlyRateText = computed(() => {
  const rate = calcMonthlyRate(form.annual_rate) * 100
  return `${Number.isFinite(rate) ? rate.toFixed(2) : '0.00'}%`
})

/**
 * 计算本月还款金额。
 */
const monthlyPaymentText = computed(() => {
  if (!isFormCalculable()) return '0'

  const schedule = calculateSchedule({
    principal: Number(form.principal),
    annualRate: Number(form.annual_rate),
    termMonths: Number(form.term_months),
    repaymentMethod: form.repayment_method
  })

  return schedule[0]?.payment?.toFixed(2) || '0'
})

/**
 * 提醒时间文案。
 */
const remindTimeText = computed(() => `每月${form.remind_day}日 ${pad2(form.remind_hour)}:${pad2(form.remind_minute)}`)

/**
 * 判断当前是否满足计算条件。
 */
function isFormCalculable() {
  return Number(form.principal) > 0 && Number(form.term_months) > 0 && Number(form.annual_rate) >= 0
}

/**
 * 补齐两位数字。
 * @param {number|string} value 输入值
 * @returns {string} 两位文本
 */
function pad2(value) {
  return String(value).padStart(2, '0')
}

/**
 * 空函数，阻止冒泡。
 */
function noop() {}

/**
 * 跳转还款明细页。
 * 新增场景下使用本地参数预览计划，不依赖后端已落库ID。
 */
function goSchedule() {
  if (!isFormCalculable()) {
    uni.showToast({ title: '请先填写完整金额、利率和期限', icon: 'none' })
    return
  }
  if (!form.first_payment) {
    uni.showToast({ title: '请先选择首期支付日期', icon: 'none' })
    return
  }

  const query = [
    'mode=preview',
    `principal=${encodeURIComponent(Number(form.principal))}`,
    `annual_rate=${encodeURIComponent(Number(form.annual_rate))}`,
    `term_months=${encodeURIComponent(Number(form.term_months))}`,
    `repayment_method=${encodeURIComponent(normalizeRepaymentMethod(form.repayment_method))}`,
    `first_payment=${encodeURIComponent(form.first_payment)}`
  ].join('&')

  uni.navigateTo({ url: `/pages/loan/schedule/index?${query}` })
}

/**
 * 选择还款方式。
 */
function chooseRepaymentMethod() {
  const methods = [
    REPAYMENT_METHODS.EQUAL_INSTALLMENT,
    REPAYMENT_METHODS.EQUAL_PRINCIPAL,
    REPAYMENT_METHODS.INTEREST_FIRST
  ]

  uni.showActionSheet({
    itemList: methods.map((item) => REPAYMENT_METHOD_LABELS[item]),
    success: ({ tapIndex }) => {
      form.repayment_method = methods[tapIndex]
    }
  })
}

/**
 * 生成首期支付 picker 的默认索引。
 * @returns {Array<number>} [yearIndex, monthIndex]
 */
function buildFirstPaymentPickerValue() {
  if (form.first_payment) {
    const [yearText, monthText] = form.first_payment.split('/')
    const yearIndex = years.findIndex((year) => year === Number(yearText))
    const monthIndex = months.findIndex((month) => month === Number(monthText))
    return [yearIndex >= 0 ? yearIndex : 10, monthIndex >= 0 ? monthIndex : 0]
  }

  const now = new Date()
  const defaultYearIndex = years.findIndex((year) => year === now.getFullYear())
  return [defaultYearIndex >= 0 ? defaultYearIndex : 10, now.getMonth()]
}

/**
 * 打开首期支付选择器。
 */
function openFirstPaymentPicker() {
  firstPaymentPickerValue.value = buildFirstPaymentPickerValue()
  showFirstPaymentPicker.value = true
}

/**
 * 关闭首期支付选择器。
 */
function closeFirstPaymentPicker() {
  showFirstPaymentPicker.value = false
}

/**
 * 监听首期支付 picker 滚动。
 * @param {Object} event 滚动事件
 */
function onFirstPaymentPickerChange(event) {
  firstPaymentPickerValue.value = event.detail.value
}

/**
 * 确认首期支付时间。
 */
function confirmFirstPaymentPicker() {
  const year = years[firstPaymentPickerValue.value[0]]
  const month = months[firstPaymentPickerValue.value[1]]
  form.first_payment = `${year}/${month}`
  closeFirstPaymentPicker()
}

/**
 * 点击提醒卡片。
 */
function onRemindCardClick() {
  if (!form.remind_enabled) return
  openReminderPicker()
}

/**
 * 提醒开关切换。
 * @param {Object} event 开关事件
 */
function onRemindToggle(event) {
  form.remind_enabled = !!event.detail.value
  if (form.remind_enabled) {
    openReminderPicker()
  }
}

/**
 * 打开提醒时间选择器。
 */
function openReminderPicker() {
  remindPickerValue.value = [form.remind_day - 1, form.remind_hour, form.remind_minute]
  showReminderPicker.value = true
}

/**
 * 关闭提醒时间选择器。
 */
function closeReminderPicker() {
  showReminderPicker.value = false
}

/**
 * 监听提醒 picker-view 滚动。
 * @param {Object} event 滚动事件
 */
function onRemindPickerChange(event) {
  remindPickerValue.value = event.detail.value
}

/**
 * 确认提醒时间。
 */
function confirmReminderPicker() {
  form.remind_day = days[remindPickerValue.value[0]]
  form.remind_hour = hours[remindPickerValue.value[1]]
  form.remind_minute = minutes[remindPickerValue.value[2]]
  closeReminderPicker()
}

/**
 * 校验表单并提交新增。
 */
async function submitForm() {
  if (!form.loan_name.trim()) {
    uni.showToast({ title: '请输入贷款名称', icon: 'none' })
    return
  }
  if (!(Number(form.principal) > 0)) {
    uni.showToast({ title: '请输入正确的贷款总额', icon: 'none' })
    return
  }
  if (!(Number(form.annual_rate) >= 0 && Number(form.annual_rate) <= 100)) {
    uni.showToast({ title: '请输入0-100内的年利率', icon: 'none' })
    return
  }
  if (!(Number(form.term_months) >= 1 && Number(form.term_months) <= 360)) {
    uni.showToast({ title: '请输入1-360的贷款期限', icon: 'none' })
    return
  }
  if (!form.first_payment) {
    uni.showToast({ title: '请选择首期支付日期', icon: 'none' })
    return
  }

  const payload = {
    loan_name: form.loan_name.trim(),
    principal: Number(form.principal),
    annual_rate: Number(form.annual_rate),
    term_months: Number(form.term_months),
    repayment_method: normalizeRepaymentMethod(form.repayment_method),
    first_payment: form.first_payment,
    remind_enabled: form.remind_enabled ? 1 : 0,
    remind_day: form.remind_day,
    remind_hour: form.remind_hour,
    remind_minute: form.remind_minute
  }

  const res = await createLoan(payload)
  if (res.success) {
    uni.showToast({ title: '新增成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 400)
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
}

.section-card {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 18rpx;
  overflow: hidden;
}

.single-line {
  padding: 0 30rpx;
  min-height: 108rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-row {
  min-height: 108rpx;
  padding: 0 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-row:last-child {
  border-bottom: none;
}

.item-label {
  color: #2b2b2b;
  font-size: 32rpx;
  line-height: 42rpx;
}

.item-sub {
  display: block;
  margin-top: 8rpx;
  color: #df4e47;
  font-size: 28rpx;
  line-height: 34rpx;
}

.item-input {
  text-align: right;
  color: #333;
  font-size: 32rpx;
  width: 360rpx;
}

.placeholder {
  color: #b9b9b9;
}

.clickable {
  padding-right: 22rpx;
}

.item-value-wrap {
  display: flex;
  align-items: center;
}

.item-value {
  color: #333;
  font-size: 32rpx;
}

.item-value.muted {
  color: #b9b9b9;
}

.item-value.is-selected {
  color: #333;
}

.arrow {
  margin-left: 10rpx;
  color: #c9c9c9;
  font-size: 28rpx;
}

.item-accent {
  color: #df4e47;
}

.payment-amount {
  display: block;
  margin-top: 8rpx;
  color: #ff4d3a;
  font-size: 48rpx;
  line-height: 54rpx;
  font-weight: 600;
}

.remind-card {
  min-height: 108rpx;
  padding: 0 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.submit-btn {
  margin-top: 24rpx;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 12rpx;
  background: #ff4d3a;
  color: #fff;
  font-size: 38rpx;
  font-weight: 500;
}

.submit-btn::after {
  border: none;
}

.picker-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  z-index: 30;
}

.picker-panel {
  width: 100%;
  background: #fff;
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
}

.picker-header {
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.header-btn {
  font-size: 30rpx;
}

.header-btn.cancel {
  color: #888;
}

.header-btn.confirm {
  color: #ff4d3a;
}

.header-title {
  color: #111;
  font-size: 36rpx;
  font-weight: 500;
}

.picker-view {
  width: 100%;
  height: 380rpx;
}

.picker-item {
  line-height: 76rpx;
  text-align: center;
  font-size: 32rpx;
  color: #333;
}
</style>
