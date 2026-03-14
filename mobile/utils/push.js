/**
 * APP 推送工具
 * 负责采集推送客户端标识、同步到后端，并处理推送点击跳转。
 */

import { syncPushDevice } from '../api/user'

/**
 * 推送消息全局事件名。
 * 说明：页面如需监听前台推送，可通过 `uni.$on` 订阅该事件。
 */
export const APP_PUSH_MESSAGE_EVENT = 'app:push-message'

/**
 * 标记是否已完成推送监听初始化，避免重复注册。
 * @type {boolean}
 */
let pushListenerInitialized = false

/**
 * 等待指定毫秒数。
 * @param {number} duration 等待时长。
 * @returns {Promise<void>} 等待结果。
 */
function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

/**
 * 安全获取设备信息。
 * 优先使用新版 API，避免 `getSystemInfoSync` 废弃告警。
 *
 * @returns {Object} 设备信息。
 */
function getSafeDeviceInfo() {
  if (typeof uni.getDeviceInfo === 'function') {
    return uni.getDeviceInfo() || {}
  }

  if (typeof uni.getSystemInfoSync === 'function') {
    return uni.getSystemInfoSync() || {}
  }

  return {}
}

/**
 * 安全获取应用基础信息。
 *
 * @returns {Object} 应用基础信息。
 */
function getSafeAppBaseInfo() {
  if (typeof uni.getAppBaseInfo === 'function') {
    return uni.getAppBaseInfo() || {}
  }

  return {}
}

/**
 * 通过 uni API 获取推送客户端标识。
 *
 * @returns {Promise<string>} 推送客户端ID。
 */
function getUniPushClientId() {
  return new Promise((resolve) => {
    if (typeof uni.getPushClientId !== 'function') {
      resolve('')
      return
    }

    uni.getPushClientId({
      success: (result) => resolve(result?.cid || result?.clientid || ''),
      fail: () => resolve('')
    })
  })
}

/**
 * 通过 plus.push 获取更完整的推送客户端信息。
 *
 * @returns {Promise<Object>} 推送客户端信息。
 */
function getPlusPushClientInfo() {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    if (typeof plus === 'undefined' || !plus.push) {
      resolve({})
      return
    }

    if (typeof plus.push.getClientInfoAsync === 'function') {
      plus.push.getClientInfoAsync(
        (result) => resolve(result || {}),
        () => resolve(typeof plus.push.getClientInfo === 'function' ? (plus.push.getClientInfo() || {}) : {})
      )
      return
    }

    resolve(typeof plus.push.getClientInfo === 'function' ? (plus.push.getClientInfo() || {}) : {})
    // #endif

    // #ifndef APP-PLUS
    resolve({})
    // #endif
  })
}

/**
 * 轮询获取推送客户端标识。
 * 说明：APP 首次冷启动时客户端ID可能稍后才准备好，因此增加轻量重试。
 *
 * @param {number} maxAttempts 最大重试次数。
 * @param {number} intervalMs 重试间隔。
 * @returns {Promise<Object|null>} 标准化后的推送身份信息。
 */
async function waitForPushIdentity(maxAttempts = 5, intervalMs = 400) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const [uniClientId, plusClientInfo] = await Promise.all([
      getUniPushClientId(),
      getPlusPushClientInfo()
    ])

    const pushClientId = uniClientId || plusClientInfo?.clientid || ''
    const pushChannel = plusClientInfo?.id || 'unipush'

    if (pushClientId) {
      return {
        push_client_id: pushClientId,
        push_channel: pushChannel
      }
    }

    if (attempt < maxAttempts - 1) {
      await wait(intervalMs)
    }
  }

  return null
}

/**
 * 采集 APP 推送注册载荷。
 *
 * @returns {Promise<Object|null>} 推送注册载荷。
 */
export async function getAppPushRegistrationPayload() {
  // #ifdef APP-PLUS
  const pushIdentity = await waitForPushIdentity()
  if (!pushIdentity?.push_client_id) {
    return null
  }

  const deviceInfo = getSafeDeviceInfo()
  const appBaseInfo = getSafeAppBaseInfo()

  return {
    ...pushIdentity,
    device_brand: deviceInfo.brand || deviceInfo.deviceBrand || '',
    device_model: deviceInfo.model || deviceInfo.deviceModel || '',
    os_name: deviceInfo.osName || deviceInfo.platform || '',
    os_version: deviceInfo.osVersion || deviceInfo.system || '',
    app_version: appBaseInfo.version || appBaseInfo.appVersion || ''
  }
  // #endif

  // #ifndef APP-PLUS
  return null
  // #endif
}

/**
 * 将推送 payload 标准化为对象，兼容字符串与对象两种场景。
 *
 * @param {unknown} rawPayload 原始 payload。
 * @returns {Object} 标准化后的 payload。
 */
function normalizePushPayload(rawPayload) {
  if (!rawPayload) {
    return {}
  }

  if (typeof rawPayload === 'string') {
    try {
      return JSON.parse(rawPayload)
    } catch (error) {
      void error
      return {}
    }
  }

  if (typeof rawPayload === 'object') {
    return rawPayload
  }

  return {}
}

/**
 * 根据推送 payload 推导点击后的目标页面。
 *
 * @param {Object} payload 推送业务载荷。
 * @returns {string} 目标页面路径。
 */
function resolvePushTargetUrl(payload = {}) {
  if (payload.targetPage === 'loanSchedule' && payload.loanId) {
    return `/pages/loan/schedule/index?id=${payload.loanId}`
  }

  return ''
}

/**
 * 处理推送点击后的页面跳转。
 *
 * @param {Object} payload 推送业务载荷。
 */
function navigateByPushPayload(payload = {}) {
  const targetUrl = resolvePushTargetUrl(payload)
  if (targetUrl) {
    uni.navigateTo({
      url: targetUrl,
      fail: () => {
        uni.switchTab({ url: '/pages/index/index' })
      }
    })
    return
  }

  uni.switchTab({ url: '/pages/index/index' })
}

/**
 * 初始化 APP 推送监听。
 * 行为：
 * 1. 收到前台推送时派发全局事件；
 * 2. 点击系统推送时按业务 payload 跳转页面。
 */
export function initAppPushMessageListener() {
  // #ifdef APP-PLUS
  if (pushListenerInitialized || typeof uni.onPushMessage !== 'function') {
    return
  }

  uni.onPushMessage((message) => {
    const payload = normalizePushPayload(message?.data?.payload)
    uni.$emit(APP_PUSH_MESSAGE_EVENT, {
      ...message,
      payload
    })

    if (message?.type === 'click') {
      navigateByPushPayload(payload)
    }
  })

  pushListenerInitialized = true
  // #endif
}

/**
 * 在 APP 已登录态下向后端同步当前设备推送标识。
 *
 * @returns {Promise<Object>} 同步结果。
 */
export async function syncAppPushDeviceRegistration() {
  // #ifdef APP-PLUS
  const token = uni.getStorageSync('token') || ''
  if (!token) {
    return {
      success: false,
      skipped: true,
      reason: 'not_logged_in'
    }
  }

  const payload = await getAppPushRegistrationPayload()
  if (!payload?.push_client_id) {
    return {
      success: false,
      skipped: true,
      reason: 'missing_push_client_id'
    }
  }

  try {
    return await syncPushDevice(payload)
  } catch (error) {
    return {
      success: false,
      skipped: false,
      reason: 'request_failed',
      error
    }
  }
  // #endif

  // #ifndef APP-PLUS
  return {
    success: false,
    skipped: true,
    reason: 'not_app'
  }
  // #endif
}
