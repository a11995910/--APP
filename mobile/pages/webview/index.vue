<template>
  <view class="webview-page">
    <web-view v-if="pageUrl" :src="pageUrl" />

    <view v-else class="empty-state">
      <text class="empty-title">链接无效</text>
      <text class="empty-desc">未找到可打开的网页地址</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const pageUrl = ref('')

/**
 * 判断链接是否为可访问的 http/https 地址。
 * @param {string} url 待校验链接。
 * @returns {boolean} 是否合法。
 */
const isValidHttpUrl = (url) => /^https?:\/\/.+/i.test(url)

/**
 * 读取页面参数并完成地址校验。
 * @param {Object} options 路由参数对象。
 */
const initPageUrl = (options = {}) => {
  const decodedUrl = decodeURIComponent(options.url || '')

  if (!decodedUrl || !isValidHttpUrl(decodedUrl)) {
    pageUrl.value = ''
    return
  }

  pageUrl.value = decodedUrl
}

onLoad((options) => {
  initPageUrl(options)
})
</script>

<style scoped>
.webview-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.empty-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 60rpx;
  text-align: center;
}

.empty-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 18rpx;
}

.empty-desc {
  font-size: 28rpx;
  color: #909399;
}
</style>
