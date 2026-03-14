/**
 * 短信API
 */
import request from './request'

// 获取短信配置列表
export function getSmsConfigList() {
    return request.get('/admin/sms/configs')
}

// 获取配置详情
export function getSmsConfigDetail(id) {
    return request.get(`/admin/sms/configs/${id}`)
}

// 创建配置
export function createSmsConfig(data) {
    return request.post('/admin/sms/configs', data)
}

// 更新配置
export function updateSmsConfig(id, data) {
    return request.put(`/admin/sms/configs/${id}`, data)
}

// 删除配置
export function deleteSmsConfig(id) {
    return request.delete(`/admin/sms/configs/${id}`)
}

// 更新余额
export function updateBalance(id, balance) {
    return request.put(`/admin/sms/configs/${id}/balance`, { balance })
}

// 获取短信统计
export function getSmsStats() {
    return request.get('/admin/sms/stats')
}
