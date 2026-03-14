<template>
  <view class="mine-page">
    <view class="user-card" v-if="userStore.isLoggedIn">
      <image class="avatar" :src="userStore.userInfo?.avatar || '/static/default-avatar.png'" mode="aspectFill" />
      <view class="user-info">
        <text class="nickname">{{ userStore.userInfo?.nickname || '用户' }}</text>
        <text class="phone">{{ maskPhone(userStore.userInfo?.phone) }}</text>
      </view>
    </view>

    <view class="user-card login-card" v-else @click="goLogin">
      <image class="avatar" src="/static/default-avatar.png" mode="aspectFill" />
      <view class="user-info">
        <text class="login-text">点击手机号登录</text>
        <text class="login-sub">登录后自动配置提醒渠道</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <view class="status-card" v-if="userStore.isLoggedIn">
      <view class="status-row">
        <text class="status-label">提醒渠道</text>
        <text class="status-value">{{ notifyTypeLabel }}</text>
      </view>
      <view class="status-row" v-if="isAppChannel">
        <text class="status-label">推送设备</text>
        <text class="status-value" :class="{ 'status-value-active': userStore.userInfo?.push_client_bound }">
          {{ userStore.userInfo?.push_client_bound ? '已绑定当前设备' : '等待绑定设备' }}
        </text>
      </view>
    </view>

    <view class="menu-card">
      <view class="menu-item" @click="showAbout">
        <view class="menu-icon icon-about">
          <view class="about-circle"></view>
          <view class="about-dot"></view>
          <view class="about-line"></view>
        </view>
        <view class="menu-content">
          <text class="menu-title">关于我们</text>
          <text class="menu-desc">贷款提醒助手，帮助您管理还款计划</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="menu-item" @click="showFeedback">
        <view class="menu-icon icon-feedback">
          <view class="feedback-box"></view>
          <view class="feedback-tail"></view>
        </view>
        <view class="menu-content">
          <text class="menu-title">意见反馈</text>
          <text class="menu-desc">提交优化建议，我们持续改进</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <button class="logout-btn" v-if="userStore.isLoggedIn" @click="handleLogout">退出登录</button>

    <view class="version">版本 1.0.0</view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

/**
 * 判断当前账号是否以 APP 推送作为提醒渠道。
 * @returns {boolean} 是否为 APP 推送渠道。
 */
const isAppChannel = computed(() => userStore.userInfo?.platform === 'app' || userStore.userInfo?.notify_type === 'push')

/**
 * 生成当前账号的提醒渠道文案。
 * @returns {string} 提醒渠道文案。
 */
const notifyTypeLabel = computed(() => {
  if (userStore.userInfo?.notify_type === 'push') {
    return 'APP 推送'
  }

  if (userStore.userInfo?.notify_type === 'sms') {
    return '短信提醒'
  }

  return '未开启'
})

/**
 * 脱敏显示手机号。
 * @param {string} phone 原始手机号。
 * @returns {string} 脱敏后的手机号。
 */
const maskPhone = (phone) => phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : ''

/**
 * 跳转登录页面。
 */
const goLogin = () => uni.navigateTo({ url: '/pages/login/index' })

/**
 * 展示关于弹窗。
 */
const showAbout = () => uni.showModal({ title: '关于我们', content: '贷款提醒助手\n帮助您管理贷款还款', showCancel: false })

/**
 * 反馈入口（当前使用提示，后续可对接工单系统）。
 */
const showFeedback = () => uni.showToast({ title: '功能开发中', icon: 'none' })

/**
 * 执行退出登录。
 */
const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定退出登录？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    }
  })
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  padding: 24rpx 20rpx 40rpx;
  background: #f5f5f5;
}

.user-card {
  background: #ffffff;
  border-radius: 12rpx;
  border: 1rpx solid #f2f2f2;
  padding: 28rpx;
  display: flex;
  align-items: center;
  margin-bottom: 18rpx;
}

.login-card {
  background: #fff7f6;
  border-color: #ffd9d3;
}

.status-card {
  background: #ffffff;
  border-radius: 12rpx;
  border: 1rpx solid #f2f2f2;
  padding: 8rpx 28rpx;
  margin-bottom: 18rpx;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.status-row:last-child {
  border-bottom: none;
}

.status-label {
  font-size: 28rpx;
  color: #8f8f8f;
}

.status-value {
  font-size: 28rpx;
  color: #2b2b2b;
  font-weight: 500;
}

.status-value-active {
  color: #ff5a3c;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  border: 2rpx solid #ffe0db;
}

.user-info {
  flex: 1;
  margin-left: 22rpx;
}

.nickname {
  display: block;
  font-size: 34rpx;
  line-height: 40rpx;
  color: #222222;
  font-weight: 600;
}

.phone {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #8f8f8f;
}

.login-text {
  display: block;
  font-size: 32rpx;
  color: #ff4d3a;
  font-weight: 600;
}

.login-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #8f8f8f;
}

.arrow {
  font-size: 30rpx;
  color: #c0c0c0;
}

.menu-card {
  background: #ffffff;
  border-radius: 12rpx;
  border: 1rpx solid #f2f2f2;
  margin-bottom: 24rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  margin-right: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.icon-about {
  background: #ff8a7d;
}

.icon-feedback {
  background: #ffb1a8;
}

.about-circle {
  width: 22rpx;
  height: 22rpx;
  border: 3rpx solid #fff;
  border-radius: 50%;
}

.about-dot {
  position: absolute;
  top: 14rpx;
  width: 4rpx;
  height: 4rpx;
  border-radius: 50%;
  background: #fff;
}

.about-line {
  position: absolute;
  top: 26rpx;
  width: 4rpx;
  height: 10rpx;
  border-radius: 2rpx;
  background: #fff;
}

.feedback-box {
  width: 24rpx;
  height: 18rpx;
  border: 3rpx solid #fff;
  border-radius: 6rpx;
}

.feedback-tail {
  position: absolute;
  right: 12rpx;
  bottom: 12rpx;
  width: 0;
  height: 0;
  border-top: 6rpx solid #fff;
  border-left: 5rpx solid transparent;
}

.menu-content {
  flex: 1;
}

.menu-title {
  display: block;
  font-size: 30rpx;
  line-height: 36rpx;
  color: #2b2b2b;
  font-weight: 500;
}

.menu-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  line-height: 32rpx;
  color: #8f8f8f;
}

.logout-btn {
  width: 220rpx;
  height: 62rpx;
  line-height: 62rpx;
  margin: 10rpx auto 0;
  border-radius: 31rpx;
  background: #ececec;
  color: #9a9a9a;
  font-size: 26rpx;
  font-weight: 400;
}

.logout-btn::after {
  border: none;
}

.version {
  margin-top: 36rpx;
  text-align: center;
  font-size: 24rpx;
  color: #c0c0c0;
}
</style>
