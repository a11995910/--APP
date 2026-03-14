<script setup>
/**
 * 应用根组件。
 * 说明：当前主要负责 APP 推送监听初始化，以及已登录态下的推送设备同步兜底。
 */
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from './stores/user'
import { initAppPushMessageListener, syncAppPushDeviceRegistration } from './utils/push'

const userStore = useUserStore()

/**
 * 在 APP 场景下同步当前设备的推送客户端标识。
 * 说明：登录页会主动同步一次，这里在应用启动与回前台时补传，避免漏绑设备。
 */
async function syncAppPushBindingIfNeeded() {
  const result = await syncAppPushDeviceRegistration()
  if (result?.success) {
    userStore.updateUser({
      push_client_bound: true,
      push_channel: result?.data?.push_channel || result?.data?.device?.push_channel || 'unipush'
    })
  }
}

/**
 * 应用启动时初始化 APP 推送监听。
 */
onLaunch(() => {
  // #ifdef APP-PLUS
  initAppPushMessageListener()
  syncAppPushBindingIfNeeded()
  // #endif
})

/**
 * 应用回到前台时补传 APP 推送设备信息。
 */
onShow(() => {
  // #ifdef APP-PLUS
  syncAppPushBindingIfNeeded()
  // #endif
})
</script>

<style>
/* 全局样式 */
page {
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container {
  padding: 30rpx;
}

/* 主色调 */
.text-primary { color: #ff5a3c; }
.bg-primary { background-color: #ff5a3c; }

/* 按钮样式 */
.btn-primary {
  background: #ff5a3c;
  color: #fff;
  border: none;
  border-radius: 16rpx;
  padding: 24rpx 48rpx;
  font-size: 32rpx;
  font-weight: 600;
}

/* 卡片样式 */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.05);
}
</style>
