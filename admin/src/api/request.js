/**
 * HTTP请求封装。
 * 说明：默认从统一站点配置模块读取当前环境接口地址。
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import router from '../router'
import { getCurrentApiBaseUrl } from '../config/siteinfo'

/**
 * 创建后台请求实例。
 * 说明：
 * 1. 请求基础地址统一由 `siteinfo.js` 管理，避免被构建机环境变量意外覆盖。
 * 2. 后台环境切换仅通过 `admin_site_env` 控制，确保线上站点始终可预测。
 */
const request = axios.create({
    baseURL: getCurrentApiBaseUrl(),
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
})

/**
 * 请求拦截器。
 * 说明：统一附带后台管理员登录令牌。
 */
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

/**
 * 响应拦截器。
 * 说明：统一处理业务错误、鉴权失效与网络异常。
 */
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
