/**
 * 通知API
 */
import request from './request'

// 获取通知列表
export function getNotificationList(params) {
    return request.get('/admin/notifications', { params })
}

// 获取通知统计
export function getNotificationStats() {
    return request.get('/admin/notifications/stats')
}
