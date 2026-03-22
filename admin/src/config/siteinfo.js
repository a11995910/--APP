/**
 * 后台站点环境配置模块。
 * 说明：
 * 1. 统一维护后台开发环境与生产环境的接口地址。
 * 2. 默认启用生产环境，保证线上构建直接走正式接口。
 * 3. 支持通过 `localStorage` 持久化切换环境，方便开发与排障时快速切换。
 *
 * @module config/siteinfo
 */

/**
 * 环境缓存键。
 * @type {string}
 */
const SITE_ENV_STORAGE_KEY = 'admin_site_env'

/**
 * 默认环境。
 * 当前默认：生产环境。
 * @type {'production'|'development'}
 */
const DEFAULT_SITE_ENV = 'production'

/**
 * 环境配置映射。
 * @type {Record<string, {label:string, apiBaseUrl:string, siteBaseUrl:string}>}
 */
const SITE_INFO_MAP = {
    development: {
        label: '开发环境',
        apiBaseUrl: 'http://192.168.1.44:3000/api/v1',
        siteBaseUrl: 'http://192.168.1.44:5173'
    },
    production: {
        label: '生产环境',
        apiBaseUrl: 'https://www.youkeduo.site/api/v1',
        siteBaseUrl: 'https://www.youkeduo.site'
    }
}

/**
 * 获取当前激活环境。
 * @returns {'production'|'development'} 当前环境标识。
 */
export function getActiveSiteEnv() {
    const cachedEnv = window.localStorage.getItem(SITE_ENV_STORAGE_KEY)
    return SITE_INFO_MAP[cachedEnv] ? cachedEnv : DEFAULT_SITE_ENV
}

/**
 * 设置当前激活环境。
 * @param {'production'|'development'} env 环境标识。
 * @returns {{label:string, apiBaseUrl:string, siteBaseUrl:string}} 当前环境配置。
 */
export function setActiveSiteEnv(env) {
    const normalizedEnv = SITE_INFO_MAP[env] ? env : DEFAULT_SITE_ENV
    window.localStorage.setItem(SITE_ENV_STORAGE_KEY, normalizedEnv)
    return SITE_INFO_MAP[normalizedEnv]
}

/**
 * 获取当前环境完整配置。
 * @returns {{label:string, apiBaseUrl:string, siteBaseUrl:string}} 当前环境配置。
 */
export function getCurrentSiteInfo() {
    return SITE_INFO_MAP[getActiveSiteEnv()]
}

/**
 * 获取后台请求基础地址。
 * @returns {string} 当前接口基础地址。
 */
export function getCurrentApiBaseUrl() {
    return getCurrentSiteInfo().apiBaseUrl
}

export {
    SITE_ENV_STORAGE_KEY,
    DEFAULT_SITE_ENV,
    SITE_INFO_MAP
}
