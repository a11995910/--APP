/**
 * 贷款API
 */
import request from './request'

/**
 * 获取贷款列表。
 * @param {Object} params 列表查询参数。
 * @returns {Promise<Object>} 贷款分页数据。
 */
export function getLoanList(params) {
    return request.get('/admin/loans', { params })
}

/**
 * 获取贷款详情。
 * @param {number|string} id 贷款ID。
 * @returns {Promise<Object>} 贷款详情。
 */
export function getLoanDetail(id) {
    return request.get(`/admin/loans/${id}`)
}

/**
 * 获取贷款统计。
 * @returns {Promise<Object>} 贷款统计数据。
 */
export function getLoanStats() {
    return request.get('/admin/loans/stats')
}
