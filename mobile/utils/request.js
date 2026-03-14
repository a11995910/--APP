/**
 * HTTP请求基础地址。
 * 说明：默认使用当前开发机的局域网地址，便于手机真机联调。
 * 说明：如需切回本机回环地址或其他环境，可通过缓存 `api_base_url` 覆盖。
 */
const DEFAULT_BASE_URL = 'http://192.168.1.44:3000/api/v1'

/**
 * 获取当前请求基础地址。
 * @returns {string} 请求基础地址。
 */
function getBaseUrl() {
    return uni.getStorageSync('api_base_url') || DEFAULT_BASE_URL
}

/**
 * 获取本地缓存中的登录令牌。
 * 说明：直接读缓存，避免 `request -> store -> api -> request` 的循环依赖。
 * @returns {string} 鉴权令牌。
 */
function getTokenFromStorage() {
    return uni.getStorageSync('token') || ''
}

/**
 * 统一处理401未授权状态。
 * 行为：清理登录态并跳转登录页。
 */
function handleUnauthorized() {
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
    uni.redirectTo({ url: '/pages/login/index' })
}

/**
 * 判断HTTP状态码是否成功（2xx）。
 * @param {number} statusCode 状态码。
 * @returns {boolean} 是否成功。
 */
function isHttpSuccess(statusCode) {
    return Number(statusCode) >= 200 && Number(statusCode) < 300
}

/**
 * 将响应体标准化为统一对象，避免 `204` 或非对象数据导致空指针。
 * @param {Object} res uni.request 响应对象。
 * @returns {{success:boolean, code:number, message:string, data:any}} 标准响应对象。
 */
function normalizeResponseData(res) {
    if (res && typeof res.data === 'object' && res.data !== null) {
        return res.data
    }

    const success = isHttpSuccess(res?.statusCode)
    return {
        success,
        code: Number(res?.statusCode || 500),
        message: success ? '操作成功' : '请求失败',
        data: res?.data ?? null
    }
}

/**
 * 发起HTTP请求。
 * @param {Object} options 请求配置。
 * @param {string} options.url 接口路径（不含BASE_URL）。
 * @param {string} [options.method='GET'] 请求方法。
 * @param {Object} [options.data] 请求参数。
 * @returns {Promise<Object>} 服务端响应对象。
 */
export function request(options) {
    return new Promise((resolve, reject) => {
        const token = getTokenFromStorage()
        const baseUrl = getBaseUrl()
        const requestUrl = baseUrl + options.url
        const requestMethod = options.method || 'GET'

        uni.request({
            url: requestUrl,
            method: requestMethod,
            data: options.data,
            header: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            success: (res) => {
                const responseData = normalizeResponseData(res)

                if (isHttpSuccess(res.statusCode)) {
                    if (responseData.success || isHttpSuccess(responseData.code)) {
                        resolve(responseData)
                    } else {
                        uni.showToast({ title: responseData.message || '请求失败', icon: 'none' })
                        resolve(responseData)
                    }
                    return
                }

                if (res.statusCode === 401) {
                    handleUnauthorized()
                    reject(new Error('未授权'))
                    return
                }

                const errorMessage = responseData.message || `请求失败(${res.statusCode})`
                uni.showToast({ title: errorMessage, icon: 'none' })
                reject(new Error(errorMessage))
            },
            fail: (err) => {
                uni.showToast({ title: '网络错误', icon: 'none' })
                reject(err)
            }
        })
    })
}

/**
 * GET请求封装。
 * @param {string} url 接口路径。
 * @param {Object} [data] 查询参数。
 * @returns {Promise<Object>} 服务端响应对象。
 */
export function get(url, data) {
    return request({ url, method: 'GET', data })
}

/**
 * POST请求封装。
 * @param {string} url 接口路径。
 * @param {Object} [data] 请求体参数。
 * @returns {Promise<Object>} 服务端响应对象。
 */
export function post(url, data) {
    return request({ url, method: 'POST', data })
}

/**
 * PUT请求封装。
 * @param {string} url 接口路径。
 * @param {Object} [data] 请求体参数。
 * @returns {Promise<Object>} 服务端响应对象。
 */
export function put(url, data) {
    return request({ url, method: 'PUT', data })
}

/**
 * DELETE请求封装。
 * @param {string} url 接口路径。
 * @param {Object} [data] 请求参数。
 * @returns {Promise<Object>} 服务端响应对象。
 */
export function del(url, data) {
    return request({ url, method: 'DELETE', data })
}
