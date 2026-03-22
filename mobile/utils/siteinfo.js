/**
 * 站点环境配置模块。
 * 说明：
 * 1. 统一维护移动端开发环境与生产环境的接口地址。
 * 2. 默认启用生产环境，保证正式发布产物无需额外改动即可直连线上。
 * 3. 如需临时切换环境，可调用 `setActiveSiteEnv`，也可直接修改默认环境常量。
 *
 * @module utils/siteinfo
 */

/**
 * 环境缓存键。
 * 说明：用于在小程序 / APP 本地持久化当前激活环境。
 * @type {string}
 */
const SITE_ENV_STORAGE_KEY = 'site_env'

/**
 * 默认环境标识。
 * 可选值：
 * - `production` 生产环境
 * - `development` 开发环境
 *
 * 当前默认：生产环境。
 * @type {'production'|'development'}
 */
const DEFAULT_SITE_ENV = 'production'

/**
 * 站点信息映射表。
 * 说明：集中维护所有环境配置，后续如增加测试环境，可在此继续扩展。
 * @type {Record<string, {label:string, apiBaseUrl:string, h5BaseUrl:string}>}
 */
const SITE_INFO_MAP = {
    development: {
        label: '开发环境',
        apiBaseUrl: 'http://192.168.1.44:3000/api/v1',
        h5BaseUrl: 'http://192.168.1.44:5173'
    },
    production: {
        label: '生产环境',
        apiBaseUrl: 'https://www.youkeduo.site/api/v1',
        h5BaseUrl: 'https://www.youkeduo.site'
    }
}

/**
 * 获取当前激活环境标识。
 * 优先级：
 * 1. 本地缓存
 * 2. 默认环境常量
 *
 * @returns {'production'|'development'} 当前环境标识。
 */
export function getActiveSiteEnv() {
    const cachedEnv = uni.getStorageSync(SITE_ENV_STORAGE_KEY)
    return SITE_INFO_MAP[cachedEnv] ? cachedEnv : DEFAULT_SITE_ENV
}

/**
 * 设置当前激活环境。
 * 说明：仅允许切换到已定义环境，避免拼写错误导致请求地址失效。
 *
 * @param {'production'|'development'} env 环境标识。
 * @returns {{label:string, apiBaseUrl:string, h5BaseUrl:string}} 当前环境配置。
 */
export function setActiveSiteEnv(env) {
    const normalizedEnv = SITE_INFO_MAP[env] ? env : DEFAULT_SITE_ENV
    uni.setStorageSync(SITE_ENV_STORAGE_KEY, normalizedEnv)
    return SITE_INFO_MAP[normalizedEnv]
}

/**
 * 获取当前环境完整配置。
 * @returns {{label:string, apiBaseUrl:string, h5BaseUrl:string}} 当前环境配置。
 */
export function getCurrentSiteInfo() {
    return SITE_INFO_MAP[getActiveSiteEnv()]
}

/**
 * 获取移动端当前接口基础地址。
 * @returns {string} 当前接口基础地址。
 */
export function getCurrentApiBaseUrl() {
    return getCurrentSiteInfo().apiBaseUrl
}

/**
 * 导出站点配置常量，便于业务层直接展示当前环境信息。
 */
export {
    SITE_ENV_STORAGE_KEY,
    DEFAULT_SITE_ENV,
    SITE_INFO_MAP
}
