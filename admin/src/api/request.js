/**
 * HTTP请求封装
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import router from '../router'

// 创建axios实例
const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        const authStore = useAuthStore()
        if (authStore.token) {
            config.headers.Authorization = `Bearer ${authStore.token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        const res = response.data

        // 业务错误处理
        if (!res.success && res.code !== 200) {
            ElMessage.error(res.message || '请求失败')
            return res
        }

        return res
    },
    (error) => {
        const { response } = error

        if (response) {
            switch (response.status) {
                case 401:
                    ElMessage.error('登录已过期，请重新登录')
                    const authStore = useAuthStore()
                    authStore.logout()
                    router.push('/login')
                    break
                case 403:
                    ElMessage.error('没有权限访问')
                    break
                case 404:
                    ElMessage.error('请求的资源不存在')
                    break
                case 500:
                    ElMessage.error('服务器内部错误')
                    break
                default:
                    ElMessage.error(response.data?.message || '请求失败')
            }
        } else {
            ElMessage.error('网络连接失败，请检查网络')
        }

        return Promise.reject(error)
    }
)

export default request
