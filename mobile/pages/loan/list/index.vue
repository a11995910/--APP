<template>
  <view class="page">
    <view class="content">
      <view class="toolbar">
        <button class="add-btn" @click="goAdd">新增还款</button>
      </view>

      <view v-if="list.length > 0" class="loan-list">
        <view v-for="item in list" :key="item.id" class="loan-card">
          <text class="loan-name">{{ item.loan_name }}</text>

          <view class="info-row">
            <text class="label">本月付款金额</text>
            <text class="value value-accent">¥{{ formatMoney(item.current_payment_amount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">贷款总额</text>
            <text class="value">¥{{ formatMoney(item.principal) }}</text>
          </view>
          <view class="info-row">
            <text class="label">剩余还款金额</text>
            <text class="value">¥{{ formatMoney(item.remaining_amount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">还款提醒</text>
            <text class="value">{{ item.remind_time_text }}</text>
          </view>
          <view class="info-row">
            <text class="label">还款方式</text>
            <text class="value">{{ item.repayment_method_label }}</text>
          </view>
          <view class="info-row">
            <text class="label">首期支付日期</text>
            <text class="value">{{ item.first_payment }}</text>
          </view>

          <view class="action-row">
            <button class="btn btn-primary" @click="goEdit(item.id)">编辑</button>
            <button class="btn btn-outline" @click="goSchedule(item.id)">还款明细</button>
          </view>
        </view>
      </view>

      <view v-else class="empty-wrap">
        <text class="empty-text">暂无还款计划，点击上方新增还款</text>
      </view>

      <text class="footer-tip">已全部加载完毕</text>
    </view>
  </view>
</template>

<script setup>
/**
 * 贷款列表页面（保留页）
 * 职责：按卡片形式展示全部贷款，并提供新增、编辑、查看明细入口。
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLoans } from '../../../api/loan'

const list = ref([])

/**
 * 金额格式化。
 * @param {number|string} amount 金额
 * @returns {string} 两位小数金额
 */
const formatMoney = (amount) => Number(amount || 0).toFixed(2)

/**
 * 拉取贷款列表。
 */
const loadList = async () => {
  const res = await getLoans({ status: 1 })
  if (res.success) {
    list.value = res.data || []
  }
}

/**
 * 跳转新增页。
 */
const goAdd = () => {
  uni.navigateTo({ url: '/pages/loan/add/index' })
}

/**
 * 跳转编辑页。
 * @param {number|string} id 贷款ID
 */
const goEdit = (id) => {
  uni.navigateTo({ url: `/pages/loan/edit/index?id=${id}` })
}

/**
 * 跳转还款明细页。
 * @param {number|string} id 贷款ID
 */
const goSchedule = (id) => {
  uni.navigateTo({ url: `/pages/loan/schedule/index?id=${id}` })
}

/**
 * 页面显示生命周期。
 * 每次进入页面时刷新贷款列表，保证数据与最新编辑结果一致。
 */
onShow(() => {
  loadList()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding: 20rpx;
  box-sizing: border-box;
}

.toolbar {
  margin-bottom: 18rpx;
}

.add-btn {
  height: 86rpx;
  line-height: 86rpx;
  border-radius: 12rpx;
  background: #ff4d3a;
  color: #fff;
  font-size: 34rpx;
  font-weight: 500;
}

.add-btn::after {
  border: none;
}

.loan-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 28rpx;
  margin-bottom: 18rpx;
}

.loan-name {
  display: block;
  font-size: 36rpx;
  line-height: 42rpx;
  color: #1a1a1a;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.info-row {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.label {
  width: 270rpx;
  color: #8c8c8c;
  font-size: 30rpx;
  line-height: 44rpx;
}

.value {
  flex: 1;
  color: #2b2b2b;
  font-size: 34rpx;
  line-height: 44rpx;
  text-align: left;
}

.value-accent {
  color: #ff4d3a;
  font-weight: 600;
}

.action-row {
  margin-top: 26rpx;
  display: flex;
  gap: 22rpx;
}

.btn {
  flex: 1;
  height: 96rpx;
  border-radius: 12rpx;
  font-size: 34rpx;
  line-height: 96rpx;
  text-align: center;
  padding: 0;
}

.btn::after {
  border: none;
}

.btn-primary {
  background: #ff4d3a;
  color: #ffffff;
}

.btn-outline {
  background: #ffffff;
  color: #ff4d3a;
  border: 1rpx solid #ff6c5d;
}

.empty-wrap {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 52rpx 30rpx;
  text-align: center;
}

.empty-text {
  color: #8e8e8e;
  font-size: 30rpx;
}

.footer-tip {
  display: block;
  text-align: center;
  font-size: 30rpx;
  color: #8c8c8c;
  margin-top: 30rpx;
}
</style>
