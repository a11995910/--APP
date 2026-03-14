<template>
  <view class="home-page">
    <!-- Banner轮播 -->
    <swiper
      class="banner-swiper"
      :indicator-dots="true"
      :autoplay="true"
      :interval="4000"
      :circular="true"
      indicator-color="rgba(255,255,255,0.6)"
      indicator-active-color="#ff4d3a"
    >
      <swiper-item v-for="item in banners" :key="item.id">
        <image class="banner-image" :src="item.image_url" mode="aspectFill" @click="onBannerClick(item)" />
      </swiper-item>
    </swiper>

    <!-- 还款动态卡片 -->
    <view class="repayment-card">
      <view class="card-header">
        <text class="card-title">我的还款动态</text>
        <text class="card-date">{{ currentMonth }}</text>
      </view>

      <template v-if="hasLoans">
        <view class="main-info">
          <view class="amount-block">
            <text class="summary-label">本月待还</text>
            <text class="summary-value">¥{{ formatMoney(homeData.monthlyAmount) }}</text>
          </view>
          <view class="days-block">
            <text class="summary-label">最近还款</text>
            <view class="days-value">
              <text class="days">{{ homeData.nextRepayment ? homeData.nextRepayment.daysRemaining : '--' }}</text>
              <text class="unit">天后到期</text>
            </view>
          </view>
        </view>

        <view class="next-info" v-if="homeData.nextRepayment">
          <text class="next-label">下一笔：</text>
          <text class="next-name">{{ homeData.nextRepayment.loanName }}</text>
          <text class="next-amount">¥{{ formatMoney(homeData.nextRepayment.amount) }}</text>
        </view>
      </template>

      <template v-else>
        <view class="empty-state">
          <text class="empty-text">暂无贷款记录</text>
          <button class="add-btn" @click="goAddLoan">立即新增</button>
        </view>
      </template>
    </view>

    <!-- 还款列表区块（原list页内容迁移） -->
    <view class="loan-section">
      <view class="section-header">
        <text class="section-title">还款计划</text>
        <button class="section-add-btn" @click="goAddLoan">新增还款</button>
      </view>

      <view v-if="loanList.length > 0" class="loan-list">
        <view v-for="loan in loanList" :key="loan.id" class="loan-card">
          <text class="loan-name">{{ loan.loan_name }}</text>

          <view class="info-row">
            <text class="label">本月付款金额</text>
            <text class="value value-accent">¥{{ formatMoney(loan.current_payment_amount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">贷款总额</text>
            <text class="value">¥{{ formatMoney(loan.principal) }}</text>
          </view>
          <view class="info-row">
            <text class="label">剩余还款金额</text>
            <text class="value">¥{{ formatMoney(loan.remaining_amount) }}</text>
          </view>
          <view class="info-row">
            <text class="label">还款提醒</text>
            <text class="value">{{ loan.remind_time_text }}</text>
          </view>
          <view class="info-row">
            <text class="label">还款方式</text>
            <text class="value">{{ loan.repayment_method_label }}</text>
          </view>
          <view class="info-row">
            <text class="label">首期支付日期</text>
            <text class="value">{{ loan.first_payment }}</text>
          </view>

          <view class="action-row">
            <button class="btn btn-primary" @click="goLoanDetail(loan.id)">编辑</button>
            <button class="btn btn-outline" @click="goLoanSchedule(loan.id)">还款明细</button>
          </view>
        </view>
      </view>

      <view v-else class="empty-wrap">
        <text class="empty-tip">暂无还款计划，点击右上角新增还款</text>
      </view>

      <text class="footer-tip" v-if="loanList.length > 0">已全部加载完毕</text>
    </view>

    <view v-if="pageLoading" class="page-loading-mask">
      <view class="loading-panel">
        <view class="loading-spinner"></view>
        <text class="loading-text">{{ loadingText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useHomeStore } from '../../stores/home'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const homeStore = useHomeStore()
const authLoading = ref(false)
const loadingText = ref('首页加载中...')
const banners = computed(() => homeStore.banners)
const loanList = computed(() => homeStore.loanList)
const homeData = computed(() => homeStore.homeData)
const pageLoading = computed(() => homeStore.loading || authLoading.value)
const hasLoans = computed(() => homeStore.hasLoans)
const currentMonth = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月`
})

/**
 * 获取本地持久化 token。
 * @returns {string} 当前登录 token。
 */
const getPersistedToken = () => uni.getStorageSync('token') || ''

/**
 * 统一格式化金额，避免页面中重复处理。
 * @param {number|string} val 金额值。
 * @returns {string} 两位小数字符串。
 */
const formatMoney = (val) => Number(val || 0).toFixed(2)

/**
 * 统一刷新首页数据，便于首次进入与页面回显复用。
 * 说明：真正的数据请求统一交由 `homeStore` 管理，页面只负责触发与展示。
 */
const refreshPage = async (trigger = 'unknown') => {
  try {
    uni.showNavigationBarLoading()
    loadingText.value = '首页数据加载中...'
    await homeStore.loadDashboard(trigger)
  } finally {
    uni.hideNavigationBarLoading()
  }
}

/**
 * 处理Banner点击跳转。
 * @param {Object} item Banner项。
 */
const onBannerClick = (item) => {
  if (!item.link_url) {
    return
  }

  uni.navigateTo({
    url: `/pages/webview/index?url=${encodeURIComponent(item.link_url)}`
  })
}

/**
 * 跳转新增贷款页面。
 */
const goAddLoan = () => uni.navigateTo({ url: '/pages/loan/add/index' })

/**
 * 跳转贷款详情页面。
 * @param {number} id 贷款ID。
 */
const goLoanDetail = (id) => uni.navigateTo({ url: `/pages/loan/edit/index?id=${id}` })

/**
 * 跳转还款明细页面。
 * @param {number} id 贷款ID。
 */
const goLoanSchedule = (id) => uni.navigateTo({ url: `/pages/loan/schedule/index?id=${id}` })

/**
 * 确保首页已登录后再拉取数据。
 * 逻辑：
 * 1. 已有 token：直接请求首页数据。
 * 2. 无 token：首页主动发起静默登录。
 * 3. 静默登录成功：在回调中再次请求首页数据。
 * 4. 静默登录失败：跳转手机号登录页。
 *
 * @param {string} trigger 触发来源。
 */
const ensureLoginThenRefresh = async (trigger = 'unknown') => {
  const persistedToken = getPersistedToken()

  if (persistedToken) {
    await refreshPage(`${trigger}:hasToken`)
    return
  }

  // #ifdef MP-WEIXIN
  if (authLoading.value) {
    return
  }

  authLoading.value = true
  loadingText.value = '正在登录中...'
  uni.showNavigationBarLoading()

  try {
    const success = await userStore.silentLoginByMiniappOpenid()
    const latestToken = getPersistedToken()

    if (success && latestToken) {
      await refreshPage(`${trigger}:silentLoginThen`)
      return
    }

    uni.reLaunch({
      url: '/pages/login/index',
      fail: () => {
        uni.showToast({
          title: '跳转登录页失败',
          icon: 'none'
        })
      }
    })
  } finally {
    authLoading.value = false
    uni.hideNavigationBarLoading()
  }
  // #endif

  // #ifndef MP-WEIXIN
  uni.reLaunch({
    url: '/pages/login/index'
  })
  // #endif
}

onMounted(() => {
  ensureLoginThenRefresh('onMounted')
})

onShow(() => {
  ensureLoginThenRefresh('onShow')
})
</script>

<style scoped>
.home-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 24rpx;
}

.banner-swiper {
  width: 100%;
  height: 400rpx;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.repayment-card {
  margin: 18rpx 20rpx;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  border: 1rpx solid #f3f3f3;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 34rpx;
  line-height: 40rpx;
  color: #1f1f1f;
  font-weight: 600;
}

.card-date {
  font-size: 28rpx;
  color: #8f8f8f;
}

.main-info {
  margin-top: 22rpx;
  display: flex;
  gap: 16rpx;
}

.amount-block,
.days-block {
  flex: 1;
  background: #fff7f6;
  border-radius: 10rpx;
  padding: 18rpx 20rpx;
}

.summary-label {
  font-size: 28rpx;
  color: #8f8f8f;
  display: block;
}

.summary-value {
  display: block;
  margin-top: 8rpx;
  font-size: 42rpx;
  line-height: 46rpx;
  color: #ff4d3a;
  font-weight: 600;
}

.days-value {
  margin-top: 8rpx;
  display: flex;
  align-items: baseline;
}

.days {
  font-size: 42rpx;
  line-height: 46rpx;
  color: #ff4d3a;
  font-weight: 600;
}

.unit {
  margin-left: 8rpx;
  font-size: 24rpx;
  color: #8f8f8f;
}

.next-info {
  margin-top: 18rpx;
  border-radius: 10rpx;
  background: #fff2f1;
  padding: 14rpx 18rpx;
  display: flex;
  align-items: center;
}

.next-label {
  font-size: 28rpx;
  color: #8f8f8f;
}

.next-name {
  flex: 1;
  margin-left: 8rpx;
  font-size: 30rpx;
  color: #333333;
}

.next-amount {
  font-size: 32rpx;
  color: #ff4d3a;
  font-weight: 600;
}

.empty-state {
  margin-top: 20rpx;
  text-align: center;
}

.empty-text {
  display: block;
  font-size: 30rpx;
  color: #8e8e8e;
}

.add-btn {
  margin-top: 18rpx;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 10rpx;
  background: #ff4d3a;
  color: #ffffff;
  font-size: 32rpx;
}

.add-btn::after {
  border: none;
}

.loan-section {
  margin: 0 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 34rpx;
  color: #1f1f1f;
  font-weight: 600;
}

.section-add-btn {
  margin: 0;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 24rpx;
  border-radius: 10rpx;
  background: #ff4d3a;
  color: #ffffff;
  font-size: 30rpx;
}

.section-add-btn::after {
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
  height: 90rpx;
  border-radius: 12rpx;
  font-size: 34rpx;
  line-height: 90rpx;
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

.empty-tip {
  color: #8e8e8e;
  font-size: 30rpx;
}

.footer-tip {
  display: block;
  text-align: center;
  font-size: 30rpx;
  color: #8c8c8c;
  margin: 28rpx 0 6rpx;
}

.page-loading-mask {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(245, 245, 245, 0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-panel {
  width: 260rpx;
  min-height: 170rpx;
  background: rgba(34, 34, 34, 0.86);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx 18rpx;
  box-sizing: border-box;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.34);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.85s linear infinite;
}

.loading-text {
  margin-top: 18rpx;
  color: #ffffff;
  font-size: 26rpx;
  line-height: 34rpx;
  text-align: center;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
