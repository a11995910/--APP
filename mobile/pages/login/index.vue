<template>
  <view class="login-page">
    <view class="login-header">
      <image src="/static/logo.png" class="logo" mode="aspectFit" />
      <text class="title">贷款提醒</text>
      <text class="subtitle">管理贷款，准时还款</text>
    </view>
    
    <view class="login-form">
      <view class="form-item">
        <text class="prefix">+86</text>
        <input class="input" v-model="phone" type="number" placeholder="请输入手机号" maxlength="11" />
      </view>
      
      <button class="login-btn" @click="handleLogin" :loading="loading" :disabled="!phone || phone.length !== 11">
        登录 / 注册
      </button>
    </view>
    
    <view class="login-footer">
      <text class="tip">登录即表示同意</text>
      <text class="link">《用户协议》</text>
      <text class="tip">和</text>
      <text class="link">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useHomeStore } from '../../stores/home'
import { useUserStore } from '../../stores/user'
import { getAppPushRegistrationPayload, syncAppPushDeviceRegistration } from '../../utils/push'

const homeStore = useHomeStore()
const userStore = useUserStore()
const phone = ref('')
const loading = ref(false)

/**
 * 获取小程序登录临时 code。
 * @returns {Promise<string>} 登录 code，不可用时返回空字符串。
 */
const getMiniappCode = () => new Promise((resolve) => {
  uni.login({
    success: (res) => resolve(res.code || ''),
    fail: () => resolve('')
  })
})

/**
 * 登录成功后根据页面栈执行回跳或回到首页。
 */
function redirectAfterLogin() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }

  uni.switchTab({
    url: '/pages/index/index'
  })
}

/**
 * 执行手机号登录：
 * 1. 小程序端先通过 `wx.login` 获取 code。
 * 2. APP 端登录前尽量预采集推送客户端标识。
 * 3. 将手机号 + 平台凭证交给后端完成登录与渠道绑定。
 * 4. 登录成功后回跳或回首页。
 */
const handleLogin = async () => {
  if (!/^1\d{10}$/.test(phone.value)) {
    return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
  }
  
  loading.value = true
  try {
    let wechatCode = ''
    let platform = 'miniapp'
    let appPushPayload = {}

    // #ifdef APP-PLUS
    platform = 'app'
    appPushPayload = await getAppPushRegistrationPayload() || {}
    // #endif

    // #ifdef MP-WEIXIN
    // 小程序手机号登录必须携带 code，用于后端换取 openid 并完成绑定。
    wechatCode = await getMiniappCode()
    if (!wechatCode) {
      uni.showToast({ title: '微信登录凭证获取失败，请重试', icon: 'none' })
      return
    }
    // #endif
    
    const res = await userStore.login(phone.value, platform, {
      wechat_code: wechatCode,
      ...appPushPayload
    })
    if (res.success) {
      // #ifdef APP-PLUS
      const syncResult = await syncAppPushDeviceRegistration()
      if (syncResult?.success) {
        userStore.updateUser({
          push_client_bound: true,
          push_channel: syncResult?.data?.push_channel || syncResult?.data?.device?.push_channel || appPushPayload.push_channel || 'unipush'
        })
      }
      // #endif

      homeStore.requestRefresh('phoneLoginSuccess')
      await homeStore.loadDashboard('phoneLoginSuccess')
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(redirectAfterLogin, 300)
    }
  } catch (error) {
    uni.showToast({ title: error?.message || '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 页面显示时，如果已登录则直接离开登录页。
 */
onShow(() => {
  if (userStore.isLoggedIn) {
    redirectAfterLogin()
  }
})
</script>

<style scoped>
.login-page { min-height: 100vh; background: #fff; padding: 80rpx 60rpx; display: flex; flex-direction: column; }

.login-header { text-align: center; margin-bottom: 80rpx; }
.logo { width: 160rpx; height: 160rpx; margin-bottom: 32rpx; }
.title { font-size: 48rpx; font-weight: 700; color: #303133; display: block; margin-bottom: 16rpx; }
.subtitle { font-size: 28rpx; color: #909399; }

.login-form { margin-bottom: 40rpx; }
.form-item { 
  display: flex; 
  align-items: center; 
  background: #f5f7fa; 
  border-radius: 48rpx; 
  padding: 0 32rpx; 
  margin-bottom: 32rpx; 
}
.prefix { font-size: 32rpx; color: #303133; padding-right: 20rpx; border-right: 2rpx solid #dcdfe6; margin-right: 20rpx; }
.input { flex: 1; height: 100rpx; font-size: 32rpx; }

.login-btn {
  height: 88rpx;
  line-height: 88rpx;
  background: #ff4d3a;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
}
.login-btn[disabled] {
  opacity: 0.65;
  background: #ffb1a8;
}
.login-btn::after {
  border: none;
}

.login-footer { display: flex; justify-content: center; flex-wrap: wrap; }
.tip { font-size: 24rpx; color: #909399; }
.link { font-size: 24rpx; color: #ff6c5d; }
</style>
