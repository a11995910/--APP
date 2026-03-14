/**
 * 贷款API
 */
import request from './request'

// 获取贷款列表
export function getLoanList(params) {
    return request.get('/admin/loans', { params })
}

// 获取贷款详情
export function getLoanDetail(id) {
    return request.get(`/admin/loans/${id}`)
}

// 获取贷款统计
export function getLoanStats() {
    return request.get('/admin/loans/stats')
}
