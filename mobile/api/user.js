/**
 * 用户相关API
 */
import { get, post, put } from '../utils/request'

export function login(data) {
    return post('/user/login', data)
}

/**
 * 小程序静默登录。
 * @param {{code:string}} data 微信登录临时code。
 * @returns {Promise<Object>} 接口响应。
 */
export function miniappSilentLogin(data) {
    return post('/user/miniapp/silent-login', data)
}

export function getProfile() {
    return get('/user/profile')
}

export function updateProfile(data) {
    return put('/user/profile', data)
}

export function getHomeData() {
    return get('/user/home')
}

/**
 * 同步 APP 推送设备标识。
 * @param {Object} data 推送设备信息。
 * @returns {Promise<Object>} 接口响应。
 */
export function syncPushDevice(data) {
    return post('/user/push-device', data)
}
