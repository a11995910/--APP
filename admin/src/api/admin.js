/**
 * 管理员API
 */
import request from './request'

// 登录
export function login(data) {
    return request.post('/admin/login', data)
}

// 获取当前管理员信息
export function getProfile() {
    return request.get('/admin/profile')
}

// 获取仪表盘数据
export function getDashboard() {
    return request.get('/admin/dashboard')
}

// 修改密码
export function changePassword(data) {
    return request.put('/admin/password', data)
}
