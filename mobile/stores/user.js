/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    login as loginApi,
    getProfile,
    miniappSilentLogin as miniappSilentLoginApi
} from '../api/user'

/**
 * 登录成功全局事件名。
 * 说明：用于显式通知首页等页面在登录完成后主动刷新业务数据。
 */
export const USER_LOGIN_SUCCESS_EVENT = 'user:login-success'

/**
 * 退出登录全局事件名。
 * 说明：用于通知页面清理旧账号业务数据。
 */
export const USER_LOGOUT_EVENT = 'user:logout'

export const useUserStore = defineStore('user', () => {
    const token = ref(uni.getStorageSync('token') || '')
    const userInfo = ref(uni.getStorageSync('userInfo') || null)

    const isLoggedIn = computed(() => !!token.value)

    /**
     * 持久化登录态。
     * @param {Object} payload 登录响应数据。
     */
    function persistLogin(payload) {
        token.value = payload.token
        userInfo.value = payload.user
        uni.setStorageSync('token', payload.token)
        uni.setStorageSync('userInfo', payload.user)
    }

    // 检查登录状态
    function checkLogin() {
        if (token.value) {
            // 验证token有效性
            getProfile().catch(() => {
                logout()
            })
        }
    }

    // 登录
    async function login(phone, platform = 'miniapp', extra = {}) {
        const res = await loginApi({ phone, platform, ...extra })
        if (res.success) {
            persistLogin(res.data)
            uni.$emit(USER_LOGIN_SUCCESS_EVENT, {
                source: 'phoneLogin',
                user: res.data?.user || null
            })
        }
        return res
    }

    /**
     * 小程序静默登录。
     * 流程：wx.login -> code 换 openid -> 已绑定则直接下发 token。
     * @returns {Promise<boolean>} 是否静默登录成功。
     */
    async function silentLoginByMiniappOpenid() {
        return new Promise((resolve) => {
            uni.login({
                success: async (loginRes) => {
                    if (!loginRes.code) {
                        logout()
                        resolve(false)
                        return
                    }

                    try {
                        const res = await miniappSilentLoginApi({ code: loginRes.code })
                        if (res.success && res.data?.bound && res.data?.token) {
                            persistLogin(res.data)
                            uni.$emit(USER_LOGIN_SUCCESS_EVENT, {
                                source: 'silentLogin',
                                user: res.data?.user || null
                            })
                            resolve(true)
                            return
                        }
                    } catch (error) {
                        // 静默登录失败不弹窗，直接回退手机号登录。
                    }

                    logout()
                    resolve(false)
                },
                fail: () => {
                    logout()
                    resolve(false)
                }
            })
        })
    }

    // 登出
    function logout() {
        token.value = ''
        userInfo.value = null
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        uni.$emit(USER_LOGOUT_EVENT)
    }

    // 更新用户信息
    function updateUser(info) {
        userInfo.value = { ...(userInfo.value || {}), ...info }
        uni.setStorageSync('userInfo', userInfo.value)
    }

    return {
        token,
        userInfo,
        isLoggedIn,
        checkLogin,
        login,
        silentLoginByMiniappOpenid,
        logout,
        updateUser
    }
})
