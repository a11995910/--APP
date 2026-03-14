/**
 * 用户API
 */
import request from './request'

// 获取用户列表
export function getUserList(params) {
    return request.get('/admin/users', { params })
}

// 获取用户详情
export function getUserDetail(id) {
    return request.get(`/admin/users/${id}`)
}

// 更新用户状态
export function updateUserStatus(id, status) {
    return request.put(`/admin/users/${id}/status`, { status })
}

// 获取用户统计
export function getUserStats() {
    return request.get('/admin/users/stats')
}
