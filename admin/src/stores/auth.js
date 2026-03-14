/**
 * 认证状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi } from '../api/admin'

export const useAuthStore = defineStore('auth', () => {
    // 状态
    const token = ref(localStorage.getItem('admin_token') || '')
    const admin = ref(JSON.parse(localStorage.getItem('admin_info') || 'null'))

    // 计算属性
    const isLoggedIn = computed(() => !!token.value)
    const adminName = computed(() => admin.value?.name || admin.value?.username || '管理员')

    // 登录
    async function login(username, password) {
        const res = await loginApi({ username, password })
        if (res.success) {
            token.value = res.data.token
            admin.value = res.data.admin
            localStorage.setItem('admin_token', res.data.token)
            localStorage.setItem('admin_info', JSON.stringify(res.data.admin))
        }
        return res
    }

    // 登出
    function logout() {
        token.value = ''
        admin.value = null
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
    }

    // 更新管理员信息
    function updateAdmin(info) {
        admin.value = { ...admin.value, ...info }
        localStorage.setItem('admin_info', JSON.stringify(admin.value))
    }

    return {
        token,
        admin,
        isLoggedIn,
        adminName,
        login,
        logout,
        updateAdmin
    }
})
